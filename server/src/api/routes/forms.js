const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const authenticate = require('../middleware/auth');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');
const { rateLimitCache } = require('../../infrastructure/cache');
const validate = require('../middleware/validate');
const { createFormSchema, updateFormSchema } = require('../schemas/forms.schemas');

// Initialize Repository
const formRepo = new PostgresRepository('forms');

// Rate limiter for password check (5 req/min/IP)
const passwordCheckLimiter = async (req, res, next) => {
    const key = `form_pw:${req.ip}`;
    try {
        const current = await rateLimitCache.incr(key, 60);
        if (current > 5) {
            return res.status(429).json({ error: 'Too many password attempts. Try again later.' });
        }
        next();
    } catch (err) {
        logger.error('Password check rate limiter error', { error: err.message });
        next(); // Fail open
    }
};

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
        // password: row.password, // REMOVED: Never send password to client
        hasPassword: !!row.password,
        allowAudio: row.allow_audio,
        allowCamera: row.allow_camera,
        allowLocation: row.allow_location,
        aiEnabled: row.ai_enabled,
        ai: row.ai || {},
        enableVoiceAgent: row.enable_voice_agent,
        allowedIps: row.allowed_ips,
        cooldownEnabled: row.cooldown_enabled,
        cooldownPeriod: row.cooldown_period,
        cooldownType: row.cooldown_type,
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
const SurveyCooldownService = require('../../services/SurveyCooldownService');

/**
 * @swagger
 * /api/forms:
 *   get:
 *     summary: List all forms
 *     description: Returns all forms belonging to the authenticated user's tenant, ordered by last updated.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of form objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Form'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("GET /api/forms Error", { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve forms' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/submissions/raw-data:
 *   get:
 *     summary: Get raw submission data for a form
 *     description: Returns flattened submission data for the specified form, intended for Analytics Studio consumption.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Array of flattened submission data objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch raw submissions', { error: err.message });
        res.status(500).json({ error: 'Failed to retrieve submissions data' });
    }
});

/**
 * @swagger
 * /api/forms/slug/{slug}:
 *   get:
 *     summary: Get form by slug
 *     description: Returns a published form by its slug (or ID fallback). This is a public endpoint used for form rendering. Enforces IP allowlist if configured.
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Form slug or ID
 *     responses:
 *       200:
 *         description: Form object with tenant theme
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Form'
 *                 - type: object
 *                   properties:
 *                     tenantTheme:
 *                       type: object
 *       403:
 *         description: IP not allowed
 *       404:
 *         description: Form not found or not published
 *       500:
 *         description: Server error
 */
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
            const clientIp = req.ip;
            if (!checkIpAccess(row.allowed_ips, clientIp)) {
                return res.status(403).json({ error: 'Access Denied: IP not allowed' });
            }
        }

        const entity = toEntity(row);
        entity.tenantTheme = row.tenant_theme;
        res.json(entity);
    } catch (error) {
        logger.error('Failed to get form by slug', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}:
 *   get:
 *     summary: Get form by ID
 *     description: Returns a single form by its ID. The form must belong to the authenticated user's tenant.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        const row = await formRepo.findById(req.params.id);
        if (!row || row.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });
        res.json(toEntity(row));
    } catch (error) {
        logger.error('Failed to get form by ID', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve form' });
    }
});

// Helper: hash form password if provided
async function hashFormPassword(password) {
    if (!password) return null;
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * @swagger
 * /api/forms:
 *   post:
 *     summary: Create a new form
 *     description: Creates a new form with a generated slug. The form is assigned to the authenticated user's tenant and starts in draft status.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               definition:
 *                 type: object
 *                 nullable: true
 *               allow_audio:
 *                 type: boolean
 *               allow_camera:
 *                 type: boolean
 *               allow_location:
 *                 type: boolean
 *               ai_enabled:
 *                 type: boolean
 *               folder_id:
 *                 oneOf:
 *                   - type: integer
 *                   - type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               password:
 *                 type: string
 *                 nullable: true
 *               settings:
 *                 type: object
 *                 nullable: true
 *               type:
 *                 type: string
 *                 nullable: true
 *               language:
 *                 type: string
 *                 maxLength: 10
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Form created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, validate(createFormSchema), authenticate.checkPermission('forms', 'create'), async (req, res) => {
    try {
        logger.info("POST /api/forms - Creating Form", { user: req.user?.username });

        // Generate Slug
        const crypto = require('crypto');
        const generateSlug = () => crypto.randomBytes(4).toString('hex').toUpperCase();

        // Hash form password if provided
        const hashedPassword = await hashFormPassword(req.body.password);

        // Map to DB columns
        const newForm = {
            tenant_id: req.user.tenant_id,
            title: req.body.title || 'Untitled Form',
            slug: generateSlug(),
            definition: req.body.definition || {},
            is_published: req.body.isPublished || false,
            ai: req.body.ai || {},
            enable_voice_agent: req.body.enableVoiceAgent || false,
            allowed_ips: req.body.allowedIps || null,
            password: hashedPassword,
            cooldown_enabled: req.body.cooldownEnabled || false,
            cooldown_period: req.body.cooldownPeriod || 3600,
            cooldown_type: req.body.cooldownType || 'both',
            status: 'draft',
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: req.user.id,
            folder_id: req.body.folderId || null
        };

        const savedRow = await formRepo.create(newForm);
        logger.info("Form created successfully", { formId: savedRow.id });
        res.status(201).json(toEntity(savedRow));
    } catch (error) {
        logger.error("Create Form Error", { error: error.message });
        res.status(500).json({ error: 'Failed to create form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}:
 *   put:
 *     summary: Update a form
 *     description: Updates an existing form. The form must belong to the authenticated user's tenant. At least one field must be provided.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               definition:
 *                 type: object
 *                 nullable: true
 *               allow_audio:
 *                 type: boolean
 *               allow_camera:
 *                 type: boolean
 *               allow_location:
 *                 type: boolean
 *               ai_enabled:
 *                 type: boolean
 *               folder_id:
 *                 oneOf:
 *                   - type: integer
 *                   - type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               password:
 *                 type: string
 *                 nullable: true
 *               settings:
 *                 type: object
 *                 nullable: true
 *               type:
 *                 type: string
 *                 nullable: true
 *               language:
 *                 type: string
 *                 maxLength: 10
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Form updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, validate(updateFormSchema), authenticate.checkPermission('forms', 'update'), async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        // Hash password if being updated
        let passwordValue = existing.password;
        if (req.body.password !== undefined) {
            passwordValue = req.body.password ? await hashFormPassword(req.body.password) : null;
        }

        const updatedData = {
            title: req.body.title || existing.title,
            slug: req.body.slug || existing.slug,
            definition: req.body.definition || existing.definition,
            is_published: req.body.isPublished !== undefined ? req.body.isPublished : existing.is_published,
            is_active: req.body.isActive !== undefined ? req.body.isActive : existing.is_active,

            start_date: req.body.startDate !== undefined ? req.body.startDate : existing.start_date,
            end_date: req.body.endDate !== undefined ? req.body.endDate : existing.end_date,
            response_limit: req.body.responseLimit !== undefined ? req.body.responseLimit : existing.response_limit,
            redirect_url: req.body.redirectUrl !== undefined ? (req.body.redirectUrl && /^https?:\/\//.test(req.body.redirectUrl) ? req.body.redirectUrl : null) : existing.redirect_url,
            password: passwordValue,

            allow_audio: req.body.allowAudio !== undefined ? req.body.allowAudio : existing.allow_audio,
            allow_camera: req.body.allowCamera !== undefined ? req.body.allowCamera : existing.allow_camera,
            allow_location: req.body.allowLocation !== undefined ? req.body.allowLocation : existing.allow_location,
            ai_enabled: req.body.aiEnabled !== undefined ? req.body.aiEnabled : existing.ai_enabled,
            ai: req.body.ai !== undefined ? req.body.ai : existing.ai,
            enable_voice_agent: req.body.enableVoiceAgent !== undefined ? req.body.enableVoiceAgent : existing.enable_voice_agent,
            allowed_ips: req.body.allowedIps !== undefined ? req.body.allowedIps : existing.allowed_ips,
            cooldown_enabled: req.body.cooldownEnabled !== undefined ? req.body.cooldownEnabled : existing.cooldown_enabled,
            cooldown_period: req.body.cooldownPeriod !== undefined ? req.body.cooldownPeriod : existing.cooldown_period,
            cooldown_type: req.body.cooldownType !== undefined ? req.body.cooldownType : existing.cooldown_type,
            folder_id: req.body.folderId !== undefined ? req.body.folderId : existing.folder_id,

            updated_at: new Date()
        };

        const updated = await formRepo.update(req.params.id, updatedData);
        res.json(toEntity(updated));
    } catch (error) {
        logger.error('Failed to update form', { error: error.message });
        res.status(500).json({ error: 'Failed to update form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/publish:
 *   post:
 *     summary: Publish a form
 *     description: Directly publishes a form, bypassing the approval workflow. Intended for legacy support or admin override.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form published successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to publish form', { error: error.message });
        res.status(500).json({ error: 'Failed to publish form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/request-approval:
 *   post:
 *     summary: Request form approval
 *     description: Submits a form for approval as part of the Maker-Checker workflow. Sets the form status to pending_approval.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Approval requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:id/request-approval', authenticate, async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        const updatedRow = await formRepo.update(req.params.id, {
            status: 'pending_approval',
            request_by: req.user.username,
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        logger.error('Failed to request form approval', { error: error.message });
        res.status(500).json({ error: 'Failed to request form approval' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/approve:
 *   post:
 *     summary: Approve a form
 *     description: Approves a form as part of the Maker-Checker workflow. The approver cannot be the same user who requested approval (enforced in production). Publishes the form upon approval.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form approved and published
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       403:
 *         description: Maker cannot be the Checker
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:id/approve', authenticate, async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        // Simple Maker-Checker: user cannot approve their own request
        if (existing.request_by === req.user.username && process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Maker cannot be the Checker' });
        }

        const updatedRow = await formRepo.update(req.params.id, {
            status: 'published',
            is_published: true,
            approved_by: req.user.username,
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        logger.error('Failed to approve form', { error: error.message });
        res.status(500).json({ error: 'Failed to approve form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/reject:
 *   post:
 *     summary: Reject a form
 *     description: Rejects a form as part of the Maker-Checker workflow. Sets the form status to rejected and unpublishes it.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:id/reject', authenticate, async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        const updatedRow = await formRepo.update(req.params.id, {
            status: 'rejected',
            is_published: false,
            approved_by: null,
            updated_at: new Date()
        });
        res.json(toEntity(updatedRow));
    } catch (error) {
        logger.error('Failed to reject form', { error: error.message });
        res.status(500).json({ error: 'Failed to reject form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/draft:
 *   post:
 *     summary: Create a new draft version of a form
 *     description: Creates a new draft version based on an existing form. Increments the version number and sets the status to draft.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Source form ID to create a new draft from
 *     responses:
 *       201:
 *         description: Draft version created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Form'
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:id/draft', authenticate, async (req, res) => {
    try {
        const existing = await formRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Form not found' });

        const newVersionData = {
            tenant_id: existing.tenant_id,
            title: existing.title,
            definition: existing.definition,
            version: (existing.version || 1) + 1,
            is_published: false,
            status: 'draft',
            created_at: new Date(),
            updated_at: new Date(),
            created_by: req.user.id
        };

        const savedRow = await formRepo.create(newVersionData);
        res.status(201).json(toEntity(savedRow));
    } catch (error) {
        logger.error('Failed to create form draft', { error: error.message });
        res.status(500).json({ error: 'Failed to create form draft' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/check-password:
 *   post:
 *     summary: Check form password
 *     description: Verifies a password for a password-protected form. Rate limited to 5 requests per minute per IP. Supports both bcrypt-hashed and legacy plaintext passwords.
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Incorrect password
 *       404:
 *         description: Form not found
 *       429:
 *         description: Too many password attempts
 *       500:
 *         description: Server error
 */
router.post('/:id/check-password', passwordCheckLimiter, async (req, res) => {
    try {
        const { password } = req.body;
        const form = await formRepo.findById(req.params.id);
        if (!form) return res.status(404).json({ error: 'Form not found' });

        // No password set — allow access
        if (!form.password) {
            return res.json({ success: true });
        }

        const bcrypt = require('bcryptjs');

        // Check if stored password is bcrypt-hashed
        if (form.password.startsWith('$2a$') || form.password.startsWith('$2b$')) {
            const isMatch = await bcrypt.compare(password, form.password);
            if (isMatch) return res.json({ success: true });
        } else {
            // Legacy plaintext comparison (for un-migrated passwords)
            if (form.password === password) return res.json({ success: true });
        }

        res.status(401).json({ error: 'Incorrect password' });
    } catch (err) {
        logger.error('Failed to check form password', { error: err.message });
        res.status(500).json({ error: 'Failed to verify password' });
    }
});

/**
 * @swagger
 * /api/forms/{id}:
 *   delete:
 *     summary: Delete a form
 *     description: Deletes a form and all its associated submissions (cascade). The form must belong to the authenticated user's tenant.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     responses:
 *       204:
 *         description: Form deleted successfully
 *       404:
 *         description: Form not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
        logger.error("Delete Error", { error: error.message });
        res.status(500).json({ error: 'Failed to delete form' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/cooldown/check:
 *   post:
 *     summary: Check cool down status
 *     description: Check if a user/IP can submit the form based on cool down settings. Public endpoint for respondents to check before attempting submission.
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Cool down status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onCooldown:
 *                   type: boolean
 *                 remainingTime:
 *                   type: integer
 *                 reason:
 *                   type: string
 *                   nullable: true
 *       404:
 *         description: Form not found
 */
router.post('/:id/cooldown/check', async (req, res) => {
    try {
        const form = await formRepo.findById(req.params.id);
        if (!form) return res.status(404).json({ error: 'Form not found' });

        const ipAddress = req.ip;
        const userId = req.body.userId || null;

        const status = await SurveyCooldownService.getRemainingTime(form, ipAddress, userId);
        res.json(status);
    } catch (error) {
        logger.error('Cool down check error', { error: error.message });
        res.status(500).json({ error: 'Failed to check cool down status' });
    }
});

/**
 * @swagger
 * /api/forms/{id}/cooldown/clear:
 *   delete:
 *     summary: Clear cool down for a form
 *     description: Admin endpoint to clear cool down restrictions for a specific IP/user. Requires authentication and form update permission.
 *     tags: [Forms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ipAddress:
 *                 type: string
 *                 nullable: true
 *               userId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Cool down cleared
 *       404:
 *         description: Form not found
 */
router.delete('/:id/cooldown/clear', authenticate, authenticate.checkPermission('forms', 'update'), async (req, res) => {
    try {
        const form = await formRepo.findById(req.params.id);
        if (!form || form.tenant_id !== req.user.tenant_id) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const { ipAddress, userId } = req.body;
        await SurveyCooldownService.clearCooldown(form.id, ipAddress, userId);

        res.json({ message: 'Cool down cleared successfully' });
    } catch (error) {
        logger.error('Clear cool down error', { error: error.message });
        res.status(500).json({ error: 'Failed to clear cool down' });
    }
});

module.exports = router;
