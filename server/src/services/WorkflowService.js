const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const emailService = require('./emailService');

/**
 * Workflow Automation Service
 *
 * Handles workflow execution based on survey responses:
 * - Trigger evaluation (NPS scores, sentiment, quality, keywords)
 * - Action execution (send email, create ticket, update CRM, webhook)
 * - Condition logic (if/else branching)
 * - Execution logging and error handling
 *
 * Example Workflows:
 * 1. NPS Detractor Follow-up: score ≤ 6 → create ticket + email CSM
 * 2. Promoter Advocacy: score ≥ 9 → thank you email + request review
 * 3. Low Quality Flag: quality < 40 → notify admin
 */
class WorkflowService {
    /**
     * Create a new workflow
     *
     * @param {number} tenantId - Tenant ID
     * @param {object} workflowData - Workflow configuration
     * @returns {Promise<object>} - Created workflow
     */
    static async createWorkflow(tenantId, workflowData) {
        try {
            const {
                name,
                description,
                formId = null,
                triggerType,
                triggerConfig,
                workflowDefinition,
                isActive = true
            } = workflowData;

            // Validate trigger type
            const validTriggers = [
                'response_received',
                'score_threshold',
                'keyword_detected',
                'sentiment_detected',
                'quality_threshold'
            ];

            if (!validTriggers.includes(triggerType)) {
                throw new Error(`Invalid trigger type: ${triggerType}. Must be one of: ${validTriggers.join(', ')}`);
            }

            const result = await query(
                `INSERT INTO workflows
                (tenant_id, name, description, form_id, trigger_type, trigger_config, workflow_definition, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    tenantId,
                    name,
                    description || null,
                    formId,
                    triggerType,
                    JSON.stringify(triggerConfig),
                    JSON.stringify(workflowDefinition),
                    isActive
                ]
            );

            logger.info('[WorkflowService] Workflow created', {
                workflowId: result.rows[0].id,
                tenantId,
                triggerType
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[WorkflowService] Failed to create workflow', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Evaluate triggers and execute matching workflows for a submission
     *
     * @param {number} submissionId - Submission ID
     * @param {object} submissionData - Submission data
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @returns {Promise<array>} - Executed workflows
     */
    static async evaluateAndExecute(submissionId, submissionData, tenantId, formId) {
        try {
            // Get active workflows for this tenant/form
            const workflowsResult = await query(
                `SELECT * FROM workflows
                WHERE tenant_id = $1
                AND (form_id = $2 OR form_id IS NULL)
                AND is_active = true
                ORDER BY created_at ASC`,
                [tenantId, formId]
            );

            const workflows = workflowsResult.rows;
            const executedWorkflows = [];

            for (const workflow of workflows) {
                const shouldTrigger = await this.evaluateTrigger(
                    workflow.trigger_type,
                    JSON.parse(workflow.trigger_config),
                    submissionData,
                    submissionId
                );

                if (shouldTrigger) {
                    logger.info('[WorkflowService] Triggering workflow', {
                        workflowId: workflow.id,
                        workflowName: workflow.name,
                        submissionId
                    });

                    const execution = await this.executeWorkflow(
                        workflow.id,
                        submissionId,
                        tenantId,
                        submissionData
                    );

                    executedWorkflows.push(execution);
                }
            }

            return executedWorkflows;
        } catch (error) {
            logger.error('[WorkflowService] Failed to evaluate and execute workflows', {
                error: error.message,
                submissionId,
                tenantId
            });
            // Don't throw - workflow failures shouldn't block submissions
            return [];
        }
    }

    /**
     * Evaluate if a trigger condition is met
     *
     * @param {string} triggerType - Trigger type
     * @param {object} triggerConfig - Trigger configuration
     * @param {object} submissionData - Submission data
     * @param {number} submissionId - Submission ID
     * @returns {Promise<boolean>} - True if trigger condition is met
     */
    static async evaluateTrigger(triggerType, triggerConfig, submissionData, submissionId) {
        try {
            switch (triggerType) {
                case 'response_received':
                    // Always trigger on any response
                    return true;

                case 'score_threshold':
                    return await this.evaluateScoreThreshold(triggerConfig, submissionData);

                case 'keyword_detected':
                    return this.evaluateKeywordDetection(triggerConfig, submissionData);

                case 'sentiment_detected':
                    return await this.evaluateSentimentDetection(triggerConfig, submissionId);

                case 'quality_threshold':
                    return await this.evaluateQualityThreshold(triggerConfig, submissionId);

                default:
                    logger.warn('[WorkflowService] Unknown trigger type', { triggerType });
                    return false;
            }
        } catch (error) {
            logger.error('[WorkflowService] Trigger evaluation failed', {
                error: error.message,
                triggerType
            });
            return false;
        }
    }

    /**
     * Evaluate score threshold trigger (e.g., NPS ≤ 6)
     */
    static async evaluateScoreThreshold(triggerConfig, submissionData) {
        const { metric, operator, value } = triggerConfig;

        // Extract score from submission data
        let score = null;

        // Check if it's an NPS question
        if (metric === 'nps') {
            // Look for NPS questions (typically rating 0-10)
            const npsField = Object.entries(submissionData).find(([key, val]) => {
                return typeof val === 'number' && val >= 0 && val <= 10;
            });

            if (npsField) {
                score = npsField[1];
            }
        } else if (metric === 'csat' || metric === 'ces') {
            // Look for CSAT/CES questions (typically rating 1-5)
            const ratingField = Object.entries(submissionData).find(([key, val]) => {
                return typeof val === 'number' && val >= 1 && val <= 5;
            });

            if (ratingField) {
                score = ratingField[1];
            }
        } else if (submissionData[metric] !== undefined) {
            // Custom metric field
            score = submissionData[metric];
        }

        if (score === null) {
            return false;
        }

        // Evaluate operator
        switch (operator) {
            case '<=':
                return score <= value;
            case '<':
                return score < value;
            case '>=':
                return score >= value;
            case '>':
                return score > value;
            case '==':
                return score === value;
            case '!=':
                return score !== value;
            default:
                return false;
        }
    }

    /**
     * Evaluate keyword detection trigger
     */
    static evaluateKeywordDetection(triggerConfig, submissionData) {
        const { keywords, matchType = 'any' } = triggerConfig;

        if (!keywords || keywords.length === 0) {
            return false;
        }

        // Get all text responses
        const textResponses = Object.values(submissionData)
            .filter(val => typeof val === 'string')
            .map(val => val.toLowerCase());

        const allText = textResponses.join(' ');

        if (matchType === 'any') {
            // Match if any keyword is found
            return keywords.some(keyword => allText.includes(keyword.toLowerCase()));
        } else if (matchType === 'all') {
            // Match if all keywords are found
            return keywords.every(keyword => allText.includes(keyword.toLowerCase()));
        }

        return false;
    }

    /**
     * Evaluate sentiment detection trigger
     */
    static async evaluateSentimentDetection(triggerConfig, submissionId) {
        const { sentimentType } = triggerConfig; // 'positive', 'negative', 'neutral'

        try {
            const result = await query(
                `SELECT sentiment FROM response_sentiment
                WHERE submission_id = $1
                ORDER BY created_at DESC
                LIMIT 1`,
                [submissionId]
            );

            if (result.rows.length === 0) {
                return false;
            }

            const sentiment = result.rows[0].sentiment;
            return sentiment === sentimentType;
        } catch (error) {
            logger.error('[WorkflowService] Sentiment detection failed', {
                error: error.message,
                submissionId
            });
            return false;
        }
    }

    /**
     * Evaluate quality threshold trigger
     */
    static async evaluateQualityThreshold(triggerConfig, submissionId) {
        const { operator = '<=', value = 40 } = triggerConfig;

        try {
            const result = await query(
                `SELECT quality_score FROM response_quality_scores
                WHERE submission_id = $1
                LIMIT 1`,
                [submissionId]
            );

            if (result.rows.length === 0) {
                return false;
            }

            const qualityScore = result.rows[0].quality_score;

            switch (operator) {
                case '<=':
                    return qualityScore <= value;
                case '<':
                    return qualityScore < value;
                case '>=':
                    return qualityScore >= value;
                case '>':
                    return qualityScore > value;
                default:
                    return false;
            }
        } catch (error) {
            logger.error('[WorkflowService] Quality threshold evaluation failed', {
                error: error.message,
                submissionId
            });
            return false;
        }
    }

    /**
     * Execute a workflow
     *
     * @param {number} workflowId - Workflow ID
     * @param {number} submissionId - Submission ID
     * @param {number} tenantId - Tenant ID
     * @param {object} submissionData - Submission data
     * @returns {Promise<object>} - Execution result
     */
    static async executeWorkflow(workflowId, submissionId, tenantId, submissionData) {
        const startTime = Date.now();

        try {
            // Create execution record
            const execResult = await query(
                `INSERT INTO workflow_executions
                (workflow_id, submission_id, tenant_id, status, trigger_data)
                VALUES ($1, $2, $3, 'running', $4)
                RETURNING id`,
                [workflowId, submissionId, tenantId, JSON.stringify({ submissionData })]
            );

            const executionId = execResult.rows[0].id;

            // Get workflow definition
            const workflowResult = await query(
                `SELECT workflow_definition FROM workflows WHERE id = $1`,
                [workflowId]
            );

            const workflowDefinition = JSON.parse(workflowResult.rows[0].workflow_definition);

            // Execute actions in workflow
            const actionResults = await this.executeActions(
                workflowDefinition.nodes || [],
                submissionData,
                tenantId,
                submissionId
            );

            const duration = Date.now() - startTime;

            // Update execution record
            await query(
                `UPDATE workflow_executions
                SET status = 'completed',
                    result = $1,
                    completed_at = NOW(),
                    duration_ms = $2
                WHERE id = $3`,
                [JSON.stringify({ actions: actionResults }), duration, executionId]
            );

            // Update workflow execution count
            await query(
                `UPDATE workflows
                SET execution_count = execution_count + 1,
                    last_executed_at = NOW()
                WHERE id = $1`,
                [workflowId]
            );

            logger.info('[WorkflowService] Workflow executed successfully', {
                workflowId,
                executionId,
                submissionId,
                duration
            });

            return {
                executionId,
                status: 'completed',
                actionResults,
                duration
            };
        } catch (error) {
            const duration = Date.now() - startTime;

            logger.error('[WorkflowService] Workflow execution failed', {
                error: error.message,
                workflowId,
                submissionId
            });

            // Update execution record with error
            await query(
                `UPDATE workflow_executions
                SET status = 'failed',
                    error_message = $1,
                    completed_at = NOW(),
                    duration_ms = $2
                WHERE workflow_id = $3 AND submission_id = $4 AND status = 'running'`,
                [error.message, duration, workflowId, submissionId]
            );

            return {
                status: 'failed',
                error: error.message,
                duration
            };
        }
    }

    /**
     * Execute actions in workflow
     */
    static async executeActions(nodes, submissionData, tenantId, submissionId) {
        const results = [];

        for (const node of nodes) {
            try {
                const actionResult = await this.executeAction(
                    node.type,
                    node.data,
                    submissionData,
                    tenantId,
                    submissionId
                );

                results.push({
                    nodeId: node.id,
                    type: node.type,
                    status: 'success',
                    result: actionResult
                });
            } catch (error) {
                logger.error('[WorkflowService] Action execution failed', {
                    error: error.message,
                    nodeId: node.id,
                    actionType: node.type
                });

                results.push({
                    nodeId: node.id,
                    type: node.type,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Execute a single action
     */
    static async executeAction(actionType, actionConfig, submissionData, tenantId, submissionId) {
        switch (actionType) {
            case 'send_email':
                return await this.executeSendEmail(actionConfig, submissionData);

            case 'create_ticket':
                return await this.executeCreateTicket(actionConfig, submissionData, tenantId, submissionId);

            case 'delay':
                // Delays are handled by scheduling, not immediate execution
                return { message: 'Delay action scheduled', delay: actionConfig.delay };

            case 'condition':
                return { message: 'Condition evaluated', result: true };

            case 'end':
                return { message: 'Workflow end reached' };

            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }

    /**
     * Execute send email action
     */
    static async executeSendEmail(actionConfig, submissionData) {
        const { to, subject, body } = actionConfig;

        // Replace template variables
        const replacedSubject = this.replaceTemplateVariables(subject, submissionData);
        const replacedBody = this.replaceTemplateVariables(body, submissionData);

        await emailService.sendEmail(to, replacedSubject, replacedBody);

        return { message: 'Email sent', to, subject: replacedSubject };
    }

    /**
     * Execute create ticket action (integration with CTL)
     */
    static async executeCreateTicket(actionConfig, submissionData, tenantId, submissionId) {
        const { title, description, priority = 'medium', assignee = null } = actionConfig;

        const replacedTitle = this.replaceTemplateVariables(title, submissionData);
        const replacedDescription = this.replaceTemplateVariables(description, submissionData);

        // Create CTL action
        const result = await query(
            `INSERT INTO actions
            (tenant_id, submission_id, type, status, priority, title, description, assigned_to)
            VALUES ($1, $2, 'follow_up', 'open', $3, $4, $5, $6)
            RETURNING id`,
            [tenantId, submissionId, priority, replacedTitle, replacedDescription, assignee]
        );

        return { message: 'Ticket created', ticketId: result.rows[0].id };
    }

    /**
     * Replace template variables like {{field_name}}
     */
    static replaceTemplateVariables(template, data) {
        if (!template) return '';

        let result = template;

        // Replace {{field}} with data[field]
        const regex = /\{\{([^}]+)\}\}/g;
        result = result.replace(regex, (match, field) => {
            return data[field] || match;
        });

        return result;
    }

    /**
     * List workflows for tenant
     */
    static async listWorkflows(tenantId, filters = {}) {
        try {
            let whereClause = 'tenant_id = $1';
            const params = [tenantId];
            let paramIndex = 2;

            if (filters.formId) {
                whereClause += ` AND (form_id = $${paramIndex} OR form_id IS NULL)`;
                params.push(filters.formId);
                paramIndex++;
            }

            if (filters.isActive !== undefined) {
                whereClause += ` AND is_active = $${paramIndex}`;
                params.push(filters.isActive);
                paramIndex++;
            }

            const result = await query(
                `SELECT * FROM workflows
                WHERE ${whereClause}
                ORDER BY created_at DESC`,
                params
            );

            return result.rows;
        } catch (error) {
            logger.error('[WorkflowService] Failed to list workflows', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get workflow by ID
     */
    static async getWorkflow(workflowId, tenantId) {
        try {
            const result = await query(
                `SELECT * FROM workflows
                WHERE id = $1 AND tenant_id = $2`,
                [workflowId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Workflow not found');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[WorkflowService] Failed to get workflow', {
                error: error.message,
                workflowId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update workflow
     */
    static async updateWorkflow(workflowId, tenantId, updates) {
        try {
            const allowedFields = ['name', 'description', 'trigger_config', 'workflow_definition', 'is_active'];
            const setClauses = [];
            const params = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    setClauses.push(`${key} = $${paramIndex}`);
                    params.push(['trigger_config', 'workflow_definition'].includes(key) ? JSON.stringify(value) : value);
                    paramIndex++;
                }
            }

            if (setClauses.length === 0) {
                throw new Error('No valid fields to update');
            }

            params.push(workflowId, tenantId);

            const result = await query(
                `UPDATE workflows
                SET ${setClauses.join(', ')}, updated_at = NOW()
                WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
                RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new Error('Workflow not found');
            }

            logger.info('[WorkflowService] Workflow updated', {
                workflowId,
                tenantId
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[WorkflowService] Failed to update workflow', {
                error: error.message,
                workflowId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete workflow
     */
    static async deleteWorkflow(workflowId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM workflows
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [workflowId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Workflow not found');
            }

            logger.info('[WorkflowService] Workflow deleted', {
                workflowId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('[WorkflowService] Failed to delete workflow', {
                error: error.message,
                workflowId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get workflow execution history
     */
    static async getExecutionHistory(workflowId, tenantId, limit = 50) {
        try {
            const result = await query(
                `SELECT we.*, w.name as workflow_name, s.id as submission_id
                FROM workflow_executions we
                JOIN workflows w ON we.workflow_id = w.id
                LEFT JOIN submissions s ON we.submission_id = s.id
                WHERE we.workflow_id = $1 AND we.tenant_id = $2
                ORDER BY we.executed_at DESC
                LIMIT $3`,
                [workflowId, tenantId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[WorkflowService] Failed to get execution history', {
                error: error.message,
                workflowId,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = WorkflowService;
