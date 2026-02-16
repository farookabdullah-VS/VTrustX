/**
 * Migration: Persona Analytics
 *
 * Adds tables and columns for persona performance tracking:
 * - persona_data_snapshots: Historical metrics snapshots
 * - persona_matches: Response-to-persona match scores
 * - Enhancements to cx_personas table
 */

exports.up = (pgm) => {
  // =====================================================
  // PERSONA DATA SNAPSHOTS
  // =====================================================
  // Historical tracking of persona metrics over time
  pgm.createTable('persona_data_snapshots', {
    id: { type: 'serial', primaryKey: true },
    persona_id: {
      type: 'integer',
      notNull: true,
      references: 'cx_personas(id)',
      onDelete: 'CASCADE'
    },
    tenant_id: { type: 'integer', notNull: true },
    snapshot_date: { type: 'date', notNull: true },
    metrics: {
      type: 'jsonb',
      notNull: true,
      comment: 'Aggregated metrics: {satisfaction, loyalty, trust, effort}'
    },
    demographics: {
      type: 'jsonb',
      comment: 'Demographic distribution: {age_distribution, location_distribution, etc.}'
    },
    behavioral_data: {
      type: 'jsonb',
      comment: 'Behavioral patterns: {channel_preferences, engagement_patterns, etc.}'
    },
    response_count: { type: 'integer', default: 0 },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Unique constraint: One snapshot per persona per day
  pgm.addConstraint('persona_data_snapshots', 'unique_persona_snapshot_date', {
    unique: ['persona_id', 'snapshot_date']
  });

  // =====================================================
  // PERSONA MATCHES
  // =====================================================
  // Track how well survey responses match personas
  pgm.createTable('persona_matches', {
    id: { type: 'serial', primaryKey: true },
    persona_id: {
      type: 'integer',
      notNull: true,
      references: 'cx_personas(id)',
      onDelete: 'CASCADE'
    },
    response_id: {
      type: 'integer',
      notNull: true,
      references: 'form_responses(id)',
      onDelete: 'CASCADE'
    },
    match_score: {
      type: 'decimal(5,2)',
      notNull: true,
      comment: 'Match score from 0.00 to 100.00'
    },
    matched_attributes: {
      type: 'jsonb',
      comment: 'Details of which attributes matched'
    },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Prevent duplicate matches
  pgm.addConstraint('persona_matches', 'unique_persona_response_match', {
    unique: ['persona_id', 'response_id']
  });

  // =====================================================
  // INDEXES FOR PERFORMANCE
  // =====================================================

  // Persona snapshots indexes
  pgm.createIndex('persona_data_snapshots', ['persona_id', 'snapshot_date'], {
    name: 'idx_persona_snapshots_persona_date',
    method: 'btree'
  });

  pgm.createIndex('persona_data_snapshots', 'tenant_id', {
    name: 'idx_persona_snapshots_tenant'
  });

  // Persona matches indexes
  pgm.createIndex('persona_matches', ['persona_id', 'match_score'], {
    name: 'idx_persona_matches_persona_score',
    method: 'btree'
  });

  pgm.createIndex('persona_matches', 'response_id', {
    name: 'idx_persona_matches_response'
  });

  pgm.createIndex('persona_matches', 'created_at', {
    name: 'idx_persona_matches_created'
  });

  // =====================================================
  // ENHANCE CX_PERSONAS TABLE
  // =====================================================

  // Add sync tracking columns
  pgm.addColumns('cx_personas', {
    last_synced_at: {
      type: 'timestamp',
      comment: 'Last time persona data was synced from responses'
    },
    sync_config: {
      type: 'jsonb',
      default: JSON.stringify({
        auto_sync: true,
        sync_frequency: 'daily',
        data_sources: []
      }),
      comment: 'Configuration for automated data sync'
    }
  });

  // Index for finding personas that need syncing
  pgm.createIndex('cx_personas', 'last_synced_at', {
    name: 'idx_cx_personas_last_synced'
  });

  // Index for auto-sync lookup
  pgm.sql(`
    CREATE INDEX idx_cx_personas_auto_sync
    ON cx_personas ((sync_config->>'auto_sync'))
    WHERE sync_config->>'auto_sync' = 'true'
  `);
};

exports.down = (pgm) => {
  // Drop indexes first
  pgm.dropIndex('cx_personas', 'last_synced_at', { name: 'idx_cx_personas_last_synced', ifExists: true });
  pgm.sql('DROP INDEX IF EXISTS idx_cx_personas_auto_sync');

  pgm.dropIndex('persona_matches', 'created_at', { name: 'idx_persona_matches_created', ifExists: true });
  pgm.dropIndex('persona_matches', 'response_id', { name: 'idx_persona_matches_response', ifExists: true });
  pgm.dropIndex('persona_matches', ['persona_id', 'match_score'], { name: 'idx_persona_matches_persona_score', ifExists: true });

  pgm.dropIndex('persona_data_snapshots', 'tenant_id', { name: 'idx_persona_snapshots_tenant', ifExists: true });
  pgm.dropIndex('persona_data_snapshots', ['persona_id', 'snapshot_date'], { name: 'idx_persona_snapshots_persona_date', ifExists: true });

  // Drop tables
  pgm.dropTable('persona_matches', { ifExists: true, cascade: true });
  pgm.dropTable('persona_data_snapshots', { ifExists: true, cascade: true });

  // Remove columns from cx_personas
  pgm.dropColumns('cx_personas', ['last_synced_at', 'sync_config'], { ifExists: true });
};
