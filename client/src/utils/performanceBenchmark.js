/**
 * Performance Benchmarking Utility for Analytics Studio
 *
 * Measures and reports key performance metrics including:
 * - Component render times
 * - API response times
 * - Memory usage
 * - Bundle size impact
 * - User interaction latency
 */

class PerformanceBenchmark {
  constructor(options = {}) {
    this.metrics = [];
    this.marks = new Map();
    this.measures = new Map();
    this.options = {
      enableLogging: options.enableLogging !== false,
      enableReporting: options.enableReporting !== false,
      reportToConsole: options.reportToConsole !== false,
      reportToServer: options.reportToServer || false,
      serverEndpoint: options.serverEndpoint || '/api/analytics/performance'
    };

    // Check if Performance API is available
    this.isSupported = typeof window !== 'undefined' &&
                       window.performance &&
                       window.performance.mark &&
                       window.performance.measure;

    if (!this.isSupported && this.options.enableLogging) {
      console.warn('Performance API not supported in this browser');
    }
  }

  /**
   * Start a performance measurement
   */
  start(label) {
    if (!this.isSupported) return;

    const markName = `${label}-start`;
    this.marks.set(label, Date.now());

    try {
      performance.mark(markName);
    } catch (error) {
      console.warn(`Failed to create performance mark: ${markName}`, error);
    }
  }

  /**
   * End a performance measurement and record the duration
   */
  end(label, metadata = {}) {
    if (!this.isSupported) return null;

    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark found for: ${label}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const markNameStart = `${label}-start`;
    const markNameEnd = `${label}-end`;
    const measureName = label;

    try {
      performance.mark(markNameEnd);
      performance.measure(measureName, markNameStart, markNameEnd);

      const measure = performance.getEntriesByName(measureName)[0];

      const metric = {
        label,
        duration: measure ? measure.duration : duration,
        timestamp: endTime,
        metadata
      };

      this.metrics.push(metric);
      this.measures.set(label, metric);

      if (this.options.enableLogging) {
        console.log(`⚡ ${label}: ${metric.duration.toFixed(2)}ms`, metadata);
      }

      // Clean up marks
      performance.clearMarks(markNameStart);
      performance.clearMarks(markNameEnd);
      performance.clearMeasures(measureName);
      this.marks.delete(label);

      return metric;
    } catch (error) {
      console.warn(`Failed to measure performance: ${label}`, error);
      return { label, duration, timestamp: endTime, metadata };
    }
  }

  /**
   * Measure a function's execution time
   */
  async measure(label, fn, metadata = {}) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label, metadata);
      return result;
    } catch (error) {
      this.end(label, { ...metadata, error: error.message });
      throw error;
    }
  }

  /**
   * Measure component render time
   */
  measureRender(componentName, renderFn) {
    const label = `render:${componentName}`;
    return this.measure(label, renderFn, { type: 'render', component: componentName });
  }

  /**
   * Measure API call time
   */
  async measureAPI(endpoint, apiFn, metadata = {}) {
    const label = `api:${endpoint}`;
    return this.measure(label, apiFn, { type: 'api', endpoint, ...metadata });
  }

  /**
   * Measure data processing time
   */
  async measureDataProcessing(operationName, processFn, metadata = {}) {
    const label = `data:${operationName}`;
    return this.measure(label, processFn, { type: 'data-processing', operation: operationName, ...metadata });
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usedPercent: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(2)
      };
    }
    return null;
  }

  /**
   * Get navigation timing metrics
   */
  getNavigationTiming() {
    if (!performance.timing) return null;

    const timing = performance.timing;
    return {
      // DNS lookup
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP connection
      tcp: timing.connectEnd - timing.connectStart,
      // Request time
      request: timing.responseStart - timing.requestStart,
      // Response time
      response: timing.responseEnd - timing.responseStart,
      // DOM processing
      domProcessing: timing.domComplete - timing.domLoading,
      // Total load time
      totalLoad: timing.loadEventEnd - timing.navigationStart,
      // DOM ready
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      // Interactive
      interactive: timing.domInteractive - timing.navigationStart
    };
  }

  /**
   * Get resource timing for specific resources
   */
  getResourceTiming(resourcePattern) {
    const resources = performance.getEntriesByType('resource');
    return resources
      .filter(resource => {
        if (resourcePattern instanceof RegExp) {
          return resourcePattern.test(resource.name);
        }
        return resource.name.includes(resourcePattern);
      })
      .map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize,
        type: resource.initiatorType,
        startTime: resource.startTime
      }));
  }

  /**
   * Get all recorded metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type) {
    return this.metrics.filter(m => m.metadata && m.metadata.type === type);
  }

  /**
   * Get average duration for a metric label
   */
  getAverageDuration(label) {
    const matchingMetrics = this.metrics.filter(m => m.label === label);
    if (matchingMetrics.length === 0) return 0;

    const totalDuration = matchingMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / matchingMetrics.length;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMeasurements: this.metrics.length,
        memoryUsage: this.getMemoryUsage(),
        navigationTiming: this.getNavigationTiming()
      },
      metrics: {
        render: this.getMetricsByType('render'),
        api: this.getMetricsByType('api'),
        dataProcessing: this.getMetricsByType('data-processing')
      },
      slowest: this.getSlowestMetrics(10),
      fastest: this.getFastestMetrics(10),
      averages: this.calculateAverages()
    };

    if (this.options.reportToConsole) {
      console.table(report.slowest);
      console.log('Performance Report:', report);
    }

    if (this.options.reportToServer) {
      this.sendReportToServer(report);
    }

    return report;
  }

  /**
   * Get slowest metrics
   */
  getSlowestMetrics(count = 10) {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map(m => ({
        label: m.label,
        duration: `${m.duration.toFixed(2)}ms`,
        type: m.metadata?.type || 'unknown'
      }));
  }

  /**
   * Get fastest metrics
   */
  getFastestMetrics(count = 10) {
    return [...this.metrics]
      .sort((a, b) => a.duration - b.duration)
      .slice(0, count)
      .map(m => ({
        label: m.label,
        duration: `${m.duration.toFixed(2)}ms`,
        type: m.metadata?.type || 'unknown'
      }));
  }

  /**
   * Calculate averages by type
   */
  calculateAverages() {
    const types = ['render', 'api', 'data-processing'];
    const averages = {};

    types.forEach(type => {
      const metrics = this.getMetricsByType(type);
      if (metrics.length > 0) {
        const total = metrics.reduce((sum, m) => sum + m.duration, 0);
        averages[type] = {
          average: (total / metrics.length).toFixed(2),
          count: metrics.length,
          total: total.toFixed(2)
        };
      }
    });

    return averages;
  }

  /**
   * Send report to server for tracking
   */
  async sendReportToServer(report) {
    try {
      await fetch(this.options.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.warn('Failed to send performance report to server:', error);
    }
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.marks.clear();
    this.measures.clear();

    if (this.isSupported) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Export metrics as JSON
   */
  exportJSON() {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * Export metrics as CSV
   */
  exportCSV() {
    const headers = ['Label', 'Duration (ms)', 'Type', 'Timestamp'];
    const rows = this.metrics.map(m => [
      m.label,
      m.duration.toFixed(2),
      m.metadata?.type || 'unknown',
      new Date(m.timestamp).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}

/**
 * React Hook for performance tracking
 */
export function usePerformance(componentName) {
  const [benchmark] = React.useState(() => new PerformanceBenchmark({
    enableLogging: process.env.NODE_ENV === 'development'
  }));

  React.useEffect(() => {
    benchmark.start(`mount:${componentName}`);

    return () => {
      benchmark.end(`mount:${componentName}`);
    };
  }, [componentName, benchmark]);

  const measureAction = React.useCallback(async (actionName, fn) => {
    return benchmark.measure(`${componentName}:${actionName}`, fn);
  }, [componentName, benchmark]);

  return {
    measureAction,
    getReport: () => benchmark.generateReport(),
    clear: () => benchmark.clear()
  };
}

/**
 * HOC for automatic component performance tracking
 */
export function withPerformanceTracking(Component, componentName) {
  return function PerformanceTrackedComponent(props) {
    const benchmark = new PerformanceBenchmark({
      enableLogging: process.env.NODE_ENV === 'development'
    });

    React.useEffect(() => {
      benchmark.start(`render:${componentName}`);

      return () => {
        benchmark.end(`render:${componentName}`);
      };
    });

    return React.createElement(Component, props);
  };
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceBenchmark({
  enableLogging: process.env.NODE_ENV === 'development',
  enableReporting: true,
  reportToConsole: true,
  reportToServer: process.env.REACT_APP_ENABLE_PERFORMANCE_REPORTING === 'true'
});

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}

export default PerformanceBenchmark;
