const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth'); // Admin Logic
const logger = require('../../infrastructure/logger');

// Helper: Audit Logging
async function logAudit(profileId, action, details, changedBy, reason) {
    try {
        await query(
            `INSERT INTO cx_audit_logs (profile_id, action, details, changed_by, reason, timestamp)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [profileId, action, JSON.stringify(details), changedBy, reason]
        );
    } catch (e) {
        logger.error('Audit log error', { error: e.message });
    }
}

// --- FORM 1: PERSONA ASSIGNMENT (M2M / API) ---

/**
 * @swagger
 * /v1/persona/profiles/{profileId}/assign-personas:
 *   post:
 *     summary: Assign personas to profile
 *     description: Evaluates persona rules against provided profile data and assigns matching personas. Uses a transaction to ensure all persona assignments are atomic.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: The profile ID to assign personas to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data, consent]
 *             properties:
 *               data:
 *                 type: object
 *                 required: [nationality, age, income]
 *                 properties:
 *                   nationality:
 *                     type: string
 *                   age:
 *                     type: integer
 *                   income:
 *                     type: number
 *                   gender:
 *                     type: string
 *               consent:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Personas assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 profileId:
 *                   type: string
 *                 assignedPersonas:
 *                   type: array
 *                   items:
 *                     type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing required fields or consent is false
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

        // 3. Save Assignment (wrapped in transaction for atomicity)
        await transaction(async (client) => {
            for (const pid of assignedPersonas) {
                await client.query(`
                    INSERT INTO cx_profile_personas (profile_id, persona_id, assigned_at, method, score)
                    VALUES ($1, $2, NOW(), 'auto', 1.0)
                    ON CONFLICT (profile_id, persona_id)
                    DO UPDATE SET assigned_at = NOW(), method='auto'
                `, [profileId, pid]);
            }
        });

        // 4. Audit Log
        await logAudit(profileId, 'ASSIGNED', { assigned: assignedPersonas, input: data }, 'SYSTEM', 'API Evaluation');

        res.json({
            success: true,
            profileId,
            assignedPersonas,
            timestamp: new Date()
        });
    } catch (e) {
        logger.error('Failed to assign personas', { error: e.message });
        res.status(500).json({ error: 'Failed to assign personas' });
    }
});


// --- FORM 2: ADMIN CONFIGURATION UI ---

/**
 * @swagger
 * /v1/persona/configuration:
 *   get:
 *     summary: Get persona configuration
 *     description: Returns all persona engine configuration including parameters, lists, and maps used by the rule engine.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Persona configuration data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parameters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       value:
 *                         type: string
 *                       data_type:
 *                         type: string
 *                 lists:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       values:
 *                         type: array
 *                         items:
 *                           type: string
 *                 maps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       map_key:
 *                         type: string
 *                       lookup_key:
 *                         type: string
 *                       value:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to fetch persona configuration', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch persona configuration' });
    }
});

/**
 * @swagger
 * /v1/persona/parameters:
 *   post:
 *     summary: Create parameter
 *     description: Creates or updates a persona engine parameter (upsert by key). Used to configure rule thresholds.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *               type:
 *                 type: string
 *                 default: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Parameter created or updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to update persona parameter', { error: e.message });
        res.status(500).json({ error: 'Failed to update persona parameter' });
    }
});

/**
 * @swagger
 * /v1/persona/lists:
 *   post:
 *     summary: Create list
 *     description: Creates or updates a persona engine list (upsert by key). Used to configure country/category lists for rules.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, values]
 *             properties:
 *               key:
 *                 type: string
 *               values:
 *                 type: array
 *                 items:
 *                   type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: List created or updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to update persona list', { error: e.message });
        res.status(500).json({ error: 'Failed to update persona list' });
    }
});

/**
 * @swagger
 * /v1/persona/maps:
 *   post:
 *     summary: Create map
 *     description: Creates or updates a persona engine map entry (upsert by map_key + lookup_key). Used for country-specific threshold lookups.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mapKey, lookupKey, value]
 *             properties:
 *               mapKey:
 *                 type: string
 *               lookupKey:
 *                 type: string
 *               value:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Map entry created or updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to update persona map', { error: e.message });
        res.status(500).json({ error: 'Failed to update persona map' });
    }
});


// --- FORM 3: CRM PROFILE VIEWER ---

/**
 * @swagger
 * /v1/persona/profiles/{profileId}:
 *   get:
 *     summary: Get profile personas
 *     description: Returns all persona assignments and recent audit logs for a given profile.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: The profile ID to look up
 *     responses:
 *       200:
 *         description: Profile persona data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profileId:
 *                   type: string
 *                 personas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       profile_id:
 *                         type: string
 *                       persona_id:
 *                         type: string
 *                       assigned_at:
 *                         type: string
 *                         format: date-time
 *                       method:
 *                         type: string
 *                       score:
 *                         type: number
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to fetch persona profile', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch persona profile' });
    }
});


// --- FORM 5: AUDIT LOG VIEWER ---

/**
 * @swagger
 * /v1/persona/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Returns persona engine audit logs with optional filtering by profile, action, and date range. Limited to 100 results.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: profileId
 *         schema:
 *           type: string
 *         description: Filter by profile ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type (e.g. ASSIGNED, RIGHT_TO_OBJECT)
 *       - in: query
 *         name: dateStart
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: dateEnd
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *     responses:
 *       200:
 *         description: List of audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   profile_id:
 *                     type: string
 *                   action:
 *                     type: string
 *                   details:
 *                     type: object
 *                   changed_by:
 *                     type: string
 *                   reason:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to fetch audit logs', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// --- FORM 6: RIGHT TO OBJECT ---

/**
 * @swagger
 * /v1/persona/profiles/{profileId}/personas:
 *   delete:
 *     summary: Remove personas from profile
 *     description: Removes all persona assignments for a profile (Right to Object / GDPR). Logs the removal in the audit trail.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: The profile ID to remove personas from
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for removal (defaults to "Customer Request")
 *     responses:
 *       200:
 *         description: Personas removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/profiles/:profileId/personas', authenticate, async (req, res) => {
    try {
        const { profileId } = req.params;
        const { reason } = req.body;

        await query('DELETE FROM cx_profile_personas WHERE profile_id = $1', [profileId]);

        await logAudit(profileId, 'RIGHT_TO_OBJECT', {}, req.user.username || 'User', reason || 'Customer Request');

        res.json({ success: true, message: "All persona data removed for profile." });
    } catch (e) {
        logger.error('Failed to remove persona data', { error: e.message });
        res.status(500).json({ error: 'Failed to remove persona data' });
    }
});

// --- FORM 7: HEALTH MONITORING ---

/**
 * @swagger
 * /v1/persona/health:
 *   get:
 *     summary: Health check
 *     description: Returns persona engine health status including uptime, database latency, and total profiles processed.
 *     tags: [PersonaEngine]
 *     responses:
 *       200:
 *         description: Engine is operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 dbLatency:
 *                   type: number
 *                   description: Database ping latency in milliseconds
 *                 profilesProcessed:
 *                   type: integer
 *                   description: Total persona assignments count
 *                 status:
 *                   type: string
 *                   enum: [Operational, Degraded]
 *       500:
 *         description: Health check failed (degraded status)
 */
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
        logger.error('Persona engine health check failed', { error: e.message });
        res.status(500).json({ status: 'Degraded', error: 'Health check failed' });
    }
});

// --- MARKETING INTEGRATION: Available Personas ---

/**
 * @swagger
 * /v1/persona/available-personas:
 *   get:
 *     summary: List available personas
 *     description: Returns all distinct persona IDs with the count of profiles assigned to each, ordered by popularity.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of personas with profile counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   count:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch available personas', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch available personas' });
    }
});

// --- MARKETING INTEGRATION: Audience Stats ---

/**
 * @swagger
 * /v1/persona/audience-stats:
 *   post:
 *     summary: Get audience statistics
 *     description: Returns audience statistics (total customers, average LTV, engagement rate) for the specified persona IDs.
 *     tags: [PersonaEngine]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [persona_ids]
 *             properties:
 *               persona_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of persona IDs to get stats for
 *     responses:
 *       200:
 *         description: Audience statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_customers:
 *                   type: integer
 *                 avg_ltv:
 *                   type: number
 *                 engagement_rate:
 *                   type: number
 *       400:
 *         description: persona_ids array required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch audience stats', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch audience stats' });
    }
});

module.exports = router;
