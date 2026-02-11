const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../../infrastructure/logger');
const { classifySubmission } = require('../../core/ctlClassifier');
const {
    alertsQuerySchema,
    createTicketFromAlertSchema,
    updateAlertSchema,
    scanFormSchema,
    statsQuerySchema,
} = require('../schemas/close_loop.schemas');

// Helper: verify form belongs to tenant
async function verifyFormOwnership(formId, tenantId) {
    const res = await query('SELECT id FROM forms WHERE id = $1 AND tenant_id = $2', [formId, tenantId]);
    return res.rows.length > 0;
}

// ─── GET /alerts — List alerts with submission data joined ───
router.get('/alerts', authenticate, validate(alertsQuerySchema, 'query'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { formId, status, alertLevel, page, limit } = req.query;
        const offset = (page - 1) * limit;

        if (!(await verifyFormOwnership(formId, tenantId))) {
            return res.status(404).json({ error: 'Form not found or access denied' });
        }

        let sql = `
            SELECT a.*,
                   s.data AS submission_data,
                   s.created_at AS submission_date,
                   t.ticket_code,
                   t.status AS ticket_status
            FROM ctl_alerts a
            LEFT JOIN submissions s ON a.submission_id = s.id
            LEFT JOIN tickets t ON a.ticket_id = t.id
            WHERE a.tenant_id = $1 AND a.form_id = $2
        `;
        const params = [tenantId, formId];
        let paramIdx = 3;

        if (status) {
            sql += ` AND a.status = $${paramIdx++}`;
            params.push(status);
        }
        if (alertLevel) {
            sql += ` AND a.alert_level = $${paramIdx++}`;
            params.push(alertLevel);
        }

        sql += ` ORDER BY a.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(limit, offset);

        const result = await query(sql, params);

        // Get total count for pagination
        let countSql = `SELECT COUNT(*) FROM ctl_alerts WHERE tenant_id = $1 AND form_id = $2`;
        const countParams = [tenantId, formId];
        let countIdx = 3;
        if (status) {
            countSql += ` AND status = $${countIdx++}`;
            countParams.push(status);
        }
        if (alertLevel) {
            countSql += ` AND alert_level = $${countIdx++}`;
            countParams.push(alertLevel);
        }
        const countResult = await query(countSql, countParams);

        res.json({
            alerts: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
        });
    } catch (error) {
        logger.error('CTL alerts list error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// ─── POST /alerts/:alertId/ticket — Create follow-up ticket from alert ───
router.post('/alerts/:alertId/ticket', authenticate, validate(createTicketFromAlertSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const alertId = parseInt(req.params.alertId);
        const { subject, priority, assignee_id } = req.body;

        const result = await transaction(async (client) => {
            // Fetch and verify alert ownership
            const alertRes = await client.query(
                'SELECT * FROM ctl_alerts WHERE id = $1 AND tenant_id = $2',
                [alertId, tenantId]
            );
            if (alertRes.rows.length === 0) {
                return { status: 404, body: { error: 'Alert not found' } };
            }

            const alert = alertRes.rows[0];
            if (alert.ticket_id) {
                return { status: 409, body: { error: 'Alert already has a linked ticket', ticketId: alert.ticket_id } };
            }

            // Resolve contact from submission
            const subRes = await client.query('SELECT * FROM submissions WHERE id = $1', [alert.submission_id]);
            const submissionData = subRes.rows[0]?.data || {};
            const email = submissionData.email || submissionData.Email || submissionData.contact_email;
            const name = submissionData.name || submissionData.Name || 'Anonymous';

            let contactId = null;
            if (email) {
                const contactRes = await client.query('SELECT id FROM crm_contacts WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
                if (contactRes.rows.length > 0) {
                    contactId = contactRes.rows[0].id;
                } else {
                    const newContact = await client.query(
                        'INSERT INTO crm_contacts (name, email, tenant_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
                        [name, email, tenantId]
                    );
                    contactId = newContact.rows[0].id;
                }
            }

            // Create ticket
            const ticketCode = 'CTL-' + Math.floor(100000 + Math.random() * 900000);
            const now = new Date();
            const description = `Close the Loop follow-up.\n\nAlert Level: ${alert.alert_level}\nScore: ${alert.score_value} (${alert.score_type})\nSentiment: ${alert.sentiment}`;

            const ticketRes = await client.query(`
                INSERT INTO tickets (
                    ticket_code, subject, description, priority, status,
                    channel, contact_id, assigned_to, created_at, updated_at,
                    tenant_id, first_response_due_at, resolution_due_at, submission_id
                ) VALUES (
                    $1, $2, $3, $4, 'new',
                    'ctl', $5, $6, NOW(), NOW(),
                    $7, $8, $9, $10
                ) RETURNING id, ticket_code
            `, [
                ticketCode,
                subject,
                description,
                priority,
                contactId,
                assignee_id || null,
                tenantId,
                new Date(now.getTime() + 24 * 60 * 60 * 1000),
                new Date(now.getTime() + 48 * 60 * 60 * 1000),
                alert.submission_id
            ]);

            const ticket = ticketRes.rows[0];

            // Update alert: link ticket and set status to in_progress
            await client.query(
                'UPDATE ctl_alerts SET ticket_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
                [ticket.id, 'in_progress', alertId]
            );

            return { ticket, alert: { ...alert, ticket_id: ticket.id, status: 'in_progress' } };
        });

        if (result.status) {
            return res.status(result.status).json(result.body);
        }

        res.status(201).json(result);
    } catch (error) {
        logger.error('CTL create ticket error', { error: error.message });
        res.status(500).json({ error: 'Failed to create ticket from alert' });
    }
});

// ─── PUT /alerts/:alertId — Update alert status ───
router.put('/alerts/:alertId', authenticate, validate(updateAlertSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const alertId = parseInt(req.params.alertId);
        const { status, notes } = req.body;

        const existing = await query('SELECT * FROM ctl_alerts WHERE id = $1 AND tenant_id = $2', [alertId, tenantId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const updates = { status, updated_at: new Date() };
        if (notes !== undefined) updates.notes = notes;
        if (status === 'resolved') {
            updates.resolved_at = new Date();
            updates.resolved_by = req.user.id;
        }

        const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`);
        const values = Object.values(updates);

        const result = await query(
            `UPDATE ctl_alerts SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} AND tenant_id = $${values.length + 2} RETURNING *`,
            [...values, alertId, tenantId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('CTL update alert error', { error: error.message });
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

// ─── GET /stats — Aggregate metrics ───
router.get('/stats', authenticate, validate(statsQuerySchema, 'query'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { formId } = req.query;

        if (!(await verifyFormOwnership(formId, tenantId))) {
            return res.status(404).json({ error: 'Form not found or access denied' });
        }

        // Counts by status
        const statusRes = await query(
            `SELECT status, COUNT(*) as count FROM ctl_alerts WHERE tenant_id = $1 AND form_id = $2 GROUP BY status`,
            [tenantId, formId]
        );

        // Counts by alert level
        const levelRes = await query(
            `SELECT alert_level, COUNT(*) as count FROM ctl_alerts WHERE tenant_id = $1 AND form_id = $2 GROUP BY alert_level`,
            [tenantId, formId]
        );

        // Average resolution time (for resolved alerts)
        const avgRes = await query(
            `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_seconds
             FROM ctl_alerts WHERE tenant_id = $1 AND form_id = $2 AND status = 'resolved' AND resolved_at IS NOT NULL`,
            [tenantId, formId]
        );

        // 7-day trend
        const trendRes = await query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM ctl_alerts WHERE tenant_id = $1 AND form_id = $2 AND created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY date`,
            [tenantId, formId]
        );

        const statusCounts = {};
        statusRes.rows.forEach(r => { statusCounts[r.status] = parseInt(r.count); });

        const levelCounts = {};
        levelRes.rows.forEach(r => { levelCounts[r.alert_level] = parseInt(r.count); });

        const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        const resolved = statusCounts.resolved || 0;
        const avgResolutionSeconds = avgRes.rows[0]?.avg_seconds ? parseFloat(avgRes.rows[0].avg_seconds) : null;

        res.json({
            total,
            byStatus: statusCounts,
            byLevel: levelCounts,
            resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
            avgResolutionHours: avgResolutionSeconds ? Math.round(avgResolutionSeconds / 3600 * 10) / 10 : null,
            trend: trendRes.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
        });
    } catch (error) {
        logger.error('CTL stats error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─── POST /scan — Retroactive scan for existing submissions ───
router.post('/scan', authenticate, validate(scanFormSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { formId } = req.body;

        if (!(await verifyFormOwnership(formId, tenantId))) {
            return res.status(404).json({ error: 'Form not found or access denied' });
        }

        // Get submissions that don't have CTL alerts yet
        const subRes = await query(
            `SELECT s.id, s.data FROM submissions s
             WHERE s.form_id = $1 AND s.tenant_id = $2
             AND NOT EXISTS (SELECT 1 FROM ctl_alerts a WHERE a.submission_id = s.id)`,
            [formId, tenantId]
        );

        let created = 0;
        for (const sub of subRes.rows) {
            const result = classifySubmission(sub.data);
            if (result.shouldAlert) {
                await query(
                    `INSERT INTO ctl_alerts (tenant_id, form_id, submission_id, alert_level, score_value, score_type, sentiment)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [tenantId, formId, sub.id, result.alertLevel, result.scoreValue, result.scoreType, result.sentiment]
                );
                created++;
            }
        }

        logger.info('CTL scan completed', { formId, scanned: subRes.rows.length, alertsCreated: created });
        res.json({ scanned: subRes.rows.length, alertsCreated: created });
    } catch (error) {
        logger.error('CTL scan error', { error: error.message });
        res.status(500).json({ error: 'Failed to scan submissions' });
    }
});

module.exports = router;
