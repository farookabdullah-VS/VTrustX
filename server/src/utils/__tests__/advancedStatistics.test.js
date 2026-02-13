const {
    calculateBayesianPosterior,
    calculateProbabilityBest,
    calculateCredibleInterval,
    calculateExpectedLoss,
    calculateOBrienFlemingBounds,
    calculateInformationFraction,
    shouldStopSequential,
    calculateZStatistic,
    thompsonSampling,
    upperConfidenceBound,
    epsilonGreedy,
    calculateBanditRegret,
    calculateSampleSize,
    calculatePower,
    calculateMDE,
    estimateDuration
} = require('../advancedStatistics');

describe('advancedStatistics', () => {
    describe('Bayesian Functions', () => {
        test('calculateBayesianPosterior updates prior correctly', () => {
            const result = calculateBayesianPosterior(5, 3, 1, 1);
            expect(result.alphaPost).toBe(6);  // 5 + 1
            expect(result.betaPost).toBe(4);   // 3 + 1
        });

        test('calculateProbabilityBest returns probabilities that sum to ≈1', () => {
            const variants = [
                { id: 1, alphaPost: 10, betaPost: 5 },
                { id: 2, alphaPost: 8, betaPost: 7 }
            ];

            const results = calculateProbabilityBest(variants, 1000);
            const totalProb = results.reduce((sum, r) => sum + r.probability, 0);

            expect(results).toHaveLength(2);
            expect(totalProb).toBeCloseTo(1, 1);  // Sum should be close to 1
            expect(results[0].probability).toBeGreaterThan(0);
            expect(results[0].probability).toBeLessThan(1);
        });

        test('calculateCredibleInterval returns valid interval', () => {
            const result = calculateCredibleInterval(10, 5, 0.95);

            expect(result.lower).toBeGreaterThan(0);
            expect(result.lower).toBeLessThan(1);
            expect(result.upper).toBeGreaterThan(result.lower);
            expect(result.upper).toBeLessThan(1);
            expect(result.mean).toBeGreaterThan(result.lower);
            expect(result.mean).toBeLessThan(result.upper);
        });

        test('calculateExpectedLoss returns positive values', () => {
            const variants = [
                { id: 1, alphaPost: 10, betaPost: 5 },
                { id: 2, alphaPost: 8, betaPost: 7 }
            ];

            const results = calculateExpectedLoss(variants, 1000);

            expect(results).toHaveLength(2);
            results.forEach(r => {
                expect(r.expectedLoss).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Sequential Analysis Functions', () => {
        test('calculateOBrienFlemingBounds returns valid boundaries', () => {
            const bounds = calculateOBrienFlemingBounds(1, 5, 0.05);

            expect(bounds.upper).toBeGreaterThan(0);
            expect(bounds.lower).toBeLessThan(0);
            expect(bounds.upper).toBeGreaterThan(Math.abs(bounds.lower));
        });

        test('calculateInformationFraction returns correct fraction', () => {
            const fraction = calculateInformationFraction(500, 1000);
            expect(fraction).toBe(0.5);

            const fractionOverflow = calculateInformationFraction(1200, 1000);
            expect(fractionOverflow).toBe(1);
        });

        test('shouldStopSequential detects winner correctly', () => {
            const zStat = 3.5;
            const upperBound = 2.5;
            const lowerBound = -2.5;

            const result = shouldStopSequential(zStat, upperBound, lowerBound);

            expect(result.shouldStop).toBe(true);
            expect(result.decision).toBe('stop_winner');
        });

        test('shouldStopSequential detects futility correctly', () => {
            const zStat = -3.0;
            const upperBound = 2.5;
            const lowerBound = -2.5;

            const result = shouldStopSequential(zStat, upperBound, lowerBound);

            expect(result.shouldStop).toBe(true);
            expect(result.decision).toBe('stop_futile');
        });

        test('shouldStopSequential continues when within bounds', () => {
            const zStat = 1.5;
            const upperBound = 2.5;
            const lowerBound = -2.5;

            const result = shouldStopSequential(zStat, upperBound, lowerBound);

            expect(result.shouldStop).toBe(false);
            expect(result.decision).toBe('continue');
        });

        test('calculateZStatistic returns valid Z-score', () => {
            const p1 = 0.15;  // 15% conversion
            const n1 = 100;
            const p2 = 0.10;  // 10% conversion
            const n2 = 100;

            const zStat = calculateZStatistic(p1, n1, p2, n2);

            expect(typeof zStat).toBe('number');
            expect(Math.abs(zStat)).toBeGreaterThan(0);
        });

        test('calculateZStatistic handles edge case with p1 = p2', () => {
            const p1 = 0.10;
            const n1 = 100;
            const p2 = 0.10;
            const n2 = 100;

            const zStat = calculateZStatistic(p1, n1, p2, n2);

            expect(zStat).toBeCloseTo(0, 1);
        });
    });

    describe('Multi-Armed Bandit Functions', () => {
        test('thompsonSampling selects an arm', () => {
            const arms = [
                { id: 1, alphaPost: 10, betaPost: 5 },
                { id: 2, alphaPost: 8, betaPost: 7 }
            ];

            const selected = thompsonSampling(arms);

            expect([1, 2]).toContain(selected);
        });

        test('upperConfidenceBound selects arm with highest UCB', () => {
            const arms = [
                { id: 1, meanReward: 0.5, pulls: 10 },
                { id: 2, meanReward: 0.6, pulls: 5 }  // Less pulls = higher exploration bonus
            ];

            const selected = upperConfidenceBound(arms, 15, 2);

            expect([1, 2]).toContain(selected);
        });

        test('epsilonGreedy explores randomly sometimes', () => {
            const arms = [
                { id: 1, meanReward: 0.5 },
                { id: 2, meanReward: 0.6 }
            ];

            const selected = epsilonGreedy(arms, 0.5);  // 50% exploration

            expect([1, 2]).toContain(selected);
        });

        test('epsilonGreedy exploits best arm when exploration = 0', () => {
            const arms = [
                { id: 1, meanReward: 0.5 },
                { id: 2, meanReward: 0.8 }  // Clearly best
            ];

            const selected = epsilonGreedy(arms, 0);  // No exploration

            expect(selected).toBe(2);
        });

        test('calculateBanditRegret computes regret correctly', () => {
            const arms = [
                { id: 1, meanReward: 0.5, pulls: 10, cumulativeReward: 5.0 },
                { id: 2, meanReward: 0.7, pulls: 5, cumulativeReward: 3.5 }
            ];

            const regret = calculateBanditRegret(arms);

            // Optimal arm has meanReward 0.7
            // Total pulls = 15
            // Optimal cumulative = 15 * 0.7 = 10.5
            // Actual cumulative = 5.0 + 3.5 = 8.5
            // Regret = 10.5 - 8.5 = 2.0

            expect(regret).toBeCloseTo(2.0, 1);
        });
    });

    describe('Power Analysis Functions', () => {
        test('calculateSampleSize returns positive integer', () => {
            const baselineRate = 0.10;
            const mde = 0.02;
            const power = 0.80;
            const alpha = 0.05;

            const sampleSize = calculateSampleSize(baselineRate, mde, power, alpha);

            expect(sampleSize).toBeGreaterThan(0);
            expect(Number.isInteger(sampleSize)).toBe(true);
        });

        test('calculateSampleSize increases with lower MDE', () => {
            const baselineRate = 0.10;
            const power = 0.80;
            const alpha = 0.05;

            const sampleSmallMDE = calculateSampleSize(baselineRate, 0.01, power, alpha);
            const sampleLargeMDE = calculateSampleSize(baselineRate, 0.05, power, alpha);

            expect(sampleSmallMDE).toBeGreaterThan(sampleLargeMDE);
        });

        test('calculateSampleSize increases with higher power', () => {
            const baselineRate = 0.10;
            const mde = 0.02;
            const alpha = 0.05;

            const sampleLowPower = calculateSampleSize(baselineRate, mde, 0.70, alpha);
            const sampleHighPower = calculateSampleSize(baselineRate, mde, 0.90, alpha);

            expect(sampleHighPower).toBeGreaterThan(sampleLowPower);
        });

        test('calculatePower returns value between 0 and 1', () => {
            const n = 500;
            const baselineRate = 0.10;
            const mde = 0.02;
            const alpha = 0.05;

            const power = calculatePower(n, baselineRate, mde, alpha);

            expect(power).toBeGreaterThan(0);
            expect(power).toBeLessThan(1);
        });

        test('calculateMDE returns positive value', () => {
            const n = 500;
            const baselineRate = 0.10;
            const power = 0.80;
            const alpha = 0.05;

            const mde = calculateMDE(n, baselineRate, power, alpha);

            expect(mde).toBeGreaterThan(0);
            expect(mde).toBeLessThan(1);
        });

        test('estimateDuration calculates days correctly', () => {
            const sampleSizePerVariant = 1000;
            const variantCount = 2;
            const dailyVolume = 100;

            const days = estimateDuration(sampleSizePerVariant, variantCount, dailyVolume);

            // Total needed = 1000 * 2 = 2000
            // Days = 2000 / 100 = 20
            expect(days).toBe(20);
        });

        test('estimateDuration rounds up', () => {
            const sampleSizePerVariant = 550;
            const variantCount = 2;
            const dailyVolume = 100;

            const days = estimateDuration(sampleSizePerVariant, variantCount, dailyVolume);

            // Total needed = 550 * 2 = 1100
            // Days = ceil(1100 / 100) = 11
            expect(days).toBe(11);
        });
    });

    describe('Edge Cases and Validation', () => {
        test('calculateBayesianPosterior handles zero successes', () => {
            const result = calculateBayesianPosterior(0, 10, 1, 1);
            expect(result.alphaPost).toBe(1);
            expect(result.betaPost).toBe(11);
        });

        test('calculateSampleSize handles very small MDE', () => {
            const sampleSize = calculateSampleSize(0.10, 0.005, 0.80, 0.05);
            expect(sampleSize).toBeGreaterThan(1000);
        });

        test('calculateZStatistic handles small sample sizes', () => {
            const zStat = calculateZStatistic(0.5, 10, 0.4, 10);
            expect(typeof zStat).toBe('number');
            expect(!isNaN(zStat)).toBe(true);
        });

        test('upperConfidenceBound handles arms with zero pulls', () => {
            const arms = [
                { id: 1, meanReward: 0, pulls: 0 },
                { id: 2, meanReward: 0.5, pulls: 10 }
            ];

            const selected = upperConfidenceBound(arms, 10, 2);

            // Should select the unexplored arm (id: 1)
            expect(selected).toBe(1);
        });

        test('estimateDuration returns minimum 1 day', () => {
            const days = estimateDuration(10, 2, 1000);  // Very high daily volume
            expect(days).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Integration Tests', () => {
        test('Full Bayesian workflow', () => {
            // Initial prior
            const alphaPrior = 1;
            const betaPrior = 1;

            // Observe 10 successes, 5 failures
            const posterior1 = calculateBayesianPosterior(10, 5, alphaPrior, betaPrior);
            expect(posterior1.alphaPost).toBe(11);
            expect(posterior1.betaPost).toBe(6);

            // Get credible interval
            const ci = calculateCredibleInterval(posterior1.alphaPost, posterior1.betaPost, 0.95);
            expect(ci.lower).toBeGreaterThan(0);
            expect(ci.upper).toBeLessThan(1);
        });

        test('Full Sequential workflow', () => {
            // Initialize
            const checkNumber = 1;
            const totalChecks = 5;
            const bounds = calculateOBrienFlemingBounds(checkNumber, totalChecks);

            // Get current data
            const p1 = 0.15;
            const n1 = 100;
            const p2 = 0.10;
            const n2 = 100;
            const zStat = calculateZStatistic(p1, n1, p2, n2);

            // Check stopping
            const decision = shouldStopSequential(zStat, bounds.upper, bounds.lower);

            expect(decision.shouldStop).toBeDefined();
            expect(decision.decision).toBeDefined();
            expect(decision.reason).toBeDefined();
        });

        test('Full Power Analysis workflow', () => {
            // Plan experiment
            const baselineRate = 0.10;
            const mde = 0.02;
            const power = 0.80;
            const alpha = 0.05;

            const sampleSize = calculateSampleSize(baselineRate, mde, power, alpha);
            expect(sampleSize).toBeGreaterThan(0);

            // Calculate achieved power
            const achievedPower = calculatePower(sampleSize, baselineRate, mde, alpha);
            expect(achievedPower).toBeGreaterThanOrEqual(power - 0.01);  // Allow small error

            // Estimate duration
            const days = estimateDuration(sampleSize, 2, 100);
            expect(days).toBeGreaterThan(0);
        });
    });
});
