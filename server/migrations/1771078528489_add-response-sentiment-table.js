/**
 * Migration: Add Response Sentiment Analysis Table
 *
 * Creates table for storing AI-powered sentiment analysis results
 * for survey responses, enabling:
 * - Automatic sentiment scoring (positive, negative, neutral)
 * - Emotion detection (happy, frustrated, angry, satisfied)
 * - Keyword extraction from open-ended responses
 * - Integration with Close the Loop (CTL) for negative sentiment
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Create response_sentiment table
    pgm.createTable('response_sentiment', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        tenant_id: {
            type: 'integer',
            notNull: true
        },
        submission_id: {
            type: 'integer',
            notNull: true
        },
        question_id: {
            type: 'integer',
            notNull: true
        },
        response_text: {
            type: 'text',
            notNull: true
        },
        sentiment: {
            type: 'varchar(20)',
            notNull: true
        },
        sentiment_score: {
            type: 'decimal(3,2)',
            notNull: true
        },
        confidence: {
            type: 'decimal(3,2)',
            notNull: true
        },
        emotions: {
            type: 'jsonb',
            notNull: false
        },
        keywords: {
            type: 'text[]',
            notNull: false
        },
        themes: {
            type: 'text[]',
            notNull: false
        },
        language: {
            type: 'varchar(10)',
            notNull: false
        },
        ctl_alert_created: {
            type: 'boolean',
            notNull: true,
            default: false
        },
        analyzed_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Add indexes for performance
    pgm.createIndex('response_sentiment', 'tenant_id');
    pgm.createIndex('response_sentiment', 'submission_id');
    pgm.createIndex('response_sentiment', 'question_id');
    pgm.createIndex('response_sentiment', 'sentiment');
    pgm.createIndex('response_sentiment', ['tenant_id', 'sentiment']);
    pgm.createIndex('response_sentiment', ['tenant_id', 'created_at']);

    // Unique constraint: one sentiment analysis per response
    pgm.addConstraint('response_sentiment', 'unique_submission_question', {
        unique: ['submission_id', 'question_id']
    });

    // Add comment to table
    pgm.sql(`
        COMMENT ON TABLE response_sentiment IS 'Stores AI-powered sentiment analysis results for survey responses';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('response_sentiment');
};
