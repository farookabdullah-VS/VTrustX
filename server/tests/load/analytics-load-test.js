/**
 * Load Testing for Analytics API
 *
 * Tests API performance under various load conditions using autocannon.
 * Run with: node server/tests/load/analytics-load-test.js
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-test-token-here';
const RESULTS_DIR = path.join(__dirname, 'results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Test scenarios with performance targets
 */
const scenarios = [
  {
    name: 'Get Reports List',
    method: 'GET',
    url: `${BASE_URL}/api/reports`,
    target: {
      duration: 30, // seconds
      connections: 50,
      pipelining: 1,
      expectedLatency: 500, // ms (p95)
      expectedRPS: 100 // requests per second
    }
  },
  {
    name: 'Query Survey Data (100 records)',
    method: 'POST',
    url: `${BASE_URL}/api/analytics/query-data`,
    body: JSON.stringify({
      surveyId: 'test-survey-id',
      page: 1,
      pageSize: 100
    }),
    target: {
      duration: 30,
      connections: 30,
      pipelining: 1,
      expectedLatency: 1000, // ms (p95)
      expectedRPS: 50
    }
  },
  {
    name: 'Get Report Templates',
    method: 'GET',
    url: `${BASE_URL}/api/report-templates`,
    target: {
      duration: 20,
      connections: 50,
      pipelining: 1,
      expectedLatency: 300, // ms (p95)
      expectedRPS: 150
    }
  },
  {
    name: 'Get Delivery Analytics Overview',
    method: 'GET',
    url: `${BASE_URL}/api/analytics/delivery/overview`,
    target: {
      duration: 30,
      connections: 20,
      pipelining: 1,
      expectedLatency: 1500, // ms (p95) - more complex query
      expectedRPS: 30
    }
  },
  {
    name: 'Get Cohort Analysis',
    method: 'POST',
    url: `${BASE_URL}/api/analytics/cohort/analyze`,
    body: JSON.stringify({
      surveyId: 'test-survey-id',
      cohortBy: 'month',
      metric: 'nps'
    }),
    target: {
      duration: 30,
      connections: 10,
      pipelining: 1,
      expectedLatency: 2000, // ms (p95) - complex aggregation
      expectedRPS: 10
    }
  },
  {
    name: 'Generate Forecast',
    method: 'POST',
    url: `${BASE_URL}/api/analytics/forecast/trend`,
    body: JSON.stringify({
      surveyId: 'test-survey-id',
      metric: 'nps',
      periods: 7,
      interval: 'day'
    }),
    target: {
      duration: 30,
      connections: 5,
      pipelining: 1,
      expectedLatency: 3000, // ms (p95) - mathematical computation
      expectedRPS: 5
    }
  }
];

/**
 * Run a single load test scenario
 */
async function runScenario(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Running: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const options = {
    url: scenario.url,
    method: scenario.method,
    duration: scenario.target.duration,
    connections: scenario.target.connections,
    pipelining: scenario.target.pipelining,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `access_token=${AUTH_TOKEN}`
    }
  };

  if (scenario.body) {
    options.body = scenario.body;
  }

  return new Promise((resolve, reject) => {
    const instance = autocannon(options, (err, result) => {
      if (err) {
        console.error(`❌ Error running ${scenario.name}:`, err);
        reject(err);
        return;
      }

      // Analyze results
      const analysis = analyzeResults(result, scenario.target);

      // Print results
      printResults(scenario.name, result, analysis);

      // Save results to file
      saveResults(scenario.name, result, analysis);

      resolve({ scenario: scenario.name, result, analysis });
    });

    // Track progress
    autocannon.track(instance, { renderProgressBar: true });
  });
}

/**
 * Analyze test results against targets
 */
function analyzeResults(result, target) {
  const p95Latency = result.latency.p97_5; // Using p97.5 as proxy for p95
  const actualRPS = result.requests.average;
  const errorRate = (result.errors / result.requests.total) * 100;

  const analysis = {
    passed: true,
    issues: [],
    metrics: {
      latency: {
        expected: target.expectedLatency,
        actual: Math.round(p95Latency),
        passed: p95Latency <= target.expectedLatency,
        deviation: ((p95Latency - target.expectedLatency) / target.expectedLatency * 100).toFixed(2)
      },
      rps: {
        expected: target.expectedRPS,
        actual: Math.round(actualRPS),
        passed: actualRPS >= target.expectedRPS * 0.8, // Allow 20% variance
        deviation: ((actualRPS - target.expectedRPS) / target.expectedRPS * 100).toFixed(2)
      },
      errorRate: {
        threshold: 1, // 1% error threshold
        actual: errorRate.toFixed(2),
        passed: errorRate < 1
      }
    }
  };

  // Check for issues
  if (!analysis.metrics.latency.passed) {
    analysis.passed = false;
    analysis.issues.push(`High latency: ${analysis.metrics.latency.actual}ms (target: ${target.expectedLatency}ms)`);
  }

  if (!analysis.metrics.rps.passed) {
    analysis.passed = false;
    analysis.issues.push(`Low throughput: ${analysis.metrics.rps.actual} RPS (target: ${target.expectedRPS} RPS)`);
  }

  if (!analysis.metrics.errorRate.passed) {
    analysis.passed = false;
    analysis.issues.push(`High error rate: ${analysis.metrics.errorRate.actual}% (threshold: 1%)`);
  }

  return analysis;
}

/**
 * Print results to console
 */
function printResults(name, result, analysis) {
  console.log(`\n📊 Results for: ${name}`);
  console.log('─'.repeat(80));

  // Latency
  console.log(`\n⚡ Latency:`);
  console.log(`   Mean:    ${result.latency.mean.toFixed(2)} ms`);
  console.log(`   P50:     ${result.latency.p50.toFixed(2)} ms`);
  console.log(`   P75:     ${result.latency.p75.toFixed(2)} ms`);
  console.log(`   P95:     ${result.latency.p97_5.toFixed(2)} ms`);
  console.log(`   P99:     ${result.latency.p99.toFixed(2)} ms`);
  console.log(`   Max:     ${result.latency.max.toFixed(2)} ms`);
  console.log(`   Target:  ${analysis.metrics.latency.expected} ms (p95)`);
  console.log(`   Status:  ${analysis.metrics.latency.passed ? '✅ PASS' : '❌ FAIL'} (${analysis.metrics.latency.deviation}% deviation)`);

  // Throughput
  console.log(`\n🔄 Throughput:`);
  console.log(`   Total:   ${result.requests.total} requests`);
  console.log(`   Average: ${result.requests.average.toFixed(2)} req/sec`);
  console.log(`   Target:  ${analysis.metrics.rps.expected} req/sec`);
  console.log(`   Status:  ${analysis.metrics.rps.passed ? '✅ PASS' : '❌ FAIL'} (${analysis.metrics.rps.deviation}% deviation)`);

  // Errors
  console.log(`\n❗ Errors:`);
  console.log(`   Total:   ${result.errors}`);
  console.log(`   Rate:    ${analysis.metrics.errorRate.actual}%`);
  console.log(`   Status:  ${analysis.metrics.errorRate.passed ? '✅ PASS' : '❌ FAIL'}`);

  // Timeouts
  console.log(`\n⏱️  Timeouts: ${result.timeouts}`);

  // Data Transfer
  console.log(`\n📦 Data Transfer:`);
  console.log(`   Total:   ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Average: ${(result.throughput.average / 1024).toFixed(2)} KB/sec`);

  // Overall Status
  console.log(`\n🎯 Overall Status: ${analysis.passed ? '✅ PASS' : '❌ FAIL'}`);

  if (analysis.issues.length > 0) {
    console.log(`\n⚠️  Issues:`);
    analysis.issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Save results to JSON file
 */
function saveResults(name, result, analysis) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name.toLowerCase().replace(/\s+/g, '-')}_${timestamp}.json`;
  const filepath = path.join(RESULTS_DIR, filename);

  const data = {
    scenario: name,
    timestamp: new Date().toISOString(),
    result,
    analysis
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Results saved to: ${filepath}`);
}

/**
 * Generate summary report
 */
function generateSummary(results) {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📋 LOAD TEST SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);

  const totalTests = results.length;
  const passedTests = results.filter(r => r.analysis.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests:  ${totalTests}`);
  console.log(`Passed:       ${passedTests} ✅`);
  console.log(`Failed:       ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`);

  console.log(`${'─'.repeat(80)}`);
  console.log(`Test Results:`);
  console.log(`${'─'.repeat(80)}\n`);

  results.forEach((test, index) => {
    const status = test.analysis.passed ? '✅' : '❌';
    const latency = test.analysis.metrics.latency.actual;
    const rps = test.analysis.metrics.rps.actual;
    const errors = test.analysis.metrics.errorRate.actual;

    console.log(`${index + 1}. ${test.scenario}`);
    console.log(`   Status: ${status}`);
    console.log(`   Latency (p95): ${latency}ms`);
    console.log(`   Throughput: ${rps} req/sec`);
    console.log(`   Error Rate: ${errors}%`);

    if (test.analysis.issues.length > 0) {
      console.log(`   Issues:`);
      test.analysis.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
    console.log('');
  });

  // Save summary
  const summaryPath = path.join(RESULTS_DIR, `summary_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100,
    results: results.map(r => ({
      scenario: r.scenario,
      passed: r.analysis.passed,
      latency: r.analysis.metrics.latency,
      rps: r.analysis.metrics.rps,
      errors: r.analysis.metrics.errorRate,
      issues: r.analysis.issues
    }))
  }, null, 2));

  console.log(`${'='.repeat(80)}`);
  console.log(`\n💾 Summary saved to: ${summaryPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔥 Analytics API Load Testing`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Scenarios: ${scenarios.length}`);
  console.log(`Results Directory: ${RESULTS_DIR}\n`);

  if (AUTH_TOKEN === 'your-test-token-here') {
    console.warn('⚠️  Warning: Using placeholder auth token. Set TEST_AUTH_TOKEN environment variable.\n');
  }

  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await runScenario(scenario);
      results.push(result);

      // Wait 5 seconds between tests to avoid overwhelming the server
      if (scenarios.indexOf(scenario) < scenarios.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`\n❌ Failed to run scenario: ${scenario.name}`, error);
    }
  }

  // Generate summary
  generateSummary(results);
}

// Run tests if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Load test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runScenario, scenarios };
