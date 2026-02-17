'use strict';

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const ConnectorFactory = require('./connectors/ConnectorFactory');

// In-memory registry of currently-running sync operations.
// getSyncStatus() is called synchronously by the routes layer.
const activeSyncs = new Map(); // sourceId -> { status, startedAt }

const UPSERT_MENTION_SQL = `
    INSERT INTO sl_mentions (
        tenant_id, source_id, query_id, platform, external_id,
        author_name, author_handle, author_avatar_url, author_followers, author_verified,
        content, content_url, media_urls, post_type,
        likes, shares, comments, reach,
        raw_data, published_at
    ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20
    )
    ON CONFLICT (tenant_id, platform, external_id) DO UPDATE SET
        content          = EXCLUDED.content,
        likes            = EXCLUDED.likes,
        shares           = EXCLUDED.shares,
        comments         = EXCLUDED.comments,
        reach            = EXCLUDED.reach,
        author_followers = EXCLUDED.author_followers,
        raw_data         = EXCLUDED.raw_data
    RETURNING id
`;

const DataSyncService = {

    /**
     * Sync a single source by ID.
     *
     * @param {string} sourceId – UUID from sl_sources
     * @returns {{ mentionsFound, mentionsSaved }}
     */
    async syncSource(sourceId) {
        activeSyncs.set(sourceId, { status: 'syncing', startedAt: new Date() });

        try {
            // 1. Load source record
            const srcResult = await query(
                `SELECT id, tenant_id, platform, credentials, config, last_sync_at
                 FROM sl_sources
                 WHERE id = $1`,
                [sourceId]
            );
            if (srcResult.rows.length === 0) {
                throw new Error(`Source not found: ${sourceId}`);
            }
            const source = srcResult.rows[0];

            if (!ConnectorFactory.supports(source.platform)) {
                logger.warn('[DataSyncService] Unsupported platform, skipping', {
                    sourceId,
                    platform: source.platform
                });
                await _markSourceStatus(sourceId, 'error', `Unsupported platform: ${source.platform}`);
                activeSyncs.delete(sourceId);
                return { mentionsFound: 0, mentionsSaved: 0 };
            }

            // 2. Load active queries (keywords) for this tenant
            const qResult = await query(
                `SELECT id, keywords FROM sl_queries
                 WHERE tenant_id = $1 AND is_active = true`,
                [source.tenant_id]
            );
            const queries = qResult.rows;

            // Flatten all keywords across all active queries (deduplicated)
            const allKeywords = [
                ...new Set(
                    queries.flatMap(q => (Array.isArray(q.keywords) ? q.keywords : []))
                )
            ];

            // 3. Create connector
            const connector = ConnectorFactory.create(
                source.platform,
                source.credentials || {},
                source.config || {}
            );

            // 4. Fetch mentions since last sync
            logger.info('[DataSyncService] Fetching mentions', {
                sourceId,
                platform: source.platform,
                since: source.last_sync_at,
                keywordCount: allKeywords.length
            });

            const mentions = await connector.fetchMentions({
                since: source.last_sync_at,
                keywords: allKeywords,
                limit: 500
            });

            // 5. UPSERT each mention
            let mentionsSaved = 0;
            for (const mention of mentions) {
                try {
                    // Match to first query whose keywords appear in the content
                    const matchingQuery = queries.find(q =>
                        Array.isArray(q.keywords) &&
                        q.keywords.some(kw =>
                            mention.content &&
                            mention.content.toLowerCase().includes(kw.toLowerCase())
                        )
                    );

                    await query(UPSERT_MENTION_SQL, [
                        source.tenant_id,                      // $1
                        sourceId,                               // $2
                        matchingQuery ? matchingQuery.id : null,// $3
                        source.platform,                        // $4
                        String(mention.external_id),            // $5
                        mention.author_name   || null,          // $6
                        mention.author_handle || null,          // $7
                        mention.author_avatar_url || null,      // $8
                        mention.author_followers || 0,          // $9
                        mention.author_verified  || false,      // $10
                        mention.content       || '',            // $11
                        mention.content_url   || null,          // $12
                        JSON.stringify(mention.media_urls || []), // $13
                        mention.post_type     || 'post',        // $14
                        mention.likes    || 0,                  // $15
                        mention.shares   || 0,                  // $16
                        mention.comments || 0,                  // $17
                        mention.reach    || 0,                  // $18
                        JSON.stringify(mention.raw_data || {}), // $19
                        mention.published_at instanceof Date     // $20
                            ? mention.published_at
                            : new Date(mention.published_at)
                    ]);
                    mentionsSaved++;
                } catch (upsertErr) {
                    logger.warn('[DataSyncService] Mention upsert failed', {
                        externalId: mention.external_id,
                        error: upsertErr.message
                    });
                }
            }

            // 6. Update source: mark connected, update last_sync_at
            await query(
                `UPDATE sl_sources
                 SET status = 'connected', last_sync_at = NOW(), error_message = NULL,
                     updated_at = NOW()
                 WHERE id = $1`,
                [sourceId]
            );

            logger.info('[DataSyncService] Source sync complete', {
                sourceId,
                platform: source.platform,
                mentionsFound: mentions.length,
                mentionsSaved
            });

            activeSyncs.delete(sourceId);
            return { mentionsFound: mentions.length, mentionsSaved };

        } catch (err) {
            logger.error('[DataSyncService] Source sync failed', {
                sourceId,
                error: err.message
            });
            await _markSourceStatus(sourceId, 'error', err.message);
            activeSyncs.delete(sourceId);
            throw err;
        }
    },

    /**
     * Sync all eligible sources for a tenant.
     *
     * @param {number} tenantId
     * @returns {{ sourcesAttempted, sourcesFailed, totalMentionsSaved }}
     */
    async syncTenant(tenantId) {
        const srcResult = await query(
            `SELECT id FROM sl_sources
             WHERE tenant_id = $1 AND status NOT IN ('paused', 'disconnected')`,
            [tenantId]
        );
        const sources = srcResult.rows;

        let sourcesFailed = 0;
        let totalMentionsSaved = 0;

        for (const { id: sourceId } of sources) {
            try {
                const { mentionsSaved } = await DataSyncService.syncSource(sourceId);
                totalMentionsSaved += mentionsSaved;
            } catch (err) {
                sourcesFailed++;
                logger.error('[DataSyncService] syncTenant: source failed', {
                    tenantId,
                    sourceId,
                    error: err.message
                });
            }
        }

        return {
            sourcesAttempted: sources.length,
            sourcesFailed,
            totalMentionsSaved
        };
    },

    /**
     * Return the current in-memory sync status for a source.
     * Intentionally synchronous — called without await in sync.js routes.
     *
     * @param {string} sourceId
     * @returns {{ status: string, startedAt?: Date }}
     */
    getSyncStatus(sourceId) {
        return activeSyncs.get(sourceId) || { status: 'idle' };
    }
};

// ---------------------------------------------------------------------------

async function _markSourceStatus(sourceId, status, errorMessage) {
    try {
        await query(
            `UPDATE sl_sources
             SET status = $1, error_message = $2, updated_at = NOW()
             WHERE id = $3`,
            [status, errorMessage || null, sourceId]
        );
    } catch (err) {
        logger.error('[DataSyncService] Failed to update source status', {
            sourceId,
            error: err.message
        });
    }
}

module.exports = DataSyncService;
