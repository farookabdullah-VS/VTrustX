const { CacheService } = require('../cache');

describe('CacheService', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheService({ ttl: 10, maxKeys: 100 });
  });

  afterEach(() => {
    cache.flush();
  });

  it('should set and get a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should delete a key', () => {
    cache.set('key1', 'value1');
    cache.del('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should flush all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.flush();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should list all keys', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    const keys = cache.keys();
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  it('should return stats', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should support custom TTL per key', () => {
    cache.set('short', 'value', 1); // 1 second TTL
    expect(cache.get('short')).toBe('value');
  });

  it('should store objects', () => {
    const obj = { name: 'test', data: [1, 2, 3] };
    cache.set('obj', obj);
    expect(cache.get('obj')).toEqual(obj);
  });

  it('should overwrite existing key', () => {
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
  });
});
