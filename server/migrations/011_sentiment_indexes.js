/**
 * Migration: Add sentiment analysis JSONB indexes
 *
 * Creates indexes on the submissions.analysis JSONB field for efficient
 * sentiment analysis queries.
 *
 * Indexes:
 * 1. idx_submissions_sentiment_score - Fast sentiment score filtering and sorting
 * 2. idx_submissions_sentiment_emotion - Fast emotion filtering
 * 3. idx_submissions_sentiment_gin - General JSONB queries (themes, fields)
 * 4. idx_submissions_sentiment_flagged - Fast flagged submission queries
 */

exports.up = (pgm) => {
    // Index for sentiment score filtering and sorting
    // Note: Using expression index for numeric score extraction
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_submissions_sentiment_score
        ON submissions (CAST((analysis->'sentiment'->'aggregate'->>'score') AS numeric))
        WHERE analysis->'sentiment' IS NOT NULL
    `);

    // Index for emotion filtering
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_submissions_sentiment_emotion
        ON submissions ((analysis->'sentiment'->'aggregate'->>'emotion'))
        WHERE analysis->'sentiment' IS NOT NULL
    `);

    // General JSONB GIN index for flexible queries (themes, fields)
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_submissions_sentiment_gin
        ON submissions USING GIN ((analysis->'sentiment'))
        WHERE analysis->'sentiment' IS NOT NULL
    `);

    // Index for flagged sentiment queries
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_submissions_sentiment_flagged
        ON submissions (CAST((analysis->'sentiment'->>'flagged') AS boolean))
        WHERE analysis->'sentiment' IS NOT NULL
    `);
};

exports.down = (pgm) => {
    pgm.sql('DROP INDEX IF EXISTS idx_submissions_sentiment_score');
    pgm.sql('DROP INDEX IF EXISTS idx_submissions_sentiment_emotion');
    pgm.sql('DROP INDEX IF EXISTS idx_submissions_sentiment_gin');
    pgm.sql('DROP INDEX IF EXISTS idx_submissions_sentiment_flagged');
};
