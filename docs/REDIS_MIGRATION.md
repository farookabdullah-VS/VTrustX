# Redis Migration Guide

This document explains the Redis cache migration from in-memory NodeCache to Redis.

## Overview

The application now supports **both Redis and in-memory caching** with automatic fallback:

- **Redis** (recommended for production): Shared cache across multiple instances, required for horizontal scaling
- **In-memory** (fallback): Works without Redis, suitable for single-instance development

## Why Redis?

### Problems with In-Memory Cache (NodeCache)

1. **No horizontal scaling**: Cache data is lost when instances restart
2. **No shared state**: Each Cloud Run instance has its own cache, causing inconsistencies
3. **Rate limiting fails**: In-memory rate limits only work within a single instance
4. **Session issues**: User sessions don't work across multiple instances

### Benefits of Redis

1. **Horizontal scaling**: Multiple Cloud Run instances share the same cache
2. **Persistent sessions**: User sessions work across all instances
3. **Accurate rate limiting**: Rate limits are enforced globally across all instances
4. **Better performance**: Redis is optimized for cache operations
5. **Production-ready**: Battle-tested for high-traffic applications

## Architecture

### Cache Namespaces

Each cache instance has a key prefix for isolation:

| Cache Instance | Prefix | TTL | Max Keys | Purpose |
|----------------|--------|-----|----------|---------|
| `authCache` | `auth:` | 60s | 2000 | User authentication data + permissions |
| `tenantCache` | `tenant:` | 300s | 500 | Tenant configuration and settings |
| `sessionCache` | `session:` | 1800s | 1000 | User sessions (currently unused) |
| `rateLimitCache` | `ratelimit:` | 60s | 10000 | API rate limiting counters |
| `loginAttemptCache` | `loginattempt:` | 900s | 10000 | Failed login tracking (account lockout) |

### Fallback Strategy

The `CacheService` automatically handles Redis failures:

1. **Initialization**: Try to connect to Redis if `REDIS_URL` is set
2. **Operations**: Use Redis if available, fall back to in-memory cache on error
3. **Dual-write**: Some operations write to both Redis and in-memory for faster local reads
4. **Logging**: All failures are logged with context for monitoring

## Setup

### Local Development (with Docker)

1. **Start Redis with Docker Compose:**

   ```bash
   docker-compose up -d redis
   ```

2. **Configure environment:**

   Add to `server/.env`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. **Verify connection:**

   Check server logs on startup:
   ```
   [INFO] Redis connected { keyPrefix: 'auth' }
   [INFO] Redis ready { keyPrefix: 'auth' }
   ```

### Local Development (without Redis)

If Redis is not available, the app will automatically use in-memory cache:

1. **Don't set `REDIS_URL`** in `.env` (or leave it empty)

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Check logs:**
   ```
   [INFO] Redis URL not configured, using in-memory cache { keyPrefix: 'auth' }
   ```

### Production (Cloud Run)

#### Option 1: Google Cloud Memorystore (Recommended)

1. **Create Redis instance:**

   ```bash
   gcloud redis instances create rayix-cache \
     --size=1 \
     --region=us-central1 \
     --redis-version=redis_7_0 \
     --tier=basic
   ```

2. **Get connection details:**

   ```bash
   gcloud redis instances describe rayix-cache --region=us-central1
   ```

3. **Configure VPC Connector** (required for Cloud Run to access Memorystore):

   ```bash
   gcloud compute networks vpc-access connectors create rayix-connector \
     --region=us-central1 \
     --network=default \
     --range=10.8.0.0/28
   ```

4. **Update Cloud Run service:**

   ```bash
   gcloud run services update rayix-server \
     --vpc-connector=rayix-connector \
     --set-env-vars="REDIS_URL=redis://[REDIS_IP]:6379"
   ```

#### Option 2: Redis Labs / Upstash (Easier, Serverless)

1. **Create instance** at [redis.io](https://redis.io) or [upstash.com](https://upstash.com)

2. **Copy connection URL:**
   ```
   redis://:password@endpoint.upstash.io:6379
   ```

3. **Add to Cloud Run environment:**
   ```bash
   gcloud run services update rayix-server \
     --set-env-vars="REDIS_URL=redis://:password@endpoint.upstash.io:6379"
   ```

## API

The `CacheService` maintains the same interface, now with async methods:

### Basic Operations

```javascript
const { authCache } = require('./infrastructure/cache');

// Get (returns undefined if not found)
const user = await authCache.get('user:123');

// Set with TTL
await authCache.set('user:123', userData, 60); // 60 seconds

// Delete
await authCache.del('user:123');

// Check existence
const exists = await authCache.has('user:123');

// Get all keys (with prefix)
const keys = await authCache.keys(); // Returns ['user:123', 'user:456', ...]

// Flush all keys (with prefix)
await authCache.flush();
```

### Atomic Operations

```javascript
// Increment (atomic, thread-safe)
const count = await rateLimitCache.incr('request:ip:1.2.3.4', 60);
// Returns new value, sets TTL on first increment
```

### Statistics

```javascript
const stats = authCache.getStats();
// {
//   hits: 1523,
//   misses: 87,
//   keys: 145,
//   ksize: 2048,
//   vsize: 123456,
//   isRedisAvailable: true,
//   cacheType: 'redis'
// }
```

## Migration Checklist

✅ **Completed:**

- [x] Install `ioredis` client
- [x] Create `CacheService` with Redis support
- [x] Add automatic fallback to in-memory cache
- [x] Update rate limiter in `index.js` to use async cache
- [x] Update auth middleware to use async cache
- [x] Update password check limiter to use async cache
- [x] Update login attempt limiter to use async cache
- [x] Add key prefixes for namespace isolation
- [x] Add graceful shutdown handlers
- [x] Add `docker-compose.yml` with Redis
- [x] Update `.env.example` with `REDIS_URL`
- [x] Create documentation

## Testing

### Unit Tests

Tests should mock the cache service:

```javascript
jest.mock('../../infrastructure/cache', () => ({
  authCache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));
```

### Integration Tests

For integration tests, use a real Redis instance or test database:

```javascript
const { authCache } = require('../../infrastructure/cache');

beforeAll(async () => {
  // Flush test cache
  await authCache.flush();
});

afterEach(async () => {
  await authCache.flush();
});
```

### Manual Testing

1. **Test without Redis** (in-memory fallback):
   ```bash
   # Don't set REDIS_URL
   npm run dev
   ```

2. **Test with Redis**:
   ```bash
   docker-compose up -d redis
   export REDIS_URL=redis://localhost:6379
   npm run dev
   ```

3. **Test failover**:
   ```bash
   # Stop Redis while server is running
   docker-compose stop redis
   # Watch logs - should see fallback to memory cache
   ```

4. **Test rate limiting**:
   ```bash
   # Spam requests to trigger rate limit
   for i in {1..150}; do curl http://localhost:3000/api/users; done
   # Should see 429 Too Many Requests
   ```

## Monitoring

### Redis Metrics to Track

- **Memory Usage**: Track Redis memory consumption
- **Hit Rate**: Cache hit/miss ratio
- **Connection Count**: Number of active connections
- **Latency**: P50, P95, P99 latency for operations
- **Evictions**: Number of keys evicted due to memory limits

### Application Metrics

Add to your monitoring dashboard:

- `cacheType: 'redis'` vs `cacheType: 'memory'` (track Redis availability)
- Cache hit rate per namespace (auth, tenant, ratelimit, etc.)
- Rate limit rejections (429 errors)
- Failed login attempts (lockouts)

### Health Checks

The cache service logs errors automatically. Monitor logs for:

```
[ERROR] Redis error { error: 'Connection timeout', keyPrefix: 'auth' }
[WARN] Redis GET failed, falling back to memory cache
```

## Troubleshooting

### Redis Connection Failures

**Symptom**: Logs show "Redis error" or "Redis connection closed"

**Solutions**:
1. Check `REDIS_URL` is correct
2. Verify Redis is running: `redis-cli ping`
3. Check firewall/security groups (Cloud Run VPC connector)
4. Review Redis logs: `docker-compose logs redis`

### High Memory Usage

**Symptom**: Redis memory grows continuously

**Solutions**:
1. Check TTLs are set correctly (all keys should expire)
2. Review key prefixes (avoid key collisions)
3. Set Redis `maxmemory` policy:
   ```bash
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```
4. Monitor key count: `redis-cli DBSIZE`

### Rate Limiting Not Working

**Symptom**: Users can exceed rate limits

**Solutions**:
1. Ensure `REDIS_URL` is set (in-memory rate limits don't work across instances)
2. Check Redis is connected: look for "Redis ready" in logs
3. Test increment: `redis-cli INCR ratelimit:test`
4. Verify Cloud Run instances are using same Redis

### Performance Issues

**Symptom**: Slow API responses

**Solutions**:
1. Check Redis latency: `redis-cli --latency`
2. Use connection pooling (already configured)
3. Reduce TTLs for frequently accessed data
4. Consider Redis cluster for high traffic

## Cost Optimization

### Memorystore Pricing

- **Basic tier**: $0.049/GB/hour (~$36/month for 1GB)
- **Standard tier** (HA): $0.099/GB/hour (~$73/month for 1GB)

### Upstash Pricing

- **Free tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.20 per 100K commands

### Optimization Tips

1. **Tune TTLs**: Shorter TTLs = less memory, more DB queries
2. **Monitor key count**: Delete unused keys, avoid leaks
3. **Use appropriate instance size**: Start small (1GB), scale up if needed
4. **Consider serverless Redis** (Upstash) for variable traffic

## Further Reading

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Google Cloud Memorystore](https://cloud.google.com/memorystore/docs/redis)
- [Upstash Serverless Redis](https://docs.upstash.com/redis)
