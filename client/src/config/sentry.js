import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for React frontend
 * Provides error tracking, performance monitoring, and session replay
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development';
  const release = import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION;

  // Skip Sentry initialization if DSN is not configured (local dev)
  if (!dsn) {
    if (environment === 'production') {
      console.warn('Sentry DSN not configured in production environment');
    } else {
      console.log('Sentry disabled (no DSN configured)');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release,

      // Integration configs
      integrations: [
        // Browser tracing for performance monitoring
        Sentry.browserTracingIntegration(),

        // Replay integration for session replay
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: true,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

      // Session Replay
      replaysSessionSampleRate: environment === 'production' ? 0.1 : 0.5,
      replaysOnErrorSampleRate: 1.0,

      // Filtering
      ignoreErrors: [
        // Random plugins/extensions errors
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'atomicFindClose',
        // Facebook errors
        'fb_xd_fragment',
        // Network errors that are expected
        'NetworkError',
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        // Browser extension errors
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        // Canceled requests (user navigated away)
        'AbortError',
        'Request aborted',
        'canceled',
      ],

      beforeSend(event, hint) {
        // Filter out non-error promise rejections
        if (event.exception) {
          const value = event.exception.values?.[0]?.value;
          if (value && typeof value === 'string') {
            // Skip non-error rejections
            if (value.includes('Non-Error promise rejection')) {
              return null;
            }
          }
        }

        // Sanitize PII
        if (event.request) {
          delete event.request.cookies;
        }

        return event;
      },
    });

    console.log('Sentry initialized', { environment, release });
  } catch (error) {
    console.error('Failed to initialize Sentry', error);
  }
}

/**
 * Get Sentry's ErrorBoundary component
 * Use this to wrap your app for automatic error catching
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Capture an exception manually
 */
export function captureException(error, context = {}) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Capture a message manually
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
}

/**
 * Set user context for Sentry
 */
export function setUser(user) {
  if (import.meta.env.VITE_SENTRY_DSN && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      tenant_id: user.tenant_id,
    });
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

export default Sentry;
