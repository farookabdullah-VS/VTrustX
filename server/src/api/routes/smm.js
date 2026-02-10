const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/auth');

// ==========================================
// 1. CAMPAIGNS
// ==========================================

// GET /api/v1/smm/campaigns
router.get('/campaigns', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(`
            SELECT c.*, b.brand_name 
            FROM smm.campaign c
            JOIN smm.brand b ON c.brand_id = b.brand_id
            WHERE b.tenant_id = $1
            ORDER BY c.created_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// POST /api/v1/smm/campaigns
router.post('/campaigns', authenticate, async (req, res) => {
    const { name, brand_id, objective, start_date, end_date } = req.body;
    try {
        const tenantId = req.user.tenant_id;
        const campaignCode = name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

        // Verify brand belongs to tenant
        let targetBrandId = brand_id;
        if (targetBrandId) {
            const brandCheck = await query('SELECT brand_id FROM smm.brand WHERE brand_id = $1 AND tenant_id = $2', [targetBrandId, tenantId]);
            if (brandCheck.rows.length === 0) return res.status(403).json({ error: 'Invalid brand ID' });
        } else {
            // Find or create default brand for this tenant
            const brandRes = await query('SELECT brand_id FROM smm.brand WHERE tenant_id = $1 LIMIT 1', [tenantId]);
            if (brandRes.rows.length > 0) {
                targetBrandId = brandRes.rows[0].brand_id;
            } else {
                // Create brand for tenant
                // We assume there's an org related to the tenant
                const orgRes = await query(`
                    INSERT INTO smm.org (tenant_id, org_code, org_name) 
                    VALUES ($1, $2, $3) 
                    ON CONFLICT(tenant_id) DO UPDATE SET org_name = EXCLUDED.org_name
                    RETURNING org_id
                 `, [tenantId, `TENANT_${tenantId}`, `Organization ${tenantId}`]);
                const orgId = orgRes.rows[0].org_id;

                const newBrand = await query(`
                    INSERT INTO smm.brand (org_id, tenant_id, brand_code, brand_name) 
                    VALUES ($1, $2, $3, $4) 
                    RETURNING brand_id
                 `, [orgId, tenantId, 'DEFAULT', 'Default Brand']);
                targetBrandId = newBrand.rows[0].brand_id;
            }
        }

        const result = await query(`
            INSERT INTO smm.campaign 
            (brand_id, campaign_code, campaign_name, objective_lookup_id, start_date, end_date, status_lookup_id)
            VALUES ($1, $2, $3, $4, $5, $6, 
                (SELECT lookup_value_id FROM smm.md_lookup_value WHERE value_code = 'ACTIVE' LIMIT 1)
            )
            RETURNING *
        `, [targetBrandId, campaignCode, name, objective, start_date, end_date]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating campaign:', err);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

// ==========================================
// 2. POSTS
// ==========================================

// GET /api/v1/smm/posts
router.get('/posts', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(`
            SELECT p.*, pv.content_json, c.campaign_name
            FROM smm.post p
            JOIN smm.campaign c ON p.campaign_id = c.campaign_id
            JOIN smm.brand b ON c.brand_id = b.brand_id
            LEFT JOIN smm.post_version pv ON p.post_id = pv.post_id
            WHERE b.tenant_id = $1
            AND (pv.version_no IS NULL OR pv.version_no = (
                SELECT MAX(version_no) FROM smm.post_version WHERE post_id = p.post_id
            ))
            ORDER BY p.updated_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// ==========================================
// 3. LOOKUPS (Public-ish config data, tenant-agnostic or shared? 
// Usually global, so we keep as is but authenticated)
// ==========================================

router.get('/lookups/:code', authenticate, async (req, res) => {
    const { code } = req.params;
    try {
        const result = await query(`
            SELECT v.* 
            FROM smm.md_lookup_value v
            JOIN smm.md_lookup_master m ON v.lookup_master_id = m.lookup_master_id
            WHERE m.lookup_code = $1 AND v.is_active = true
            ORDER BY v.sort_order
        `, [code]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch options' });
    }
});

module.exports = router;
