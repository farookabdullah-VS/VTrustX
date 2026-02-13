# Jest Open Handles Fix

**Issue**: Jest was showing "Force exiting Jest" warning after tests completed, indicating open handles (database connections, cache instances) weren't being closed properly.

**Status**: ✅ **FIXED** - All tests now exit cleanly

---

## Problem

When running tests, Jest detected open handles that prevented graceful shutdown:

```
Test Suites: 18 passed, 18 total
Tests:       250 passed, 250 total
❌ Force exiting Jest: Have you considered using `--detectOpenHandles`
   to detect async operations that kept running after all tests finished?
```

### Root Causes

1. **Database Pool** - PostgreSQL connection pool remained open
2. **Cache Instances** - 5 cache instances (auth, tenant, session, ratelimit, loginattempt) not closed
3. **No Global Teardown** - Jest had no cleanup mechanism
4. **forceExit: true** - Config was masking the problem by forcing immediate exit

---

## Solution

Implemented proper global teardown to close all connections after tests complete.

### 1. Added closeAllCaches() Function

**File**: `server/src/infrastructure/cache.js`

```javascript
/**
 * Close all cache instances gracefully
 * Used for cleanup during shutdown or tests
 */
const closeAllCaches = async () => {
  await Promise.all([
    authCache.close(),
    tenantCache.close(),
    sessionCache.close(),
    rateLimitCache.close(),
    loginAttemptCache.close(),
  ]);
};

module.exports = {
  CacheService,
  authCache,
  tenantCache,
  sessionCache,
  rateLimitCache,
  loginAttemptCache,
  closeAllCaches,  // ✅ New export
};
```

### 2. Created Global Teardown

**File**: `server/src/test/teardown.js` (NEW)

```javascript
const { gracefulShutdown } = require('../infrastructure/database/db');
const { closeAllCaches } = require('../infrastructure/cache');
const logger = require('../infrastructure/logger');

/**
 * Global teardown for Jest tests
 * Closes all database and cache connections to prevent open handles
 */
module.exports = async () => {
  try {
    logger.info('Jest global teardown: Closing connections...');

    // Close cache connections
    await closeAllCaches();
    logger.debug('Cache connections closed');

    // Close database pool
    await gracefulShutdown();
    logger.debug('Database pool closed');

    logger.info('Jest global teardown: Complete');
  } catch (error) {
    logger.error('Error during Jest teardown', { error: error.message });
    // Don't throw - allow tests to finish even if cleanup fails
  }
};
```

**Key Features**:
- ✅ Closes all 5 cache instances
- ✅ Closes database connection pool
- ✅ Structured logging for debugging
- ✅ Error handling (doesn't throw on cleanup failure)
- ✅ Runs once after ALL tests complete

### 3. Updated Jest Configuration

**File**: `server/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['./src/test/setup.js'],
  globalTeardown: './src/test/teardown.js',  // ✅ Added
  testTimeout: 15000,
  // forceExit: true,  // ❌ Removed - no longer needed!
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/config/**',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
```

**Changes**:
- ✅ Added `globalTeardown: './src/test/teardown.js'`
- ✅ Removed `forceExit: true` (no longer masking the issue)

---

## Verification

### Test Output

**Before Fix**:
```
Test Suites: 18 passed, 18 total
Tests:       250 passed, 250 total
Time:        15.716 s
Ran all test suites.
❌ Force exiting Jest: Have you considered using `--detectOpenHandles`...
```

**After Fix**:
```
Test Suites: 18 passed, 18 total
Tests:       250 passed, 250 total
Time:        16.234 s
2026-02-13 14:44:30 [info]: Jest global teardown: Closing connections...
2026-02-13 14:44:30 [debug]: Cache connections closed
2026-02-13 14:44:30 [debug]: Database pool closed
2026-02-13 14:44:30 [info]: Jest global teardown: Complete
Ran all test suites.
✅ (Clean exit - no warnings!)
```

### Manual Testing

```bash
# Run tests
npm test

# Expected output:
# - All 250 tests pass
# - Teardown logs show clean shutdown
# - NO "Force exiting Jest" warning
# - Process exits immediately after tests
```

### Detect Open Handles (Should Find None)

```bash
npm test -- --detectOpenHandles

# If properly fixed, should not detect any open handles
# If there are issues, will show detailed list of open handles
```

---

## Technical Details

### Execution Order

1. **Setup** (once, before all tests):
   - `src/test/setup.js` runs
   - Sets test environment variables

2. **Tests Run** (all 250 tests):
   - Database connections made
   - Cache instances used
   - Tests complete

3. **Teardown** (once, after all tests):
   - `src/test/teardown.js` runs
   - Closes all cache instances
   - Closes database pool
   - Jest exits cleanly

### Why This Works

**Database Pool (`pg.Pool`)**:
- Maintains persistent connections
- Must call `pool.end()` to close
- Our `gracefulShutdown()` does this

**Cache Instances**:
- Redis (production) or in-memory (test)
- Each has `close()` method
- Our `closeAllCaches()` closes all 5 instances

**Global Teardown**:
- Runs AFTER all tests complete
- Only runs ONCE per test run
- Async function - waits for cleanup to finish

---

## Benefits

### 1. Clean Shutdown ✅
- No more forced exits
- All resources properly released
- Jest exits naturally

### 2. Better Error Detection ✅
- Real hanging tests will now be caught
- Open handles will be immediately visible
- Easier debugging of async issues

### 3. Production Alignment ✅
- Same shutdown pattern as production
- Uses existing `gracefulShutdown()` and `close()` methods
- Consistent behavior across environments

### 4. Faster CI/CD ✅
- No forced exit delay
- Cleaner test output
- More reliable test runs

### 5. Resource Management ✅
- Prevents memory leaks
- Proper connection cleanup
- OS resources released immediately

---

## Edge Cases Handled

### 1. Teardown Errors

```javascript
try {
  // ... cleanup code
} catch (error) {
  logger.error('Error during Jest teardown', { error: error.message });
  // Don't throw - allow tests to finish even if cleanup fails
}
```

**Why**: If cleanup fails (e.g., database already closed), don't fail the entire test run.

### 2. Multiple Cache Types

```javascript
await Promise.all([
  authCache.close(),
  tenantCache.close(),
  sessionCache.close(),
  rateLimitCache.close(),
  loginAttemptCache.close(),
]);
```

**Why**: Close all caches in parallel for faster shutdown.

### 3. Database Already Closed

```javascript
await gracefulShutdown();  // Idempotent - safe to call multiple times
```

**Why**: `pool.end()` is idempotent and won't error if already closed.

---

## Common Issues & Solutions

### Issue: Teardown Not Running

**Symptom**: Still see "Force exiting Jest" warning

**Solution**:
```bash
# Check jest.config.js has globalTeardown
grep globalTeardown jest.config.js

# Should output:
# globalTeardown: './src/test/teardown.js',
```

### Issue: Teardown Errors

**Symptom**: Tests fail at the end

**Solution**:
```bash
# Check logs for teardown errors
npm test 2>&1 | grep "teardown"

# Should see:
# [info]: Jest global teardown: Closing connections...
# [info]: Jest global teardown: Complete
```

### Issue: Some Tests Leave Handles Open

**Symptom**: Specific tests cause open handles

**Solution**:
```bash
# Run with handle detection to find culprit
npm test -- --detectOpenHandles

# Add afterAll to problematic tests:
afterAll(async () => {
  // Close test-specific resources
  await testServer.close();
  await testCache.clear();
});
```

---

## Related Patterns

### Production Shutdown

Same pattern used in production for graceful shutdown:

```javascript
// server/src/infrastructure/cache.js
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing cache connections');
  await closeAllCaches();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing cache connections');
  await closeAllCaches();
  process.exit(0);
});
```

### Server Shutdown

```javascript
// server/index.js (production)
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  await gracefulShutdown();  // Close database
  await closeAllCaches();     // Close caches
  process.exit(0);
});
```

---

## Best Practices

### 1. Always Use Global Teardown

```javascript
// jest.config.js
module.exports = {
  globalTeardown: './src/test/teardown.js',  // ✅ Good
  forceExit: false,  // ✅ Good (or omit - false is default)
};
```

### 2. Close Resources in Order

```javascript
// 1. Application-level (caches)
await closeAllCaches();

// 2. Database-level (pools)
await gracefulShutdown();

// 3. External services (if any)
await externalService.disconnect();
```

### 3. Don't Throw in Teardown

```javascript
try {
  await cleanup();
} catch (error) {
  logger.error('Cleanup failed', { error });
  // ✅ Don't throw - allow tests to complete
}
```

### 4. Use Structured Logging

```javascript
logger.info('Jest global teardown: Closing connections...');
await closeAllCaches();
logger.debug('Cache connections closed');  // ✅ Debug level for details
```

---

## Performance Impact

**Before**: ~15.7s + forced exit delay (~1-2s)
**After**: ~16.2s (clean shutdown)

**Net Change**: ~0.5s slower (proper cleanup time)
**Benefit**: Clean exit, no warnings, better error detection

---

## References

- [Jest Global Setup/Teardown](https://jestjs.io/docs/configuration#globalteardown-string)
- [Node.js pg Pool.end()](https://node-postgres.com/apis/pool#poolend)
- [Graceful Shutdown Patterns](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/#handling-kernel-signals)

---

## Changelog

**2026-02-13**:
- ✅ Added `closeAllCaches()` to cache.js
- ✅ Created `src/test/teardown.js`
- ✅ Updated jest.config.js (added globalTeardown, removed forceExit)
- ✅ Verified all 250 tests pass with clean shutdown
- ✅ No more "Force exiting Jest" warning

---

**Status**: ✅ Complete - All tests exit cleanly
**Impact**: Low (0.5s slower) - High benefit (proper cleanup)
**Version**: 1.0.0
