/**
 * QR Code Distribution Migration
 *
 * Creates infrastructure for QR code-based survey distribution:
 * - qr_codes: Store generated QR codes with tracking
 * - qr_scans: Track individual QR code scans
 * - Adds qr_code_id to submissions table for attribution
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
    // QR Codes Table
    pgm.createTable('qr_codes', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },

        // QR Code Details
        code: { type: 'varchar(64)', notNull: true, unique: true }, // Unique identifier
        name: { type: 'varchar(255)' }, // User-friendly name (e.g., "Store A QR Code")
        description: { type: 'text' },

        // URL Configuration
        short_url: { type: 'varchar(255)', unique: true }, // Short URL (e.g., /qr/abc123)
        full_url: { type: 'text', notNull: true }, // Full survey URL

        // QR Code Image
        qr_image_data: { type: 'text' }, // Base64 encoded PNG image
        qr_image_url: { type: 'text' }, // URL if stored externally (GCS)

        // Design Options
        design_options: { type: 'jsonb', default: '{}' }, // Logo, colors, size, error correction

        // Location/Context Tracking
        location: { type: 'varchar(255)' }, // Physical location (e.g., "Store A, Counter")
        campaign: { type: 'varchar(255)' }, // Campaign name
        tags: { type: 'text[]', default: pgm.func('ARRAY[]::text[]') },

        // Tracking Metadata
        utm_source: { type: 'varchar(255)' },
        utm_medium: { type: 'varchar(255)' },
        utm_campaign: { type: 'varchar(255)' },
        utm_content: { type: 'varchar(255)' },
        utm_term: { type: 'varchar(255)' },

        // Statistics
        total_scans: { type: 'integer', default: 0 },
        unique_scans: { type: 'integer', default: 0 },
        total_submissions: { type: 'integer', default: 0 },
        conversion_rate: { type: 'numeric(5,2)', default: 0.00 }, // submissions / scans

        // Status
        is_active: { type: 'boolean', default: true },
        expires_at: { type: 'timestamp' }, // Optional expiration

        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
        created_by: { type: 'integer' } // User ID
    });

    // QR Code Scans Table
    pgm.createTable('qr_scans', {
        id: { type: 'serial', primaryKey: true },
        qr_code_id: { type: 'integer', notNull: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },

        // Scan Details
        scanned_at: { type: 'timestamp', default: pgm.func('NOW()') },

        // User Information
        ip_address: { type: 'varchar(45)' }, // IPv4 or IPv6
        user_agent: { type: 'text' },
        device_type: { type: 'varchar(50)' }, // mobile, tablet, desktop
        browser: { type: 'varchar(100)' },
        os: { type: 'varchar(100)' },

        // Location Information (GeoIP)
        country: { type: 'varchar(100)' },
        region: { type: 'varchar(100)' },
        city: { type: 'varchar(100)' },
        latitude: { type: 'numeric(10,7)' },
        longitude: { type: 'numeric(10,7)' },

        // Conversion Tracking
        submission_id: { type: 'integer' }, // Linked submission (if converted)
        converted: { type: 'boolean', default: false },
        converted_at: { type: 'timestamp' },
        time_to_conversion_seconds: { type: 'integer' }, // Time from scan to submission

        // Session Tracking
        session_id: { type: 'varchar(255)' }, // Browser session
        is_unique_scan: { type: 'boolean', default: true }, // First scan from this session/device

        // Referrer
        referrer: { type: 'text' },

        created_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Add qr_code_id to submissions table
    pgm.addColumns('submissions', {
        qr_code_id: {
            type: 'integer',
            comment: 'QR code that led to this submission'
        },
        scan_id: {
            type: 'integer',
            comment: 'Specific scan event that led to this submission'
        }
    });

    // Indexes
    pgm.createIndex('qr_codes', 'tenant_id');
    pgm.createIndex('qr_codes', 'form_id');
    pgm.createIndex('qr_codes', 'code', { unique: true });
    pgm.createIndex('qr_codes', 'short_url', { unique: true });
    pgm.createIndex('qr_codes', 'is_active');
    pgm.createIndex('qr_codes', 'expires_at');
    pgm.createIndex('qr_codes', ['tenant_id', 'form_id']);

    pgm.createIndex('qr_scans', 'qr_code_id');
    pgm.createIndex('qr_scans', 'tenant_id');
    pgm.createIndex('qr_scans', 'form_id');
    pgm.createIndex('qr_scans', 'submission_id');
    pgm.createIndex('qr_scans', 'scanned_at');
    pgm.createIndex('qr_scans', 'converted');
    pgm.createIndex('qr_scans', 'is_unique_scan');
    pgm.createIndex('qr_scans', 'session_id');
    pgm.createIndex('qr_scans', ['qr_code_id', 'session_id']);

    pgm.createIndex('submissions', 'qr_code_id');
    pgm.createIndex('submissions', 'scan_id');

    // Foreign key constraints
    pgm.addConstraint('qr_codes', 'fk_qr_codes_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('qr_codes', 'fk_qr_codes_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('qr_scans', 'fk_qr_scans_qr_code', {
        foreignKeys: {
            columns: 'qr_code_id',
            references: 'qr_codes(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('qr_scans', 'fk_qr_scans_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('qr_scans', 'fk_qr_scans_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('qr_scans', 'fk_qr_scans_submission', {
        foreignKeys: {
            columns: 'submission_id',
            references: 'submissions(id)',
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
    pgm.dropConstraint('qr_scans', 'fk_qr_scans_submission', { ifExists: true });
    pgm.dropConstraint('qr_scans', 'fk_qr_scans_form', { ifExists: true });
    pgm.dropConstraint('qr_scans', 'fk_qr_scans_tenant', { ifExists: true });
    pgm.dropConstraint('qr_scans', 'fk_qr_scans_qr_code', { ifExists: true });
    pgm.dropConstraint('qr_codes', 'fk_qr_codes_form', { ifExists: true });
    pgm.dropConstraint('qr_codes', 'fk_qr_codes_tenant', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('submissions', 'scan_id', { ifExists: true });
    pgm.dropIndex('submissions', 'qr_code_id', { ifExists: true });

    pgm.dropIndex('qr_scans', ['qr_code_id', 'session_id'], { ifExists: true });
    pgm.dropIndex('qr_scans', 'session_id', { ifExists: true });
    pgm.dropIndex('qr_scans', 'is_unique_scan', { ifExists: true });
    pgm.dropIndex('qr_scans', 'converted', { ifExists: true });
    pgm.dropIndex('qr_scans', 'scanned_at', { ifExists: true });
    pgm.dropIndex('qr_scans', 'submission_id', { ifExists: true });
    pgm.dropIndex('qr_scans', 'form_id', { ifExists: true });
    pgm.dropIndex('qr_scans', 'tenant_id', { ifExists: true });
    pgm.dropIndex('qr_scans', 'qr_code_id', { ifExists: true });

    pgm.dropIndex('qr_codes', ['tenant_id', 'form_id'], { ifExists: true });
    pgm.dropIndex('qr_codes', 'expires_at', { ifExists: true });
    pgm.dropIndex('qr_codes', 'is_active', { ifExists: true });
    pgm.dropIndex('qr_codes', 'short_url', { ifExists: true });
    pgm.dropIndex('qr_codes', 'code', { ifExists: true });
    pgm.dropIndex('qr_codes', 'form_id', { ifExists: true });
    pgm.dropIndex('qr_codes', 'tenant_id', { ifExists: true });

    // Remove columns from submissions
    pgm.dropColumns('submissions', ['qr_code_id', 'scan_id'], { ifExists: true });

    // Drop tables
    pgm.dropTable('qr_scans', { ifExists: true });
    pgm.dropTable('qr_codes', { ifExists: true });
};
