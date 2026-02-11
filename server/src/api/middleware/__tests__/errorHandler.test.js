const { AppError, errorHandler } = require('../errorHandler');

// Mock logger
jest.mock('../../../infrastructure/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
}));

describe('AppError', () => {
  it('should create error with statusCode and code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe('errorHandler middleware', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('should format AppError correctly', () => {
    const err = new AppError('Resource not found', 404, 'NOT_FOUND');
    const req = { id: 'req-123', method: 'GET', originalUrl: '/api/test' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Resource not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        requestId: 'req-123',
      },
    });
  });

  it('should handle generic errors with 500 status', () => {
    const err = new Error('Something broke');
    const req = { id: 'req-456', method: 'POST', originalUrl: '/api/data' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          statusCode: 500,
          requestId: 'req-456',
        }),
      })
    );
  });

  it('should include details when present', () => {
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    err.details = [{ field: 'name', message: 'required' }];
    const req = { id: 'req-789', method: 'POST', originalUrl: '/api/test' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          details: [{ field: 'name', message: 'required' }],
        }),
      })
    );
  });

  it('should mask error message in production for 500 errors', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Secret database error');
    const req = { id: 'req-prod', method: 'GET', originalUrl: '/api/secret' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An internal error occurred.',
        }),
      })
    );

    process.env.NODE_ENV = origEnv;
  });
});
