/**
 * Survey Logic Service
 *
 * Handles conditional logic, skip logic, quotas, and piping for surveys
 * Features:
 * - Evaluate skip logic and display conditions
 * - Check and enforce quotas
 * - Apply question piping
 * - Randomize questions and options
 * - Manage question groups/pages
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class SurveyLogicService {
    /**
     * Evaluate logic rules for a question
     * @param {number} formId - Form ID
     * @param {string} questionId - Question ID
     * @param {object} answers - Current answers (questionId => answer value)
     * @returns {Promise<object>} - { shouldShow: boolean, action: string }
     */
    static async evaluateQuestionLogic(formId, questionId, answers = {}) {
        try {
            // Get all active logic rules for this question
            const result = await query(
                `SELECT * FROM question_logic
                WHERE form_id = $1 AND question_id = $2 AND is_active = true
                ORDER BY priority ASC`,
                [formId, questionId]
            );

            const rules = result.rows;

            if (rules.length === 0) {
                return { shouldShow: true, action: 'show' };
            }

            // Evaluate each rule
            for (const rule of rules) {
                const conditionsMet = this.evaluateConditions(
                    rule.conditions,
                    answers,
                    rule.operator
                );

                if (conditionsMet) {
                    return {
                        shouldShow: rule.action === 'show',
                        action: rule.action,
                        actionTarget: rule.action_target
                    };
                }
            }

            // Default to hide if no conditions matched
            return { shouldShow: false, action: 'hide' };
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to evaluate question logic', {
                error: error.message,
                formId,
                questionId
            });
            // Fail open - show question if logic evaluation fails
            return { shouldShow: true, action: 'show' };
        }
    }

    /**
     * Evaluate conditions
     * @param {array} conditions - Array of condition objects
     * @param {object} answers - Current answers
     * @param {string} operator - 'and' or 'or'
     * @returns {boolean} - Whether conditions are met
     */
    static evaluateConditions(conditions, answers, operator = 'and') {
        if (!Array.isArray(conditions) || conditions.length === 0) {
            return true;
        }

        const results = conditions.map(condition => {
            const { questionId, operator: condOp, value } = condition;
            const answer = answers[questionId];

            return this.evaluateCondition(answer, condOp, value);
        });

        if (operator === 'and') {
            return results.every(r => r);
        } else {
            return results.some(r => r);
        }
    }

    /**
     * Evaluate single condition
     * @param {any} answer - Answer value
     * @param {string} operator - Comparison operator
     * @param {any} value - Value to compare against
     * @returns {boolean} - Whether condition is met
     */
    static evaluateCondition(answer, operator, value) {
        switch (operator) {
            case 'equals':
            case '==':
                return answer == value;
            case 'not_equals':
            case '!=':
                return answer != value;
            case 'contains':
                return Array.isArray(answer)
                    ? answer.includes(value)
                    : String(answer).includes(String(value));
            case 'not_contains':
                return Array.isArray(answer)
                    ? !answer.includes(value)
                    : !String(answer).includes(String(value));
            case 'greater_than':
            case '>':
                return Number(answer) > Number(value);
            case 'less_than':
            case '<':
                return Number(answer) < Number(value);
            case 'greater_equal':
            case '>=':
                return Number(answer) >= Number(value);
            case 'less_equal':
            case '<=':
                return Number(answer) <= Number(value);
            case 'is_empty':
                return !answer || answer === '' || (Array.isArray(answer) && answer.length === 0);
            case 'is_not_empty':
                return answer && answer !== '' && (!Array.isArray(answer) || answer.length > 0);
            case 'starts_with':
                return String(answer).startsWith(String(value));
            case 'ends_with':
                return String(answer).endsWith(String(value));
            case 'matches_regex':
                return new RegExp(value).test(String(answer));
            default:
                logger.warn('[SurveyLogicService] Unknown operator', { operator });
                return false;
        }
    }

    /**
     * Check quota availability for a question/option
     * @param {number} formId - Form ID
     * @param {string} questionId - Question ID
     * @param {string} optionValue - Option value (optional)
     * @returns {Promise<object>} - { available: boolean, current: number, limit: number }
     */
    static async checkQuota(formId, questionId, optionValue = null) {
        try {
            const result = await query(
                `SELECT * FROM question_quotas
                WHERE form_id = $1 AND question_id = $2 AND
                      (option_value = $3 OR (option_value IS NULL AND $3 IS NULL))
                      AND is_active = true`,
                [formId, questionId, optionValue]
            );

            if (result.rows.length === 0) {
                return { available: true, current: 0, limit: null };
            }

            const quota = result.rows[0];

            // Check if quota needs reset
            if (quota.reset_frequency && quota.last_reset_at) {
                const shouldReset = this.shouldResetQuota(
                    quota.last_reset_at,
                    quota.reset_frequency
                );

                if (shouldReset) {
                    await this.resetQuota(quota.id);
                    return { available: true, current: 0, limit: quota.quota_limit };
                }
            }

            const available = quota.current_count < quota.quota_limit;

            return {
                available,
                current: quota.current_count,
                limit: quota.quota_limit,
                action: quota.quota_reached_action
            };
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to check quota', {
                error: error.message,
                formId,
                questionId
            });
            // Fail open - allow submission if quota check fails
            return { available: true, current: 0, limit: null };
        }
    }

    /**
     * Increment quota count
     * @param {number} formId - Form ID
     * @param {string} questionId - Question ID
     * @param {string} optionValue - Option value (optional)
     * @returns {Promise<boolean>} - Success status
     */
    static async incrementQuota(formId, questionId, optionValue = null) {
        try {
            await query(
                `UPDATE question_quotas
                SET current_count = current_count + 1, updated_at = NOW()
                WHERE form_id = $1 AND question_id = $2 AND
                      (option_value = $3 OR (option_value IS NULL AND $3 IS NULL))
                      AND is_active = true`,
                [formId, questionId, optionValue]
            );

            return true;
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to increment quota', {
                error: error.message,
                formId,
                questionId
            });
            return false;
        }
    }

    /**
     * Check if quota should be reset
     * @param {Date} lastResetAt - Last reset timestamp
     * @param {string} frequency - Reset frequency
     * @returns {boolean} - Whether quota should reset
     */
    static shouldResetQuota(lastResetAt, frequency) {
        const now = new Date();
        const lastReset = new Date(lastResetAt);

        switch (frequency) {
            case 'daily':
                return now.getDate() !== lastReset.getDate();
            case 'weekly':
                const weekDiff = Math.floor((now - lastReset) / (7 * 24 * 60 * 60 * 1000));
                return weekDiff >= 1;
            case 'monthly':
                return now.getMonth() !== lastReset.getMonth() ||
                       now.getFullYear() !== lastReset.getFullYear();
            default:
                return false;
        }
    }

    /**
     * Reset quota count
     * @param {number} quotaId - Quota ID
     * @returns {Promise<boolean>} - Success status
     */
    static async resetQuota(quotaId) {
        try {
            await query(
                `UPDATE question_quotas
                SET current_count = 0, last_reset_at = NOW(), updated_at = NOW()
                WHERE id = $1`,
                [quotaId]
            );

            logger.info('[SurveyLogicService] Quota reset', { quotaId });
            return true;
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to reset quota', {
                error: error.message,
                quotaId
            });
            return false;
        }
    }

    /**
     * Apply piping to question text
     * @param {number} formId - Form ID
     * @param {string} questionId - Question ID
     * @param {string} questionText - Original question text
     * @param {object} answers - Current answers
     * @returns {Promise<string>} - Question text with piping applied
     */
    static async applyPiping(formId, questionId, questionText, answers = {}) {
        try {
            // Get piping rules for this question
            const result = await query(
                `SELECT * FROM piping_rules
                WHERE form_id = $1 AND target_question_id = $2 AND is_active = true`,
                [formId, questionId]
            );

            const rules = result.rows;

            if (rules.length === 0) {
                return questionText;
            }

            let pipedText = questionText;

            for (const rule of rules) {
                const sourceAnswer = answers[rule.source_question_id];
                let value = sourceAnswer || rule.fallback_value || '';

                // Apply transform rules if specified
                if (rule.transform_rule) {
                    value = this.transformValue(value, rule.transform_rule);
                }

                // Replace template placeholder
                if (rule.template) {
                    const placeholder = `{{${rule.source_question_id}}}`;
                    pipedText = pipedText.replace(
                        new RegExp(placeholder, 'g'),
                        value
                    );
                } else {
                    // Direct replacement
                    pipedText = pipedText.replace(
                        `{{${rule.source_question_id}}}`,
                        value
                    );
                }
            }

            return pipedText;
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to apply piping', {
                error: error.message,
                formId,
                questionId
            });
            return questionText;
        }
    }

    /**
     * Transform piped value
     * @param {any} value - Original value
     * @param {object} transformRule - Transform rules
     * @returns {any} - Transformed value
     */
    static transformValue(value, transformRule) {
        const { type, options } = transformRule;

        switch (type) {
            case 'uppercase':
                return String(value).toUpperCase();
            case 'lowercase':
                return String(value).toLowerCase();
            case 'capitalize':
                return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
            case 'truncate':
                return String(value).substring(0, options.length) + (String(value).length > options.length ? '...' : '');
            case 'format_date':
                return new Date(value).toLocaleDateString(options.locale);
            case 'format_number':
                return Number(value).toLocaleString(options.locale);
            case 'replace':
                return String(value).replace(new RegExp(options.search, 'g'), options.replace);
            default:
                return value;
        }
    }

    /**
     * Get question groups for a form
     * @param {number} formId - Form ID
     * @returns {Promise<array>} - Array of question groups
     */
    static async getQuestionGroups(formId) {
        try {
            const result = await query(
                `SELECT * FROM question_groups
                WHERE form_id = $1 AND is_active = true
                ORDER BY display_order ASC`,
                [formId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to get question groups', {
                error: error.message,
                formId
            });
            return [];
        }
    }

    /**
     * Randomize questions within groups
     * @param {array} groups - Question groups
     * @returns {array} - Randomized groups
     */
    static randomizeQuestions(groups) {
        return groups.map(group => {
            if (group.randomize_questions && group.question_ids) {
                const questionIds = JSON.parse(group.question_ids);
                const shuffled = this.shuffle(questionIds);

                return {
                    ...group,
                    question_ids: JSON.stringify(shuffled)
                };
            }

            return group;
        });
    }

    /**
     * Fisher-Yates shuffle algorithm
     * @param {array} array - Array to shuffle
     * @returns {array} - Shuffled array
     */
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Create logic rule
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @param {object} ruleData - Rule data
     * @returns {Promise<object>} - Created rule
     */
    static async createLogicRule(tenantId, formId, ruleData) {
        try {
            const result = await query(
                `INSERT INTO question_logic
                (tenant_id, form_id, question_id, logic_type, conditions, action, action_target, operator, priority)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    tenantId,
                    formId,
                    ruleData.questionId,
                    ruleData.logicType,
                    JSON.stringify(ruleData.conditions),
                    ruleData.action,
                    ruleData.actionTarget || null,
                    ruleData.operator || 'and',
                    ruleData.priority || 0
                ]
            );

            logger.info('[SurveyLogicService] Logic rule created', {
                ruleId: result.rows[0].id,
                formId
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to create logic rule', {
                error: error.message,
                formId
            });
            throw error;
        }
    }

    /**
     * Get logic rules for a form
     * @param {number} formId - Form ID
     * @returns {Promise<array>} - Array of logic rules
     */
    static async getLogicRules(formId) {
        try {
            const result = await query(
                `SELECT * FROM question_logic
                WHERE form_id = $1
                ORDER BY question_id, priority ASC`,
                [formId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to get logic rules', {
                error: error.message,
                formId
            });
            return [];
        }
    }

    /**
     * Delete logic rule
     * @param {number} ruleId - Rule ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<boolean>} - Success status
     */
    static async deleteLogicRule(ruleId, tenantId) {
        try {
            await query(
                'DELETE FROM question_logic WHERE id = $1 AND tenant_id = $2',
                [ruleId, tenantId]
            );

            logger.info('[SurveyLogicService] Logic rule deleted', { ruleId });
            return true;
        } catch (error) {
            logger.error('[SurveyLogicService] Failed to delete logic rule', {
                error: error.message,
                ruleId
            });
            throw error;
        }
    }
}

module.exports = SurveyLogicService;
