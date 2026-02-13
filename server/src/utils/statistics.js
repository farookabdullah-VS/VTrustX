/**
 * Statistical Utilities for A/B Testing
 *
 * Provides Chi-square test, confidence intervals, sample size calculations,
 * and other statistical methods for A/B test analysis.
 */

/**
 * Chi-square test for statistical significance
 * Tests whether observed differences between variants are statistically significant
 *
 * @param {object} variant1 - { conversions, total }
 * @param {object} variant2 - { conversions, total }
 * @returns {object} - { chiSquare, pValue, significant, degreesOfFreedom }
 */
function chiSquareTest(variant1, variant2) {
    const { conversions: c1, total: n1 } = variant1;
    const { conversions: c2, total: n2 } = variant2;

    // Calculate observed frequencies
    const observed = [
        [c1, n1 - c1],     // Variant 1: [conversions, non-conversions]
        [c2, n2 - c2]      // Variant 2: [conversions, non-conversions]
    ];

    // Calculate expected frequencies
    const totalConversions = c1 + c2;
    const totalNonConversions = (n1 - c1) + (n2 - c2);
    const totalSamples = n1 + n2;

    const expected = [
        [
            (n1 * totalConversions) / totalSamples,
            (n1 * totalNonConversions) / totalSamples
        ],
        [
            (n2 * totalConversions) / totalSamples,
            (n2 * totalNonConversions) / totalSamples
        ]
    ];

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const obs = observed[i][j];
            const exp = expected[i][j];
            if (exp > 0) {
                chiSquare += Math.pow(obs - exp, 2) / exp;
            }
        }
    }

    // Degrees of freedom for 2x2 contingency table
    const degreesOfFreedom = 1;

    // Calculate p-value using chi-square distribution
    const pValue = chiSquarePValue(chiSquare, degreesOfFreedom);

    // Significant at p < 0.05
    const significant = pValue < 0.05;

    return {
        chiSquare: parseFloat(chiSquare.toFixed(4)),
        pValue: parseFloat(pValue.toFixed(4)),
        significant,
        degreesOfFreedom
    };
}

/**
 * Calculate p-value from chi-square statistic
 * Approximation using incomplete gamma function
 *
 * @param {number} chiSquare - Chi-square statistic
 * @param {number} df - Degrees of freedom
 * @returns {number} - p-value
 */
function chiSquarePValue(chiSquare, df) {
    // For df = 1, use approximation
    if (df === 1) {
        // P(X > chiSquare) = 1 - erf(sqrt(chiSquare/2))
        // Simplified approximation
        const z = Math.sqrt(chiSquare);
        return 2 * (1 - normalCDF(z));
    }

    // General case using gamma function (simplified)
    const k = df / 2;
    const x = chiSquare / 2;

    // Regularized incomplete gamma function approximation
    if (x < k + 1) {
        return 1 - lowerIncompleteGamma(k, x) / gamma(k);
    } else {
        return upperIncompleteGamma(k, x) / gamma(k);
    }
}

/**
 * Standard normal cumulative distribution function
 *
 * @param {number} z - Z-score
 * @returns {number} - Probability P(Z <= z)
 */
function normalCDF(z) {
    // Approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - prob : prob;
}

/**
 * Gamma function approximation (Stirling's approximation)
 *
 * @param {number} n - Input value
 * @returns {number} - Gamma(n)
 */
function gamma(n) {
    if (n === 1 || n === 2) return 1;
    if (n < 1) return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));

    // Stirling's approximation
    return Math.sqrt(2 * Math.PI / n) * Math.pow(n / Math.E, n);
}

/**
 * Lower incomplete gamma function approximation
 *
 * @param {number} s - Shape parameter
 * @param {number} x - Upper limit
 * @returns {number} - Lower incomplete gamma
 */
function lowerIncompleteGamma(s, x) {
    // Series expansion
    let sum = 1 / s;
    let term = 1 / s;

    for (let n = 1; n <= 100; n++) {
        term *= x / (s + n);
        sum += term;
        if (Math.abs(term) < 1e-10) break;
    }

    return Math.pow(x, s) * Math.exp(-x) * sum;
}

/**
 * Upper incomplete gamma function approximation
 *
 * @param {number} s - Shape parameter
 * @param {number} x - Lower limit
 * @returns {number} - Upper incomplete gamma
 */
function upperIncompleteGamma(s, x) {
    return gamma(s) - lowerIncompleteGamma(s, x);
}

/**
 * Confidence interval for proportion
 *
 * @param {number} proportion - Sample proportion (e.g., 0.25 for 25%)
 * @param {number} sampleSize - Sample size
 * @param {number} confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns {object} - { lower, upper, margin }
 */
function confidenceInterval(proportion, sampleSize, confidence = 0.95) {
    if (sampleSize === 0) {
        return { lower: 0, upper: 0, margin: 0 };
    }

    // Z-score for confidence level
    const zScores = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.576
    };
    const z = zScores[confidence] || 1.96;

    // Standard error
    const se = Math.sqrt((proportion * (1 - proportion)) / sampleSize);

    // Margin of error
    const margin = z * se;

    return {
        lower: Math.max(0, proportion - margin),
        upper: Math.min(1, proportion + margin),
        margin
    };
}

/**
 * Calculate required sample size for A/B test
 *
 * @param {number} baselineRate - Baseline conversion rate (e.g., 0.10 for 10%)
 * @param {number} minimumDetectableEffect - Minimum effect to detect (e.g., 0.02 for 2%)
 * @param {number} power - Statistical power (default 0.80 for 80%)
 * @param {number} alpha - Significance level (default 0.05 for 5%)
 * @returns {number} - Required sample size per variant
 */
function calculateSampleSize(baselineRate, minimumDetectableEffect, power = 0.80, alpha = 0.05) {
    // Z-scores
    const zAlpha = 1.96;  // Z-score for alpha = 0.05 (two-tailed)
    const zBeta = 0.84;   // Z-score for power = 0.80

    const p1 = baselineRate;
    const p2 = baselineRate + minimumDetectableEffect;

    const pBar = (p1 + p2) / 2;

    // Sample size formula for proportions
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
}

/**
 * Calculate lift (relative improvement)
 *
 * @param {number} baselineRate - Baseline conversion rate
 * @param {number} variantRate - Variant conversion rate
 * @returns {number} - Lift percentage (e.g., 15.5 for 15.5% improvement)
 */
function calculateLift(baselineRate, variantRate) {
    if (baselineRate === 0) return 0;
    return ((variantRate - baselineRate) / baselineRate) * 100;
}

/**
 * Determine winner based on statistical significance and lift
 *
 * @param {array} variants - Array of variant objects: [{ id, name, conversions, total }]
 * @param {number} confidenceLevel - Confidence level (e.g., 0.95)
 * @returns {object} - { winner, reason, significant, details }
 */
function determineWinner(variants, confidenceLevel = 0.95) {
    if (variants.length < 2) {
        return {
            winner: null,
            reason: 'Need at least 2 variants to determine winner',
            significant: false,
            details: null
        };
    }

    // Calculate conversion rates
    const variantsWithRates = variants.map(v => ({
        ...v,
        rate: v.total > 0 ? v.conversions / v.total : 0
    }));

    // Sort by conversion rate (descending)
    variantsWithRates.sort((a, b) => b.rate - a.rate);

    const best = variantsWithRates[0];
    const secondBest = variantsWithRates[1];

    // Check minimum sample size
    const minSampleSize = 100;
    if (best.total < minSampleSize || secondBest.total < minSampleSize) {
        return {
            winner: null,
            reason: `Insufficient sample size. Need at least ${minSampleSize} samples per variant.`,
            significant: false,
            details: {
                bestVariant: best.name,
                bestRate: (best.rate * 100).toFixed(2) + '%',
                sampleSize: best.total
            }
        };
    }

    // Perform chi-square test
    const chiTest = chiSquareTest(
        { conversions: best.conversions, total: best.total },
        { conversions: secondBest.conversions, total: secondBest.total }
    );

    // Calculate lift
    const lift = calculateLift(secondBest.rate, best.rate);

    // Calculate confidence interval
    const ci = confidenceInterval(best.rate, best.total, confidenceLevel);

    if (chiTest.significant) {
        return {
            winner: best.id,
            reason: `${best.name} is statistically significant winner with ${lift.toFixed(1)}% lift`,
            significant: true,
            details: {
                winnerName: best.name,
                winnerRate: (best.rate * 100).toFixed(2) + '%',
                lift: lift.toFixed(2) + '%',
                pValue: chiTest.pValue,
                chiSquare: chiTest.chiSquare,
                confidenceInterval: {
                    lower: (ci.lower * 100).toFixed(2) + '%',
                    upper: (ci.upper * 100).toFixed(2) + '%'
                }
            }
        };
    } else {
        return {
            winner: null,
            reason: `No statistically significant difference (p=${chiTest.pValue.toFixed(4)})`,
            significant: false,
            details: {
                bestVariant: best.name,
                bestRate: (best.rate * 100).toFixed(2) + '%',
                lift: lift.toFixed(2) + '%',
                pValue: chiTest.pValue
            }
        };
    }
}

/**
 * Calculate Bayesian probability that variant A is better than variant B
 * Simple approximation using beta distributions
 *
 * @param {object} variantA - { conversions, total }
 * @param {object} variantB - { conversions, total }
 * @param {number} iterations - Monte Carlo iterations (default 10000)
 * @returns {number} - Probability that A > B (0 to 1)
 */
function bayesianProbability(variantA, variantB, iterations = 10000) {
    // Beta distribution parameters
    const alphaA = variantA.conversions + 1;
    const betaA = variantA.total - variantA.conversions + 1;

    const alphaB = variantB.conversions + 1;
    const betaB = variantB.total - variantB.conversions + 1;

    // Monte Carlo simulation
    let countABetterThanB = 0;

    for (let i = 0; i < iterations; i++) {
        const sampleA = betaRandom(alphaA, betaA);
        const sampleB = betaRandom(alphaB, betaB);

        if (sampleA > sampleB) {
            countABetterThanB++;
        }
    }

    return countABetterThanB / iterations;
}

/**
 * Generate random sample from Beta distribution
 * Using gamma distribution method
 *
 * @param {number} alpha - Alpha parameter
 * @param {number} beta - Beta parameter
 * @returns {number} - Random sample from Beta(alpha, beta)
 */
function betaRandom(alpha, beta) {
    const x = gammaRandom(alpha, 1);
    const y = gammaRandom(beta, 1);
    return x / (x + y);
}

/**
 * Generate random sample from Gamma distribution
 * Using Marsaglia and Tsang method
 *
 * @param {number} shape - Shape parameter (alpha)
 * @param {number} scale - Scale parameter (beta)
 * @returns {number} - Random sample from Gamma(shape, scale)
 */
function gammaRandom(shape, scale) {
    if (shape < 1) {
        return gammaRandom(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
        let x, v;
        do {
            x = normalRandom();
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();

        if (u < 1 - 0.0331 * x * x * x * x) {
            return d * v * scale;
        }

        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
            return d * v * scale;
        }
    }
}

/**
 * Generate random sample from standard normal distribution
 * Using Box-Muller transform
 *
 * @returns {number} - Random sample from N(0, 1)
 */
function normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

module.exports = {
    chiSquareTest,
    confidenceInterval,
    calculateSampleSize,
    calculateLift,
    determineWinner,
    bayesianProbability,
    normalCDF,
    gamma
};
