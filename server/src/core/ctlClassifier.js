const logger = require('../infrastructure/logger');

const NEGATIVE_KEYWORDS = ['bad', 'poor', 'terrible', 'disappointed', 'awful', 'worst', 'horrible', 'hate', 'angry', 'frustrated', 'unacceptable', 'dissatisfied'];
const POSITIVE_KEYWORDS = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'outstanding', 'satisfied', 'happy'];

/**
 * Classify a submission's data for CTL alerting.
 * Mirrors the ResultsViewer sentiment heuristic on the server side.
 *
 * @param {object} data - The submission data (key-value pairs from form fields)
 * @returns {{ shouldAlert: boolean, alertLevel: string|null, scoreValue: number|null, scoreType: string|null, sentiment: string }}
 */
function classifySubmission(data) {
    if (!data || typeof data !== 'object') {
        return { shouldAlert: false, alertLevel: null, scoreValue: null, scoreType: null, sentiment: 'Neutral' };
    }

    let worstAlert = null; // { alertLevel, scoreValue, scoreType, sentiment }

    for (const [key, rawVal] of Object.entries(data)) {
        // Unwrap SurveyJS object wrappers like { value: 3, text: "3" }
        let val = rawVal;
        if (val && typeof val === 'object' && val.hasOwnProperty('value')) {
            val = val.value;
        }

        const lowerKey = key.toLowerCase();
        const numVal = Number(val);

        // --- NPS fields (key contains 'nps') ---
        if (lowerKey.includes('nps') && !isNaN(numVal) && numVal >= 0 && numVal <= 10) {
            const result = classifyNps(numVal);
            if (result && isSeverer(result.alertLevel, worstAlert?.alertLevel)) {
                worstAlert = { ...result, scoreType: 'nps', scoreValue: numVal };
            }
            continue;
        }

        // --- CSAT fields ---
        if ((lowerKey.includes('csat') || lowerKey.includes('satisfaction')) && !isNaN(numVal) && numVal >= 1 && numVal <= 10) {
            const result = classifyRating(numVal);
            if (result && isSeverer(result.alertLevel, worstAlert?.alertLevel)) {
                worstAlert = { ...result, scoreType: 'csat', scoreValue: numVal };
            }
            continue;
        }

        // --- CES fields ---
        if ((lowerKey.includes('ces') || lowerKey.includes('effort')) && !isNaN(numVal) && numVal >= 1 && numVal <= 10) {
            const result = classifyRating(numVal);
            if (result && isSeverer(result.alertLevel, worstAlert?.alertLevel)) {
                worstAlert = { ...result, scoreType: 'ces', scoreValue: numVal };
            }
            continue;
        }

        // --- Generic rating fields (numeric 1-10) ---
        if (!isNaN(numVal) && numVal >= 1 && numVal <= 10 && (lowerKey.includes('rating') || lowerKey.includes('score') || lowerKey.includes('rate'))) {
            const result = classifyRating(numVal);
            if (result && isSeverer(result.alertLevel, worstAlert?.alertLevel)) {
                worstAlert = { ...result, scoreType: 'rating', scoreValue: numVal };
            }
            continue;
        }

        // --- Text sentiment (keyword-based) ---
        if (typeof val === 'string' && val.length > 3) {
            const lowerVal = val.toLowerCase();
            const hasNegative = NEGATIVE_KEYWORDS.some(w => lowerVal.includes(w));
            if (hasNegative && isSeverer('medium', worstAlert?.alertLevel)) {
                worstAlert = { alertLevel: 'medium', sentiment: 'Negative', scoreType: 'sentiment', scoreValue: null };
            }
        }
    }

    if (worstAlert) {
        return {
            shouldAlert: true,
            alertLevel: worstAlert.alertLevel,
            scoreValue: worstAlert.scoreValue,
            scoreType: worstAlert.scoreType,
            sentiment: worstAlert.sentiment
        };
    }

    return { shouldAlert: false, alertLevel: null, scoreValue: null, scoreType: null, sentiment: 'Neutral' };
}

/**
 * NPS classification: 0-3 critical, 4-5 high, 6 medium, 7+ no alert
 */
function classifyNps(score) {
    if (score <= 3) return { alertLevel: 'critical', sentiment: 'Negative' };
    if (score <= 5) return { alertLevel: 'high', sentiment: 'Negative' };
    if (score <= 6) return { alertLevel: 'medium', sentiment: 'Neutral' };
    return null; // 7+ is promoter/passive territory — no alert
}

/**
 * CSAT/CES/Rating classification: 1-3 critical, 4-5 high, 6 medium, 7+ no alert
 */
function classifyRating(score) {
    if (score <= 3) return { alertLevel: 'critical', sentiment: 'Negative' };
    if (score <= 5) return { alertLevel: 'high', sentiment: 'Negative' };
    if (score <= 6) return { alertLevel: 'medium', sentiment: 'Neutral' };
    return null; // 7+ is positive
}

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Returns true if `a` is more severe than `b`.
 */
function isSeverer(a, b) {
    if (!b) return true;
    return (SEVERITY_ORDER[a] || 0) > (SEVERITY_ORDER[b] || 0);
}

module.exports = { classifySubmission };
