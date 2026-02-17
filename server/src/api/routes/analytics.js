const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');
const analyticsCacheService = require('../../services/AnalyticsCacheService');

// Import delivery analytics routes
const deliveryRouter = require('./analytics/delivery');
router.use(deliveryRouter);

// Import SSE routes
const { router: sseRouter } = require('./analytics/sse');
router.use('/sse', sseRouter);

// Import sentiment analytics routes
const sentimentRouter = require('./analytics/sentiment');
router.use('/sentiment', sentimentRouter);

// Import power analysis routes
const powerAnalysisRouter = require('./analytics/power-analysis');
router.use('/power-analysis', powerAnalysisRouter);

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

/**
 * @swagger
 * /api/analytics/daily-stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get daily overview statistics
 *     description: Returns daily completed and viewed counts for the last 30 days across all forms belonging to the authenticated user's tenant.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of daily stat objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   completed:
 *                     type: integer
 *                   viewed:
 *                     type: integer
 *                   rate:
 *                     type: integer
 *                     description: Completion rate as a percentage
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// 1. Daily Overview
router.get('/daily-stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const sql = `
            WITH daily_subs AS (
                SELECT 
                    date_trunc('day', s.created_at)::date as date,
                    count(*) as completed
                FROM submissions s
                JOIN forms f ON s.form_id = f.id
                WHERE f.tenant_id = $1 
                AND (s.metadata->>'status' IS NULL OR s.metadata->>'status' = 'completed' OR s.metadata->>'status' = 'complete')
                GROUP BY 1
            ),
            daily_views AS (
                SELECT 
                    date_trunc('day', created_at)::date as date,
                    count(*) as viewed
                FROM survey_events
                WHERE tenant_id = $1 AND event_type = 'viewed'
                GROUP BY 1
            )
            SELECT 
                COALESCE(s.date, v.date) as date,
                COALESCE(s.completed, 0) as completed,
                COALESCE(v.viewed, 0) as viewed
            FROM daily_subs s
            FULL OUTER JOIN daily_views v ON s.date = v.date
            ORDER BY date ASC
            LIMIT 30
        `;
        const result = await query(sql, [tenantId]);

        const stats = result.rows.map(r => {
            const completed = parseInt(r.completed);
            const viewed = parseInt(r.viewed);
            return {
                date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
                completed: completed,
                viewed: viewed,
                rate: viewed > 0 ? Math.round((completed / viewed) * 100) : 0
            };
        });

        res.json(stats);
    } catch (err) {
        logger.error('Failed to fetch daily stats', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch daily statistics' });
    }
});

/**
 * @swagger
 * /api/analytics/question-stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get per-question analytics
 *     description: Returns completion rates and answer distributions for all questions across all forms in the tenant.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Question statistics and answer distributions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       text:
 *                         type: string
 *                       form:
 *                         type: string
 *                       type:
 *                         type: string
 *                       completionRate:
 *                         type: integer
 *                 answers:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         label:
 *                           type: string
 *                         count:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch question stats', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch question statistics' });
    }
});

/**
 * @swagger
 * /api/analytics/csat-stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get CSAT and sentiment trends
 *     description: Returns a daily timeline of average CSAT and NPS scores plus a breakdown by form for the tenant.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSAT timeline and form breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       csat:
 *                         type: string
 *                       nps:
 *                         type: string
 *                       sentiment:
 *                         type: integer
 *                 breakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       avg:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch CSAT stats', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch CSAT statistics' });
    }
});

/**
 * @swagger
 * /api/analytics/sentiment-timeline:
 *   get:
 *     tags: [Analytics]
 *     summary: Get hourly sentiment timeline
 *     description: Returns the last 40 hourly sentiment values derived from CSAT scores. Intended for the CX real-time dashboard.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of hourly sentiment data points
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   time:
 *                     type: string
 *                     format: date-time
 *                   value:
 *                     type: number
 *                     description: Sentiment score between -1 (negative) and 1 (positive)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch sentiment timeline', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch sentiment timeline' });
    }
});

/**
 * @swagger
 * /api/analytics/detailed-responses:
 *   get:
 *     tags: [Analytics]
 *     summary: Get detailed submission responses
 *     description: Returns the last 200 submission responses flattened to question-answer pairs, joined with ticket/agent/team data where available.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of flattened question-answer records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   form:
 *                     type: string
 *                   question:
 *                     type: string
 *                   answer:
 *                     type: string
 *                   agent:
 *                     type: string
 *                   group:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Detailed Responses Error", { error: err.message });
        res.status(500).json({ error: 'Failed to fetch detailed responses' });
    }
});

/**
 * @swagger
 * /api/analytics/key-drivers:
 *   post:
 *     tags: [Analytics]
 *     summary: Run key driver analysis
 *     description: Calculates Pearson correlation between potential driver fields and a target metric (e.g. NPS) for the specified survey. Results are cached.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [surveyId, targetMetric]
 *             properties:
 *               surveyId:
 *                 type: string
 *                 format: uuid
 *               targetMetric:
 *                 type: string
 *                 description: The field name to treat as the dependent variable (e.g. "nps")
 *     responses:
 *       200:
 *         description: Correlation analysis results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 drivers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       correlation:
 *                         type: number
 *                       impact:
 *                         type: string
 *                         enum: [High, Medium, Low]
 *       400:
 *         description: Missing surveyId or targetMetric
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Key Driver Analysis Error", { error: err.message });
        res.status(500).json({ error: 'Failed to perform key driver analysis' });
    }
});

/**
 * @swagger
 * /api/analytics/text-analytics:
 *   post:
 *     tags: [Analytics]
 *     summary: Run text analytics
 *     description: Generates word frequency data for a text field in the specified survey. Optionally scores each word by average sentiment from a numeric metric field. Results are cached.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [surveyId, textField]
 *             properties:
 *               surveyId:
 *                 type: string
 *                 format: uuid
 *               textField:
 *                 type: string
 *                 description: The field name containing free-text answers
 *               sentimentMetric:
 *                 type: string
 *                 nullable: true
 *                 description: Optional numeric field to derive per-word sentiment scores
 *     responses:
 *       200:
 *         description: Top 50 words by frequency with optional sentiment scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 words:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       value:
 *                         type: integer
 *                         description: Frequency count
 *                       sentiment:
 *                         type: string
 *                         nullable: true
 *       400:
 *         description: Missing surveyId or textField
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Text Analytics Error", { error: err.message });
        res.status(500).json({ error: 'Failed to perform text analytics' });
    }
});

/**
 * @swagger
 * /api/analytics/nps-significance:
 *   post:
 *     tags: [Analytics]
 *     summary: Test NPS statistical significance
 *     description: Compares NPS from the current 30-day period against the previous 30-day period using a two-proportion Z-test at 95% confidence. Requires at least 10 responses per period.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [surveyId]
 *             properties:
 *               surveyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: NPS significance test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentNPS:
 *                   type: integer
 *                 previousNPS:
 *                   type: integer
 *                 change:
 *                   type: integer
 *                 isSignificant:
 *                   type: boolean
 *                 verdict:
 *                   type: string
 *                 confidence:
 *                   type: string
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Stat Test Error", { error: err.message });
        res.status(500).json({ error: 'Failed to perform NPS significance test' });
    }
});

/**
 * @swagger
 * /api/analytics/cross-tab:
 *   post:
 *     tags: [Analytics]
 *     summary: Run cross-tabulation analysis
 *     description: Builds a pivot table from two categorical fields in the specified survey. Supports count and average operations.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [surveyId, rowField, colField]
 *             properties:
 *               surveyId:
 *                 type: string
 *                 format: uuid
 *               rowField:
 *                 type: string
 *                 description: Field to use as row labels
 *               colField:
 *                 type: string
 *                 description: Field to use as column labels
 *               valueField:
 *                 type: string
 *                 nullable: true
 *                 description: Numeric field to aggregate (required when operation is "average")
 *               operation:
 *                 type: string
 *                 enum: [count, average]
 *                 default: count
 *     responses:
 *       200:
 *         description: Cross-tabulation matrix
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: string
 *                 cols:
 *                   type: array
 *                   items:
 *                     type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Cross-Tab Error", { error: err.message });
        res.status(500).json({ error: 'Failed to perform cross-tabulation' });
    }
});

/**
 * @swagger
 * /api/analytics/anomalies:
 *   post:
 *     tags: [Analytics]
 *     summary: Detect metric anomalies
 *     description: Uses a 2-sigma control chart to detect unusual spikes or drops in a numeric metric field over the last 7 days relative to a 60-day baseline.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [surveyId, targetMetric]
 *             properties:
 *               surveyId:
 *                 type: string
 *                 format: uuid
 *               targetMetric:
 *                 type: string
 *                 description: The numeric field to monitor for anomalies
 *     responses:
 *       200:
 *         description: Anomaly detection results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metric:
 *                   type: string
 *                 mean:
 *                   type: string
 *                 stdDev:
 *                   type: string
 *                 bounds:
 *                   type: object
 *                   properties:
 *                     upper:
 *                       type: string
 *                     lower:
 *                       type: string
 *                 anomalies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       type:
 *                         type: string
 *                         enum: [spike, drop]
 *                       value:
 *                         type: string
 *                       deviation:
 *                         type: string
 *                       message:
 *                         type: string
 *       400:
 *         description: Missing surveyId or targetMetric
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Anomaly Error", { error: err.message });
        res.status(500).json({ error: 'Failed to detect anomalies' });
    }
});

/**
 * @swagger
 * /api/analytics/cache/stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics cache statistics
 *     description: Returns hit/miss counts and memory usage for the analytics cache service.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Cache Statistics & Management
router.get('/cache/stats', authenticate, async (req, res) => {
    try {
        const stats = analyticsCacheService.getStats();
        res.json(stats);
    } catch (err) {
        logger.error('Failed to get cache stats', { error: err.message });
        res.status(500).json({ error: 'Failed to retrieve cache statistics' });
    }
});

/**
 * @swagger
 * /api/analytics/cache/health:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics cache health
 *     description: Returns health status information for the analytics cache service.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cache health object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/cache/health', authenticate, async (req, res) => {
    try {
        const health = await analyticsCacheService.getHealth();
        res.json(health);
    } catch (err) {
        logger.error('Failed to get cache health', { error: err.message });
        res.status(500).json({ error: 'Failed to retrieve cache health' });
    }
});

/**
 * @swagger
 * /api/analytics/cache/invalidate/{surveyId}:
 *   post:
 *     tags: [Analytics]
 *     summary: Invalidate cache for a survey
 *     description: Removes all cached analytics entries for the specified survey in the tenant's cache namespace.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Survey ID whose cache entries should be invalidated
 *     responses:
 *       200:
 *         description: Cache invalidated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/cache/invalidate/:surveyId', authenticate, async (req, res) => {
    try {
        const { surveyId } = req.params;
        const tenantId = req.user.tenant_id;

        const deletedCount = await analyticsCacheService.invalidateSurvey(tenantId, surveyId);

        res.json({
            success: true,
            message: `Cache invalidated for survey ${surveyId}`,
            deletedCount
        });
    } catch (err) {
        logger.error('Failed to invalidate cache', {
            error: err.message,
            surveyId: req.params.surveyId
        });
        res.status(500).json({ error: 'Failed to invalidate cache' });
    }
});

/**
 * @swagger
 * /api/analytics/query-data:
 *   post:
 *     tags: [Analytics]
 *     summary: Query submission data with pagination and filters
 *     description: Returns paginated submission records for a survey with optional field-level filtering. Supports equals, contains, greaterThan, and lessThan operators. Max 500 rows per page.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [surveyId]
 *             properties:
 *               surveyId:
 *                 type: string
 *                 format: uuid
 *               page:
 *                 type: integer
 *                 default: 1
 *               pageSize:
 *                 type: integer
 *                 default: 100
 *                 maximum: 500
 *               filters:
 *                 type: object
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     value:
 *                       description: Value to filter by
 *                     operator:
 *                       type: string
 *                       enum: [equals, contains, greaterThan, lessThan]
 *     responses:
 *       200:
 *         description: Paginated submission data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                     from:
 *                       type: integer
 *                     to:
 *                       type: integer
 *       400:
 *         description: surveyId is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Query Data with Pagination (NEW)
router.post('/query-data', authenticate, async (req, res) => {
    try {
        const { surveyId, filters = {}, page = 1, pageSize = 100 } = req.body;
        const tenantId = req.user.tenant_id;

        if (!surveyId) {
            return res.status(400).json({ error: 'surveyId is required' });
        }

        // Validate pagination parameters
        const currentPage = Math.max(1, parseInt(page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(pageSize) || 100)); // Max 500 rows per page
        const offset = (currentPage - 1) * limit;

        // Build WHERE clause for filters
        const whereClauses = ['s.tenant_id = $1', 's.form_id = $2'];
        const queryParams = [tenantId, surveyId];
        let paramIndex = 3;

        // Apply filters (basic implementation)
        if (filters && Object.keys(filters).length > 0) {
            Object.entries(filters).forEach(([field, filter]) => {
                if (filter && filter.value !== undefined && filter.value !== null) {
                    const operator = filter.operator || 'equals';

                    switch (operator) {
                        case 'equals':
                            whereClauses.push(`s.response_data->>'${field}' = $${paramIndex}`);
                            queryParams.push(String(filter.value));
                            paramIndex++;
                            break;
                        case 'contains':
                            whereClauses.push(`s.response_data->>'${field}' ILIKE $${paramIndex}`);
                            queryParams.push(`%${filter.value}%`);
                            paramIndex++;
                            break;
                        case 'greaterThan':
                            whereClauses.push(`(s.response_data->>'${field}')::numeric > $${paramIndex}`);
                            queryParams.push(Number(filter.value));
                            paramIndex++;
                            break;
                        case 'lessThan':
                            whereClauses.push(`(s.response_data->>'${field}')::numeric < $${paramIndex}`);
                            queryParams.push(Number(filter.value));
                            paramIndex++;
                            break;
                    }
                }
            });
        }

        const whereClause = whereClauses.join(' AND ');

        // Try to get cached count (5 minute cache)
        let totalCount = await analyticsCacheService.getCachedCount(tenantId, surveyId, filters);

        if (totalCount === null) {
            // Query total count
            const countSql = `
                SELECT COUNT(*) as count
                FROM submissions s
                WHERE ${whereClause}
            `;

            const countResult = await query(countSql, queryParams);
            totalCount = parseInt(countResult.rows[0].count) || 0;

            // Cache count for 5 minutes
            await analyticsCacheService.setCachedCount(tenantId, surveyId, filters, totalCount, 300);
        }

        // Query paginated data
        const dataSql = `
            SELECT
                s.id,
                s.form_id,
                s.response_data,
                s.created_at,
                s.updated_at,
                s.metadata
            FROM submissions s
            WHERE ${whereClause}
            ORDER BY s.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);

        const dataResult = await query(dataSql, queryParams);

        // Transform data
        const data = dataResult.rows.map(row => ({
            id: row.id,
            form_id: row.form_id,
            submission_date: row.created_at,
            ...row.response_data,
            metadata: row.metadata
        }));

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit);
        const hasMore = offset + limit < totalCount;

        res.json({
            data,
            pagination: {
                page: currentPage,
                pageSize: limit,
                totalCount,
                totalPages,
                hasMore,
                from: offset + 1,
                to: Math.min(offset + limit, totalCount)
            }
        });

    } catch (err) {
        logger.error('Query data failed', {
            error: err.message,
            stack: err.stack,
            surveyId: req.body.surveyId
        });
        res.status(500).json({ error: 'Failed to query data' });
    }
});

/**
 * Export report to PDF
 * POST /api/analytics/reports/:reportId/export/pdf
 * NOTE: Temporarily commented out - Phase 2 feature requiring puppeteer/pptxgenjs
 */
const ReportExportService = require('../../services/ReportExportService');

/**
 * @swagger
 * /api/analytics/reports/{reportId}/export/pdf:
 *   post:
 *     tags: [Analytics]
 *     summary: Export report to PDF
 *     description: Generates a PDF export of the specified analytics report. Returns a temporary file URL.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID to export
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Optional export configuration options
 *     responses:
 *       200:
 *         description: PDF export successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 fileUrl:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/reports/:reportId/export/pdf', authenticate, async (req, res) => {
    try {
        const { reportId } = req.params;
        const tenantId = req.user.tenant_id;
        const options = req.body || {};

        logger.info('PDF export requested', { reportId, tenantId, userId: req.user.id });

        const result = await ReportExportService.exportToPDF(reportId, tenantId, options);

        res.json({
            success: true,
            fileUrl: result.fileUrl,
            filename: result.filename,
            size: result.size,
            expiresAt: result.expiresAt,
            message: 'Report exported to PDF successfully'
        });
    } catch (error) {
        logger.error('PDF export failed', {
            error: error.message,
            reportId: req.params.reportId,
            userId: req.user.id
        });
        res.status(500).json({ error: 'Failed to export report to PDF' });
    }
});

/**
 * @swagger
 * /api/analytics/reports/{reportId}/export/pptx:
 *   post:
 *     tags: [Analytics]
 *     summary: Export report to PowerPoint
 *     description: Generates a PowerPoint (.pptx) export of the specified analytics report. Returns a temporary file URL.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID to export
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Optional export configuration options
 *     responses:
 *       200:
 *         description: PowerPoint export successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 fileUrl:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/reports/:reportId/export/pptx', authenticate, async (req, res) => {
    try {
        const { reportId } = req.params;
        const tenantId = req.user.tenant_id;
        const options = req.body || {};

        logger.info('PowerPoint export requested', { reportId, tenantId, userId: req.user.id });

        const result = await ReportExportService.exportToPowerPoint(reportId, tenantId, options);

        res.json({
            success: true,
            fileUrl: result.fileUrl,
            filename: result.filename,
            size: result.size,
            expiresAt: result.expiresAt,
            message: 'Report exported to PowerPoint successfully'
        });
    } catch (error) {
        logger.error('PowerPoint export failed', {
            error: error.message,
            reportId: req.params.reportId,
            userId: req.user.id
        });
        res.status(500).json({ error: 'Failed to export report to PowerPoint' });
    }
});

module.exports = router;
