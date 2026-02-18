'use strict';

/**
 * Social Listening Analytics Computation Job
 *
 * Runs every hour and:
 *  1. Trend Detection — compares each topic's recent mention volume against
 *     its 7-day trailing average.  Marks as trending when volume > 150 %.
 *  2. Influencer Score Recomputation — recalculates influence_score for
 *     every sl_influencer record using the weighted formula from Phase 7.
 *  3. Share-of-Voice Update — refreshes the share_of_voice column on
 *     sl_competitors by comparing each competitor's mention count against
 *     the tenant's own mention count + all competitors combined.
 *
 * Started in server/index.js under ENABLE_SL_ANALYTICS env guard.
 */

const cron = require('node-cron');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

let task = null;
let isRunning = false;
let lastRunAt = null;
let lastRunResult = null;

const socialListeningAnalyticsJob = {
    start() {
        if (task) {
            logger.warn('[SLAnalyticsJob] Already started');
            return;
        }

        // Run every hour at :05 past the hour to avoid clashing with the
        // 15-minute data-sync job.
        task = cron.schedule('5 * * * *', async () => {
            await _runAnalytics();
        }, { timezone: 'UTC' });

        logger.info('[SLAnalyticsJob] Started — runs every hour at :05');
    },

    stop() {
        if (task) {
            task.stop();
            task = null;
            logger.info('[SLAnalyticsJob] Stopped');
        }
    },

    getStatus() {
        return { active: task !== null, isRunning, lastRunAt, lastRunResult };
    },

    /** Expose for unit-testing or manual trigger via admin API */
    async runNow() {
        return _runAnalytics();
    }
};

// ---------------------------------------------------------------------------
// Main computation loop
// ---------------------------------------------------------------------------

async function _runAnalytics() {
    if (isRunning) {
        logger.warn('[SLAnalyticsJob] Previous run still active — skipping');
        return;
    }

    isRunning = true;
    const startedAt = new Date();
    logger.info('[SLAnalyticsJob] Starting analytics computation');

    const results = {
        tenantsProcessed: 0,
        topicsUpdated: 0,
        influencersUpdated: 0,
        competitorsUpdated: 0,
        errors: []
    };

    try {
        // Get all tenants that have any social listening data
        const tenantsRes = await query(
            `SELECT DISTINCT tenant_id FROM sl_mentions`
        );

        for (const { tenant_id } of tenantsRes.rows) {
            try {
                const [topics, influencers, competitors] = await Promise.all([
                    _updateTopicTrends(tenant_id),
                    _updateInfluencerScores(tenant_id),
                    _updateShareOfVoice(tenant_id)
                ]);
                results.topicsUpdated += topics;
                results.influencersUpdated += influencers;
                results.competitorsUpdated += competitors;
                results.tenantsProcessed++;
            } catch (err) {
                logger.error('[SLAnalyticsJob] Tenant analytics failed', {
                    tenant_id,
                    error: err.message
                });
                results.errors.push({ tenant_id, error: err.message });
            }
        }

        const durationMs = Date.now() - startedAt.getTime();
        results.durationMs = durationMs;
        lastRunResult = results;
        lastRunAt = startedAt;

        logger.info('[SLAnalyticsJob] Analytics computation complete', results);

    } catch (err) {
        logger.error('[SLAnalyticsJob] Analytics job error', { error: err.message });
        lastRunResult = { error: err.message };
        lastRunAt = startedAt;
    } finally {
        isRunning = false;
    }
}

// ---------------------------------------------------------------------------
// 1. Topic Trend Detection
// ---------------------------------------------------------------------------

async function _updateTopicTrends(tenantId) {
    // For each topic, compare mention volume in the last hour vs the 7-day
    // hourly average.  Update is_trending, trend_direction, trend_change_pct.

    const NOW_1H_AGO   = "NOW() - INTERVAL '1 hour'";
    const NOW_7D_AGO   = "NOW() - INTERVAL '7 days'";
    const TREND_THRESHOLD = 1.5; // 150 % of baseline = trending

    // Aggregate recent (1h) and baseline (7d/168h) mention counts per topic
    const topicsRes = await query(
        `SELECT t.id,
                t.name,
                t.mention_count,
                COUNT(m.id) FILTER (WHERE m.published_at >= ${NOW_1H_AGO})            AS recent_count,
                COUNT(m.id) FILTER (WHERE m.published_at >= ${NOW_7D_AGO})            AS week_count,
                AVG(m.sentiment_score) FILTER (WHERE m.published_at >= ${NOW_7D_AGO}) AS week_avg_sentiment
         FROM sl_topics t
         LEFT JOIN sl_mentions m
                ON m.tenant_id = t.tenant_id
               AND m.published_at >= ${NOW_7D_AGO}
               AND EXISTS (
                   SELECT 1 FROM jsonb_array_elements_text(m.topics) elem
                   WHERE lower(elem) = lower(t.name)
               )
         WHERE t.tenant_id = $1
         GROUP BY t.id, t.name, t.mention_count`,
        [tenantId]
    );

    let updated = 0;

    for (const row of topicsRes.rows) {
        const recentCount  = parseInt(row.recent_count) || 0;
        const weekCount    = parseInt(row.week_count) || 0;
        const weekAvgPerHr = weekCount / 168; // 7 days * 24 hours

        const isTrending    = weekAvgPerHr > 0 && recentCount >= weekAvgPerHr * TREND_THRESHOLD;
        const changePct     = weekAvgPerHr > 0
            ? ((recentCount - weekAvgPerHr) / weekAvgPerHr * 100).toFixed(1)
            : null;
        const trendDirection = recentCount > weekAvgPerHr ? 'up' : recentCount < weekAvgPerHr ? 'down' : 'stable';
        const avgSentiment   = row.week_avg_sentiment ? parseFloat(row.week_avg_sentiment) : null;

        await query(
            `UPDATE sl_topics
             SET is_trending       = $1,
                 trend_direction   = $2,
                 trend_change_pct  = $3,
                 avg_sentiment     = COALESCE($4, avg_sentiment),
                 mention_count     = $5,
                 last_seen_at      = CASE WHEN $5 > mention_count THEN NOW() ELSE last_seen_at END,
                 updated_at        = NOW()
             WHERE id = $6 AND tenant_id = $7`,
            [isTrending, trendDirection, changePct, avgSentiment, weekCount, row.id, tenantId]
        );
        updated++;
    }

    return updated;
}

// ---------------------------------------------------------------------------
// 2. Influencer Score Recomputation
// ---------------------------------------------------------------------------
// Formula (from Phase 7 spec):
//   score = (followers * 0.3) + (mention_count * 10 * 0.2) + (avg_engagement * 100 * 0.3) + (verified * 1000 * 0.2)
// Scores are normalised to 0–100 range across all influencers for the tenant.

async function _updateInfluencerScores(tenantId) {
    // Recompute mention_count and avg_sentiment from live sl_mentions data
    const influencersRes = await query(
        `SELECT i.id,
                i.follower_count,
                i.is_verified,
                COUNT(m.id)            AS mention_count,
                AVG(m.engagement_score) AS avg_engagement,
                AVG(m.sentiment_score)  AS avg_sentiment,
                MAX(m.published_at)     AS last_mention_at
         FROM sl_influencers i
         LEFT JOIN sl_mentions m
               ON m.tenant_id = i.tenant_id
              AND lower(m.author_handle) = lower(i.handle)
              AND m.published_at >= NOW() - INTERVAL '30 days'
         WHERE i.tenant_id = $1
         GROUP BY i.id, i.follower_count, i.is_verified`,
        [tenantId]
    );

    if (influencersRes.rows.length === 0) return 0;

    // Compute raw scores
    const rawScores = influencersRes.rows.map(row => {
        const followers    = parseInt(row.follower_count) || 0;
        const mentions     = parseInt(row.mention_count) || 0;
        const engagement   = parseFloat(row.avg_engagement) || 0;
        const verified     = row.is_verified ? 1 : 0;

        // Raw weighted components
        const raw = (followers * 0.3) +
                    (mentions * 10 * 0.2) +
                    (engagement * 100 * 0.3) +
                    (verified * 1000 * 0.2);

        return { ...row, raw };
    });

    // Normalise 0–100
    const maxRaw = Math.max(...rawScores.map(r => r.raw), 1);
    let updated = 0;

    for (const row of rawScores) {
        const score        = parseFloat(((row.raw / maxRaw) * 100).toFixed(2));
        const avgSentiment = row.avg_sentiment ? parseFloat(parseFloat(row.avg_sentiment).toFixed(3)) : null;
        const mentions     = parseInt(row.mention_count) || 0;
        const lastMention  = row.last_mention_at || null;
        const reach        = Math.round((parseInt(row.follower_count) || 0) * 0.03 * (mentions || 1));

        await query(
            `UPDATE sl_influencers
             SET influence_score = $1,
                 mention_count   = $2,
                 avg_sentiment   = COALESCE($3, avg_sentiment),
                 reach_estimate  = $4,
                 last_mention_at = COALESCE($5, last_mention_at),
                 updated_at      = NOW()
             WHERE id = $6 AND tenant_id = $7`,
            [score, mentions, avgSentiment, reach, lastMention, row.id, tenantId]
        );
        updated++;
    }

    return updated;
}

// ---------------------------------------------------------------------------
// 3. Share-of-Voice Update
// ---------------------------------------------------------------------------

async function _updateShareOfVoice(tenantId) {
    // Count the tenant's own mentions in the last 30 days
    const ownRes = await query(
        `SELECT COUNT(*) AS cnt FROM sl_mentions
         WHERE tenant_id = $1
           AND published_at >= NOW() - INTERVAL '30 days'`,
        [tenantId]
    );
    const ownMentions = parseInt(ownRes.rows[0]?.cnt) || 0;

    // For each competitor, count how many sl_mentions match their keywords
    const competitorsRes = await query(
        `SELECT id, name, keywords FROM sl_competitors WHERE tenant_id = $1`,
        [tenantId]
    );

    if (competitorsRes.rows.length === 0) return 0;

    // Compute competitor mention counts
    const competitorCounts = [];
    for (const comp of competitorsRes.rows) {
        const keywords = Array.isArray(comp.keywords) ? comp.keywords : [];
        if (keywords.length === 0) {
            competitorCounts.push({ id: comp.id, count: 0 });
            continue;
        }

        const conditions = keywords.map((kw, i) => `content ILIKE $${i + 2}`).join(' OR ');
        const values = [tenantId, ...keywords.map(k => `%${k}%`)];

        const countRes = await query(
            `SELECT COUNT(*) AS cnt FROM sl_mentions
             WHERE tenant_id = $1
               AND published_at >= NOW() - INTERVAL '30 days'
               AND (${conditions})`,
            values
        ).catch(() => ({ rows: [{ cnt: 0 }] }));

        competitorCounts.push({
            id: comp.id,
            count: parseInt(countRes.rows[0]?.cnt) || 0
        });
    }

    const totalMentions = ownMentions + competitorCounts.reduce((s, c) => s + c.count, 0);

    let updated = 0;
    for (const { id, count } of competitorCounts) {
        const sov = totalMentions > 0
            ? parseFloat(((count / totalMentions) * 100).toFixed(2))
            : 0;

        await query(
            `UPDATE sl_competitors
             SET share_of_voice = $1,
                 mention_count  = $2,
                 updated_at     = NOW()
             WHERE id = $3 AND tenant_id = $4`,
            [sov, count, id, tenantId]
        );
        updated++;
    }

    return updated;
}

module.exports = socialListeningAnalyticsJob;
