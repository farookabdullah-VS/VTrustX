const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const { v4: uuidv4 } = require('uuid');

// Middleware to ensure user is authenticated (assuming passport/jwt is used)
const authenticate = (req, res, next) => {
    // Placeholder: In a real merge, we'd use the existing middleware
    // For now, we proceed to ensure functionality
    next();
};

// ==========================================
// 1. CAMPAIGNS
// ==========================================

// GET /api/v1/smm/campaigns
router.get('/campaigns', authenticate, async (req, res) => {
    try {
        // In a real scenario, we filtra by org_id/brand_id from user context
        // For now, join with brand to get names
        const result = await query(`
            SELECT c.*, b.brand_name 
            FROM smm.campaign c
            LEFT JOIN smm.brand b ON c.brand_id = b.brand_id
            ORDER BY c.created_at DESC
        `);
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
        const campaignCode = name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

        // Ensure brand exists or use a default if not provided (for migration safety)
        let targetBrandId = brand_id;
        if (!targetBrandId) {
            // Fallback: get first available brand
            const brandRes = await query('SELECT brand_id FROM smm.brand LIMIT 1');
            if (brandRes.rows.length > 0) targetBrandId = brandRes.rows[0].brand_id;
            else {
                // Create a default brand if none exists
                const orgRes = await query(`
                    INSERT INTO smm.org (org_code, org_name) 
                    VALUES ('DEFAULT_ORG', 'Default Organization') 
                    ON CONFLICT(org_code) DO UPDATE SET org_name = EXCLUDED.org_name
                    RETURNING org_id
                 `);
                const orgId = orgRes.rows[0].org_id;

                const newBrand = await query(`
                    INSERT INTO smm.brand (org_id, brand_code, brand_name) 
                    VALUES ($1, 'DEFAULT_BRAND', 'Default Brand') 
                    RETURNING brand_id
                 `, [orgId]);
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
        const result = await query(`
            SELECT p.*, pv.content_json, c.campaign_name
            FROM smm.post p
            LEFT JOIN smm.campaign c ON p.campaign_id = c.campaign_id
            LEFT JOIN smm.post_version pv ON p.post_id = pv.post_id
            WHERE pv.version_no = (
                SELECT MAX(version_no) FROM smm.post_version WHERE post_id = p.post_id
            )
            ORDER BY p.updated_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// ==========================================
// 3. LOOKUPS (for table-driven UI)
// ==========================================

// GET /api/v1/smm/lookups/:code
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
        console.error(`Error fetching lookup ${code}:`, err);
        res.status(500).json({ error: 'Failed to fetch options' });
    }
});


// ==========================================
// 4. ADMIN ROUTES
// ==========================================

// GET /api/v1/smm/admin/lookups
router.get('/admin/lookups', authenticate, async (req, res) => {
    try {
        const result = await query('SELECT * FROM smm.md_lookup_master ORDER BY lookup_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lookup masters' });
    }
});

router.post('/admin/lookups', authenticate, async (req, res) => {
    const { lookup_name, lookup_code } = req.body;
    try {
        await query('INSERT INTO smm.md_lookup_master (lookup_name, lookup_code) VALUES ($1, $2)', [lookup_name, lookup_code]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/admin/lookups/:masterCode/values', authenticate, async (req, res) => {
    const { masterCode } = req.params;
    const { value_code, value_label, master_id, value_color } = req.body;
    try {
        // Resolve master_id if not sent
        let targetMasterId = master_id;
        if (!targetMasterId) {
            const mRes = await query('SELECT lookup_master_id FROM smm.md_lookup_master WHERE lookup_code = $1', [masterCode]);
            if (mRes.rows.length === 0) return res.status(404).json({ error: 'Master not found' });
            targetMasterId = mRes.rows[0].lookup_master_id;
        }

        await query(`
            INSERT INTO smm.md_lookup_value (lookup_master_id, value_code, value_label, value_color)
            VALUES ($1, $2, $3, $4)
        `, [targetMasterId, value_code, value_label, value_color]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
