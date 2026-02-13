/**
 * Backfill Sentiment Analysis Script
 *
 * Batch processes existing submissions without sentiment analysis.
 * Rate limited to 300 submissions per minute (200ms delay) to respect AI provider limits.
 *
 * Usage:
 *   node scripts/backfill-sentiment.js [--limit=1000] [--dry-run]
 *
 * Options:
 *   --limit=N     Process maximum N submissions (default: all)
 *   --dry-run     Don't actually update records, just show what would be done
 */

require('dotenv').config();
const { query } = require('../src/infrastructure/database/db');
const sentimentService = require('../src/services/sentimentService');
const logger = require('../src/infrastructure/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3001';
const BATCH_SIZE = 100; // Process 100 submissions per batch
const DELAY_MS = 200; // 200ms delay between requests (5 requests/second)

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    limit: null,
    dryRun: false
};

args.forEach(arg => {
    if (arg.startsWith('--limit=')) {
        options.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
        options.dryRun = true;
    }
});

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch AI provider configuration
 */
async function getAIProvider() {
    const result = await query('SELECT * FROM ai_providers WHERE is_active = true LIMIT 1');
    return result.rows[0];
}

/**
 * Analyze sentiment for a submission
 */
async function analyzeSentiment(submission, aiConfig) {
    try {
        // Extract text fields
        const textFields = sentimentService.extractTextFields(submission.data, {});

        if (textFields.length === 0) {
            logger.debug('No text fields to analyze', { submissionId: submission.id });
            return null;
        }

        // Build prompt
        const prompt = sentimentService.buildSentimentPrompt(textFields);

        // Call AI service
        const response = await fetch(`${AI_SERVICE_URL}/analyze-sentiment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, aiConfig })
        });

        if (!response.ok) {
            throw new Error(`AI service returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const parsed = sentimentService.parseSentimentResponse(data.sentiment);

        if (!parsed) {
            logger.error('Failed to parse sentiment response', { submissionId: submission.id });
            return null;
        }

        // Build analysis object
        const analysisData = {
            provider: aiConfig.provider,
            timestamp: new Date().toISOString(),
            sentiment: {
                ...parsed,
                flagged: sentimentService.shouldTriggerAlert(parsed),
                flagReason: sentimentService.shouldTriggerAlert(parsed)
                    ? sentimentService.getFlagReason(parsed)
                    : null
            }
        };

        return analysisData;

    } catch (error) {
        logger.error('Sentiment analysis failed', {
            submissionId: submission.id,
            error: error.message
        });
        return null;
    }
}

/**
 * Process a batch of submissions
 */
async function processBatch(submissions, aiConfig, stats) {
    for (const submission of submissions) {
        stats.processed++;

        logger.info(`Processing submission ${submission.id} (${stats.processed}/${stats.total})...`);

        // Analyze sentiment
        const analysis = await analyzeSentiment(submission, aiConfig);

        if (analysis) {
            if (!options.dryRun) {
                // Update submission with analysis
                await query(
                    'UPDATE submissions SET analysis = $1 WHERE id = $2',
                    [JSON.stringify(analysis), submission.id]
                );

                // Create CTL alert if needed
                if (analysis.sentiment.flagged) {
                    const alertLevel = sentimentService.getCTLAlertLevel(analysis.sentiment.aggregate.score);
                    await query(
                        `INSERT INTO ctl_alerts (tenant_id, form_id, submission_id, alert_level, score_value, score_type, sentiment)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         ON CONFLICT DO NOTHING`,
                        [
                            submission.tenant_id,
                            submission.form_id,
                            submission.id,
                            alertLevel,
                            analysis.sentiment.aggregate.score,
                            'sentiment_ai',
                            analysis.sentiment.aggregate.emotion
                        ]
                    );
                }
            }

            stats.success++;
            logger.info(`✓ Sentiment analyzed for submission ${submission.id}`, {
                score: analysis.sentiment.aggregate.score,
                emotion: analysis.sentiment.aggregate.emotion
            });
        } else {
            stats.skipped++;
            logger.warn(`⊘ Skipped submission ${submission.id} (no text fields or analysis failed)`);
        }

        // Rate limiting
        await sleep(DELAY_MS);
    }
}

/**
 * Main function
 */
async function main() {
    logger.info('Starting sentiment analysis backfill...');

    if (options.dryRun) {
        logger.info('DRY RUN MODE - No changes will be made');
    }

    if (options.limit) {
        logger.info(`Processing up to ${options.limit} submissions`);
    }

    const stats = {
        total: 0,
        processed: 0,
        success: 0,
        skipped: 0,
        failed: 0
    };

    try {
        // Get AI provider configuration
        const aiProvider = await getAIProvider();

        if (!aiProvider) {
            logger.error('No active AI provider found. Please configure an AI provider first.');
            process.exit(1);
        }

        const aiConfig = {
            provider: aiProvider.provider,
            apiKey: aiProvider.api_key,
            model: aiProvider.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'
        };

        logger.info(`Using AI provider: ${aiProvider.provider}`);

        // Count submissions without sentiment analysis
        let countQuery = `
            SELECT COUNT(*) as count
            FROM submissions
            WHERE (analysis IS NULL OR analysis->'sentiment' IS NULL)
        `;

        if (options.limit) {
            countQuery += ` LIMIT ${options.limit}`;
        }

        const countResult = await query(countQuery);
        stats.total = parseInt(countResult.rows[0].count);

        logger.info(`Found ${stats.total} submissions without sentiment analysis`);

        if (stats.total === 0) {
            logger.info('No submissions to process. Exiting.');
            return;
        }

        // Process in batches
        let offset = 0;

        while (offset < stats.total && (!options.limit || offset < options.limit)) {
            const limit = Math.min(BATCH_SIZE, stats.total - offset, options.limit ? options.limit - offset : BATCH_SIZE);

            logger.info(`Fetching batch: offset=${offset}, limit=${limit}`);

            const submissionsQuery = `
                SELECT id, tenant_id, form_id, data
                FROM submissions
                WHERE (analysis IS NULL OR analysis->'sentiment' IS NULL)
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            `;

            const result = await query(submissionsQuery, [limit, offset]);
            const submissions = result.rows;

            if (submissions.length === 0) {
                break;
            }

            await processBatch(submissions, aiConfig, stats);

            offset += submissions.length;

            logger.info(`Batch complete. Progress: ${stats.processed}/${stats.total}`);
        }

        // Final summary
        logger.info('=== Backfill Complete ===');
        logger.info(`Total submissions: ${stats.total}`);
        logger.info(`Processed: ${stats.processed}`);
        logger.info(`Success: ${stats.success}`);
        logger.info(`Skipped: ${stats.skipped}`);
        logger.info(`Failed: ${stats.failed}`);

        const successRate = ((stats.success / stats.processed) * 100).toFixed(1);
        logger.info(`Success rate: ${successRate}%`);

        const estimatedTime = (stats.total * DELAY_MS) / 1000 / 60;
        logger.info(`Estimated time for full backfill: ${estimatedTime.toFixed(1)} minutes`);

    } catch (error) {
        logger.error('Backfill failed', { error: error.message, stack: error.stack });
        process.exit(1);
    }

    process.exit(0);
}

// Run the script
main();
