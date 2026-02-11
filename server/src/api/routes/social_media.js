const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

// ==================== CAMPAIGNS ====================

// GET /api/v1/social-media/campaigns - List all campaigns
router.get('/campaigns', authenticate, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
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
                engagement_rate,
                created_at,
                updated_at
            FROM social_media_campaigns
            WHERE tenant_id = $1
            ORDER BY created_at DESC
        `, [req.user.tenant_id]);

        res.json(result.rows);
    } catch (err) {
        logger.error('Failed to get campaigns', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/v1/social-media/campaigns/:id - Get single campaign
router.get('/campaigns/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT * FROM social_media_campaigns
            WHERE id = $1 AND tenant_id = $2
        `, [id, req.user.tenant_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to get campaign', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/v1/social-media/campaigns - Create campaign
router.post('/campaigns', authenticate, async (req, res) => {
    try {
        const {
            name,
            description,
            platforms,
            target_personas,
            start_date,
            end_date,
            budget,
            objective
        } = req.body;

        // Validation
        if (!name || !platforms || platforms.length === 0) {
            return res.status(400).json({ error: 'Name and at least one platform required' });
        }

        const result = await query(`
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
                created_by,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING *
        `, [
            req.user.tenant_id,
            name,
            description || null,
            JSON.stringify(platforms),
            JSON.stringify(target_personas || []),
            'draft',
            start_date || null,
            end_date || null,
            budget || null,
            objective || 'awareness',
            req.user.id
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to create campaign', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/v1/social-media/campaigns/:id - Update campaign
router.put('/campaigns/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            platforms,
            target_personas,
            status,
            start_date,
            end_date,
            budget,
            objective
        } = req.body;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(description);
        }
        if (platforms !== undefined) {
            updates.push(`platforms = $${paramIndex++}`);
            params.push(JSON.stringify(platforms));
        }
        if (target_personas !== undefined) {
            updates.push(`target_personas = $${paramIndex++}`);
            params.push(JSON.stringify(target_personas));
        }
        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        if (start_date !== undefined) {
            updates.push(`start_date = $${paramIndex++}`);
            params.push(start_date);
        }
        if (end_date !== undefined) {
            updates.push(`end_date = $${paramIndex++}`);
            params.push(end_date);
        }
        if (budget !== undefined) {
            updates.push(`budget = $${paramIndex++}`);
            params.push(budget);
        }
        if (objective !== undefined) {
            updates.push(`objective = $${paramIndex++}`);
            params.push(objective);
        }

        updates.push(`updated_at = NOW()`);
        params.push(id, req.user.tenant_id);

        const result = await query(`
            UPDATE social_media_campaigns
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
            RETURNING *
        `, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to update campaign', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/v1/social-media/campaigns/:id - Delete campaign
router.delete('/campaigns/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            DELETE FROM social_media_campaigns
            WHERE id = $1 AND tenant_id = $2
            RETURNING id
        `, [id, req.user.tenant_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.status(204).send();
    } catch (err) {
        logger.error('Failed to delete campaign', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// ==================== POSTS ====================

// GET /api/v1/social-media/campaigns/:campaignId/posts - List posts for campaign
router.get('/campaigns/:campaignId/posts', authenticate, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const tenantId = req.user.tenant_id;

        // Verify campaign ownership
        const campCheck = await query('SELECT id FROM social_media_campaigns WHERE id = $1 AND tenant_id = $2', [campaignId, tenantId]);
        if (campCheck.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

        const result = await query(`
            SELECT * FROM social_media_posts
            WHERE campaign_id = $1
            ORDER BY scheduled_time DESC
        `, [campaignId]);

        res.json(result.rows);
    } catch (err) {
        logger.error('Failed to get posts', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/v1/social-media/posts - Create post
router.post('/posts', authenticate, async (req, res) => {
    try {
        const {
            campaign_id,
            content,
            platforms,
            media_urls,
            scheduled_time,
            status
        } = req.body;

        if (!campaign_id || !content || !platforms) {
            return res.status(400).json({ error: 'Campaign ID, content, and platforms required' });
        }

        // Verify campaign ownership
        const campCheck = await query('SELECT id FROM social_media_campaigns WHERE id = $1 AND tenant_id = $2', [campaign_id, req.user.tenant_id]);
        if (campCheck.rows.length === 0) return res.status(403).json({ error: 'Invalid campaign ID' });

        const result = await query(`
            INSERT INTO social_media_posts (
                campaign_id,
                content,
                platforms,
                media_urls,
                scheduled_time,
                status,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
        `, [
            campaign_id,
            content,
            JSON.stringify(platforms),
            JSON.stringify(media_urls || []),
            scheduled_time || null,
            status || 'draft'
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to create post', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// ==================== ANALYTICS ====================

// GET /api/v1/social-media/analytics/overview - Get overall analytics
router.get('/analytics/overview', authenticate, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        // Aggregate campaign metrics
        const result = await query(`
            SELECT 
                COUNT(*) as total_campaigns,
                SUM(posts_count) as total_posts,
                SUM(reach) as total_reach,
                AVG(engagement_rate) as avg_engagement_rate,
                SUM(budget) as total_budget
            FROM social_media_campaigns
            WHERE tenant_id = $1
            ${start_date ? 'AND created_at >= $2' : ''}
            ${end_date ? 'AND created_at <= $3' : ''}
        `, [req.user.tenant_id, start_date, end_date].filter(Boolean));

        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to get analytics overview', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/v1/social-media/analytics/campaigns/:id - Get campaign analytics
router.get('/analytics/campaigns/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                c.*,
                COUNT(p.id) as total_posts,
                SUM(CASE WHEN p.status = 'published' THEN 1 ELSE 0 END) as published_posts,
                SUM(CASE WHEN p.status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_posts
            FROM social_media_campaigns c
            LEFT JOIN social_media_posts p ON c.id = p.campaign_id
            WHERE c.id = $1 AND c.tenant_id = $2
            GROUP BY c.id
        `, [id, req.user.tenant_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Failed to get campaign analytics', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
