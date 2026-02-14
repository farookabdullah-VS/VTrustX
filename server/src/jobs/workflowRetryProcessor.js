/**
 * Workflow Retry Processor
 *
 * Cron job that runs every 5 minutes to retry failed workflow executions
 * Checks for executions with next_retry_at <= NOW() and re-executes them
 */

const cron = require('node-cron');
const db = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const WorkflowEngineService = require('../services/WorkflowEngineService');

// Flag to prevent multiple concurrent executions
let isRunning = false;

/**
 * Process all workflows that are due for retry
 */
async function processRetries() {
    if (isRunning) {
        logger.warn('[WorkflowRetryProcessor] Already running, skipping');
        return;
    }

    isRunning = true;

    try {
        logger.debug('[WorkflowRetryProcessor] Starting retry processing');

        // Find executions that need retry
        const result = await db.query(
            `SELECT we.*, w.*
             FROM workflow_executions we
             JOIN workflows w ON we.workflow_id = w.id
             WHERE we.status = 'retrying'
             AND we.next_retry_at IS NOT NULL
             AND we.next_retry_at <= NOW()
             AND we.retry_count < 3
             ORDER BY we.next_retry_at ASC
             LIMIT 50`,  // Process max 50 retries per run
            []
        );

        if (result.rows.length === 0) {
            logger.debug('[WorkflowRetryProcessor] No retries due');
            return;
        }

        logger.info('[WorkflowRetryProcessor] Processing retries', {
            count: result.rows.length
        });

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Process each retry
        for (const execution of result.rows) {
            try {
                logger.info('[WorkflowRetryProcessor] Retrying execution', {
                    executionId: execution.id,
                    workflowId: execution.workflow_id,
                    retryCount: execution.retry_count + 1
                });

                // Parse trigger data
                const triggerData = typeof execution.trigger_data === 'string'
                    ? JSON.parse(execution.trigger_data)
                    : execution.trigger_data;

                // Re-execute workflow (creates new execution)
                const workflow = {
                    id: execution.workflow_id,
                    tenant_id: execution.tenant_id,
                    name: execution.name,
                    trigger_event: execution.trigger_event,
                    conditions: execution.conditions,
                    actions: execution.actions
                };

                await WorkflowEngineService.executeWorkflow(workflow, triggerData);

                // Mark original execution as completed (retry successful)
                await db.query(
                    `UPDATE workflow_executions
                     SET status = 'completed', next_retry_at = NULL
                     WHERE id = $1`,
                    [execution.id]
                );

                results.success++;

                logger.info('[WorkflowRetryProcessor] Retry succeeded', {
                    executionId: execution.id,
                    workflowId: execution.workflow_id
                });

            } catch (error) {
                results.failed++;
                results.errors.push({
                    executionId: execution.id,
                    error: error.message
                });

                // If this was the last retry attempt, mark as permanently failed
                if (execution.retry_count >= 2) {
                    await db.query(
                        `UPDATE workflow_executions
                         SET status = 'failed',
                             error = $1,
                             next_retry_at = NULL
                         WHERE id = $2`,
                        [
                            `All retry attempts exhausted. Last error: ${error.message}`,
                            execution.id
                        ]
                    );

                    logger.error('[WorkflowRetryProcessor] Max retries reached', {
                        executionId: execution.id,
                        workflowId: execution.workflow_id,
                        error: error.message
                    });
                } else {
                    // Schedule next retry
                    const retryDelays = [60000, 300000, 900000]; // 1min, 5min, 15min
                    const nextRetryDelay = retryDelays[execution.retry_count] || retryDelays[retryDelays.length - 1];
                    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

                    await db.query(
                        `UPDATE workflow_executions
                         SET retry_count = retry_count + 1,
                             next_retry_at = $1,
                             error = $2
                         WHERE id = $3`,
                        [nextRetryAt, error.message, execution.id]
                    );

                    logger.warn('[WorkflowRetryProcessor] Retry failed, rescheduled', {
                        executionId: execution.id,
                        workflowId: execution.workflow_id,
                        nextRetryAt,
                        error: error.message
                    });
                }
            }
        }

        logger.info('[WorkflowRetryProcessor] Retry processing complete', results);

    } catch (error) {
        logger.error('[WorkflowRetryProcessor] Processor error', {
            error: error.message,
            stack: error.stack
        });
    } finally {
        isRunning = false;
    }
}

/**
 * Start the retry processor
 */
function start() {
    // Run every 5 minutes
    const cronExpression = '*/5 * * * *';

    cron.schedule(cronExpression, async () => {
        await processRetries();
    });

    logger.info('[WorkflowRetryProcessor] Cron job started', {
        schedule: cronExpression,
        description: 'Runs every 5 minutes'
    });

    // Also run once on startup (after 30 seconds delay)
    setTimeout(() => {
        processRetries().catch(err => {
            logger.error('[WorkflowRetryProcessor] Initial run failed', {
                error: err.message
            });
        });
    }, 30000);
}

/**
 * Stop the retry processor
 */
function stop() {
    cron.getTasks().forEach(task => task.stop());
    logger.info('[WorkflowRetryProcessor] Cron job stopped');
}

module.exports = {
    start,
    stop,
    processRetries
};
