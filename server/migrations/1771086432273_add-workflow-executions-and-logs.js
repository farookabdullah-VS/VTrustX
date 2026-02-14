/**
 * Migration: Add Workflow Execution Tracking and Logging
 *
 * Creates tables for:
 * - Workflow executions (track each workflow run)
 * - Workflow execution logs (detailed step-by-step logs)
 * - Workflow templates (pre-built workflow patterns)
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Create workflow_executions table
    pgm.createTable('workflow_executions', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        tenant_id: {
            type: 'integer',
            notNull: true
        },
        workflow_id: {
            type: 'integer',
            notNull: true,
            references: 'workflows(id)',
            onDelete: 'CASCADE'
        },
        trigger_event: {
            type: 'varchar(100)',
            notNull: true,
            comment: 'Event that triggered this execution'
        },
        trigger_data: {
            type: 'jsonb',
            notNull: false,
            comment: 'Contextual data from the trigger (submission, ticket, etc.)'
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: "'pending'",
            comment: 'pending, running, completed, failed, retrying'
        },
        started_at: {
            type: 'timestamp',
            notNull: false
        },
        completed_at: {
            type: 'timestamp',
            notNull: false
        },
        duration_ms: {
            type: 'integer',
            notNull: false,
            comment: 'Execution duration in milliseconds'
        },
        result: {
            type: 'jsonb',
            notNull: false,
            comment: 'Execution result data (actions executed, outputs)'
        },
        error: {
            type: 'text',
            notNull: false,
            comment: 'Error message if execution failed'
        },
        error_stack: {
            type: 'text',
            notNull: false,
            comment: 'Full error stack trace for debugging'
        },
        retry_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of retry attempts'
        },
        next_retry_at: {
            type: 'timestamp',
            notNull: false,
            comment: 'Scheduled time for next retry attempt'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Create workflow_execution_logs table
    pgm.createTable('workflow_execution_logs', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        execution_id: {
            type: 'integer',
            notNull: true,
            references: 'workflow_executions(id)',
            onDelete: 'CASCADE'
        },
        step_number: {
            type: 'integer',
            notNull: true,
            comment: 'Sequential step number in workflow execution'
        },
        step_type: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'condition, action, delay, loop, branch'
        },
        step_name: {
            type: 'varchar(255)',
            notNull: false,
            comment: 'Human-readable step name'
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            comment: 'pending, running, completed, failed, skipped'
        },
        input_data: {
            type: 'jsonb',
            notNull: false,
            comment: 'Input data for this step'
        },
        output_data: {
            type: 'jsonb',
            notNull: false,
            comment: 'Output data from this step'
        },
        error: {
            type: 'text',
            notNull: false
        },
        started_at: {
            type: 'timestamp',
            notNull: false
        },
        completed_at: {
            type: 'timestamp',
            notNull: false
        },
        duration_ms: {
            type: 'integer',
            notNull: false
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Create workflow_templates table
    pgm.createTable('workflow_templates', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        name: {
            type: 'varchar(255)',
            notNull: true
        },
        description: {
            type: 'text',
            notNull: false
        },
        category: {
            type: 'varchar(100)',
            notNull: false,
            comment: 'customer_service, sales, marketing, operations'
        },
        use_case: {
            type: 'varchar(255)',
            notNull: false,
            comment: 'Short description of use case'
        },
        workflow_definition: {
            type: 'jsonb',
            notNull: true,
            comment: 'Complete workflow configuration (trigger, conditions, actions)'
        },
        icon: {
            type: 'varchar(50)',
            notNull: false,
            comment: 'Icon name for UI display'
        },
        tags: {
            type: 'text[]',
            notNull: false,
            comment: 'Searchable tags for template discovery'
        },
        is_public: {
            type: 'boolean',
            notNull: true,
            default: true,
            comment: 'Whether template is available to all tenants'
        },
        tenant_id: {
            type: 'integer',
            notNull: false,
            comment: 'If set, template is private to this tenant'
        },
        usage_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of times template has been used'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Add indexes for workflow_executions
    pgm.createIndex('workflow_executions', 'tenant_id');
    pgm.createIndex('workflow_executions', 'workflow_id');
    pgm.createIndex('workflow_executions', 'status');
    pgm.createIndex('workflow_executions', ['workflow_id', 'status']);
    pgm.createIndex('workflow_executions', 'created_at');
    pgm.createIndex('workflow_executions', 'next_retry_at', {
        where: 'next_retry_at IS NOT NULL'
    });

    // Add indexes for workflow_execution_logs
    pgm.createIndex('workflow_execution_logs', 'execution_id');
    pgm.createIndex('workflow_execution_logs', ['execution_id', 'step_number']);

    // Add indexes for workflow_templates
    pgm.createIndex('workflow_templates', 'category');
    pgm.createIndex('workflow_templates', 'is_public');
    pgm.createIndex('workflow_templates', 'tenant_id');
    pgm.createIndex('workflow_templates', 'tags', {
        method: 'gin'
    });

    // Add comments
    pgm.sql(`
        COMMENT ON TABLE workflow_executions IS 'Tracks each workflow execution with status and results';
        COMMENT ON TABLE workflow_execution_logs IS 'Detailed step-by-step logs for workflow debugging';
        COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates for common use cases';
    `);

    // Update existing workflows table to add execution statistics
    pgm.addColumns('workflows', {
        execution_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Total number of times workflow has been executed'
        },
        success_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of successful executions'
        },
        failure_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of failed executions'
        },
        last_executed_at: {
            type: 'timestamp',
            notNull: false,
            comment: 'Timestamp of last execution'
        },
        average_duration_ms: {
            type: 'integer',
            notNull: false,
            comment: 'Average execution duration in milliseconds'
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop added columns from workflows table
    pgm.dropColumns('workflows', ['execution_count', 'success_count', 'failure_count', 'last_executed_at', 'average_duration_ms']);

    // Drop tables in reverse order (respecting foreign keys)
    pgm.dropTable('workflow_execution_logs');
    pgm.dropTable('workflow_executions');
    pgm.dropTable('workflow_templates');
};
