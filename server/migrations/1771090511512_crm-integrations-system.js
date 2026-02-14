/**
 * Migration: CRM Integrations System
 *
 * Creates tables for two-way CRM integrations with Salesforce, HubSpot, Zoho
 * Features:
 * - Store CRM credentials and connection settings
 * - Field mapping between VTrustX and CRM systems
 * - Sync logs for tracking operations and errors
 * - Webhook configurations for CRM events
 * - Support for multiple CRM platforms per tenant
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
    // CRM Connections table
    pgm.createTable('crm_connections', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true, references: 'tenants(id)', onDelete: 'CASCADE' },

        // CRM platform (salesforce, hubspot, zoho, pipedrive, dynamics365)
        platform: { type: 'varchar(50)', notNull: true },
        connection_name: { type: 'varchar(255)', notNull: true },

        // Authentication credentials (encrypted)
        credentials: {
            type: 'jsonb',
            notNull: true,
            comment: 'Encrypted OAuth tokens, API keys, etc.'
        },

        // Connection settings
        settings: {
            type: 'jsonb',
            default: '{"syncEnabled": true, "syncDirection": "bidirectional", "syncInterval": 3600}'
        },

        // Status
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: "'active'",
            comment: 'active, inactive, error, expired'
        },

        // Connection health
        last_sync_at: { type: 'timestamp' },
        last_sync_status: { type: 'varchar(20)' },
        last_error: { type: 'text' },

        // Metadata
        created_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // CRM Field Mappings table
    pgm.createTable('crm_field_mappings', {
        id: { type: 'serial', primaryKey: true },
        connection_id: { type: 'integer', notNull: true, references: 'crm_connections(id)', onDelete: 'CASCADE' },

        // Mapping type (contact, account, opportunity, custom)
        object_type: { type: 'varchar(50)', notNull: true },

        // Field mapping configuration
        vtrust_field: { type: 'varchar(100)', notNull: true },
        crm_field: { type: 'varchar(100)', notNull: true },

        // Sync direction (vtrust_to_crm, crm_to_vtrust, bidirectional)
        sync_direction: { type: 'varchar(20)', notNull: true, default: "'bidirectional'" },

        // Data transformation rules
        transform_rules: {
            type: 'jsonb',
            default: '{}'
        },

        // Flags
        is_required: { type: 'boolean', default: false },
        is_active: { type: 'boolean', default: true },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // CRM Sync Logs table
    pgm.createTable('crm_sync_logs', {
        id: { type: 'serial', primaryKey: true },
        connection_id: { type: 'integer', notNull: true, references: 'crm_connections(id)', onDelete: 'CASCADE' },

        // Sync operation details
        sync_type: { type: 'varchar(50)', notNull: true },
        sync_direction: { type: 'varchar(20)', notNull: true },

        // Operation status
        status: { type: 'varchar(20)', notNull: true },

        // Records processed
        records_processed: { type: 'integer', default: 0 },
        records_success: { type: 'integer', default: 0 },
        records_failed: { type: 'integer', default: 0 },

        // Timing
        started_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        completed_at: { type: 'timestamp' },
        duration_ms: { type: 'integer' },

        // Error details
        error_message: { type: 'text' },
        error_details: { type: 'jsonb' },

        // Additional metadata
        metadata: { type: 'jsonb', default: '{}' },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // CRM Webhooks table
    pgm.createTable('crm_webhooks', {
        id: { type: 'serial', primaryKey: true },
        connection_id: { type: 'integer', notNull: true, references: 'crm_connections(id)', onDelete: 'CASCADE' },

        // Webhook configuration
        webhook_url: { type: 'varchar(500)', notNull: true },
        webhook_secret: { type: 'varchar(255)' },

        // Event configuration
        event_type: { type: 'varchar(50)', notNull: true },

        // Trigger action in VTrustX
        trigger_action: { type: 'varchar(50)', notNull: true },

        // Action configuration
        action_config: { type: 'jsonb', default: '{}' },

        // Status
        is_active: { type: 'boolean', default: true },
        last_triggered_at: { type: 'timestamp' },

        // Statistics
        trigger_count: { type: 'integer', default: 0 },
        success_count: { type: 'integer', default: 0 },
        error_count: { type: 'integer', default: 0 },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // CRM Object Mappings table (for tracking synced objects)
    pgm.createTable('crm_object_mappings', {
        id: { type: 'serial', primaryKey: true },
        connection_id: { type: 'integer', notNull: true, references: 'crm_connections(id)', onDelete: 'CASCADE' },

        // VTrustX object
        vtrust_object_type: { type: 'varchar(50)', notNull: true },
        vtrust_object_id: { type: 'integer', notNull: true },

        // CRM object
        crm_object_type: { type: 'varchar(50)', notNull: true },
        crm_object_id: { type: 'varchar(255)', notNull: true },

        // Sync metadata
        last_synced_at: { type: 'timestamp' },
        last_sync_direction: { type: 'varchar(20)' },
        sync_status: { type: 'varchar(20)', default: "'synced'" },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Indexes for performance
    pgm.createIndex('crm_connections', 'tenant_id');
    pgm.createIndex('crm_connections', 'platform');
    pgm.createIndex('crm_connections', 'status');

    pgm.createIndex('crm_field_mappings', 'connection_id');
    pgm.createIndex('crm_field_mappings', ['connection_id', 'object_type']);

    pgm.createIndex('crm_sync_logs', 'connection_id');
    pgm.createIndex('crm_sync_logs', 'status');
    pgm.createIndex('crm_sync_logs', 'created_at');
    pgm.createIndex('crm_sync_logs', ['connection_id', 'created_at']);

    pgm.createIndex('crm_webhooks', 'connection_id');
    pgm.createIndex('crm_webhooks', 'is_active');

    pgm.createIndex('crm_object_mappings', 'connection_id');
    pgm.createIndex('crm_object_mappings', ['vtrust_object_type', 'vtrust_object_id']);
    pgm.createIndex('crm_object_mappings', 'crm_object_id');
    pgm.createIndex('crm_object_mappings', ['connection_id', 'vtrust_object_type', 'vtrust_object_id']);

    // Unique constraints
    pgm.addConstraint('crm_object_mappings', 'unique_vtrust_crm_mapping', {
        unique: ['connection_id', 'vtrust_object_type', 'vtrust_object_id']
    });

    // Comments for documentation
    pgm.sql(`
        COMMENT ON TABLE crm_connections IS 'CRM platform connections and credentials';
        COMMENT ON TABLE crm_field_mappings IS 'Field mappings between VTrustX and CRM systems';
        COMMENT ON TABLE crm_sync_logs IS 'Log of all sync operations with CRM systems';
        COMMENT ON TABLE crm_webhooks IS 'Webhook configurations for CRM events';
        COMMENT ON TABLE crm_object_mappings IS 'Track which VTrustX objects are synced to which CRM objects';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('crm_object_mappings', { cascade: true });
    pgm.dropTable('crm_webhooks', { cascade: true });
    pgm.dropTable('crm_sync_logs', { cascade: true });
    pgm.dropTable('crm_field_mappings', { cascade: true });
    pgm.dropTable('crm_connections', { cascade: true });
};
