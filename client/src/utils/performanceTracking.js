/**
 * Frontend Performance Tracking
 * Monitors page load times, API calls, and user interactions
 */

class PerformanceTracker {
    constructor() {
        this.metrics = [];
        this.enabled = import.meta.env.VITE_PERFORMANCE_TRACKING === 'true';
        this.apiUrl = import.meta.env.VITE_API_URL || '';

        // Start tracking page load performance
        if (this.enabled && typeof window !== 'undefined') {
            this.trackPageLoad();
            this.setupApiInterceptor();
        }
    }

    /**
     * Track page load performance
     */
    trackPageLoad() {
        if (!window.performance || !window.performance.timing) {
            return;
        }

        window.addEventListener('load', () => {
            // Wait for all metrics to be available
            setTimeout(() => {
                const timing = window.performance.timing;
                const navigation = window.performance.navigation;

                const metrics = {
                    // Network timings
                    dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
                    tcpConnection: timing.connectEnd - timing.connectStart,
                    serverResponse: timing.responseStart - timing.requestStart,
                    pageDownload: timing.responseEnd - timing.responseStart,

                    // Rendering timings
                    domProcessing: timing.domComplete - timing.domLoading,
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    pageLoad: timing.loadEventEnd - timing.navigationStart,

                    // First paint metrics (if available)
                    firstPaint: this.getFirstPaint(),
                    firstContentfulPaint: this.getFirstContentfulPaint(),
                    largestContentfulPaint: null, // Will be set by observer

                    // Page info
                    url: window.location.pathname,
                    navigationType: navigation.type, // 0: navigate, 1: reload, 2: back/forward
                    timestamp: new Date().toISOString()
                };

                // Track LCP (Largest Contentful Paint)
                this.observeLargestContentfulPaint((lcp) => {
                    metrics.largestContentfulPaint = lcp;
                    this.sendMetrics('page_load', metrics);
                });

                console.log('[Performance] Page load metrics:', metrics);
            }, 100);
        });
    }

    /**
     * Get First Paint time
     */
    getFirstPaint() {
        if (window.performance && window.performance.getEntriesByType) {
            const paintEntries = window.performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            return firstPaint ? Math.round(firstPaint.startTime) : null;
        }
        return null;
    }

    /**
     * Get First Contentful Paint time
     */
    getFirstContentfulPaint() {
        if (window.performance && window.performance.getEntriesByType) {
            const paintEntries = window.performance.getEntriesByType('paint');
            const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            return fcp ? Math.round(fcp.startTime) : null;
        }
        return null;
    }

    /**
     * Observe Largest Contentful Paint
     */
    observeLargestContentfulPaint(callback) {
        if (!window.PerformanceObserver) {
            return;
        }

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                callback(Math.round(lastEntry.startTime));
            });

            observer.observe({ entryTypes: ['largest-contentful-paint'] });

            // Stop observing after 10 seconds
            setTimeout(() => observer.disconnect(), 10000);
        } catch (error) {
            console.warn('[Performance] LCP observer not supported', error);
        }
    }

    /**
     * Setup API call interceptor
     */
    setupApiInterceptor() {
        if (typeof window === 'undefined' || !window.fetch) {
            return;
        }

        // Store original fetch
        const originalFetch = window.fetch;

        // Override fetch
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;

            try {
                const response = await originalFetch(...args);
                const duration = Date.now() - startTime;

                // Track API call
                this.trackApiCall(url, response.status, duration, response.ok);

                return response;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.trackApiCall(url, 0, duration, false);
                throw error;
            }
        };
    }

    /**
     * Track API call performance
     */
    trackApiCall(url, statusCode, duration, success) {
        if (!this.enabled) return;

        // Extract endpoint (remove query params and base URL)
        const endpoint = url.replace(this.apiUrl, '').split('?')[0];

        // Only track API calls (not external resources)
        if (!endpoint.startsWith('/api')) {
            return;
        }

        const metric = {
            type: 'api_call',
            endpoint,
            statusCode,
            duration,
            success,
            timestamp: new Date().toISOString()
        };

        this.metrics.push(metric);

        // Log slow API calls
        if (duration > 3000) {
            console.warn(`[Performance] Slow API call: ${endpoint} (${duration}ms)`);
        }

        // Send to backend (debounced)
        this.debouncedSendMetrics('api_call', metric);
    }

    /**
     * Track custom user interaction
     */
    trackInteraction(action, category, label, value) {
        if (!this.enabled) return;

        const metric = {
            type: 'user_interaction',
            action,
            category,
            label,
            value,
            timestamp: new Date().toISOString()
        };

        this.metrics.push(metric);
        this.debouncedSendMetrics('user_interaction', metric);
    }

    /**
     * Track React component render time
     */
    trackComponentRender(componentName, renderTime) {
        if (!this.enabled) return;

        const metric = {
            type: 'component_render',
            component: componentName,
            renderTime,
            timestamp: new Date().toISOString()
        };

        this.metrics.push(metric);

        // Log slow renders
        if (renderTime > 100) {
            console.warn(`[Performance] Slow render: ${componentName} (${renderTime}ms)`);
        }
    }

    /**
     * Send metrics to backend (with debouncing)
     */
    debouncedSendMetrics = this.debounce((type, data) => {
        this.sendMetrics(type, data);
    }, 2000);

    /**
     * Send metrics to backend
     */
    async sendMetrics(type, data) {
        if (!this.enabled) return;

        try {
            await fetch(`${this.apiUrl}/api/performance/client-metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    type,
                    data,
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    connection: this.getConnectionInfo()
                })
            });
        } catch (error) {
            // Silently fail - don't disrupt user experience
            console.debug('[Performance] Failed to send metrics', error);
        }
    }

    /**
     * Get network connection info
     */
    getConnectionInfo() {
        if (!navigator.connection && !navigator.mozConnection && !navigator.webkitConnection) {
            return null;
        }

        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        return {
            effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
            downlink: connection.downlink, // Mbps
            rtt: connection.rtt, // Round-trip time in ms
            saveData: connection.saveData // Data saver enabled
        };
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return this.metrics;
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics = [];
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Singleton instance
const performanceTracker = new PerformanceTracker();

// Export for use in React components
export default performanceTracker;

// Export hook for React components
export function usePerformanceTracking() {
    return {
        trackInteraction: (action, category, label, value) => {
            performanceTracker.trackInteraction(action, category, label, value);
        },
        trackComponentRender: (componentName, renderTime) => {
            performanceTracker.trackComponentRender(componentName, renderTime);
        },
        getMetrics: () => performanceTracker.getMetrics(),
        clearMetrics: () => performanceTracker.clearMetrics()
    };
}
