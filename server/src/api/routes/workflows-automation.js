/**
 * Workflow Automation API Routes
 *
 * Endpoints:
 * - POST /api/workflows-automation - Create workflow
 * - GET /api/workflows-automation - List workflows
 * - GET /api/workflows-automation/:id - Get workflow details
 * - PUT /api/workflows-automation/:id - Update workflow
 * - DELETE /api/workflows-automation/:id - Delete workflow
 * - GET /api/workflows-automation/:id/executions - Get execution history
 * - POST /api/workflows-automation/:id/test - Test workflow manually
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const WorkflowService = require('../../services/WorkflowService');
const logger = require('../../infrastructure/logger');

/**
 * POST /api/workflows-automation
 * Create a new workflow
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const workflowData = req.body;

        const workflow = await WorkflowService.createWorkflow(tenantId, workflowData);

        return res.status(201).json({
            success: true,
            workflow
        });
    } catch (error) {
        logger.error('[Workflow API] Failed to create workflow', {
            error: error.message
        });
        return res.status(500).json({
            error: error.message || 'Failed to create workflow'
        });
    }
});

/**
 * GET /api/workflows-automation
 * List all workflows for tenant
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const filters = {
            formId: req.query.formId ? parseInt(req.query.formId) : undefined,
            isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
        };

        const workflows = await WorkflowService.listWorkflows(tenantId, filters);

        return res.json({
            workflows,
            count: workflows.length
        });
    } catch (error) {
        logger.error('[Workflow API] Failed to list workflows', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to retrieve workflows'
        });
    }
});

/**
 * GET /api/workflows-automation/:id
 * Get workflow details
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const workflow = await WorkflowService.getWorkflow(parseInt(id), tenantId);

        return res.json({ workflow });
    } catch (error) {
        logger.error('[Workflow API] Failed to get workflow', {
            error: error.message,
            workflowId: req.params.id
        });

        if (error.message === 'Workflow not found') {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        return res.status(500).json({
            error: 'Failed to retrieve workflow'
        });
    }
});

/**
 * PUT /api/workflows-automation/:id
 * Update workflow
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const updates = req.body;

        const workflow = await WorkflowService.updateWorkflow(parseInt(id), tenantId, updates);

        return res.json({
            success: true,
            workflow
        });
    } catch (error) {
        logger.error('[Workflow API] Failed to update workflow', {
            error: error.message,
            workflowId: req.params.id
        });

        if (error.message === 'Workflow not found') {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        return res.status(500).json({
            error: error.message || 'Failed to update workflow'
        });
    }
});

/**
 * DELETE /api/workflows-automation/:id
 * Delete workflow
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        await WorkflowService.deleteWorkflow(parseInt(id), tenantId);

        return res.json({
            success: true,
            message: 'Workflow deleted successfully'
        });
    } catch (error) {
        logger.error('[Workflow API] Failed to delete workflow', {
            error: error.message,
            workflowId: req.params.id
        });

        if (error.message === 'Workflow not found') {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        return res.status(500).json({
            error: 'Failed to delete workflow'
        });
    }
});

/**
 * GET /api/workflows-automation/:id/executions
 * Get execution history for workflow
 */
router.get('/:id/executions', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        const executions = await WorkflowService.getExecutionHistory(parseInt(id), tenantId, limit);

        return res.json({
            executions,
            count: executions.length
        });
    } catch (error) {
        logger.error('[Workflow API] Failed to get execution history', {
            error: error.message,
            workflowId: req.params.id
        });
        return res.status(500).json({
            error: 'Failed to retrieve execution history'
        });
    }
});

/**
 * POST /api/workflows-automation/:id/test
 * Test workflow manually with sample data
 */
router.post('/:id/test', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const { submissionData } = req.body;

        if (!submissionData) {
            return res.status(400).json({ error: 'submissionData is required for testing' });
        }

        // Execute workflow with test data (submission_id = null for test)
        const result = await WorkflowService.executeWorkflow(
            parseInt(id),
            null, // No actual submission for test
            tenantId,
            submissionData
        );

        return res.json({
            success: true,
            result
        });
    } catch (error) {
        logger.error('[Workflow API] Failed to test workflow', {
            error: error.message,
            workflowId: req.params.id
        });
        return res.status(500).json({
            error: error.message || 'Failed to test workflow'
        });
    }
});

module.exports = router;
