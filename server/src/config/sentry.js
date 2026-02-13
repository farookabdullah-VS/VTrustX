const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const logger = require('../infrastructure/logger');

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Must be called as early as possible in the application lifecycle
 */
function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || process.env.npm_package_version;

  // Skip Sentry initialization if DSN is not configured (local dev)
  if (!dsn) {
    if (environment === 'production') {
      logger.warn('Sentry DSN not configured in production environment');
    } else {
      logger.info('Sentry disabled (no DSN configured)');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release,

      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

      // Profiling
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

      integrations: [
        // Profiling integration
        nodeProfilingIntegration(),
      ],

      // Filtering
      ignoreErrors: [
        // Browser errors
        'Non-Error promise rejection captured',
        'Non-Error exception captured',
        // Network errors that are expected
        'NetworkError',
        'Network request failed',
        // Rate limiting
        'Too many requests',
        // CSRF errors (handled by middleware)
        'CSRF',
        'ForbiddenError',
      ],

      beforeSend(event, hint) {
        // Don't send errors in test environment
        if (process.env.NODE_ENV === 'test') {
          return null;
        }

        // Filter out sensitive data from error context
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.cookie;
            delete event.request.headers.authorization;
          }
        }

        return event;
      },
    });

    // Add Express integration if app is provided
    if (app) {
      // Request handler must be the first middleware
      app.use(Sentry.Handlers.requestHandler());

      // Tracing handler (optional, for performance monitoring)
      app.use(Sentry.Handlers.tracingHandler());

      logger.info('Sentry initialized', { environment, release });
    }
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error: error.message });
  }
}

/**
 * Get Sentry error handler middleware
 * Must be added after all routes but before global error handler
 */
function getSentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status >= 500
      return !error.statusCode || error.statusCode >= 500;
    },
  });
}

/**
 * Capture an exception manually
 */
function captureException(error, context = {}) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Capture a message manually
 */
function captureMessage(message, level = 'info', context = {}) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
}

module.exports = {
  initSentry,
  getSentryErrorHandler,
  captureException,
  captureMessage,
  Sentry,
};
