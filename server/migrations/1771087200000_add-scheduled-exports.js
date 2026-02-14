/**
 * Migration: Add Scheduled Exports and Cloud Storage Credentials Tables
 *
 * Creates tables for:
 * - Scheduled exports (recurring export jobs)
 * - Cloud storage credentials (Google Drive, Dropbox)
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
    // Create scheduled_exports table
    pgm.createTable('scheduled_exports', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        tenant_id: {
            type: 'integer',
            notNull: true
        },
        user_id: {
            type: 'integer',
            notNull: true
        },
        name: {
            type: 'varchar(255)',
            notNull: true
        },
        description: {
            type: 'text',
            notNull: false
        },
        form_id: {
            type: 'integer',
            notNull: true
        },
        export_type: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'raw, analytics, spss, sql'
        },
        format: {
            type: 'varchar(20)',
            notNull: true,
            comment: 'xlsx, csv, pdf, pptx, etc.'
        },
        schedule_type: {
            type: 'varchar(20)',
            notNull: true,
            comment: 'daily, weekly, monthly, custom'
        },
        cron_expression: {
            type: 'varchar(100)',
            notNull: true
        },
        schedule_time: {
            type: 'varchar(5)',
            notNull: false,
            comment: 'HH:MM format'
        },
        day_of_week: {
            type: 'integer',
            notNull: false,
            comment: '0-6 for weekly (0 = Sunday)'
        },
        day_of_month: {
            type: 'integer',
            notNull: false,
            comment: '1-31 for monthly'
        },
        options: {
            type: 'jsonb',
            notNull: false,
            default: '{}',
            comment: 'Export options (template, filters, etc.)'
        },
        delivery_config: {
            type: 'jsonb',
            notNull: false,
            default: '{}',
            comment: 'Delivery configuration (email, cloud storage)'
        },
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        last_run_at: {
            type: 'timestamp',
            notNull: false
        },
        last_status: {
            type: 'varchar(20)',
            notNull: false,
            comment: 'success, error, running'
        },
        last_error: {
            type: 'text',
            notNull: false
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

    // Add indexes for scheduled_exports
    pgm.createIndex('scheduled_exports', 'tenant_id');
    pgm.createIndex('scheduled_exports', 'form_id');
    pgm.createIndex('scheduled_exports', 'is_active');
    pgm.createIndex('scheduled_exports', ['tenant_id', 'is_active']);
    pgm.createIndex('scheduled_exports', 'last_run_at');

    // Create cloud_storage_credentials table
    pgm.createTable('cloud_storage_credentials', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        tenant_id: {
            type: 'integer',
            notNull: true
        },
        provider: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'google_drive, dropbox, onedrive'
        },
        access_token: {
            type: 'text',
            notNull: true
        },
        refresh_token: {
            type: 'text',
            notNull: false
        },
        expires_at: {
            type: 'timestamp',
            notNull: false
        },
        scope: {
            type: 'text',
            notNull: false
        },
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true
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

    // Add indexes for cloud_storage_credentials
    pgm.createIndex('cloud_storage_credentials', 'tenant_id');
    pgm.createIndex('cloud_storage_credentials', 'provider');
    pgm.createIndex('cloud_storage_credentials', ['tenant_id', 'provider']);

    // Unique constraint: one active credential per tenant per provider
    pgm.addConstraint('cloud_storage_credentials', 'unique_tenant_provider_active', {
        unique: ['tenant_id', 'provider', 'is_active'],
        where: 'is_active = true'
    });

    // Add comments
    pgm.sql(`
        COMMENT ON TABLE scheduled_exports IS 'Stores scheduled/recurring export jobs';
        COMMENT ON TABLE cloud_storage_credentials IS 'Stores OAuth credentials for cloud storage providers';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('cloud_storage_credentials');
    pgm.dropTable('scheduled_exports');
};
