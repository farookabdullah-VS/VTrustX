/**
 * Survey Cool Down Service Tests
 *
 * Tests for submission rate limiting (cool down) functionality.
 */

const SurveyCooldownService = require('../SurveyCooldownService');
const { rateLimitCache } = require('../../infrastructure/cache');

// Mock cache
jest.mock('../../infrastructure/cache', () => ({
    rateLimitCache: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn()
    }
}));

jest.mock('../../infrastructure/logger');

describe('SurveyCooldownService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockForm = {
        id: 1,
        cooldown_enabled: true,
        cooldown_period: 3600, // 1 hour
        cooldown_type: 'both'
    };

    describe('checkCooldown', () => {
        it('should allow submission when cool down is disabled', async () => {
            const form = { ...mockForm, cooldown_enabled: false };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', 'user-123');

            expect(result.allowed).toBe(true);
            expect(rateLimitCache.get).not.toHaveBeenCalled();
        });

        it('should allow submission when no previous submission (IP)', async () => {
            rateLimitCache.get.mockResolvedValue(null);
            const form = { ...mockForm, cooldown_type: 'ip' };

            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', null);

            expect(result.allowed).toBe(true);
            expect(rateLimitCache.get).toHaveBeenCalledWith('cooldown:ip:1:192.168.1.1');
        });

        it('should block submission when IP cool down is active', async () => {
            const now = Date.now();
            const lastSubmission = (now - 1800000).toString(); // 30 minutes ago
            rateLimitCache.get.mockResolvedValue(lastSubmission);

            const form = { ...mockForm, cooldown_type: 'ip' };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', null);

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('wait');
            expect(result.remainingTime).toBeGreaterThan(0);
            expect(result.cooldownType).toBe('ip');
        });

        it('should allow submission when IP cool down has expired', async () => {
            const now = Date.now();
            const lastSubmission = (now - 3700000).toString(); // 61 minutes ago
            rateLimitCache.get.mockResolvedValue(lastSubmission);

            const form = { ...mockForm, cooldown_type: 'ip' };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', null);

            expect(result.allowed).toBe(true);
        });

        it('should block submission when user cool down is active', async () => {
            const now = Date.now();
            const lastSubmission = (now - 1800000).toString(); // 30 minutes ago
            rateLimitCache.get.mockResolvedValue(lastSubmission);

            const form = { ...mockForm, cooldown_type: 'user' };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', 'user-123');

            expect(result.allowed).toBe(false);
            expect(result.cooldownType).toBe('user');
            expect(rateLimitCache.get).toHaveBeenCalledWith('cooldown:user:1:user-123');
        });

        it('should allow anonymous submission when user-only cool down is configured', async () => {
            const form = { ...mockForm, cooldown_type: 'user' };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', null);

            expect(result.allowed).toBe(true);
        });

        it('should check both IP and user in hybrid mode', async () => {
            const now = Date.now();
            const recentSubmission = (now - 1800000).toString(); // 30 minutes ago
            rateLimitCache.get
                .mockResolvedValueOnce(null) // IP check passes
                .mockResolvedValueOnce(recentSubmission); // User check fails

            const form = { ...mockForm, cooldown_type: 'both' };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', 'user-123');

            expect(result.allowed).toBe(false);
            expect(result.cooldownType).toBe('user');
            expect(rateLimitCache.get).toHaveBeenCalledTimes(2);
        });

        it('should block if either check fails in hybrid mode', async () => {
            const now = Date.now();
            const recentSubmission = (now - 1800000).toString(); // 30 minutes ago
            rateLimitCache.get.mockResolvedValueOnce(recentSubmission); // IP check fails

            const form = { ...mockForm, cooldown_type: 'both' };
            const result = await SurveyCooldownService.checkCooldown(form, '192.168.1.1', 'user-123');

            expect(result.allowed).toBe(false);
            expect(result.cooldownType).toBe('ip');
            expect(rateLimitCache.get).toHaveBeenCalledTimes(1); // Stops after first failure
        });

        it('should fail open on cache error', async () => {
            rateLimitCache.get.mockRejectedValue(new Error('Cache connection failed'));

            const result = await SurveyCooldownService.checkCooldown(mockForm, '192.168.1.1', 'user-123');

            expect(result.allowed).toBe(true); // Fail open - allow submission
        });
    });

    describe('recordSubmission', () => {
        it('should not record when cool down is disabled', async () => {
            const form = { ...mockForm, cooldown_enabled: false };
            await SurveyCooldownService.recordSubmission(form, '192.168.1.1', 'user-123');

            expect(rateLimitCache.set).not.toHaveBeenCalled();
        });

        it('should record IP-only submission', async () => {
            const form = { ...mockForm, cooldown_type: 'ip' };
            await SurveyCooldownService.recordSubmission(form, '192.168.1.1', 'user-123');

            expect(rateLimitCache.set).toHaveBeenCalledTimes(1);
            expect(rateLimitCache.set).toHaveBeenCalledWith(
                'cooldown:ip:1:192.168.1.1',
                expect.any(String),
                3600
            );
        });

        it('should record user-only submission', async () => {
            const form = { ...mockForm, cooldown_type: 'user' };
            await SurveyCooldownService.recordSubmission(form, '192.168.1.1', 'user-123');

            expect(rateLimitCache.set).toHaveBeenCalledTimes(1);
            expect(rateLimitCache.set).toHaveBeenCalledWith(
                'cooldown:user:1:user-123',
                expect.any(String),
                3600
            );
        });

        it('should record both IP and user in hybrid mode', async () => {
            const form = { ...mockForm, cooldown_type: 'both' };
            await SurveyCooldownService.recordSubmission(form, '192.168.1.1', 'user-123');

            expect(rateLimitCache.set).toHaveBeenCalledTimes(2);
            expect(rateLimitCache.set).toHaveBeenCalledWith(
                'cooldown:ip:1:192.168.1.1',
                expect.any(String),
                3600
            );
            expect(rateLimitCache.set).toHaveBeenCalledWith(
                'cooldown:user:1:user-123',
                expect.any(String),
                3600
            );
        });

        it('should not fail on cache error', async () => {
            rateLimitCache.set.mockRejectedValue(new Error('Cache write failed'));

            await expect(
                SurveyCooldownService.recordSubmission(mockForm, '192.168.1.1', 'user-123')
            ).resolves.not.toThrow();
        });
    });

    describe('getRemainingTime', () => {
        it('should return remaining time when on cool down', async () => {
            const now = Date.now();
            const lastSubmission = (now - 1800000).toString(); // 30 minutes ago
            rateLimitCache.get.mockResolvedValue(lastSubmission);

            const form = { ...mockForm, cooldown_type: 'ip' };
            const result = await SurveyCooldownService.getRemainingTime(form, '192.168.1.1', null);

            expect(result.onCooldown).toBe(true);
            expect(result.remainingTime).toBeGreaterThan(0);
            expect(result.reason).toContain('wait');
        });

        it('should return no cool down when not active', async () => {
            rateLimitCache.get.mockResolvedValue(null);

            const result = await SurveyCooldownService.getRemainingTime(mockForm, '192.168.1.1', 'user-123');

            expect(result.onCooldown).toBe(false);
            expect(result.remainingTime).toBe(0);
            expect(result.reason).toBeNull();
        });
    });

    describe('clearCooldown', () => {
        it('should clear IP cool down', async () => {
            await SurveyCooldownService.clearCooldown(1, '192.168.1.1', null);

            expect(rateLimitCache.delete).toHaveBeenCalledTimes(1);
            expect(rateLimitCache.delete).toHaveBeenCalledWith('cooldown:ip:1:192.168.1.1');
        });

        it('should clear user cool down', async () => {
            await SurveyCooldownService.clearCooldown(1, null, 'user-123');

            expect(rateLimitCache.delete).toHaveBeenCalledTimes(1);
            expect(rateLimitCache.delete).toHaveBeenCalledWith('cooldown:user:1:user-123');
        });

        it('should clear both IP and user cool down', async () => {
            await SurveyCooldownService.clearCooldown(1, '192.168.1.1', 'user-123');

            expect(rateLimitCache.delete).toHaveBeenCalledTimes(2);
        });

        it('should throw on cache error', async () => {
            rateLimitCache.delete.mockRejectedValue(new Error('Cache delete failed'));

            await expect(
                SurveyCooldownService.clearCooldown(1, '192.168.1.1', null)
            ).rejects.toThrow('Cache delete failed');
        });
    });

    describe('_formatTime', () => {
        it('should format seconds', () => {
            const result = SurveyCooldownService._formatTime(30);
            expect(result).toBe('30 seconds');
        });

        it('should format minutes', () => {
            const result = SurveyCooldownService._formatTime(120);
            expect(result).toBe('2 minutes');
        });

        it('should format hours', () => {
            const result = SurveyCooldownService._formatTime(7200);
            expect(result).toBe('2 hours');
        });

        it('should format days', () => {
            const result = SurveyCooldownService._formatTime(172800);
            expect(result).toBe('2 days');
        });

        it('should use singular form for 1 unit', () => {
            expect(SurveyCooldownService._formatTime(1)).toBe('1 second');
            expect(SurveyCooldownService._formatTime(60)).toBe('1 minute');
            expect(SurveyCooldownService._formatTime(3600)).toBe('1 hour');
            expect(SurveyCooldownService._formatTime(86400)).toBe('1 day');
        });
    });
});
