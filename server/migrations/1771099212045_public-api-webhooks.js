/**
 * Public API & Webhooks Migration
 *
 * Creates tables for Public API and Webhook functionality:
 * - api_keys: API key management with scopes and rate limits
 * - webhook_subscriptions: Webhook endpoint registrations
 * - webhook_deliveries: Webhook delivery logs and retries
 *
 * Enables third-party integrations and custom applications.
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
    // API Keys table - for authentication
    pgm.createTable('api_keys', {
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
        key_hash: {
            type: 'varchar(255)',
            notNull: true,
            unique: true
        }, // SHA-256 hash of API key
        key_prefix: {
            type: 'varchar(20)',
            notNull: true
        }, // First 8 chars for identification (e.g., "vx_live_abc...")
        scopes: {
            type: 'jsonb',
            notNull: true,
            default: '[]'
        }, // ["forms:read", "forms:write", "responses:read", "webhooks:manage"]
        rate_limit: {
            type: 'integer',
            notNull: true,
            default: 1000
        }, // Requests per hour
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        last_used_at: {
            type: 'timestamp'
        },
        expires_at: {
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

    // Webhook Subscriptions table
    pgm.createTable('webhook_subscriptions', {
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
        url: {
            type: 'text',
            notNull: true
        }, // Webhook endpoint URL
        events: {
            type: 'jsonb',
            notNull: true,
            default: '[]'
        }, // ["response.received", "response.completed", "distribution.sent"]
        secret: {
            type: 'varchar(255)',
            notNull: true
        }, // For HMAC signature verification
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        retry_config: {
            type: 'jsonb',
            notNull: true,
            default: '{"max_attempts": 3, "backoff_multiplier": 2}'
        },
        headers: {
            type: 'jsonb',
            default: '{}'
        }, // Custom headers to include
        last_triggered_at: {
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

    // Webhook Deliveries table - logs each webhook attempt
    pgm.createTable('webhook_deliveries', {
        id: 'id',
        webhook_subscription_id: {
            type: 'integer',
            notNull: true,
            references: 'webhook_subscriptions',
            onDelete: 'CASCADE'
        },
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        event_type: {
            type: 'varchar(100)',
            notNull: true
        },
        payload: {
            type: 'jsonb',
            notNull: true
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: 'pending'
        }, // pending, success, failed, retrying
        attempt_count: {
            type: 'integer',
            notNull: true,
            default: 0
        },
        response_status: {
            type: 'integer'
        }, // HTTP status code
        response_body: {
            type: 'text'
        },
        error_message: {
            type: 'text'
        },
        next_retry_at: {
            type: 'timestamp'
        },
        delivered_at: {
            type: 'timestamp'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Add indexes for performance
    pgm.createIndex('api_keys', 'tenant_id');
    pgm.createIndex('api_keys', 'key_hash');
    pgm.createIndex('api_keys', 'key_prefix');
    pgm.createIndex('api_keys', ['tenant_id', 'is_active']);

    pgm.createIndex('webhook_subscriptions', 'tenant_id');
    pgm.createIndex('webhook_subscriptions', ['tenant_id', 'is_active']);

    pgm.createIndex('webhook_deliveries', 'webhook_subscription_id');
    pgm.createIndex('webhook_deliveries', 'tenant_id');
    pgm.createIndex('webhook_deliveries', 'status');
    pgm.createIndex('webhook_deliveries', 'created_at');
    pgm.createIndex('webhook_deliveries', 'next_retry_at');

    // Add comments
    pgm.sql(`
        COMMENT ON TABLE api_keys IS 'API keys for third-party authentication and access control';
        COMMENT ON TABLE webhook_subscriptions IS 'Webhook endpoint registrations for event notifications';
        COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery logs with retry tracking';

        COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key for secure storage';
        COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters for display (e.g., vx_live_abc12345...)';
        COMMENT ON COLUMN api_keys.scopes IS 'Permission scopes array (forms:read, forms:write, responses:read, etc.)';
        COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per hour (default: 1000)';

        COMMENT ON COLUMN webhook_subscriptions.events IS 'Event types to subscribe to (response.received, distribution.sent, etc.)';
        COMMENT ON COLUMN webhook_subscriptions.secret IS 'Secret key for HMAC signature verification (HMAC-SHA256)';
        COMMENT ON COLUMN webhook_subscriptions.retry_config IS 'Retry configuration (max_attempts, backoff_multiplier)';

        COMMENT ON COLUMN webhook_deliveries.status IS 'Delivery status: pending, success, failed, retrying';
        COMMENT ON COLUMN webhook_deliveries.attempt_count IS 'Number of delivery attempts made';
        COMMENT ON COLUMN webhook_deliveries.next_retry_at IS 'Scheduled time for next retry attempt';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('webhook_deliveries');
    pgm.dropTable('webhook_subscriptions');
    pgm.dropTable('api_keys');
};
