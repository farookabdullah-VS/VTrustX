/**
 * Migration: Performance Metrics Table
 *
 * Creates tables for tracking application performance:
 * - performance_metrics: Stores API, database, and custom metrics
 * - performance_alerts: Stores performance degradation alerts
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
    // Performance metrics table
    pgm.createTable('performance_metrics', {
        id: { type: 'serial', primaryKey: true },
        metric_type: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'Type of metric: api_call, slow_query, custom_metric'
        },

        // API call metrics
        endpoint: { type: 'varchar(500)', comment: 'API endpoint path' },
        method: { type: 'varchar(10)', comment: 'HTTP method' },
        status_code: { type: 'integer', comment: 'HTTP status code' },

        // Database query metrics
        query_text: { type: 'text', comment: 'SQL query text (truncated)' },
        table_name: { type: 'varchar(100)', comment: 'Primary table affected' },

        // Custom metrics
        category: { type: 'varchar(100)', comment: 'Custom metric category' },
        metric_name: { type: 'varchar(100)', comment: 'Custom metric name' },
        value: { type: 'numeric', comment: 'Metric value' },
        metadata: { type: 'jsonb', comment: 'Additional metadata' },

        // Common fields
        duration: { type: 'integer', comment: 'Duration in milliseconds' },
        tenant_id: { type: 'integer', comment: 'Tenant ID (if applicable)' },
        timestamp: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },

        created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Indexes for efficient querying
    pgm.createIndex('performance_metrics', 'metric_type');
    pgm.createIndex('performance_metrics', 'timestamp');
    pgm.createIndex('performance_metrics', 'tenant_id');
    pgm.createIndex('performance_metrics', ['endpoint', 'method']);
    pgm.createIndex('performance_metrics', 'table_name');
    pgm.createIndex('performance_metrics', ['category', 'metric_name']);

    // Composite index for time-based queries
    pgm.createIndex('performance_metrics', ['metric_type', 'timestamp']);

    // Performance alerts table
    pgm.createTable('performance_alerts', {
        id: { type: 'serial', primaryKey: true },
        alert_type: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'Type: slow_endpoint, slow_query, high_error_rate, resource_usage'
        },
        severity: {
            type: 'varchar(20)',
            notNull: true,
            default: 'warning',
            comment: 'Severity: info, warning, critical'
        },
        endpoint: { type: 'varchar(500)', comment: 'Affected endpoint' },
        table_name: { type: 'varchar(100)', comment: 'Affected database table' },
        threshold: { type: 'numeric', notNull: true, comment: 'Alert threshold value' },
        current_value: { type: 'numeric', notNull: true, comment: 'Current measured value' },
        message: { type: 'text', notNull: true, comment: 'Alert description' },
        metadata: { type: 'jsonb', comment: 'Additional alert data' },
        resolved: { type: 'boolean', notNull: true, default: false },
        resolved_at: { type: 'timestamp', comment: 'When alert was resolved' },
        tenant_id: { type: 'integer', comment: 'Tenant ID (if applicable)' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Indexes for alerts
    pgm.createIndex('performance_alerts', 'alert_type');
    pgm.createIndex('performance_alerts', 'resolved');
    pgm.createIndex('performance_alerts', 'severity');
    pgm.createIndex('performance_alerts', ['tenant_id', 'resolved']);

    // Automatic cleanup: Delete metrics older than 30 days
    pgm.sql(`
        CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
        RETURNS void AS $$
        BEGIN
            DELETE FROM performance_metrics
            WHERE timestamp < NOW() - INTERVAL '30 days';
        END;
        $$ LANGUAGE plpgsql;
    `);

    // Comments
    pgm.sql(`
        COMMENT ON TABLE performance_metrics IS 'Stores application performance metrics for monitoring and analysis';
        COMMENT ON TABLE performance_alerts IS 'Stores performance degradation alerts';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop function
    pgm.sql('DROP FUNCTION IF EXISTS cleanup_old_performance_metrics();');

    // Drop tables
    pgm.dropTable('performance_alerts');
    pgm.dropTable('performance_metrics');
};
