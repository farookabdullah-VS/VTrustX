/**
 * Workflow Templates API Routes
 *
 * Endpoints for managing and using workflow templates
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const WorkflowTemplateService = require('../../services/WorkflowTemplateService');
const logger = require('../../infrastructure/logger');
const Joi = require('joi');

// Validation schemas
const createTemplateSchema = Joi.object({
    name: Joi.string().required().max(255),
    description: Joi.string().optional().allow(''),
    category: Joi.string().optional().valid('customer_service', 'sales', 'marketing', 'operations'),
    use_case: Joi.string().optional().max(255),
    workflow_definition: Joi.object().required(),
    icon: Joi.string().optional().max(50),
    tags: Joi.array().items(Joi.string()).optional(),
    is_public: Joi.boolean().optional()
});

const instantiateTemplateSchema = Joi.object({
    name: Joi.string().optional().max(255),
    description: Joi.string().optional(),
    form_id: Joi.number().integer().optional(),
    conditions: Joi.array().optional(),
    actions: Joi.array().optional(),
    is_active: Joi.boolean().optional()
});

/**
 * GET /api/workflow-templates
 * List available templates
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { category, search, tags, limit, offset } = req.query;

        const filters = {
            category,
            search,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        };

        const templates = await WorkflowTemplateService.listTemplates(
            req.user.tenant_id,
            filters
        );

        res.json({
            success: true,
            data: templates,
            count: templates.length
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to list templates', {
            error: error.message,
            tenantId: req.user.tenant_id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve templates',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/workflow-templates/categories
 * Get template categories with counts
 */
router.get('/categories', authenticate, async (req, res) => {
    try {
        const categories = await WorkflowTemplateService.getCategories(req.user.tenant_id);

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to get categories', {
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/workflow-templates/:id
 * Get a specific template
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);

        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template ID'
            });
        }

        const template = await WorkflowTemplateService.getTemplate(
            templateId,
            req.user.tenant_id
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.json({
            success: true,
            data: template
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to get template', {
            error: error.message,
            templateId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve template',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/workflow-templates
 * Create a new template (private to tenant)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        // Validate request body
        const { error, value } = createTemplateSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details[0].message
            });
        }

        // Users can only create private templates
        const config = {
            ...value,
            is_public: false  // Force private for user-created templates
        };

        const template = await WorkflowTemplateService.createTemplate(
            config,
            req.user.tenant_id
        );

        logger.info('[WorkflowTemplates] Template created', {
            templateId: template.id,
            tenantId: req.user.tenant_id
        });

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to create template', {
            error: error.message,
            tenantId: req.user.tenant_id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to create template',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * PUT /api/workflow-templates/:id
 * Update a template
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);

        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template ID'
            });
        }

        // Validate request body
        const { error, value } = createTemplateSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details[0].message
            });
        }

        const updated = await WorkflowTemplateService.updateTemplate(
            templateId,
            value,
            req.user.tenant_id
        );

        logger.info('[WorkflowTemplates] Template updated', {
            templateId,
            tenantId: req.user.tenant_id
        });

        res.json({
            success: true,
            message: 'Template updated successfully',
            data: updated
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to update template', {
            error: error.message,
            templateId: req.params.id
        });

        const statusCode = error.message.includes('Access denied') ? 403 :
                          error.message.includes('not found') ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * DELETE /api/workflow-templates/:id
 * Delete a template
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);

        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template ID'
            });
        }

        await WorkflowTemplateService.deleteTemplate(
            templateId,
            req.user.tenant_id
        );

        logger.info('[WorkflowTemplates] Template deleted', {
            templateId,
            tenantId: req.user.tenant_id
        });

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to delete template', {
            error: error.message,
            templateId: req.params.id
        });

        const statusCode = error.message.includes('Access denied') ? 403 :
                          error.message.includes('not found') ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/workflow-templates/:id/instantiate
 * Create a workflow from a template
 */
router.post('/:id/instantiate', authenticate, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);

        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template ID'
            });
        }

        // Validate customizations
        const { error, value } = instantiateTemplateSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details[0].message
            });
        }

        const workflow = await WorkflowTemplateService.instantiateTemplate(
            templateId,
            req.user.tenant_id,
            value
        );

        logger.info('[WorkflowTemplates] Workflow created from template', {
            templateId,
            workflowId: workflow.id,
            tenantId: req.user.tenant_id
        });

        res.status(201).json({
            success: true,
            message: 'Workflow created from template',
            data: workflow
        });

    } catch (error) {
        logger.error('[WorkflowTemplates] Failed to instantiate template', {
            error: error.message,
            templateId: req.params.id
        });

        const statusCode = error.message.includes('not found') ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
