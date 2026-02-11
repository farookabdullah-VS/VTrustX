const express = require('express');
const router = express.Router();
const db = require('../../infrastructure/database/db');
const { getPeriodKey, matchesCriteria } = require('../../core/quotaUtils');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createQuotaSchema, updateQuotaSchema } = require('../schemas/quotas.schemas');
const logger = require('../../infrastructure/logger');

/**
 * @swagger
 * /api/quotas:
 *   get:
 *     summary: List quotas
 *     description: Retrieve all quotas for a specific form. Includes periodic counter data for quotas with reset periods.
 *     tags: [Quotas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: formId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Form ID to fetch quotas for
 *     responses:
 *       200:
 *         description: Array of quotas with current counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quota'
 *       400:
 *         description: Missing formId query parameter
 *       404:
 *         description: Form not found or access denied
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { formId } = req.query;
        if (!formId) return res.status(400).json({ error: 'formId query required' });

        // Ensure form belongs to tenant
        const formCheck = await db.query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [formId, req.user.tenant_id]);
        if (formCheck.rows.length === 0) return res.status(404).json({ error: "Form not found or access denied" });

        const result = await db.query(
            'SELECT * FROM quotas WHERE form_id = $1 ORDER BY id ASC',
            [formId]
        );

        let quotas = result.rows;

        // Batch-fetch periodic counters to avoid N+1 queries
        const periodicQuotas = quotas.filter(q => getPeriodKey(q.reset_period));
        if (periodicQuotas.length > 0) {
            const quotaIds = periodicQuotas.map(q => q.id);
            const periodKeys = periodicQuotas.map(q => getPeriodKey(q.reset_period));
            const countRes = await db.query(
                `SELECT quota_id, period_key, count FROM quota_period_counters
                 WHERE quota_id = ANY($1::int[]) AND period_key = ANY($2::text[])`,
                [quotaIds, periodKeys]
            );
            const countMap = {};
            for (const row of countRes.rows) {
                countMap[`${row.quota_id}:${row.period_key}`] = row.count;
            }
            for (let q of quotas) {
                const pKey = getPeriodKey(q.reset_period);
                if (pKey) {
                    q.current_count = countMap[`${q.id}:${pKey}`] || 0;
                }
            }
        }

        res.json(quotas);
    } catch (err) {
        logger.error('Failed to fetch quotas', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch quotas' });
    }
});

/**
 * @swagger
 * /api/quotas:
 *   post:
 *     summary: Create quota
 *     description: Create a new quota rule for a form. The initial count is calculated from existing submissions matching the criteria and reset period.
 *     tags: [Quotas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - form_id
 *               - label
 *               - limit_count
 *             properties:
 *               form_id:
 *                 type: integer
 *                 description: ID of the form this quota belongs to
 *               label:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Quota label
 *               limit_count:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum count before quota action triggers
 *               criteria:
 *                 oneOf:
 *                   - type: object
 *                   - type: array
 *                 description: Matching criteria for submissions
 *               action:
 *                 type: string
 *                 maxLength: 100
 *                 description: Action to take when quota is reached
 *               action_data:
 *                 type: object
 *                 description: Additional data for the quota action
 *               reset_period:
 *                 type: string
 *                 enum: [never, daily, weekly, monthly]
 *                 default: never
 *                 description: How often the quota counter resets
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: Quota start date
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: Quota end date
 *     responses:
 *       201:
 *         description: Quota created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quota'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Form not found or access denied
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, validate(createQuotaSchema), async (req, res) => {
    try {
        let { form_id, label, limit_count, criteria, action, action_data, reset_period, is_active, start_date, end_date } = req.body;

        // Ensure form belongs to tenant
        const formCheck = await db.query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [form_id, req.user.tenant_id]);
        if (formCheck.rows.length === 0) return res.status(404).json({ error: "Form not found or access denied" });

        // Use criteria directly if it's an object, PG handles it for JSONB
        const criteriaToStore = (criteria && typeof criteria === 'object') ? criteria : (criteria ? JSON.parse(criteria) : {});

        logger.info('Creating quota', { form_id, label, limit_count, criteria: criteriaToStore });

        // Fetch all submissions for this form to calculate count with complex criteria
        const subsRes = await db.query(`
            SELECT data, created_at, metadata FROM submissions 
            WHERE form_id = $1 
            AND (metadata->>'status' = 'completed' OR metadata->>'status' IS NULL)
        `, [form_id]);

        const initialCount = subsRes.rows.filter(row => {
            // Check Periodic Reset logic
            if (reset_period && reset_period !== 'never') {
                const createdAt = new Date(row.created_at);
                const now = new Date();

                if (reset_period === 'daily') {
                    const today = new Date(now.setHours(0, 0, 0, 0));
                    if (createdAt < today) return false;
                } else if (reset_period === 'monthly') {
                    if (createdAt.getUTCMonth() !== now.getUTCMonth() || createdAt.getUTCFullYear() !== now.getUTCFullYear()) return false;
                } else if (reset_period === 'weekly') {
                    // Simple week check (if within 7 days and same week key)
                    const pKeyRow = getPeriodKey('weekly', createdAt);
                    const pKeyNow = getPeriodKey('weekly', now);
                    if (pKeyRow !== pKeyNow) return false;
                }
            }

            return matchesCriteria(row.data, criteriaToStore);
        }).length;

        const limitCountInt = parseInt(limit_count) || 0;

        const result = await db.query(
            `INSERT INTO quotas (form_id, label, limit_count, current_count, criteria, action, action_data, reset_period, is_active, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [form_id, label, limitCountInt, initialCount, criteriaToStore, action, action_data || null, reset_period, is_active, start_date || null, end_date || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to create quota', { error: err.message });
        res.status(500).json({ error: 'Failed to create quota' });
    }
});

/**
 * @swagger
 * /api/quotas/{id}:
 *   put:
 *     summary: Update quota
 *     description: Update an existing quota. Recalculates the current count based on matching submissions and the new criteria/reset period.
 *     tags: [Quotas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Quota ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - limit_count
 *             properties:
 *               label:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               limit_count:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum count before quota action triggers
 *               criteria:
 *                 oneOf:
 *                   - type: object
 *                   - type: array
 *               action:
 *                 type: string
 *                 maxLength: 100
 *               action_data:
 *                 type: object
 *               reset_period:
 *                 type: string
 *                 enum: [never, daily, weekly, monthly]
 *               is_active:
 *                 type: boolean
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Quota updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quota'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Quota not found or access denied
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, validate(updateQuotaSchema), async (req, res) => {
    try {
        const { id } = req.params;
        let { label, limit_count, criteria, action, action_data, reset_period, is_active, form_id, start_date, end_date } = req.body;

        // First, find the quota and verify it belongs to a form owned by this tenant
        const quotaCheck = await db.query(`
            SELECT q.*, f.tenant_id 
            FROM quotas q 
            JOIN forms f ON q.form_id = f.id 
            WHERE q.id = $1 AND f.tenant_id = $2
        `, [id, req.user.tenant_id]);

        if (quotaCheck.rows.length === 0) return res.status(404).json({ error: "Quota not found or access denied" });

        const existingQuota = quotaCheck.rows[0];
        let targetFormId = form_id || existingQuota.form_id;

        // If form_id is changing, verify the new form also belongs to the tenant
        if (form_id && form_id != existingQuota.form_id) {
            const newFormCheck = await db.query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [form_id, req.user.tenant_id]);
            if (newFormCheck.rows.length === 0) return res.status(403).json({ error: "Cannot move quota to a form you don't own" });
        }

        const limitCountInt = parseInt(limit_count);
        if (isNaN(limitCountInt)) {
            return res.status(400).json({ error: 'limit_count must be a number' });
        }

        const criteriaToStore = (criteria && typeof criteria === 'object') ? criteria : (criteria ? JSON.parse(criteria) : {});

        logger.info('Updating quota', { id, form_id: targetFormId, label, limit_count, criteria: criteriaToStore });

        // Re-Calculate Count correctly respecting period
        let newCount = 0;
        if (targetFormId) {
            const subsRes = await db.query(`
                SELECT data, created_at, metadata FROM submissions 
                WHERE form_id = $1 
                AND (metadata->>'status' = 'completed' OR metadata->>'status' IS NULL)
            `, [targetFormId]);

            newCount = subsRes.rows.filter(row => {
                // Check Periodic Reset logic
                if (reset_period && reset_period !== 'never') {
                    const createdAt = new Date(row.created_at);
                    const now = new Date(); // Use current time for recalculation context

                    if (reset_period === 'daily') {
                        const today = new Date(now.setHours(0, 0, 0, 0));
                        if (createdAt < today) return false;
                    } else if (reset_period === 'monthly') {
                        if (createdAt.getUTCMonth() !== now.getUTCMonth() || createdAt.getUTCFullYear() !== now.getUTCFullYear()) return false;
                    } else if (reset_period === 'weekly') {
                        const { getPeriodKey } = require('../../core/quotaUtils'); // lazy require inside function scope to be safe or reuse from top scope
                        const pKeyRow = getPeriodKey('weekly', createdAt);
                        const pKeyNow = getPeriodKey('weekly', now);
                        if (pKeyRow !== pKeyNow) return false;
                    }
                }

                return matchesCriteria(row.data, criteriaToStore);
            }).length;
        }

        const result = await db.query(
            `UPDATE quotas 
             SET label = $1, limit_count = $2, criteria = $3, action = $4, action_data = $5, reset_period = $6, is_active = $7, current_count = $8, start_date = $9, end_date = $10
             WHERE id = $11
             RETURNING *`,
            [label, limitCountInt, criteriaToStore, action, action_data || null, reset_period, is_active, newCount, start_date || null, end_date || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quota not found' });
        }

        logger.info('Quota updated successfully', { id });
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to update quota', { error: err.message });
        res.status(500).json({ error: 'Failed to update quota' });
    }
});

/**
 * @swagger
 * /api/quotas/{id}:
 *   delete:
 *     summary: Delete quota
 *     description: Delete a quota by ID. Verifies that the quota belongs to a form owned by the authenticated tenant before deletion.
 *     tags: [Quotas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Quota ID
 *     responses:
 *       200:
 *         description: Quota deleted successfully
 *       404:
 *         description: Quota not found or access denied
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership before delete
        const quotaCheck = await db.query(`
            SELECT q.id FROM quotas q 
            JOIN forms f ON q.form_id = f.id 
            WHERE q.id = $1 AND f.tenant_id = $2
        `, [id, req.user.tenant_id]);

        if (quotaCheck.rows.length === 0) return res.status(404).json({ error: "Quota not found or access denied" });

        await db.query('DELETE FROM quotas WHERE id = $1', [id]);
        res.json({ message: 'Quota deleted' });
    } catch (err) {
        logger.error('Failed to delete quota', { error: err.message });
        res.status(500).json({ error: 'Failed to delete quota' });
    }
});

module.exports = router;
