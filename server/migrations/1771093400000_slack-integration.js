/**
 * Slack Integration Migration
 *
 * Creates tables for Slack Bot integration:
 * - slack_bot_config: Store Slack workspace/bot credentials per tenant
 * - slack_messages: Track messages sent via Slack
 * - Adds slack_user_id to contacts table
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
    // Slack Bot Configuration Table
    pgm.createTable('slack_bot_config', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        workspace_name: { type: 'varchar(255)' },
        workspace_id: { type: 'varchar(255)' },
        bot_token: { type: 'text', notNull: true }, // Encrypted
        bot_user_id: { type: 'varchar(255)' },
        app_id: { type: 'varchar(255)' },
        webhook_url: { type: 'text' },
        signing_secret: { type: 'text' }, // Encrypted
        is_active: { type: 'boolean', default: true },
        scopes: { type: 'text[]' }, // OAuth scopes granted
        allow_channels: { type: 'boolean', default: true },
        allow_private_channels: { type: 'boolean', default: false },
        welcome_message: { type: 'text' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Slack Messages Table
    pgm.createTable('slack_messages', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        distribution_id: { type: 'integer' },
        channel_id: { type: 'varchar(255)' }, // Slack channel ID (C...)
        user_id: { type: 'varchar(255)' }, // Slack user ID (U...)
        recipient_name: { type: 'varchar(255)' },
        message_text: { type: 'text', notNull: true },
        message_ts: { type: 'varchar(255)' }, // Slack message timestamp (unique ID)
        thread_ts: { type: 'varchar(255)' }, // Thread timestamp if reply
        blocks: { type: 'jsonb' }, // Block Kit blocks
        survey_url: { type: 'text' },
        status: { type: 'varchar(50)', default: "'pending'" },
        sent_at: { type: 'timestamp' },
        delivered_at: { type: 'timestamp' },
        read_at: { type: 'timestamp' },
        error_message: { type: 'text' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Add Slack fields to contacts table
    pgm.addColumns('contacts', {
        slack_user_id: {
            type: 'varchar(255)',
            comment: 'Slack user ID for direct messaging (U...)'
        },
        slack_channel_id: {
            type: 'varchar(255)',
            comment: 'Slack channel ID for channel posts (C...)'
        }
    });

    // Indexes
    pgm.createIndex('slack_bot_config', 'tenant_id', { unique: true });
    pgm.createIndex('slack_bot_config', 'workspace_id');

    pgm.createIndex('slack_messages', 'tenant_id');
    pgm.createIndex('slack_messages', 'distribution_id');
    pgm.createIndex('slack_messages', 'channel_id');
    pgm.createIndex('slack_messages', 'user_id');
    pgm.createIndex('slack_messages', 'message_ts');
    pgm.createIndex('slack_messages', 'status');
    pgm.createIndex('slack_messages', 'created_at');

    pgm.createIndex('contacts', 'slack_user_id', { name: 'idx_contacts_slack_user_id' });
    pgm.createIndex('contacts', 'slack_channel_id', { name: 'idx_contacts_slack_channel_id' });

    // Foreign key constraints
    pgm.addConstraint('slack_bot_config', 'fk_slack_bot_config_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('slack_messages', 'fk_slack_messages_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('slack_messages', 'fk_slack_messages_distribution', {
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
    pgm.dropConstraint('slack_messages', 'fk_slack_messages_distribution', { ifExists: true });
    pgm.dropConstraint('slack_messages', 'fk_slack_messages_tenant', { ifExists: true });
    pgm.dropConstraint('slack_bot_config', 'fk_slack_bot_config_tenant', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('contacts', 'slack_channel_id', { ifExists: true, name: 'idx_contacts_slack_channel_id' });
    pgm.dropIndex('contacts', 'slack_user_id', { ifExists: true, name: 'idx_contacts_slack_user_id' });
    pgm.dropIndex('slack_messages', 'created_at', { ifExists: true });
    pgm.dropIndex('slack_messages', 'status', { ifExists: true });
    pgm.dropIndex('slack_messages', 'message_ts', { ifExists: true });
    pgm.dropIndex('slack_messages', 'user_id', { ifExists: true });
    pgm.dropIndex('slack_messages', 'channel_id', { ifExists: true });
    pgm.dropIndex('slack_messages', 'distribution_id', { ifExists: true });
    pgm.dropIndex('slack_messages', 'tenant_id', { ifExists: true });
    pgm.dropIndex('slack_bot_config', 'workspace_id', { ifExists: true });
    pgm.dropIndex('slack_bot_config', 'tenant_id', { ifExists: true });

    // Remove Slack fields from contacts
    pgm.dropColumns('contacts', ['slack_user_id', 'slack_channel_id'], { ifExists: true });

    // Drop tables
    pgm.dropTable('slack_messages', { ifExists: true });
    pgm.dropTable('slack_bot_config', { ifExists: true });
};
