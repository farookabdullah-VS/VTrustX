const NodeCache = require('node-cache');

class CacheService {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 300,
      checkperiod: options.checkperiod || 120,
      maxKeys: options.maxKeys || 5000,
      useClones: options.useClones !== undefined ? options.useClones : false,
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  del(key) {
    return this.cache.del(key);
  }

  flush() {
    this.cache.flushAll();
  }

  has(key) {
    return this.cache.has(key);
  }

  keys() {
    return this.cache.keys();
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Shared instances
const authCache = new CacheService({ ttl: 60, maxKeys: 2000 });
const tenantCache = new CacheService({ ttl: 300, maxKeys: 500 });
const sessionCache = new CacheService({ ttl: 1800, maxKeys: 1000 });
const rateLimitCache = new CacheService({ ttl: 60, maxKeys: 10000 });
const loginAttemptCache = new CacheService({ ttl: 900, maxKeys: 10000 }); // 15min TTL for lockout

module.exports = {
  CacheService,
  authCache,
  tenantCache,
  sessionCache,
  rateLimitCache,
  loginAttemptCache,
};
