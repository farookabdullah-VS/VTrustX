/**
 * Workflow Automation Migration
 *
 * Creates tables for Advanced Workflow Automation feature:
 * - workflows: Workflow definitions with triggers and actions
 * - workflow_executions: Execution logs and results
 * - workflow_actions: Individual actions within workflows
 *
 * Enables automated response-based workflows:
 * - NPS detractor follow-up
 * - Promoter advocacy
 * - Low quality response flagging
 * - Sentiment-based alerts
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
    // Workflows table - stores workflow definitions
    pgm.createTable('workflows', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        name: {
            type: 'varchar(255)',
            notNull: true
        },
        description: {
            type: 'text'
        },
        form_id: {
            type: 'integer',
            references: 'forms',
            onDelete: 'CASCADE'
        }, // Optional: workflow applies to specific form
        trigger_type: {
            type: 'varchar(50)',
            notNull: true
        }, // response_received, score_threshold, keyword_detected, sentiment_detected, quality_threshold
        trigger_config: {
            type: 'jsonb',
            notNull: true,
            default: '{}'
        }, // Trigger-specific configuration
        workflow_definition: {
            type: 'jsonb',
            notNull: true,
            default: '{"nodes": [], "edges": []}'
        }, // Visual workflow graph (nodes and connections)
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        execution_count: {
            type: 'integer',
            notNull: true,
            default: 0
        },
        last_executed_at: {
            type: 'timestamp'
        },
        created_by: {
            type: 'integer',
            references: 'users',
            onDelete: 'SET NULL'
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

    // Workflow executions table - logs each workflow execution
    pgm.createTable('workflow_executions', {
        id: 'id',
        workflow_id: {
            type: 'integer',
            notNull: true,
            references: 'workflows',
            onDelete: 'CASCADE'
        },
        submission_id: {
            type: 'integer',
            references: 'submissions',
            onDelete: 'CASCADE'
        },
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: 'pending'
        }, // pending, running, completed, failed, skipped
        trigger_data: {
            type: 'jsonb'
        }, // Data that triggered the workflow
        result: {
            type: 'jsonb'
        }, // Execution results and action outputs
        error_message: {
            type: 'text'
        },
        executed_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        },
        completed_at: {
            type: 'timestamp'
        },
        duration_ms: {
            type: 'integer'
        } // Execution duration in milliseconds
    });

    // Workflow actions table - stores action definitions
    pgm.createTable('workflow_actions', {
        id: 'id',
        workflow_id: {
            type: 'integer',
            notNull: true,
            references: 'workflows',
            onDelete: 'CASCADE'
        },
        node_id: {
            type: 'varchar(100)',
            notNull: true
        }, // Matches node ID in workflow_definition
        action_type: {
            type: 'varchar(50)',
            notNull: true
        }, // send_email, create_ticket, update_crm, trigger_webhook, delay, condition, end
        action_config: {
            type: 'jsonb',
            notNull: true,
            default: '{}'
        }, // Action-specific configuration
        position: {
            type: 'integer',
            notNull: true,
            default: 0
        }, // Order in workflow
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Add indexes for performance
    pgm.createIndex('workflows', 'tenant_id');
    pgm.createIndex('workflows', 'form_id');
    pgm.createIndex('workflows', ['tenant_id', 'is_active']);
    pgm.createIndex('workflows', 'trigger_type');

    pgm.createIndex('workflow_executions', 'workflow_id');
    pgm.createIndex('workflow_executions', 'submission_id');
    pgm.createIndex('workflow_executions', 'tenant_id');
    pgm.createIndex('workflow_executions', 'status');
    pgm.createIndex('workflow_executions', 'executed_at');

    pgm.createIndex('workflow_actions', 'workflow_id');
    pgm.createIndex('workflow_actions', 'node_id');

    // Add comments
    pgm.sql(`
        COMMENT ON TABLE workflows IS 'Stores workflow definitions for automated response-based actions';
        COMMENT ON TABLE workflow_executions IS 'Logs each workflow execution with results and timing';
        COMMENT ON TABLE workflow_actions IS 'Individual actions within workflows';

        COMMENT ON COLUMN workflows.trigger_type IS 'Type of trigger: response_received, score_threshold, keyword_detected, sentiment_detected, quality_threshold';
        COMMENT ON COLUMN workflows.trigger_config IS 'Trigger configuration (e.g., {"metric": "nps", "operator": "<=", "value": 6})';
        COMMENT ON COLUMN workflows.workflow_definition IS 'Visual workflow graph with nodes (actions) and edges (connections)';
        COMMENT ON COLUMN workflow_executions.status IS 'Execution status: pending, running, completed, failed, skipped';
        COMMENT ON COLUMN workflow_executions.duration_ms IS 'Execution duration in milliseconds for performance monitoring';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('workflow_actions');
    pgm.dropTable('workflow_executions');
    pgm.dropTable('workflows');
};
