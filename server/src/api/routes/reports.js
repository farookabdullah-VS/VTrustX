const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

/**
 * @swagger
 * /api/reports/crm-stats:
 *   get:
 *     summary: Get CRM dashboard statistics
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CRM statistics including status counts, performance, priority, channel, and SLA data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   description: Ticket counts by status
 *                 performance:
 *                   type: object
 *                   properties:
 *                     avgResolutionUrl:
 *                       type: number
 *                       description: Average resolution time in hours
 *                 byPriority:
 *                   type: object
 *                   description: Ticket counts by priority
 *                 byChannel:
 *                   type: object
 *                   description: Ticket counts by channel
 *                 sla:
 *                   type: object
 *                   properties:
 *                     breached:
 *                       type: integer
 *                     complianceRate:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
// CRM DASHBOARD STATS (Enhanced)
router.get('/crm-stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        // 1. Status Counts
        const statusRes = await query(
            "SELECT status, count(*) as count FROM tickets WHERE tenant_id = $1 GROUP BY status",
            [tenantId]
        );
        const statusMap = statusRes.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {});

        // 2. Avg Resolution Time (in hours)
        const perfRes = await query(`
            SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600) as avg_hours
            FROM tickets
            WHERE tenant_id = $1 AND closed_at IS NOT NULL
        `, [tenantId]);

        // 3. By Priority
        const prioRes = await query(
            "SELECT priority, count(*) as count FROM tickets WHERE tenant_id = $1 GROUP BY priority",
            [tenantId]
        );
        const byPriority = prioRes.rows.reduce((acc, row) => ({ ...acc, [row.priority]: parseInt(row.count) }), {});

        // 4. By Channel
        const channelRes = await query(
            "SELECT COALESCE(channel, 'web') as channel, count(*) as count FROM tickets WHERE tenant_id = $1 GROUP BY COALESCE(channel, 'web')",
            [tenantId]
        );
        const byChannel = channelRes.rows.reduce((acc, row) => ({ ...acc, [row.channel]: parseInt(row.count) }), {});

        // 5. SLA data
        const totalTickets = Object.values(statusMap).reduce((a, b) => a + b, 0);
        const breachRes = await query(`
            SELECT COUNT(*) as count FROM tickets
            WHERE tenant_id = $1
               AND ((resolution_due_at < NOW() AND status NOT IN ('resolved', 'closed'))
               OR (first_response_due_at < NOW() AND first_response_at IS NULL AND status NOT IN ('new', 'resolved', 'closed')))
        `, [tenantId]);
        const breached = parseInt(breachRes.rows[0].count);

        res.json({
            stats: statusMap,
            performance: {
                avgResolutionUrl: perfRes.rows[0].avg_hours || 0
            },
            byPriority,
            byChannel,
            sla: {
                breached,
                complianceRate: totalTickets > 0 ? Math.round(((totalTickets - breached) / totalTickets) * 100) : 100
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/reports/agent-performance:
 *   get:
 *     summary: Get agent performance metrics
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of agents with performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   total_tickets:
 *                     type: integer
 *                   resolved:
 *                     type: integer
 *                   sla_breaches:
 *                     type: integer
 *                   avg_resolution_hours:
 *                     type: number
 *                   tickets_this_week:
 *                     type: integer
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
// AGENT PERFORMANCE
router.get('/agent-performance', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(`
            SELECT
                u.id as user_id,
                u.username,
                COUNT(t.id) as total_tickets,
                COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved,
                COUNT(CASE WHEN (t.resolution_due_at < NOW() AND t.status NOT IN ('resolved', 'closed')) THEN 1 END) as sla_breaches,
                ROUND(AVG(CASE WHEN t.closed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/3600 END)::numeric, 1) as avg_resolution_hours,
                COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as tickets_this_week
            FROM users u
            LEFT JOIN tickets t ON t.assigned_user_id = u.id AND t.tenant_id = $1
            WHERE u.tenant_id = $1
            GROUP BY u.id, u.username
            HAVING COUNT(t.id) > 0
            ORDER BY COUNT(t.id) DESC
        `, [tenantId]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/reports/sla-compliance:
 *   get:
 *     summary: Get SLA compliance report
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: SLA compliance data with overall, weekly, and priority breakdowns
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overall:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     metSla:
 *                       type: integer
 *                     breached:
 *                       type: integer
 *                     complianceRate:
 *                       type: integer
 *                 byWeek:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       week:
 *                         type: string
 *                         format: date-time
 *                       total:
 *                         type: integer
 *                       breached:
 *                         type: integer
 *                       met:
 *                         type: integer
 *                       complianceRate:
 *                         type: integer
 *                 byPriority:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       priority:
 *                         type: string
 *                       total:
 *                         type: integer
 *                       breached:
 *                         type: integer
 *                       met:
 *                         type: integer
 *                       complianceRate:
 *                         type: integer
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
// SLA COMPLIANCE
router.get('/sla-compliance', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        // Overall
        const totalRes = await query("SELECT COUNT(*) as count FROM tickets WHERE tenant_id = $1", [tenantId]);
        const total = parseInt(totalRes.rows[0].count);

        const breachRes = await query(`
            SELECT COUNT(*) as count FROM tickets
            WHERE tenant_id = $1
               AND ((resolution_due_at < NOW() AND status NOT IN ('resolved', 'closed'))
               OR (first_response_due_at < NOW() AND first_response_at IS NULL AND status NOT IN ('new', 'resolved', 'closed')))
        `, [tenantId]);
        const breached = parseInt(breachRes.rows[0].count);
        const metSla = total - breached;

        // By Week (last 8 weeks)
        const weeklyRes = await query(`
            SELECT
                date_trunc('week', t.created_at) as week,
                COUNT(*) as total,
                COUNT(CASE WHEN (t.resolution_due_at < NOW() AND t.status NOT IN ('resolved', 'closed')) THEN 1 END) as breached
            FROM tickets t
            WHERE t.tenant_id = $1 AND t.created_at >= NOW() - INTERVAL '8 weeks'
            GROUP BY 1
            ORDER BY 1
        `, [tenantId]);
        const byWeek = weeklyRes.rows.map(r => ({
            week: r.week,
            total: parseInt(r.total),
            breached: parseInt(r.breached),
            met: parseInt(r.total) - parseInt(r.breached),
            complianceRate: parseInt(r.total) > 0 ? Math.round(((parseInt(r.total) - parseInt(r.breached)) / parseInt(r.total)) * 100) : 100
        }));

        // By Priority
        const prioRes = await query(`
            SELECT
                t.priority,
                COUNT(*) as total,
                COUNT(CASE WHEN (t.resolution_due_at < NOW() AND t.status NOT IN ('resolved', 'closed')) THEN 1 END) as breached
            FROM tickets t
            WHERE t.tenant_id = $1
            GROUP BY t.priority
        `, [tenantId]);
        const byPriority = prioRes.rows.map(r => ({
            priority: r.priority,
            total: parseInt(r.total),
            breached: parseInt(r.breached),
            met: parseInt(r.total) - parseInt(r.breached),
            complianceRate: parseInt(r.total) > 0 ? Math.round(((parseInt(r.total) - parseInt(r.breached)) / parseInt(r.total)) * 100) : 100
        }));

        res.json({
            overall: { total, metSla, breached, complianceRate: total > 0 ? Math.round((metSla / total) * 100) : 100 },
            byWeek,
            byPriority
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/reports/crm-trends:
 *   get:
 *     summary: Get CRM ticket volume trends over time
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Daily ticket counts for the last 30 days
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   count:
 *                     type: integer
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
// CRM TRENDS (Volume over time)
router.get('/crm-trends', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(`
            SELECT date_trunc('day', created_at) as date, count(*) as count 
            FROM tickets 
            WHERE tenant_id = $1
            GROUP BY 1 
            ORDER BY 1 DESC
            LIMIT 30
        `, [tenantId]);

        const trends = result.rows.map(r => ({
            date: r.date,
            count: parseInt(r.count)
        })).reverse(); // Oldest first for chart

        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/reports/powerbi:
 *   get:
 *     summary: Get Power BI data feed
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: secret
 *         required: true
 *         schema:
 *           type: string
 *         description: Power BI integration API key
 *     responses:
 *       200:
 *         description: Flattened survey response data for Power BI consumption
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   Survey:
 *                     type: string
 *                   Timestamp:
 *                     type: string
 *                     format: date-time
 *                   Location:
 *                     type: string
 *                     nullable: true
 *       401:
 *         description: Missing secret key
 *       403:
 *         description: Invalid or inactive access key
 *       500:
 *         description: Server error
 */
// Power BI OData-like Feed or Simple JSON
router.get('/powerbi', async (req, res) => {
    try {
        const { secret } = req.query;
        if (!secret) return res.status(401).json({ error: "Missing secret key" });

        const integRes = await query("SELECT * FROM integrations WHERE provider = 'Power BI' AND api_key = $1 AND is_active = true", [secret]);
        if (integRes.rows.length === 0) return res.status(403).json({ error: "Invalid or inactive access key" });

        const tenantId = integRes.rows[0].tenant_id;

        const sql = `
            SELECT 
                f.title as survey_title,
                s.data as response_data,
                s.created_at,
                s.metadata
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            WHERE f.tenant_id = $1
            ORDER BY s.created_at DESC
            LIMIT 5000 
        `;

        const result = await query(sql, [tenantId]);

        const flatData = result.rows.map(row => ({
            Survey: row.survey_title,
            Timestamp: row.created_at,
            ...row.response_data,
            Location: row.metadata?.location ? `${row.metadata.location.lat},${row.metadata.location.long}` : null
        }));

        res.json(flatData);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const moment = require('moment');
const { toBuffer, VariableType, VariableMeasure } = require('@codious/sav-reader-writer');

// Helper to strip HTML tags from labels
function cleanLabel(text) {
    if (!text) return "";
    let str = typeof text === 'object' ? (text.default || JSON.stringify(text)) : text.toString();
    return str.replace(/<[^>]*>/g, '').substring(0, 255);
}

// Helper to extract all questions from SurveyJS JSON
function getAllQuestions(json) {
    const questions = [];
    if (!json || !json.pages) return questions;

    const iterate = (elements) => {
        if (!elements) return;
        elements.forEach(el => {
            if (el.elements) {
                iterate(el.elements);
            } else if (el.type === 'panel' || el.type === 'paneldynamic') {
                if (el.elements) iterate(el.elements);
                if (el.templateElements) iterate(el.templateElements);
            } else if (el.type === 'matrix') {
                if (el.rows && el.columns) {
                    el.rows.forEach(row => {
                        const rowVal = row.value !== undefined ? row.value : row;
                        questions.push({
                            ...el,
                            type: 'matrix_row',
                            name: `${el.name}_${rowVal}`,
                            title: `${el.title || el.name} - ${row.text || rowVal}`,
                            originalName: el.name,
                            rowValue: rowVal,
                            choices: el.columns
                        });
                    });
                }
            } else if (el.name) {
                questions.push(el);
            }
        });
    };

    json.pages.forEach(page => iterate(page.elements));
    return questions;
}

// SPSS Variable name requirements: 
function sanitizeSpssName(name, usedNames) {
    if (!name) return 'V' + Math.floor(Math.random() * 100000);
    let clean = name.replace(/[^a-zA-Z0-9@!._#$]/g, '_');
    if (!/^[a-zA-Z@]/.test(clean)) clean = 'V' + clean;
    if (clean.endsWith('.')) clean = clean.slice(0, -1) + '_';

    let finalName = clean.substring(0, 64);
    let counter = 1;
    while (usedNames.has(finalName.toUpperCase())) {
        const suffix = `_${counter}`;
        finalName = clean.substring(0, 64 - suffix.length) + suffix;
        counter++;
    }
    usedNames.add(finalName.toUpperCase());
    return finalName;
}

/**
 * @swagger
 * /api/reports/export/spss/{formId}:
 *   get:
 *     summary: Export form submissions in SPSS (.sav) format
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the form to export
 *     responses:
 *       200:
 *         description: SPSS binary file download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Form not found
 *       500:
 *         description: SPSS generation failed
 */
// SPSS EXPORT (.sav)
router.get('/export/spss/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;

        const formRes = await query("SELECT * FROM forms WHERE id = $1 AND tenant_id = $2", [formId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });
        const form = formRes.rows[0];

        const subRes = await query("SELECT * FROM submissions WHERE form_id = $1 ORDER BY created_at", [formId]);
        const submissions = subRes.rows;

        const questions = getAllQuestions(form.definition);
        const variables = [];
        const usedNames = new Set();
        const nameMap = {};

        const idVar = sanitizeSpssName('ID', usedNames);
        const createdVar = sanitizeSpssName('CREATED', usedNames);

        variables.push({
            name: idVar,
            type: VariableType.Numeric,
            label: 'Submission ID',
            width: 10,
            decimal: 0,
            measure: VariableMeasure.Continuous
        });
        variables.push({
            name: createdVar,
            type: VariableType.DateTime,
            label: 'Submission Date',
            width: 19
        });

        questions.forEach(q => {
            const spssName = sanitizeSpssName(q.name, usedNames);
            nameMap[q.name] = { spssName, qRef: q };

            const varObj = {
                name: spssName,
                label: cleanLabel(q.title || q.name),
                measure: VariableMeasure.Nominal
            };

            const isCategorical = ['radiogroup', 'dropdown', 'boolean', 'matrix_row'].includes(q.type);
            const isRating = q.type === 'rating';

            if (isCategorical || isRating) {
                varObj.type = VariableType.Numeric;
                varObj.width = 10;
                varObj.decimal = 0;
                if (isRating) varObj.measure = VariableMeasure.Ordinal;

                if (q.choices && Array.isArray(q.choices)) {
                    varObj.valueLabels = q.choices.map((c, idx) => {
                        const val = c.value !== undefined ? c.value : (c.itemValue !== undefined ? c.itemValue : c);
                        const text = c.text !== undefined ? c.text : (c.itemText !== undefined ? c.itemText : val);
                        return {
                            value: (val !== undefined && !isNaN(val)) ? Number(val) : (idx + 1),
                            label: cleanLabel(text)
                        };
                    });
                } else if (q.type === 'boolean') {
                    varObj.valueLabels = [
                        { value: 1, label: cleanLabel(q.labelTrue || 'True') },
                        { value: 0, label: cleanLabel(q.labelFalse || 'False') }
                    ];
                }
            } else if (q.type === 'text' && q.inputType === 'number') {
                varObj.type = VariableType.Numeric;
                varObj.width = 10;
                varObj.decimal = 2;
                varObj.measure = VariableMeasure.Continuous;
            } else {
                varObj.type = VariableType.String;
                varObj.width = 255;
            }
            variables.push(varObj);
        });

        const records = submissions.map(s => {
            const data = s.data || {};
            const rec = {};
            rec[idVar] = s.id;
            rec[createdVar] = moment(s.createdAt || s.created_at).format('DD-MM-YYYY HH:mm:SS');

            questions.forEach(q => {
                const { spssName } = nameMap[q.name];
                const v = variables.find(x => x.name === spssName);
                let val = (q.type === 'matrix_row') ? (data[q.originalName] ? data[q.originalName][q.rowValue] : null) : data[q.name];

                if (v.type === VariableType.Numeric) {
                    if (val === undefined || val === null || val === "") {
                        rec[spssName] = null;
                    } else if (q.type === 'boolean') {
                        rec[spssName] = (val === true || val === 'true') ? 1 : 0;
                    } else {
                        let num = Number(val);
                        if (isNaN(num)) {
                            if (q.choices && Array.isArray(q.choices)) {
                                const choiceIdx = q.choices.findIndex(c => {
                                    const cVal = c.value !== undefined ? c.value : (c.itemValue !== undefined ? c.itemValue : c);
                                    const cText = c.text !== undefined ? c.text : (c.itemText !== undefined ? c.itemText : cVal);
                                    return cVal === val || cText === val;
                                });
                                if (choiceIdx !== -1) {
                                    const match = v.valueLabels[choiceIdx];
                                    num = match ? match.value : (choiceIdx + 1);
                                }
                            }
                        }
                        rec[spssName] = isNaN(num) ? null : num;
                    }
                } else if (v.type === VariableType.DateTime) {
                    rec[spssName] = val ? moment(val).format('DD-MM-YYYY HH:mm:SS') : null;
                } else {
                    if (Array.isArray(val)) val = val.join(', ');
                    rec[spssName] = val !== undefined ? val.toString().slice(0, 255) : "";
                }
            });
            return rec;
        });

        const buffer = toBuffer(records, variables);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=export_${form.slug || 'survey'}.sav`);
        res.end(Buffer.from(buffer));

    } catch (e) {
        logger.error('SPSS export failed', { error: e.message, name: e.name });
        res.status(500).json({ error: "SPSS Generation Failed: " + e.message });
    }
});

const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const reportRepo = new PostgresRepository('reports');
const crypto = require('crypto');

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: List all saved reports for the tenant
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of saved reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   surveyId:
 *                     type: integer
 *                   layout:
 *                     type: string
 *                   widgets:
 *                     type: string
 *                   theme:
 *                     type: string
 *                   is_published:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
// Get all reports for tenant
router.get('/', authenticate, async (req, res) => {
    try {
        const rows = await reportRepo.findAllBy('tenant_id', req.user.tenant_id);
        const mapped = rows.map(r => ({
            ...r,
            surveyId: r.form_id
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/public/{token}:
 *   get:
 *     summary: View a published report by token or slug
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Public token or slug of the report
 *     responses:
 *       200:
 *         description: Published report with associated form data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     surveyId:
 *                       type: integer
 *                     is_published:
 *                       type: boolean
 *                 form:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     definition:
 *                       type: object
 *       404:
 *         description: Report not found or not published
 *       500:
 *         description: Server error
 */
// Get public report by token or slug
router.get('/public/:token', async (req, res) => {
    try {
        const result = await query("SELECT * FROM reports WHERE (public_token = $1 OR slug = $1) AND is_published = true", [req.params.token]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Report not found or not published" });

        const report = result.rows[0];
        // Also fetch partial form info if needed
        const formRes = await query("SELECT id, title, definition FROM forms WHERE id = $1", [report.form_id]);

        res.json({
            report: {
                ...report,
                surveyId: report.form_id
            },
            form: formRes.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/{id}/publish:
 *   post:
 *     summary: Publish or unpublish a report
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_published:
 *                 type: boolean
 *                 description: Whether to publish or unpublish
 *               slug:
 *                 type: string
 *                 description: Optional custom URL slug
 *     responses:
 *       200:
 *         description: Updated report with public token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 public_token:
 *                   type: string
 *                 is_published:
 *                   type: boolean
 *                 slug:
 *                   type: string
 *       400:
 *         description: Slug already taken
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
// Publish/Unpublish report
router.post('/:id/publish', authenticate, async (req, res) => {
    try {
        const existing = await reportRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Report not found' });

        let token = existing.public_token;
        if (!token) {
            token = crypto.randomBytes(16).toString('hex');
        }

        const isPublished = req.body.is_published !== undefined ? req.body.is_published : true;
        const slug = req.body.slug ? req.body.slug.trim() : (existing.slug || null);

        try {
            const updated = await reportRepo.update(req.params.id, {
                public_token: token,
                is_published: isPublished,
                slug: slug,
                updated_at: new Date()
            });
            res.json({ ...updated, surveyId: updated.form_id });
        } catch (dbErr) {
            if (dbErr.message.includes('unique constraint') || dbErr.message.includes('slug')) {
                return res.status(400).json({ error: "That Link Name is already taken. Please choose another." });
            }
            throw dbErr;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Report title
 *               description:
 *                 type: string
 *               surveyId:
 *                 type: integer
 *                 description: Associated form/survey ID
 *               layout:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *               widgets:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               theme:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               fields:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *               config:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               orientation:
 *                 type: string
 *                 enum: [landscape, portrait]
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 surveyId:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
// Create new report
router.post('/', authenticate, async (req, res) => {
    try {
        logger.debug('Creating report', { payload: req.body });
        const safeStringify = (val, defaultVal) => {
            if (val === undefined || val === null) return defaultVal;
            if (typeof val === 'string') return val; // Already string
            return JSON.stringify(val);
        };

        const newReport = {
            tenant_id: req.user.tenant_id,
            title: req.body.title || 'Untitled Report',
            description: req.body.description,
            form_id: req.body.surveyId ? parseInt(req.body.surveyId) : null,
            layout: safeStringify(req.body.layout, '[]'),
            widgets: safeStringify(req.body.widgets, '{}'),
            theme: safeStringify(req.body.theme, '{}'),
            fields: safeStringify(req.body.fields, '[]'),
            config: safeStringify(req.body.config, '{}'),
            orientation: req.body.orientation || 'landscape',
            created_at: new Date(),
            updated_at: new Date()
        };
        const saved = await reportRepo.create(newReport);
        res.status(201).json({ ...saved, surveyId: saved.form_id });
    } catch (error) {
        logger.error('Failed to create report', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: Update an existing report
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               surveyId:
 *                 type: integer
 *               layout:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *               widgets:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               theme:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               fields:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *               config:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               orientation:
 *                 type: string
 *                 enum: [landscape, portrait]
 *               is_published:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Report updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 surveyId:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
// Update report
router.put('/:id', authenticate, async (req, res) => {
    try {
        logger.debug('Updating report', { id: req.params.id, payload: req.body });
        const existing = await reportRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Report not found' });

        const safeStringify = (val) => {
            if (val === undefined) return undefined; // Skip update
            if (val === null) return null;
            if (typeof val === 'string') return val;
            return JSON.stringify(val);
        };

        const updateData = {
            title: req.body.title,
            description: req.body.description,
            layout: safeStringify(req.body.layout),
            widgets: safeStringify(req.body.widgets),
            theme: safeStringify(req.body.theme),
            fields: safeStringify(req.body.fields),
            config: safeStringify(req.body.config),
            orientation: req.body.orientation,
            is_published: req.body.is_published,
            form_id: req.body.surveyId ? parseInt(req.body.surveyId) : undefined,
            updated_at: new Date()
        };
        const updated = await reportRepo.update(req.params.id, updateData);
        res.json({ ...updated, surveyId: updated.form_id });
    } catch (error) {
        logger.error('Failed to update report', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete a report
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
// Delete report
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const existing = await reportRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Report not found' });

        await reportRepo.delete(req.params.id);
        res.json({ message: 'Report deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
