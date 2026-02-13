const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { query, transaction } = require('../../infrastructure/database/db');
const { getPeriodKey, matchesCriteria } = require('../../core/quotaUtils');
const logger = require('../../infrastructure/logger');

const workflowEngine = require('../../core/workflowEngine');
const { classifySubmission } = require('../../core/ctlClassifier');
const sentimentService = require('../../services/sentimentService');

// Initialize Repositories
const submissionRepo = new PostgresRepository('submissions');
const auditRepo = new PostgresRepository('audit_logs');

const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSubmissionSchema } = require('../schemas/submissions.schemas');

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

/**
 * @swagger
 * /api/submissions:
 *   get:
 *     summary: List submissions
 *     description: Retrieve all submissions for the authenticated tenant, optionally filtered by form ID, with pagination support.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *         description: Filter submissions by form ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 1000
 *         description: Number of submissions per page
 *     responses:
 *       200:
 *         description: Array of submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 *       404:
 *         description: Form not found or access denied
 *       500:
 *         description: Internal server error
 */
// Get all submissions (Filtered by Tenant) — with pagination
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const formId = req.query.formId;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 1000));
        const offset = (page - 1) * limit;
        let rows;

        if (formId) {
            // Security check: Verify form belongs to tenant
            const formRes = await query('SELECT id FROM forms WHERE id = $1 AND tenant_id = $2', [formId, tenantId]);
            if (formRes.rows.length === 0) return res.status(404).json({ error: 'Form not found or access denied' });

            const result = await query(
                'SELECT * FROM submissions WHERE form_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
                [formId, tenantId, limit, offset]
            );
            rows = result.rows;
        } else {
            const result = await query(
                'SELECT * FROM submissions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [tenantId, limit, offset]
            );
            rows = result.rows;
        }
        res.json(rows.map(toEntity));
    } catch (error) {
        logger.error('Submissions list error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get submission by ID
 *     description: Retrieve a single submission by its ID. Only accessible if the submission belongs to the authenticated tenant.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
// Get submission by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const row = await submissionRepo.findById(req.params.id);
        if (!row || row.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Submission not found' });
        res.json(toEntity(row));
    } catch (error) {
        logger.error('Submission get error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create submission
 *     description: Create a new form submission. This is a public endpoint (no authentication required). Validates against form response limits and quota rules.
 *     tags: [Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *               - data
 *             properties:
 *               formId:
 *                 type: integer
 *                 description: ID of the form being submitted
 *               data:
 *                 type: object
 *                 description: Form field responses
 *               formVersion:
 *                 type: integer
 *                 nullable: true
 *                 description: Version of the form at time of submission
 *               metadata:
 *                 type: object
 *                 nullable: true
 *                 description: Additional metadata (e.g. status)
 *               userId:
 *                 oneOf:
 *                   - type: integer
 *                   - type: string
 *                 nullable: true
 *                 description: Optional user ID of the respondent
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       403:
 *         description: Form response limit or quota exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *                   enum: [LIMIT_EXCEEDED, QUOTA_EXCEEDED]
 *       404:
 *         description: Form not found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
// Create new submission
router.post('/', validate(createSubmissionSchema), async (req, res) => {
    try {
        const clientMetadata = req.body.metadata || {};
        const formId = req.body.formId;

        // Use transaction for atomic limit/quota check + insert
        const result = await transaction(async (client) => {
            // 1. Check Global Form Response Limit (with FOR UPDATE lock to prevent race)
            const formCheck = await client.query(
                "SELECT response_limit, tenant_id FROM forms WHERE id = $1 FOR UPDATE",
                [formId]
            );
            if (formCheck.rows.length === 0) return { status: 404, body: { error: 'Form not found' } };

            const tenantId = formCheck.rows[0].tenant_id;

            if (formCheck.rows[0].response_limit) {
                const currentSubmissions = await client.query(
                    "SELECT COUNT(*) FROM submissions WHERE form_id = $1",
                    [formId]
                );
                if (parseInt(currentSubmissions.rows[0].count) >= formCheck.rows[0].response_limit) {
                    return { status: 403, body: { error: 'Form response limit reached', code: 'LIMIT_EXCEEDED' } };
                }
            }

            // 2. Check Specific Quotas
            const activeQuotasResult = await client.query(
                "SELECT * FROM quotas WHERE form_id = $1 AND is_active = true FOR UPDATE",
                [formId]
            );
            const activeQuotas = activeQuotasResult.rows;
            const incomingData = req.body.data || {};
            const matchedQuotas = activeQuotas.filter(q => matchesCriteria(incomingData, q.criteria));

            // Batch fetch periodic counters for all matched quotas (N+1 fix)
            let quotaViolation = null;
            if (matchedQuotas.length > 0) {
                const periodicQuotas = matchedQuotas.filter(q =>
                    q.reset_period && q.reset_period !== 'never' && q.reset_period !== 'global'
                );

                let periodCountMap = {};
                if (periodicQuotas.length > 0) {
                    const quotaIds = periodicQuotas.map(q => q.id);
                    const periodKeys = periodicQuotas.map(q => getPeriodKey(q.reset_period));
                    const pcRes = await client.query(
                        `SELECT quota_id, period_key, count FROM quota_period_counters
                         WHERE quota_id = ANY($1) AND period_key = ANY($2)`,
                        [quotaIds, periodKeys]
                    );
                    for (const row of pcRes.rows) {
                        periodCountMap[`${row.quota_id}:${row.period_key}`] = row.count;
                    }
                }

                for (const quota of matchedQuotas) {
                    let currentCount = quota.current_count;
                    if (quota.reset_period && quota.reset_period !== 'never' && quota.reset_period !== 'global') {
                        const pKey = getPeriodKey(quota.reset_period);
                        currentCount = periodCountMap[`${quota.id}:${pKey}`] || 0;
                    }
                    if (currentCount >= quota.limit_count) {
                        quotaViolation = quota;
                        break;
                    }
                }
            }

            const newSubmission = {
                form_id: formId,
                form_version: req.body.formVersion,
                user_id: req.body.userId || null,
                data: req.body.data,
                tenant_id: tenantId,
                metadata: {
                    ...clientMetadata,
                    status: quotaViolation ? 'rejected' : (clientMetadata.status || 'completed'),
                    quota_reason: quotaViolation ? quotaViolation.label : null,
                    ip_address: req.ip,
                    user_agent_parsed: req.get('User-Agent')
                },
                created_at: new Date()
            };

            const savedRow = await submissionRepo.withClient(client).create(newSubmission);
            const savedEntity = toEntity(savedRow);

            // Audit Log
            await auditRepo.withClient(client).create({
                entity_type: 'Submission',
                entity_id: String(savedEntity.id),
                action: 'CREATE',
                user_id: 'system',
                details: { source: 'api', status: newSubmission.metadata.status },
                created_at: new Date()
            });

            // Update quota counters atomically within the same transaction
            if (matchedQuotas.length > 0 && newSubmission.metadata.status === 'completed') {
                for (const quota of matchedQuotas) {
                    await client.query("UPDATE quotas SET current_count = current_count + 1 WHERE id = $1", [quota.id]);

                    if (quota.reset_period && quota.reset_period !== 'never' && quota.reset_period !== 'global') {
                        const pKey = getPeriodKey(quota.reset_period);
                        await client.query(`
                            INSERT INTO quota_period_counters (quota_id, period_key, count)
                            VALUES ($1, $2, 1)
                            ON CONFLICT (quota_id, period_key)
                            DO UPDATE SET count = quota_period_counters.count + 1, updated_at = CURRENT_TIMESTAMP
                        `, [quota.id, pKey]);
                    }
                }
            }

            return { savedEntity, quotaViolation, matchedQuotas };
        });

        // Handle early returns from transaction (limit/quota exceeded before insert)
        if (result.status) {
            return res.status(result.status).json(result.body);
        }

        const { savedEntity, quotaViolation } = result;

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

        // Fire-and-forget: workflow engine + AI + CTL (outside transaction)
        workflowEngine.processSubmission(savedEntity.formId, savedEntity);

        // CTL auto-classify (fire-and-forget)
        try {
            const ctlResult = classifySubmission(savedEntity.data);
            if (ctlResult.shouldAlert) {
                const formCheck = await query('SELECT tenant_id FROM forms WHERE id = $1', [savedEntity.formId]);
                const tenantId = formCheck.rows[0]?.tenant_id;
                if (tenantId) {
                    query(
                        `INSERT INTO ctl_alerts (tenant_id, form_id, submission_id, alert_level, score_value, score_type, sentiment)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [tenantId, savedEntity.formId, savedEntity.id, ctlResult.alertLevel, ctlResult.scoreValue, ctlResult.scoreType, ctlResult.sentiment]
                    ).catch(err => logger.error('CTL auto-classify insert failed', { error: err.message }));
                }
            }
        } catch (ctlErr) {
            logger.error('CTL auto-classify error', { error: ctlErr.message });
        }

        // Sentiment Analysis Trigger Logic
        const aiProvidersRes = await query("SELECT * FROM ai_providers WHERE is_active = true LIMIT 1");
        const activeProviderRow = aiProvidersRes.rows[0];

        if (savedEntity.data && activeProviderRow) {
            // Extract text fields for sentiment analysis
            const textFields = sentimentService.extractTextFields(savedEntity.data, {});

            if (textFields.length > 0) {
                const sentimentPrompt = sentimentService.buildSentimentPrompt(textFields);

                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';
                const aiConfig = {
                    provider: activeProviderRow.provider,
                    apiKey: activeProviderRow.api_key,
                    model: activeProviderRow.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'
                };

                // Fire-and-forget sentiment analysis
                fetch(`${aiServiceUrl}/analyze-sentiment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: sentimentPrompt, aiConfig })
                })
                    .then(r => r.json())
                    .then(async (data) => {
                        try {
                            const parsed = sentimentService.parseSentimentResponse(data.sentiment);

                            if (parsed) {
                                // Store sentiment in analysis field
                                const analysisData = {
                                    provider: aiConfig.provider,
                                    timestamp: new Date().toISOString(),
                                    sentiment: {
                                        ...parsed,
                                        flagged: sentimentService.shouldTriggerAlert(parsed),
                                        flagReason: sentimentService.shouldTriggerAlert(parsed)
                                            ? sentimentService.getFlagReason(parsed)
                                            : null
                                    }
                                };

                                await query(
                                    'UPDATE submissions SET analysis = $1 WHERE id = $2',
                                    [JSON.stringify(analysisData), savedEntity.id]
                                );

                                logger.info('Sentiment analysis completed', {
                                    submissionId: savedEntity.id,
                                    score: parsed.aggregate?.score,
                                    emotion: parsed.aggregate?.emotion
                                });

                                // Create CTL alert if negative sentiment detected
                                if (sentimentService.shouldTriggerAlert(parsed)) {
                                    const alertLevel = sentimentService.getCTLAlertLevel(parsed.aggregate.score);
                                    const formCheck = await query('SELECT tenant_id FROM forms WHERE id = $1', [savedEntity.formId]);
                                    const tenantId = formCheck.rows[0]?.tenant_id;

                                    if (tenantId && alertLevel) {
                                        await query(
                                            `INSERT INTO ctl_alerts (tenant_id, form_id, submission_id, alert_level, score_value, score_type, sentiment)
                                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                                            [
                                                tenantId,
                                                savedEntity.formId,
                                                savedEntity.id,
                                                alertLevel,
                                                parsed.aggregate.score,
                                                'sentiment_ai',
                                                parsed.aggregate.emotion
                                            ]
                                        );

                                        logger.info('CTL alert created for negative sentiment', {
                                            submissionId: savedEntity.id,
                                            alertLevel,
                                            score: parsed.aggregate.score
                                        });
                                    }
                                }
                            }
                        } catch (storageErr) {
                            logger.error('Failed to store sentiment analysis', {
                                submissionId: savedEntity.id,
                                error: storageErr.message
                            });
                        }
                    })
                    .catch(err => logger.error('Sentiment analysis failed', {
                        submissionId: savedEntity.id,
                        error: err.message
                    }));
            } else {
                logger.debug('No text fields found for sentiment analysis', {
                    submissionId: savedEntity.id
                });
            }
        }

        res.status(201).json(savedEntity);
    } catch (error) {
        logger.error('Submission create error', { error: error.message });
        res.status(500).json({ error: 'Failed to create submission' });
    }
});

/**
 * @swagger
 * /api/submissions/{id}:
 *   put:
 *     summary: Update submission
 *     description: Update the data of an existing submission. Only accessible if the submission belongs to the authenticated tenant. Creates an audit log entry.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 description: Updated form field responses
 *     responses:
 *       200:
 *         description: Updated submission object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
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
        logger.error('Submission update error', { error: error.message });
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

/**
 * @swagger
 * /api/submissions/{id}/analysis:
 *   put:
 *     summary: Update submission analysis
 *     description: Store or update AI-generated analysis results for a submission. Typically called by the internal AI service after processing.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analysis
 *             properties:
 *               analysis:
 *                 type: object
 *                 description: AI analysis results including provider, sentiment, themes, etc.
 *     responses:
 *       200:
 *         description: Updated submission with analysis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
// Callback for AI Analysis (internal service endpoint)
router.put('/:id/analysis', authenticate, async (req, res) => {
    try {
        const { analysis } = req.body;
        logger.info('Received AI analysis', { submissionId: req.params.id });

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
        logger.error('Submission analysis update error', { error: error.message });
        res.status(500).json({ error: 'Failed to update analysis' });
    }
});

/**
 * @swagger
 * /api/submissions/{id}:
 *   delete:
 *     summary: Delete submission
 *     description: Delete a submission by ID. Only accessible if the submission belongs to the authenticated tenant. Creates an audit log entry.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Submission deleted successfully
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
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
        logger.error('Submission delete error', { error: error.message });
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

/**
 * @swagger
 * /api/submissions/{id}/audit:
 *   get:
 *     summary: Get submission audit trail
 *     description: Retrieve all audit log entries for a specific submission. Only accessible if the submission belongs to the authenticated tenant.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Array of audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   entity_type:
 *                     type: string
 *                     example: Submission
 *                   entity_id:
 *                     type: string
 *                   action:
 *                     type: string
 *                     enum: [CREATE, UPDATE, DELETE, ANALYSIS_ADDED]
 *                   user_id:
 *                     type: string
 *                   details:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
// Get Audit Logs for a submission
router.get('/:id/audit', authenticate, async (req, res) => {
    try {
        // Security check
        const sub = await submissionRepo.findById(req.params.id);
        if (!sub || sub.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Submission not found' });

        const logsRes = await query("SELECT * FROM audit_logs WHERE entity_type = 'Submission' AND entity_id = $1", [req.params.id]);
        res.json(logsRes.rows);
    } catch (error) {
        logger.error('Submission audit log error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});


/**
 * @swagger
 * /api/submissions:
 *   delete:
 *     summary: Bulk delete submissions
 *     description: Delete all submissions for a specific form. Requires the formId query parameter. Only accessible if the form belongs to the authenticated tenant.
 *     tags: [Submissions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: formId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Form ID whose submissions should be deleted
 *     responses:
 *       200:
 *         description: All submissions deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All submissions deleted
 *       400:
 *         description: Missing formId query parameter
 *       404:
 *         description: Form not found or access denied
 *       500:
 *         description: Internal server error
 */
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
        logger.error('Submissions bulk delete error', { error: error.message });
        res.status(500).json({ error: 'Failed to delete submissions' });
    }
});

module.exports = router;
