/* eslint-disable camelcase */

/**
 * Migration: Add Advanced Statistics Tables for Phase 6
 *
 * Adds support for:
 * - Bayesian A/B Testing (posteriors, probabilities)
 * - Sequential Analysis (interim checks, boundaries)
 * - Multi-Armed Bandits (dynamic allocation, regret)
 * - Power Analysis (sample size calculations)
 */

exports.shorthands = undefined;

exports.up = pgm => {
    // 1. Add columns to ab_experiments table
    pgm.addColumns('ab_experiments', {
        statistical_method: {
            type: 'varchar(50)',
            default: "'frequentist'",
            comment: 'Statistical method: frequentist, bayesian, sequential, bandit'
        },
        early_stopping_enabled: {
            type: 'boolean',
            default: false,
            comment: 'Enable early stopping for sequential analysis'
        },
        bandit_algorithm: {
            type: 'varchar(50)',
            notNull: false,
            comment: 'Bandit algorithm: thompson, ucb, epsilon_greedy'
        },
        power_analysis_id: {
            type: 'integer',
            notNull: false,
            comment: 'Reference to power analysis calculation'
        }
    });

    // 2. Bayesian statistics table
    pgm.createTable('ab_bayesian_stats', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_experiments',
            onDelete: 'CASCADE'
        },
        variant_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_variants',
            onDelete: 'CASCADE'
        },
        alpha_prior: {
            type: 'float',
            notNull: true,
            default: 1.0,
            comment: 'Beta distribution alpha parameter (prior)'
        },
        beta_prior: {
            type: 'float',
            notNull: true,
            default: 1.0,
            comment: 'Beta distribution beta parameter (prior)'
        },
        alpha_posterior: {
            type: 'float',
            notNull: false,
            comment: 'Beta distribution alpha parameter (posterior)'
        },
        beta_posterior: {
            type: 'float',
            notNull: false,
            comment: 'Beta distribution beta parameter (posterior)'
        },
        probability_best: {
            type: 'float',
            notNull: false,
            comment: 'Probability that this variant is the best'
        },
        credible_interval_lower: {
            type: 'float',
            notNull: false,
            comment: 'Lower bound of 95% credible interval'
        },
        credible_interval_upper: {
            type: 'float',
            notNull: false,
            comment: 'Upper bound of 95% credible interval'
        },
        expected_loss: {
            type: 'float',
            notNull: false,
            comment: 'Expected loss if this variant is chosen'
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    // Indexes for bayesian_stats
    pgm.createIndex('ab_bayesian_stats', 'experiment_id');
    pgm.createIndex('ab_bayesian_stats', 'variant_id');
    pgm.createIndex('ab_bayesian_stats', ['experiment_id', 'variant_id'], { unique: true });

    // 3. Sequential analysis table
    pgm.createTable('ab_sequential_analysis', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_experiments',
            onDelete: 'CASCADE'
        },
        check_number: {
            type: 'integer',
            notNull: true,
            comment: 'Interim analysis check number (1, 2, 3...)'
        },
        total_checks: {
            type: 'integer',
            notNull: true,
            comment: 'Total planned number of interim checks'
        },
        total_assignments: {
            type: 'integer',
            notNull: true,
            comment: 'Total assignments at time of check'
        },
        information_fraction: {
            type: 'float',
            notNull: true,
            comment: 'Fraction of planned information (currentN / plannedN)'
        },
        alpha_spent: {
            type: 'float',
            notNull: true,
            comment: 'Cumulative alpha (type I error) spent so far'
        },
        z_statistic: {
            type: 'float',
            notNull: true,
            comment: 'Current Z-statistic for test'
        },
        boundary_upper: {
            type: 'float',
            notNull: true,
            comment: 'Upper stopping boundary (O\'Brien-Fleming)'
        },
        boundary_lower: {
            type: 'float',
            notNull: true,
            comment: 'Lower stopping boundary (O\'Brien-Fleming)'
        },
        decision: {
            type: 'varchar(20)',
            notNull: true,
            comment: 'Decision: continue, stop_winner, stop_futile'
        },
        decision_reason: {
            type: 'text',
            notNull: false,
            comment: 'Explanation of decision'
        },
        checked_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    // Indexes for sequential_analysis
    pgm.createIndex('ab_sequential_analysis', 'experiment_id');
    pgm.createIndex('ab_sequential_analysis', ['experiment_id', 'check_number']);

    // 4. Multi-armed bandit state table
    pgm.createTable('ab_bandit_state', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_experiments',
            onDelete: 'CASCADE'
        },
        variant_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_variants',
            onDelete: 'CASCADE'
        },
        algorithm: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'Algorithm: thompson, ucb, epsilon_greedy'
        },
        success_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of successes (conversions)'
        },
        failure_count: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of failures (non-conversions)'
        },
        mean_reward: {
            type: 'float',
            notNull: false,
            comment: 'Estimated mean reward (conversion rate)'
        },
        upper_confidence_bound: {
            type: 'float',
            notNull: false,
            comment: 'UCB value (for UCB algorithm)'
        },
        current_allocation: {
            type: 'float',
            notNull: true,
            comment: 'Current traffic allocation percentage (dynamic)'
        },
        initial_allocation: {
            type: 'float',
            notNull: true,
            comment: 'Initial traffic allocation percentage'
        },
        pulls: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Number of times this arm was pulled'
        },
        cumulative_reward: {
            type: 'float',
            notNull: true,
            default: 0,
            comment: 'Total cumulative reward received'
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    // Indexes for bandit_state
    pgm.createIndex('ab_bandit_state', 'experiment_id');
    pgm.createIndex('ab_bandit_state', 'variant_id');
    pgm.createIndex('ab_bandit_state', ['experiment_id', 'variant_id'], { unique: true });

    // 5. Bandit regret tracking (history)
    pgm.createTable('ab_bandit_regret', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_experiments',
            onDelete: 'CASCADE'
        },
        timestamp: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        total_pulls: {
            type: 'integer',
            notNull: true,
            comment: 'Total number of pulls so far'
        },
        cumulative_regret: {
            type: 'float',
            notNull: true,
            comment: 'Total regret accumulated'
        },
        optimal_variant_id: {
            type: 'integer',
            notNull: true,
            references: 'ab_variants',
            comment: 'Current estimated optimal variant'
        }
    });

    // Indexes for bandit_regret
    pgm.createIndex('ab_bandit_regret', 'experiment_id');
    pgm.createIndex('ab_bandit_regret', ['experiment_id', 'timestamp']);

    // 6. Power analysis table
    pgm.createTable('ab_power_analysis', {
        id: 'id',
        experiment_id: {
            type: 'integer',
            notNull: false,
            references: 'ab_experiments',
            onDelete: 'SET NULL',
            comment: 'Linked experiment (null for standalone calculations)'
        },
        tenant_id: {
            type: 'integer',
            notNull: true,
            comment: 'Tenant who performed calculation'
        },
        baseline_rate: {
            type: 'float',
            notNull: true,
            comment: 'Expected baseline conversion rate (0-1)'
        },
        minimum_detectable_effect: {
            type: 'float',
            notNull: true,
            comment: 'Minimum detectable effect (absolute, e.g., 0.02 for 2%)'
        },
        desired_power: {
            type: 'float',
            notNull: true,
            default: 0.80,
            comment: 'Desired statistical power (1 - type II error)'
        },
        significance_level: {
            type: 'float',
            notNull: true,
            default: 0.05,
            comment: 'Significance level (type I error, alpha)'
        },
        required_sample_size: {
            type: 'integer',
            notNull: true,
            comment: 'Required sample size per variant'
        },
        total_sample_size: {
            type: 'integer',
            notNull: true,
            comment: 'Total sample size (all variants)'
        },
        estimated_duration_days: {
            type: 'integer',
            notNull: false,
            comment: 'Estimated experiment duration in days'
        },
        daily_volume: {
            type: 'integer',
            notNull: false,
            comment: 'Expected daily volume for duration calculation'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    // Indexes for power_analysis
    pgm.createIndex('ab_power_analysis', 'experiment_id');
    pgm.createIndex('ab_power_analysis', 'tenant_id');

    // 7. Add foreign key from ab_experiments to ab_power_analysis
    pgm.addConstraint('ab_experiments', 'fk_power_analysis', {
        foreignKeys: {
            columns: 'power_analysis_id',
            references: 'ab_power_analysis(id)',
            onDelete: 'SET NULL'
        }
    });

    // Add comments to tables
    pgm.sql(`
        COMMENT ON TABLE ab_bayesian_stats IS 'Bayesian posterior distributions and probabilities for A/B test variants';
        COMMENT ON TABLE ab_sequential_analysis IS 'Sequential analysis interim checks and stopping boundaries';
        COMMENT ON TABLE ab_bandit_state IS 'Multi-armed bandit algorithm state and allocations';
        COMMENT ON TABLE ab_bandit_regret IS 'Historical regret tracking for bandit experiments';
        COMMENT ON TABLE ab_power_analysis IS 'Power analysis calculations for sample size determination';
    `);
};

exports.down = pgm => {
    // Drop foreign key constraint first
    pgm.dropConstraint('ab_experiments', 'fk_power_analysis', { ifExists: true });

    // Drop tables in reverse order
    pgm.dropTable('ab_power_analysis', { ifExists: true, cascade: true });
    pgm.dropTable('ab_bandit_regret', { ifExists: true, cascade: true });
    pgm.dropTable('ab_bandit_state', { ifExists: true, cascade: true });
    pgm.dropTable('ab_sequential_analysis', { ifExists: true, cascade: true });
    pgm.dropTable('ab_bayesian_stats', { ifExists: true, cascade: true });

    // Drop added columns
    pgm.dropColumns('ab_experiments', [
        'statistical_method',
        'early_stopping_enabled',
        'bandit_algorithm',
        'power_analysis_id'
    ], { ifExists: true });
};
