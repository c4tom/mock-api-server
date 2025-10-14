# Troubleshooting Guide

Common issues and solutions for the Mock API Server.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [CORS Issues](#cors-issues)
- [Rate Limiting Issues](#rate-limiting-issues)
- [Proxy Issues](#proxy-issues)
- [Configuration Issues](#configuration-issues)
- [Performance Issues](#performance-issues)
- [Logging Issues](#logging-issues)

## Authentication Issues

### Issue: 401 Unauthorized - Token Invalid

**Symptoms:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Possible Causes:**
1. Token is expired (JWT)
2. Token format is incorrect
3. Wrong authentication type configured
4. Token doesn't match configured value

**Solutions:**

**For Dev Token:**
```env
# Check configuration
AUTH_TYPE=dev-token
DEV_TOKEN=dev-12345

# Ensure request matches
curl -H "Authorization: Bearer dev-12345" http://localhost:3000/api/users
```

**For JWT:**
```bash
# Check token expiry
# Decode JWT at jwt.io or:
node -e "console.log(JSON.parse(Buffer.from('YOUR_TOKEN'.split('.')[1], 'base64')))"

# Generate new token if expired
```

**For Basic Auth:**
```bash
# Verify credentials
curl -u username:password http://localhost:3000/api/users

# Check base64 encoding
echo -n "username:password" | base64
```

### Issue: 401 Unauthorized - Missing Authentication

**Symptoms:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Solutions:**

1. **Check if auth is enabled:**
```env
AUTH_ENABLED=true  # or false
```

2. **Add authentication header:**
```bash
# Dev token
curl -H "Authorization: Bearer dev-12345" http://localhost:3000/api/users

# Bypass mode
curl -H "X-Dev-Bypass: allow" http://localhost:3000/api/users
```

3. **Disable auth for development:**
```env
AUTH_ENABLED=false
```

### Issue: Authentication Works Locally But Not in AI Studio

**Symptoms:**
- Works with curl/Postman
- Fails in AI Studio or similar tools

**Solutions:**

1. **Use Bypass Mode (Easiest):**
```env
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow
```

Configure AI Studio to send header: `X-Dev-Bypass: allow`

2. **Use Dev Token:**
```env
AUTH_TYPE=dev-token
DEV_TOKEN=simple-token-123
```

Configure AI Studio to send: `Authorization: Bearer simple-token-123`

3. **Disable Authentication:**
```env
AUTH_ENABLED=false
```

## CORS Issues

### Issue: CORS Error in Browser

**Symptoms:**
```
Access to fetch at 'http://localhost:3000/api/users' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solutions:**

1. **Add origin to allowed list:**
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

2. **Use wildcard for development:**
```env
CORS_ORIGINS=*
```

3. **Check credentials setting:**
```env
# If sending cookies or auth headers
CORS_CREDENTIALS=true
```

4. **Restart server after changes:**
```bash
npm run dev
```

### Issue: CORS Works for GET but Not POST

**Symptoms:**
- GET requests work
- POST/PUT/DELETE fail with CORS error

**Solution:**

Browser sends OPTIONS preflight request first. Ensure:

```env
# Allow all methods
CORS_ORIGINS=http://localhost:5173
CORS_CREDENTIALS=true
```

Server automatically handles OPTIONS requests.

### Issue: 403 Forbidden - Origin Not Allowed

**Symptoms:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Origin not allowed"
  }
}
```

**Solutions:**

1. **Check origin in request:**
```bash
# Browser automatically sends Origin header
# Check in browser DevTools > Network > Headers
```

2. **Add origin to config:**
```env
CORS_ORIGINS=https://your-app.com,https://www.your-app.com
```

3. **Use wildcard for development:**
```env
CORS_ORIGINS=*
```

## Rate Limiting Issues

### Issue: 429 Too Many Requests

**Symptoms:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1697289600
Retry-After: 300
```

**Solutions:**

1. **Wait for rate limit reset:**
```bash
# Check Retry-After header (seconds)
# Wait and retry
```

2. **Increase rate limit:**
```env
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000
```

3. **Disable rate limiting (development):**
```env
RATE_LIMIT_ENABLED=false
```

4. **Skip successful requests:**
```env
RATE_LIMIT_SKIP_SUCCESSFUL=true
```

### Issue: Rate Limit Too Strict

**Symptoms:**
- Hitting rate limit during normal use
- Development is slow

**Solutions:**

1. **Adjust limits:**
```env
# More requests
RATE_LIMIT_MAX=500

# Longer window
RATE_LIMIT_WINDOW=3600000  # 1 hour
```

2. **Disable for development:**
```env
RATE_LIMIT_ENABLED=false
```

## Proxy Issues

### Issue: 502 Bad Gateway - Proxy Target Unreachable

**Symptoms:**
```json
{
  "error": {
    "code": "BAD_GATEWAY",
    "message": "Unable to reach external API"
  }
}
```

**Solutions:**

1. **Check target URL is accessible:**
```bash
curl https://api.external.com
```

2. **Increase timeout:**
```env
PROXY_TIMEOUT=10000
```

3. **Check network/firewall:**
- Ensure server can reach external API
- Check firewall rules
- Verify DNS resolution

4. **Enable retries:**
```env
PROXY_RETRIES=3
```

### Issue: 403 Forbidden - Domain Not Allowed

**Symptoms:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Domain not allowed for proxying"
  }
}
```

**Solutions:**

1. **Add domain to allowed list:**
```env
PROXY_ALLOWED_DOMAINS=api.github.com,jsonplaceholder.typicode.com
```

2. **Check domain spelling:**
```bash
# Correct
PROXY_ALLOWED_DOMAINS=api.github.com

# Wrong
PROXY_ALLOWED_DOMAINS=github.com  # Missing 'api.'
```

3. **Use wildcard:**
```env
PROXY_ALLOWED_DOMAINS=*.github.com
```

### Issue: Proxy Request Timeout

**Symptoms:**
- Request hangs
- Eventually times out

**Solutions:**

1. **Increase timeout:**
```env
PROXY_TIMEOUT=15000
```

2. **Check external API performance:**
```bash
time curl https://api.external.com/endpoint
```

3. **Reduce retries:**
```env
PROXY_RETRIES=1
```

### Issue: Proxy Authentication Not Working

**Symptoms:**
- External API returns 401
- Authentication header not forwarded

**Solution:**

Ensure you're sending auth header:

```javascript
fetch('http://localhost:3000/proxy/api/protected', {
  headers: {
    'Authorization': 'Bearer external-api-token'
  }
})
```

Server automatically forwards `Authorization` header.

## Configuration Issues

### Issue: Configuration Changes Not Taking Effect

**Symptoms:**
- Changed .env file
- Server still uses old values

**Solutions:**

1. **Restart server:**
```bash
# Stop server (Ctrl+C)
npm run dev
```

2. **Use admin reload:**
```bash
curl -X POST http://localhost:3000/admin/reload
```

3. **Check correct .env file:**
```bash
# Verify file exists
ls -la .env

# Check contents
cat .env
```

4. **Clear environment:**
```bash
# Unset conflicting env vars
unset AUTH_ENABLED
unset CORS_ORIGINS

# Restart server
npm run dev
```

### Issue: Server Won't Start - Configuration Invalid

**Symptoms:**
```
Error: Invalid configuration
Configuration validation failed
```

**Solutions:**

1. **Check syntax:**
```env
# Wrong
CORS_ORIGINS = *

# Correct
CORS_ORIGINS=*
```

2. **Check required values:**
```env
# Required
PORT=3000
NODE_ENV=development
```

3. **Check data types:**
```env
# Wrong
PORT=three-thousand

# Correct
PORT=3000
```

4. **Use example file:**
```bash
cp .env.example .env
```

### Issue: Mock Data Not Loading

**Symptoms:**
- 404 for mock endpoints
- Endpoints not created

**Solutions:**

1. **Check data path:**
```env
MOCK_DATA_PATH=./data
```

2. **Verify files exist:**
```bash
ls -la data/
```

3. **Check JSON syntax:**
```bash
# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('data/users.json'))"
```

4. **Check file format:**
```json
{
  "endpoint": "/api/users",
  "method": "GET",
  "response": [...]
}
```

5. **Reload configuration:**
```bash
curl -X POST http://localhost:3000/admin/reload
```

## Performance Issues

### Issue: Slow Response Times

**Symptoms:**
- Requests take several seconds
- High latency

**Solutions:**

1. **Check mock data delay:**
```json
{
  "delay": 0  // Remove artificial delay
}
```

2. **Check proxy timeout:**
```env
PROXY_TIMEOUT=5000
```

3. **Disable debug logging:**
```env
LOG_LEVEL=warn
```

4. **Check system resources:**
```bash
# CPU usage
top

# Memory usage
free -h
```

### Issue: High Memory Usage

**Symptoms:**
- Server uses excessive memory
- Out of memory errors

**Solutions:**

1. **Reduce log level:**
```env
LOG_LEVEL=error
```

2. **Limit request size:**
```env
MAX_REQUEST_SIZE=1mb
```

3. **Check for memory leaks:**
```bash
# Monitor memory
node --inspect server.js
```

4. **Restart server periodically**

## Logging Issues

### Issue: No Logs Appearing

**Symptoms:**
- No console output
- Log file empty

**Solutions:**

1. **Check log level:**
```env
LOG_LEVEL=debug  # Most verbose
```

2. **Check log format:**
```env
LOG_FORMAT=simple  # Easier to read
```

3. **Verify log file path:**
```env
LOG_FILE=./logs/app.log
```

4. **Check file permissions:**
```bash
ls -la logs/
chmod 755 logs/
```

### Issue: Too Many Logs

**Symptoms:**
- Console flooded with logs
- Log files too large

**Solutions:**

1. **Reduce log level:**
```env
LOG_LEVEL=warn  # Only warnings and errors
```

2. **Use JSON format:**
```env
LOG_FORMAT=json
```

3. **Implement log rotation:**
```bash
# Use logrotate or similar
```

## Common Error Messages

### "Port already in use"

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### "Cannot find module"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "ENOENT: no such file or directory"

**Solution:**
```bash
# Check file paths
ls -la data/

# Create missing directories
mkdir -p data logs config
```

### "EACCES: permission denied"

**Solution:**
```bash
# Fix permissions
chmod 755 data/ logs/
chmod 644 data/*.json
```

## Getting Help

If you're still experiencing issues:

1. **Check logs:**
```bash
tail -f logs/app.log
```

2. **Enable debug mode:**
```env
LOG_LEVEL=debug
```

3. **Test with curl:**
```bash
curl -v http://localhost:3000/api/users
```

4. **Check server health:**
```bash
curl http://localhost:3000/admin/health
```

5. **Review configuration:**
```bash
curl http://localhost:3000/admin/config
```

## Quick Fixes

### Reset to Defaults

```bash
# Copy example config
cp .env.example .env

# Restart server
npm run dev
```

### Development Mode (Permissive)

```env
AUTH_ENABLED=false
CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false
LOG_LEVEL=debug
ADMIN_ENABLED=true
```

### Production Mode (Secure)

```env
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=<generate-strong-secret>
CORS_ORIGINS=https://your-app.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
LOG_LEVEL=warn
ADMIN_ENABLED=false
```
