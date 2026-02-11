describe('logger', () => {
  let logger;

  beforeEach(() => {
    // Clear module cache to get fresh logger
    jest.resetModules();
    logger = require('../logger');
  });

  it('should export a winston logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.http).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have correct log levels', () => {
    expect(logger.levels).toEqual({
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4,
    });
  });

  it('should log without throwing', () => {
    expect(() => logger.info('test info message')).not.toThrow();
    expect(() => logger.warn('test warn message')).not.toThrow();
    expect(() => logger.error('test error message')).not.toThrow();
    expect(() => logger.http('test http message')).not.toThrow();
    expect(() => logger.debug('test debug message')).not.toThrow();
  });

  it('should log with metadata without throwing', () => {
    expect(() => logger.info('test', { requestId: '123', method: 'GET' })).not.toThrow();
  });
});
