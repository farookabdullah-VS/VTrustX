const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const NodeCache = require('node-cache');
const analyticsCache = new NodeCache({ stdTTL: 600, maxKeys: 500 }); // 10 minutes cache, max 500 entries

const STOP_WORDS = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 'are', 'have', 'be', 'at', 'or', 'as', 'was', 'so', 'if', 'out', 'not', 'an', 'very', 'my', 'me', 'we']);

// Helper to extract questions (similar to reports.js)
function getAllQuestions(json) {
    const questions = [];
    if (!json || !json.pages) return questions;
    const iterate = (elements) => {
        if (!elements) return;
        elements.forEach(el => {
            if (el.elements) iterate(el.elements);
            else if ((el.type === 'panel' || el.type === 'paneldynamic') && el.templateElements) iterate(el.templateElements);
            else if (el.name) questions.push(el);
        });
    };
    json.pages.forEach(page => iterate(page.elements));
    return questions;
}

// 1. Daily Overview
router.get('/daily-stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const sql = `
            SELECT 
                date_trunc('day', created_at)::date as date,
                count(*) as completed
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            WHERE f.tenant_id = $1 
            AND (s.metadata->>'status' IS NULL OR s.metadata->>'status' = 'completed')
            GROUP BY 1
            ORDER BY 1 ASC
            LIMIT 30
        `;
        const result = await query(sql, [tenantId]);

        // Map viewed as completed * 1.5 (Mocking since no view table exists)
        const stats = result.rows.map(r => ({
            date: r.date.toISOString().split('T')[0],
            completed: parseInt(r.completed),
            viewed: Math.floor(parseInt(r.completed) * 1.5) + 5,
            rate: Math.round((parseInt(r.completed) / (parseInt(r.completed) * 1.5 + 5)) * 100)
        }));

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Question Analytics
router.get('/question-stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // Fetch all forms and their submissions
        const formsRes = await query("SELECT id, title, definition FROM forms WHERE tenant_id = $1", [tenantId]);

        let allQuestions = [];
        let allAnswers = {};

        // Batch fetch all submissions for tenant's forms to avoid N+1
        const formIds = formsRes.rows.map(f => f.id);
        let allSubmissions = [];
        if (formIds.length > 0) {
            const subRes = await query(
                "SELECT form_id, data FROM submissions WHERE form_id = ANY($1) AND (metadata->>'status' IS NULL OR metadata->>'status' = 'completed')",
                [formIds]
            );
            allSubmissions = subRes.rows;
        }
        const submissionsByForm = {};
        allSubmissions.forEach(s => {
            if (!submissionsByForm[s.form_id]) submissionsByForm[s.form_id] = [];
            submissionsByForm[s.form_id].push(s);
        });

        for (const form of formsRes.rows) {
            const questions = getAllQuestions(form.definition);
            const submissions = submissionsByForm[form.id] || [];

            questions.forEach(q => {
                const qId = `${form.id}_${q.name}`;
                const answeredCount = submissions.filter(s => s.data && s.data[q.name] !== undefined).length;

                allQuestions.push({
                    id: qId,
                    text: q.title || q.name,
                    form: form.title,
                    type: q.type,
                    completionRate: submissions.length > 0 ? Math.round((answeredCount / submissions.length) * 100) : 0
                });

                // Calculate distribution for categorical questions
                if (['radiogroup', 'dropdown', 'rating', 'boolean'].includes(q.type)) {
                    const distribution = {};
                    submissions.forEach(s => {
                        const val = s.data ? s.data[q.name] : null;
                        if (val !== null && val !== undefined) {
                            const label = String(val);
                            distribution[label] = (distribution[label] || 0) + 1;
                        }
                    });

                    allAnswers[qId] = Object.entries(distribution).map(([label, count]) => ({ label, count }));
                }
            });
        }

        res.json({ questions: allQuestions, answers: allAnswers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. CSAT & Sentiment Trends
router.get('/csat-stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const sql = `
            SELECT 
                date_trunc('day', s.created_at)::date as date,
                AVG(CAST(data->>'csat' AS NUMERIC)) as avg_csat,
                AVG(CAST(data->>'nps' AS NUMERIC)) as avg_nps,
                COUNT(*) as count
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            WHERE f.tenant_id = $1 
            AND (data->>'csat' IS NOT NULL OR data->>'nps' IS NOT NULL)
            AND (s.metadata->>'status' IS NULL OR s.metadata->>'status' = 'completed')
            GROUP BY 1
            ORDER BY 1 ASC
        `;
        const result = await query(sql, [tenantId]);

        // Performance breakdown by Form
        const breakdownSql = `
            SELECT 
                f.title as name,
                COUNT(*) as count,
                AVG(CAST(data->>'csat' AS NUMERIC)) as avg_csat
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            WHERE f.tenant_id = $1 AND data->>'csat' IS NOT NULL
            AND (s.metadata->>'status' IS NULL OR s.metadata->>'status' = 'completed')
            GROUP BY f.title
        `;
        const breakdownRes = await query(breakdownSql, [tenantId]);

        res.json({
            timeline: result.rows.map(r => ({
                date: r.date.toISOString().split('T')[0],
                csat: parseFloat(r.avg_csat || 0).toFixed(1),
                nps: parseFloat(r.avg_nps || 0).toFixed(1),
                sentiment: r.avg_csat > 8 ? 80 : (r.avg_csat > 6 ? 60 : 40) // Mocked from CSAT
            })),
            breakdown: breakdownRes.rows.map(r => ({
                name: r.name,
                count: parseInt(r.count),
                avg: parseFloat(r.avg_csat || 0).toFixed(1)
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Sentiment Timeline (for CX Dashboard)
router.get('/sentiment-timeline', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const sql = `
            SELECT 
                date_trunc('hour', s.created_at) as hour,
                AVG(CASE 
                    WHEN CAST(data->>'csat' AS NUMERIC) >= 4 THEN 1
                    WHEN CAST(data->>'csat' AS NUMERIC) <= 2 THEN -1
                    ELSE 0 END) as sentiment
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            WHERE f.tenant_id = $1
            AND (s.metadata->>'status' IS NULL OR s.metadata->>'status' = 'completed')
            GROUP BY 1
            ORDER BY 1 ASC
            LIMIT 40
        `;
        const result = await query(sql, [tenantId]);
        res.json(result.rows.map(r => ({
            time: r.hour,
            value: parseFloat(r.sentiment || 0)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Detailed Responses (Live Data Mapping)
router.get('/detailed-responses', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        // This query tries to join with tickets if metadata or data contains ticket info
        // We look for 'ticket_code', 'ticketId', or 'ticket' in the JSON fields.
        const sql = `
            SELECT 
                s.created_at as date,
                f.title as form_title,
                s.data,
                s.metadata,
                COALESCE(u.username, s.metadata->>'agent', 'System') as agent_name,
                COALESCE(t.name, s.metadata->>'group', 'Default Support') as group_name
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            LEFT JOIN tickets tk ON (
                tk.ticket_code = s.data->>'ticket_code' OR 
                tk.ticket_code = s.metadata->>'ticket_code' OR
                CAST(tk.id AS TEXT) = s.metadata->>'ticketId'
            )
            LEFT JOIN users u ON tk.assigned_user_id = u.id
            LEFT JOIN teams t ON tk.assigned_team_id = t.id
            WHERE f.tenant_id = $1
            ORDER BY s.created_at DESC
            LIMIT 200
        `;
        const result = await query(sql, [tenantId]);

        // Flatten for the grid (One row per question-answer pair, or one row per submission?)
        // The UI seems to expect one row per question-answer pair based on the table structure
        // showing "Question" and "Answer" columns.
        const flattened = [];
        result.rows.forEach(row => {
            const rowData = row.data || {};
            Object.entries(rowData).forEach(([q, a]) => {
                // Filter out system fields if any
                if (['ticket_code', 'formId', 'formVersion'].includes(q)) return;

                flattened.push({
                    date: row.date.toISOString().split('T')[0],
                    form: row.form_title,
                    question: q,
                    answer: typeof a === 'object' ? JSON.stringify(a) : String(a),
                    agent: row.agent_name,
                    group: row.group_name
                });
            });
        });

        res.json(flattened);
    } catch (err) {
        console.error("Detailed Responses Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Key Driver Analysis (Pearson Correlation)
router.post('/key-drivers', authenticate, async (req, res) => {
    try {
        const { surveyId, targetMetric } = req.body;
        const tenantId = req.user.tenant_id;

        // Ensure survey belongs to tenant
        const formRes = await query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [surveyId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });

        if (!surveyId || !targetMetric) return res.status(400).json({ error: "Missing surveyId or targetMetric" });

        // Cache Key
        const cacheKey = `drivers_${surveyId}_${targetMetric}`;
        const cached = analyticsCache.get(cacheKey);
        if (cached) return res.json(cached);
        const sql = `
            SELECT data FROM submissions 
            WHERE form_id = $1 AND data->>$2 IS NOT NULL 
            ORDER BY created_at DESC 
            LIMIT 2500
        `;
        const result = await query(sql, [surveyId, targetMetric]);
        const submissions = result.rows.map(r => r.data);

        if (submissions.length < 5) return res.json({ error: "Insufficient data for correlation analysis", drivers: [] });

        // Calculate Correlation
        // X = Potential Driver (e.g., "friendliness"), Y = Target Metric (e.g., "nps")
        const drivers = [];
        const potentialDrivers = Object.keys(submissions[0]).filter(k => k !== targetMetric && !['ticket_code', 'comment'].includes(k));

        potentialDrivers.forEach(driverKey => {
            // Filter to numeric values only
            const pairs = submissions.map(s => ({
                x: parseFloat(s[driverKey]),
                y: parseFloat(s[targetMetric])
            })).filter(p => !isNaN(p.x) && !isNaN(p.y));

            if (pairs.length < 5) return;

            // Pearson Calculation
            const n = pairs.length;
            const sumX = pairs.reduce((a, b) => a + b.x, 0);
            const sumY = pairs.reduce((a, b) => a + b.y, 0);
            const sumXY = pairs.reduce((a, b) => a + b.x * b.y, 0);
            const sumX2 = pairs.reduce((a, b) => a + b.x * b.x, 0);
            const sumY2 = pairs.reduce((a, b) => a + b.y * b.y, 0);

            const numerator = (n * sumXY) - (sumX * sumY);
            const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

            const r = denominator === 0 ? 0 : numerator / denominator;

            // Only include moderate to strong correlations
            if (Math.abs(r) > 0.1) {
                drivers.push({
                    key: driverKey,
                    correlation: parseFloat(r.toFixed(2)),
                    impact: r > 0.6 ? 'High' : (r > 0.3 ? 'Medium' : 'Low')
                });
            }
        });

        // Sort by absolute correlation strength
        drivers.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

        const responseData = { drivers };
        analyticsCache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        console.error("Key Driver Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Text Analytics (Word Cloud & Sentiment)
router.post('/text-analytics', authenticate, async (req, res) => {
    try {
        const { surveyId, textField, sentimentMetric } = req.body;
        const tenantId = req.user.tenant_id;

        // Ensure survey belongs to tenant
        const formRes = await query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [surveyId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });

        if (!surveyId || !textField) return res.status(400).json({ error: "Missing surveyId or textField" });

        // Cache Check
        const cacheKey = `text_${surveyId}_${textField}_${sentimentMetric || 'none'}`;
        const cached = analyticsCache.get(cacheKey);
        if (cached) return res.json(cached);
        const sql = `
            SELECT data FROM submissions 
            WHERE form_id = $1 AND data->>$2 IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 2500
        `;
        const result = await query(sql, [surveyId, textField]);

        const wordsMap = {}; // { word: { count: 0, totalScore: 0, sentiment: 0 } }

        result.rows.forEach(row => {
            const text = String(row.data[textField]).toLowerCase();
            const score = sentimentMetric ? parseFloat(row.data[sentimentMetric]) : null;

            // Simple tokenization: remove punctuation, split by space
            const tokens = text.replace(/[^\w\s]/g, '').split(/\s+/);

            tokens.forEach(word => {
                if (word.length < 3 || STOP_WORDS.has(word)) return;

                if (!wordsMap[word]) wordsMap[word] = { text: word, value: 0, totalScore: 0, count: 0 };

                wordsMap[word].value++; // Frequency for Word Cloud size
                if (score !== null && !isNaN(score)) {
                    wordsMap[word].totalScore += score;
                    wordsMap[word].count++;
                }
            });
        });

        // Convert to array and calculate average sentiment
        const words = Object.values(wordsMap).map(w => ({
            text: w.text,
            value: w.value,
            sentiment: w.count > 0 ? (w.totalScore / w.count).toFixed(1) : null
        }));

        // Sort by frequency and take top 50
        words.sort((a, b) => b.value - a.value);

        const responseData = { words: words.slice(0, 50) };
        analyticsCache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        console.error("Text Analytics Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 8. Statistical Significance (NPS Z-Test)
router.post('/nps-significance', authenticate, async (req, res) => {
    try {
        const { surveyId } = req.body;
        const tenantId = req.user.tenant_id;

        // Ensure survey belongs to tenant
        const formRes = await query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [surveyId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });

        // Compare Last 30 Days vs Previous 30 Days
        const sql = `
            SELECT 
                CASE 
                    WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'current'
                    WHEN created_at >= NOW() - INTERVAL '60 days' THEN 'previous'
                END as period,
                COUNT(*) as total,
                COUNT(CASE WHEN CAST(data->>'nps' AS NUMERIC) >= 9 THEN 1 END) as promoters,
                COUNT(CASE WHEN CAST(data->>'nps' AS NUMERIC) <= 6 THEN 1 END) as detractors
            FROM submissions
            WHERE form_id = $1 
            AND created_at >= NOW() - INTERVAL '60 days'
            AND data->>'nps' IS NOT NULL
            GROUP BY 1
        `;

        const result = await query(sql, [surveyId]);

        const current = result.rows.find(r => r.period === 'current') || { total: 0, promoters: 0, detractors: 0 };
        const previous = result.rows.find(r => r.period === 'previous') || { total: 0, promoters: 0, detractors: 0 };

        if (current.total < 10 || previous.total < 10) {
            return res.json({ status: 'insufficient_data', message: 'Need at least 10 responses per period.' });
        }

        // Calculate NPS
        const calcNPS = (p, d, t) => ((p - d) / t) * 100;
        const npsCurrent = calcNPS(current.promoters, current.detractors, current.total);
        const npsPrevious = calcNPS(previous.promoters, previous.detractors, previous.total);

        // Standard Error for Two Proportions (Approximation for NPS)
        // SE = sqrt( (p1*q1/n1) + (p2*q2/n2) ) ... Simplified Z-Test for diff means could also be used.
        // We will use a simplified error merging variance of promoters and detractors.

        const p1 = current.promoters / current.total;
        const d1 = current.detractors / current.total;
        const var1 = p1 + d1 - Math.pow(p1 - d1, 2); // Variance of NPS (unit scale -1 to 1)

        const p2 = previous.promoters / previous.total;
        const d2 = previous.detractors / previous.total;
        const var2 = p2 + d2 - Math.pow(p2 - d2, 2);

        const se = Math.sqrt((var1 / current.total) + (var2 / previous.total)) * 100; // Scale to 100 for NPS
        const diff = Math.abs(npsCurrent - npsPrevious);
        const zScore = diff / se;

        // 95% Confidence Level (Z > 1.96)
        const isSignificant = zScore > 1.96;
        let verdict = 'No Significant Change';
        if (isSignificant) {
            verdict = npsCurrent > npsPrevious ? 'Significant Improvement' : 'Significant Decline';
        }

        res.json({
            currentNPS: Math.round(npsCurrent),
            previousNPS: Math.round(npsPrevious),
            change: Math.round(npsCurrent - npsPrevious),
            isSignificant,
            verdict,
            confidence: '95%'
        });

    } catch (err) {
        console.error("Stat Test Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 9. Cross-Tabulation (Pivot Table)
router.post('/cross-tab', authenticate, async (req, res) => {
    try {
        const { surveyId, rowField, colField, valueField, operation } = req.body;
        const tenantId = req.user.tenant_id;

        // Ensure survey belongs to tenant
        const formRes = await query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [surveyId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });

        // Operation: 'count' or 'average'
        if (!surveyId || !rowField || !colField) return res.status(400).json({ error: "Missing required fields" });

        const sql = `
            SELECT data FROM submissions 
            WHERE form_id = $1 
            AND data->>$2 IS NOT NULL 
            AND data->>$3 IS NOT NULL
            LIMIT 5000
        `;
        const result = await query(sql, [surveyId, rowField, colField]);

        const matrix = {}; // { rowVal: { colVal: { sum: 0, count: 0 } } }
        const rowKeys = new Set();
        const colKeys = new Set();

        result.rows.forEach(r => {
            const rowVal = String(r.data[rowField] || "Unknown");
            const colVal = String(r.data[colField] || "Unknown");
            let val = 1; // Default count

            if (valueField && operation === 'average') {
                val = parseFloat(r.data[valueField]);
                if (isNaN(val)) return; // Skip non-numeric if averging
            }

            rowKeys.add(rowVal);
            colKeys.add(colVal);

            if (!matrix[rowVal]) matrix[rowVal] = {};
            if (!matrix[rowVal][colVal]) matrix[rowVal][colVal] = { sum: 0, count: 0 };

            matrix[rowVal][colVal].sum += val;
            matrix[rowVal][colVal].count += 1;
        });

        // Format for Frontend
        const sortedRows = Array.from(rowKeys).sort();
        const sortedCols = Array.from(colKeys).sort();
        const data = [];

        sortedRows.forEach(rKey => {
            const rowObj = { name: rKey };
            sortedCols.forEach(cKey => {
                const cell = matrix[rKey]?.[cKey];
                if (!cell) {
                    rowObj[cKey] = 0; // or null
                } else {
                    rowObj[cKey] = operation === 'average'
                        ? parseFloat((cell.sum / cell.count).toFixed(1))
                        : cell.count; // For 'count', sum is effectively count

                    // For pure count operation, cell.sum is just count * 1, so use cell.count (or sum)
                    if (operation !== 'average') rowObj[cKey] = cell.sum;
                }
            });
            data.push(rowObj);
        });

        res.json({
            rows: sortedRows,
            cols: sortedCols,
            data: data
        });

    } catch (err) {
        console.error("Cross-Tab Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 10. Anomaly Detection (AI Watchdog)
router.post('/anomalies', authenticate, async (req, res) => {
    try {
        const { surveyId, targetMetric } = req.body;
        const tenantId = req.user.tenant_id;

        // Ensure survey belongs to tenant
        const formRes = await query("SELECT id FROM forms WHERE id = $1 AND tenant_id = $2", [surveyId, tenantId]);
        if (formRes.rows.length === 0) return res.status(404).json({ error: "Form not found" });

        if (!surveyId || !targetMetric) return res.status(400).json({ error: "Missing surveyId or targetMetric" });

        // Fetch daily averages for last 60 days
        const sql = `
            SELECT 
                date_trunc('day', created_at)::date as date,
                AVG(CAST(data->>$2 AS NUMERIC)) as value,
                COUNT(*) as count
            FROM submissions
            WHERE form_id = $1
            AND data->>$2 IS NOT NULL
            GROUP BY 1
            ORDER BY 1 ASC
            LIMIT 60
        `;
        const result = await query(sql, [surveyId, targetMetric]);
        const data = result.rows.map(r => ({
            date: r.date.toISOString().split('T')[0],
            value: parseFloat(r.value),
            count: parseInt(r.count)
        }));

        if (data.length < 10) return res.json({ status: 'insufficient_data', anomalies: [] });

        // Calculate Stats (Mean & StdDev)
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Define Control Limits (2-Sigma for moderate sensitivity, 3-Sigma for strict)
        const UCL = mean + (2 * stdDev);
        const LCL = mean - (2 * stdDev);

        // Check recent days (last 7) for anomalies
        const anomalies = [];
        const recentData = data.slice(-7);

        recentData.forEach(day => {
            if (day.value > UCL) {
                anomalies.push({
                    date: day.date,
                    type: 'spike',
                    value: day.value.toFixed(2),
                    deviation: '+High',
                    message: `Unusual Spike: Value ${day.value.toFixed(1)} is statistically higher than normal range.`
                });
            } else if (day.value < LCL) {
                anomalies.push({
                    date: day.date,
                    type: 'drop',
                    value: day.value.toFixed(2),
                    deviation: '-Low',
                    message: `Unusual Drop: Value ${day.value.toFixed(1)} is statistically lower than normal range.`
                });
            }
        });

        // Also check for Volume Anomalies (Counts)
        // ... (Simplified for now to just metric value)

        res.json({
            metric: targetMetric,
            mean: mean.toFixed(2),
            stdDev: stdDev.toFixed(2),
            bounds: { upper: UCL.toFixed(2), lower: LCL.toFixed(2) },
            anomalies: anomalies.reverse() // Newest first
        });

    } catch (err) {
        console.error("Anomaly Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
