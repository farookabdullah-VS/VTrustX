const Redis = require('ioredis');
const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * Cache service that supports both Redis (production) and in-memory (development)
 * Automatically falls back to in-memory cache if Redis is unavailable
 */
class CacheService {
  constructor(options = {}) {
    this.options = {
      ttl: options.ttl || 300,
      checkperiod: options.checkperiod || 120,
      maxKeys: options.maxKeys || 5000,
      useClones: options.useClones !== undefined ? options.useClones : false,
      keyPrefix: options.keyPrefix || '',
    };

    this.redis = null;
    this.memoryCache = null;
    this.isRedisAvailable = false;

    this._initializeCache();
  }

  _initializeCache() {
    const redisUrl = process.env.REDIS_URL;

    // Try to connect to Redis if URL is provided
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
        });

        this.redis.on('connect', () => {
          logger.info('Redis connected', { keyPrefix: this.options.keyPrefix });
          this.isRedisAvailable = true;
        });

        this.redis.on('ready', () => {
          logger.info('Redis ready', { keyPrefix: this.options.keyPrefix });
          this.isRedisAvailable = true;
        });

        this.redis.on('error', (err) => {
          logger.error('Redis error', { error: err.message, keyPrefix: this.options.keyPrefix });
          this.isRedisAvailable = false;
        });

        this.redis.on('close', () => {
          logger.warn('Redis connection closed', { keyPrefix: this.options.keyPrefix });
          this.isRedisAvailable = false;
        });

        this.redis.on('reconnecting', () => {
          logger.info('Redis reconnecting', { keyPrefix: this.options.keyPrefix });
        });

        // Test connection
        this.redis.ping((err) => {
          if (err) {
            logger.warn('Redis ping failed, using memory cache fallback', { error: err.message });
            this._initializeMemoryCache();
          } else {
            this.isRedisAvailable = true;
          }
        });
      } catch (err) {
        logger.error('Failed to initialize Redis', { error: err.message });
        this._initializeMemoryCache();
      }
    } else {
      logger.info('Redis URL not configured, using in-memory cache', { keyPrefix: this.options.keyPrefix });
      this._initializeMemoryCache();
    }

    // Always initialize memory cache as fallback
    if (!this.memoryCache) {
      this._initializeMemoryCache();
    }
  }

  _initializeMemoryCache() {
    if (!this.memoryCache) {
      this.memoryCache = new NodeCache({
        stdTTL: this.options.ttl,
        checkperiod: this.options.checkperiod,
        maxKeys: this.options.maxKeys,
        useClones: this.options.useClones,
      });
      logger.info('Memory cache initialized', { keyPrefix: this.options.keyPrefix });
    }
  }

  _getKey(key) {
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key;
  }

  async get(key) {
    const fullKey = this._getKey(key);

    if (this.isRedisAvailable && this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        if (value === null) return undefined;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      } catch (err) {
        logger.warn('Redis GET failed, falling back to memory cache', { key: fullKey, error: err.message });
        return this.memoryCache.get(fullKey);
      }
    }

    return this.memoryCache.get(fullKey);
  }

  async set(key, value, ttl) {
    const fullKey = this._getKey(key);
    const finalTtl = ttl !== undefined ? ttl : this.options.ttl;

    if (this.isRedisAvailable && this.redis) {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (finalTtl > 0) {
          await this.redis.setex(fullKey, finalTtl, serialized);
        } else {
          await this.redis.set(fullKey, serialized);
        }
        // Also update memory cache for faster local reads
        this.memoryCache.set(fullKey, value, finalTtl);
        return true;
      } catch (err) {
        logger.warn('Redis SET failed, falling back to memory cache', { key: fullKey, error: err.message });
        return this.memoryCache.set(fullKey, value, finalTtl);
      }
    }

    return this.memoryCache.set(fullKey, value, finalTtl);
  }

  async del(key) {
    const fullKey = this._getKey(key);

    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(fullKey);
        this.memoryCache.del(fullKey);
        return true;
      } catch (err) {
        logger.warn('Redis DEL failed, falling back to memory cache', { key: fullKey, error: err.message });
        return this.memoryCache.del(fullKey);
      }
    }

    return this.memoryCache.del(fullKey);
  }

  async flush() {
    if (this.isRedisAvailable && this.redis) {
      try {
        if (this.options.keyPrefix) {
          // Only flush keys with our prefix
          const keys = await this.redis.keys(`${this.options.keyPrefix}:*`);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.flushdb();
        }
        this.memoryCache.flushAll();
        return true;
      } catch (err) {
        logger.warn('Redis FLUSH failed, falling back to memory cache', { error: err.message });
        this.memoryCache.flushAll();
        return false;
      }
    }

    this.memoryCache.flushAll();
    return true;
  }

  async has(key) {
    const fullKey = this._getKey(key);

    if (this.isRedisAvailable && this.redis) {
      try {
        const exists = await this.redis.exists(fullKey);
        return exists === 1;
      } catch (err) {
        logger.warn('Redis EXISTS failed, falling back to memory cache', { key: fullKey, error: err.message });
        return this.memoryCache.has(fullKey);
      }
    }

    return this.memoryCache.has(fullKey);
  }

  async keys() {
    if (this.isRedisAvailable && this.redis) {
      try {
        const pattern = this.options.keyPrefix ? `${this.options.keyPrefix}:*` : '*';
        const keys = await this.redis.keys(pattern);
        // Remove prefix from keys
        if (this.options.keyPrefix) {
          return keys.map(k => k.replace(`${this.options.keyPrefix}:`, ''));
        }
        return keys;
      } catch (err) {
        logger.warn('Redis KEYS failed, falling back to memory cache', { error: err.message });
        const memKeys = this.memoryCache.keys();
        // Remove prefix from memory cache keys too
        if (this.options.keyPrefix) {
          return memKeys.map(k => k.replace(`${this.options.keyPrefix}:`, ''));
        }
        return memKeys;
      }
    }

    const memKeys = this.memoryCache.keys();
    // Remove prefix from memory cache keys
    if (this.options.keyPrefix) {
      return memKeys.map(k => k.replace(`${this.options.keyPrefix}:`, ''));
    }
    return memKeys;
  }

  getStats() {
    // Return memory cache stats (Redis stats would require separate monitoring)
    return {
      ...this.memoryCache.getStats(),
      isRedisAvailable: this.isRedisAvailable,
      cacheType: this.isRedisAvailable ? 'redis' : 'memory',
    };
  }

  /**
   * Increment a counter (atomic operation)
   * Returns the new value
   */
  async incr(key, ttl) {
    const fullKey = this._getKey(key);
    const finalTtl = ttl !== undefined ? ttl : this.options.ttl;

    if (this.isRedisAvailable && this.redis) {
      try {
        const newValue = await this.redis.incr(fullKey);
        if (finalTtl > 0) {
          await this.redis.expire(fullKey, finalTtl);
        }
        return newValue;
      } catch (err) {
        logger.warn('Redis INCR failed, falling back to memory cache', { key: fullKey, error: err.message });
      }
    }

    // Memory cache fallback (not atomic)
    const current = this.memoryCache.get(fullKey) || 0;
    const newValue = current + 1;
    this.memoryCache.set(fullKey, newValue, finalTtl);
    return newValue;
  }

  /**
   * Close connections gracefully
   */
  async close() {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis connection closed gracefully');
      } catch (err) {
        logger.error('Error closing Redis connection', { error: err.message });
      }
    }
    if (this.memoryCache) {
      this.memoryCache.flushAll();
      this.memoryCache.close();
    }
  }
}

// Shared instances with key prefixes for namespace isolation
const authCache = new CacheService({ ttl: 60, maxKeys: 2000, keyPrefix: 'auth' });
const tenantCache = new CacheService({ ttl: 300, maxKeys: 500, keyPrefix: 'tenant' });
const sessionCache = new CacheService({ ttl: 1800, maxKeys: 1000, keyPrefix: 'session' });
const rateLimitCache = new CacheService({ ttl: 60, maxKeys: 10000, keyPrefix: 'ratelimit' });
const loginAttemptCache = new CacheService({ ttl: 900, maxKeys: 10000, keyPrefix: 'loginattempt' }); // 15min TTL for lockout

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

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing cache connections');
  await closeAllCaches();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing cache connections');
  await closeAllCaches();
  process.exit(0);
});

module.exports = {
  CacheService,
  authCache,
  tenantCache,
  sessionCache,
  rateLimitCache,
  loginAttemptCache,
  closeAllCaches,
};
