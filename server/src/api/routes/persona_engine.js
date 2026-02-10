const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth'); // Admin Logic

// Helper: Audit Logging
async function logAudit(profileId, action, details, changedBy, reason) {
    try {
        await query(
            `INSERT INTO cx_audit_logs (profile_id, action, details, changed_by, reason, timestamp)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [profileId, action, JSON.stringify(details), changedBy, reason]
        );
    } catch (e) {
        console.error("Audit Log Error:", e);
    }
}

// --- FORM 1: PERSONA ASSIGNMENT (M2M / API) ---
// POST /v1/persona/profiles/:profileId/assign-personas
router.post('/profiles/:profileId/assign-personas', authenticate, async (req, res) => {
    try {
        const { profileId } = req.params;
        const { data, consent } = req.body; // Expecting { data: {...}, consent: boolean }

        // Validation
        if (consent === false) {
            return res.status(400).json({ error: "Consent is false. Cannot assign persona." });
        }
        if (!data || !data.nationality || !data.age || !data.income) {
            return res.status(400).json({ error: "Missing required fields (nationality, age, income)." });
        }

        // Logic: Evaluate Rules (Simplified Rule Engine)
        // 1. Fetch Configs
        const paramRes = await query('SELECT key, value FROM cx_persona_parameters');
        const params = {};
        paramRes.rows.forEach(r => params[r.key] = r.value); // Convert to obj

        const listRes = await query('SELECT key, values FROM cx_persona_lists');
        const lists = {};
        listRes.rows.forEach(r => lists[r.key] = r.values);

        const mapRes = await query('SELECT map_key, lookup_key, value FROM cx_persona_maps');
        const maps = {}; // Structure: { INCOME_THRESHOLD: { SA: 12000, AE: 10000 } }
        mapRes.rows.forEach(r => {
            if (!maps[r.map_key]) maps[r.map_key] = {};
            maps[r.map_key][r.lookup_key] = r.value;
        });

        // 2. Determine Persona
        // Example Rule: Millennial National
        // IF Age >= AGE_MIN_MILL AND Age <= AGE_MAX_MILL AND Country IN COUNTRIES_NAT_MILL
        const ageMinMill = parseInt(params['AGE_MIN_MILL'] || '25');
        const ageMaxMill = parseInt(params['AGE_MAX_MILL'] || '40');
        const countriesNatMill = lists['COUNTRIES_NAT_MILL'] || [];

        let assignedPersonas = [];

        if (data.age >= ageMinMill && data.age <= ageMaxMill && countriesNatMill.includes(data.nationality)) {
            assignedPersonas.push('GCC_NAT_MILL_01');
        }

        // Example Rule: Female Leader
        if (data.gender === 'Female' && data.income > 20000) {
            assignedPersonas.push('GCC_FEMALE_LEADER_05');
        }

        // Default if none
        if (assignedPersonas.length === 0) {
            assignedPersonas.push('GCC_GENERIC_00');
        }

        // 3. Save Assignment
        for (const pid of assignedPersonas) {
            await query(`
                INSERT INTO cx_profile_personas (profile_id, persona_id, assigned_at, method, score)
                VALUES ($1, $2, NOW(), 'auto', 1.0)
                ON CONFLICT (profile_id, persona_id) 
                DO UPDATE SET assigned_at = NOW(), method='auto'
            `, [profileId, pid]);
        }

        // 4. Audit Log
        await logAudit(profileId, 'ASSIGNED', { assigned: assignedPersonas, input: data }, 'SYSTEM', 'API Evaluation');

        res.json({
            success: true,
            profileId,
            assignedPersonas,
            timestamp: new Date()
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});


// --- FORM 2: ADMIN CONFIGURATION UI ---

// GET All Config Data
router.get('/configuration', authenticate, async (req, res) => {
    try {
        const params = await query('SELECT * FROM cx_persona_parameters ORDER BY key');
        const lists = await query('SELECT * FROM cx_persona_lists ORDER BY key');
        const maps = await query('SELECT * FROM cx_persona_maps ORDER BY map_key, lookup_key');

        res.json({
            parameters: params.rows,
            lists: lists.rows,
            maps: maps.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Parameter
router.post('/parameters', authenticate, async (req, res) => {
    try {
        const { key, value, type, reason } = req.body;
        await query(`
            INSERT INTO cx_persona_parameters (key, value, data_type, last_updated)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (key) DO UPDATE SET value = $2, data_type = $3, last_updated = NOW()
        `, [key, value, type || 'string']);

        await logAudit('CONFIG', 'UPDATE_PARAM', { key, value }, req.user.username || 'Admin', reason);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update List
router.post('/lists', authenticate, async (req, res) => {
    try {
        const { key, values, reason } = req.body; // values is array
        await query(`
            INSERT INTO cx_persona_lists (key, values, last_updated)
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) DO UPDATE SET values = $2, last_updated = NOW()
        `, [key, JSON.stringify(values)]);

        await logAudit('CONFIG', 'UPDATE_LIST', { key, values }, req.user.username || 'Admin', reason);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Map
router.post('/maps', authenticate, async (req, res) => {
    try {
        const { mapKey, lookupKey, value, reason } = req.body;
        await query(`
            INSERT INTO cx_persona_maps (map_key, lookup_key, value, last_updated)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (map_key, lookup_key) DO UPDATE SET value = $3, last_updated = NOW()
        `, [mapKey, lookupKey, value]);

        await logAudit('CONFIG', 'UPDATE_MAP', { mapKey, lookupKey, value }, req.user.username || 'Admin', reason);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- FORM 3: CRM PROFILE VIEWER ---
router.get('/profiles/:profileId', authenticate, async (req, res) => {
    try {
        const { profileId } = req.params;
        // Mock profile data if not in real DB, but we fetch assignment
        const assignments = await query('SELECT * FROM cx_profile_personas WHERE profile_id = $1', [profileId]);

        // logs
        const logs = await query('SELECT * FROM cx_audit_logs WHERE profile_id = $1 ORDER BY timestamp DESC LIMIT 50', [profileId]);

        res.json({
            profileId,
            personas: assignments.rows, // Array of assigned personas
            logs: logs.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- FORM 5: AUDIT LOG VIEWER ---
router.get('/audit-logs', authenticate, async (req, res) => {
    try {
        const { profileId, action, dateStart, dateEnd } = req.query;
        let q = "SELECT * FROM cx_audit_logs WHERE 1=1";
        const params = [];
        let idx = 1;

        if (profileId) { q += ` AND profile_id = $${idx++}`; params.push(profileId); }
        if (action) { q += ` AND action = $${idx++}`; params.push(action); }
        if (dateStart) { q += ` AND timestamp >= $${idx++}`; params.push(dateStart); }
        if (dateEnd) { q += ` AND timestamp <= $${idx++}`; params.push(dateEnd); }

        q += " ORDER BY timestamp DESC LIMIT 100";

        const result = await query(q, params);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- FORM 6: RIGHT TO OBJECT ---
router.delete('/profiles/:profileId/personas', authenticate, async (req, res) => {
    try {
        const { profileId } = req.params;
        const { reason } = req.body;

        await query('DELETE FROM cx_profile_personas WHERE profile_id = $1', [profileId]);

        await logAudit(profileId, 'RIGHT_TO_OBJECT', {}, req.user.username || 'User', reason || 'Customer Request');

        res.json({ success: true, message: "All persona data removed for profile." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- FORM 7: HEALTH MONITORING ---
router.get('/health', async (req, res) => {
    // Determine status
    // Check DB
    try {
        const start = Date.now();
        await query('SELECT 1');
        const latency = Date.now() - start;

        const countRes = await query('SELECT COUNT(*) FROM cx_profile_personas');
        const count = countRes.rows[0].count;

        res.json({
            uptime: process.uptime(), // seconds
            dbLatency: latency,
            profilesProcessed: count,
            status: 'Operational'
        });
    } catch (e) {
        res.status(500).json({ status: 'Degraded', error: e.message });
    }
});

// --- MARKETING INTEGRATION: Available Personas ---
// GET /v1/persona/available-personas
router.get('/available-personas', authenticate, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                persona_id as id,
                COUNT(DISTINCT profile_id) as count
            FROM cx_profile_personas
            GROUP BY persona_id
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('[PERSONA_ENGINE] Available Personas Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- MARKETING INTEGRATION: Audience Stats ---
// POST /v1/persona/audience-stats
router.post('/audience-stats', authenticate, async (req, res) => {
    try {
        const { persona_ids } = req.body;

        if (!persona_ids || !Array.isArray(persona_ids) || persona_ids.length === 0) {
            return res.status(400).json({ error: 'persona_ids array required' });
        }

        // Get total customers matching these personas
        const statsResult = await query(`
            SELECT 
                COUNT(DISTINCT cpp.profile_id) as total_customers,
                AVG(cp.lifetime_value) as avg_ltv
            FROM cx_profile_personas cpp
            LEFT JOIN customer_profiles cp ON cpp.profile_id = cp.id
            WHERE cpp.persona_id = ANY($1)
        `, [persona_ids]);

        const stats = statsResult.rows[0] || {};

        res.json({
            total_customers: parseInt(stats.total_customers) || 0,
            avg_ltv: parseFloat(stats.avg_ltv) || 0,
            engagement_rate: 75 // Mock for now - could calculate from customer_events
        });
    } catch (err) {
        console.error('[PERSONA_ENGINE] Audience Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
