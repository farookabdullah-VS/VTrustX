/**
 * Response Quality Scoring Migration
 *
 * Creates infrastructure for automatic response quality assessment:
 * - response_quality_scores: Store quality metrics per response
 * - quality_thresholds: Configurable thresholds per tenant
 * - Adds quality_score and quality_flags to submissions table
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
    // Response Quality Scores Table
    pgm.createTable('response_quality_scores', {
        id: { type: 'serial', primaryKey: true },
        submission_id: { type: 'integer', notNull: true, unique: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },

        // Overall Quality Score (0-100)
        quality_score: { type: 'numeric(5,2)', notNull: true, default: 100.00 },

        // Individual Quality Metrics (0-100 each)
        completion_time_score: { type: 'numeric(5,2)', default: 100.00 },
        text_quality_score: { type: 'numeric(5,2)', default: 100.00 },
        consistency_score: { type: 'numeric(5,2)', default: 100.00 },
        engagement_score: { type: 'numeric(5,2)', default: 100.00 },

        // Raw Metrics
        completion_time_seconds: { type: 'integer' }, // Time to complete survey
        expected_time_seconds: { type: 'integer' }, // Expected time based on question count
        time_ratio: { type: 'numeric(5,2)' }, // actual / expected

        text_responses_count: { type: 'integer', default: 0 },
        avg_text_length: { type: 'numeric(8,2)' }, // Average characters per text response
        min_text_length: { type: 'integer' },
        max_text_length: { type: 'integer' },

        straight_lining_detected: { type: 'boolean', default: false }, // All same ratings
        gibberish_detected: { type: 'boolean', default: false },
        suspicious_patterns: { type: 'text[]', default: pgm.func('ARRAY[]::text[]') },

        // Flags
        is_suspicious: { type: 'boolean', default: false },
        is_spam: { type: 'boolean', default: false },
        is_bot: { type: 'boolean', default: false },
        manual_review_required: { type: 'boolean', default: false },

        // Metadata
        quality_details: { type: 'jsonb' }, // Detailed breakdown of scoring
        flagged_reasons: { type: 'text[]', default: pgm.func('ARRAY[]::text[]') },

        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Quality Thresholds Table (tenant-specific configuration)
    pgm.createTable('quality_thresholds', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true, unique: true },

        // Threshold Configuration
        min_quality_score: { type: 'numeric(5,2)', default: 50.00 }, // Below this = low quality
        suspicious_threshold: { type: 'numeric(5,2)', default: 30.00 }, // Below this = suspicious

        // Time Thresholds
        min_completion_time_seconds: { type: 'integer', default: 10 }, // Too fast = suspicious
        max_completion_time_seconds: { type: 'integer', default: 3600 }, // Too slow = abandoned
        time_ratio_min: { type: 'numeric(5,2)', default: 0.2 }, // < 20% expected = too fast
        time_ratio_max: { type: 'numeric(5,2)', default: 5.0 }, // > 500% expected = too slow

        // Text Thresholds
        min_avg_text_length: { type: 'integer', default: 10 }, // Average chars per text response
        min_text_response_length: { type: 'integer', default: 5 }, // Minimum per response

        // Pattern Detection
        enable_straight_lining_detection: { type: 'boolean', default: true },
        enable_gibberish_detection: { type: 'boolean', default: true },
        enable_duplicate_detection: { type: 'boolean', default: true },

        // Actions
        auto_flag_suspicious: { type: 'boolean', default: true },
        auto_exclude_from_analytics: { type: 'boolean', default: false },
        require_manual_review: { type: 'boolean', default: false },

        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Add quality fields to submissions table
    pgm.addColumns('submissions', {
        quality_score: {
            type: 'numeric(5,2)',
            default: 100.00,
            comment: 'Overall quality score (0-100)'
        },
        quality_flags: {
            type: 'text[]',
            default: pgm.func('ARRAY[]::text[]'),
            comment: 'Quality issue flags (e.g., too_fast, gibberish, straight_lining)'
        },
        is_low_quality: {
            type: 'boolean',
            default: false,
            comment: 'Quality score below tenant threshold'
        },
        exclude_from_analytics: {
            type: 'boolean',
            default: false,
            comment: 'Exclude this response from analytics due to quality issues'
        }
    });

    // Indexes
    pgm.createIndex('response_quality_scores', 'submission_id', { unique: true });
    pgm.createIndex('response_quality_scores', 'tenant_id');
    pgm.createIndex('response_quality_scores', 'form_id');
    pgm.createIndex('response_quality_scores', 'quality_score');
    pgm.createIndex('response_quality_scores', 'is_suspicious');
    pgm.createIndex('response_quality_scores', 'is_spam');
    pgm.createIndex('response_quality_scores', 'manual_review_required');
    pgm.createIndex('response_quality_scores', 'created_at');

    pgm.createIndex('quality_thresholds', 'tenant_id', { unique: true });

    pgm.createIndex('submissions', 'quality_score');
    pgm.createIndex('submissions', 'is_low_quality');
    pgm.createIndex('submissions', 'exclude_from_analytics');

    // Foreign key constraints
    pgm.addConstraint('response_quality_scores', 'fk_quality_scores_submission', {
        foreignKeys: {
            columns: 'submission_id',
            references: 'submissions(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('response_quality_scores', 'fk_quality_scores_tenant', {
        foreignKeys: {
            columns: 'tenant_id',
            references: 'tenants(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('response_quality_scores', 'fk_quality_scores_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('quality_thresholds', 'fk_quality_thresholds_tenant', {
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
    pgm.dropConstraint('quality_thresholds', 'fk_quality_thresholds_tenant', { ifExists: true });
    pgm.dropConstraint('response_quality_scores', 'fk_quality_scores_form', { ifExists: true });
    pgm.dropConstraint('response_quality_scores', 'fk_quality_scores_tenant', { ifExists: true });
    pgm.dropConstraint('response_quality_scores', 'fk_quality_scores_submission', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('submissions', 'exclude_from_analytics', { ifExists: true });
    pgm.dropIndex('submissions', 'is_low_quality', { ifExists: true });
    pgm.dropIndex('submissions', 'quality_score', { ifExists: true });

    pgm.dropIndex('quality_thresholds', 'tenant_id', { ifExists: true });

    pgm.dropIndex('response_quality_scores', 'created_at', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'manual_review_required', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'is_spam', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'is_suspicious', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'quality_score', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'form_id', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'tenant_id', { ifExists: true });
    pgm.dropIndex('response_quality_scores', 'submission_id', { ifExists: true });

    // Remove columns from submissions
    pgm.dropColumns('submissions', ['quality_score', 'quality_flags', 'is_low_quality', 'exclude_from_analytics'], { ifExists: true });

    // Drop tables
    pgm.dropTable('quality_thresholds', { ifExists: true });
    pgm.dropTable('response_quality_scores', { ifExists: true });
};
