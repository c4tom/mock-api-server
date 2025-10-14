# CORS Proxy Configuration Guide

Complete guide for configuring and using the CORS proxy functionality.

## Table of Contents

- [Overview](#overview)
- [Basic Configuration](#basic-configuration)
- [Named Proxy Routes](#named-proxy-routes)
- [Domain Filtering](#domain-filtering)
- [Authentication](#authentication)
- [Advanced Configuration](#advanced-configuration)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)

## Overview

The CORS proxy allows you to make requests to external APIs that don't support CORS, bypassing browser CORS restrictions during development.

### How It Works

```
Browser → Mock API Server → External API
         (adds CORS headers)
```

1. Your frontend makes a request to the Mock API Server
2. Server forwards the request to the external API
3. Server receives the response and adds CORS headers
4. Response is sent back to your frontend with CORS enabled

## Basic Configuration

### Enable Proxy

```env
PROXY_ENABLED=true
PROXY_TIMEOUT=5000
PROXY_RETRIES=2
```

### Simple Proxy Request

```bash
# Using query parameter
curl "http://localhost:3000/proxy?url=https://api.github.com/users/octocat"
```

### JavaScript Example

```javascript
// Without proxy (CORS error)
fetch('https://api.github.com/users/octocat')
  .then(res => res.json())
  .catch(err => console.error('CORS error:', err));

// With proxy (works!)
fetch('http://localhost:3000/proxy?url=https://api.github.com/users/octocat')
  .then(res => res.json())
  .then(data => console.log(data));
```

## Named Proxy Routes

Named routes provide cleaner URLs and better organization.

### Configuration

```env
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com,github:https://api.github.com,weather:https://api.openweathermap.org
```

### Usage

```bash
# Instead of:
curl "http://localhost:3000/proxy?url=https://jsonplaceholder.typicode.com/posts/1"

# Use:
curl "http://localhost:3000/proxy/jsonplaceholder/posts/1"
```

### JavaScript Example

```javascript
// Fetch GitHub user
fetch('http://localhost:3000/proxy/github/users/octocat')
  .then(res => res.json())
  .then(user => console.log(user));

// Fetch posts
fetch('http://localhost:3000/proxy/jsonplaceholder/posts')
  .then(res => res.json())
  .then(posts => console.log(posts));

// Weather API
fetch('http://localhost:3000/proxy/weather/data/2.5/weather?q=London&appid=YOUR_KEY')
  .then(res => res.json())
  .then(weather => console.log(weather));
```

### Path Rewriting

Named routes automatically handle path rewriting:

```
/proxy/jsonplaceholder/posts/1 → https://jsonplaceholder.typicode.com/posts/1
/proxy/github/repos/user/repo → https://api.github.com/repos/user/repo
```

## Domain Filtering

Control which domains can be proxied for security.

### Allow Specific Domains

```env
PROXY_ALLOWED_DOMAINS=api.github.com,jsonplaceholder.typicode.com,api.openweathermap.org
```

Only requests to these domains will be allowed.

### Block Specific Domains

```env
PROXY_BLOCKED_DOMAINS=malicious.com,spam-api.com,untrusted.com
```

Requests to these domains will be rejected.

### Combined Filtering

```env
# Allow specific domains
PROXY_ALLOWED_DOMAINS=api.github.com,*.mycompany.com

# Block specific subdomains
PROXY_BLOCKED_DOMAINS=internal.mycompany.com,admin.mycompany.com
```

### Wildcard Support

```env
# Allow all subdomains
PROXY_ALLOWED_DOMAINS=*.github.com,*.googleapis.com

# Block all subdomains
PROXY_BLOCKED_DOMAINS=*.malicious.com
```

## Authentication

Forward authentication to external APIs.

### Bearer Token

```javascript
fetch('http://localhost:3000/proxy/api/protected', {
  headers: {
    'Authorization': 'Bearer external-api-token'
  }
})
```

The `Authorization` header is forwarded to the external API.

### API Key in Header

```javascript
fetch('http://localhost:3000/proxy/api/data', {
  headers: {
    'X-API-Key': 'your-api-key'
  }
})
```

### API Key in Query String

```javascript
fetch('http://localhost:3000/proxy/weather/data?appid=YOUR_KEY')
```

Query parameters are preserved and forwarded.

### Basic Authentication

```javascript
fetch('http://localhost:3000/proxy/api/secure', {
  headers: {
    'Authorization': 'Basic ' + btoa('username:password')
  }
})
```

### Multiple Authentication Methods

```env
# Configure different auth for different routes
PROXY_ROUTES=api1:https://api1.com,api2:https://api2.com

# In your code, use different headers per route
fetch('http://localhost:3000/proxy/api1/data', {
  headers: { 'Authorization': 'Bearer token1' }
})

fetch('http://localhost:3000/proxy/api2/data', {
  headers: { 'X-API-Key': 'key2' }
})
```

## Advanced Configuration

### Timeout Configuration

```env
# Set timeout for slow APIs (milliseconds)
PROXY_TIMEOUT=10000

# Disable timeout (not recommended)
PROXY_TIMEOUT=0
```

### Retry Configuration

```env
# Number of retries on failure
PROXY_RETRIES=3

# Disable retries
PROXY_RETRIES=0
```

The server uses exponential backoff for retries:
- 1st retry: immediate
- 2nd retry: 1 second delay
- 3rd retry: 2 seconds delay

### Custom Headers

Forward custom headers to external APIs:

```javascript
fetch('http://localhost:3000/proxy/api/data', {
  headers: {
    'X-Custom-Header': 'value',
    'X-Request-ID': 'req-123',
    'User-Agent': 'MyApp/1.0'
  }
})
```

Most headers are forwarded automatically, except:
- `Host`
- `Connection`
- `Content-Length` (recalculated)
- CORS headers (added by server)

### Request Methods

All HTTP methods are supported:

```javascript
// GET
fetch('http://localhost:3000/proxy/api/users')

// POST
fetch('http://localhost:3000/proxy/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' })
})

// PUT
fetch('http://localhost:3000/proxy/api/users/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Jane' })
})

// DELETE
fetch('http://localhost:3000/proxy/api/users/1', {
  method: 'DELETE'
})

// PATCH
fetch('http://localhost:3000/proxy/api/users/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'new@example.com' })
})
```

## Use Cases

### 1. Development with Third-Party APIs

```javascript
// GitHub API without CORS issues
const fetchGitHubUser = async (username) => {
  const response = await fetch(
    `http://localhost:3000/proxy/github/users/${username}`
  );
  return response.json();
};

// Use in your app
fetchGitHubUser('octocat').then(user => {
  console.log(user.name, user.bio);
});
```

### 2. Testing External APIs

```javascript
// Test different API endpoints
const testAPI = async () => {
  const endpoints = [
    '/proxy/jsonplaceholder/posts',
    '/proxy/jsonplaceholder/users',
    '/proxy/jsonplaceholder/comments'
  ];
  
  for (const endpoint of endpoints) {
    const response = await fetch(`http://localhost:3000${endpoint}`);
    console.log(`${endpoint}: ${response.status}`);
  }
};
```

### 3. Aggregating Multiple APIs

```javascript
// Fetch data from multiple sources
const fetchDashboardData = async () => {
  const [users, posts, weather] = await Promise.all([
    fetch('http://localhost:3000/proxy/api1/users').then(r => r.json()),
    fetch('http://localhost:3000/proxy/api2/posts').then(r => r.json()),
    fetch('http://localhost:3000/proxy/weather/current').then(r => r.json())
  ]);
  
  return { users, posts, weather };
};
```

### 4. API Migration Testing

```javascript
// Compare old vs new API
const compareAPIs = async () => {
  const [oldData, newData] = await Promise.all([
    fetch('http://localhost:3000/proxy/old-api/data').then(r => r.json()),
    fetch('http://localhost:3000/proxy/new-api/data').then(r => r.json())
  ]);
  
  console.log('Differences:', diff(oldData, newData));
};
```

### 5. Rate Limit Bypass (Development Only)

```javascript
// Make multiple requests without hitting API rate limits
// (Server can cache responses)
const fetchMultiple = async (ids) => {
  const promises = ids.map(id =>
    fetch(`http://localhost:3000/proxy/api/items/${id}`)
  );
  return Promise.all(promises);
};
```

## Troubleshooting

### Issue: 403 Forbidden - Domain Not Allowed

**Error:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Domain not allowed for proxying"
  }
}
```

**Solution:**
Add the domain to `PROXY_ALLOWED_DOMAINS`:
```env
PROXY_ALLOWED_DOMAINS=api.example.com,other-api.com
```

### Issue: 502 Bad Gateway - Connection Timeout

**Error:**
```json
{
  "error": {
    "code": "BAD_GATEWAY",
    "message": "Unable to reach external API"
  }
}
```

**Solutions:**
1. Increase timeout:
```env
PROXY_TIMEOUT=15000
```

2. Check if external API is accessible:
```bash
curl https://api.external.com
```

3. Check firewall/network settings

### Issue: 401 Unauthorized from External API

**Error:**
```json
{
  "error": "Unauthorized"
}
```

**Solution:**
Ensure you're forwarding authentication:
```javascript
fetch('http://localhost:3000/proxy/api/data', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
```

### Issue: CORS Still Not Working

**Checklist:**
1. ✅ Proxy is enabled: `PROXY_ENABLED=true`
2. ✅ Domain is allowed in `PROXY_ALLOWED_DOMAINS`
3. ✅ Using correct proxy URL format
4. ✅ CORS origins include your frontend: `CORS_ORIGINS=http://localhost:3000`
5. ✅ Browser cache cleared

### Issue: Slow Proxy Responses

**Solutions:**
1. Check external API response time:
```bash
time curl https://api.external.com/endpoint
```

2. Reduce retries for faster failures:
```env
PROXY_RETRIES=1
```

3. Implement caching (future feature)

### Issue: Large Response Bodies

**Error:**
```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE"
  }
}
```

**Solution:**
The server has a default limit. For large responses, consider:
1. Paginating requests
2. Filtering data at the source
3. Using streaming (future feature)

## Best Practices

### Development

1. **Use Named Routes**: Cleaner and easier to maintain
```env
PROXY_ROUTES=api:https://api.example.com
```

2. **Restrict Domains**: Only allow necessary domains
```env
PROXY_ALLOWED_DOMAINS=api.example.com,cdn.example.com
```

3. **Set Reasonable Timeouts**: Balance between patience and responsiveness
```env
PROXY_TIMEOUT=5000
```

4. **Enable Retries**: Handle transient failures
```env
PROXY_RETRIES=2
```

### Production

⚠️ **Warning**: The proxy is designed for development. For production:

1. **Don't use the proxy** - Configure proper CORS on your APIs
2. **If you must use it**:
   - Strictly limit allowed domains
   - Enable authentication
   - Enable rate limiting
   - Monitor for abuse
   - Use HTTPS
   - Set up proper logging

```env
# Production proxy config (if absolutely necessary)
PROXY_ENABLED=true
PROXY_ALLOWED_DOMAINS=trusted-api.com
PROXY_BLOCKED_DOMAINS=*
PROXY_TIMEOUT=3000
PROXY_RETRIES=1
AUTH_ENABLED=true
RATE_LIMIT_ENABLED=true
```

### Security

1. **Never proxy untrusted domains**
2. **Don't forward sensitive headers** (server filters automatically)
3. **Validate external API responses**
4. **Monitor proxy usage**
5. **Use authentication** to prevent abuse

## Examples Repository

Check the `examples/` directory for complete working examples:

- `examples/proxy-basic.html` - Basic proxy usage
- `examples/proxy-auth.html` - Authenticated requests
- `examples/proxy-multiple.html` - Multiple API aggregation
- `examples/proxy-react.jsx` - React integration
- `examples/proxy-vue.vue` - Vue integration
