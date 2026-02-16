/**
 * AnalyticsCacheService - Sophisticated caching service for analytics queries
 *
 * Features:
 * - MD5-based cache keys
 * - Smart TTL management
 * - Pattern-based invalidation
 * - Cache statistics
 * - Multi-tenant support
 */

const crypto = require('crypto');
const cache = require('../infrastructure/cache');
const logger = require('../infrastructure/logger');

class AnalyticsCacheService {
  constructor() {
    // Cache key prefixes for different data types
    this.prefixes = {
      QUERY: 'analytics:query',
      COUNT: 'analytics:count',
      AGGREGATION: 'analytics:agg',
      STATS: 'analytics:stats',
      METADATA: 'analytics:meta'
    };

    // Default TTL values (in seconds)
    this.defaultTTL = {
      QUERY: 600,        // 10 minutes
      COUNT: 300,        // 5 minutes
      AGGREGATION: 900,  // 15 minutes
      STATS: 1800,       // 30 minutes
      METADATA: 3600     // 1 hour
    };

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Generate MD5 hash for cache key
   * @param {Object} data - Data to hash
   * @returns {string} MD5 hash
   */
  _generateHash(data) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Build cache key with prefix and hash
   * @param {string} prefix - Cache key prefix
   * @param {number} tenantId - Tenant ID
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  _buildKey(prefix, tenantId, params) {
    const hash = this._generateHash(params);
    return `${prefix}:${tenantId}:${hash}`;
  }

  /**
   * Get cached query result
   * @param {number} tenantId - Tenant ID
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<any|null>} Cached data or null
   */
  async getCachedQuery(tenantId, queryParams) {
    try {
      const key = this._buildKey(this.prefixes.QUERY, tenantId, queryParams);
      const data = await cache.get(key);

      if (data !== null && data !== undefined) {
        this.stats.hits++;
        logger.debug('Analytics cache hit', {
          tenantId,
          key,
          dataSize: JSON.stringify(data).length
        });
        return data;
      }

      this.stats.misses++;
      logger.debug('Analytics cache miss', { tenantId, key });
      return null;
    } catch (err) {
      this.stats.errors++;
      logger.error('Cache get error', { error: err.message, tenantId });
      return null;
    }
  }

  /**
   * Cache query result
   * @param {number} tenantId - Tenant ID
   * @param {Object} queryParams - Query parameters
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live (optional)
   * @returns {Promise<boolean>} Success status
   */
  async setCachedQuery(tenantId, queryParams, data, ttl = null) {
    try {
      const key = this._buildKey(this.prefixes.QUERY, tenantId, queryParams);
      const cacheTTL = ttl || this.defaultTTL.QUERY;

      await cache.set(key, data, cacheTTL);

      this.stats.sets++;
      logger.debug('Analytics query cached', {
        tenantId,
        key,
        ttl: cacheTTL,
        dataSize: JSON.stringify(data).length
      });

      return true;
    } catch (err) {
      this.stats.errors++;
      logger.error('Cache set error', { error: err.message, tenantId });
      return false;
    }
  }

  /**
   * Get cached count
   * @param {number} tenantId - Tenant ID
   * @param {string} surveyId - Survey ID
   * @param {Object} filters - Filter parameters
   * @returns {Promise<number|null>} Cached count or null
   */
  async getCachedCount(tenantId, surveyId, filters = {}) {
    try {
      const key = this._buildKey(this.prefixes.COUNT, tenantId, { surveyId, filters });
      const count = await cache.get(key);

      if (count !== null && count !== undefined) {
        this.stats.hits++;
        logger.debug('Count cache hit', { tenantId, surveyId, count });
        return count;
      }

      this.stats.misses++;
      return null;
    } catch (err) {
      this.stats.errors++;
      logger.error('Count cache get error', { error: err.message, tenantId, surveyId });
      return null;
    }
  }

  /**
   * Cache count result
   * @param {number} tenantId - Tenant ID
   * @param {string} surveyId - Survey ID
   * @param {Object} filters - Filter parameters
   * @param {number} count - Count value
   * @param {number} ttl - Time to live (optional)
   * @returns {Promise<boolean>} Success status
   */
  async setCachedCount(tenantId, surveyId, filters, count, ttl = null) {
    try {
      const key = this._buildKey(this.prefixes.COUNT, tenantId, { surveyId, filters });
      const cacheTTL = ttl || this.defaultTTL.COUNT;

      await cache.set(key, count, cacheTTL);

      this.stats.sets++;
      logger.debug('Count cached', {
        tenantId,
        surveyId,
        count,
        ttl: cacheTTL
      });

      return true;
    } catch (err) {
      this.stats.errors++;
      logger.error('Count cache set error', { error: err.message, tenantId, surveyId });
      return false;
    }
  }

  /**
   * Get cached aggregation result
   * @param {number} tenantId - Tenant ID
   * @param {Object} aggParams - Aggregation parameters
   * @returns {Promise<any|null>} Cached aggregation or null
   */
  async getCachedAggregation(tenantId, aggParams) {
    try {
      const key = this._buildKey(this.prefixes.AGGREGATION, tenantId, aggParams);
      const data = await cache.get(key);

      if (data !== null && data !== undefined) {
        this.stats.hits++;
        return data;
      }

      this.stats.misses++;
      return null;
    } catch (err) {
      this.stats.errors++;
      logger.error('Aggregation cache get error', { error: err.message, tenantId });
      return null;
    }
  }

  /**
   * Cache aggregation result
   * @param {number} tenantId - Tenant ID
   * @param {Object} aggParams - Aggregation parameters
   * @param {any} data - Aggregation result
   * @param {number} ttl - Time to live (optional)
   * @returns {Promise<boolean>} Success status
   */
  async setCachedAggregation(tenantId, aggParams, data, ttl = null) {
    try {
      const key = this._buildKey(this.prefixes.AGGREGATION, tenantId, aggParams);
      const cacheTTL = ttl || this.defaultTTL.AGGREGATION;

      await cache.set(key, data, cacheTTL);

      this.stats.sets++;
      logger.debug('Aggregation cached', { tenantId, ttl: cacheTTL });

      return true;
    } catch (err) {
      this.stats.errors++;
      logger.error('Aggregation cache set error', { error: err.message, tenantId });
      return false;
    }
  }

  /**
   * Invalidate all cache entries for a specific survey
   * @param {number} tenantId - Tenant ID
   * @param {string} surveyId - Survey ID
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateSurvey(tenantId, surveyId) {
    try {
      let deletedCount = 0;

      // Build patterns for different cache types
      const patterns = [
        `${this.prefixes.QUERY}:${tenantId}:*`,
        `${this.prefixes.COUNT}:${tenantId}:*`,
        `${this.prefixes.AGGREGATION}:${tenantId}:*`
      ];

      // For each pattern, we need to find matching keys and delete them
      // Note: This is a simplified implementation. In production with Redis,
      // you'd use SCAN with pattern matching
      for (const pattern of patterns) {
        try {
          await cache.deletePattern(pattern);
          deletedCount++;
        } catch (err) {
          logger.warn('Failed to delete cache pattern', { pattern, error: err.message });
        }
      }

      this.stats.deletes += deletedCount;

      logger.info('Survey cache invalidated', {
        tenantId,
        surveyId,
        deletedCount
      });

      return deletedCount;
    } catch (err) {
      this.stats.errors++;
      logger.error('Cache invalidation error', {
        error: err.message,
        tenantId,
        surveyId
      });
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a tenant
   * @param {number} tenantId - Tenant ID
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateTenant(tenantId) {
    try {
      let deletedCount = 0;

      const patterns = Object.values(this.prefixes).map(
        prefix => `${prefix}:${tenantId}:*`
      );

      for (const pattern of patterns) {
        try {
          await cache.deletePattern(pattern);
          deletedCount++;
        } catch (err) {
          logger.warn('Failed to delete cache pattern', { pattern, error: err.message });
        }
      }

      this.stats.deletes += deletedCount;

      logger.info('Tenant cache invalidated', {
        tenantId,
        deletedCount
      });

      return deletedCount;
    } catch (err) {
      this.stats.errors++;
      logger.error('Tenant cache invalidation error', {
        error: err.message,
        tenantId
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      errors: this.stats.errors,
      total
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    logger.info('Analytics cache stats reset');
  }

  /**
   * Warm up cache with common queries
   * @param {number} tenantId - Tenant ID
   * @param {Array} queries - Array of query objects to warm up
   * @returns {Promise<number>} Number of queries cached
   */
  async warmUp(tenantId, queries = []) {
    try {
      let warmedCount = 0;

      for (const query of queries) {
        try {
          // This would execute the query and cache the result
          // Implementation depends on your specific query execution logic
          logger.debug('Warming cache', { tenantId, query });
          warmedCount++;
        } catch (err) {
          logger.warn('Cache warm-up failed for query', {
            tenantId,
            query,
            error: err.message
          });
        }
      }

      logger.info('Cache warm-up completed', { tenantId, warmedCount });
      return warmedCount;
    } catch (err) {
      logger.error('Cache warm-up error', { error: err.message, tenantId });
      return 0;
    }
  }

  /**
   * Get cache health status
   * @returns {Object} Health status
   */
  async getHealth() {
    try {
      const stats = this.getStats();
      const errorRate = stats.total > 0
        ? ((this.stats.errors / stats.total) * 100).toFixed(2)
        : 0;

      return {
        status: this.stats.errors < 10 ? 'healthy' : 'degraded',
        stats,
        errorRate: `${errorRate}%`,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      logger.error('Health check error', { error: err.message });
      return {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
module.exports = new AnalyticsCacheService();
