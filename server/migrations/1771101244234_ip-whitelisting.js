/**
 * IP Whitelisting Migration
 *
 * Enables tenants to restrict access to their accounts from specific IP addresses or ranges.
 * Supports individual IPs (192.168.1.1) and CIDR ranges (192.168.1.0/24).
 *
 * Features:
 * - Per-tenant IP whitelist rules
 * - Global enable/disable toggle
 * - Rule descriptions for documentation
 * - Bypass mode for emergencies (requires admin approval)
 * - Audit trail of IP access attempts
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
    // IP whitelist rules table
    pgm.createTable('ip_whitelist_rules', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE',
            comment: 'Tenant that owns this rule'
        },
        ip_address: {
            type: 'varchar(45)',
            comment: 'Single IP address (e.g., 192.168.1.1 or 2001:db8::1)'
        },
        ip_range: {
            type: 'varchar(50)',
            comment: 'CIDR range (e.g., 192.168.1.0/24)'
        },
        description: {
            type: 'text',
            comment: 'Human-readable description (e.g., "Office WiFi", "VPN Gateway")'
        },
        is_active: {
            type: 'boolean',
            notNull: true,
            default: true,
            comment: 'Whether this rule is currently active'
        },
        created_by: {
            type: 'integer',
            references: 'users',
            onDelete: 'SET NULL',
            comment: 'User who created this rule'
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

    // IP whitelist configuration table (per-tenant settings)
    pgm.createTable('ip_whitelist_config', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE',
            unique: true,
            comment: 'Tenant ID (one config per tenant)'
        },
        enabled: {
            type: 'boolean',
            notNull: true,
            default: false,
            comment: 'Global enable/disable switch for IP whitelisting'
        },
        enforcement_mode: {
            type: 'varchar(20)',
            notNull: true,
            default: 'enforce',
            comment: 'Mode: enforce (block), monitor (log only), disabled'
        },
        bypass_roles: {
            type: 'jsonb',
            default: '[]',
            comment: 'Roles that can bypass IP whitelist (e.g., ["admin", "tenant_admin"])'
        },
        grace_period_minutes: {
            type: 'integer',
            default: 0,
            comment: 'Grace period after rule changes before enforcement (for testing)'
        },
        last_modified_by: {
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

    // IP access attempts log (for monitoring and audit)
    pgm.createTable('ip_access_log', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            references: 'tenants',
            onDelete: 'CASCADE',
            comment: 'Tenant ID (null for pre-auth attempts)'
        },
        user_id: {
            type: 'integer',
            references: 'users',
            onDelete: 'SET NULL',
            comment: 'User attempting access (null for failed auth)'
        },
        ip_address: {
            type: 'varchar(45)',
            notNull: true,
            comment: 'IP address of access attempt'
        },
        request_path: {
            type: 'text',
            comment: 'API endpoint being accessed'
        },
        allowed: {
            type: 'boolean',
            notNull: true,
            comment: 'Whether access was allowed'
        },
        reason: {
            type: 'varchar(100)',
            comment: 'Reason for allow/deny (matched_rule, not_whitelisted, bypass_role, etc.)'
        },
        matched_rule_id: {
            type: 'integer',
            references: 'ip_whitelist_rules',
            onDelete: 'SET NULL',
            comment: 'Which whitelist rule matched (if any)'
        },
        user_agent: {
            type: 'text',
            comment: 'Browser/client user agent'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Indexes for fast lookups
    pgm.createIndex('ip_whitelist_rules', 'tenant_id');
    pgm.createIndex('ip_whitelist_rules', ['tenant_id', 'is_active']);
    pgm.createIndex('ip_whitelist_config', 'tenant_id');
    pgm.createIndex('ip_access_log', 'tenant_id');
    pgm.createIndex('ip_access_log', 'ip_address');
    pgm.createIndex('ip_access_log', 'created_at');
    pgm.createIndex('ip_access_log', ['tenant_id', 'created_at']);

    // Constraint: Each rule must have either ip_address OR ip_range (not both)
    pgm.addConstraint('ip_whitelist_rules', 'ip_address_or_range_check', {
        check: '(ip_address IS NOT NULL AND ip_range IS NULL) OR (ip_address IS NULL AND ip_range IS NOT NULL)'
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('ip_access_log');
    pgm.dropTable('ip_whitelist_config');
    pgm.dropTable('ip_whitelist_rules');
};
