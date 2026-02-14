/**
 * Microsoft Teams Integration Migration
 *
 * Creates tables for Microsoft Teams Bot integration:
 * - teams_bot_config: Store Teams app/bot credentials per tenant
 * - teams_messages: Track messages sent via Teams
 * - Adds teams_user_id and teams_channel_id to contacts table
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
    // Microsoft Teams Bot Configuration Table
    pgm.createTable('teams_bot_config', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        app_id: { type: 'varchar(255)', notNull: true }, // Microsoft App ID
        app_password: { type: 'text', notNull: true }, // Encrypted app password
        bot_name: { type: 'varchar(255)' },
        service_url: { type: 'text' }, // Teams service URL
        tenant_filter: { type: 'text[]' }, // Allowed Azure AD tenant IDs
        is_active: { type: 'boolean', default: true },
        allow_teams: { type: 'boolean', default: true },
        allow_channels: { type: 'boolean', default: true },
        allow_group_chat: { type: 'boolean', default: true },
        welcome_message: { type: 'text' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Microsoft Teams Messages Table
    pgm.createTable('teams_messages', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        distribution_id: { type: 'integer' },
        conversation_id: { type: 'varchar(255)' }, // Teams conversation ID
        channel_id: { type: 'varchar(255)' }, // Teams channel ID
        user_id: { type: 'varchar(255)' }, // Teams user ID (Azure AD)
        recipient_name: { type: 'varchar(255)' },
        message_text: { type: 'text', notNull: true },
        activity_id: { type: 'varchar(255)' }, // Teams activity/message ID
        adaptive_card: { type: 'jsonb' }, // Adaptive Card JSON
        survey_url: { type: 'text' },
        status: { type: 'varchar(50)', default: "'pending'" },
        sent_at: { type: 'timestamp' },
        delivered_at: { type: 'timestamp' },
        read_at: { type: 'timestamp' },
        error_message: { type: 'text' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Add Microsoft Teams fields to contacts table
    pgm.addColumns('contacts', {
        teams_user_id: {
            type: 'varchar(255)',
            comment: 'Microsoft Teams user ID (Azure AD UPN or object ID)'
        },
        teams_channel_id: {
            type: 'varchar(255)',
            comment: 'Microsoft Teams channel ID for team posts'
        }
    });

    // Indexes
    pgm.createIndex('teams_bot_config', 'tenant_id', { unique: true });
    pgm.createIndex('teams_bot_config', 'app_id');

    pgm.createIndex('teams_messages', 'tenant_id');
    pgm.createIndex('teams_messages', 'distribution_id');
    pgm.createIndex('teams_messages', 'conversation_id');
    pgm.createIndex('teams_messages', 'channel_id');
    pgm.createIndex('teams_messages', 'user_id');
    pgm.createIndex('teams_messages', 'activity_id');
    pgm.createIndex('teams_messages', 'status');
    pgm.createIndex('teams_messages', 'created_at');

    pgm.createIndex('contacts', 'teams_user_id', { name: 'idx_contacts_teams_user_id' });
    pgm.createIndex('contacts', 'teams_channel_id', { name: 'idx_contacts_teams_channel_id' });

    // Foreign key constraints
    pgm.addConstraint('teams_bot_config', 'fk_teams_bot_config_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('teams_messages', 'fk_teams_messages_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('teams_messages', 'fk_teams_messages_distribution', {
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
    pgm.dropConstraint('teams_messages', 'fk_teams_messages_distribution', { ifExists: true });
    pgm.dropConstraint('teams_messages', 'fk_teams_messages_tenant', { ifExists: true });
    pgm.dropConstraint('teams_bot_config', 'fk_teams_bot_config_tenant', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('contacts', 'teams_channel_id', { ifExists: true, name: 'idx_contacts_teams_channel_id' });
    pgm.dropIndex('contacts', 'teams_user_id', { ifExists: true, name: 'idx_contacts_teams_user_id' });
    pgm.dropIndex('teams_messages', 'created_at', { ifExists: true });
    pgm.dropIndex('teams_messages', 'status', { ifExists: true });
    pgm.dropIndex('teams_messages', 'activity_id', { ifExists: true });
    pgm.dropIndex('teams_messages', 'user_id', { ifExists: true });
    pgm.dropIndex('teams_messages', 'channel_id', { ifExists: true });
    pgm.dropIndex('teams_messages', 'conversation_id', { ifExists: true });
    pgm.dropIndex('teams_messages', 'distribution_id', { ifExists: true });
    pgm.dropIndex('teams_messages', 'tenant_id', { ifExists: true });
    pgm.dropIndex('teams_bot_config', 'app_id', { ifExists: true });
    pgm.dropIndex('teams_bot_config', 'tenant_id', { ifExists: true });

    // Remove Teams fields from contacts
    pgm.dropColumns('contacts', ['teams_user_id', 'teams_channel_id'], { ifExists: true });

    // Drop tables
    pgm.dropTable('teams_messages', { ifExists: true });
    pgm.dropTable('teams_bot_config', { ifExists: true });
};
