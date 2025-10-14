/**
 * CacheService - In-memory cache for proxy responses
 * Provides caching with TTL, invalidation strategies, and per-route configuration
 */

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
}

export interface CacheConfig {
    enabled: boolean;
    defaultTTL: number; // milliseconds
    maxSize: number; // maximum number of entries
    routeTTLs?: Record<string, number>; // per-route TTL overrides
}

export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}

export class CacheService {
    private cache: Map<string, CacheEntry>;
    private config: CacheConfig;
    private stats: { hits: number; misses: number };

    constructor(config: CacheConfig) {
        this.cache = new Map();
        this.config = config;
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * Get cached value by key
     */
    get<T = any>(key: string): T | null {
        if (!this.config.enabled) {
            return null;
        }

        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if entry has expired
        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
            // Entry expired, remove it
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // Entry is valid
        entry.hits++;
        this.stats.hits++;
        return entry.data as T;
    }

    /**
     * Set cache value with optional TTL
     */
    set<T = any>(key: string, data: T, ttl?: number): void {
        if (!this.config.enabled) {
            return;
        }

        // Check cache size limit
        if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
            // Evict least recently used entry
            this.evictLRU();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            hits: 0
        };

        this.cache.set(key, entry);
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        if (!this.config.enabled) {
            return false;
        }

        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete specific cache entry
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * Invalidate cache entries by pattern
     */
    invalidateByPattern(pattern: string | RegExp): number {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Invalidate cache entries by route name
     */
    invalidateByRoute(routeName: string): number {
        return this.invalidateByPattern(`^${routeName}:`);
    }

    /**
     * Invalidate expired entries
     */
    invalidateExpired(): number {
        const now = Date.now();
        let count = 0;

        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.cache.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Evict least recently used entry
     */
    private evictLRU(): void {
        let lruKey: string | null = null;
        let lruTimestamp = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            // Calculate score based on timestamp and hits
            const score = entry.timestamp + (entry.hits * 1000);

            if (score < lruTimestamp) {
                lruTimestamp = score;
                lruKey = key;
            }
        }

        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? this.stats.hits / total : 0;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            hitRate: Math.round(hitRate * 10000) / 100 // percentage with 2 decimals
        };
    }

    /**
     * Get TTL for a specific route
     */
    getTTLForRoute(routeName: string): number {
        if (this.config.routeTTLs && this.config.routeTTLs[routeName]) {
            return this.config.routeTTLs[routeName];
        }
        return this.config.defaultTTL;
    }

    /**
     * Update cache configuration
     */
    updateConfig(config: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...config };

        // If cache was disabled, clear it
        if (!this.config.enabled) {
            this.clear();
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): CacheConfig {
        return { ...this.config };
    }

    /**
     * Generate cache key from request parameters
     */
    static generateKey(routeName: string, path: string, query: Record<string, any> = {}, method: string = 'GET'): string {
        const queryString = Object.keys(query)
            .sort()
            .map(key => `${key}=${query[key]}`)
            .join('&');

        const parts = [routeName, method, path];
        if (queryString) {
            parts.push(queryString);
        }

        return parts.join(':');
    }
}
