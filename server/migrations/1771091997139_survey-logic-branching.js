/**
 * Survey Logic & Branching Migration
 *
 * Creates tables for conditional logic, skip logic, quotas, and piping
 * Tables:
 * - question_logic: Conditional display rules for questions
 * - question_quotas: Response quotas per segment
 * - piping_rules: Rules for referencing previous answers
 * - question_groups: Grouping questions into pages/sections
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
    // Question Logic Table (Skip Logic & Display Logic)
    pgm.createTable('question_logic', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },
        question_id: { type: 'varchar(255)', notNull: true }, // Question unique ID
        logic_type: { type: 'varchar(20)', notNull: true }, // skip, display, required_if
        conditions: { type: 'jsonb', notNull: true }, // Array of condition objects
        action: { type: 'varchar(20)', notNull: true }, // show, hide, skip_to, require, disable
        action_target: { type: 'varchar(255)' }, // Target question ID for skip_to
        operator: { type: 'varchar(10)', default: "'and'" }, // and, or
        is_active: { type: 'boolean', default: true },
        priority: { type: 'integer', default: 0 }, // Execution order
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Question Quotas Table
    pgm.createTable('question_quotas', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },
        question_id: { type: 'varchar(255)', notNull: true },
        option_value: { type: 'text' }, // Specific option to limit (null = overall quota)
        quota_type: { type: 'varchar(20)', notNull: true }, // response_limit, daily_limit, per_user
        quota_limit: { type: 'integer', notNull: true },
        current_count: { type: 'integer', default: 0 },
        is_active: { type: 'boolean', default: true },
        quota_reached_action: { type: 'varchar(20)', default: "'disable_option'" }, // disable_option, hide_option, close_survey
        reset_frequency: { type: 'varchar(20)' }, // daily, weekly, monthly, never
        last_reset_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Piping Rules Table
    pgm.createTable('piping_rules', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },
        target_question_id: { type: 'varchar(255)', notNull: true }, // Question to inject answer into
        source_question_id: { type: 'varchar(255)', notNull: true }, // Question to pull answer from
        piping_type: { type: 'varchar(20)', notNull: true }, // answer, choice, metadata
        template: { type: 'text' }, // Template string like "You selected {{Q1}}"
        transform_rule: { type: 'jsonb' }, // Rules for transforming the value
        fallback_value: { type: 'text' }, // Value if source is empty
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Question Groups Table (Pages/Sections)
    pgm.createTable('question_groups', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },
        group_id: { type: 'varchar(255)', notNull: true, unique: true },
        group_name: { type: 'varchar(255)', notNull: true },
        group_type: { type: 'varchar(20)', default: "'page'" }, // page, section
        description: { type: 'text' },
        question_ids: { type: 'jsonb', notNull: true }, // Array of question IDs in this group
        display_order: { type: 'integer', notNull: true },
        randomize_questions: { type: 'boolean', default: false },
        randomize_options: { type: 'boolean', default: false },
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Add logic and quota fields to forms table
    pgm.addColumn('forms', {
        enable_logic: { type: 'boolean', default: false },
        enable_quotas: { type: 'boolean', default: false },
        enable_piping: { type: 'boolean', default: false },
        enable_randomization: { type: 'boolean', default: false },
        pagination_mode: { type: 'varchar(20)', default: "'single_page'" }, // single_page, question_per_page, custom_pages
        progress_bar: { type: 'boolean', default: true }
    });

    // Indexes for performance
    pgm.createIndex('question_logic', 'form_id');
    pgm.createIndex('question_logic', 'question_id');
    pgm.createIndex('question_logic', ['form_id', 'question_id']);
    pgm.createIndex('question_logic', 'tenant_id');
    pgm.createIndex('question_logic', 'is_active');

    pgm.createIndex('question_quotas', 'form_id');
    pgm.createIndex('question_quotas', 'question_id');
    pgm.createIndex('question_quotas', ['form_id', 'question_id', 'option_value']);
    pgm.createIndex('question_quotas', 'tenant_id');
    pgm.createIndex('question_quotas', 'is_active');

    pgm.createIndex('piping_rules', 'form_id');
    pgm.createIndex('piping_rules', 'target_question_id');
    pgm.createIndex('piping_rules', 'source_question_id');
    pgm.createIndex('piping_rules', 'tenant_id');
    pgm.createIndex('piping_rules', 'is_active');

    pgm.createIndex('question_groups', 'form_id');
    pgm.createIndex('question_groups', 'group_id', { unique: true });
    pgm.createIndex('question_groups', 'tenant_id');
    pgm.createIndex('question_groups', 'display_order');

    // Foreign key constraints
    pgm.addConstraint('question_logic', 'fk_question_logic_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('question_quotas', 'fk_question_quotas_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('piping_rules', 'fk_piping_rules_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('question_groups', 'fk_question_groups_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
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
    pgm.dropConstraint('question_logic', 'fk_question_logic_form', { ifExists: true });
    pgm.dropConstraint('question_quotas', 'fk_question_quotas_form', { ifExists: true });
    pgm.dropConstraint('piping_rules', 'fk_piping_rules_form', { ifExists: true });
    pgm.dropConstraint('question_groups', 'fk_question_groups_form', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('question_logic', 'form_id', { ifExists: true });
    pgm.dropIndex('question_logic', 'question_id', { ifExists: true });
    pgm.dropIndex('question_logic', ['form_id', 'question_id'], { ifExists: true });
    pgm.dropIndex('question_logic', 'tenant_id', { ifExists: true });
    pgm.dropIndex('question_logic', 'is_active', { ifExists: true });

    pgm.dropIndex('question_quotas', 'form_id', { ifExists: true });
    pgm.dropIndex('question_quotas', 'question_id', { ifExists: true });
    pgm.dropIndex('question_quotas', ['form_id', 'question_id', 'option_value'], { ifExists: true });
    pgm.dropIndex('question_quotas', 'tenant_id', { ifExists: true });
    pgm.dropIndex('question_quotas', 'is_active', { ifExists: true });

    pgm.dropIndex('piping_rules', 'form_id', { ifExists: true });
    pgm.dropIndex('piping_rules', 'target_question_id', { ifExists: true });
    pgm.dropIndex('piping_rules', 'source_question_id', { ifExists: true });
    pgm.dropIndex('piping_rules', 'tenant_id', { ifExists: true });
    pgm.dropIndex('piping_rules', 'is_active', { ifExists: true });

    pgm.dropIndex('question_groups', 'form_id', { ifExists: true });
    pgm.dropIndex('question_groups', 'group_id', { ifExists: true });
    pgm.dropIndex('question_groups', 'tenant_id', { ifExists: true });
    pgm.dropIndex('question_groups', 'display_order', { ifExists: true });

    // Remove columns from forms table
    pgm.dropColumn('forms', 'enable_logic', { ifExists: true });
    pgm.dropColumn('forms', 'enable_quotas', { ifExists: true });
    pgm.dropColumn('forms', 'enable_piping', { ifExists: true });
    pgm.dropColumn('forms', 'enable_randomization', { ifExists: true });
    pgm.dropColumn('forms', 'pagination_mode', { ifExists: true });
    pgm.dropColumn('forms', 'progress_bar', { ifExists: true });

    // Drop tables
    pgm.dropTable('question_groups', { ifExists: true });
    pgm.dropTable('piping_rules', { ifExists: true });
    pgm.dropTable('question_quotas', { ifExists: true });
    pgm.dropTable('question_logic', { ifExists: true });
};
