const logger = require('../../infrastructure/logger');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const requestId = req.id || 'unknown';

  logger.error(`${err.message}`, {
    requestId,
    statusCode,
    code,
    method: req.method,
    url: req.originalUrl,
    stack: statusCode >= 500 ? err.stack : undefined,
  });

  const response = {
    error: {
      message: statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? 'An internal error occurred.'
        : err.message,
      code,
      statusCode,
      requestId,
    },
  };

  if (err.details) {
    response.error.details = err.details;
  }

  res.status(statusCode).json(response);
};

module.exports = { AppError, errorHandler };
