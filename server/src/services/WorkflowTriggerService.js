/**
 * Workflow Trigger Service
 *
 * Enhanced trigger system that supports:
 * - Score-based triggers (NPS <= 6, CSAT < 3, etc.)
 * - Keyword detection in text responses
 * - Sentiment-based triggers
 * - Time-based triggers (future)
 * - Custom field matching
 */

const WorkflowEngineService = require('./WorkflowEngineService');
const logger = require('../infrastructure/logger');

class WorkflowTriggerService {
    /**
     * Analyze submission and trigger matching workflows
     * This is called after a submission is completed
     */
    async analyzeAndTrigger(submission, formId, tenantId) {
        try {
            const triggers = [];

            // Extract submission data
            const submissionData = submission.data || {};

            // 1. Score-based triggers
            const scoreTriggers = this.detectScoreTriggers(submissionData);
            triggers.push(...scoreTriggers);

            // 2. Keyword-based triggers
            const keywordTriggers = this.detectKeywordTriggers(submissionData);
            triggers.push(...keywordTriggers);

            // 3. Sentiment-based triggers (if sentiment data exists)
            if (submission.sentiment) {
                const sentimentTriggers = this.detectSentimentTriggers(submission.sentiment);
                triggers.push(...sentimentTriggers);
            }

            // Execute workflows for each detected trigger
            const triggerData = {
                formId,
                submission,
                triggers: triggers.map(t => t.type)
            };

            const executionPromises = [];

            // Standard submission_completed trigger
            executionPromises.push(
                WorkflowEngineService.executeTriggeredWorkflows(
                    'submission_completed',
                    triggerData,
                    tenantId
                )
            );

            // Execute specialized triggers
            for (const trigger of triggers) {
                executionPromises.push(
                    WorkflowEngineService.executeTriggeredWorkflows(
                        trigger.type,
                        { ...triggerData, triggerDetails: trigger.details },
                        tenantId
                    )
                );
            }

            // Execute all triggers in parallel
            await Promise.allSettled(executionPromises);

            logger.info('[WorkflowTriggerService] Triggers executed', {
                formId,
                submissionId: submission.id,
                triggerCount: triggers.length + 1,
                triggerTypes: ['submission_completed', ...triggers.map(t => t.type)]
            });

            return triggers;

        } catch (error) {
            logger.error('[WorkflowTriggerService] Failed to analyze triggers', {
                error: error.message,
                submissionId: submission.id
            });
            // Don't throw - trigger analysis is non-critical
            return [];
        }
    }

    /**
     * Detect score-based triggers (NPS, CSAT, CES, etc.)
     */
    detectScoreTriggers(submissionData) {
        const triggers = [];

        // Common score field patterns
        const scoreFields = [
            { pattern: /nps/i, type: 'nps_score', detractorThreshold: 6, promoterThreshold: 9 },
            { pattern: /csat/i, type: 'csat_score', lowThreshold: 3, highThreshold: 4 },
            { pattern: /ces/i, type: 'ces_score', lowThreshold: 3, highThreshold: 6 },
            { pattern: /rating/i, type: 'rating_score', lowThreshold: 3, highThreshold: 4 },
            { pattern: /satisfaction/i, type: 'satisfaction_score', lowThreshold: 3, highThreshold: 4 }
        ];

        for (const [key, value] of Object.entries(submissionData)) {
            // Skip non-numeric values
            const numValue = parseFloat(value);
            if (isNaN(numValue)) continue;

            for (const scoreField of scoreFields) {
                if (scoreField.pattern.test(key)) {
                    // NPS-specific triggers
                    if (scoreField.type === 'nps_score') {
                        if (numValue <= scoreField.detractorThreshold) {
                            triggers.push({
                                type: 'nps_detractor_detected',
                                details: {
                                    field: key,
                                    score: numValue,
                                    threshold: scoreField.detractorThreshold
                                }
                            });
                        } else if (numValue >= scoreField.promoterThreshold) {
                            triggers.push({
                                type: 'nps_promoter_detected',
                                details: {
                                    field: key,
                                    score: numValue,
                                    threshold: scoreField.promoterThreshold
                                }
                            });
                        }
                    }
                    // Low score triggers (CSAT, CES, Rating)
                    else if (scoreField.lowThreshold && numValue <= scoreField.lowThreshold) {
                        triggers.push({
                            type: 'low_score_detected',
                            details: {
                                scoreType: scoreField.type,
                                field: key,
                                score: numValue,
                                threshold: scoreField.lowThreshold
                            }
                        });
                    }
                    // High score triggers
                    else if (scoreField.highThreshold && numValue >= scoreField.highThreshold) {
                        triggers.push({
                            type: 'high_score_detected',
                            details: {
                                scoreType: scoreField.type,
                                field: key,
                                score: numValue,
                                threshold: scoreField.highThreshold
                            }
                        });
                    }
                }
            }
        }

        return triggers;
    }

    /**
     * Detect keyword-based triggers in text responses
     */
    detectKeywordTriggers(submissionData) {
        const triggers = [];

        // Keyword categories for detection
        const keywordCategories = {
            urgent: {
                keywords: ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now'],
                trigger: 'urgent_keyword_detected'
            },
            complaint: {
                keywords: ['complaint', 'complain', 'issue', 'problem', 'broken', 'not working', 'terrible', 'worst', 'awful', 'horrible'],
                trigger: 'complaint_keyword_detected'
            },
            cancel: {
                keywords: ['cancel', 'unsubscribe', 'quit', 'leave', 'stop', 'discontinue'],
                trigger: 'cancellation_keyword_detected'
            },
            competitor: {
                keywords: ['competitor', 'alternative', 'switch', 'other product', 'different service'],
                trigger: 'competitor_mentioned'
            },
            praise: {
                keywords: ['excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'impressed'],
                trigger: 'praise_keyword_detected'
            },
            bug: {
                keywords: ['bug', 'error', 'glitch', 'crash', 'freeze', 'hang', 'malfunction'],
                trigger: 'bug_keyword_detected'
            }
        };

        // Check each text field
        for (const [key, value] of Object.entries(submissionData)) {
            if (typeof value !== 'string' || value.length < 3) continue;

            const lowerValue = value.toLowerCase();

            // Check each keyword category
            for (const [category, config] of Object.entries(keywordCategories)) {
                const matchedKeywords = config.keywords.filter(keyword =>
                    lowerValue.includes(keyword.toLowerCase())
                );

                if (matchedKeywords.length > 0) {
                    triggers.push({
                        type: config.trigger,
                        details: {
                            category,
                            field: key,
                            matchedKeywords,
                            text: value.substring(0, 200) // First 200 chars
                        }
                    });
                }
            }
        }

        return triggers;
    }

    /**
     * Detect sentiment-based triggers
     */
    detectSentimentTriggers(sentimentData) {
        const triggers = [];

        if (!sentimentData || typeof sentimentData !== 'object') {
            return triggers;
        }

        // Negative sentiment trigger
        if (sentimentData.score <= -0.5) {
            triggers.push({
                type: 'negative_sentiment_detected',
                details: {
                    score: sentimentData.score,
                    confidence: sentimentData.confidence,
                    keywords: sentimentData.keywords,
                    themes: sentimentData.themes
                }
            });
        }

        // Positive sentiment trigger
        if (sentimentData.score >= 0.5) {
            triggers.push({
                type: 'positive_sentiment_detected',
                details: {
                    score: sentimentData.score,
                    confidence: sentimentData.confidence,
                    keywords: sentimentData.keywords
                }
            });
        }

        // Specific emotion triggers
        if (sentimentData.emotions) {
            const emotions = typeof sentimentData.emotions === 'string'
                ? JSON.parse(sentimentData.emotions)
                : sentimentData.emotions;

            // Frustrated customer
            if (emotions.frustrated > 0.6 || emotions.angry > 0.6) {
                triggers.push({
                    type: 'frustrated_customer_detected',
                    details: {
                        emotions,
                        dominantEmotion: this.getDominantEmotion(emotions)
                    }
                });
            }

            // Delighted customer
            if (emotions.happy > 0.7 || emotions.satisfied > 0.7) {
                triggers.push({
                    type: 'delighted_customer_detected',
                    details: {
                        emotions,
                        dominantEmotion: this.getDominantEmotion(emotions)
                    }
                });
            }
        }

        return triggers;
    }

    /**
     * Get dominant emotion from emotions object
     */
    getDominantEmotion(emotions) {
        let maxEmotion = null;
        let maxScore = 0;

        for (const [emotion, score] of Object.entries(emotions)) {
            if (score > maxScore) {
                maxScore = score;
                maxEmotion = emotion;
            }
        }

        return { emotion: maxEmotion, score: maxScore };
    }

    /**
     * Manually trigger a workflow by event type
     * Useful for testing or external integrations
     */
    async triggerByEvent(eventType, eventData, tenantId) {
        try {
            await WorkflowEngineService.executeTriggeredWorkflows(
                eventType,
                eventData,
                tenantId
            );

            logger.info('[WorkflowTriggerService] Manual trigger executed', {
                eventType,
                tenantId
            });

            return { success: true, eventType };

        } catch (error) {
            logger.error('[WorkflowTriggerService] Manual trigger failed', {
                error: error.message,
                eventType,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get list of supported trigger types
     */
    getSupportedTriggers() {
        return [
            // Standard triggers
            { type: 'submission_completed', description: 'Form submission completed' },
            { type: 'survey_started', description: 'Survey started but not completed' },
            { type: 'survey_abandoned', description: 'Survey started but abandoned' },

            // Score-based triggers
            { type: 'nps_detractor_detected', description: 'NPS score ≤ 6' },
            { type: 'nps_promoter_detected', description: 'NPS score ≥ 9' },
            { type: 'low_score_detected', description: 'Low CSAT/CES/Rating score' },
            { type: 'high_score_detected', description: 'High CSAT/CES/Rating score' },

            // Keyword-based triggers
            { type: 'urgent_keyword_detected', description: 'Urgent keywords detected' },
            { type: 'complaint_keyword_detected', description: 'Complaint keywords detected' },
            { type: 'cancellation_keyword_detected', description: 'Cancellation intent detected' },
            { type: 'competitor_mentioned', description: 'Competitor mentioned' },
            { type: 'praise_keyword_detected', description: 'Praise keywords detected' },
            { type: 'bug_keyword_detected', description: 'Bug/error keywords detected' },

            // Sentiment-based triggers
            { type: 'negative_sentiment_detected', description: 'Negative sentiment (score ≤ -0.5)' },
            { type: 'positive_sentiment_detected', description: 'Positive sentiment (score ≥ 0.5)' },
            { type: 'frustrated_customer_detected', description: 'Frustrated/angry emotion detected' },
            { type: 'delighted_customer_detected', description: 'Happy/satisfied emotion detected' },

            // CRM triggers
            { type: 'ticket_created', description: 'Support ticket created' },
            { type: 'ticket_updated', description: 'Support ticket updated' },
            { type: 'ticket_overdue', description: 'Support ticket overdue' },

            // Contact triggers
            { type: 'contact_created', description: 'New contact created' },
            { type: 'contact_updated', description: 'Contact information updated' }
        ];
    }
}

// Export singleton instance
module.exports = new WorkflowTriggerService();
