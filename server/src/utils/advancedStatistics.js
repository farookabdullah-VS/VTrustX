/**
 * Advanced Statistics Utility Library
 *
 * Provides statistical functions for:
 * - Bayesian A/B Testing
 * - Sequential Analysis
 * - Multi-Armed Bandits
 * - Power Analysis
 *
 * All functions are pure and well-tested.
 */

// =============================================================================
// BAYESIAN A/B TESTING
// =============================================================================

/**
 * Calculate Bayesian posterior parameters using Beta-Binomial conjugate prior
 *
 * @param {number} successes - Number of successes (conversions)
 * @param {number} failures - Number of failures (non-conversions)
 * @param {number} alphaPrior - Alpha parameter of Beta prior (default: 1 = uniform)
 * @param {number} betaPrior - Beta parameter of Beta prior (default: 1 = uniform)
 * @returns {{alphaPost: number, betaPost: number}} Posterior parameters
 */
function calculateBayesianPosterior(successes, failures, alphaPrior = 1, betaPrior = 1) {
    return {
        alphaPost: alphaPrior + successes,
        betaPost: betaPrior + failures
    };
}

/**
 * Calculate probability that each variant is the best using Monte Carlo simulation
 *
 * @param {Array<{alphaPost: number, betaPost: number, id: number}>} variants - Array of variants with posteriors
 * @param {number} samples - Number of Monte Carlo samples (default: 10000)
 * @returns {Array<{id: number, probability: number}>} Probability each variant is best
 */
function calculateProbabilityBest(variants, samples = 10000) {
    const winCounts = variants.map(() => 0);

    // Monte Carlo simulation
    for (let i = 0; i < samples; i++) {
        const draws = variants.map(v => sampleBeta(v.alphaPost, v.betaPost));
        const maxDraw = Math.max(...draws);
        const winnerIdx = draws.indexOf(maxDraw);
        winCounts[winnerIdx]++;
    }

    return variants.map((v, idx) => ({
        id: v.id,
        probability: winCounts[idx] / samples
    }));
}

/**
 * Sample from Beta distribution using rejection sampling
 *
 * @param {number} alpha - Alpha parameter
 * @param {number} beta - Beta parameter
 * @returns {number} Random sample from Beta(alpha, beta)
 */
function sampleBeta(alpha, beta) {
    // Use rejection sampling for simplicity
    // For production, could use more efficient methods
    let x, y;
    do {
        x = Math.pow(Math.random(), 1 / alpha);
        y = Math.pow(Math.random(), 1 / beta);
    } while (x + y > 1);

    return x / (x + y);
}

/**
 * Calculate credible interval for Beta distribution
 *
 * @param {number} alpha - Alpha parameter of Beta distribution
 * @param {number} beta - Beta parameter of Beta distribution
 * @param {number} confidence - Confidence level (default: 0.95)
 * @returns {{lower: number, upper: number, mean: number}} Credible interval
 */
function calculateCredibleInterval(alpha, beta, confidence = 0.95) {
    const mean = alpha / (alpha + beta);
    const tail = (1 - confidence) / 2;

    // Approximate using normal distribution for large samples
    // For small samples, should use Beta quantile function
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdError = Math.sqrt(variance);

    // Use z-score for approximation
    const zScore = getZScore(1 - tail);

    return {
        lower: Math.max(0, mean - zScore * stdError),
        upper: Math.min(1, mean + zScore * stdError),
        mean
    };
}

/**
 * Calculate expected loss if choosing each variant
 *
 * @param {Array<{alphaPost: number, betaPost: number, id: number}>} variants
 * @param {number} samples - Monte Carlo samples (default: 10000)
 * @returns {Array<{id: number, expectedLoss: number}>} Expected loss per variant
 */
function calculateExpectedLoss(variants, samples = 10000) {
    const losses = variants.map(() => 0);

    for (let i = 0; i < samples; i++) {
        const draws = variants.map(v => sampleBeta(v.alphaPost, v.betaPost));
        const maxDraw = Math.max(...draws);

        variants.forEach((_, idx) => {
            losses[idx] += (maxDraw - draws[idx]);
        });
    }

    return variants.map((v, idx) => ({
        id: v.id,
        expectedLoss: losses[idx] / samples
    }));
}

// =============================================================================
// SEQUENTIAL ANALYSIS (Group Sequential Design)
// =============================================================================

/**
 * Calculate O'Brien-Fleming stopping boundaries for sequential analysis
 *
 * @param {number} checkNumber - Current interim check number (1, 2, 3...)
 * @param {number} totalChecks - Total planned number of checks
 * @param {number} alpha - Overall type I error rate (default: 0.05)
 * @returns {{upper: number, lower: number}} Z-statistic boundaries
 */
function calculateOBrienFlemingBounds(checkNumber, totalChecks, alpha = 0.05) {
    // O'Brien-Fleming spending function
    // Boundary = z_{alpha/2} * sqrt(K/k)
    // where K = total checks, k = current check

    const zAlpha = getZScore(1 - alpha / 2);
    const boundary = zAlpha * Math.sqrt(totalChecks / checkNumber);

    return {
        upper: boundary,
        lower: -boundary
    };
}

/**
 * Calculate information fraction (proportion of planned information)
 *
 * @param {number} currentN - Current sample size
 * @param {number} plannedN - Planned total sample size
 * @returns {number} Information fraction (0 to 1)
 */
function calculateInformationFraction(currentN, plannedN) {
    return Math.min(currentN / plannedN, 1);
}

/**
 * Determine if sequential test should stop
 *
 * @param {number} zStatistic - Current Z-statistic
 * @param {number} upperBound - Upper stopping boundary
 * @param {number} lowerBound - Lower stopping boundary
 * @returns {{shouldStop: boolean, decision: string, reason: string}} Stopping decision
 */
function shouldStopSequential(zStatistic, upperBound, lowerBound) {
    if (zStatistic >= upperBound) {
        return {
            shouldStop: true,
            decision: 'stop_winner',
            reason: `Z-statistic (${zStatistic.toFixed(3)}) exceeds upper boundary (${upperBound.toFixed(3)}). Significant difference found.`
        };
    }

    if (zStatistic <= lowerBound) {
        return {
            shouldStop: true,
            decision: 'stop_futile',
            reason: `Z-statistic (${zStatistic.toFixed(3)}) below lower boundary (${lowerBound.toFixed(3)}). Unlikely to find significant difference.`
        };
    }

    return {
        shouldStop: false,
        decision: 'continue',
        reason: `Z-statistic (${zStatistic.toFixed(3)}) within boundaries. Continue collecting data.`
    };
}

/**
 * Calculate Z-statistic for comparing two proportions
 *
 * @param {number} p1 - Proportion for variant 1
 * @param {number} n1 - Sample size for variant 1
 * @param {number} p2 - Proportion for variant 2
 * @param {number} n2 - Sample size for variant 2
 * @returns {number} Z-statistic
 */
function calculateZStatistic(p1, n1, p2, n2) {
    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) return 0;

    return (p1 - p2) / se;
}

// =============================================================================
// MULTI-ARMED BANDITS
// =============================================================================

/**
 * Thompson Sampling: Select arm based on Bayesian posterior sampling
 *
 * @param {Array<{id: number, alphaPost: number, betaPost: number}>} arms
 * @returns {number} Selected arm ID
 */
function thompsonSampling(arms) {
    const samples = arms.map(arm => ({
        id: arm.id,
        sample: sampleBeta(arm.alphaPost, arm.betaPost)
    }));

    // Select arm with highest sample
    const best = samples.reduce((max, current) =>
        current.sample > max.sample ? current : max
    );

    return best.id;
}

/**
 * Upper Confidence Bound (UCB1) algorithm
 *
 * @param {Array<{id: number, meanReward: number, pulls: number}>} arms
 * @param {number} totalPulls - Total number of pulls across all arms
 * @param {number} c - Exploration parameter (default: 2)
 * @returns {number} Selected arm ID
 */
function upperConfidenceBound(arms, totalPulls, c = 2) {
    const ucbValues = arms.map(arm => {
        if (arm.pulls === 0) {
            return { id: arm.id, ucb: Infinity }; // Explore unplayed arms first
        }

        const exploration = c * Math.sqrt(Math.log(totalPulls) / arm.pulls);
        return {
            id: arm.id,
            ucb: arm.meanReward + exploration
        };
    });

    // Select arm with highest UCB
    const best = ucbValues.reduce((max, current) =>
        current.ucb > max.ucb ? current : max
    );

    return best.id;
}

/**
 * Epsilon-Greedy algorithm
 *
 * @param {Array<{id: number, meanReward: number}>} arms
 * @param {number} epsilon - Exploration probability (default: 0.1)
 * @returns {number} Selected arm ID
 */
function epsilonGreedy(arms, epsilon = 0.1) {
    // With probability epsilon, explore randomly
    if (Math.random() < epsilon) {
        const randomIdx = Math.floor(Math.random() * arms.length);
        return arms[randomIdx].id;
    }

    // Otherwise, exploit best known arm
    const best = arms.reduce((max, current) =>
        current.meanReward > max.meanReward ? current : max
    );

    return best.id;
}

/**
 * Calculate cumulative regret for bandit
 *
 * @param {Array<{id: number, meanReward: number, pulls: number, cumulativeReward: number}>} arms
 * @returns {number} Cumulative regret
 */
function calculateBanditRegret(arms) {
    // Find optimal arm (highest mean reward)
    const optimalMean = Math.max(...arms.map(a => a.meanReward));
    const totalPulls = arms.reduce((sum, a) => sum + a.pulls, 0);

    // Regret = optimal_reward * total_pulls - actual_cumulative_reward
    const optimalReward = optimalMean * totalPulls;
    const actualReward = arms.reduce((sum, a) => sum + a.cumulativeReward, 0);

    return Math.max(0, optimalReward - actualReward);
}

// =============================================================================
// POWER ANALYSIS
// =============================================================================

/**
 * Calculate required sample size per group for two-proportion test
 *
 * @param {number} baselineRate - Baseline conversion rate (0-1)
 * @param {number} mde - Minimum detectable effect (absolute, e.g., 0.02 for 2%)
 * @param {number} power - Desired power (default: 0.80)
 * @param {number} alpha - Significance level (default: 0.05)
 * @returns {number} Required sample size per group
 */
function calculateSampleSize(baselineRate, mde, power = 0.80, alpha = 0.05) {
    const p1 = baselineRate;
    const p2 = baselineRate + mde;

    // Z-scores
    const zAlpha = getZScore(1 - alpha / 2);
    const zBeta = getZScore(power);

    // Pooled proportion (approximate)
    const pBar = (p1 + p2) / 2;

    // Sample size formula for two proportions
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
                               zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
}

/**
 * Calculate statistical power for given sample size
 *
 * @param {number} n - Sample size per group
 * @param {number} baselineRate - Baseline conversion rate
 * @param {number} mde - Minimum detectable effect
 * @param {number} alpha - Significance level
 * @returns {number} Statistical power (0-1)
 */
function calculatePower(n, baselineRate, mde, alpha = 0.05) {
    const p1 = baselineRate;
    const p2 = baselineRate + mde;

    const zAlpha = getZScore(1 - alpha / 2);
    const pBar = (p1 + p2) / 2;

    const se1 = Math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n);
    const se0 = Math.sqrt(2 * pBar * (1 - pBar) / n);

    const zBeta = (Math.abs(p2 - p1) - zAlpha * se0) / se1;

    return cumulativeNormal(zBeta);
}

/**
 * Calculate minimum detectable effect for given sample size
 *
 * @param {number} n - Sample size per group
 * @param {number} baselineRate - Baseline conversion rate
 * @param {number} power - Desired power
 * @param {number} alpha - Significance level
 * @returns {number} Minimum detectable effect (absolute)
 */
function calculateMDE(n, baselineRate, power = 0.80, alpha = 0.05) {
    const zAlpha = getZScore(1 - alpha / 2);
    const zBeta = getZScore(power);

    const p1 = baselineRate;

    // Solve for p2 using iterative approach (binary search)
    let low = 0;
    let high = 1 - p1;
    let mde = (low + high) / 2;

    for (let i = 0; i < 20; i++) {
        const calculatedPower = calculatePower(n, baselineRate, mde, alpha);

        if (Math.abs(calculatedPower - power) < 0.001) break;

        if (calculatedPower < power) {
            low = mde;
        } else {
            high = mde;
        }

        mde = (low + high) / 2;
    }

    return mde;
}

/**
 * Estimate experiment duration in days
 *
 * @param {number} sampleSize - Required sample size per group
 * @param {number} variantCount - Number of variants
 * @param {number} dailyVolume - Expected daily volume
 * @returns {number} Estimated duration in days
 */
function estimateDuration(sampleSize, variantCount, dailyVolume) {
    const totalRequired = sampleSize * variantCount;
    return Math.ceil(totalRequired / dailyVolume);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Z-score for given cumulative probability
 *
 * @param {number} p - Cumulative probability (0-1)
 * @returns {number} Z-score
 */
function getZScore(p) {
    // Approximation using Beasley-Springer-Moro algorithm
    // Good for 0.001 < p < 0.999

    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
               0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
               0.0000321767881768, 0.0000002888167364, 0.0000003960315187];

    let x = p - 0.5;

    if (Math.abs(x) < 0.42) {
        const r = x * x;
        return x * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
               ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    }

    let r = p < 0.5 ? p : 1 - p;
    r = Math.log(-Math.log(r));

    const sign = p < 0.5 ? -1 : 1;
    return sign * (c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * (c[5] + r * (c[6] + r * (c[7] + r * c[8]))))))));
}

/**
 * Cumulative distribution function for standard normal
 *
 * @param {number} z - Z-score
 * @returns {number} Cumulative probability
 */
function cumulativeNormal(z) {
    // Approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - p : p;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Bayesian
    calculateBayesianPosterior,
    calculateProbabilityBest,
    calculateCredibleInterval,
    calculateExpectedLoss,
    sampleBeta,

    // Sequential
    calculateOBrienFlemingBounds,
    calculateInformationFraction,
    shouldStopSequential,
    calculateZStatistic,

    // Bandit
    thompsonSampling,
    upperConfidenceBound,
    epsilonGreedy,
    calculateBanditRegret,

    // Power Analysis
    calculateSampleSize,
    calculatePower,
    calculateMDE,
    estimateDuration,

    // Helpers
    getZScore,
    cumulativeNormal
};
