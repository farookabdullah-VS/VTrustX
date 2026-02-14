/**
 * Two-Factor Authentication Migration
 *
 * Adds 2FA support to users table:
 * - two_factor_enabled: boolean flag
 * - two_factor_secret: encrypted TOTP secret
 * - backup_codes: encrypted array of one-time backup codes
 * - two_factor_verified_at: timestamp when 2FA was last verified
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
    // Add 2FA columns to users table
    pgm.addColumns('users', {
        two_factor_enabled: {
            type: 'boolean',
            notNull: true,
            default: false,
            comment: 'Whether 2FA is enabled for this user'
        },
        two_factor_secret: {
            type: 'text',
            comment: 'Encrypted TOTP secret for 2FA'
        },
        backup_codes: {
            type: 'jsonb',
            comment: 'Encrypted backup codes for account recovery'
        },
        two_factor_verified_at: {
            type: 'timestamp',
            comment: 'Last time 2FA was successfully verified'
        }
    });

    // Create index for faster 2FA lookups
    pgm.createIndex('users', 'two_factor_enabled', {
        name: 'idx_users_two_factor_enabled',
        where: 'two_factor_enabled = true'
    });

    // Create audit log table for 2FA events
    pgm.createTable('two_factor_audit_log', {
        id: 'id',
        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users',
            onDelete: 'CASCADE'
        },
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        event_type: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'enabled, disabled, verified, backup_used, failed_attempt'
        },
        ip_address: {
            type: 'varchar(45)',
            comment: 'IP address where event occurred'
        },
        user_agent: {
            type: 'text',
            comment: 'Browser/device user agent'
        },
        metadata: {
            type: 'jsonb',
            default: '{}',
            comment: 'Additional event data'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Create indexes for audit log
    pgm.createIndex('two_factor_audit_log', 'user_id');
    pgm.createIndex('two_factor_audit_log', 'tenant_id');
    pgm.createIndex('two_factor_audit_log', 'event_type');
    pgm.createIndex('two_factor_audit_log', 'created_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop audit log table
    pgm.dropTable('two_factor_audit_log');

    // Drop index
    pgm.dropIndex('users', 'two_factor_enabled', {
        name: 'idx_users_two_factor_enabled'
    });

    // Remove 2FA columns from users table
    pgm.dropColumns('users', [
        'two_factor_enabled',
        'two_factor_secret',
        'backup_codes',
        'two_factor_verified_at'
    ]);
};
