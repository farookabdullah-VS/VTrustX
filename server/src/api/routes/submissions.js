const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { query } = require('../../infrastructure/database/db');

const workflowEngine = require('../../core/workflowEngine');

// Initialize Repositories
const submissionRepo = new PostgresRepository('submissions');
const auditRepo = new PostgresRepository('audit_logs');
// const providerRepo = new PostgresRepository('ai_providers'); // DEPRECATED for Form-Config

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
        updatedAt: row.updated_at
    };
};

// Get all submissions
router.get('/', async (req, res) => {
    try {
        const formId = req.query.formId;
        let rows;
        if (formId) {
            const result = await query('SELECT * FROM submissions WHERE form_id = $1', [formId]);
            rows = result.rows;
        } else {
            rows = await submissionRepo.findAll();
        }
        res.json(rows.map(toEntity));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get submission by ID
router.get('/:id', async (req, res) => {
    try {
        const row = await submissionRepo.findById(req.params.id);
        if (!row) return res.status(404).json({ error: 'Submission not found' });
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

        const newSubmission = {
            form_id: req.body.formId,
            form_version: req.body.formVersion,
            data: req.body.data,
            // Merge client metadata, system headers, and explicit IP
            metadata: {
                ...headerMetadata,
                ...clientMetadata,
                ip_address: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
                user_agent_parsed: req.get('User-Agent') // Ensure it's explicitly available
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
            details: { source: 'api' },
            created_at: new Date()
        };
        await auditRepo.create(log);

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
            fetch('http://localhost:3001/analyze', {
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
router.put('/:id', async (req, res) => {
    try {
        const existing = await submissionRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Submission not found' });

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
            user_id: 'system',
            details: { previousData: prevData, newData: newData },
            created_at: new Date()
        };
        await auditRepo.create(log);

        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Callback for AI Analysis
router.put('/:id/analysis', async (req, res) => {
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

// Get Audit Logs for a submission
router.get('/:id/audit', async (req, res) => {
    try {
        // Optimization: Query DB directly
        const logsRes = await query("SELECT * FROM audit_logs WHERE entity_type = 'Submission' AND entity_id = $1", [req.params.id]);
        res.json(logsRes.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE a specific submission
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await submissionRepo.findById(id);
        if (!existing) return res.status(404).json({ error: 'Submission not found' });

        await submissionRepo.delete(id);

        // Audit Log
        const log = {
            entity_type: 'Submission',
            entity_id: String(id),
            action: 'DELETE',
            user_id: 'system',
            details: { form_id: existing.form_id },
            created_at: new Date()
        };
        await auditRepo.create(log);

        res.json({ message: 'Submission deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE all submissions for a form
router.delete('/', async (req, res) => {
    try {
        const formId = req.query.formId;
        if (!formId) {
            return res.status(400).json({ error: 'Missing formId query parameter' });
        }

        // Check if form exists and belongs to tenant (implicit check via form query usually needed, 
        // but for now we trust the ID if authenticated)
        // Ideally we check ownership using req.user.tenant_id vs form.tenant_id

        await query('DELETE FROM submissions WHERE form_id = $1', [formId]);

        // Log action
        const auditRepo = new PostgresRepository('audit_logs');
        await auditRepo.create({
            entity_type: 'Form',
            entity_id: String(formId),
            action: 'DELETE_ALL_SUBMISSIONS',
            user_id: 'system',
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
