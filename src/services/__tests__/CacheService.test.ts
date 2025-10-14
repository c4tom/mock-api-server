/**
 * Unit tests for CacheService
 */

import { CacheService, CacheConfig } from '../CacheService';

describe('CacheService', () => {
    let cacheService: CacheService;
    let config: CacheConfig;

    beforeEach(() => {
        config = {
            enabled: true,
            defaultTTL: 1000, // 1 second for testing
            maxSize: 5,
            routeTTLs: {
                'test-route': 2000
            }
        };
        cacheService = new CacheService(config);
    });

    describe('get and set', () => {
        it('should store and retrieve values', () => {
            cacheService.set('key1', 'value1');
            const result = cacheService.get('key1');
            expect(result).toBe('value1');
        });

        it('should return null for non-existent keys', () => {
            const result = cacheService.get('non-existent');
            expect(result).toBeNull();
        });

        it('should handle different data types', () => {
            cacheService.set('string', 'test');
            cacheService.set('number', 42);
            cacheService.set('object', { foo: 'bar' });
            cacheService.set('array', [1, 2, 3]);

            expect(cacheService.get('string')).toBe('test');
            expect(cacheService.get('number')).toBe(42);
            expect(cacheService.get('object')).toEqual({ foo: 'bar' });
            expect(cacheService.get('array')).toEqual([1, 2, 3]);
        });

        it('should not cache when disabled', () => {
            const disabledCache = new CacheService({ ...config, enabled: false });
            disabledCache.set('key1', 'value1');
            const result = disabledCache.get('key1');
            expect(result).toBeNull();
        });
    });

    describe('TTL expiration', () => {
        it('should expire entries after TTL', async () => {
            cacheService.set('key1', 'value1', 100); // 100ms TTL

            // Should be available immediately
            expect(cacheService.get('key1')).toBe('value1');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be expired
            expect(cacheService.get('key1')).toBeNull();
        });

        it('should use default TTL when not specified', async () => {
            cacheService.set('key1', 'value1'); // Uses default TTL (1000ms)

            expect(cacheService.get('key1')).toBe('value1');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));

            expect(cacheService.get('key1')).toBeNull();
        });

        it('should use custom TTL when specified', async () => {
            cacheService.set('key1', 'value1', 200);

            expect(cacheService.get('key1')).toBe('value1');

            await new Promise(resolve => setTimeout(resolve, 250));

            expect(cacheService.get('key1')).toBeNull();
        });
    });

    describe('has', () => {
        it('should return true for existing non-expired keys', () => {
            cacheService.set('key1', 'value1');
            expect(cacheService.has('key1')).toBe(true);
        });

        it('should return false for non-existent keys', () => {
            expect(cacheService.has('non-existent')).toBe(false);
        });

        it('should return false for expired keys', async () => {
            cacheService.set('key1', 'value1', 100);
            expect(cacheService.has('key1')).toBe(true);

            await new Promise(resolve => setTimeout(resolve, 150));

            expect(cacheService.has('key1')).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete existing keys', () => {
            cacheService.set('key1', 'value1');
            expect(cacheService.has('key1')).toBe(true);

            const deleted = cacheService.delete('key1');
            expect(deleted).toBe(true);
            expect(cacheService.has('key1')).toBe(false);
        });

        it('should return false when deleting non-existent keys', () => {
            const deleted = cacheService.delete('non-existent');
            expect(deleted).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all entries', () => {
            cacheService.set('key1', 'value1');
            cacheService.set('key2', 'value2');
            cacheService.set('key3', 'value3');

            expect(cacheService.getStats().size).toBe(3);

            cacheService.clear();

            expect(cacheService.getStats().size).toBe(0);
            expect(cacheService.has('key1')).toBe(false);
            expect(cacheService.has('key2')).toBe(false);
            expect(cacheService.has('key3')).toBe(false);
        });

        it('should reset statistics', () => {
            cacheService.set('key1', 'value1');
            cacheService.get('key1'); // Hit
            cacheService.get('key2'); // Miss

            const statsBefore = cacheService.getStats();
            expect(statsBefore.hits).toBe(1);
            expect(statsBefore.misses).toBe(1);

            cacheService.clear();

            const statsAfter = cacheService.getStats();
            expect(statsAfter.hits).toBe(0);
            expect(statsAfter.misses).toBe(0);
        });
    });

    describe('invalidateByPattern', () => {
        it('should invalidate entries matching string pattern', () => {
            cacheService.set('route1:key1', 'value1');
            cacheService.set('route1:key2', 'value2');
            cacheService.set('route2:key1', 'value3');

            const count = cacheService.invalidateByPattern('^route1:');

            expect(count).toBe(2);
            expect(cacheService.has('route1:key1')).toBe(false);
            expect(cacheService.has('route1:key2')).toBe(false);
            expect(cacheService.has('route2:key1')).toBe(true);
        });

        it('should invalidate entries matching regex pattern', () => {
            cacheService.set('route1:key1', 'value1');
            cacheService.set('route1:key2', 'value2');
            cacheService.set('route2:key1', 'value3');

            const count = cacheService.invalidateByPattern(/^route1:/);

            expect(count).toBe(2);
        });

        it('should return 0 when no entries match', () => {
            cacheService.set('route1:key1', 'value1');

            const count = cacheService.invalidateByPattern('^route2:');

            expect(count).toBe(0);
            expect(cacheService.has('route1:key1')).toBe(true);
        });
    });

    describe('invalidateByRoute', () => {
        it('should invalidate all entries for a route', () => {
            cacheService.set('route1:GET:/path1', 'value1');
            cacheService.set('route1:GET:/path2', 'value2');
            cacheService.set('route2:GET:/path1', 'value3');

            const count = cacheService.invalidateByRoute('route1');

            expect(count).toBe(2);
            expect(cacheService.has('route1:GET:/path1')).toBe(false);
            expect(cacheService.has('route1:GET:/path2')).toBe(false);
            expect(cacheService.has('route2:GET:/path1')).toBe(true);
        });
    });

    describe('invalidateExpired', () => {
        it('should remove expired entries', async () => {
            cacheService.set('key1', 'value1', 100);
            cacheService.set('key2', 'value2', 500);
            cacheService.set('key3', 'value3', 1000);

            expect(cacheService.getStats().size).toBe(3);

            // Wait for first entry to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            const count = cacheService.invalidateExpired();

            expect(count).toBe(1);
            expect(cacheService.has('key1')).toBe(false);
            expect(cacheService.has('key2')).toBe(true);
            expect(cacheService.has('key3')).toBe(true);
        });
    });

    describe('maxSize and LRU eviction', () => {
        it('should evict LRU entry when max size is reached', () => {
            // Fill cache to max size
            for (let i = 1; i <= 5; i++) {
                cacheService.set(`key${i}`, `value${i}`);
            }

            expect(cacheService.getStats().size).toBe(5);

            // Access some entries to increase their hit count
            cacheService.get('key3');
            cacheService.get('key3');
            cacheService.get('key4');

            // Add new entry, should evict LRU (key1 or key2)
            cacheService.set('key6', 'value6');

            expect(cacheService.getStats().size).toBe(5);
            expect(cacheService.has('key6')).toBe(true);
            expect(cacheService.has('key3')).toBe(true);
            expect(cacheService.has('key4')).toBe(true);
        });

        it('should not evict when updating existing key', () => {
            for (let i = 1; i <= 5; i++) {
                cacheService.set(`key${i}`, `value${i}`);
            }

            // Update existing key
            cacheService.set('key3', 'new-value');

            expect(cacheService.getStats().size).toBe(5);
            expect(cacheService.get('key3')).toBe('new-value');
        });
    });

    describe('statistics', () => {
        it('should track hits and misses', () => {
            cacheService.set('key1', 'value1');

            cacheService.get('key1'); // Hit
            cacheService.get('key1'); // Hit
            cacheService.get('key2'); // Miss
            cacheService.get('key3'); // Miss

            const stats = cacheService.getStats();

            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(2);
            expect(stats.hitRate).toBe(50);
        });

        it('should calculate hit rate correctly', () => {
            cacheService.set('key1', 'value1');

            cacheService.get('key1'); // Hit
            cacheService.get('key1'); // Hit
            cacheService.get('key1'); // Hit
            cacheService.get('key2'); // Miss

            const stats = cacheService.getStats();

            expect(stats.hitRate).toBe(75);
        });

        it('should return 0 hit rate when no requests', () => {
            const stats = cacheService.getStats();
            expect(stats.hitRate).toBe(0);
        });

        it('should track cache size', () => {
            expect(cacheService.getStats().size).toBe(0);

            cacheService.set('key1', 'value1');
            expect(cacheService.getStats().size).toBe(1);

            cacheService.set('key2', 'value2');
            expect(cacheService.getStats().size).toBe(2);

            cacheService.delete('key1');
            expect(cacheService.getStats().size).toBe(1);
        });
    });

    describe('getTTLForRoute', () => {
        it('should return route-specific TTL when configured', () => {
            const ttl = cacheService.getTTLForRoute('test-route');
            expect(ttl).toBe(2000);
        });

        it('should return default TTL for unconfigured routes', () => {
            const ttl = cacheService.getTTLForRoute('other-route');
            expect(ttl).toBe(1000);
        });
    });

    describe('updateConfig', () => {
        it('should update configuration', () => {
            cacheService.updateConfig({ defaultTTL: 5000 });

            const newConfig = cacheService.getConfig();
            expect(newConfig.defaultTTL).toBe(5000);
        });

        it('should clear cache when disabled', () => {
            cacheService.set('key1', 'value1');
            expect(cacheService.getStats().size).toBe(1);

            cacheService.updateConfig({ enabled: false });

            expect(cacheService.getStats().size).toBe(0);
        });
    });

    describe('generateKey', () => {
        it('should generate consistent keys', () => {
            const key1 = CacheService.generateKey('route1', '/path', { a: '1', b: '2' }, 'GET');
            const key2 = CacheService.generateKey('route1', '/path', { a: '1', b: '2' }, 'GET');

            expect(key1).toBe(key2);
        });

        it('should sort query parameters', () => {
            const key1 = CacheService.generateKey('route1', '/path', { b: '2', a: '1' }, 'GET');
            const key2 = CacheService.generateKey('route1', '/path', { a: '1', b: '2' }, 'GET');

            expect(key1).toBe(key2);
        });

        it('should include method in key', () => {
            const key1 = CacheService.generateKey('route1', '/path', {}, 'GET');
            const key2 = CacheService.generateKey('route1', '/path', {}, 'POST');

            expect(key1).not.toBe(key2);
        });

        it('should handle empty query parameters', () => {
            const key = CacheService.generateKey('route1', '/path', {}, 'GET');
            expect(key).toBe('route1:GET:/path');
        });
    });
});
