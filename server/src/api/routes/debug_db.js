const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');

// Check DB Status
router.get('/health/db-check', async (req, res) => {
    try {
        const users = await query('SELECT count(*) FROM users');
        const tenants = await query('SELECT count(*) FROM tenants');
        res.json({
            status: 'ok',
            users_count: users.rows[0].count,
            tenants_count: tenants.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// Force DB Schema Repair
router.post('/health/db-repair', async (req, res) => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                plan VARCHAR(50) DEFAULT 'free',
                subscription_status VARCHAR(50) DEFAULT 'active',
                subscription_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Ensure tenant_id column
        await query(`
             ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
        `);

        // Seed default tenant
        await query(`
             INSERT INTO tenants (id, name, plan, subscription_status)
             VALUES (1, 'Default Organization', 'free', 'active')
             ON CONFLICT (id) DO NOTHING
        `);

        // Fix admin user
        await query(`
             UPDATE users SET tenant_id = 1 WHERE username = 'admin' AND tenant_id IS NULL
        `);

        res.json({ message: "Repaired tenants table and user linkage." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check Quotas Table Schema
router.get('/health/quotas-schema', async (req, res) => {
    try {
        const columns = await query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'quotas'
        `);
        res.json(columns.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
