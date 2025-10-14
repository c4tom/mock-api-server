# Proxy Cache Guide

## Overview

The Mock API Server includes an in-memory caching system for proxy responses. This feature improves performance by reducing redundant requests to external APIs and provides configurable TTL (Time To Live) settings per route.

## Features

- **In-memory caching**: Fast response times for cached requests
- **Configurable TTL**: Set default and per-route cache expiration times
- **Automatic invalidation**: Cache is cleared on mutating operations (POST, PUT, DELETE, PATCH)
- **LRU eviction**: Least Recently Used entries are evicted when cache is full
- **Cache statistics**: Monitor cache hit rate and performance
- **Admin endpoints**: Manage cache through REST API

## Configuration

### Environment Variables

Add these variables to your `.env.local` or `.env.production` file:

```bash
# Enable/disable caching
PROXY_CACHE_ENABLED=true

# Default TTL in milliseconds (5 minutes = 300000ms)
PROXY_CACHE_DEFAULT_TTL=300000

# Maximum number of cached entries
PROXY_CACHE_MAX_SIZE=100

# Per-route TTL overrides (in milliseconds)
PROXY_CACHE_TTL_ROUTENAME=600000
```

### Example Configuration

#### Development (.env.local)
```bash
# Cache Configuration
PROXY_CACHE_ENABLED=true
PROXY_CACHE_DEFAULT_TTL=300000  # 5 minutes
PROXY_CACHE_MAX_SIZE=100

# Per-route TTL overrides
PROXY_CACHE_TTL_JSONPLACEHOLDER=600000  # 10 minutes
PROXY_CACHE_TTL_GITHUB=180000           # 3 minutes
PROXY_CACHE_TTL_HTTPBIN=60000           # 1 minute
```

#### Production (.env.production)
```bash
# Cache Configuration
PROXY_CACHE_ENABLED=true
PROXY_CACHE_DEFAULT_TTL=600000  # 10 minutes
PROXY_CACHE_MAX_SIZE=200

# Per-route TTL overrides
PROXY_CACHE_TTL_API1=900000     # 15 minutes
PROXY_CACHE_TTL_API2=300000     # 5 minutes
```

## How It Works

### Caching Behavior

1. **GET requests only**: Only GET requests are cached. Other HTTP methods (POST, PUT, DELETE, PATCH) are never cached.

2. **Successful responses**: Only responses with 2xx status codes are cached.

3. **Cache key generation**: Cache keys are generated from:
   - Route name
   - HTTP method
   - Request path
   - Query parameters (sorted alphabetically)

4. **Automatic invalidation**: When a mutating operation (POST, PUT, DELETE, PATCH) is performed on a route, all cached entries for that route are invalidated.

5. **TTL expiration**: Cached entries expire after their TTL and are automatically removed on next access.

6. **LRU eviction**: When the cache reaches max size, the least recently used entry is evicted to make room for new entries.

### Cache Headers

The server adds an `X-Cache` header to all proxy responses:
- `X-Cache: HIT` - Response was served from cache
- `X-Cache: MISS` - Response was fetched from the external API

## Admin Endpoints

### Get Cache Statistics

Get current cache statistics including hit rate, size, and performance metrics.

```bash
GET /admin/cache/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "hits": 150,
    "misses": 50,
    "size": 45,
    "hitRate": 75.0
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-123",
    "user": "admin"
  }
}
```

### Clear All Cache

Clear all cached entries.

```bash
POST /admin/cache/clear
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "data": {
    "clearedAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-124",
    "user": "admin"
  }
}
```

### Invalidate Cache by Route

Invalidate all cached entries for a specific route.

```bash
POST /admin/cache/invalidate/:routeName
```

**Example:**
```bash
POST /admin/cache/invalidate/jsonplaceholder
```

**Response:**
```json
{
  "success": true,
  "message": "Cache invalidated for route 'jsonplaceholder'",
  "data": {
    "routeName": "jsonplaceholder",
    "entriesInvalidated": 12,
    "invalidatedAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-125",
    "user": "admin"
  }
}
```

## Usage Examples

### Basic Usage

1. **First request** (cache miss):
```bash
curl http://localhost:3000/proxy/jsonplaceholder/posts/1
# X-Cache: MISS
# Response time: 250ms
```

2. **Subsequent request** (cache hit):
```bash
curl http://localhost:3000/proxy/jsonplaceholder/posts/1
# X-Cache: HIT
# Response time: 5ms
```

### Invalidation on Mutation

```bash
# GET request - cached
curl http://localhost:3000/proxy/jsonplaceholder/posts/1
# X-Cache: HIT

# POST request - invalidates cache for this route
curl -X POST http://localhost:3000/proxy/jsonplaceholder/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"New Post","body":"Content"}'

# Next GET request - cache miss (cache was invalidated)
curl http://localhost:3000/proxy/jsonplaceholder/posts/1
# X-Cache: MISS
```

### Monitoring Cache Performance

```bash
# Get cache statistics
curl http://localhost:3000/admin/cache/stats

# Response shows:
# - hits: 150 (requests served from cache)
# - misses: 50 (requests fetched from external API)
# - hitRate: 75% (cache effectiveness)
# - size: 45 (current number of cached entries)
```

## Best Practices

### TTL Configuration

1. **Static data**: Use longer TTL (10-30 minutes)
   ```bash
   PROXY_CACHE_TTL_STATIC_API=1800000  # 30 minutes
   ```

2. **Dynamic data**: Use shorter TTL (1-5 minutes)
   ```bash
   PROXY_CACHE_TTL_DYNAMIC_API=300000  # 5 minutes
   ```

3. **Real-time data**: Disable caching or use very short TTL
   ```bash
   PROXY_CACHE_TTL_REALTIME_API=30000  # 30 seconds
   ```

### Cache Size

- **Development**: 50-100 entries is usually sufficient
- **Production**: 200-500 entries depending on traffic and memory

### Monitoring

1. **Check hit rate regularly**: Aim for >70% hit rate for optimal performance
2. **Monitor cache size**: Ensure it's not constantly at max capacity
3. **Review slow requests**: Use `/admin/stats` to identify slow external APIs

### Cache Invalidation

1. **Manual invalidation**: Use admin endpoints when external data changes
2. **Scheduled invalidation**: Consider implementing a cron job to clear cache periodically
3. **Selective invalidation**: Invalidate specific routes instead of clearing all cache

## Performance Impact

### Benefits

- **Reduced latency**: Cached responses are 50-100x faster than external API calls
- **Lower external API usage**: Reduces costs and rate limiting issues
- **Improved reliability**: Serves cached data even if external API is slow or unavailable

### Considerations

- **Memory usage**: Each cached entry uses memory (typically 1-10KB per entry)
- **Stale data**: Cached data may be outdated until TTL expires
- **Cache warming**: First request to each endpoint will be slower (cache miss)

## Troubleshooting

### Cache Not Working

1. **Check if caching is enabled**:
   ```bash
   curl http://localhost:3000/admin/cache/stats
   ```

2. **Verify configuration**:
   ```bash
   curl http://localhost:3000/admin/config | jq '.data.proxy.cache'
   ```

3. **Check X-Cache header**:
   ```bash
   curl -I http://localhost:3000/proxy/route/path
   ```

### Low Hit Rate

1. **Increase TTL**: Longer TTL means more cache hits
2. **Increase cache size**: More entries can be cached
3. **Check request patterns**: Ensure requests are identical (same query params)

### High Memory Usage

1. **Reduce cache size**: Lower `PROXY_CACHE_MAX_SIZE`
2. **Reduce TTL**: Shorter TTL means entries expire faster
3. **Monitor cache stats**: Use admin endpoints to track usage

## API Reference

### CacheService Methods

```typescript
// Get cached value
get<T>(key: string): T | null

// Set cache value with optional TTL
set<T>(key: string, data: T, ttl?: number): void

// Check if key exists and is not expired
has(key: string): boolean

// Delete specific entry
delete(key: string): boolean

// Clear all entries
clear(): void

// Invalidate by pattern
invalidateByPattern(pattern: string | RegExp): number

// Invalidate by route name
invalidateByRoute(routeName: string): number

// Remove expired entries
invalidateExpired(): number

// Get cache statistics
getStats(): CacheStats

// Generate cache key
static generateKey(routeName: string, path: string, query: Record<string, any>, method: string): string
```

## Examples

### Custom Cache Implementation

If you need custom caching logic, you can extend the CacheService:

```typescript
import { CacheService, CacheConfig } from './services/CacheService';

class CustomCacheService extends CacheService {
  constructor(config: CacheConfig) {
    super(config);
  }

  // Add custom cache warming
  async warmCache(routes: string[]): Promise<void> {
    for (const route of routes) {
      // Fetch and cache popular endpoints
      // Implementation here
    }
  }

  // Add custom eviction policy
  protected evictLRU(): void {
    // Custom eviction logic
    super.evictLRU();
  }
}
```

### Programmatic Cache Management

```typescript
import { ProxyHandler } from './handlers/ProxyHandler';

// Get cache statistics
const stats = proxyHandler.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);

// Clear cache
proxyHandler.clearCache();

// Invalidate specific route
const count = proxyHandler.invalidateCacheByRoute('api1');
console.log(`Invalidated ${count} entries`);
```

## Related Documentation

- [Proxy Guide](./PROXY_GUIDE.md) - Proxy configuration and usage
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Security Guide](./SECURITY_GUIDE.md) - Security best practices
