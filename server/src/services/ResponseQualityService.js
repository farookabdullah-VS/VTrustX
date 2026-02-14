/**
 * Response Quality Scoring Service
 *
 * Automatically assesses survey response quality based on multiple indicators:
 * - Completion time (too fast = suspicious, too slow = abandoned)
 * - Text quality (length, gibberish detection)
 * - Consistency (straight-lining detection)
 * - Engagement patterns
 *
 * Quality Score Calculation:
 * - 100 = Perfect quality
 * - 70-99 = Good quality
 * - 50-69 = Medium quality (monitor)
 * - 30-49 = Low quality (flag for review)
 * - 0-29 = Suspicious (likely spam/bot)
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class ResponseQualityService {
    /**
     * Calculate and save quality score for a submission
     * @param {number} submissionId - Submission ID
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @param {object} submissionData - Full submission data with answers
     * @returns {Promise<object>} - Quality score result
     */
    static async calculateQualityScore(submissionId, tenantId, formId, submissionData) {
        try {
            logger.info('[ResponseQuality] Calculating quality score', { submissionId, tenantId });

            // Get tenant quality thresholds
            const thresholds = await this.getQualityThresholds(tenantId);

            // Get form questions for analysis
            const formQuestions = await this.getFormQuestions(formId);

            // Calculate individual quality metrics
            const completionTimeScore = this.calculateCompletionTimeScore(submissionData, formQuestions, thresholds);
            const textQualityScore = this.calculateTextQualityScore(submissionData, formQuestions, thresholds);
            const consistencyScore = this.calculateConsistencyScore(submissionData, formQuestions);
            const engagementScore = this.calculateEngagementScore(submissionData, formQuestions);

            // Calculate overall quality score (weighted average)
            const qualityScore = this.calculateOverallScore({
                completion_time: completionTimeScore.score,
                text_quality: textQualityScore.score,
                consistency: consistencyScore.score,
                engagement: engagementScore.score
            });

            // Detect suspicious patterns
            const suspiciousPatterns = this.detectSuspiciousPatterns(submissionData, {
                completion_time: completionTimeScore,
                text_quality: textQualityScore,
                consistency: consistencyScore
            });

            // Determine flags
            const isSuspicious = qualityScore < thresholds.suspicious_threshold;
            const isSpam = suspiciousPatterns.includes('spam_keywords') || suspiciousPatterns.includes('duplicate_content');
            const isBot = suspiciousPatterns.includes('bot_pattern') || completionTimeScore.is_too_fast;
            const manualReviewRequired = thresholds.require_manual_review && isSuspicious;

            const flaggedReasons = [];
            if (completionTimeScore.is_too_fast) flaggedReasons.push('too_fast');
            if (completionTimeScore.is_too_slow) flaggedReasons.push('too_slow');
            if (textQualityScore.has_gibberish) flaggedReasons.push('gibberish');
            if (textQualityScore.too_short) flaggedReasons.push('text_too_short');
            if (consistencyScore.straight_lining) flaggedReasons.push('straight_lining');
            if (suspiciousPatterns.length > 0) flaggedReasons.push(...suspiciousPatterns);

            // Prepare quality details
            const qualityDetails = {
                scores: {
                    completion_time: completionTimeScore.score,
                    text_quality: textQualityScore.score,
                    consistency: consistencyScore.score,
                    engagement: engagementScore.score
                },
                metrics: {
                    completion_time_seconds: completionTimeScore.actual_time,
                    expected_time_seconds: completionTimeScore.expected_time,
                    time_ratio: completionTimeScore.ratio,
                    text_responses_count: textQualityScore.count,
                    avg_text_length: textQualityScore.avg_length,
                    min_text_length: textQualityScore.min_length,
                    max_text_length: textQualityScore.max_length
                },
                flags: {
                    too_fast: completionTimeScore.is_too_fast,
                    too_slow: completionTimeScore.is_too_slow,
                    gibberish: textQualityScore.has_gibberish,
                    straight_lining: consistencyScore.straight_lining
                }
            };

            // Save quality score
            const result = await query(
                `INSERT INTO response_quality_scores (
                    submission_id, tenant_id, form_id,
                    quality_score,
                    completion_time_score, text_quality_score, consistency_score, engagement_score,
                    completion_time_seconds, expected_time_seconds, time_ratio,
                    text_responses_count, avg_text_length, min_text_length, max_text_length,
                    straight_lining_detected, gibberish_detected, suspicious_patterns,
                    is_suspicious, is_spam, is_bot, manual_review_required,
                    quality_details, flagged_reasons
                ) VALUES (
                    $1, $2, $3,
                    $4,
                    $5, $6, $7, $8,
                    $9, $10, $11,
                    $12, $13, $14, $15,
                    $16, $17, $18,
                    $19, $20, $21, $22,
                    $23, $24
                )
                ON CONFLICT (submission_id)
                DO UPDATE SET
                    quality_score = EXCLUDED.quality_score,
                    completion_time_score = EXCLUDED.completion_time_score,
                    text_quality_score = EXCLUDED.text_quality_score,
                    consistency_score = EXCLUDED.consistency_score,
                    engagement_score = EXCLUDED.engagement_score,
                    completion_time_seconds = EXCLUDED.completion_time_seconds,
                    expected_time_seconds = EXCLUDED.expected_time_seconds,
                    time_ratio = EXCLUDED.time_ratio,
                    text_responses_count = EXCLUDED.text_responses_count,
                    avg_text_length = EXCLUDED.avg_text_length,
                    min_text_length = EXCLUDED.min_text_length,
                    max_text_length = EXCLUDED.max_text_length,
                    straight_lining_detected = EXCLUDED.straight_lining_detected,
                    gibberish_detected = EXCLUDED.gibberish_detected,
                    suspicious_patterns = EXCLUDED.suspicious_patterns,
                    is_suspicious = EXCLUDED.is_suspicious,
                    is_spam = EXCLUDED.is_spam,
                    is_bot = EXCLUDED.is_bot,
                    manual_review_required = EXCLUDED.manual_review_required,
                    quality_details = EXCLUDED.quality_details,
                    flagged_reasons = EXCLUDED.flagged_reasons,
                    updated_at = NOW()
                RETURNING *`,
                [
                    submissionId, tenantId, formId,
                    qualityScore,
                    completionTimeScore.score, textQualityScore.score, consistencyScore.score, engagementScore.score,
                    completionTimeScore.actual_time, completionTimeScore.expected_time, completionTimeScore.ratio,
                    textQualityScore.count, textQualityScore.avg_length, textQualityScore.min_length, textQualityScore.max_length,
                    consistencyScore.straight_lining, textQualityScore.has_gibberish, suspiciousPatterns,
                    isSuspicious, isSpam, isBot, manualReviewRequired,
                    JSON.stringify(qualityDetails), flaggedReasons
                ]
            );

            // Update submissions table with quality score
            const isLowQuality = qualityScore < thresholds.min_quality_score;
            const excludeFromAnalytics = thresholds.auto_exclude_from_analytics && isLowQuality;

            await query(
                `UPDATE submissions
                SET quality_score = $1,
                    quality_flags = $2,
                    is_low_quality = $3,
                    exclude_from_analytics = $4
                WHERE id = $5`,
                [qualityScore, flaggedReasons, isLowQuality, excludeFromAnalytics, submissionId]
            );

            logger.info('[ResponseQuality] Quality score calculated', {
                submissionId,
                qualityScore,
                isSuspicious,
                flaggedReasons
            });

            return {
                success: true,
                quality_score: parseFloat(qualityScore),
                is_suspicious: isSuspicious,
                is_spam: isSpam,
                is_bot: isBot,
                flagged_reasons: flaggedReasons,
                details: qualityDetails
            };
        } catch (error) {
            logger.error('[ResponseQuality] Failed to calculate quality score', {
                error: error.message,
                submissionId
            });
            // Fail open - don't block submission if quality scoring fails
            return {
                success: false,
                error: error.message,
                quality_score: 100 // Default to perfect quality if scoring fails
            };
        }
    }

    /**
     * Calculate completion time score
     * @param {object} submissionData - Submission data
     * @param {array} formQuestions - Form questions
     * @param {object} thresholds - Quality thresholds
     * @returns {object} - Completion time score and metrics
     */
    static calculateCompletionTimeScore(submissionData, formQuestions, thresholds) {
        const startTime = submissionData.started_at || submissionData.created_at;
        const endTime = submissionData.completed_at || submissionData.created_at;
        const actualTime = Math.floor((new Date(endTime) - new Date(startTime)) / 1000); // seconds

        // Estimate expected time (15 seconds per question on average)
        const expectedTime = formQuestions.length * 15;

        const ratio = expectedTime > 0 ? actualTime / expectedTime : 1;

        let score = 100;
        let isTooFast = false;
        let isTooSlow = false;

        // Too fast (< 20% of expected OR < absolute minimum)
        if (actualTime < thresholds.min_completion_time_seconds || ratio < thresholds.time_ratio_min) {
            isTooFast = true;
            score = Math.max(0, score - 50); // Heavy penalty
        }

        // Too slow (> 500% of expected OR > absolute maximum)
        if (actualTime > thresholds.max_completion_time_seconds || ratio > thresholds.time_ratio_max) {
            isTooSlow = true;
            score = Math.max(0, score - 20); // Moderate penalty
        }

        // Optimal range (0.5 - 2.0 ratio) gets bonus
        if (ratio >= 0.5 && ratio <= 2.0) {
            score = Math.min(100, score + 10);
        }

        return {
            score,
            actual_time: actualTime,
            expected_time: expectedTime,
            ratio: parseFloat(ratio.toFixed(2)),
            is_too_fast: isTooFast,
            is_too_slow: isTooSlow
        };
    }

    /**
     * Calculate text quality score
     * @param {object} submissionData - Submission data
     * @param {array} formQuestions - Form questions
     * @param {object} thresholds - Quality thresholds
     * @returns {object} - Text quality score and metrics
     */
    static calculateTextQualityScore(submissionData, formQuestions, thresholds) {
        const textQuestions = formQuestions.filter(q =>
            ['text', 'textarea', 'long_text'].includes(q.question_type)
        );

        if (textQuestions.length === 0) {
            return {
                score: 100,
                count: 0,
                avg_length: 0,
                min_length: 0,
                max_length: 0,
                has_gibberish: false,
                too_short: false
            };
        }

        const textAnswers = submissionData.answers.filter(a =>
            textQuestions.some(q => q.id === a.question_id) && a.answer && typeof a.answer === 'string'
        );

        if (textAnswers.length === 0) {
            return {
                score: 80, // Some penalty for skipping all text questions
                count: 0,
                avg_length: 0,
                min_length: 0,
                max_length: 0,
                has_gibberish: false,
                too_short: true
            };
        }

        const lengths = textAnswers.map(a => a.answer.length);
        const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
        const minLength = Math.min(...lengths);
        const maxLength = Math.max(...lengths);

        let score = 100;
        let hasGibberish = false;
        let tooShort = false;

        // Check average length
        if (avgLength < thresholds.min_avg_text_length) {
            tooShort = true;
            score -= 20;
        }

        // Check for gibberish
        if (thresholds.enable_gibberish_detection) {
            for (const answer of textAnswers) {
                if (this.isGibberish(answer.answer)) {
                    hasGibberish = true;
                    score -= 30;
                    break;
                }
            }
        }

        // Check for single-word answers
        const singleWordAnswers = textAnswers.filter(a =>
            a.answer.trim().split(/\s+/).length === 1 && a.answer.length < 10
        );
        if (singleWordAnswers.length / textAnswers.length > 0.5) {
            score -= 15;
        }

        return {
            score: Math.max(0, score),
            count: textAnswers.length,
            avg_length: parseFloat(avgLength.toFixed(2)),
            min_length: minLength,
            max_length: maxLength,
            has_gibberish: hasGibberish,
            too_short: tooShort
        };
    }

    /**
     * Calculate consistency score (detect straight-lining)
     * @param {object} submissionData - Submission data
     * @param {array} formQuestions - Form questions
     * @returns {object} - Consistency score and flags
     */
    static calculateConsistencyScore(submissionData, formQuestions) {
        const ratingQuestions = formQuestions.filter(q =>
            ['rating', 'scale', 'likert', 'nps'].includes(q.question_type)
        );

        if (ratingQuestions.length < 3) {
            return { score: 100, straight_lining: false };
        }

        const ratingAnswers = submissionData.answers.filter(a =>
            ratingQuestions.some(q => q.id === a.question_id) && typeof a.answer === 'number'
        );

        if (ratingAnswers.length < 3) {
            return { score: 100, straight_lining: false };
        }

        // Check if all ratings are the same (straight-lining)
        const uniqueRatings = new Set(ratingAnswers.map(a => a.answer));
        const straightLining = uniqueRatings.size === 1;

        let score = 100;
        if (straightLining) {
            score = 50; // Heavy penalty for straight-lining
        }

        // Check for minimal variation (all within 1 point)
        const ratings = ratingAnswers.map(a => a.answer);
        const range = Math.max(...ratings) - Math.min(...ratings);
        if (range <= 1 && ratings.length > 5) {
            score = Math.min(score, 70); // Low variation penalty
        }

        return {
            score,
            straight_lining: straightLining
        };
    }

    /**
     * Calculate engagement score
     * @param {object} submissionData - Submission data
     * @param {array} formQuestions - Form questions
     * @returns {object} - Engagement score
     */
    static calculateEngagementScore(submissionData, formQuestions) {
        const totalQuestions = formQuestions.length;
        const answeredQuestions = submissionData.answers.filter(a =>
            a.answer !== null && a.answer !== undefined && a.answer !== ''
        ).length;

        const completionRate = totalQuestions > 0 ? answeredQuestions / totalQuestions : 1;

        let score = completionRate * 100;

        // Bonus for completing all questions
        if (completionRate === 1) {
            score = Math.min(100, score + 10);
        }

        // Penalty for very low completion
        if (completionRate < 0.5) {
            score = Math.max(0, score - 20);
        }

        return { score: parseFloat(score.toFixed(2)) };
    }

    /**
     * Calculate overall quality score (weighted average)
     * @param {object} scores - Individual scores
     * @returns {number} - Overall quality score
     */
    static calculateOverallScore(scores) {
        const weights = {
            completion_time: 0.30,
            text_quality: 0.30,
            consistency: 0.25,
            engagement: 0.15
        };

        const overallScore =
            scores.completion_time * weights.completion_time +
            scores.text_quality * weights.text_quality +
            scores.consistency * weights.consistency +
            scores.engagement * weights.engagement;

        return parseFloat(overallScore.toFixed(2));
    }

    /**
     * Detect suspicious patterns
     * @param {object} submissionData - Submission data
     * @param {object} metrics - Calculated metrics
     * @returns {array} - Suspicious patterns detected
     */
    static detectSuspiciousPatterns(submissionData, metrics) {
        const patterns = [];

        // Bot-like completion time (too consistent)
        if (metrics.completion_time.is_too_fast) {
            patterns.push('bot_pattern');
        }

        // Gibberish text
        if (metrics.text_quality.has_gibberish) {
            patterns.push('gibberish_text');
        }

        // Straight-lining
        if (metrics.consistency.straight_lining) {
            patterns.push('straight_lining');
        }

        // Check for spam keywords in text answers
        const spamKeywords = ['viagra', 'casino', 'lottery', 'click here', 'buy now', 'limited offer'];
        const textAnswers = submissionData.answers.filter(a => typeof a.answer === 'string');
        for (const answer of textAnswers) {
            if (spamKeywords.some(keyword => answer.answer.toLowerCase().includes(keyword))) {
                patterns.push('spam_keywords');
                break;
            }
        }

        return patterns;
    }

    /**
     * Check if text is gibberish
     * @param {string} text - Text to check
     * @returns {boolean} - True if gibberish detected
     */
    static isGibberish(text) {
        if (!text || text.length < 5) return false;

        // Check vowel ratio (gibberish often has very low vowel ratio)
        const vowels = text.match(/[aeiouAEIOU]/g) || [];
        const vowelRatio = vowels.length / text.length;
        if (vowelRatio < 0.1) return true;

        // Check for repeated characters (e.g., "aaaaaaa")
        if (/(.)\1{5,}/.test(text)) return true;

        // Check for random keyboard mashing patterns
        const keyboardPatterns = [
            /asdf/gi, /qwer/gi, /zxcv/gi, /1234/g, /abcd/gi,
            /hjkl/gi, /yuio/gi, /jklm/gi
        ];
        for (const pattern of keyboardPatterns) {
            if (pattern.test(text)) return true;
        }

        return false;
    }

    /**
     * Get quality thresholds for tenant (or default)
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Quality thresholds
     */
    static async getQualityThresholds(tenantId) {
        try {
            const result = await query(
                'SELECT * FROM quality_thresholds WHERE tenant_id = $1',
                [tenantId]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            }

            // Return default thresholds
            return {
                min_quality_score: 50.00,
                suspicious_threshold: 30.00,
                min_completion_time_seconds: 10,
                max_completion_time_seconds: 3600,
                time_ratio_min: 0.2,
                time_ratio_max: 5.0,
                min_avg_text_length: 10,
                min_text_response_length: 5,
                enable_straight_lining_detection: true,
                enable_gibberish_detection: true,
                enable_duplicate_detection: true,
                auto_flag_suspicious: true,
                auto_exclude_from_analytics: false,
                require_manual_review: false
            };
        } catch (error) {
            logger.error('[ResponseQuality] Failed to get thresholds', {
                error: error.message,
                tenantId
            });
            // Return safe defaults
            return {
                min_quality_score: 50.00,
                suspicious_threshold: 30.00,
                min_completion_time_seconds: 10,
                max_completion_time_seconds: 3600,
                time_ratio_min: 0.2,
                time_ratio_max: 5.0,
                min_avg_text_length: 10,
                min_text_response_length: 5,
                enable_straight_lining_detection: true,
                enable_gibberish_detection: true,
                enable_duplicate_detection: true,
                auto_flag_suspicious: true,
                auto_exclude_from_analytics: false,
                require_manual_review: false
            };
        }
    }

    /**
     * Get form questions
     * @param {number} formId - Form ID
     * @returns {Promise<array>} - Form questions
     */
    static async getFormQuestions(formId) {
        try {
            const result = await query(
                'SELECT id, question_type FROM questions WHERE form_id = $1 ORDER BY question_order',
                [formId]
            );
            return result.rows;
        } catch (error) {
            logger.error('[ResponseQuality] Failed to get form questions', {
                error: error.message,
                formId
            });
            return [];
        }
    }

    /**
     * Get quality statistics for a form
     * @param {number} formId - Form ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Quality statistics
     */
    static async getQualityStats(formId, tenantId) {
        try {
            const result = await query(
                `SELECT
                    COUNT(*) as total_responses,
                    AVG(quality_score) as avg_quality_score,
                    COUNT(*) FILTER (WHERE is_suspicious = true) as suspicious_count,
                    COUNT(*) FILTER (WHERE is_spam = true) as spam_count,
                    COUNT(*) FILTER (WHERE is_bot = true) as bot_count,
                    COUNT(*) FILTER (WHERE manual_review_required = true) as review_required_count,
                    COUNT(*) FILTER (WHERE straight_lining_detected = true) as straight_lining_count,
                    COUNT(*) FILTER (WHERE gibberish_detected = true) as gibberish_count
                FROM response_quality_scores
                WHERE form_id = $1 AND tenant_id = $2`,
                [formId, tenantId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[ResponseQuality] Failed to get quality stats', {
                error: error.message,
                formId
            });
            throw error;
        }
    }

    /**
     * Get low quality responses for review
     * @param {number} formId - Form ID
     * @param {number} tenantId - Tenant ID
     * @param {number} limit - Max results
     * @returns {Promise<array>} - Low quality responses
     */
    static async getLowQualityResponses(formId, tenantId, limit = 50) {
        try {
            const result = await query(
                `SELECT
                    rqs.*,
                    s.created_at as submitted_at,
                    s.user_agent,
                    s.ip_address
                FROM response_quality_scores rqs
                JOIN submissions s ON s.id = rqs.submission_id
                WHERE rqs.form_id = $1 AND rqs.tenant_id = $2
                    AND (rqs.is_suspicious = true OR rqs.manual_review_required = true)
                ORDER BY rqs.quality_score ASC, rqs.created_at DESC
                LIMIT $3`,
                [formId, tenantId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[ResponseQuality] Failed to get low quality responses', {
                error: error.message,
                formId
            });
            throw error;
        }
    }

    /**
     * Update quality thresholds for tenant
     * @param {number} tenantId - Tenant ID
     * @param {object} thresholds - New threshold values
     * @returns {Promise<object>} - Updated thresholds
     */
    static async updateQualityThresholds(tenantId, thresholds) {
        try {
            const result = await query(
                `INSERT INTO quality_thresholds (
                    tenant_id,
                    min_quality_score, suspicious_threshold,
                    min_completion_time_seconds, max_completion_time_seconds,
                    time_ratio_min, time_ratio_max,
                    min_avg_text_length, min_text_response_length,
                    enable_straight_lining_detection, enable_gibberish_detection, enable_duplicate_detection,
                    auto_flag_suspicious, auto_exclude_from_analytics, require_manual_review
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (tenant_id)
                DO UPDATE SET
                    min_quality_score = EXCLUDED.min_quality_score,
                    suspicious_threshold = EXCLUDED.suspicious_threshold,
                    min_completion_time_seconds = EXCLUDED.min_completion_time_seconds,
                    max_completion_time_seconds = EXCLUDED.max_completion_time_seconds,
                    time_ratio_min = EXCLUDED.time_ratio_min,
                    time_ratio_max = EXCLUDED.time_ratio_max,
                    min_avg_text_length = EXCLUDED.min_avg_text_length,
                    min_text_response_length = EXCLUDED.min_text_response_length,
                    enable_straight_lining_detection = EXCLUDED.enable_straight_lining_detection,
                    enable_gibberish_detection = EXCLUDED.enable_gibberish_detection,
                    enable_duplicate_detection = EXCLUDED.enable_duplicate_detection,
                    auto_flag_suspicious = EXCLUDED.auto_flag_suspicious,
                    auto_exclude_from_analytics = EXCLUDED.auto_exclude_from_analytics,
                    require_manual_review = EXCLUDED.require_manual_review,
                    updated_at = NOW()
                RETURNING *`,
                [
                    tenantId,
                    thresholds.min_quality_score || 50.00,
                    thresholds.suspicious_threshold || 30.00,
                    thresholds.min_completion_time_seconds || 10,
                    thresholds.max_completion_time_seconds || 3600,
                    thresholds.time_ratio_min || 0.2,
                    thresholds.time_ratio_max || 5.0,
                    thresholds.min_avg_text_length || 10,
                    thresholds.min_text_response_length || 5,
                    thresholds.enable_straight_lining_detection !== undefined ? thresholds.enable_straight_lining_detection : true,
                    thresholds.enable_gibberish_detection !== undefined ? thresholds.enable_gibberish_detection : true,
                    thresholds.enable_duplicate_detection !== undefined ? thresholds.enable_duplicate_detection : true,
                    thresholds.auto_flag_suspicious !== undefined ? thresholds.auto_flag_suspicious : true,
                    thresholds.auto_exclude_from_analytics !== undefined ? thresholds.auto_exclude_from_analytics : false,
                    thresholds.require_manual_review !== undefined ? thresholds.require_manual_review : false
                ]
            );

            logger.info('[ResponseQuality] Quality thresholds updated', { tenantId });
            return result.rows[0];
        } catch (error) {
            logger.error('[ResponseQuality] Failed to update thresholds', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = ResponseQualityService;
