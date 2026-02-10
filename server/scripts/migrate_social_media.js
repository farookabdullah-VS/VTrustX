const { query } = require('../src/infrastructure/database/db');

async function migrateSocialMediaTables() {
    console.log('Starting Social Media Marketing schema migration...');

    try {
        // Create social_media_campaigns table
        await query(`
            CREATE TABLE IF NOT EXISTS social_media_campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(255) NOT NULL,
                name VARCHAR(500) NOT NULL,
                description TEXT,
                platforms JSONB DEFAULT '[]'::jsonb,
                target_personas JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(50) DEFAULT 'draft',
                start_date DATE,
                end_date DATE,
                budget DECIMAL(15, 2),
                objective VARCHAR(100),
                posts_count INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                engagement_rate DECIMAL(5, 2) DEFAULT 0,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✓ Created social_media_campaigns table');

        // Create social_media_posts table
        await query(`
            CREATE TABLE IF NOT EXISTS social_media_posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID REFERENCES social_media_campaigns(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                platforms JSONB DEFAULT '[]'::jsonb,
                media_urls JSONB DEFAULT '[]'::jsonb,
                scheduled_time TIMESTAMP,
                published_time TIMESTAMP,
                status VARCHAR(50) DEFAULT 'draft',
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✓ Created social_media_posts table');

        // Create social_media_content_library table
        await query(`
            CREATE TABLE IF NOT EXISTS social_media_content_library (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(255) NOT NULL,
                name VARCHAR(500) NOT NULL,
                type VARCHAR(50),
                url TEXT NOT NULL,
                thumbnail_url TEXT,
                file_size INTEGER,
                dimensions VARCHAR(50),
                tags JSONB DEFAULT '[]'::jsonb,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✓ Created social_media_content_library table');

        // Create social_media_analytics table
        await query(`
            CREATE TABLE IF NOT EXISTS social_media_analytics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID REFERENCES social_media_campaigns(id) ON DELETE CASCADE,
                post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
                platform VARCHAR(50) NOT NULL,
                metric_date DATE NOT NULL,
                impressions INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                engagement INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                conversions INTEGER DEFAULT 0,
                spend DECIMAL(15, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✓ Created social_media_analytics table');

        // Create indexes for performance
        await query(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_tenant 
            ON social_media_campaigns(tenant_id);
        `);
        console.log('✓ Created index on campaigns tenant_id');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_status 
            ON social_media_campaigns(status);
        `);
        console.log('✓ Created index on campaigns status');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_posts_campaign 
            ON social_media_posts(campaign_id);
        `);
        console.log('✓ Created index on posts campaign_id');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_posts_scheduled 
            ON social_media_posts(scheduled_time);
        `);
        console.log('✓ Created index on posts scheduled_time');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_campaign 
            ON social_media_analytics(campaign_id);
        `);
        console.log('✓ Created index on analytics campaign_id');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_date 
            ON social_media_analytics(metric_date);
        `);
        console.log('✓ Created index on analytics metric_date');

        // Insert demo campaign
        await query(`
            INSERT INTO social_media_campaigns (
                tenant_id,
                name,
                description,
                platforms,
                target_personas,
                status,
                start_date,
                end_date,
                budget,
                objective,
                posts_count,
                reach,
                engagement_rate
            ) VALUES (
                'default',
                'Summer Sale 2026',
                'Promote summer collection across social media platforms',
                '["facebook", "instagram", "twitter"]'::jsonb,
                '["Young Professional", "Tech Enthusiast"]'::jsonb,
                'active',
                '2026-06-01',
                '2026-08-31',
                50000,
                'conversions',
                12,
                125400,
                4.8
            ) ON CONFLICT DO NOTHING;
        `);
        console.log('✓ Inserted demo campaign');

        console.log('\n✅ Social Media Marketing schema migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

// Run migration
migrateSocialMediaTables();
