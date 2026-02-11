const { getPeriodKey, matchesCriteria } = require('../quotaUtils');

// Access evaluateCondition via module internals for direct testing
// Since it's not exported, we test it indirectly through matchesCriteria

describe('quotaUtils', () => {
    describe('getPeriodKey', () => {
        it('should return daily key for daily period', () => {
            const key = getPeriodKey('daily', new Date('2025-06-15T12:00:00Z'));
            expect(key).toBe('daily:2025-06-15');
        });

        it('should return monthly key for monthly period', () => {
            const key = getPeriodKey('monthly', new Date('2025-06-15T12:00:00Z'));
            expect(key).toBe('monthly:2025-06');
        });

        it('should return weekly key for weekly period', () => {
            const key = getPeriodKey('weekly', new Date('2025-06-15T12:00:00Z'));
            expect(key).toMatch(/^weekly:\d{4}-W\d+$/);
        });

        it('should return null for null/undefined period', () => {
            expect(getPeriodKey(null)).toBeNull();
            expect(getPeriodKey(undefined)).toBeNull();
        });

        it('should return null for "never" period', () => {
            expect(getPeriodKey('never')).toBeNull();
        });

        it('should return null for unknown period', () => {
            expect(getPeriodKey('yearly')).toBeNull();
        });

        it('should use current date when no date provided', () => {
            const key = getPeriodKey('daily');
            const today = new Date().toISOString().split('T')[0];
            expect(key).toBe(`daily:${today}`);
        });

        it('should pad monthly key with leading zero', () => {
            const key = getPeriodKey('monthly', new Date('2025-01-05T12:00:00Z'));
            expect(key).toBe('monthly:2025-01');
        });

        it('should handle date string input', () => {
            const key = getPeriodKey('daily', '2025-03-20');
            expect(key).toBe('daily:2025-03-20');
        });

        it('should produce different daily keys for different dates', () => {
            const key1 = getPeriodKey('daily', new Date('2025-06-01'));
            const key2 = getPeriodKey('daily', new Date('2025-06-02'));
            expect(key1).not.toBe(key2);
        });

        it('should produce same weekly key for dates in same week', () => {
            // Mon Jun 16 and Tue Jun 17 2025 are in the same ISO week
            const key1 = getPeriodKey('weekly', new Date('2025-06-16T12:00:00Z'));
            const key2 = getPeriodKey('weekly', new Date('2025-06-17T12:00:00Z'));
            expect(key1).toBe(key2);
        });

        it('should produce different weekly keys for dates in different weeks', () => {
            const key1 = getPeriodKey('weekly', new Date('2025-06-09T12:00:00Z'));
            const key2 = getPeriodKey('weekly', new Date('2025-06-16T12:00:00Z'));
            expect(key1).not.toBe(key2);
        });
    });

    describe('matchesCriteria', () => {
        it('should return true for empty criteria object', () => {
            expect(matchesCriteria({ foo: 'bar' }, {})).toBe(true);
        });

        it('should return true for null criteria', () => {
            expect(matchesCriteria({ foo: 'bar' }, null)).toBe(true);
        });

        it('should return true for undefined criteria', () => {
            expect(matchesCriteria({ foo: 'bar' }, undefined)).toBe(true);
        });

        it('should return true for empty string criteria "{}"', () => {
            expect(matchesCriteria({ foo: 'bar' }, '{}')).toBe(true);
        });

        it('should match simple equality (object criteria)', () => {
            expect(matchesCriteria({ dept: 'HR' }, { dept: 'HR' })).toBe(true);
            expect(matchesCriteria({ dept: 'IT' }, { dept: 'HR' })).toBe(false);
        });

        it('should match multiple criteria (AND logic)', () => {
            const data = { dept: 'HR', score: '8' };
            expect(matchesCriteria(data, { dept: 'HR', score: '8' })).toBe(true);
            expect(matchesCriteria(data, { dept: 'HR', score: '9' })).toBe(false);
        });

        it('should handle array format criteria (legacy)', () => {
            const data = { q1: 'yes' };
            const criteria = [{ question: 'q1', answer: 'yes' }];
            expect(matchesCriteria(data, criteria)).toBe(true);
        });

        it('should return true for empty array criteria', () => {
            expect(matchesCriteria({ foo: 'bar' }, [])).toBe(true);
        });

        it('should handle stringified criteria', () => {
            expect(matchesCriteria({ dept: 'HR' }, '{"dept":"HR"}')).toBe(true);
        });

        it('should return false for invalid JSON string', () => {
            expect(matchesCriteria({ dept: 'HR' }, 'not-json')).toBe(false);
        });

        // Operator tests (tested indirectly through matchesCriteria)
        it('should support > operator', () => {
            expect(matchesCriteria({ score: '9' }, { score: '>8' })).toBe(true);
            expect(matchesCriteria({ score: '7' }, { score: '>8' })).toBe(false);
        });

        it('should support < operator', () => {
            expect(matchesCriteria({ score: '3' }, { score: '<5' })).toBe(true);
            expect(matchesCriteria({ score: '6' }, { score: '<5' })).toBe(false);
        });

        it('should support >= operator', () => {
            expect(matchesCriteria({ score: '8' }, { score: '>=8' })).toBe(true);
            expect(matchesCriteria({ score: '7' }, { score: '>=8' })).toBe(false);
        });

        it('should support <= operator', () => {
            expect(matchesCriteria({ score: '5' }, { score: '<=5' })).toBe(true);
            expect(matchesCriteria({ score: '6' }, { score: '<=5' })).toBe(false);
        });

        it('should support != operator', () => {
            expect(matchesCriteria({ dept: 'IT' }, { dept: '!=HR' })).toBe(true);
            expect(matchesCriteria({ dept: 'HR' }, { dept: '!=HR' })).toBe(false);
        });

        it('should handle type coercion in equality', () => {
            expect(matchesCriteria({ score: 8 }, { score: '8' })).toBe(true);
        });

        it('should handle missing data keys', () => {
            expect(matchesCriteria({}, { dept: 'HR' })).toBe(false);
        });
    });
});
