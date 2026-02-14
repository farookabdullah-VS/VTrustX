const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const logger = require('../../infrastructure/logger');
const contactRepo = new PostgresRepository('contacts');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createContactSchema, updateContactSchema } = require('../schemas/contacts.schemas');

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     tags: [Contacts]
 *     summary: List contacts
 *     description: Returns all contacts for the authenticated user's tenant, ordered by creation date descending.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of contacts
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
 *                   mobile:
 *                     type: string
 *                   address:
 *                     type: string
 *                   designation:
 *                     type: string
 *                   department:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // In a real generic repo, we'd pass filters. For now, manual query or filter after fetch (inefficient but works for small scale)
        // Or better: extends PostgresRepository to support 'findAll({ where: { tenant_id } })'
        // Assuming findAll returns all rows for now, we filter manually or add method.
        // Let's use direct pool for filtering to be safe as per user example
        const pool = require('../../infrastructure/database/db');
        const result = await pool.query('SELECT * FROM contacts WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        res.json(result.rows);
    } catch (err) {
        logger.error('Failed to list contacts', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     tags: [Contacts]
 *     summary: Create contact
 *     description: Creates a new contact for the tenant. Performs de-duplication by email or mobile; returns the existing contact if a match is found.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               address:
 *                 type: string
 *               designation:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contact created
 *       200:
 *         description: Existing contact returned (de-duplicated)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, validate(createContactSchema), async (req, res) => {
    try {
        const { name, email, mobile, address, designation, department } = req.body;
        const tenantId = req.user.tenant_id;
        if (!name) return res.status(400).json({ error: "Name is required" });

        // Check for existing
        const pool = require('../../infrastructure/database/db');
        let queryStr = "SELECT * FROM contacts WHERE tenant_id = $1 AND (email = $2";
        const params = [tenantId, email];

        if (mobile) {
            queryStr += " OR mobile = $3";
            params.push(mobile);
        }
        queryStr += ")";

        // Only check if email or mobile provided
        if (email || mobile) {
            const existing = await pool.query(queryStr, params);
            if (existing.rows.length > 0) {
                // If it exists, we return the existing one (Idempotent) or Error?
                // User said "check the contact is there... if not create... and map".
                // This implies getting the ID back.
                // We'll return the existing contact to be helpful.
                return res.status(200).json(existing.rows[0]);
            }
        }

        const newContact = {
            tenant_id: tenantId,
            name,
            email: email || null,
            mobile: mobile || null,
            address,
            designation,
            department,
            created_at: new Date(),
            updated_at: new Date()
        };
        const saved = await contactRepo.create(newContact);
        res.status(201).json(saved);
    } catch (err) {
        logger.error('Failed to create contact', { error: err.message });
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     tags: [Contacts]
 *     summary: Delete contact
 *     description: Deletes a contact by ID. Only contacts belonging to the authenticated user's tenant can be deleted.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact ID
 *     responses:
 *       204:
 *         description: Contact deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const pool = require('../../infrastructure/database/db');
        const existing = await pool.query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
        await contactRepo.delete(req.params.id);
        res.status(204).send();
    } catch (err) {
        logger.error('Failed to delete contact', { error: err.message });
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     tags: [Contacts]
 *     summary: Update contact
 *     description: Updates an existing contact by ID. At least one field must be provided.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               address:
 *                 type: string
 *               designation:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, validate(updateContactSchema), async (req, res) => {
    try {
        const { name, email, mobile, address, designation, department } = req.body;
        const updates = { name, email, mobile, address, designation, department, updated_at: new Date() };
        // Remove undefined keys
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        const updated = await contactRepo.update(req.params.id, updates);
        res.json(updated);
    } catch (err) {
        logger.error('Failed to update contact', { error: err.message });
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

// ============================================
// CONTACT IMPORT/EXPORT ROUTES
// ============================================

const multer = require('multer');
const path = require('path');
const ContactImportExportService = require('../../services/ContactImportExportService');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = process.env.K_SERVICE ? '/tmp/uploads' : path.join(__dirname, '../../../uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'contact-import-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});

/**
 * POST /api/contacts/import/preview
 * Preview import and validate data
 */
router.post('/import/preview', authenticate, upload.single('file'), async (req, res) => {
    let filePath;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        filePath = req.file.path;
        const tenantId = req.user.tenant_id;
        const fieldMapping = JSON.parse(req.body.fieldMapping || '{}');

        // Parse file based on type
        const ext = path.extname(req.file.originalname).toLowerCase();
        let contacts;

        if (ext === '.csv') {
            contacts = await ContactImportExportService.parseCSV(filePath);
        } else if (ext === '.xlsx' || ext === '.xls') {
            contacts = await ContactImportExportService.parseExcel(filePath);
        } else {
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        // Validate and check for duplicates
        const validation = await ContactImportExportService.validateImport(
            contacts,
            fieldMapping,
            tenantId
        );

        // Clean up file
        await fs.unlink(filePath);

        return res.json({
            success: true,
            preview: {
                total: validation.total,
                valid: validation.valid,
                invalid: validation.invalid,
                duplicates_in_file: validation.duplicates_in_file,
                duplicates_in_db: validation.duplicates_in_db,
                sample_contacts: validation.valid_contacts.slice(0, 10), // First 10
                errors: validation.errors.slice(0, 20) // First 20 errors
            }
        });
    } catch (error) {
        logger.error('[Contact Import API] Preview failed', {
            error: error.message
        });

        // Clean up file on error
        if (filePath) {
            await fs.unlink(filePath).catch(() => {});
        }

        return res.status(500).json({
            error: error.message || 'Failed to preview import'
        });
    }
});

/**
 * POST /api/contacts/import
 * Import contacts to database
 */
router.post('/import', authenticate, upload.single('file'), async (req, res) => {
    let filePath;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        filePath = req.file.path;
        const tenantId = req.user.tenant_id;
        const fieldMapping = JSON.parse(req.body.fieldMapping || '{}');
        const skipDuplicates = req.body.skipDuplicates === 'true';
        const updateExisting = req.body.updateExisting === 'true';
        const tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [];

        // Parse file
        const ext = path.extname(req.file.originalname).toLowerCase();
        let contacts;

        if (ext === '.csv') {
            contacts = await ContactImportExportService.parseCSV(filePath);
        } else if (ext === '.xlsx' || ext === '.xls') {
            contacts = await ContactImportExportService.parseExcel(filePath);
        } else {
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        // Validate
        const validation = await ContactImportExportService.validateImport(
            contacts,
            fieldMapping,
            tenantId
        );

        if (validation.valid === 0) {
            await fs.unlink(filePath);
            return res.status(400).json({
                error: 'No valid contacts found in file',
                errors: validation.errors
            });
        }

        // Import contacts
        const result = await ContactImportExportService.importContacts(
            validation.valid_contacts,
            tenantId,
            {
                skipDuplicates,
                updateExisting,
                tags
            }
        );

        // Clean up file
        await fs.unlink(filePath);

        return res.json({
            success: true,
            imported: result.imported,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors,
            total: validation.total
        });
    } catch (error) {
        logger.error('[Contact Import API] Import failed', {
            error: error.message
        });

        // Clean up file on error
        if (filePath) {
            await fs.unlink(filePath).catch(() => {});
        }

        return res.status(500).json({
            error: error.message || 'Failed to import contacts'
        });
    }
});

/**
 * GET /api/contacts/export/csv
 * Export contacts to CSV
 */
router.get('/export/csv', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const filters = {
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            lifecycle_stage: req.query.lifecycle_stage
        };

        const csv = await ContactImportExportService.exportToCSV(tenantId, { filters });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
        return res.send(csv);
    } catch (error) {
        logger.error('[Contact Export API] CSV export failed', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to export contacts'
        });
    }
});

/**
 * GET /api/contacts/export/excel
 * Export contacts to Excel
 */
router.get('/export/excel', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const filters = {
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            lifecycle_stage: req.query.lifecycle_stage
        };

        const buffer = await ContactImportExportService.exportToExcel(tenantId, { filters });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.xlsx"`);
        return res.send(buffer);
    } catch (error) {
        logger.error('[Contact Export API] Excel export failed', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to export contacts'
        });
    }
});

/**
 * GET /api/contacts/export/json
 * Export contacts to JSON
 */
router.get('/export/json', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const filters = {
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            lifecycle_stage: req.query.lifecycle_stage
        };

        const json = await ContactImportExportService.exportToJSON(tenantId, { filters });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.json"`);
        return res.send(json);
    } catch (error) {
        logger.error('[Contact Export API] JSON export failed', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to export contacts'
        });
    }
});

/**
 * GET /api/contacts/import/template
 * Download import template CSV
 */
router.get('/import/template', authenticate, (req, res) => {
    try {
        const template = ContactImportExportService.getImportTemplate();

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="contact-import-template.csv"');
        return res.send(template);
    } catch (error) {
        logger.error('[Contact Import API] Template download failed', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to generate template'
        });
    }
});

module.exports = router;
