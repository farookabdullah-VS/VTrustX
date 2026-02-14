/**
 * Drip Campaigns & Follow-up Sequences Migration
 *
 * Creates tables for:
 * - drip_campaigns: Multi-step campaign definitions
 * - drip_campaign_steps: Individual steps within campaigns
 * - drip_campaign_enrollments: Track who's enrolled in campaigns
 * - drip_step_executions: Track execution of each step for each recipient
 */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Drip Campaigns Table
    pgm.createTable('drip_campaigns', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },
        name: { type: 'varchar(255)', notNull: true },
        description: { type: 'text' },
        trigger_type: { type: 'varchar(50)', notNull: true }, // manual, scheduled, event_based
        trigger_config: { type: 'jsonb' }, // Trigger settings (date, time, event)
        channel: { type: 'varchar(20)', notNull: true }, // email, sms, whatsapp, telegram
        status: { type: 'varchar(20)', default: "'draft'" }, // draft, active, paused, completed
        stop_on_response: { type: 'boolean', default: true }, // Stop if recipient responds
        max_reminders: { type: 'integer', default: 3 }, // Maximum reminder steps
        timezone: { type: 'varchar(50)', default: "'UTC'" },
        enrollment_count: { type: 'integer', default: 0 },
        completed_count: { type: 'integer', default: 0 },
        response_rate: { type: 'decimal(5,2)', default: 0 }, // Percentage
        created_by: { type: 'integer' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
        started_at: { type: 'timestamp' },
        completed_at: { type: 'timestamp' }
    });

    // Campaign Steps Table
    pgm.createTable('drip_campaign_steps', {
        id: { type: 'serial', primaryKey: true },
        campaign_id: { type: 'integer', notNull: true },
        step_number: { type: 'integer', notNull: true }, // 1, 2, 3...
        step_type: { type: 'varchar(20)', notNull: true }, // initial, reminder, follow_up
        subject: { type: 'varchar(500)' }, // Email subject or message title
        body: { type: 'text', notNull: true }, // Message content
        delay_value: { type: 'integer', default: 0 }, // Delay before sending (0 for initial)
        delay_unit: { type: 'varchar(10)', default: "'days'" }, // minutes, hours, days, weeks
        conditions: { type: 'jsonb' }, // Conditional sending rules
        media_assets: { type: 'jsonb' }, // Rich media attachments
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Campaign Enrollments Table
    pgm.createTable('drip_campaign_enrollments', {
        id: { type: 'serial', primaryKey: true },
        campaign_id: { type: 'integer', notNull: true },
        contact_id: { type: 'integer' }, // References contacts table
        recipient_email: { type: 'varchar(255)' },
        recipient_phone: { type: 'varchar(50)' },
        recipient_name: { type: 'varchar(255)' },
        recipient_data: { type: 'jsonb' }, // Additional contact data
        status: { type: 'varchar(20)', default: "'enrolled'" }, // enrolled, active, completed, stopped, failed
        current_step: { type: 'integer', default: 0 }, // Current step number
        next_step_at: { type: 'timestamp' }, // When to send next step
        response_received: { type: 'boolean', default: false },
        responded_at: { type: 'timestamp' },
        stopped_reason: { type: 'varchar(100)' }, // user_responded, max_reminders, manual_stop, error
        enrolled_at: { type: 'timestamp', default: pgm.func('NOW()') },
        completed_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Step Executions Table
    pgm.createTable('drip_step_executions', {
        id: { type: 'serial', primaryKey: true },
        enrollment_id: { type: 'integer', notNull: true },
        step_id: { type: 'integer', notNull: true },
        step_number: { type: 'integer', notNull: true },
        distribution_id: { type: 'integer' }, // Links to distributions table
        message_id: { type: 'varchar(255)' }, // Provider-specific message ID
        status: { type: 'varchar(20)', default: "'pending'" }, // pending, sent, delivered, failed, skipped
        error_message: { type: 'text' },
        scheduled_at: { type: 'timestamp' },
        sent_at: { type: 'timestamp' },
        delivered_at: { type: 'timestamp' },
        opened_at: { type: 'timestamp' },
        clicked_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Indexes for performance
    pgm.createIndex('drip_campaigns', 'tenant_id');
    pgm.createIndex('drip_campaigns', 'form_id');
    pgm.createIndex('drip_campaigns', 'status');
    pgm.createIndex('drip_campaigns', 'channel');

    pgm.createIndex('drip_campaign_steps', 'campaign_id');
    pgm.createIndex('drip_campaign_steps', ['campaign_id', 'step_number'], { unique: true });

    pgm.createIndex('drip_campaign_enrollments', 'campaign_id');
    pgm.createIndex('drip_campaign_enrollments', 'status');
    pgm.createIndex('drip_campaign_enrollments', 'next_step_at'); // For cron job queries
    pgm.createIndex('drip_campaign_enrollments', 'recipient_email');
    pgm.createIndex('drip_campaign_enrollments', 'recipient_phone');
    pgm.createIndex('drip_campaign_enrollments', 'response_received');

    pgm.createIndex('drip_step_executions', 'enrollment_id');
    pgm.createIndex('drip_step_executions', 'step_id');
    pgm.createIndex('drip_step_executions', 'status');
    pgm.createIndex('drip_step_executions', 'scheduled_at');

    // Foreign key constraints
    pgm.addConstraint('drip_campaigns', 'fk_drip_campaigns_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('drip_campaign_steps', 'fk_drip_steps_campaign', {
        foreignKeys: {
            columns: 'campaign_id',
            references: 'drip_campaigns(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('drip_campaign_enrollments', 'fk_drip_enrollments_campaign', {
        foreignKeys: {
            columns: 'campaign_id',
            references: 'drip_campaigns(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('drip_step_executions', 'fk_drip_executions_enrollment', {
        foreignKeys: {
            columns: 'enrollment_id',
            references: 'drip_campaign_enrollments(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('drip_step_executions', 'fk_drip_executions_step', {
        foreignKeys: {
            columns: 'step_id',
            references: 'drip_campaign_steps(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('drip_step_executions', 'fk_drip_executions_distribution', {
        foreignKeys: {
            columns: 'distribution_id',
            references: 'distributions(id)',
            onDelete: 'SET NULL'
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop constraints
    pgm.dropConstraint('drip_step_executions', 'fk_drip_executions_distribution', { ifExists: true });
    pgm.dropConstraint('drip_step_executions', 'fk_drip_executions_step', { ifExists: true });
    pgm.dropConstraint('drip_step_executions', 'fk_drip_executions_enrollment', { ifExists: true });
    pgm.dropConstraint('drip_campaign_enrollments', 'fk_drip_enrollments_campaign', { ifExists: true });
    pgm.dropConstraint('drip_campaign_steps', 'fk_drip_steps_campaign', { ifExists: true });
    pgm.dropConstraint('drip_campaigns', 'fk_drip_campaigns_form', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('drip_step_executions', 'scheduled_at', { ifExists: true });
    pgm.dropIndex('drip_step_executions', 'status', { ifExists: true });
    pgm.dropIndex('drip_step_executions', 'step_id', { ifExists: true });
    pgm.dropIndex('drip_step_executions', 'enrollment_id', { ifExists: true });

    pgm.dropIndex('drip_campaign_enrollments', 'response_received', { ifExists: true });
    pgm.dropIndex('drip_campaign_enrollments', 'recipient_phone', { ifExists: true });
    pgm.dropIndex('drip_campaign_enrollments', 'recipient_email', { ifExists: true });
    pgm.dropIndex('drip_campaign_enrollments', 'next_step_at', { ifExists: true });
    pgm.dropIndex('drip_campaign_enrollments', 'status', { ifExists: true });
    pgm.dropIndex('drip_campaign_enrollments', 'campaign_id', { ifExists: true });

    pgm.dropIndex('drip_campaign_steps', ['campaign_id', 'step_number'], { ifExists: true });
    pgm.dropIndex('drip_campaign_steps', 'campaign_id', { ifExists: true });

    pgm.dropIndex('drip_campaigns', 'channel', { ifExists: true });
    pgm.dropIndex('drip_campaigns', 'status', { ifExists: true });
    pgm.dropIndex('drip_campaigns', 'form_id', { ifExists: true });
    pgm.dropIndex('drip_campaigns', 'tenant_id', { ifExists: true });

    // Drop tables
    pgm.dropTable('drip_step_executions', { ifExists: true });
    pgm.dropTable('drip_campaign_enrollments', { ifExists: true });
    pgm.dropTable('drip_campaign_steps', { ifExists: true });
    pgm.dropTable('drip_campaigns', { ifExists: true });
};
