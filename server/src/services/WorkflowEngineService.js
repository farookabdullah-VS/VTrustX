/**
 * Enhanced Workflow Engine Service
 *
 * Consolidates and enhances the existing workflow engines with:
 * - Execution tracking and history
 * - Retry logic with exponential backoff
 * - Advanced condition evaluation (OR/AND, nested)
 * - More action types and integrations
 * - Step-by-step logging for debugging
 * - Error handling and recovery
 */

const db = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class WorkflowEngineService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelays = [60000, 300000, 900000]; // 1min, 5min, 15min
    }

    /**
     * Execute workflows triggered by an event
     * @param {string} triggerEvent - Event type (submission_completed, ticket_created, etc.)
     * @param {object} triggerData - Event payload data
     * @param {number} tenantId - Tenant ID for multi-tenant isolation
     * @returns {Promise<Array>} Array of execution IDs
     */
    async executeTriggeredWorkflows(triggerEvent, triggerData, tenantId) {
        try {
            // Find active workflows for this trigger event
            const workflows = await db.query(
                `SELECT * FROM workflows
                 WHERE tenant_id = $1
                 AND trigger_event = $2
                 AND is_active = true
                 ORDER BY created_at ASC`,
                [tenantId, triggerEvent]
            );

            if (workflows.rows.length === 0) {
                logger.debug('[WorkflowEngine] No workflows found for trigger', {
                    triggerEvent,
                    tenantId
                });
                return [];
            }

            logger.info('[WorkflowEngine] Executing workflows', {
                triggerEvent,
                workflowCount: workflows.rows.length,
                tenantId
            });

            // Execute each workflow asynchronously
            const executionPromises = workflows.rows.map(workflow =>
                this.executeWorkflow(workflow, triggerData).catch(err => {
                    logger.error('[WorkflowEngine] Workflow execution failed', {
                        workflowId: workflow.id,
                        error: err.message,
                        stack: err.stack
                    });
                    return null;
                })
            );

            const executionIds = await Promise.all(executionPromises);
            return executionIds.filter(id => id !== null);

        } catch (error) {
            logger.error('[WorkflowEngine] Failed to execute triggered workflows', {
                triggerEvent,
                tenantId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute a single workflow
     * @param {object} workflow - Workflow configuration
     * @param {object} triggerData - Trigger data
     * @returns {Promise<number>} Execution ID
     */
    async executeWorkflow(workflow, triggerData) {
        const startTime = Date.now();

        // Create execution record
        const execution = await db.query(
            `INSERT INTO workflow_executions
             (tenant_id, workflow_id, trigger_event, trigger_data, status, started_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [
                workflow.tenant_id,
                workflow.id,
                workflow.trigger_event,
                JSON.stringify(triggerData),
                'running'
            ]
        );

        const executionId = execution.rows[0].id;

        try {
            logger.info('[WorkflowEngine] Starting workflow execution', {
                executionId,
                workflowId: workflow.id,
                workflowName: workflow.name
            });

            // Step 1: Evaluate conditions
            const conditionsPassed = await this.evaluateConditions(
                workflow.conditions || [],
                triggerData,
                executionId,
                1
            );

            if (!conditionsPassed) {
                // Conditions not met - mark as completed but skipped
                await this.completeExecution(executionId, 'completed', {
                    conditionsPassed: false,
                    message: 'Workflow conditions not met, skipped execution'
                }, startTime);

                logger.info('[WorkflowEngine] Workflow conditions not met', {
                    executionId,
                    workflowId: workflow.id
                });

                return executionId;
            }

            // Step 2: Execute actions
            const actionResults = await this.executeActions(
                workflow.actions || [],
                triggerData,
                workflow.tenant_id,
                executionId,
                2 // Starting step number after condition check
            );

            // Step 3: Complete execution
            const duration = Date.now() - startTime;
            await this.completeExecution(executionId, 'completed', {
                conditionsPassed: true,
                actionsExecuted: actionResults.length,
                actionResults
            }, startTime);

            // Update workflow statistics
            await this.updateWorkflowStats(workflow.id, true, duration);

            logger.info('[WorkflowEngine] Workflow execution completed', {
                executionId,
                workflowId: workflow.id,
                duration,
                actionsExecuted: actionResults.length
            });

            return executionId;

        } catch (error) {
            // Mark execution as failed
            const duration = Date.now() - startTime;
            await this.failExecution(executionId, error, startTime);

            // Update workflow statistics
            await this.updateWorkflowStats(workflow.id, false, duration);

            // Schedule retry if within retry limit
            await this.scheduleRetry(workflow, triggerData, executionId);

            logger.error('[WorkflowEngine] Workflow execution failed', {
                executionId,
                workflowId: workflow.id,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Evaluate workflow conditions
     * @param {Array} conditions - Array of condition objects
     * @param {object} data - Data to evaluate against
     * @param {number} executionId - Execution ID for logging
     * @param {number} startStepNumber - Starting step number
     * @returns {Promise<boolean>} True if conditions pass
     */
    async evaluateConditions(conditions, data, executionId, startStepNumber) {
        if (!conditions || conditions.length === 0) {
            return true; // No conditions = always pass
        }

        const logId = await this.logStep(executionId, startStepNumber, 'condition', 'Evaluate Conditions', 'running', conditions);

        try {
            // Support for AND/OR logic
            const logicOperator = conditions[0]?.logic || 'AND';
            let result = false;

            if (logicOperator === 'AND') {
                result = conditions.every(condition => this.evaluateCondition(condition, data));
            } else if (logicOperator === 'OR') {
                result = conditions.some(condition => this.evaluateCondition(condition, data));
            }

            await this.completeStep(logId, 'completed', { result, evaluatedConditions: conditions.length });

            return result;

        } catch (error) {
            await this.completeStep(logId, 'failed', null, error.message);
            throw error;
        }
    }

    /**
     * Evaluate a single condition
     * @param {object} condition - Condition object
     * @param {object} data - Data to evaluate
     * @returns {boolean} True if condition passes
     */
    evaluateCondition(condition, data) {
        const { field, operator, value } = condition;

        // Get field value from data (supports nested paths like "user.age")
        const actualValue = this.getNestedValue(data, field);

        switch (operator) {
            case 'equals':
            case '==':
                return actualValue == value;

            case 'not_equals':
            case '!=':
                return actualValue != value;

            case 'contains':
                return String(actualValue).toLowerCase().includes(String(value).toLowerCase());

            case 'not_contains':
                return !String(actualValue).toLowerCase().includes(String(value).toLowerCase());

            case 'starts_with':
                return String(actualValue).toLowerCase().startsWith(String(value).toLowerCase());

            case 'ends_with':
                return String(actualValue).toLowerCase().endsWith(String(value).toLowerCase());

            case 'greater_than':
            case '>':
                return Number(actualValue) > Number(value);

            case 'less_than':
            case '<':
                return Number(actualValue) < Number(value);

            case 'greater_than_or_equal':
            case '>=':
                return Number(actualValue) >= Number(value);

            case 'less_than_or_equal':
            case '<=':
                return Number(actualValue) <= Number(value);

            case 'is_empty':
                return !actualValue || actualValue === '' || (Array.isArray(actualValue) && actualValue.length === 0);

            case 'is_not_empty':
                return actualValue && actualValue !== '' && (!Array.isArray(actualValue) || actualValue.length > 0);

            case 'matches_regex':
                try {
                    const regex = new RegExp(value);
                    return regex.test(String(actualValue));
                } catch (e) {
                    logger.error('[WorkflowEngine] Invalid regex pattern', { pattern: value, error: e.message });
                    return false;
                }

            case 'in':
                return Array.isArray(value) && value.includes(actualValue);

            case 'not_in':
                return Array.isArray(value) && !value.includes(actualValue);

            default:
                logger.warn('[WorkflowEngine] Unknown operator', { operator });
                return false;
        }
    }

    /**
     * Execute workflow actions
     * @param {Array} actions - Array of action objects
     * @param {object} data - Trigger data
     * @param {number} tenantId - Tenant ID
     * @param {number} executionId - Execution ID
     * @param {number} startStepNumber - Starting step number
     * @returns {Promise<Array>} Array of action results
     */
    async executeActions(actions, data, tenantId, executionId, startStepNumber) {
        const results = [];
        let stepNumber = startStepNumber;

        for (const action of actions) {
            const logId = await this.logStep(
                executionId,
                stepNumber++,
                'action',
                action.type,
                'running',
                action
            );

            try {
                const result = await this.executeAction(action, data, tenantId);
                await this.completeStep(logId, 'completed', result);
                results.push({ action: action.type, success: true, result });

            } catch (error) {
                await this.completeStep(logId, 'failed', null, error.message);
                logger.error('[WorkflowEngine] Action execution failed', {
                    action: action.type,
                    error: error.message
                });

                // Continue with other actions unless action is marked as critical
                if (action.critical) {
                    throw error;
                }

                results.push({ action: action.type, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Execute a single action
     * @param {object} action - Action configuration
     * @param {object} data - Trigger data
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} Action result
     */
    async executeAction(action, data, tenantId) {
        const { type, config } = action;

        // Replace template variables in config (e.g., {{firstName}})
        const processedConfig = this.processTemplateVariables(config, data);

        switch (type) {
            case 'send_email':
                return await this.actionSendEmail(processedConfig, tenantId);

            case 'create_ticket':
                return await this.actionCreateTicket(processedConfig, data, tenantId);

            case 'update_field':
                return await this.actionUpdateField(processedConfig, tenantId);

            case 'send_notification':
                return await this.actionSendNotification(processedConfig, tenantId);

            case 'webhook':
            case 'call_webhook':
                return await this.actionCallWebhook(processedConfig, data);

            case 'update_contact':
                return await this.actionUpdateContact(processedConfig, tenantId);

            case 'add_tag':
                return await this.actionAddTag(processedConfig, tenantId);

            case 'delay':
                return await this.actionDelay(processedConfig);

            case 'sync_integration':
                return await this.actionSyncIntegration(processedConfig, data, tenantId);

            default:
                throw new Error(`Unknown action type: ${type}`);
        }
    }

    /**
     * Action: Send Email
     */
    async actionSendEmail(config, tenantId) {
        const emailService = require('./emailService');

        const { to, subject, body, from } = config;

        // Use email service to send
        await emailService.sendTransactionalEmail({
            to,
            subject,
            body,
            from: from || undefined,
            tenantId
        });

        return { sent: true, to, subject };
    }

    /**
     * Action: Create Ticket
     */
    async actionCreateTicket(config, data, tenantId) {
        const { title, description, priority, assignee } = config;

        const result = await db.query(
            `INSERT INTO tickets (tenant_id, title, description, priority, assigned_to, status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'open', NOW())
             RETURNING id`,
            [tenantId, title, description, priority || 'medium', assignee || null]
        );

        return { ticketId: result.rows[0].id, title };
    }

    /**
     * Action: Update Field
     */
    async actionUpdateField(config, tenantId) {
        const { entity, entityId, field, value } = config;

        // Update field in specified entity table
        const tableName = this.getTableName(entity);
        await db.query(
            `UPDATE ${tableName} SET ${field} = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
            [value, entityId, tenantId]
        );

        return { updated: true, entity, entityId, field, value };
    }

    /**
     * Action: Send Notification
     */
    async actionSendNotification(config, tenantId) {
        const { userId, title, message, type } = config;

        await db.query(
            `INSERT INTO notifications (tenant_id, user_id, title, message, type, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, false, NOW())`,
            [tenantId, userId, title, message, type || 'info']
        );

        return { sent: true, userId, title };
    }

    /**
     * Action: Call Webhook
     */
    async actionCallWebhook(config, data) {
        const axios = require('axios');
        const { url, method, headers, body } = config;

        const response = await axios({
            method: method || 'POST',
            url,
            headers: headers || { 'Content-Type': 'application/json' },
            data: body || data
        });

        return { status: response.status, data: response.data };
    }

    /**
     * Action: Update Contact
     */
    async actionUpdateContact(config, tenantId) {
        const { contactId, updates } = config;

        const updateFields = Object.keys(updates).map((key, i) => `${key} = $${i + 3}`).join(', ');
        const updateValues = Object.values(updates);

        await db.query(
            `UPDATE contacts SET ${updateFields}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
            [contactId, tenantId, ...updateValues]
        );

        return { updated: true, contactId, fields: Object.keys(updates) };
    }

    /**
     * Action: Add Tag
     */
    async actionAddTag(config, tenantId) {
        const { entity, entityId, tag } = config;

        const tableName = this.getTableName(entity);
        await db.query(
            `UPDATE ${tableName}
             SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), $1)
             WHERE id = $2 AND tenant_id = $3 AND NOT ($1 = ANY(COALESCE(tags, ARRAY[]::text[])))`,
            [tag, entityId, tenantId]
        );

        return { added: true, entity, entityId, tag };
    }

    /**
     * Action: Delay
     */
    async actionDelay(config) {
        const { duration } = config; // Duration in milliseconds

        await new Promise(resolve => setTimeout(resolve, duration));

        return { delayed: true, duration };
    }

    /**
     * Action: Sync Integration
     */
    async actionSyncIntegration(config, data, tenantId) {
        const { integration, action: integrationAction, payload } = config;

        // TODO: Implement integration-specific logic
        // This would call CRM APIs, marketing automation tools, etc.

        logger.info('[WorkflowEngine] Integration sync triggered', {
            integration,
            action: integrationAction,
            tenantId
        });

        return { synced: true, integration, action: integrationAction };
    }

    /**
     * Complete an execution record
     */
    async completeExecution(executionId, status, result, startTime) {
        const duration = Date.now() - startTime;

        await db.query(
            `UPDATE workflow_executions
             SET status = $1, result = $2, completed_at = NOW(), duration_ms = $3
             WHERE id = $4`,
            [status, JSON.stringify(result), duration, executionId]
        );
    }

    /**
     * Mark execution as failed
     */
    async failExecution(executionId, error, startTime) {
        const duration = Date.now() - startTime;

        await db.query(
            `UPDATE workflow_executions
             SET status = 'failed', error = $1, error_stack = $2, completed_at = NOW(), duration_ms = $3
             WHERE id = $4`,
            [error.message, error.stack, duration, executionId]
        );
    }

    /**
     * Schedule a retry for failed execution
     */
    async scheduleRetry(workflow, triggerData, executionId) {
        const execution = await db.query(
            'SELECT retry_count FROM workflow_executions WHERE id = $1',
            [executionId]
        );

        const retryCount = execution.rows[0].retry_count;

        if (retryCount < this.maxRetries) {
            const nextRetryDelay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
            const nextRetryAt = new Date(Date.now() + nextRetryDelay);

            await db.query(
                `UPDATE workflow_executions
                 SET status = 'retrying', retry_count = retry_count + 1, next_retry_at = $1
                 WHERE id = $2`,
                [nextRetryAt, executionId]
            );

            logger.info('[WorkflowEngine] Retry scheduled', {
                executionId,
                retryCount: retryCount + 1,
                nextRetryAt
            });
        }
    }

    /**
     * Update workflow statistics
     */
    async updateWorkflowStats(workflowId, success, duration) {
        if (success) {
            await db.query(
                `UPDATE workflows
                 SET execution_count = execution_count + 1,
                     success_count = success_count + 1,
                     last_executed_at = NOW(),
                     average_duration_ms = CASE
                         WHEN average_duration_ms IS NULL THEN $1
                         ELSE (average_duration_ms * success_count + $1) / (success_count + 1)
                     END
                 WHERE id = $2`,
                [duration, workflowId]
            );
        } else {
            await db.query(
                `UPDATE workflows
                 SET execution_count = execution_count + 1,
                     failure_count = failure_count + 1,
                     last_executed_at = NOW()
                 WHERE id = $1`,
                [workflowId]
            );
        }
    }

    /**
     * Log a workflow step
     */
    async logStep(executionId, stepNumber, stepType, stepName, status, inputData) {
        const result = await db.query(
            `INSERT INTO workflow_execution_logs
             (execution_id, step_number, step_type, step_name, status, input_data, started_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING id`,
            [executionId, stepNumber, stepType, stepName, status, JSON.stringify(inputData)]
        );

        return result.rows[0].id;
    }

    /**
     * Complete a workflow step log
     */
    async completeStep(logId, status, outputData, error = null) {
        const now = new Date();
        const log = await db.query('SELECT started_at FROM workflow_execution_logs WHERE id = $1', [logId]);
        const duration = log.rows[0].started_at ? now - new Date(log.rows[0].started_at) : 0;

        await db.query(
            `UPDATE workflow_execution_logs
             SET status = $1, output_data = $2, error = $3, completed_at = NOW(), duration_ms = $4
             WHERE id = $5`,
            [status, JSON.stringify(outputData), error, duration, logId]
        );
    }

    /**
     * Get nested value from object using dot notation
     * @example getNestedValue({user: {age: 25}}, 'user.age') => 25
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Process template variables in config (e.g., {{firstName}})
     */
    processTemplateVariables(config, data) {
        const configStr = JSON.stringify(config);
        const processed = configStr.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(data, path.trim());
            return value !== undefined ? value : match;
        });
        return JSON.parse(processed);
    }

    /**
     * Get table name for entity type
     */
    getTableName(entity) {
        const tableMap = {
            ticket: 'tickets',
            contact: 'contacts',
            form: 'forms',
            submission: 'submissions',
            user: 'users'
        };
        return tableMap[entity] || entity;
    }
}

// Export singleton instance
module.exports = new WorkflowEngineService();
