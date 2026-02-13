const { CacheService } = require('../cache');

describe('CacheService', () => {
  let cache;

  beforeEach(() => {
    // Don't set REDIS_URL in tests to use in-memory cache
    delete process.env.REDIS_URL;
    cache = new CacheService({ ttl: 10, maxKeys: 100, keyPrefix: 'test' });
  });

  afterEach(async () => {
    await cache.flush();
    await cache.close();
  });

  it('should set and get a value', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', async () => {
    expect(await cache.get('nonexistent')).toBeUndefined();
  });

  it('should delete a key', async () => {
    await cache.set('key1', 'value1');
    await cache.del('key1');
    expect(await cache.get('key1')).toBeUndefined();
  });

  it('should flush all keys', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.flush();
    expect(await cache.get('key1')).toBeUndefined();
    expect(await cache.get('key2')).toBeUndefined();
  });

  it('should check if key exists', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.has('key1')).toBe(true);
    expect(await cache.has('key2')).toBe(false);
  });

  it('should list all keys', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    const keys = await cache.keys();
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  it('should return stats', async () => {
    await cache.set('key1', 'value1');
    await cache.get('key1');
    await cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.cacheType).toBe('memory'); // Should use memory cache in tests
  });

  it('should support custom TTL per key', async () => {
    await cache.set('short', 'value', 1); // 1 second TTL
    expect(await cache.get('short')).toBe('value');
  });

  it('should store objects', async () => {
    const obj = { name: 'test', data: [1, 2, 3] };
    await cache.set('obj', obj);
    expect(await cache.get('obj')).toEqual(obj);
  });

  it('should overwrite existing key', async () => {
    await cache.set('key', 'old');
    await cache.set('key', 'new');
    expect(await cache.get('key')).toBe('new');
  });

  it('should increment counter atomically', async () => {
    const count1 = await cache.incr('counter', 10);
    expect(count1).toBe(1);

    const count2 = await cache.incr('counter', 10);
    expect(count2).toBe(2);

    const count3 = await cache.incr('counter', 10);
    expect(count3).toBe(3);
  });

  it('should use key prefix for isolation', async () => {
    const cache1 = new CacheService({ keyPrefix: 'ns1' });
    const cache2 = new CacheService({ keyPrefix: 'ns2' });

    await cache1.set('key', 'value1');
    await cache2.set('key', 'value2');

    expect(await cache1.get('key')).toBe('value1');
    expect(await cache2.get('key')).toBe('value2');

    await cache1.close();
    await cache2.close();
  });
});
