/**
 * Migration 010: A/B Testing Framework
 *
 * Creates tables for A/B testing experiments, variants, and assignments.
 * Enables multi-variant testing for campaign optimization with statistical analysis.
 */

exports.up = async (pgm) => {
    // 1. AB Experiments Table
    pgm.createTable('ab_experiments', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        },
        name: {
            type: 'varchar(255)',
            notNull: true
        },
        description: {
            type: 'text'
        },
        form_id: {
            type: 'integer',
            references: 'forms(id)',
            onDelete: 'SET NULL'
        },
        channel: {
            type: 'varchar(20)',
            notNull: true,
            check: "channel IN ('email', 'sms', 'whatsapp')"
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: 'draft',
            check: "status IN ('draft', 'running', 'paused', 'completed')"
        },
        traffic_allocation: {
            type: 'jsonb',
            notNull: true,
            default: '{}',
            comment: 'Traffic split per variant: {"A": 50, "B": 50}'
        },
        success_metric: {
            type: 'varchar(50)',
            notNull: true,
            default: 'response_rate',
            comment: 'delivery_rate, open_rate, click_rate, response_rate'
        },
        minimum_sample_size: {
            type: 'integer',
            default: 100,
            comment: 'Minimum recipients per variant'
        },
        confidence_level: {
            type: 'numeric(5,2)',
            default: 95.00,
            comment: 'Statistical confidence level (e.g., 95.00 for 95%)'
        },
        winning_variant_id: {
            type: 'integer',
            references: 'ab_variants(id)',
            onDelete: 'SET NULL'
        },
        started_at: {
            type: 'timestamp'
        },
        ended_at: {
            type: 'timestamp'
        },
        created_by: {
            type: 'integer',
            references: 'users(id)',
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

    // Indexes for ab_experiments
    pgm.createIndex('ab_experiments', 'tenant_id');
    pgm.createIndex('ab_experiments', ['tenant_id', 'status']);
    pgm.createIndex('ab_experiments', 'form_id');
    pgm.createIndex('ab_experiments', 'created_at');

    // 2. AB Variants Table
    pgm.createTable('ab_variants', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_experiments(id)',
            onDelete: 'CASCADE'
        },
        variant_name: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'A, B, C, Control, etc.'
        },
        subject: {
            type: 'text',
            comment: 'Email subject line'
        },
        body: {
            type: 'text',
            notNull: true,
            comment: 'Message body with placeholders'
        },
        media_attachments: {
            type: 'jsonb',
            default: '[]',
            comment: 'Media assets: [{"type": "image", "id": 123}]'
        },
        metadata: {
            type: 'jsonb',
            default: '{}',
            comment: 'Additional variant metadata'
        },
        distribution_id: {
            type: 'integer',
            references: 'distributions(id)',
            onDelete: 'SET NULL',
            comment: 'Link to actual distribution'
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

    // Indexes for ab_variants
    pgm.createIndex('ab_variants', 'experiment_id');
    pgm.createIndex('ab_variants', ['experiment_id', 'variant_name'], { unique: true });

    // 3. AB Assignments Table
    pgm.createTable('ab_assignments', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_experiments(id)',
            onDelete: 'CASCADE'
        },
        variant_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_variants(id)',
            onDelete: 'CASCADE'
        },
        recipient_id: {
            type: 'varchar(255)',
            notNull: true,
            comment: 'Email or phone number'
        },
        recipient_name: {
            type: 'varchar(255)'
        },
        message_id: {
            type: 'varchar(255)',
            comment: 'Reference to email_messages/sms_messages/whatsapp_messages'
        },
        assigned_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Indexes for ab_assignments
    pgm.createIndex('ab_assignments', 'experiment_id');
    pgm.createIndex('ab_assignments', 'variant_id');
    pgm.createIndex('ab_assignments', ['experiment_id', 'recipient_id'], { unique: true });
    pgm.createIndex('ab_assignments', 'message_id');

    // Add experiment_id to distributions table
    pgm.addColumns('distributions', {
        experiment_id: {
            type: 'integer',
            references: 'ab_experiments(id)',
            onDelete: 'SET NULL'
        }
    });

    pgm.createIndex('distributions', 'experiment_id');

    // Add comments
    pgm.sql(`
        COMMENT ON TABLE ab_experiments IS 'A/B testing experiments for campaign optimization';
        COMMENT ON TABLE ab_variants IS 'Variants (A, B, C) for each experiment';
        COMMENT ON TABLE ab_assignments IS 'Recipient assignments to variants';
    `);
};

exports.down = async (pgm) => {
    // Drop in reverse order due to foreign keys
    pgm.dropTable('ab_assignments', { ifExists: true, cascade: true });
    pgm.dropTable('ab_variants', { ifExists: true, cascade: true });
    pgm.dropTable('ab_experiments', { ifExists: true, cascade: true });

    // Remove experiment_id from distributions
    pgm.dropColumns('distributions', ['experiment_id'], { ifExists: true });
};
