const express = require('express');
const router = express.Router();
const db = require('../../infrastructure/database/db');
const { getPeriodKey, matchesCriteria } = require('../../core/quotaUtils');
const authenticate = require('../middleware/auth');

// GET all quotas for a form
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

        // Populate dynamic counts for periodic quotas
        // We can do this with a single JOIN query, or simple loop since quotas per form are few.
        // Loop is simpler to maintain given current structure.

        for (let q of quotas) {
            const pKey = getPeriodKey(q.reset_period);
            if (pKey) {
                const countRes = await db.query(
                    'SELECT count FROM quota_period_counters WHERE quota_id = $1 AND period_key = $2',
                    [q.id, pKey]
                );
                if (countRes.rows.length > 0) {
                    q.current_count = countRes.rows[0].count;
                } else {
                    q.current_count = 0; // New period = 0
                }
            }
        }

        res.json(quotas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch quotas' });
    }
});

// POST create a quota
router.post('/', authenticate, async (req, res) => {
    try {
        let { form_id, label, limit_count, criteria, action, action_data, reset_period, is_active, start_date, end_date } = req.body;

        // Ensure form belongs to tenant
        const formCheck = await db.query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [form_id, req.user.tenant_id]);
        if (formCheck.rows.length === 0) return res.status(404).json({ error: "Form not found or access denied" });

        // Use criteria directly if it's an object, PG handles it for JSONB
        const criteriaToStore = (criteria && typeof criteria === 'object') ? criteria : (criteria ? JSON.parse(criteria) : {});

        console.log(`[QUOTA] Creating quota for form ${form_id}:`, { label, limit_count, criteria: criteriaToStore });

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
        console.error("CREATE QUOTA ERROR:", err);
        res.status(500).json({ error: 'Failed to create quota: ' + err.message });
    }
});

// PUT update a quota
router.put('/:id', authenticate, async (req, res) => {
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

        console.log(`[QUOTA] Updating quota ${id} for form ${targetFormId}:`, { label, limit_count, criteria: criteriaToStore });

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

        console.log("[QUOTA SUCCESS] Updated:", id);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("[QUOTA PUT ERROR]", err);
        res.status(500).json({ error: 'Failed to update quota: ' + err.message });
    }
});

// DELETE a quota
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
        console.error(err);
        res.status(500).json({ error: 'Failed to delete quota' });
    }
});

module.exports = router;
