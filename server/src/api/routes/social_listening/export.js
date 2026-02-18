/**
 * Social Listening Export Routes
 *
 * Provides CSV and XLSX exports for:
 * - /export/mentions  — filtered mention list
 * - /export/influencers — influencer leaderboard
 * - /export/analytics — overview metrics snapshot
 */

const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');
const logger = require('../../../infrastructure/logger');

router.use(authenticate);

// ---------------------------------------------------------------------------
// Helper: send CSV response
// ---------------------------------------------------------------------------
function toCsv(rows, columns) {
    const header = columns.map(c => `"${c.label}"`).join(',');
    const lines = rows.map(row =>
        columns.map(c => {
            const val = row[c.key];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(',')
    );
    return [header, ...lines].join('\r\n');
}

// ---------------------------------------------------------------------------
// Helper: send XLSX response
// ---------------------------------------------------------------------------
async function sendXlsx(res, sheetName, rows, columns) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);

    ws.columns = columns.map(c => ({
        header: c.label,
        key: c.key,
        width: c.width || 20
    }));

    // Style header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
    };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    rows.forEach(row => {
        const mapped = {};
        columns.forEach(c => {
            mapped[c.key] = row[c.key] !== null && row[c.key] !== undefined ? row[c.key] : '';
        });
        ws.addRow(mapped);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sheetName}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
}

// ---------------------------------------------------------------------------
// GET /export/mentions
// ---------------------------------------------------------------------------
const MENTION_COLUMNS = [
    { key: 'platform', label: 'Platform', width: 15 },
    { key: 'author_handle', label: 'Author Handle', width: 22 },
    { key: 'author_name', label: 'Author Name', width: 25 },
    { key: 'author_followers', label: 'Followers', width: 12 },
    { key: 'content', label: 'Content', width: 60 },
    { key: 'sentiment', label: 'Sentiment', width: 14 },
    { key: 'sentiment_score', label: 'Sentiment Score', width: 16 },
    { key: 'intent', label: 'Intent', width: 16 },
    { key: 'likes', label: 'Likes', width: 10 },
    { key: 'shares', label: 'Shares', width: 10 },
    { key: 'comments', label: 'Comments', width: 12 },
    { key: 'reach', label: 'Reach', width: 12 },
    { key: 'geo_country', label: 'Country', width: 16 },
    { key: 'status', label: 'Status', width: 14 },
    { key: 'published_at', label: 'Published At', width: 22 },
    { key: 'content_url', label: 'URL', width: 40 },
];

router.get('/mentions', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { format = 'csv', platform, sentiment, intent, date_from, date_to, limit = 5000 } = req.query;

        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let idx = 2;

        if (platform) { conditions.push(`platform = $${idx++}`); values.push(platform); }
        if (sentiment) { conditions.push(`sentiment = $${idx++}`); values.push(sentiment); }
        if (intent) { conditions.push(`intent = $${idx++}`); values.push(intent); }
        if (date_from) { conditions.push(`published_at >= $${idx++}`); values.push(date_from); }
        if (date_to) { conditions.push(`published_at <= $${idx++}`); values.push(date_to); }

        values.push(Math.min(parseInt(limit) || 5000, 10000));

        const result = await query(
            `SELECT platform, author_handle, author_name, author_followers,
                    content, sentiment, sentiment_score, intent,
                    likes, shares, comments, reach,
                    geo_country, status, published_at, content_url
             FROM sl_mentions
             WHERE ${conditions.join(' AND ')}
             ORDER BY published_at DESC
             LIMIT $${idx}`,
            values
        );

        const rows = result.rows.map(r => ({
            ...r,
            published_at: r.published_at ? new Date(r.published_at).toISOString() : '',
            sentiment_score: r.sentiment_score ? parseFloat(r.sentiment_score).toFixed(3) : '0.000'
        }));

        const filename = `social_mentions_${new Date().toISOString().split('T')[0]}`;

        if (format === 'xlsx') {
            return sendXlsx(res, 'Mentions', rows, MENTION_COLUMNS);
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(toCsv(rows, MENTION_COLUMNS));

    } catch (error) {
        logger.error('[SL Export] Mentions export failed', { error: error.message });
        res.status(500).json({ error: 'Export failed' });
    }
});

// ---------------------------------------------------------------------------
// GET /export/influencers
// ---------------------------------------------------------------------------
const INFLUENCER_COLUMNS = [
    { key: 'platform', label: 'Platform', width: 15 },
    { key: 'handle', label: 'Handle', width: 25 },
    { key: 'display_name', label: 'Name', width: 25 },
    { key: 'follower_count', label: 'Followers', width: 14 },
    { key: 'mention_count', label: 'Mentions', width: 12 },
    { key: 'avg_sentiment', label: 'Avg Sentiment', width: 15 },
    { key: 'influence_score', label: 'Influence Score', width: 16 },
    { key: 'reach_estimate', label: 'Est. Reach', width: 14 },
    { key: 'is_verified', label: 'Verified', width: 10 },
    { key: 'last_mention_at', label: 'Last Mention', width: 22 },
    { key: 'profile_url', label: 'Profile URL', width: 40 },
];

router.get('/influencers', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { format = 'csv', platform, limit = 1000 } = req.query;

        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let idx = 2;

        if (platform) { conditions.push(`platform = $${idx++}`); values.push(platform); }
        values.push(Math.min(parseInt(limit) || 1000, 5000));

        const result = await query(
            `SELECT platform, handle, display_name, follower_count,
                    mention_count, avg_sentiment, influence_score, reach_estimate,
                    is_verified, last_mention_at, profile_url
             FROM sl_influencers
             WHERE ${conditions.join(' AND ')}
             ORDER BY influence_score DESC
             LIMIT $${idx}`,
            values
        );

        const rows = result.rows.map(r => ({
            ...r,
            avg_sentiment: r.avg_sentiment ? parseFloat(r.avg_sentiment).toFixed(3) : '0.000',
            influence_score: r.influence_score ? parseFloat(r.influence_score).toFixed(2) : '0.00',
            is_verified: r.is_verified ? 'Yes' : 'No',
            last_mention_at: r.last_mention_at ? new Date(r.last_mention_at).toISOString() : ''
        }));

        const filename = `influencers_${new Date().toISOString().split('T')[0]}`;

        if (format === 'xlsx') {
            return sendXlsx(res, 'Influencers', rows, INFLUENCER_COLUMNS);
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(toCsv(rows, INFLUENCER_COLUMNS));

    } catch (error) {
        logger.error('[SL Export] Influencers export failed', { error: error.message });
        res.status(500).json({ error: 'Export failed' });
    }
});

// ---------------------------------------------------------------------------
// GET /export/analytics
// ---------------------------------------------------------------------------
const ANALYTICS_COLUMNS = [
    { key: 'metric', label: 'Metric', width: 30 },
    { key: 'value', label: 'Value', width: 20 },
    { key: 'breakdown', label: 'Breakdown', width: 40 },
];

router.get('/analytics', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { format = 'csv', date_from, date_to } = req.query;

        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let idx = 2;

        if (date_from) { conditions.push(`published_at >= $${idx++}`); values.push(date_from); }
        if (date_to) { conditions.push(`published_at <= $${idx++}`); values.push(date_to); }

        const whereClause = conditions.join(' AND ');

        const [overviewRes, platformRes, sentimentRes, intentRes] = await Promise.all([
            query(`SELECT COUNT(*) as total,
                          AVG(sentiment_score) as avg_sentiment,
                          AVG(engagement_score) as avg_engagement
                   FROM sl_mentions WHERE ${whereClause}`, values),
            query(`SELECT platform, COUNT(*) as count FROM sl_mentions
                   WHERE ${whereClause} GROUP BY platform ORDER BY count DESC`, values),
            query(`SELECT sentiment, COUNT(*) as count FROM sl_mentions
                   WHERE ${whereClause} GROUP BY sentiment ORDER BY count DESC`, values),
            query(`SELECT intent, COUNT(*) as count FROM sl_mentions
                   WHERE ${whereClause} GROUP BY intent ORDER BY count DESC`, values),
        ]);

        const ov = overviewRes.rows[0];
        const rows = [
            { metric: 'Total Mentions', value: ov.total, breakdown: '' },
            { metric: 'Avg Sentiment Score', value: ov.avg_sentiment ? parseFloat(ov.avg_sentiment).toFixed(3) : '0.000', breakdown: '' },
            { metric: 'Avg Engagement Score', value: ov.avg_engagement ? parseFloat(ov.avg_engagement).toFixed(2) : '0.00', breakdown: '' },
            { metric: '', value: '', breakdown: '' },
            { metric: '--- By Platform ---', value: '', breakdown: '' },
            ...platformRes.rows.map(r => ({ metric: r.platform, value: r.count, breakdown: '' })),
            { metric: '', value: '', breakdown: '' },
            { metric: '--- By Sentiment ---', value: '', breakdown: '' },
            ...sentimentRes.rows.map(r => ({ metric: r.sentiment || 'unknown', value: r.count, breakdown: '' })),
            { metric: '', value: '', breakdown: '' },
            { metric: '--- By Intent ---', value: '', breakdown: '' },
            ...intentRes.rows.map(r => ({ metric: r.intent || 'unknown', value: r.count, breakdown: '' })),
        ];

        const filename = `social_analytics_${new Date().toISOString().split('T')[0]}`;

        if (format === 'xlsx') {
            return sendXlsx(res, 'Analytics', rows, ANALYTICS_COLUMNS);
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(toCsv(rows, ANALYTICS_COLUMNS));

    } catch (error) {
        logger.error('[SL Export] Analytics export failed', { error: error.message });
        res.status(500).json({ error: 'Export failed' });
    }
});

module.exports = router;
