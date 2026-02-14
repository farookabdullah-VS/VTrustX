/**
 * Advanced Contact Management Migration
 *
 * Enhances the contacts table with:
 * - Custom fields (JSON schema)
 * - Tags and segmentation
 * - Contact timeline/activity tracking
 * - Suppression list (do not contact)
 * - Duplicate detection fields
 * - Import/export metadata
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
    // Extend contacts table with new fields
    pgm.addColumns('contacts', {
        custom_fields: { type: 'jsonb', default: '{}' }, // User-defined fields
        tags: { type: 'text[]', default: '{}' }, // Array of tags
        source: { type: 'varchar(50)' }, // manual, import, api, crm, form_submission
        lifecycle_stage: { type: 'varchar(50)' }, // lead, prospect, customer, churned
        is_suppressed: { type: 'boolean', default: false }, // Do not contact
        suppression_reason: { type: 'text' },
        suppressed_at: { type: 'timestamp' },
        last_contacted_at: { type: 'timestamp' },
        last_responded_at: { type: 'timestamp' },
        response_count: { type: 'integer', default: 0 },
        engagement_score: { type: 'integer', default: 0 }, // 0-100
        duplicate_of: { type: 'integer' }, // References another contact if this is a duplicate
        merged_at: { type: 'timestamp' },
        import_batch_id: { type: 'varchar(100)' }, // Track which batch this came from
        metadata: { type: 'jsonb', default: '{}' } // Additional metadata
    });

    // Contact Segments Table
    pgm.createTable('contact_segments', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        name: { type: 'varchar(255)', notNull: true },
        description: { type: 'text' },
        is_dynamic: { type: 'boolean', default: true }, // Dynamic (auto-update) or static
        conditions: { type: 'jsonb', notNull: true }, // Filter conditions
        contact_count: { type: 'integer', default: 0 },
        last_calculated_at: { type: 'timestamp' },
        created_by: { type: 'integer' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Contact Segment Members (for static segments or caching)
    pgm.createTable('contact_segment_members', {
        id: { type: 'serial', primaryKey: true },
        segment_id: { type: 'integer', notNull: true },
        contact_id: { type: 'integer', notNull: true },
        added_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Contact Tags Table (predefined tags)
    pgm.createTable('contact_tags', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        name: { type: 'varchar(100)', notNull: true },
        color: { type: 'varchar(20)', default: "'blue'" }, // Tag color
        description: { type: 'text' },
        usage_count: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Contact Timeline/Activity Table
    pgm.createTable('contact_activities', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        contact_id: { type: 'integer', notNull: true },
        activity_type: { type: 'varchar(50)', notNull: true }, // email_sent, sms_sent, form_submitted, etc.
        activity_data: { type: 'jsonb' }, // Activity details
        related_entity_type: { type: 'varchar(50)' }, // form, distribution, campaign
        related_entity_id: { type: 'integer' },
        performed_at: { type: 'timestamp', default: pgm.func('NOW()') },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Custom Field Definitions Table (schema for custom fields)
    pgm.createTable('custom_field_definitions', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        field_key: { type: 'varchar(100)', notNull: true }, // e.g., "company_size"
        field_label: { type: 'varchar(255)', notNull: true }, // e.g., "Company Size"
        field_type: { type: 'varchar(50)', notNull: true }, // text, number, date, boolean, select, multi_select
        field_options: { type: 'jsonb' }, // For select/multi_select types
        is_required: { type: 'boolean', default: false },
        display_order: { type: 'integer', default: 0 },
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Import/Export Jobs Table
    pgm.createTable('contact_import_jobs', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        batch_id: { type: 'varchar(100)', notNull: true, unique: true },
        file_name: { type: 'varchar(255)' },
        file_url: { type: 'text' },
        status: { type: 'varchar(20)', default: "'pending'" }, // pending, processing, completed, failed
        total_rows: { type: 'integer', default: 0 },
        processed_rows: { type: 'integer', default: 0 },
        successful_rows: { type: 'integer', default: 0 },
        failed_rows: { type: 'integer', default: 0 },
        duplicate_rows: { type: 'integer', default: 0 },
        error_log: { type: 'jsonb' },
        mapping: { type: 'jsonb' }, // Column mapping configuration
        started_at: { type: 'timestamp' },
        completed_at: { type: 'timestamp' },
        created_by: { type: 'integer' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Indexes for performance
    pgm.createIndex('contacts', 'tags', { method: 'gin' }); // GIN index for array queries
    pgm.createIndex('contacts', 'custom_fields', { method: 'gin' }); // GIN index for JSONB
    pgm.createIndex('contacts', 'is_suppressed');
    pgm.createIndex('contacts', 'lifecycle_stage');
    pgm.createIndex('contacts', 'source');
    pgm.createIndex('contacts', 'engagement_score');
    pgm.createIndex('contacts', 'last_contacted_at');
    pgm.createIndex('contacts', 'duplicate_of');

    pgm.createIndex('contact_segments', 'tenant_id');
    pgm.createIndex('contact_segments', 'is_dynamic');

    pgm.createIndex('contact_segment_members', 'segment_id');
    pgm.createIndex('contact_segment_members', 'contact_id');
    pgm.createIndex('contact_segment_members', ['segment_id', 'contact_id'], { unique: true });

    pgm.createIndex('contact_tags', 'tenant_id');
    pgm.createIndex('contact_tags', ['tenant_id', 'name'], { unique: true });

    pgm.createIndex('contact_activities', 'contact_id');
    pgm.createIndex('contact_activities', 'tenant_id');
    pgm.createIndex('contact_activities', 'activity_type');
    pgm.createIndex('contact_activities', 'performed_at');
    pgm.createIndex('contact_activities', ['related_entity_type', 'related_entity_id']);

    pgm.createIndex('custom_field_definitions', 'tenant_id');
    pgm.createIndex('custom_field_definitions', ['tenant_id', 'field_key'], { unique: true });

    pgm.createIndex('contact_import_jobs', 'tenant_id');
    pgm.createIndex('contact_import_jobs', 'batch_id', { unique: true });
    pgm.createIndex('contact_import_jobs', 'status');

    // Foreign key constraints
    pgm.addConstraint('contacts', 'fk_contacts_duplicate_of', {
        foreignKeys: {
            columns: 'duplicate_of',
            references: 'contacts(id)',
            onDelete: 'SET NULL'
        }
    });

    pgm.addConstraint('contact_segments', 'fk_contact_segments_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('contact_segment_members', 'fk_segment_members_segment', {
        foreignKeys: {
            columns: 'segment_id',
            references: 'contact_segments(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('contact_segment_members', 'fk_segment_members_contact', {
        foreignKeys: {
            columns: 'contact_id',
            references: 'contacts(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('contact_tags', 'fk_contact_tags_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('contact_activities', 'fk_contact_activities_contact', {
        foreignKeys: {
            columns: 'contact_id',
            references: 'contacts(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('custom_field_definitions', 'fk_custom_fields_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('contact_import_jobs', 'fk_import_jobs_tenant', {
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
    pgm.dropConstraint('contact_import_jobs', 'fk_import_jobs_tenant', { ifExists: true });
    pgm.dropConstraint('custom_field_definitions', 'fk_custom_fields_tenant', { ifExists: true });
    pgm.dropConstraint('contact_activities', 'fk_contact_activities_contact', { ifExists: true });
    pgm.dropConstraint('contact_tags', 'fk_contact_tags_tenant', { ifExists: true });
    pgm.dropConstraint('contact_segment_members', 'fk_segment_members_contact', { ifExists: true });
    pgm.dropConstraint('contact_segment_members', 'fk_segment_members_segment', { ifExists: true });
    pgm.dropConstraint('contact_segments', 'fk_contact_segments_tenant', { ifExists: true });
    pgm.dropConstraint('contacts', 'fk_contacts_duplicate_of', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('contact_import_jobs', 'status', { ifExists: true });
    pgm.dropIndex('contact_import_jobs', 'batch_id', { ifExists: true });
    pgm.dropIndex('contact_import_jobs', 'tenant_id', { ifExists: true });
    pgm.dropIndex('custom_field_definitions', ['tenant_id', 'field_key'], { ifExists: true });
    pgm.dropIndex('custom_field_definitions', 'tenant_id', { ifExists: true });
    pgm.dropIndex('contact_activities', ['related_entity_type', 'related_entity_id'], { ifExists: true });
    pgm.dropIndex('contact_activities', 'performed_at', { ifExists: true });
    pgm.dropIndex('contact_activities', 'activity_type', { ifExists: true });
    pgm.dropIndex('contact_activities', 'tenant_id', { ifExists: true });
    pgm.dropIndex('contact_activities', 'contact_id', { ifExists: true });
    pgm.dropIndex('contact_tags', ['tenant_id', 'name'], { ifExists: true });
    pgm.dropIndex('contact_tags', 'tenant_id', { ifExists: true });
    pgm.dropIndex('contact_segment_members', ['segment_id', 'contact_id'], { ifExists: true });
    pgm.dropIndex('contact_segment_members', 'contact_id', { ifExists: true });
    pgm.dropIndex('contact_segment_members', 'segment_id', { ifExists: true });
    pgm.dropIndex('contact_segments', 'is_dynamic', { ifExists: true });
    pgm.dropIndex('contact_segments', 'tenant_id', { ifExists: true });
    pgm.dropIndex('contacts', 'duplicate_of', { ifExists: true });
    pgm.dropIndex('contacts', 'last_contacted_at', { ifExists: true });
    pgm.dropIndex('contacts', 'engagement_score', { ifExists: true });
    pgm.dropIndex('contacts', 'source', { ifExists: true });
    pgm.dropIndex('contacts', 'lifecycle_stage', { ifExists: true });
    pgm.dropIndex('contacts', 'is_suppressed', { ifExists: true });
    pgm.dropIndex('contacts', 'custom_fields', { ifExists: true });
    pgm.dropIndex('contacts', 'tags', { ifExists: true });

    // Drop tables
    pgm.dropTable('contact_import_jobs', { ifExists: true });
    pgm.dropTable('custom_field_definitions', { ifExists: true });
    pgm.dropTable('contact_activities', { ifExists: true });
    pgm.dropTable('contact_tags', { ifExists: true });
    pgm.dropTable('contact_segment_members', { ifExists: true });
    pgm.dropTable('contact_segments', { ifExists: true });

    // Remove columns from contacts table
    pgm.dropColumns('contacts', [
        'custom_fields',
        'tags',
        'source',
        'lifecycle_stage',
        'is_suppressed',
        'suppression_reason',
        'suppressed_at',
        'last_contacted_at',
        'last_responded_at',
        'response_count',
        'engagement_score',
        'duplicate_of',
        'merged_at',
        'import_batch_id',
        'metadata'
    ], { ifExists: true });
};
