/**
 * Additional Channels - Telegram Integration Migration
 *
 * Creates tables for Telegram Bot messaging
 * Tables:
 * - telegram_messages: Message tracking for Telegram
 * - telegram_bot_config: Bot configuration per tenant
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
    // Telegram Messages Table
    pgm.createTable('telegram_messages', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        distribution_id: { type: 'integer' },
        chat_id: { type: 'varchar(255)', notNull: true }, // Telegram chat ID
        message_id: { type: 'varchar(255)' }, // Telegram message ID (after sent)
        recipient_username: { type: 'varchar(255)' }, // @username
        recipient_name: { type: 'varchar(255)' },
        message_text: { type: 'text' },
        inline_keyboard: { type: 'jsonb' }, // Inline keyboard buttons
        status: { type: 'varchar(50)', default: "'pending'" }, // pending, sent, delivered, read, failed, blocked
        error_message: { type: 'text' },
        sent_at: { type: 'timestamp' },
        delivered_at: { type: 'timestamp' },
        read_at: { type: 'timestamp' },
        replied_at: { type: 'timestamp' },
        reply_text: { type: 'text' }, // If user replied
        survey_url: { type: 'text' }, // Survey link sent in message
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Telegram Bot Configuration Table
    pgm.createTable('telegram_bot_config', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true, unique: true },
        bot_token: { type: 'text', notNull: true }, // Encrypted bot token
        bot_username: { type: 'varchar(255)' }, // @bot_username
        webhook_url: { type: 'text' },
        webhook_secret: { type: 'varchar(255)' }, // For webhook validation
        is_active: { type: 'boolean', default: true },
        allow_groups: { type: 'boolean', default: false },
        allow_channels: { type: 'boolean', default: false },
        welcome_message: { type: 'text' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Indexes for performance
    pgm.createIndex('telegram_messages', 'tenant_id');
    pgm.createIndex('telegram_messages', 'distribution_id');
    pgm.createIndex('telegram_messages', 'chat_id');
    pgm.createIndex('telegram_messages', 'message_id');
    pgm.createIndex('telegram_messages', 'status');
    pgm.createIndex('telegram_messages', 'created_at');

    pgm.createIndex('telegram_bot_config', 'tenant_id', { unique: true });
    pgm.createIndex('telegram_bot_config', 'is_active');

    // Foreign key constraints
    pgm.addConstraint('telegram_messages', 'fk_telegram_messages_distribution', {
        foreignKeys: {
            columns: 'distribution_id',
            references: 'distributions(id)',
            onDelete: 'SET NULL'
        }
    });

    pgm.addConstraint('telegram_bot_config', 'fk_telegram_bot_config_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
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
    pgm.dropConstraint('telegram_messages', 'fk_telegram_messages_distribution', { ifExists: true });
    pgm.dropConstraint('telegram_bot_config', 'fk_telegram_bot_config_tenant', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('telegram_messages', 'tenant_id', { ifExists: true });
    pgm.dropIndex('telegram_messages', 'distribution_id', { ifExists: true });
    pgm.dropIndex('telegram_messages', 'chat_id', { ifExists: true });
    pgm.dropIndex('telegram_messages', 'message_id', { ifExists: true });
    pgm.dropIndex('telegram_messages', 'status', { ifExists: true });
    pgm.dropIndex('telegram_messages', 'created_at', { ifExists: true });

    pgm.dropIndex('telegram_bot_config', 'tenant_id', { ifExists: true });
    pgm.dropIndex('telegram_bot_config', 'is_active', { ifExists: true });

    // Drop tables
    pgm.dropTable('telegram_bot_config', { ifExists: true });
    pgm.dropTable('telegram_messages', { ifExists: true });
};
