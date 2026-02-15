/**
 * Crisis Detection Tables Migration
 *
 * Creates tables for advanced AI crisis detection and intelligence features
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
export const up = async (pgm) => {
  // Crisis Events Table
  pgm.createTable('sl_crisis_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'integer',
      notNull: true,
      references: 'tenants'
    },
    severity_score: {
      type: 'integer',
      notNull: true
    },
    crisis_type: {
      type: 'varchar(50)',
      notNull: true
    },
    crisis_level: {
      type: 'varchar(20)',
      notNull: true
    },
    indicators: {
      type: 'jsonb'
    },
    recommended_actions: {
      type: 'jsonb'
    },
    mention_count: {
      type: 'integer',
      default: 0
    },
    resolved_at: {
      type: 'timestamp'
    },
    resolution_notes: {
      type: 'text'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp',
      default: pgm.func('NOW()')
    }
  });

  // Indexes for crisis events
  pgm.createIndex('sl_crisis_events', 'tenant_id');
  pgm.createIndex('sl_crisis_events', 'created_at');
  pgm.createIndex('sl_crisis_events', ['tenant_id', 'crisis_level']);

  // Influencer Scores Table
  pgm.createTable('sl_influencer_scores', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'integer',
      notNull: true,
      references: 'tenants'
    },
    author_handle: {
      type: 'varchar(255)',
      notNull: true
    },
    platform: {
      type: 'varchar(50)',
      notNull: true
    },
    overall_score: {
      type: 'integer'
    },
    reach_score: {
      type: 'integer'
    },
    relevance_score: {
      type: 'integer'
    },
    authenticity_score: {
      type: 'integer'
    },
    follower_count: {
      type: 'integer',
      default: 0
    },
    mention_count: {
      type: 'integer',
      default: 0
    },
    engagement_rate: {
      type: 'decimal(5,2)'
    },
    last_mention_at: {
      type: 'timestamp'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp',
      default: pgm.func('NOW()')
    }
  });

  // Indexes for influencer scores
  pgm.createIndex('sl_influencer_scores', 'tenant_id');
  pgm.createIndex('sl_influencer_scores', ['tenant_id', 'overall_score']);

  // Add new fields to sl_mentions table for advanced AI features
  pgm.addColumns('sl_mentions', {
    reach_estimate: {
      type: 'integer'
    },
    engagement_count: {
      type: 'integer'
    },
    viral_potential_score: {
      type: 'integer'
    },
    crisis_indicator: {
      type: 'boolean',
      default: false
    }
  });

  // Create indexes on new mention fields
  pgm.createIndex('sl_mentions', ['tenant_id', 'crisis_indicator']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('sl_influencer_scores');
  pgm.dropTable('sl_crisis_events');

  // Remove added columns from sl_mentions
  pgm.dropColumns('sl_mentions', [
    'reach_estimate',
    'engagement_count',
    'viral_potential_score',
    'crisis_indicator'
  ]);
};
