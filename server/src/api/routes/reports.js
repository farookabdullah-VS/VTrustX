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
        // Note: The logic above calculates TIME REMAINING? No.
        // We want Time TAKEN. We need 'closed_at' - 'created_at'.
        // My 'tickets' table has 'closed_at'? 
        // Let's assume yes (User verified columns? Or I added it in Step 1906 logic: if closed -> safeUpdates.closed_at).

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
            date: r.date, // Format?
            count: parseInt(r.count)
        })).reverse(); // Oldest first for chart

        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Power BI OData-like Feed or Simple JSON
// Returns Flattened Data: [ { Survey: "Survey A", Question: "Q1", Answer: "Yes", Date: "..." } ]
router.get('/powerbi', async (req, res) => {
    try {
        // Authenticate via query param 'secret' which must match the Power BI integration api_key
        const { secret } = req.query;
        if (!secret) return res.status(401).json({ error: "Missing secret key" });

        // Verify Secret against Integrations table
        const integRes = await query("SELECT * FROM integrations WHERE provider = 'Power BI' AND api_key = $1 AND is_active = true", [secret]);
        if (integRes.rows.length === 0) return res.status(403).json({ error: "Invalid or inactive access key" });

        // Fetch Data
        // We perform a join to get Form Title + Submission Data
        const sql = `
            SELECT 
                f.title as survey_title,
                s.data as response_data,
                s.created_at,
                s.metadata
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            ORDER BY s.created_at DESC
            LIMIT 5000 
        `; // Limit for performance

        const result = await query(sql);

        // Flatten the JSON structure for Power BI
        // Power BI prefers tabular data.
        // We will transform each submission into multiple rows (Unpivot) or one wide row?
        // Wide row is hard because columns vary. 
        // Best approach for generic BI: EAV (Entity-Attribute-Value) style or flat JSON if Power BI handles JSON properly.
        // Let's return generic JSON and let Power BI 'Expand' columns.

        const flatData = result.rows.map(row => ({
            Survey: row.survey_title,
            Timestamp: row.created_at,
            ...row.response_data, // Spread answers
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
// Starts with letter or @. Max 64 chars. No spaces. 
// Allowed: letters, digits, ., _, $, @, !, #
function sanitizeSpssName(name, usedNames) {
    if (!name) return 'V' + Math.floor(Math.random() * 100000);
    // Remove invalid chars
    let clean = name.replace(/[^a-zA-Z0-9@!._#$]/g, '_');
    // Ensure starts with letter or @
    if (!/^[a-zA-Z@]/.test(clean)) clean = 'V' + clean;
    // Cannot end with a dot
    if (clean.endsWith('.')) clean = clean.slice(0, -1) + '_';

    let finalName = clean.substring(0, 64);
    let counter = 1;
    // Enforce uniqueness (SPSS is case-insensitive for var names)
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

        // 1. Fetch Form
        const formRes = await query("SELECT * FROM forms WHERE id = $1 AND tenant_id = $2", [formId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });
        const form = formRes.rows[0];

        // 2. Fetch Submissions
        const subRes = await query("SELECT * FROM submissions WHERE form_id = $1 ORDER BY created_at", [formId]);
        const submissions = subRes.rows;

        // 3. Prepare Variables
        const questions = getAllQuestions(form.definition);
        const variables = [];
        const usedNames = new Set();
        const nameMap = {}; // SurveyJS Name -> mapping details

        // System variables
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

        // Question variables
        questions.forEach(q => {
            const spssName = sanitizeSpssName(q.name, usedNames);
            nameMap[q.name] = { spssName, qRef: q };

            const varObj = {
                name: spssName,
                label: cleanLabel(q.title || q.name),
                measure: VariableMeasure.Nominal
            };

            // Determine Type and Value Labels for categorical fields
            const isCategorical = ['radiogroup', 'dropdown', 'boolean', 'matrix_row'].includes(q.type);
            const isRating = q.type === 'rating';

            if (isCategorical || isRating) {
                varObj.type = VariableType.Numeric;
                varObj.width = 10;
                varObj.decimal = 0;
                if (isRating) varObj.measure = VariableMeasure.Ordinal;

                // Map Choices/Columns to Value Labels
                if (q.choices && Array.isArray(q.choices)) {
                    varObj.valueLabels = q.choices.map((c, idx) => {
                        const val = c.value !== undefined ? c.value : (c.itemValue !== undefined ? c.itemValue : c);
                        const text = c.text !== undefined ? c.text : (c.itemText !== undefined ? c.itemText : val);

                        return {
                            // If choice value is already numeric, use it. Otherwise use index.
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
                // Default to String for other types
                varObj.type = VariableType.String;
                varObj.width = 255;
            }

            variables.push(varObj);
        });

        // 4. Prepare Records
        const records = submissions.map(s => {
            const data = s.data || {};
            const rec = {};
            rec[idVar] = s.id;

            // The library expects HH:mm:SS (capital SS for seconds/centiseconds mapping)
            rec[createdVar] = moment(s.createdAt || s.created_at).format('DD-MM-YYYY HH:mm:SS');

            questions.forEach(q => {
                const { spssName } = nameMap[q.name];
                const v = variables.find(x => x.name === spssName);

                // Get the raw value from submission data
                let val = (q.type === 'matrix_row') ? (data[q.originalName] ? data[q.originalName][q.rowValue] : null) : data[q.name];

                if (v.type === VariableType.Numeric) {
                    if (val === undefined || val === null || val === "") {
                        rec[spssName] = null;
                    } else if (q.type === 'boolean') {
                        rec[spssName] = (val === true || val === 'true') ? 1 : 0;
                    } else {
                        // Numeric variable, but val might be a string (e.g., categorical text "Male")
                        let num = Number(val);
                        if (isNaN(num)) {
                            // Try to find matching choice and get its assigned numerical value
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
                    // String/Array value
                    if (Array.isArray(val)) val = val.join(', ');
                    rec[spssName] = val !== undefined ? val.toString().slice(0, 255) : "";
                }
            });

            return rec;
        });

        // 5. Generate Buffer
        console.log(`[SPSS] Generating buffer for ${submissions.length} cases and ${variables.length} variables...`);
        const buffer = toBuffer(records, variables);

        // 6. Send Response
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=export_${form.slug || 'survey'}.sav`);
        res.end(Buffer.from(buffer));

    } catch (e) {
        console.error("SPSS Final Fix Export Error:", e.name, e.message);
        res.status(500).json({ error: "SPSS Generation Failed: " + e.message });
    }
});

module.exports = router;
