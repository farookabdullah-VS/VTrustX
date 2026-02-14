/**
 * Workflow Execution History API Routes
 *
 * Endpoints for monitoring and debugging workflow executions
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');
const Joi = require('joi');

/**
 * GET /api/workflow-executions
 * List workflow executions with filtering
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { workflowId, status, limit = 50, offset = 0, startDate, endDate } = req.query;

        let queryStr = `
            SELECT we.*, w.name as workflow_name
            FROM workflow_executions we
            JOIN workflows w ON we.workflow_id = w.id
            WHERE we.tenant_id = $1
        `;

        const params = [req.user.tenant_id];
        let paramIndex = 2;

        if (workflowId) {
            queryStr += ` AND we.workflow_id = $${paramIndex++}`;
            params.push(parseInt(workflowId));
        }

        if (status) {
            queryStr += ` AND we.status = $${paramIndex++}`;
            params.push(status);
        }

        if (startDate) {
            queryStr += ` AND we.created_at >= $${paramIndex++}`;
            params.push(startDate);
        }

        if (endDate) {
            queryStr += ` AND we.created_at <= $${paramIndex++}`;
            params.push(endDate);
        }

        queryStr += ` ORDER BY we.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(queryStr, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM workflow_executions WHERE tenant_id = $1';
        const countParams = [req.user.tenant_id];
        let countParamIndex = 2;

        if (workflowId) {
            countQuery += ` AND workflow_id = $${countParamIndex++}`;
            countParams.push(parseInt(workflowId));
        }

        if (status) {
            countQuery += ` AND status = $${countParamIndex++}`;
            countParams.push(status);
        }

        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: offset + result.rows.length < total
            }
        });

    } catch (error) {
        logger.error('[WorkflowExecutions] Failed to list executions', {
            error: error.message,
            tenantId: req.user.tenant_id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve workflow executions',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/workflow-executions/:id
 * Get single execution with detailed logs
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const executionId = parseInt(req.params.id);

        if (isNaN(executionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid execution ID'
            });
        }

        // Get execution record
        const executionResult = await query(
            `SELECT we.*, w.name as workflow_name, w.trigger_event, w.conditions, w.actions
             FROM workflow_executions we
             JOIN workflows w ON we.workflow_id = w.id
             WHERE we.id = $1 AND we.tenant_id = $2`,
            [executionId, req.user.tenant_id]
        );

        if (executionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found'
            });
        }

        const execution = executionResult.rows[0];

        // Get execution logs
        const logsResult = await query(
            `SELECT * FROM workflow_execution_logs
             WHERE execution_id = $1
             ORDER BY step_number ASC`,
            [executionId]
        );

        execution.logs = logsResult.rows;

        res.json({
            success: true,
            data: execution
        });

    } catch (error) {
        logger.error('[WorkflowExecutions] Failed to get execution', {
            error: error.message,
            executionId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve execution details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/workflow-executions/:id/logs
 * Get execution logs (step-by-step)
 */
router.get('/:id/logs', authenticate, async (req, res) => {
    try {
        const executionId = parseInt(req.params.id);

        if (isNaN(executionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid execution ID'
            });
        }

        // Verify execution belongs to tenant
        const executionResult = await query(
            'SELECT tenant_id FROM workflow_executions WHERE id = $1',
            [executionId]
        );

        if (executionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found'
            });
        }

        if (executionResult.rows[0].tenant_id !== req.user.tenant_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get logs
        const logsResult = await query(
            `SELECT * FROM workflow_execution_logs
             WHERE execution_id = $1
             ORDER BY step_number ASC`,
            [executionId]
        );

        res.json({
            success: true,
            data: logsResult.rows
        });

    } catch (error) {
        logger.error('[WorkflowExecutions] Failed to get execution logs', {
            error: error.message,
            executionId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve execution logs',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/workflow-executions/:id/retry
 * Retry a failed execution
 */
router.post('/:id/retry', authenticate, async (req, res) => {
    try {
        const executionId = parseInt(req.params.id);

        if (isNaN(executionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid execution ID'
            });
        }

        // Get execution and verify it failed
        const executionResult = await query(
            `SELECT we.*, w.*
             FROM workflow_executions we
             JOIN workflows w ON we.workflow_id = w.id
             WHERE we.id = $1 AND we.tenant_id = $2`,
            [executionId, req.user.tenant_id]
        );

        if (executionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found'
            });
        }

        const execution = executionResult.rows[0];

        if (execution.status !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Only failed executions can be retried'
            });
        }

        // Re-execute workflow
        const WorkflowEngineService = require('../../services/WorkflowEngineService');
        const triggerData = execution.trigger_data;

        const newExecutionId = await WorkflowEngineService.executeWorkflow(execution, triggerData);

        logger.info('[WorkflowExecutions] Manual retry triggered', {
            originalExecutionId: executionId,
            newExecutionId,
            workflowId: execution.workflow_id,
            tenantId: req.user.tenant_id
        });

        res.json({
            success: true,
            message: 'Workflow retry initiated',
            data: {
                originalExecutionId: executionId,
                newExecutionId
            }
        });

    } catch (error) {
        logger.error('[WorkflowExecutions] Failed to retry execution', {
            error: error.message,
            executionId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retry execution',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/workflow-executions/stats/overview
 * Get execution statistics overview
 */
router.get('/stats/overview', authenticate, async (req, res) => {
    try {
        const { workflowId, startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [req.user.tenant_id];
        let paramIndex = 2;

        if (startDate) {
            dateFilter += ` AND created_at >= $${paramIndex++}`;
            params.push(startDate);
        }

        if (endDate) {
            dateFilter += ` AND created_at <= $${paramIndex++}`;
            params.push(endDate);
        }

        if (workflowId) {
            dateFilter += ` AND workflow_id = $${paramIndex++}`;
            params.push(parseInt(workflowId));
        }

        // Get status counts
        const statusStats = await query(
            `SELECT
                status,
                COUNT(*) as count,
                AVG(duration_ms) as avg_duration
             FROM workflow_executions
             WHERE tenant_id = $1 ${dateFilter}
             GROUP BY status`,
            params
        );

        // Get daily execution trend (last 30 days)
        const trendStats = await query(
            `SELECT
                DATE(created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
             FROM workflow_executions
             WHERE tenant_id = $1
             AND created_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [req.user.tenant_id]
        );

        // Get most active workflows
        const topWorkflows = await query(
            `SELECT
                w.id,
                w.name,
                COUNT(we.id) as execution_count,
                SUM(CASE WHEN we.status = 'completed' THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN we.status = 'failed' THEN 1 ELSE 0 END) as failure_count,
                AVG(we.duration_ms) as avg_duration
             FROM workflows w
             JOIN workflow_executions we ON w.id = we.workflow_id
             WHERE w.tenant_id = $1 ${dateFilter.replace('created_at', 'we.created_at')}
             GROUP BY w.id, w.name
             ORDER BY execution_count DESC
             LIMIT 10`,
            params
        );

        res.json({
            success: true,
            data: {
                statusBreakdown: statusStats.rows,
                dailyTrend: trendStats.rows,
                topWorkflows: topWorkflows.rows
            }
        });

    } catch (error) {
        logger.error('[WorkflowExecutions] Failed to get stats', {
            error: error.message,
            tenantId: req.user.tenant_id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve execution statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * DELETE /api/workflow-executions/:id
 * Delete an execution record (admin only)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const executionId = parseInt(req.params.id);

        if (isNaN(executionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid execution ID'
            });
        }

        // Verify execution belongs to tenant
        const executionResult = await query(
            'SELECT tenant_id FROM workflow_executions WHERE id = $1',
            [executionId]
        );

        if (executionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found'
            });
        }

        if (executionResult.rows[0].tenant_id !== req.user.tenant_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Delete execution (logs will cascade delete)
        await query('DELETE FROM workflow_executions WHERE id = $1', [executionId]);

        logger.info('[WorkflowExecutions] Execution deleted', {
            executionId,
            tenantId: req.user.tenant_id
        });

        res.json({
            success: true,
            message: 'Execution deleted successfully'
        });

    } catch (error) {
        logger.error('[WorkflowExecutions] Failed to delete execution', {
            error: error.message,
            executionId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to delete execution',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
