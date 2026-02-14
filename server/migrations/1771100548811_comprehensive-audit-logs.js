/**
 * Comprehensive Audit Logs Migration
 *
 * Creates a centralized audit log system for tracking all user actions
 * across the platform for security monitoring, compliance, and troubleshooting.
 *
 * Categories tracked:
 * - Authentication (login, logout, password changes, 2FA)
 * - Authorization (role changes, permission grants)
 * - Data Access (view, export sensitive data)
 * - Data Modification (create, update, delete)
 * - Security Events (failed logins, suspicious activity)
 * - System Configuration (settings changes)
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
    // Main audit log table
    pgm.createTable('audit_logs', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            references: 'tenants',
            onDelete: 'CASCADE',
            comment: 'Tenant that owns this audit entry'
        },
        user_id: {
            type: 'integer',
            references: 'users',
            onDelete: 'SET NULL',
            comment: 'User who performed the action (null for system actions)'
        },
        actor_email: {
            type: 'varchar(255)',
            comment: 'Email of user (cached for deleted users)'
        },
        actor_name: {
            type: 'varchar(255)',
            comment: 'Name of user (cached for deleted users)'
        },
        action: {
            type: 'varchar(100)',
            notNull: true,
            comment: 'Action performed (e.g., user.login, form.create, response.delete)'
        },
        category: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'Category: authentication, authorization, data_access, data_modification, security, system'
        },
        resource_type: {
            type: 'varchar(50)',
            comment: 'Type of resource affected (e.g., form, user, response, distribution)'
        },
        resource_id: {
            type: 'varchar(100)',
            comment: 'ID of affected resource (stored as string for flexibility)'
        },
        resource_name: {
            type: 'text',
            comment: 'Human-readable name of resource'
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: 'success',
            comment: 'Status: success, failure, error'
        },
        severity: {
            type: 'varchar(20)',
            notNull: true,
            default: 'info',
            comment: 'Severity: info, warning, critical'
        },
        ip_address: {
            type: 'varchar(45)',
            comment: 'IP address of the request'
        },
        user_agent: {
            type: 'text',
            comment: 'Browser/device user agent'
        },
        request_method: {
            type: 'varchar(10)',
            comment: 'HTTP method (GET, POST, PUT, DELETE, etc.)'
        },
        request_path: {
            type: 'text',
            comment: 'API endpoint path'
        },
        changes: {
            type: 'jsonb',
            comment: 'Before/after values for updates ({"before": {...}, "after": {...}})'
        },
        metadata: {
            type: 'jsonb',
            default: '{}',
            comment: 'Additional contextual data'
        },
        error_message: {
            type: 'text',
            comment: 'Error message if status is failure/error'
        },
        session_id: {
            type: 'varchar(255)',
            comment: 'Session identifier for grouping related actions'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Create indexes for fast queries
    pgm.createIndex('audit_logs', 'tenant_id');
    pgm.createIndex('audit_logs', 'user_id');
    pgm.createIndex('audit_logs', 'action');
    pgm.createIndex('audit_logs', 'category');
    pgm.createIndex('audit_logs', 'resource_type');
    pgm.createIndex('audit_logs', 'resource_id');
    pgm.createIndex('audit_logs', 'status');
    pgm.createIndex('audit_logs', 'severity');
    pgm.createIndex('audit_logs', 'created_at');
    pgm.createIndex('audit_logs', 'ip_address');

    // Composite index for common queries
    pgm.createIndex('audit_logs', ['tenant_id', 'created_at']);
    pgm.createIndex('audit_logs', ['user_id', 'created_at']);
    pgm.createIndex('audit_logs', ['tenant_id', 'category', 'created_at']);
    pgm.createIndex('audit_logs', ['resource_type', 'resource_id']);

    // Create retention policy table
    pgm.createTable('audit_retention_policies', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE',
            unique: true
        },
        retention_days: {
            type: 'integer',
            notNull: true,
            default: 90,
            comment: 'Days to retain audit logs (default: 90, 0 = forever)'
        },
        critical_retention_days: {
            type: 'integer',
            notNull: true,
            default: 365,
            comment: 'Days to retain critical severity logs (default: 365)'
        },
        auto_archive: {
            type: 'boolean',
            notNull: true,
            default: false,
            comment: 'Whether to archive old logs instead of deleting'
        },
        archive_storage_path: {
            type: 'text',
            comment: 'Path to archive storage (e.g., GCS bucket)'
        },
        last_cleanup_at: {
            type: 'timestamp',
            comment: 'Last time cleanup job ran'
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

    // Create audit log summary view for quick stats
    pgm.createView('audit_log_summary', {}, `
        SELECT
            tenant_id,
            category,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE status = 'success') as success_count,
            COUNT(*) FILTER (WHERE status = 'failure') as failure_count,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
            MIN(created_at) as first_event,
            MAX(created_at) as last_event
        FROM audit_logs
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY tenant_id, category
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropView('audit_log_summary');
    pgm.dropTable('audit_retention_policies');
    pgm.dropTable('audit_logs');
};
