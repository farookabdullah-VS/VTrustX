const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const authenticate = require('../middleware/auth');
const { query } = require('../../infrastructure/database/db');

// Initialize Repository
const formRepo = new PostgresRepository('forms');

// Helper to map DB to Entity
const toEntity = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        definition: row.definition,
        version: row.version,
        isPublished: row.is_published,
        isActive: row.is_active,
        status: row.status,
        requestBy: row.request_by,
        approvedBy: row.approved_by,
        startDate: row.start_date,
        endDate: row.end_date,
        responseLimit: row.response_limit,
        redirectUrl: row.redirect_url,
        password: row.password,
        allowAudio: row.allow_audio,
        allowCamera: row.allow_camera,
        allowLocation: row.allow_location,
        aiEnabled: row.ai_enabled, // Added AI Enabled
        ai: row.ai || {}, // Added AI Config
        enableVoiceAgent: row.enable_voice_agent,
        allowedIps: row.allowed_ips, // Added IP Whitelist
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        folderId: row.folder_id
    };
};

const checkIpAccess = (allowedIps, reqIp) => {
    if (!allowedIps || !allowedIps.trim()) return true;
    const ips = allowedIps.split(',').map(ip => ip.trim()).filter(ip => ip);
    if (ips.length === 0) return true;

    // Normalize reqIp (handle ::ffff: prefix)
    const cleanIp = reqIp.replace('::ffff:', '');

    return ips.includes(cleanIp);
};

const debugLog = require('./debug_logger');

// Get all forms
router.get('/', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        debugLog(`GET /api/forms - Start. User: ${req.user.username} Tenant: ${req.user.tenant_id}`);
        const rows = await formRepo.findAllBy('tenant_id', req.user.tenant_id, 'updated_at DESC');
        debugLog(`GET /api/forms - Found ${rows.length} rows`);
        const forms = rows.map(r => {
            try {
                return toEntity(r);
            } catch (e) {
                debugLog(`Entity conversion failed for row ${r.id}: ${e.message}`);
                throw e;
            }
        });
        debugLog("GET /api/forms - Sending JSON");
        res.json(forms);
    } catch (error) {
        debugLog(`GET /api/forms - ERROR: ${error.message} - Stack: ${error.stack}`);
        console.error("GET /api/forms Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET RAW SUBMISSIONS for a specific form (for Analytics Studio)
router.get('/:id/submissions/raw-data', authenticate, async (req, res) => {
    try {
        const formId = req.params.id;

        // Ensure form belongs to tenant
        const form = await formRepo.findById(formId);
        if (!form || form.tenant_id !== req.user.tenant_id) {
            return res.status(404).json({ error: "Form not found" });
        }

        // Fetch submissions
        const result = await query(
            "SELECT data, created_at, metadata FROM submissions WHERE form_id = $1 ORDER BY created_at DESC",
            [formId]
        );

        // Flatten data for easy consumption
        const flatData = result.rows.map(row => ({
            ...row.data,
            submission_date: row.created_at,
            ...row.metadata
        }));

        res.json(flatData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get form by Slug
router.get('/slug/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const result = await query(`
            SELECT f.*, t.theme as tenant_theme 
            FROM forms f
            JOIN tenants t ON f.tenant_id = t.id
            WHERE f.slug = $1 OR (f.id::text = $1 AND f.slug IS NULL)
        `, [slug]);

        let row = result.rows[0];

        if (!row) return res.status(404).json({ error: 'Form not found' });

        // Enforce Published Check for Public Access
        if (!row.is_published && row.is_published !== true) {
            return res.status(404).json({ error: 'Form not found or not published' });
        }

        // IP Protection Check
        if (row.allowed_ips) {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if (!checkIpAccess(row.allowed_ips, clientIp)) {
                return res.status(403).json({ error: 'Access Denied: IP not allowed' });
            }
        }

        const entity = toEntity(row);
        entity.tenantTheme = row.tenant_theme;
        res.json(entity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific form by ID
router.get('/:id', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        const row = await formRepo.findById(req.params.id);
        if (!row || row.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });
        res.json(toEntity(row));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new form
router.post('/', authenticate, authenticate.checkPermission('forms', 'create'), async (req, res) => {
    try {
        console.log("POST /api/forms - Creating Form. User:", req.user);

        // Generate Slug
        const generateSlug = () => Math.random().toString(36).substring(2, 8).toUpperCase();

        // Map to DB columns
        const newForm = {
            tenant_id: req.user.tenant_id,
            title: req.body.title || 'Untitled Form',
            slug: generateSlug(),
            definition: req.body.definition || {},
            is_published: req.body.isPublished || false,
            ai: req.body.ai || {}, // Default AI Config
            enable_voice_agent: req.body.enableVoiceAgent || false,
            allowed_ips: req.body.allowedIps || null,
            status: 'draft', // Default status
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: req.user.id,
            folder_id: req.body.folderId || null
        };

        const savedRow = await formRepo.create(newForm);
        console.log("Form created successfully:", savedRow.id);
        res.status(201).json(toEntity(savedRow));
    } catch (error) {
        console.error("Create Form Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update form
router.put('/:id', authenticate, authenticate.checkPermission('forms', 'update'), async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        const updatedData = {
            title: req.body.title || existing.title,
            slug: req.body.slug || existing.slug, // Allow updating slug
            definition: req.body.definition || existing.definition,
            is_published: req.body.isPublished !== undefined ? req.body.isPublished : existing.is_published,
            is_active: req.body.isActive !== undefined ? req.body.isActive : existing.is_active,

            start_date: req.body.startDate !== undefined ? req.body.startDate : existing.start_date,
            end_date: req.body.endDate !== undefined ? req.body.endDate : existing.end_date,
            response_limit: req.body.responseLimit !== undefined ? req.body.responseLimit : existing.response_limit,
            redirect_url: req.body.redirectUrl !== undefined ? req.body.redirectUrl : existing.redirect_url,
            password: req.body.password !== undefined ? req.body.password : existing.password,

            allow_audio: req.body.allowAudio !== undefined ? req.body.allowAudio : existing.allow_audio,
            allow_camera: req.body.allowCamera !== undefined ? req.body.allowCamera : existing.allow_camera,
            allow_location: req.body.allowLocation !== undefined ? req.body.allowLocation : existing.allow_location,
            ai_enabled: req.body.aiEnabled !== undefined ? req.body.aiEnabled : existing.ai_enabled, // Added Mapping
            ai: req.body.ai !== undefined ? req.body.ai : existing.ai, // Added AI Config Update
            enable_voice_agent: req.body.enableVoiceAgent !== undefined ? req.body.enableVoiceAgent : existing.enable_voice_agent,
            allowed_ips: req.body.allowedIps !== undefined ? req.body.allowedIps : existing.allowed_ips,
            folder_id: req.body.folderId !== undefined ? req.body.folderId : existing.folder_id,

            updated_at: new Date()
        };

        const updated = await formRepo.update(req.params.id, updatedData);
        res.json(toEntity(updated));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Publish a form (Direct - Legacy or Admin override)
router.post('/:id/publish', authenticate, authenticate.checkPermission('forms', 'update'), async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        const updatedRow = await formRepo.update(req.params.id, {
            is_published: true,
            status: 'published',
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Request Approval (Maker)
router.post('/:id/request-approval', async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Form not found' });

        const updatedRow = await formRepo.update(req.params.id, {
            status: 'pending_approval',
            request_by: req.body.username || 'unknown',
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve Form (Checker)
router.post('/:id/approve', async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Form not found' });

        const updatedRow = await formRepo.update(req.params.id, {
            status: 'published',
            is_published: true,
            approved_by: req.body.username || 'admin',
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject Form (Checker)
router.post('/:id/reject', async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Form not found' });

        const updatedRow = await formRepo.update(req.params.id, {
            status: 'rejected',
            is_published: false,
            approved_by: null,
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new version (draft) logic - Simplified for DB
router.post('/:id/draft', async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Form not found' });

        // Logic: Increment version, set published false, new ID (insert)
        const newVersionData = {
            tenant_id: existing.tenant_id, // Copy tenant_id
            title: existing.title,
            definition: existing.definition,
            version: (existing.version || 1) + 1,
            is_published: false,
            created_at: new Date(),
            updated_at: new Date()
        };

        const savedRow = await formRepo.create(newVersionData);
        res.status(201).json(toEntity(savedRow));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete form
router.delete('/:id', authenticate, authenticate.checkPermission('forms', 'delete'), async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await formRepo.findById(id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        // Manual Cascade Delete: Delete submissions first
        const db = require('../../infrastructure/database/db');
        await db.query('DELETE FROM submissions WHERE form_id = $1', [id]);

        // Delete Form
        await formRepo.delete(id);

        res.status(204).send();
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
