const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const nodemailer = require('nodemailer');
const authenticate = require('../middleware/auth');

// EMAIL CHANNELS ROUTES
router.get('/channels', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // Exclude password from select
        const result = await query("SELECT id, name, email, host, port, username, is_secure, is_active, last_sync_at FROM email_channels WHERE tenant_id = $1 ORDER BY created_at", [tenantId]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/channels', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, email, host, port, username, password, is_secure } = req.body;

        await query(`
            INSERT INTO email_channels (tenant_id, name, email, host, port, username, password, is_secure)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [tenantId, name, email, host, port, username, password, is_secure === undefined ? true : is_secure]);

        res.json({ message: 'Channel added' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/channels/:id', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM email_channels WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id]);
        res.json({ message: 'Channel deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// SLA ROUTES
router.get('/sla', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query("SELECT * FROM sla_policies WHERE tenant_id = $1 ORDER BY priority", [tenantId]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sla', authenticate, async (req, res) => {
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
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// EMAIL TEMPLATES ROUTES
router.get('/email-templates', authenticate, async (req, res) => {
    try {
        const result = await query("SELECT * FROM email_templates ORDER BY id");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/email-templates/:id', authenticate, async (req, res) => {
    try {
        const { subject_template, body_html, body_text } = req.body;
        // Keep it simple, just update the content fields
        await query(
            "UPDATE email_templates SET subject_template = $1, body_html = $2, body_text = $3, updated_at = NOW() WHERE id = $4",
            [subject_template, body_html, body_text, req.params.id]
        );
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET Theme
router.get('/theme', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query("SELECT theme FROM tenants WHERE id = $1", [tenantId]);
        if (result.rows.length === 0) return res.json({});
        res.json(result.rows[0].theme || {});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UPDATE Theme
router.post('/theme', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        let theme = req.body;

        console.log(`[Theme Update] Tenant: ${tenantId}, Theme Keys: ${Object.keys(theme).join(',')}`);

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
        console.error("Theme Update Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET settings
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
        res.status(500).json({ error: error.message });
    }
});

// UPDATE settings (Batch)
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
                console.log("Updated .env file with new DB config");
            }
        } else {
            console.warn("Attempt to update DB config in Cloud Run ignored (immutable env).");
            // Ideally we would trigger a revision update here via Google Cloud API, 
            // but that requires high permissions not available to the default service account usually.
        }

        res.json({ message: 'Settings saved. Database changes (if any) may require a restart.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEST EMAIL
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
            subject: 'VTrustX SMTP Test',
            text: 'If you are reading this, your SMTP configuration is working!'
        });

        res.json({ success: true, message: 'Test email sent successfully!' });
    } catch (error) {
        console.error("SMTP Test Failed:", error);
        res.status(400).json({ error: error.message });
    }
});

// GET Subscription Info
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
                const tRes = await query("INSERT INTO tenants (name, plan, subscription_status) VALUES ($1, 'free', 'active') RETURNING *", [newTenantName]);
                const newTenant = tRes.rows[0];
                await query("UPDATE users SET tenant_id = $1 WHERE id = $2", [newTenant.id, req.user.id]);
                tenant = newTenant;
            }
            // Helper for downstream if needed, though we use local var 'tenant'
            req.tenant = tenant;
        }

        if (!tenant) return res.status(404).json({ error: 'Tenant creation failed' });

        // Calculate Usage
        const userCountRes = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenant.id]);
        const userCount = parseInt(userCountRes.rows[0].count);

        let limit = 2;
        if (tenant.plan === 'pro') limit = 5;
        if (tenant.plan === 'enterprise') limit = 100;

        res.json({
            plan: tenant.plan,
            status: tenant.subscription_status,
            users: {
                current: userCount,
                limit: limit
            }
        });
    } catch (e) {
        console.error("Subscription Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// UPGRADE Subscription
router.post('/subscription/upgrade', authenticate, async (req, res) => {
    try {
        const { plan } = req.body; // 'pro' or 'enterprise' - skipping payment gateway for prototype

        let tenant = req.tenant;
        // If req.tenant is null here (middleware issue or no tenant yet), fetch via user again
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
        res.status(500).json({ error: e.message });
    }
});



const jwt = require('jsonwebtoken');

// ACTIVATE License
router.post('/subscription/license', authenticate, async (req, res) => {
    try {
        const { licenseKey } = req.body;
        const tenantId = req.user.tenant_id;

        if (!licenseKey) return res.status(400).json({ error: 'License key required' });

        const secret = process.env.LICENSE_SECRET || process.env.JWT_SECRET || 'vtrustx_secret_key';
        let payload;
        try {
            payload = jwt.verify(licenseKey, secret);
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
        res.status(500).json({ error: e.message });
    }
});

// ASSIGNMENT RULES ROUTES
router.get('/assignment-rules', authenticate, async (req, res) => {
    try {
        const result = await query("SELECT * FROM assignment_rules WHERE tenant_id = $1 ORDER BY created_at DESC", [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/assignment-rules', authenticate, async (req, res) => {
    try {
        const { keyword, assigned_user_id } = req.body;
        await query(
            "INSERT INTO assignment_rules (tenant_id, keyword, assigned_user_id) VALUES ($1, $2, $3)",
            [req.user.tenant_id, keyword.toLowerCase(), assigned_user_id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/assignment-rules/:id', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM assignment_rules WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SAVED THEMES ROUTES ---

// GET Saved Themes
router.get('/theme/saved', authenticate, async (req, res) => {
    try {
        const result = await query("SELECT * FROM themes WHERE tenant_id = $1 ORDER BY created_at DESC", [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// SAVE New Theme
router.post('/theme/saved', authenticate, async (req, res) => {
    try {
        const { name, config } = req.body;
        await query("INSERT INTO themes (tenant_id, name, config) VALUES ($1, $2, $3)", [req.user.tenant_id, name, config]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE Theme
router.delete('/theme/saved/:id', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM themes WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
