/**
 * Social Listening Module - Database Schema
 *
 * Creates 8 tables for social media listening functionality:
 * - sl_sources: Connected platform sources
 * - sl_queries: Keywords/brands to monitor
 * - sl_mentions: Core mention data (every captured mention)
 * - sl_topics: Aggregated topic tracking
 * - sl_influencers: Identified influencers
 * - sl_competitors: Competitors to benchmark
 * - sl_alerts: Alert rules
 * - sl_alert_events: Alert trigger history
 * - sl_mention_responses: Replies sent from platform
 *
 * Also modifies ctl_alerts table to add mention_id and source_channel columns
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

async function ensureSocialListeningTables() {
    try {
        logger.info('[Schema] Ensuring social listening tables exist...');

        // 1. sl_sources - Connected platform sources
        await query(`
            CREATE TABLE IF NOT EXISTS sl_sources (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                platform VARCHAR(50) NOT NULL, -- twitter/facebook/instagram/linkedin/reddit/youtube/google_reviews/news_rss/aggregator
                name VARCHAR(255) NOT NULL,
                connection_type VARCHAR(50) NOT NULL, -- direct_api/aggregator/rss/csv_import
                credentials JSONB, -- encrypted reference
                config JSONB DEFAULT '{}',
                status VARCHAR(50) DEFAULT 'active', -- active/paused/error/disconnected
                last_sync_at TIMESTAMP,
                sync_interval_minutes INTEGER DEFAULT 15,
                error_message TEXT,
                rate_limit_remaining INTEGER,
                rate_limit_reset_at TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('[Schema] ✅ sl_sources table ready');

        // Index for tenant queries
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_sources_tenant
            ON sl_sources(tenant_id)
        `);

        // 2. sl_queries - Keywords/brands to listen for
        await query(`
            CREATE TABLE IF NOT EXISTS sl_queries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                name VARCHAR(255) NOT NULL,
                keywords JSONB DEFAULT '[]', -- array of keywords
                excluded_keywords JSONB DEFAULT '[]',
                languages JSONB DEFAULT '[]', -- array: ['en', 'ar']
                platforms JSONB DEFAULT '[]', -- array: ['twitter', 'facebook']
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('[Schema] ✅ sl_queries table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_queries_tenant
            ON sl_queries(tenant_id)
        `);

        // 3. sl_mentions - Core mention data (every captured mention)
        await query(`
            CREATE TABLE IF NOT EXISTS sl_mentions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                source_id UUID REFERENCES sl_sources(id),
                query_id UUID REFERENCES sl_queries(id),
                platform VARCHAR(50) NOT NULL,
                external_id VARCHAR(255) NOT NULL,

                -- Author info
                author_name VARCHAR(255),
                author_handle VARCHAR(255),
                author_avatar_url TEXT,
                author_followers INTEGER DEFAULT 0,
                author_verified BOOLEAN DEFAULT false,

                -- Content
                content TEXT,
                content_url TEXT,
                media_urls JSONB DEFAULT '[]',
                post_type VARCHAR(50), -- post/reply/retweet/comment/review/article
                parent_id UUID REFERENCES sl_mentions(id),

                -- AI Analysis
                sentiment VARCHAR(20), -- positive/negative/neutral/mixed
                sentiment_score NUMERIC(5,3), -- -1.000 to 1.000
                intent VARCHAR(50), -- complaint/praise/question/suggestion/general
                topics JSONB DEFAULT '[]',
                entities JSONB DEFAULT '{}', -- {brands:[], products:[], people:[], locations:[]}
                language VARCHAR(10),
                is_spam BOOLEAN DEFAULT false,
                is_bot BOOLEAN DEFAULT false,

                -- Engagement
                likes INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                engagement_score NUMERIC(10,2) DEFAULT 0,

                -- Geo
                geo_country VARCHAR(100),
                geo_region VARCHAR(100),
                geo_city VARCHAR(100),
                geo_lat NUMERIC(10,7),
                geo_lng NUMERIC(10,7),

                -- Status
                status VARCHAR(50) DEFAULT 'new', -- new/reviewed/actioned/archived
                assigned_to INTEGER REFERENCES users(id),

                -- Meta
                raw_data JSONB DEFAULT '{}',
                published_at TIMESTAMP NOT NULL,
                ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                analyzed_at TIMESTAMP,

                UNIQUE(tenant_id, platform, external_id)
            )
        `);
        logger.info('[Schema] ✅ sl_mentions table ready');

        // Indexes for mentions (most queried table)
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mentions_tenant
            ON sl_mentions(tenant_id)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mentions_tenant_platform
            ON sl_mentions(tenant_id, platform)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mentions_tenant_sentiment
            ON sl_mentions(tenant_id, sentiment)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mentions_tenant_published
            ON sl_mentions(tenant_id, published_at DESC)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mentions_query
            ON sl_mentions(query_id)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mentions_tenant_intent
            ON sl_mentions(tenant_id, intent)
        `);

        // 4. sl_topics - Aggregated topic tracking
        await query(`
            CREATE TABLE IF NOT EXISTS sl_topics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                name VARCHAR(255) NOT NULL,
                mention_count INTEGER DEFAULT 0,
                avg_sentiment NUMERIC(5,3),
                trend_direction VARCHAR(20), -- rising/falling/stable
                trend_change_pct NUMERIC(6,2),
                first_seen_at TIMESTAMP,
                last_seen_at TIMESTAMP,
                is_trending BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, name)
            )
        `);
        logger.info('[Schema] ✅ sl_topics table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_topics_tenant
            ON sl_topics(tenant_id)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_topics_trending
            ON sl_topics(tenant_id, is_trending)
        `);

        // 5. sl_influencers - Identified influencers
        await query(`
            CREATE TABLE IF NOT EXISTS sl_influencers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                platform VARCHAR(50) NOT NULL,
                handle VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                avatar_url TEXT,
                follower_count INTEGER DEFAULT 0,
                mention_count INTEGER DEFAULT 0,
                avg_sentiment NUMERIC(5,3),
                influence_score NUMERIC(10,2) DEFAULT 0,
                reach_estimate INTEGER DEFAULT 0,
                is_verified BOOLEAN DEFAULT false,
                last_mention_at TIMESTAMP,
                customer_id INTEGER REFERENCES crm_accounts(id), -- link to Customer360
                profile_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, platform, handle)
            )
        `);
        logger.info('[Schema] ✅ sl_influencers table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_influencers_tenant
            ON sl_influencers(tenant_id)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_influencers_score
            ON sl_influencers(tenant_id, influence_score DESC)
        `);

        // 6. sl_competitors - Competitors to benchmark
        await query(`
            CREATE TABLE IF NOT EXISTS sl_competitors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                name VARCHAR(255) NOT NULL,
                keywords JSONB DEFAULT '[]',
                logo_url TEXT,
                mention_count INTEGER DEFAULT 0,
                avg_sentiment NUMERIC(5,3),
                share_of_voice NUMERIC(6,2), -- percentage
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('[Schema] ✅ sl_competitors table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_competitors_tenant
            ON sl_competitors(tenant_id)
        `);

        // 7. sl_alerts - Alert rules
        await query(`
            CREATE TABLE IF NOT EXISTS sl_alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                name VARCHAR(255) NOT NULL,
                rule_type VARCHAR(50) NOT NULL, -- sentiment_threshold/volume_spike/keyword_match/influencer_mention/competitor_spike
                conditions JSONB DEFAULT '{}', -- rule-specific conditions
                actions JSONB DEFAULT '[]', -- array: [notification, ticket, email, ctl_alert]
                platforms JSONB DEFAULT '[]', -- filter by platforms
                is_active BOOLEAN DEFAULT true,
                last_triggered_at TIMESTAMP,
                trigger_count INTEGER DEFAULT 0,
                cooldown_minutes INTEGER DEFAULT 60,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('[Schema] ✅ sl_alerts table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_alerts_tenant
            ON sl_alerts(tenant_id)
        `);

        // 8. sl_alert_events - Alert trigger history
        await query(`
            CREATE TABLE IF NOT EXISTS sl_alert_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                alert_id UUID REFERENCES sl_alerts(id),
                mention_id UUID REFERENCES sl_mentions(id),
                event_type VARCHAR(50),
                event_data JSONB DEFAULT '{}',
                status VARCHAR(50) DEFAULT 'pending', -- pending/actioned/dismissed
                actioned_by INTEGER REFERENCES users(id),
                actioned_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('[Schema] ✅ sl_alert_events table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_alert_events_tenant
            ON sl_alert_events(tenant_id)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_alert_events_alert
            ON sl_alert_events(alert_id)
        `);

        // 9. sl_mention_responses - Replies sent from platform
        await query(`
            CREATE TABLE IF NOT EXISTS sl_mention_responses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                mention_id UUID REFERENCES sl_mentions(id) NOT NULL,
                response_text TEXT NOT NULL,
                response_type VARCHAR(50), -- manual/ai_generated/template
                sent_via VARCHAR(50), -- api/manual
                sent_at TIMESTAMP,
                sent_by INTEGER REFERENCES users(id),
                external_response_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'draft', -- draft/sent/failed
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('[Schema] ✅ sl_mention_responses table ready');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_sl_mention_responses_mention
            ON sl_mention_responses(mention_id)
        `);

        // 10. Modify ctl_alerts table to add mention_id and source_channel
        await query(`
            ALTER TABLE ctl_alerts
            ADD COLUMN IF NOT EXISTS mention_id UUID,
            ADD COLUMN IF NOT EXISTS source_channel VARCHAR(50)
        `);
        logger.info('[Schema] ✅ ctl_alerts table extended for social listening');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_ctl_alerts_mention
            ON ctl_alerts(mention_id)
        `);

        logger.info('[Schema] ✅ All social listening tables created successfully');

    } catch (error) {
        logger.error('[Schema] Failed to create social listening tables', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

module.exports = ensureSocialListeningTables;
