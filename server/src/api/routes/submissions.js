const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { query } = require('../../infrastructure/database/db');
const { getPeriodKey, matchesCriteria } = require('../../core/quotaUtils');

const workflowEngine = require('../../core/workflowEngine');

// Initialize Repositories
const submissionRepo = new PostgresRepository('submissions');
const auditRepo = new PostgresRepository('audit_logs');

const authenticate = require('../middleware/auth');

// Helper to map DB to Entity
const toEntity = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        formId: row.form_id,
        formVersion: row.form_version,
        data: row.data,
        analysis: row.analysis,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tenantId: row.tenant_id
    };
};

// Get all submissions (Filtered by Tenant)
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const formId = req.query.formId;
        let rows;

        if (formId) {
            // Security check: Verify form belongs to tenant
            const formRes = await query('SELECT id FROM forms WHERE id = $1 AND tenant_id = $2', [formId, tenantId]);
            if (formRes.rows.length === 0) return res.status(404).json({ error: 'Form not found or access denied' });

            const result = await query('SELECT * FROM submissions WHERE form_id = $1 AND tenant_id = $2', [formId, tenantId]);
            rows = result.rows;
        } else {
            rows = await submissionRepo.findAllBy('tenant_id', tenantId, 'created_at DESC');
        }
        res.json(rows.map(toEntity));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get submission by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const row = await submissionRepo.findById(req.params.id);
        if (!row || row.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Submission not found' });
        res.json(toEntity(row));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new submission
router.post('/', async (req, res) => {
    try {
        const clientMetadata = req.body.metadata || {};
        const headerMetadata = req.headers || {};

        // --- QUOTA & LIMIT CHECK ---
        const formId = req.body.formId;

        // 1. Check Global Form Response Limit
        const formCheck = await query("SELECT response_limit, tenant_id FROM forms WHERE id = $1", [formId]);
        if (formCheck.rows.length === 0) return res.status(404).json({ error: 'Form not found' });

        const tenantId = formCheck.rows[0].tenant_id;

        if (formCheck.rows[0].response_limit) {
            const currentSubmissions = await query("SELECT COUNT(*) FROM submissions WHERE form_id = $1", [formId]);
            if (parseInt(currentSubmissions.rows[0].count) >= formCheck.rows[0].response_limit) {
                return res.status(403).json({ error: 'Form response limit reached', code: 'LIMIT_EXCEEDED' });
            }
        }

        // 2. Check Specific Quotas (Complex Criteria Matching)
        const activeQuotasResult = await query("SELECT * FROM quotas WHERE form_id = $1 AND is_active = true", [formId]);
        const activeQuotas = activeQuotasResult.rows;

        const incomingData = req.body.data || {};
        const matchedQuotas = activeQuotas.filter(q => matchesCriteria(incomingData, q.criteria));

        // Validate matched quotas
        let quotaViolation = null;
        for (const quota of matchedQuotas) {
            let currentCount = quota.current_count;

            // IF periodic, we NEED to get the count for the current period
            if (quota.reset_period && quota.reset_period !== 'never' && quota.reset_period !== 'global') {
                const pKey = getPeriodKey(quota.reset_period);
                const pCountRes = await query("SELECT count FROM quota_period_counters WHERE quota_id = $1 AND period_key = $2", [quota.id, pKey]);
                currentCount = pCountRes.rows.length > 0 ? pCountRes.rows[0].count : 0;
            }

            if (currentCount >= quota.limit_count) {
                quotaViolation = quota;
                break;
            }
        }

        const newSubmission = {
            form_id: req.body.formId,
            form_version: req.body.formVersion,
            user_id: req.body.userId || null, // Optional link to user
            data: req.body.data,
            tenant_id: tenantId, // CRITICAL: Populate tenant_id
            metadata: {
                ...headerMetadata,
                ...clientMetadata,
                status: quotaViolation ? 'rejected' : (clientMetadata.status || 'completed'),
                quota_reason: quotaViolation ? quotaViolation.label : null,
                ip_address: req.ip,
                user_agent_parsed: req.get('User-Agent')
            },
            created_at: new Date()
        };

        const savedRow = await submissionRepo.create(newSubmission);
        const savedEntity = toEntity(savedRow);

        // Audit Log
        const log = {
            entity_type: 'Submission',
            entity_id: String(savedEntity.id),
            action: 'CREATE',
            user_id: 'system', // TODO: Auth
            details: { source: 'api', status: newSubmission.metadata.status },
            created_at: new Date()
        };
        await auditRepo.create(log);

        // If it was a quota violation, return 403 AFTER saving the record
        if (quotaViolation) {
            return res.status(403).json({
                error: `Quota exceeded: ${quotaViolation.label}`,
                code: 'QUOTA_EXCEEDED',
                action: quotaViolation.action,
                action_data: quotaViolation.action_data,
                label: quotaViolation.label,
                submissionId: savedEntity.id
            });
        }

        // --- UPDATE QUOTAS ---
        // Increment all quotas that matched this submission (ONLY for completed status)
        if (matchedQuotas.length > 0 && newSubmission.metadata.status === 'completed') {
            for (const quota of matchedQuotas) {
                // 1. Increment Global Count
                await query("UPDATE quotas SET current_count = current_count + 1 WHERE id = $1", [quota.id]);

                // 2. Increment Periodic Count if applicable
                if (quota.reset_period && quota.reset_period !== 'never' && quota.reset_period !== 'global') {
                    const pKey = getPeriodKey(quota.reset_period);
                    await query(`
                        INSERT INTO quota_period_counters (quota_id, period_key, count)
                        VALUES ($1, $2, 1)
                        ON CONFLICT (quota_id, period_key) 
                        DO UPDATE SET count = quota_period_counters.count + 1, updated_at = CURRENT_TIMESTAMP
                    `, [quota.id, pKey]);
                }
            }
        }

        // --- WORKFLOW ENGINE ---
        // Trigger generic automation workflows
        workflowEngine.processSubmission(savedEntity.formId, savedEntity);

        // --- AI TRIGGER LOGIC ---
        // 1. Fetch Active AI Provider from 'ai_providers' table
        const aiProvidersRes = await query("SELECT * FROM ai_providers WHERE is_active = true LIMIT 1");
        const activeProviderRow = aiProvidersRes.rows[0];

        let activeAI = null;
        if (activeProviderRow) {
            activeAI = {
                provider: activeProviderRow.provider,
                apiKey: activeProviderRow.api_key,
                model: 'gemini-2.0-flash' // Default or fetch from config
            };
        }

        // Trigger AI Analysis
        if (savedEntity.data && activeAI) {
            const aiPayload = {
                submission: savedEntity,
                formDefinition: {}, // TODO: fetch form def
                aiConfig: activeAI
            };

            // Using global fetch (Node 18+)
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';
            fetch(`${aiServiceUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiPayload)
            }).then(r => r.json())
                .then(data => console.log('AI Triggered:', data))
                .catch(err => console.error("AI Trigger Failed:", err.message));
        }

        res.status(201).json(savedEntity);
    } catch (error) {
        console.error("Submission Create Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update submission
router.put('/:id', authenticate, async (req, res) => {
    try {
        const existing = await submissionRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Submission not found' });

        const prevData = existing.data;
        const newData = req.body.data;

        const updateData = {
            data: newData,
            updated_at: new Date()
        };

        const updatedRow = await submissionRepo.update(req.params.id, updateData);

        // Audit Log
        const log = {
            entity_type: 'Submission',
            entity_id: String(updatedRow.id),
            action: 'UPDATE',
            user_id: req.user.id,
            details: { previousData: prevData, newData: newData },
            created_at: new Date()
        };
        await auditRepo.create(log);

        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Callback for AI Analysis (internal service endpoint)
router.put('/:id/analysis', authenticate, async (req, res) => {
    try {
        const { analysis } = req.body;
        console.log(`Received analysis for submission ${req.params.id}`);

        const existing = await submissionRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Submission not found' });

        const updatedRow = await submissionRepo.update(req.params.id, {
            analysis,
            updated_at: new Date()
        });

        // Audit Log
        const log = {
            entity_type: 'Submission',
            entity_id: String(updatedRow.id),
            action: 'ANALYSIS_ADDED',
            user_id: 'ai-service',
            details: { provider: analysis.provider },
            created_at: new Date()
        };
        await auditRepo.create(log);

        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete submission
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const existing = await submissionRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Submission not found' });

        await submissionRepo.delete(req.params.id);

        // Audit Log
        const log = {
            entity_type: 'Submission',
            entity_id: String(req.params.id),
            action: 'DELETE',
            user_id: req.user.id,
            details: { deletedData: existing.data },
            created_at: new Date()
        };
        await auditRepo.create(log);

        res.json({ message: 'Submission deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Audit Logs for a submission
router.get('/:id/audit', authenticate, async (req, res) => {
    try {
        // Security check
        const sub = await submissionRepo.findById(req.params.id);
        if (!sub || sub.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Submission not found' });

        const logsRes = await query("SELECT * FROM audit_logs WHERE entity_type = 'Submission' AND entity_id = $1", [req.params.id]);
        res.json(logsRes.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// DELETE all submissions for a form
router.delete('/', authenticate, async (req, res) => {
    try {
        const formId = req.query.formId;
        if (!formId) {
            return res.status(400).json({ error: 'Missing formId query parameter' });
        }

        // Check ownership
        const formCheck = await query('SELECT id FROM forms WHERE id = $1 AND tenant_id = $2', [formId, req.user.tenant_id]);
        if (formCheck.rows.length === 0) return res.status(404).json({ error: 'Form not found or access denied' });

        await query('DELETE FROM submissions WHERE form_id = $1 AND tenant_id = $2', [formId, req.user.tenant_id]);

        // Log action
        await auditRepo.create({
            entity_type: 'Form',
            entity_id: String(formId),
            action: 'DELETE_ALL_SUBMISSIONS',
            user_id: req.user.id,
            details: { action: 'Cleared all responses' },
            created_at: new Date()
        });

        res.json({ message: 'All submissions deleted' });
    } catch (error) {
        console.error("Delete All Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
