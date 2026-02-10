/**
 * Quota Utilities for shared logic between routes and engines
 */

const getPeriodKey = (period, date) => {
    const now = date ? new Date(date) : new Date();
    if (period === 'daily') return `daily:${now.toISOString().split('T')[0]}`;
    if (period === 'monthly') return `monthly:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    if (period === 'weekly') {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `weekly:${d.getUTCFullYear()}-W${weekNo}`;
    }
    return null;
};

/**
 * Checks if a data object matches the criteria defined in a quota
 * Supports equality and numeric operators: >, <, >=, <=, !=
 * Example criteria: { "nps_score": ">8", "department": "HR" }
 */
const matchesCriteria = (data, criteria) => {
    // Handle empty or invalid criteria
    if (!criteria ||
        (typeof criteria === 'object' && Object.keys(criteria).length === 0) ||
        criteria === '{}') {
        return true;
    }

    // Parse stringified criteria if necessary
    let criteriaObj = criteria;
    if (typeof criteria === 'string') {
        try {
            criteriaObj = JSON.parse(criteria);
        } catch (e) {
            console.error("Failed to parse criteria JSON:", criteria);
            return false;
        }
    }

    // Handle Array format (Legacy compatibility)
    if (Array.isArray(criteriaObj)) {
        if (criteriaObj.length === 0) return true;
        for (const item of criteriaObj) {
            if (!evaluateCondition(data[item.question], item.answer)) return false;
        }
        return true;
    }

    // Object format: { key: value }
    for (const [key, expectedVal] of Object.entries(criteriaObj)) {
        if (!evaluateCondition(data[key], expectedVal)) return false;
    }
    return true;
};

/**
 * Evaluates a single condition supporting operators
 * @param {any} actual 
 * @param {any} expected 
 */
const evaluateCondition = (actual, expected) => {
    // If expected is null/undefined, we usually expect equality
    if (expected === undefined || expected === null) return actual === expected;

    const actualStr = String(actual || '').trim();
    const expectedStr = String(expected).trim();

    // Check for operators in expected value
    if (expectedStr.startsWith('>=')) {
        return parseFloat(actualStr) >= parseFloat(expectedStr.substring(2));
    }
    if (expectedStr.startsWith('<=')) {
        return parseFloat(actualStr) <= parseFloat(expectedStr.substring(2));
    }
    if (expectedStr.startsWith('>')) {
        return parseFloat(actualStr) > parseFloat(expectedStr.substring(1));
    }
    if (expectedStr.startsWith('<')) {
        return parseFloat(actualStr) < parseFloat(expectedStr.substring(1));
    }
    if (expectedStr.startsWith('!=')) {
        return actualStr != expectedStr.substring(2);
    }

    // Default: Equality (loose to handle strings vs numbers)
    return actualStr == expectedStr;
};

module.exports = {
    getPeriodKey,
    matchesCriteria
};
