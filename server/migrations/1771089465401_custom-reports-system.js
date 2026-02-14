/**
 * Migration: Custom Reports System
 *
 * Creates tables for visual custom report builder with drag-and-drop widgets
 * Features:
 * - Custom report layouts with widget positioning
 * - Multiple widget types (charts, tables, metrics, text)
 * - Report sharing with public tokens
 * - Filter and segment configuration
 * - Report templates library
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
    // Main custom reports table
    pgm.createTable('custom_reports', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true, references: 'tenants(id)', onDelete: 'CASCADE' },
        name: { type: 'varchar(255)', notNull: true },
        description: { type: 'text' },

        // Layout configuration (widget positions and sizes)
        layout: {
            type: 'jsonb',
            notNull: true,
            default: '{"widgets": [], "columns": 12, "rowHeight": 80}'
        },

        // Global filters applied to all widgets
        filters: {
            type: 'jsonb',
            default: '{"dateRange": "last_30_days", "formIds": [], "customFilters": []}'
        },

        // Report category (analytics, operations, executive, etc.)
        category: { type: 'varchar(50)', default: "'custom'" },

        // Tags for organization
        tags: { type: 'jsonb', default: '[]' },

        // Sharing and access control
        is_public: { type: 'boolean', default: false },
        public_token: { type: 'varchar(64)', unique: true },
        password_protected: { type: 'boolean', default: false },
        password_hash: { type: 'varchar(255)' },

        // Template flag
        is_template: { type: 'boolean', default: false },
        template_category: { type: 'varchar(50)' },

        // Metadata
        created_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
        last_modified_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },

        // Usage tracking
        view_count: { type: 'integer', default: 0 },
        last_viewed_at: { type: 'timestamp' },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Report widgets table (stores individual widget configurations)
    pgm.createTable('report_widgets', {
        id: { type: 'serial', primaryKey: true },
        report_id: { type: 'integer', notNull: true, references: 'custom_reports(id)', onDelete: 'CASCADE' },

        // Widget identification
        widget_key: { type: 'varchar(100)', notNull: true }, // Unique key within report
        widget_type: { type: 'varchar(50)', notNull: true }, // chart, table, metric, text, funnel, heatmap

        // Position and size (grid layout)
        position: {
            type: 'jsonb',
            notNull: true,
            default: '{"x": 0, "y": 0, "w": 4, "h": 3}'
        },

        // Widget configuration
        config: {
            type: 'jsonb',
            notNull: true,
            default: '{}'
            // Examples:
            // Chart: {chartType: "bar", dataSource: "responses", metric: "count", groupBy: "date"}
            // Table: {columns: [...], sortBy: "date", pageSize: 10}
            // Metric: {metric: "nps_score", aggregate: "average", comparison: "previous_period"}
            // Text: {content: "Report title", fontSize: 24, alignment: "center"}
        },

        // Data source configuration
        data_source: {
            type: 'jsonb',
            default: '{"type": "submissions", "formIds": [], "filters": []}'
        },

        // Widget-specific filters (overrides report-level filters)
        local_filters: { type: 'jsonb', default: '{}' },

        // Display settings
        title: { type: 'varchar(255)' },
        subtitle: { type: 'text' },
        show_title: { type: 'boolean', default: true },

        // Style configuration
        style: {
            type: 'jsonb',
            default: '{"backgroundColor": "#ffffff", "borderRadius": 8, "padding": 16}'
        },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Report shares table (track who has access to shared reports)
    pgm.createTable('report_shares', {
        id: { type: 'serial', primaryKey: true },
        report_id: { type: 'integer', notNull: true, references: 'custom_reports(id)', onDelete: 'CASCADE' },

        // Recipient information
        shared_with_user_id: { type: 'integer', references: 'users(id)', onDelete: 'CASCADE' },
        shared_with_email: { type: 'varchar(255)' }, // For external shares

        // Share settings
        access_level: { type: 'varchar(20)', notNull: true, default: "'view'" }, // view, edit
        expires_at: { type: 'timestamp' },

        // Share token for external access
        share_token: { type: 'varchar(64)', unique: true },

        // Tracking
        view_count: { type: 'integer', default: 0 },
        last_viewed_at: { type: 'timestamp' },

        // Metadata
        shared_by: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
        message: { type: 'text' }, // Optional message to recipient

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Report snapshots table (for point-in-time data captures)
    pgm.createTable('report_snapshots', {
        id: { type: 'serial', primaryKey: true },
        report_id: { type: 'integer', notNull: true, references: 'custom_reports(id)', onDelete: 'CASCADE' },

        // Snapshot data
        snapshot_data: { type: 'jsonb', notNull: true }, // Captured widget data
        filters_applied: { type: 'jsonb' }, // Filters at time of snapshot

        // Metadata
        created_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
        snapshot_name: { type: 'varchar(255)' },
        snapshot_note: { type: 'text' },

        // Timestamps
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Indexes for performance
    pgm.createIndex('custom_reports', 'tenant_id');
    pgm.createIndex('custom_reports', 'public_token');
    pgm.createIndex('custom_reports', 'is_template');
    pgm.createIndex('custom_reports', ['tenant_id', 'category']);
    pgm.createIndex('custom_reports', 'created_by');

    pgm.createIndex('report_widgets', 'report_id');
    pgm.createIndex('report_widgets', ['report_id', 'widget_key']);

    pgm.createIndex('report_shares', 'report_id');
    pgm.createIndex('report_shares', 'shared_with_user_id');
    pgm.createIndex('report_shares', 'share_token');
    pgm.createIndex('report_shares', 'shared_by');

    pgm.createIndex('report_snapshots', 'report_id');
    pgm.createIndex('report_snapshots', 'created_by');
    pgm.createIndex('report_snapshots', 'created_at');

    // Comments for documentation
    pgm.sql(`
        COMMENT ON TABLE custom_reports IS 'Custom report definitions with drag-and-drop layout';
        COMMENT ON TABLE report_widgets IS 'Individual widgets (charts, tables, metrics) within reports';
        COMMENT ON TABLE report_shares IS 'Report sharing and access control';
        COMMENT ON TABLE report_snapshots IS 'Point-in-time data snapshots for reports';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('report_snapshots', { cascade: true });
    pgm.dropTable('report_shares', { cascade: true });
    pgm.dropTable('report_widgets', { cascade: true });
    pgm.dropTable('custom_reports', { cascade: true });
};
