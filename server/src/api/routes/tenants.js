const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const logger = require('../../infrastructure/logger');

// GET all tenants (Global Admin only)
router.get('/', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const result = await query(`
            SELECT
                t.*,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT tsm.id) as active_modules_count
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id
            LEFT JOIN tenant_subscription_modules tsm ON t.id = tsm.tenant_id AND tsm.enabled = true
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching tenants:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET tenant by ID
router.get('/:id', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM tenants WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching tenant:', error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE tenant
router.post('/', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const {
            name, domain, subdomain, contact_email, contact_phone,
            status = 'active', plan, max_users = 10, max_surveys = 100,
            max_responses = 1000, storage_limit_mb = 1000,
            billing_email, billing_address, tax_id, notes
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Tenant name is required' });
        }

        await transaction(async (client) => {
            const tenantResult = await client.query(`
                INSERT INTO tenants (
                    name, domain, subdomain, contact_email, contact_phone,
                    status, plan, max_users, max_surveys, max_responses,
                    storage_limit_mb, billing_email, billing_address, tax_id, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `, [
                name, domain, subdomain, contact_email, contact_phone,
                status, plan, max_users, max_surveys, max_responses,
                storage_limit_mb, billing_email, billing_address, tax_id, notes
            ]);

            const newTenant = tenantResult.rows[0];

            await client.query(`
                INSERT INTO tenant_subscription_modules (tenant_id, module_id, enabled)
                SELECT $1, id, true FROM subscription_modules WHERE is_core = true
            `, [newTenant.id]);

            logger.info('Tenant created', { tenantId: newTenant.id, name: newTenant.name });
            res.status(201).json(newTenant);
        });
    } catch (error) {
        logger.error('Error creating tenant:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE tenant
router.put('/:id', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, domain, subdomain, contact_email, contact_phone,
            status, plan, max_users, max_surveys, max_responses,
            storage_limit_mb, billing_email, billing_address, tax_id, notes
        } = req.body;

        const result = await query(`
            UPDATE tenants
            SET name = COALESCE($1, name),
                domain = COALESCE($2, domain),
                subdomain = COALESCE($3, subdomain),
                contact_email = COALESCE($4, contact_email),
                contact_phone = COALESCE($5, contact_phone),
                status = COALESCE($6, status),
                plan = COALESCE($7, plan),
                max_users = COALESCE($8, max_users),
                max_surveys = COALESCE($9, max_surveys),
                max_responses = COALESCE($10, max_responses),
                storage_limit_mb = COALESCE($11, storage_limit_mb),
                billing_email = COALESCE($12, billing_email),
                billing_address = COALESCE($13, billing_address),
                tax_id = COALESCE($14, tax_id),
                notes = COALESCE($15, notes),
                updated_at = NOW()
            WHERE id = $16
            RETURNING *
        `, [
            name, domain, subdomain, contact_email, contact_phone,
            status, plan, max_users, max_surveys, max_responses,
            storage_limit_mb, billing_email, billing_address, tax_id, notes, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        logger.info('Tenant updated', { tenantId: id });
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating tenant:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE tenant
router.delete('/:id', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM tenants WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        logger.info('Tenant deleted', { tenantId: id });
        res.json({ message: 'Tenant deleted successfully', id });
    } catch (error) {
        logger.error('Error deleting tenant:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET available modules
router.get('/modules/available', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM subscription_modules
            WHERE is_active = true
            ORDER BY sort_order, module_name
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET tenant modules
router.get('/:id/modules', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT
                sm.*,
                COALESCE(tsm.enabled, false) as enabled,
                tsm.enabled_at,
                tsm.expires_at
            FROM subscription_modules sm
            LEFT JOIN tenant_subscription_modules tsm
                ON sm.id = tsm.module_id AND tsm.tenant_id = $1
            WHERE sm.is_active = true
            ORDER BY sm.sort_order, sm.module_name
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE tenant modules
router.post('/:id/modules', authenticate, requireRole('global_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { modules } = req.body;

        await transaction(async (client) => {
            await client.query(`
                DELETE FROM tenant_subscription_modules
                WHERE tenant_id = $1
                AND module_id NOT IN (SELECT id FROM subscription_modules WHERE is_core = true)
            `, [id]);

            for (const module of modules) {
                if (module.enabled) {
                    await client.query(`
                        INSERT INTO tenant_subscription_modules (tenant_id, module_id, enabled, expires_at)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (tenant_id, module_id)
                        DO UPDATE SET enabled = $3, expires_at = $4, updated_at = NOW()
                    `, [id, module.module_id, module.enabled, module.expires_at || null]);
                }
            }
        });

        res.json({ message: 'Modules updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
