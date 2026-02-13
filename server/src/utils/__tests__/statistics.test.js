const {
    chiSquareTest,
    confidenceInterval,
    calculateSampleSize,
    calculateLift,
    determineWinner,
    bayesianProbability,
    normalCDF,
    gamma
} = require('../statistics');

describe('Statistics Utilities', () => {
    describe('chiSquareTest', () => {
        it('should detect significant difference between variants', () => {
            const variant1 = { conversions: 120, total: 1000 }; // 12% conversion
            const variant2 = { conversions: 60, total: 1000 };  // 6% conversion

            const result = chiSquareTest(variant1, variant2);

            expect(result.significant).toBe(true);
            expect(result.pValue).toBeLessThan(0.05);
            expect(result.chiSquare).toBeGreaterThan(0);
            expect(result.degreesOfFreedom).toBe(1);
        });

        it('should not detect significant difference when variants are similar', () => {
            const variant1 = { conversions: 100, total: 1000 }; // 10% conversion
            const variant2 = { conversions: 105, total: 1000 }; // 10.5% conversion

            const result = chiSquareTest(variant1, variant2);

            expect(result.significant).toBe(false);
            expect(result.pValue).toBeGreaterThan(0.05);
        });

        it('should handle edge case with zero conversions', () => {
            const variant1 = { conversions: 0, total: 100 };
            const variant2 = { conversions: 0, total: 100 };

            const result = chiSquareTest(variant1, variant2);

            expect(result.chiSquare).toBe(0);
            expect(result.pValue).toBeGreaterThan(0.05);
            expect(result.significant).toBe(false);
        });

        it('should handle small sample sizes', () => {
            const variant1 = { conversions: 5, total: 20 };
            const variant2 = { conversions: 2, total: 20 };

            const result = chiSquareTest(variant1, variant2);

            expect(result).toHaveProperty('chiSquare');
            expect(result).toHaveProperty('pValue');
            expect(result).toHaveProperty('significant');
        });
    });

    describe('confidenceInterval', () => {
        it('should calculate 95% confidence interval', () => {
            const proportion = 0.25; // 25% conversion rate
            const sampleSize = 1000;

            const result = confidenceInterval(proportion, sampleSize, 0.95);

            expect(result.lower).toBeGreaterThan(0);
            expect(result.upper).toBeLessThan(1);
            expect(result.upper).toBeGreaterThan(result.lower);
            expect(result.margin).toBeGreaterThan(0);

            // Check that the proportion is within the interval
            expect(proportion).toBeGreaterThanOrEqual(result.lower);
            expect(proportion).toBeLessThanOrEqual(result.upper);
        });

        it('should have narrower interval with larger sample size', () => {
            const proportion = 0.25;

            const result1 = confidenceInterval(proportion, 100, 0.95);
            const result2 = confidenceInterval(proportion, 1000, 0.95);

            expect(result2.margin).toBeLessThan(result1.margin);
        });

        it('should handle zero sample size', () => {
            const result = confidenceInterval(0.25, 0, 0.95);

            expect(result.lower).toBe(0);
            expect(result.upper).toBe(0);
            expect(result.margin).toBe(0);
        });

        it('should calculate 90% confidence interval', () => {
            const proportion = 0.25;
            const sampleSize = 1000;

            const result90 = confidenceInterval(proportion, sampleSize, 0.90);
            const result95 = confidenceInterval(proportion, sampleSize, 0.95);

            // 90% CI should be narrower than 95% CI
            expect(result90.margin).toBeLessThan(result95.margin);
        });
    });

    describe('calculateSampleSize', () => {
        it('should calculate required sample size', () => {
            const baselineRate = 0.10; // 10% conversion
            const minimumDetectableEffect = 0.02; // Detect 2% improvement

            const sampleSize = calculateSampleSize(baselineRate, minimumDetectableEffect, 0.80, 0.05);

            expect(sampleSize).toBeGreaterThan(0);
            expect(Number.isInteger(sampleSize)).toBe(true);
        });

        it('should require larger sample size for smaller effect', () => {
            const baselineRate = 0.10;

            const sampleSize1 = calculateSampleSize(baselineRate, 0.05, 0.80, 0.05); // 5% effect
            const sampleSize2 = calculateSampleSize(baselineRate, 0.02, 0.80, 0.05); // 2% effect

            expect(sampleSize2).toBeGreaterThan(sampleSize1);
        });

        it('should require larger sample size for higher power', () => {
            const baselineRate = 0.10;
            const effect = 0.02;

            const sampleSize1 = calculateSampleSize(baselineRate, effect, 0.80, 0.05); // 80% power
            const sampleSize2 = calculateSampleSize(baselineRate, effect, 0.90, 0.05); // 90% power

            expect(sampleSize2).toBeGreaterThanOrEqual(sampleSize1);
        });
    });

    describe('calculateLift', () => {
        it('should calculate positive lift', () => {
            const baselineRate = 0.10; // 10%
            const variantRate = 0.12;  // 12%

            const lift = calculateLift(baselineRate, variantRate);

            expect(lift).toBeCloseTo(20, 1); // 20% improvement
        });

        it('should calculate negative lift', () => {
            const baselineRate = 0.10; // 10%
            const variantRate = 0.08;  // 8%

            const lift = calculateLift(baselineRate, variantRate);

            expect(lift).toBeCloseTo(-20, 1); // 20% decrease
        });

        it('should handle zero baseline', () => {
            const lift = calculateLift(0, 0.10);

            expect(lift).toBe(0);
        });

        it('should calculate 100% lift when doubling', () => {
            const lift = calculateLift(0.10, 0.20);

            expect(lift).toBeCloseTo(100, 1);
        });
    });

    describe('determineWinner', () => {
        it('should determine winner when difference is significant', () => {
            const variants = [
                { id: 1, name: 'A', conversions: 120, total: 1000 }, // 12%
                { id: 2, name: 'B', conversions: 60, total: 1000 }   // 6%
            ];

            const result = determineWinner(variants, 0.95);

            expect(result.winner).toBe(1);
            expect(result.significant).toBe(true);
            expect(result.reason).toContain('statistically significant');
            expect(result.details).toHaveProperty('lift');
            expect(result.details).toHaveProperty('pValue');
        });

        it('should not determine winner when difference is not significant', () => {
            const variants = [
                { id: 1, name: 'A', conversions: 100, total: 1000 }, // 10%
                { id: 2, name: 'B', conversions: 105, total: 1000 }  // 10.5%
            ];

            const result = determineWinner(variants, 0.95);

            expect(result.winner).toBeNull();
            expect(result.significant).toBe(false);
            expect(result.reason).toContain('No statistically significant');
        });

        it('should require minimum sample size', () => {
            const variants = [
                { id: 1, name: 'A', conversions: 12, total: 50 }, // Too small
                { id: 2, name: 'B', conversions: 6, total: 50 }
            ];

            const result = determineWinner(variants, 0.95);

            expect(result.winner).toBeNull();
            expect(result.significant).toBe(false);
            expect(result.reason).toContain('Insufficient sample size');
        });

        it('should handle single variant', () => {
            const variants = [
                { id: 1, name: 'A', conversions: 100, total: 1000 }
            ];

            const result = determineWinner(variants, 0.95);

            expect(result.winner).toBeNull();
            expect(result.reason).toContain('Need at least 2 variants');
        });

        it('should handle three variants', () => {
            const variants = [
                { id: 1, name: 'A', conversions: 120, total: 1000 }, // 12% (best)
                { id: 2, name: 'B', conversions: 100, total: 1000 }, // 10%
                { id: 3, name: 'C', conversions: 60, total: 1000 }   // 6%
            ];

            const result = determineWinner(variants, 0.95);

            // Should compare best (A) with second-best (B)
            expect(result).toHaveProperty('winner');
            expect(result).toHaveProperty('significant');
        });
    });

    describe('bayesianProbability', () => {
        it('should calculate probability that A is better than B', () => {
            const variantA = { conversions: 120, total: 1000 }; // 12%
            const variantB = { conversions: 60, total: 1000 };  // 6%

            const prob = bayesianProbability(variantA, variantB, 1000); // Fewer iterations for speed

            expect(prob).toBeGreaterThan(0.5); // A should be better
            expect(prob).toBeLessThanOrEqual(1);
            expect(prob).toBeGreaterThanOrEqual(0);
        });

        it('should give ~50% probability for identical variants', () => {
            const variantA = { conversions: 100, total: 1000 };
            const variantB = { conversions: 100, total: 1000 };

            const prob = bayesianProbability(variantA, variantB, 1000);

            // Should be close to 0.5 (equal probability)
            expect(prob).toBeGreaterThan(0.4);
            expect(prob).toBeLessThan(0.6);
        });

        it('should handle zero conversions', () => {
            const variantA = { conversions: 0, total: 100 };
            const variantB = { conversions: 0, total: 100 };

            const prob = bayesianProbability(variantA, variantB, 1000);

            // Should be close to 0.5
            expect(prob).toBeGreaterThan(0.4);
            expect(prob).toBeLessThan(0.6);
        });
    });

    describe('normalCDF', () => {
        it('should calculate P(Z <= 0) = 0.5', () => {
            const prob = normalCDF(0);
            expect(prob).toBeCloseTo(0.5, 2);
        });

        it('should calculate P(Z <= 1.96) ≈ 0.975', () => {
            const prob = normalCDF(1.96);
            expect(prob).toBeCloseTo(0.975, 2);
        });

        it('should calculate P(Z <= -1.96) ≈ 0.025', () => {
            const prob = normalCDF(-1.96);
            expect(prob).toBeCloseTo(0.025, 2);
        });

        it('should handle large positive z-scores', () => {
            const prob = normalCDF(3);
            expect(prob).toBeGreaterThan(0.99);
        });

        it('should handle large negative z-scores', () => {
            const prob = normalCDF(-3);
            expect(prob).toBeLessThan(0.01);
        });
    });

    describe('gamma', () => {
        it('should calculate Gamma(1) = 1', () => {
            const result = gamma(1);
            expect(result).toBeCloseTo(1, 5);
        });

        it('should calculate Gamma(2) = 1', () => {
            const result = gamma(2);
            expect(result).toBeCloseTo(1, 5);
        });

        it('should calculate Gamma(n) for positive integers', () => {
            // Gamma(n) = (n-1)! for positive integers
            const result5 = gamma(5);
            expect(result5).toBeGreaterThan(0);
        });

        it('should handle fractional values', () => {
            const result = gamma(2.5);
            expect(result).toBeGreaterThan(0);
        });
    });
});
