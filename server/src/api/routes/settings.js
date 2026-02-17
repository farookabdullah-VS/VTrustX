const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const nodemailer = require('nodemailer');
const authenticate = require('../middleware/auth');
const { encrypt, decrypt } = require('../../infrastructure/security/encryption');
const logger = require('../../infrastructure/logger');
const validate = require('../middleware/validate');
const { createChannelSchema, updateThemeSchema, slaSchema } = require('../schemas/settings.schemas');

// EMAIL CHANNELS ROUTES

/**
 * @swagger
 * /api/settings/channels:
 *   get:
 *     tags: [Settings]
 *     summary: List email channels
 *     description: Returns all email channels for the authenticated user's tenant. Passwords are excluded from the response.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of email channels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   host:
 *                     type: string
 *                   port:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   is_secure:
 *                     type: boolean
 *                   is_active:
 *                     type: boolean
 *                   last_sync_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/channels', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // Exclude password from select
        const result = await query("SELECT id, name, email, host, port, username, is_secure, is_active, last_sync_at FROM email_channels WHERE tenant_id = $1 ORDER BY created_at", [tenantId]);
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch email channels', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch email channels' });
    }
});

/**
 * @swagger
 * /api/settings/channels:
 *   post:
 *     tags: [Settings]
 *     summary: Create channel
 *     description: Creates a new email channel for the tenant. The channel password is encrypted at rest.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               smtp_host:
 *                 type: string
 *               smtp_port:
 *                 type: integer
 *               smtp_user:
 *                 type: string
 *               smtp_pass:
 *                 type: string
 *                 format: password
 *               imap_host:
 *                 type: string
 *               imap_port:
 *                 type: integer
 *               imap_user:
 *                 type: string
 *               imap_pass:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Channel added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/channels', authenticate, validate(createChannelSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, email, host, port, username, password, is_secure } = req.body;

        await query(`
            INSERT INTO email_channels (tenant_id, name, email, host, port, username, password, is_secure)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [tenantId, name, email, host, port, username, encrypt(password), is_secure === undefined ? true : is_secure]);

        res.json({ message: 'Channel added' });
    } catch (e) {
        logger.error('Failed to add email channel', { error: e.message });
        res.status(500).json({ error: 'Failed to add email channel' });
    }
});

/**
 * @swagger
 * /api/settings/channels/{id}:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete channel
 *     description: Deletes an email channel by ID for the authenticated user's tenant.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel deleted
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/channels/:id', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM email_channels WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id]);
        res.json({ message: 'Channel deleted' });
    } catch (e) {
        logger.error('Failed to delete email channel', { error: e.message });
        res.status(500).json({ error: 'Failed to delete email channel' });
    }
});

// SLA ROUTES

/**
 * @swagger
 * /api/settings/sla:
 *   get:
 *     tags: [Settings]
 *     summary: Get SLA rules
 *     description: Returns all SLA policies for the tenant, ordered by priority.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of SLA policies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tenant_id:
 *                     type: integer
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high, urgent]
 *                   response_time_minutes:
 *                     type: integer
 *                   resolution_time_minutes:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sla', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query("SELECT * FROM sla_policies WHERE tenant_id = $1 ORDER BY priority", [tenantId]);
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch SLA policies', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch SLA policies' });
    }
});

/**
 * @swagger
 * /api/settings/sla:
 *   post:
 *     tags: [Settings]
 *     summary: Set SLA rules
 *     description: Creates or updates SLA policies for the tenant. Accepts an array of SLA policy objects. Uses upsert on (tenant_id, priority).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [priority, response_time_minutes, resolution_time_minutes]
 *               properties:
 *                 priority:
 *                   type: string
 *                   enum: [low, medium, high, urgent]
 *                 response_time_minutes:
 *                   type: integer
 *                   minimum: 1
 *                 resolution_time_minutes:
 *                   type: integer
 *                   minimum: 1
 *     responses:
 *       200:
 *         description: SLA policies saved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/sla', authenticate, validate(slaSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const policies = req.body; // Array of objects

        for (const p of policies) {
            await query(`
                INSERT INTO sla_policies (tenant_id, priority, response_time_minutes, resolution_time_minutes, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (tenant_id, priority)
                DO UPDATE SET response_time_minutes = $3, resolution_time_minutes = $4, updated_at = NOW()
            `, [tenantId, p.priority, p.response_time_minutes, p.resolution_time_minutes]);
        }
        res.json({ success: true });
    } catch (e) {
        logger.error('Failed to save SLA policies', { error: e.message });
        res.status(500).json({ error: 'Failed to save SLA policies' });
    }
});

// EMAIL TEMPLATES ROUTES

/**
 * @swagger
 * /api/settings/email-templates:
 *   get:
 *     tags: [Settings]
 *     summary: List email templates
 *     description: Returns all email templates ordered by ID.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of email templates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   subject_template:
 *                     type: string
 *                   body_html:
 *                     type: string
 *                   body_text:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/email-templates', authenticate, async (req, res) => {
    try {
        const result = await query("SELECT * FROM email_templates ORDER BY id");
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch email templates', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch email templates' });
    }
});

/**
 * @swagger
 * /api/settings/email-templates/{id}:
 *   put:
 *     tags: [Settings]
 *     summary: Update email template
 *     description: Updates the subject, HTML body, and text body of an email template by ID.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject_template:
 *                 type: string
 *               body_html:
 *                 type: string
 *               body_text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template updated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/email-templates/:id', authenticate, async (req, res) => {
    try {
        const { subject_template, body_html, body_text } = req.body;
        // Keep it simple, just update the content fields
        await query(
            "UPDATE email_templates SET subject_template = $1, body_html = $2, body_text = $3, updated_at = NOW() WHERE id = $4",
            [subject_template, body_html, body_text, req.params.id]
        );
    } catch (e) {
        logger.error('Failed to update email template', { error: e.message });
        res.status(500).json({ error: 'Failed to update email template' });
    }
});

// GET Theme

/**
 * @swagger
 * /api/settings/theme:
 *   get:
 *     tags: [Settings]
 *     summary: Get theme
 *     description: Returns the current theme configuration for the authenticated user's tenant.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Theme configuration object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 primaryColor:
 *                   type: string
 *                 secondaryColor:
 *                   type: string
 *                 logoUrl:
 *                   type: string
 *                 fontFamily:
 *                   type: string
 *                 borderRadius:
 *                   type: string
 *                 customCss:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/theme', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query("SELECT theme FROM tenants WHERE id = $1", [tenantId]);
        if (result.rows.length === 0) return res.json({});
        res.json(result.rows[0].theme || {});
    } catch (e) {
        logger.error('Failed to fetch theme', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch theme' });
    }
});

// UPDATE Theme

/**
 * @swagger
 * /api/settings/theme:
 *   post:
 *     tags: [Settings]
 *     summary: Update theme
 *     description: Updates the theme configuration for the authenticated user's tenant. At least one field must be provided.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               primaryColor:
 *                 type: string
 *                 maxLength: 50
 *               secondaryColor:
 *                 type: string
 *                 maxLength: 50
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               fontFamily:
 *                 type: string
 *                 maxLength: 100
 *               borderRadius:
 *                 type: string
 *                 maxLength: 50
 *               customCss:
 *                 type: string
 *                 maxLength: 10000
 *     responses:
 *       200:
 *         description: Theme updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/theme', authenticate, validate(updateThemeSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        let theme = req.body;

        logger.info('Updating theme', { tenant_id: tenantId, keys: Object.keys(theme) });

        // Ensure theme is a valid object
        if (typeof theme !== 'object') {
            theme = {};
        }

        // Convert to string if the column is TEXT, or keep object if JSONB.
        // Usually node-postgres handles JSON on JSONB columns automatically.
        // If the 'theme' column is TEXT/VARCHAR, we must stringify.
        // Assuming JSONB based on usage, but let's log.

        await query("UPDATE tenants SET theme = $1 WHERE id = $2", [theme, tenantId]);
        res.json({ success: true });
    } catch (e) {
        logger.error('Failed to update theme', { error: e.message });
        res.status(500).json({ error: 'Failed to update theme' });
    }
});

// GET settings

/**
 * @swagger
 * /api/settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get settings
 *     description: Returns all settings as key-value pairs, including masked database configuration from environment variables.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Settings object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await query('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        // Inject Database Config (from process.env)
        // We do typically NOT want to expose real credentials, but for an Admin Settings page
        // as requested by the user, we will show them (masking password).
        settings.db_host = process.env.DB_HOST || '';
        settings.db_port = process.env.DB_PORT || '5432';
        settings.db_user = process.env.DB_USER || '';
        settings.db_name = process.env.DB_NAME || '';
        // Do NOT send the actual password for security, unless empty.
        // We will send a placeholder if it's set.
        settings.db_password = process.env.DB_PASSWORD ? '********' : '';

        res.json(settings);
    } catch (error) {
        logger.error('Failed to fetch settings', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// UPDATE settings (Batch)

/**
 * @swagger
 * /api/settings:
 *   post:
 *     tags: [Settings]
 *     summary: Update settings
 *     description: Batch upserts settings key-value pairs. Also handles database configuration updates to the .env file in non-Cloud Run environments.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: string
 *     responses:
 *       200:
 *         description: Settings saved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const settings = req.body;
        const dbKeys = ['db_host', 'db_port', 'db_user', 'db_password', 'db_name'];
        const fs = require('fs');
        const path = require('path');

        // Upsert standard settings
        for (const [key, value] of Object.entries(settings)) {
            if (dbKeys.includes(key)) continue; // Skip DB keys from SQL table

            await query(`
                INSERT INTO settings (key, value, updated_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) 
                DO UPDATE SET value = $2, updated_at = NOW();
            `, [key, value]);
        }

        // Handle DB Settings Update (Write to .env if running locally)
        // Note: checking for cloud run environment via K_SERVICE or similar
        const isCloudRun = !!process.env.K_SERVICE;

        if (!isCloudRun) {
            // Logic to update .env file
            const envPath = path.resolve(__dirname, '../../../../.env');
            if (fs.existsSync(envPath)) {
                let envContent = fs.readFileSync(envPath, 'utf8');
                const updateEnvVar = (key, val) => {
                    const regex = new RegExp(`^${key}=.*`, 'm');
                    const newLine = `${key}="${val}"`; // Quote values for safety
                    if (regex.test(envContent)) {
                        envContent = envContent.replace(regex, newLine);
                    } else {
                        envContent += `\n${newLine}`;
                    }
                };

                // Only update if provided and not masked
                if (settings.db_host) updateEnvVar('DB_HOST', settings.db_host);
                if (settings.db_port) updateEnvVar('DB_PORT', settings.db_port);
                if (settings.db_user) updateEnvVar('DB_USER', settings.db_user);
                if (settings.db_name) updateEnvVar('DB_NAME', settings.db_name);
                if (settings.db_password && settings.db_password !== '********') {
                    updateEnvVar('DB_PASSWORD', settings.db_password);
                }

                fs.writeFileSync(envPath, envContent);
                logger.info('Updated .env file with new DB config');
            }
        } else {
            logger.warn('Attempt to update DB config in Cloud Run ignored (immutable env)');
            // Ideally we would trigger a revision update here via Google Cloud API, 
            // but that requires high permissions not available to the default service account usually.
        }

        res.json({ message: 'Settings saved. Database changes (if any) may require a restart.' });
    } catch (error) {
        logger.error('Failed to update settings', { error: error.message });
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// TEST EMAIL

/**
 * @swagger
 * /api/settings/test-email:
 *   post:
 *     tags: [Settings]
 *     summary: Send test email
 *     description: Verifies SMTP configuration by sending a test email using the provided credentials.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [host, port, user, pass, from, to]
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               user:
 *                 type: string
 *               pass:
 *                 type: string
 *                 format: password
 *               from:
 *                 type: string
 *                 format: email
 *               to:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: SMTP configuration error
 *       401:
 *         description: Unauthorized
 */
router.post('/test-email', authenticate, async (req, res) => {
    try {
        const { host, port, user, pass, from, to } = req.body;

        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: port == 465, // true for 465, false for other ports usually
            auth: {
                user,
                pass
            }
        });

        await transporter.verify();
        await transporter.sendMail({
            from,
            to,
            subject: 'RayiX SMTP Test',
            text: 'If you are reading this, your SMTP configuration is working!'
        });

        res.json({ success: true, message: 'Test email sent successfully!' });
    } catch (error) {
        logger.error('SMTP test failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// Helper: resolve plan limits dynamically
async function getPlanFeatures(tenant) {
    const defaults = { max_users: 2, max_forms: 5, max_submissions: 500, max_ai_calls: 100, voice_agent: false, custom_branding: false, api_access: false, priority_support: false };
    if (tenant.plan_id) {
        const planRes = await query('SELECT features, name FROM plans WHERE id = $1', [tenant.plan_id]);
        if (planRes.rows.length > 0 && planRes.rows[0].features) {
            return { ...defaults, ...planRes.rows[0].features, plan_name: planRes.rows[0].name };
        }
    }
    // Fallback to legacy plan name
    const legacyLimits = {
        free: { max_users: 2, max_forms: 5, max_submissions: 500 },
        starter: { max_users: 3, max_forms: 10, max_submissions: 1000 },
        pro: { max_users: 10, max_forms: 50, max_submissions: 5000, voice_agent: true },
        business: { max_users: 25, max_forms: 100, max_submissions: 25000, voice_agent: true, custom_branding: true },
        enterprise: { max_users: 100, max_forms: 999, max_submissions: 999999, voice_agent: true, custom_branding: true, api_access: true, priority_support: true }
    };
    return { ...defaults, ...(legacyLimits[tenant.plan] || {}) };
}

// GET Subscription Info

/**
 * @swagger
 * /api/settings/subscription:
 *   get:
 *     tags: [Settings]
 *     summary: Get subscription
 *     description: Returns subscription info including plan, features, usage, and active subscription details. Auto-creates a default tenant for orphan users.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Subscription information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: string
 *                 plan_id:
 *                   type: integer
 *                 status:
 *                   type: string
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *                 features:
 *                   type: object
 *                 subscription:
 *                   type: object
 *                 usage:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                     forms:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tenant creation failed
 *       500:
 *         description: Server error
 */
router.get('/subscription', authenticate, async (req, res) => {
    try {
        let tenant = req.tenant;

        // Auto-fix: Create default tenant for orphan user
        if (!tenant) {
            const userRes = await query("SELECT tenant_id, username FROM users WHERE id = $1", [req.user.id]);
            const dbUser = userRes.rows[0];

            if (dbUser && dbUser.tenant_id) {
                const tRes = await query("SELECT * FROM tenants WHERE id = $1", [dbUser.tenant_id]);
                tenant = tRes.rows[0];
            } else {
                const newTenantName = (req.user.username || 'User') + "'s Organization";
                const tRes = await query("INSERT INTO tenants (name, plan, subscription_status, created_at, updated_at) VALUES ($1, 'free', 'active', NOW(), NOW()) RETURNING *", [newTenantName]);
                const newTenant = tRes.rows[0];
                await query("UPDATE users SET tenant_id = $1 WHERE id = $2", [newTenant.id, req.user.id]);
                tenant = newTenant;
            }
            req.tenant = tenant;
        }

        if (!tenant) return res.status(404).json({ error: 'Tenant creation failed' });

        const features = await getPlanFeatures(tenant);

        // Calculate Usage
        const userCountRes = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenant.id]);
        const formCountRes = await query('SELECT COUNT(*) FROM forms WHERE tenant_id = $1', [tenant.id]);
        const userCount = parseInt(userCountRes.rows[0].count);
        const formCount = parseInt(formCountRes.rows[0].count);

        // Get active subscription if any
        let subscription = null;
        const subRes = await query(`
            SELECT s.*, p.name as plan_name, p.interval as billing_interval, p.base_price
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.tenant_id = $1 AND s.status = 'ACTIVE'
            ORDER BY s.created_at DESC LIMIT 1
        `, [tenant.id]);
        if (subRes.rows.length > 0) subscription = subRes.rows[0];

        res.json({
            plan: features.plan_name || tenant.plan,
            plan_id: tenant.plan_id,
            status: tenant.subscription_status,
            expires_at: tenant.subscription_expires_at,
            features,
            subscription,
            usage: {
                users: { current: userCount, limit: features.max_users },
                forms: { current: formCount, limit: features.max_forms }
            },
            // Keep backward compatible
            users: { current: userCount, limit: features.max_users }
        });
    } catch (e) {
        logger.error('Failed to fetch subscription info', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch subscription info' });
    }
});

/**
 * @swagger
 * /api/settings/subscription/upgrade:
 *   post:
 *     tags: [Settings]
 *     summary: Upgrade subscription
 *     description: Upgrades the tenant's plan. Requires billing update permission. In production, a payment token is required.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *               payment_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan upgraded
 *       400:
 *         description: No tenant found
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Payment required (production only)
 *       500:
 *         description: Server error
 */
router.post('/subscription/upgrade', authenticate, authenticate.checkPermission('billing', 'update'), async (req, res) => {
    try {
        const { plan, payment_token } = req.body;

        if (process.env.NODE_ENV === 'production' && !payment_token) {
            return res.status(402).json({ error: 'Payment verification required' });
        }

        let tenant = req.tenant;
        if (!tenant) {
            const userRes = await query("SELECT tenant_id FROM users WHERE id = $1", [req.user.id]);
            if (userRes.rows.length && userRes.rows[0].tenant_id) {
                tenant = { id: userRes.rows[0].tenant_id };
            }
        }

        if (!tenant) return res.status(400).json({ error: 'No tenant found for user' });

        await query("UPDATE tenants SET plan = $1 WHERE id = $2", [plan, tenant.id]);

        // Audit Log
        /*
        await query(`INSERT INTO audit_logs (entity_type, entity_id, action, details, actor_id, created_at) 
            VALUES ('tenant', $1, 'upgrade_plan', $2, $3, NOW())`,
            [tenant.id, JSON.stringify({ plan }), req.user.id]
        );
        */

        res.json({ success: true, message: `Upgraded to ${plan}` });
    } catch (e) {
        logger.error('Failed to upgrade subscription', { error: e.message });
        res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
});



const jwt = require('jsonwebtoken');

// ACTIVATE License

/**
 * @swagger
 * /api/settings/subscription/license:
 *   post:
 *     tags: [Settings]
 *     summary: Set license
 *     description: Activates a license key for the tenant. The license key is a signed JWT containing plan details, optional tenant binding, and expiration.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [licenseKey]
 *             properties:
 *               licenseKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: License activated
 *       400:
 *         description: Invalid or missing license key
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: License does not belong to this organization
 *       500:
 *         description: Server error
 */
router.post('/subscription/license', authenticate, async (req, res) => {
    try {
        const { licenseKey } = req.body;
        const tenantId = req.user.tenant_id;

        if (!licenseKey) return res.status(400).json({ error: 'License key required' });

        const secret = process.env.LICENSE_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            if (process.env.NODE_ENV === 'production') throw new Error('LICENSE_SECRET not defined');
            logger.warn('Using insecure fallback for LICENSE_SECRET');
        }
        if (!secret) {
            return res.status(500).json({ error: 'License verification not configured. Set LICENSE_SECRET or JWT_SECRET.' });
        }
        const finalSecret = secret;

        let payload;
        try {
            payload = jwt.verify(licenseKey, finalSecret);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid or corrupted license key' });
        }

        // Validate Tenant Match
        if (payload.tenantId && payload.tenantId != tenantId) {
            return res.status(403).json({ error: 'License key does not belong to this organization' });
        }

        const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

        await query(
            'UPDATE tenants SET plan = $1, subscription_expires_at = $2, subscription_status = $3 WHERE id = $4',
            [payload.plan, expiresAt, 'active', tenantId]
        );

        res.json({ success: true, message: 'License activated successfully!' });

    } catch (e) {
        logger.error('Failed to activate license', { error: e.message });
        res.status(500).json({ error: 'Failed to activate license' });
    }
});

// ASSIGNMENT RULES ROUTES

/**
 * @swagger
 * /api/settings/assignment-rules:
 *   get:
 *     tags: [Settings]
 *     summary: List assignment rules
 *     description: Returns all assignment rules for the tenant, ordered by creation date descending.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of assignment rules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tenant_id:
 *                     type: integer
 *                   keyword:
 *                     type: string
 *                   assigned_user_id:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/assignment-rules', authenticate, async (req, res) => {
    try {
        const result = await query("SELECT * FROM assignment_rules WHERE tenant_id = $1 ORDER BY created_at DESC", [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch assignment rules', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch assignment rules' });
    }
});

/**
 * @swagger
 * /api/settings/assignment-rules:
 *   post:
 *     tags: [Settings]
 *     summary: Create assignment rule
 *     description: Creates a new keyword-based assignment rule that maps submissions containing a keyword to a specific user.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keyword, assigned_user_id]
 *             properties:
 *               keyword:
 *                 type: string
 *               assigned_user_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Assignment rule created
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/assignment-rules', authenticate, async (req, res) => {
    try {
        const { keyword, assigned_user_id } = req.body;
        await query(
            "INSERT INTO assignment_rules (tenant_id, keyword, assigned_user_id) VALUES ($1, $2, $3)",
            [req.user.tenant_id, keyword.toLowerCase(), assigned_user_id]
        );
        res.json({ success: true });
    } catch (e) {
        logger.error('Failed to create assignment rule', { error: e.message });
        res.status(500).json({ error: 'Failed to create assignment rule' });
    }
});

/**
 * @swagger
 * /api/settings/assignment-rules/{id}:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete assignment rule
 *     description: Deletes an assignment rule by ID for the authenticated user's tenant.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment rule ID
 *     responses:
 *       200:
 *         description: Assignment rule deleted
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/assignment-rules/:id', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM assignment_rules WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id]);
        res.json({ success: true });
    } catch (e) {
        logger.error('Failed to delete assignment rule', { error: e.message });
        res.status(500).json({ error: 'Failed to delete assignment rule' });
    }
});

// --- SAVED THEMES ROUTES ---

// GET Saved Themes

/**
 * @swagger
 * /api/settings/theme/saved:
 *   get:
 *     tags: [Settings]
 *     summary: List saved themes
 *     description: Returns all saved theme presets for the tenant, ordered by creation date descending.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of saved themes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tenant_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   config:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/theme/saved', authenticate, async (req, res) => {
    try {
        const result = await query("SELECT * FROM themes WHERE tenant_id = $1 ORDER BY created_at DESC", [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch saved themes', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch saved themes' });
    }
});

// SAVE New Theme

/**
 * @swagger
 * /api/settings/theme/saved:
 *   post:
 *     tags: [Settings]
 *     summary: Save a theme
 *     description: Saves a new theme preset with a name and configuration object for the tenant.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, config]
 *             properties:
 *               name:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Theme saved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/theme/saved', authenticate, async (req, res) => {
    try {
        const { name, config } = req.body;
        await query("INSERT INTO themes (tenant_id, name, config) VALUES ($1, $2, $3)", [req.user.tenant_id, name, config]);
        res.json({ success: true });
    } catch (e) {
        logger.error('Failed to save theme', { error: e.message });
        res.status(500).json({ error: 'Failed to save theme' });
    }
});

// DELETE Theme

/**
 * @swagger
 * /api/settings/theme/saved/{id}:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete saved theme
 *     description: Deletes a saved theme preset by ID for the authenticated user's tenant.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Saved theme ID
 *     responses:
 *       200:
 *         description: Saved theme deleted
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/theme/saved/:id', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM themes WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id]);
        res.json({ success: true });
    } catch (e) {
        logger.error('Failed to delete saved theme', { error: e.message });
        res.status(500).json({ error: 'Failed to delete saved theme' });
    }
});

// FIGMA THEME IMPORT

const FigmaThemeImporter = require('../../services/FigmaThemeImporter');

/**
 * @swagger
 * /api/settings/theme/import/figma:
 *   post:
 *     tags: [Settings]
 *     summary: Import theme from Figma
 *     description: Imports design tokens (colors, typography, spacing) from a Figma file and transforms them into application theme format.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - figmaFileUrl
 *               - figmaAccessToken
 *             properties:
 *               figmaFileUrl:
 *                 type: string
 *                 description: Figma file URL (e.g., https://www.figma.com/file/ABC123/MyDesign)
 *               figmaAccessToken:
 *                 type: string
 *                 description: Figma Personal Access Token (from Figma Account Settings)
 *               applyImmediately:
 *                 type: boolean
 *                 default: false
 *                 description: Apply imported theme immediately to tenant
 *               saveAsPreset:
 *                 type: boolean
 *                 default: true
 *                 description: Save imported theme as a preset
 *               presetName:
 *                 type: string
 *                 description: Name for saved preset (auto-generated if not provided)
 *     responses:
 *       200:
 *         description: Theme imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 theme:
 *                   type: object
 *                   description: Imported theme object
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     lastModified:
 *                       type: string
 *                     version:
 *                       type: string
 *                     importedAt:
 *                       type: string
 *                 applied:
 *                   type: boolean
 *                   description: Whether theme was applied to tenant
 *                 saved:
 *                   type: boolean
 *                   description: Whether theme was saved as preset
 *       400:
 *         description: Invalid Figma URL or missing access token
 *       401:
 *         description: Unauthorized or invalid Figma access token
 *       500:
 *         description: Server error
 */
router.post('/theme/import/figma', authenticate, async (req, res) => {
    try {
        const { figmaFileUrl, figmaAccessToken, applyImmediately, saveAsPreset, presetName } = req.body;
        const tenantId = req.user.tenant_id;

        // Validate input
        if (!figmaFileUrl || !figmaAccessToken) {
            return res.status(400).json({
                error: 'Missing required fields: figmaFileUrl and figmaAccessToken'
            });
        }

        // Extract file key from URL
        const fileKey = FigmaThemeImporter.extractFileKeyFromUrl(figmaFileUrl);
        if (!fileKey) {
            return res.status(400).json({
                error: 'Invalid Figma URL. Expected format: https://www.figma.com/file/{fileKey}/{fileName}'
            });
        }

        logger.info('[FigmaImport] Starting import', {
            tenantId,
            fileKey,
            applyImmediately,
            saveAsPreset
        });

        // Validate Figma token
        const tokenValidation = await FigmaThemeImporter.validateToken(figmaAccessToken);
        if (!tokenValidation.valid) {
            return res.status(401).json({
                error: 'Invalid Figma access token',
                details: tokenValidation.error
            });
        }

        // Import theme from Figma
        const importer = new FigmaThemeImporter(figmaAccessToken);
        const importResult = await importer.importTheme(fileKey);

        if (!importResult.success) {
            return res.status(500).json({
                error: 'Failed to import theme from Figma',
                details: importResult.error
            });
        }

        const response = {
            success: true,
            theme: importResult.theme,
            metadata: importResult.metadata,
            applied: false,
            saved: false
        };

        // Apply theme immediately if requested
        if (applyImmediately) {
            await query(
                "UPDATE tenants SET theme = $1 WHERE id = $2",
                [importResult.theme, tenantId]
            );
            response.applied = true;
            logger.info('[FigmaImport] Theme applied to tenant', { tenantId });
        }

        // Save as preset if requested
        if (saveAsPreset !== false) {
            const themeName = presetName || `Figma Import - ${importResult.metadata.fileName}`;
            await query(
                "INSERT INTO themes (tenant_id, name, config) VALUES ($1, $2, $3)",
                [tenantId, themeName, importResult.theme]
            );
            response.saved = true;
            response.presetName = themeName;
            logger.info('[FigmaImport] Theme saved as preset', { tenantId, themeName });
        }

        logger.info('[FigmaImport] Import completed', {
            tenantId,
            applied: response.applied,
            saved: response.saved
        });

        res.json(response);

    } catch (error) {
        logger.error('[FigmaImport] Import failed', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Failed to import theme from Figma',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/settings/theme/import/figma/validate:
 *   post:
 *     tags: [Settings]
 *     summary: Validate Figma access token
 *     description: Validates a Figma Personal Access Token before importing.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - figmaAccessToken
 *             properties:
 *               figmaAccessToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   description: Figma user info (if valid)
 *       400:
 *         description: Missing access token
 */
router.post('/theme/import/figma/validate', authenticate, async (req, res) => {
    try {
        const { figmaAccessToken } = req.body;

        if (!figmaAccessToken) {
            return res.status(400).json({ error: 'Missing figmaAccessToken' });
        }

        const validation = await FigmaThemeImporter.validateToken(figmaAccessToken);
        res.json(validation);

    } catch (error) {
        logger.error('[FigmaImport] Token validation failed', { error: error.message });
        res.status(500).json({ error: 'Failed to validate token' });
    }
});

module.exports = router;
