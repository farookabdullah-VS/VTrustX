/**
 * Advanced Contact Management API Routes
 *
 * Endpoints for enhanced contact features:
 * - Custom fields
 * - Segments
 * - Tags
 * - Activities/timeline
 * - Duplicate management
 * - Suppression list
 * - Import/export
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const AdvancedContactService = require('../../services/AdvancedContactService');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

// ===== Custom Fields =====

/**
 * @route   GET /api/advanced-contacts/custom-fields
 * @desc    Get all custom field definitions
 * @access  Private
 */
router.get('/custom-fields', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const fields = await AdvancedContactService.getCustomFields(tenantId);

        res.json({
            success: true,
            fields
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /custom-fields failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/custom-fields
 * @desc    Create or update custom field definition
 * @access  Private
 */
router.post('/custom-fields', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const field = await AdvancedContactService.createCustomField(tenantId, req.body);

        res.status(201).json({
            success: true,
            field
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /custom-fields failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Tags =====

/**
 * @route   GET /api/advanced-contacts/tags
 * @desc    Get all tags for tenant
 * @access  Private
 */
router.get('/tags', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const result = await query(
            'SELECT * FROM contact_tags WHERE tenant_id = $1 ORDER BY usage_count DESC, name ASC',
            [tenantId]
        );

        res.json({
            success: true,
            tags: result.rows
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /tags failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/:id/tags
 * @desc    Add tags to contact
 * @access  Private
 */
router.post('/:id/tags', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contactId = parseInt(req.params.id);
        const { tags } = req.body;

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tags array is required'
            });
        }

        await AdvancedContactService.addTagsToContact(contactId, tags, tenantId);

        res.json({
            success: true,
            message: 'Tags added successfully'
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /:id/tags failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/advanced-contacts/:id/tags
 * @desc    Remove tags from contact
 * @access  Private
 */
router.delete('/:id/tags', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contactId = parseInt(req.params.id);
        const { tags } = req.body;

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tags array is required'
            });
        }

        await AdvancedContactService.removeTagsFromContact(contactId, tags, tenantId);

        res.json({
            success: true,
            message: 'Tags removed successfully'
        });
    } catch (error) {
        logger.error('[AdvancedContacts] DELETE /:id/tags failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Segments =====

/**
 * @route   GET /api/advanced-contacts/segments
 * @desc    Get all segments
 * @access  Private
 */
router.get('/segments', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const result = await query(
            'SELECT * FROM contact_segments WHERE tenant_id = $1 ORDER BY name ASC',
            [tenantId]
        );

        res.json({
            success: true,
            segments: result.rows
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /segments failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/segments
 * @desc    Create segment
 * @access  Private
 */
router.post('/segments', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const segment = await AdvancedContactService.createSegment(tenantId, req.body);

        res.status(201).json({
            success: true,
            segment
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /segments failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/advanced-contacts/segments/:id/contacts
 * @desc    Get contacts in segment
 * @access  Private
 */
router.get('/segments/:id/contacts', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const segmentId = parseInt(req.params.id);
        const { limit = 50, offset = 0 } = req.query;

        const result = await query(
            `SELECT c.* FROM contacts c
            JOIN contact_segment_members m ON c.id = m.contact_id
            WHERE m.segment_id = $1 AND c.tenant_id = $2
            ORDER BY c.created_at DESC
            LIMIT $3 OFFSET $4`,
            [segmentId, tenantId, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            contacts: result.rows
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /segments/:id/contacts failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/segments/:id/refresh
 * @desc    Refresh segment membership
 * @access  Private
 */
router.post('/segments/:id/refresh', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const segmentId = parseInt(req.params.id);

        const count = await AdvancedContactService.updateSegmentMembers(segmentId, tenantId);

        res.json({
            success: true,
            count
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /segments/:id/refresh failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Activities/Timeline =====

/**
 * @route   GET /api/advanced-contacts/:id/timeline
 * @desc    Get contact timeline
 * @access  Private
 */
router.get('/:id/timeline', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contactId = parseInt(req.params.id);
        const { limit = 50 } = req.query;

        const activities = await AdvancedContactService.getContactTimeline(
            contactId,
            tenantId,
            parseInt(limit)
        );

        res.json({
            success: true,
            activities
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /:id/timeline failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/:id/activity
 * @desc    Add activity to contact timeline
 * @access  Private
 */
router.post('/:id/activity', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contactId = parseInt(req.params.id);

        const activity = await AdvancedContactService.addActivity(
            contactId,
            tenantId,
            req.body
        );

        res.status(201).json({
            success: true,
            activity
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /:id/activity failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Duplicate Management =====

/**
 * @route   GET /api/advanced-contacts/duplicates
 * @desc    Detect duplicate contacts
 * @access  Private
 */
router.get('/duplicates', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const duplicates = await AdvancedContactService.detectDuplicates(tenantId);

        res.json({
            success: true,
            duplicates
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /duplicates failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/:id/merge
 * @desc    Merge duplicate contacts
 * @access  Private
 */
router.post('/:id/merge', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const primaryContactId = parseInt(req.params.id);
        const { duplicate_ids } = req.body;

        if (!duplicate_ids || !Array.isArray(duplicate_ids) || duplicate_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'duplicate_ids array is required'
            });
        }

        await AdvancedContactService.mergeDuplicates(
            primaryContactId,
            duplicate_ids,
            tenantId
        );

        res.json({
            success: true,
            message: 'Contacts merged successfully'
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /:id/merge failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Suppression List =====

/**
 * @route   POST /api/advanced-contacts/:id/suppress
 * @desc    Suppress contact (add to do-not-contact list)
 * @access  Private
 */
router.post('/:id/suppress', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contactId = parseInt(req.params.id);
        const { reason } = req.body;

        await AdvancedContactService.suppressContact(contactId, reason, tenantId);

        res.json({
            success: true,
            message: 'Contact suppressed successfully'
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /:id/suppress failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/advanced-contacts/:id/unsuppress
 * @desc    Unsuppress contact
 * @access  Private
 */
router.post('/:id/unsuppress', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contactId = parseInt(req.params.id);

        await AdvancedContactService.unsuppressContact(contactId, tenantId);

        res.json({
            success: true,
            message: 'Contact unsuppressed successfully'
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /:id/unsuppress failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/advanced-contacts/suppressed
 * @desc    Get suppressed contacts
 * @access  Private
 */
router.get('/suppressed', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { limit = 50, offset = 0 } = req.query;

        const result = await query(
            `SELECT * FROM contacts
            WHERE tenant_id = $1 AND is_suppressed = true
            ORDER BY suppressed_at DESC
            LIMIT $2 OFFSET $3`,
            [tenantId, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            contacts: result.rows
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /suppressed failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Import/Export =====

/**
 * @route   POST /api/advanced-contacts/import
 * @desc    Create import job
 * @access  Private
 */
router.post('/import', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const job = await AdvancedContactService.createImportJob(tenantId, req.body);

        res.status(201).json({
            success: true,
            job
        });
    } catch (error) {
        logger.error('[AdvancedContacts] POST /import failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/advanced-contacts/import/:batchId
 * @desc    Get import job status
 * @access  Private
 */
router.get('/import/:batchId', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const batchId = req.params.batchId;

        const result = await query(
            'SELECT * FROM contact_import_jobs WHERE batch_id = $1 AND tenant_id = $2',
            [batchId, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Import job not found'
            });
        }

        res.json({
            success: true,
            job: result.rows[0]
        });
    } catch (error) {
        logger.error('[AdvancedContacts] GET /import/:batchId failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
