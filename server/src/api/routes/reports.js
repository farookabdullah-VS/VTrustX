const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// CRM DASHBOARD STATS
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
        // Only for closed/resolved tickets
        const timeRes = await query(`
            SELECT AVG(EXTRACT(EPOCH FROM (resolution_due_at - created_at))/3600) as avg_resolution_hours
            FROM tickets 
            WHERE tenant_id = $1 AND status IN ('resolved', 'closed')
        `, [tenantId]);

        const perfRes = await query(`
            SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600) as avg_hours
            FROM tickets
            WHERE tenant_id = $1 AND closed_at IS NOT NULL
        `, [tenantId]);

        res.json({
            stats: statusMap,
            performance: {
                avgResolutionUrl: perfRes.rows[0].avg_hours || 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        console.error("SPSS Export Error:", e.name, e.message);
        res.status(500).json({ error: "SPSS Generation Failed: " + e.message });
    }
});

const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const reportRepo = new PostgresRepository('reports');
const crypto = require('crypto');

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

// Create new report
router.post('/', authenticate, async (req, res) => {
    try {
        console.log("Creating Report Payload:", JSON.stringify(req.body, null, 2)); // DEBUG
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
        console.log("Create Report Error (Log):", error.message); // STDOUT
        console.error("Create Report Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update report
router.put('/:id', authenticate, async (req, res) => {
    try {
        console.log(`Updating Report ${req.params.id} Payload:`, JSON.stringify(req.body, null, 2)); // DEBUG
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
        console.log("Update Report Error (Log):", error.message); // STDOUT
        console.error("Update Report Error:", error);
        res.status(500).json({ error: error.message });
    }
});

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
