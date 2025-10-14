# Security Configuration Guide

Comprehensive guide for securing your Mock API Server in different environments.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication Methods](#authentication-methods)
- [CORS Configuration](#cors-configuration)
- [Rate Limiting](#rate-limiting)
- [Environment-Specific Security](#environment-specific-security)
- [Best Practices](#best-practices)
- [Security Checklist](#security-checklist)

## Security Overview

The Mock API Server supports multiple security layers:

1. **Authentication**: Control who can access your server
2. **CORS**: Control which origins can make requests
3. **Rate Limiting**: Prevent abuse and DoS attacks
4. **Request Validation**: Validate and sanitize inputs
5. **Logging**: Monitor and audit access

### Security Levels

| Environment | Security Level | Use Case |
|-------------|---------------|----------|
| Development | Relaxed | Local development, testing |
| Staging | Moderate | Team testing, demos |
| Production | Strict | Public-facing, production use |

## Authentication Methods

### 1. Disabled Authentication

**Use Case**: Local development only

**Configuration:**
```env
AUTH_ENABLED=false
```

**Security Level**: ⚠️ None

**Pros:**
- No setup required
- Fast development

**Cons:**
- No access control
- Anyone can access

**When to Use:**
- Local development only
- Never expose to network

### 2. Dev Token Mode

**Use Case**: Development, AI Studio, simple testing

**Configuration:**
```env
AUTH_ENABLED=false
AUTH_TYPE=dev-token
DEV_TOKEN=your-simple-token-here
```

**Security Level**: ⚠️ Low

**Usage:**
```bash
curl -H "Authorization: Bearer your-simple-token-here" \
  http://localhost:3000/api/users
```

**Pros:**
- Simple to configure
- Works with AI Studio
- Easy to share with team

**Cons:**
- Token is static
- No expiration
- Easy to leak

**When to Use:**
- Development environments
- AI Studio integration
- Quick prototypes
- Team testing

**Security Tips:**
- Use a random, unique token
- Don't use in production
- Rotate regularly
- Don't commit to git

### 3. Bypass Mode

**Use Case**: AI Studio, automated testing

**Configuration:**
```env
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow
```

**Security Level**: ⚠️ Very Low

**Usage:**
```bash
curl -H "X-Dev-Bypass: allow" \
  http://localhost:3000/api/users
```

**Pros:**
- Simplest configuration
- No token management
- Easy for automation

**Cons:**
- Minimal security
- Easy to bypass

**When to Use:**
- AI Studio only
- Automated testing
- Never in production

### 4. HTTP Basic Authentication

**Use Case**: Simple production, internal tools

**Configuration:**
```env
AUTH_ENABLED=true
AUTH_TYPE=basic
BASIC_USERNAME=admin
BASIC_PASSWORD=secure-password-here
```

**Security Level**: ⚡ Medium

**Usage:**
```bash
curl -u admin:secure-password-here \
  http://localhost:3000/api/users
```

**Pros:**
- Simple to implement
- Widely supported
- No token management

**Cons:**
- Credentials in every request
- No expiration
- Base64 encoded (not encrypted)

**When to Use:**
- Internal tools
- Simple production APIs
- Behind HTTPS only

**Security Tips:**
- Always use HTTPS
- Use strong passwords
- Rotate credentials regularly
- Consider IP whitelisting

### 5. JWT Authentication

**Use Case**: Production, scalable applications

**Configuration:**
```env
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=your-very-secure-secret-key-min-32-chars
JWT_EXPIRY=1h
```

**Security Level**: ✅ High

**Usage:**
```bash
# Get token (implement your own auth endpoint)
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users
```

**Pros:**
- Stateless
- Scalable
- Expiration support
- Industry standard

**Cons:**
- More complex setup
- Requires token management
- Need auth endpoint

**When to Use:**
- Production environments
- Scalable applications
- Multiple services
- Mobile apps

**Security Tips:**
- Use strong secret (min 32 chars)
- Rotate secrets regularly
- Set appropriate expiry
- Implement refresh tokens
- Store secret securely (env vars, secrets manager)

## CORS Configuration

### Development CORS

**Configuration:**
```env
CORS_ORIGINS=*
CORS_CREDENTIALS=true
```

**Security Level**: ⚠️ Permissive

**When to Use:**
- Local development
- Testing from any origin

### Staging CORS

**Configuration:**
```env
CORS_ORIGINS=https://staging.app.com,https://test.app.com
CORS_CREDENTIALS=true
```

**Security Level**: ⚡ Moderate

**When to Use:**
- Team testing
- Staging environments

### Production CORS

**Configuration:**
```env
CORS_ORIGINS=https://app.com,https://www.app.com
CORS_CREDENTIALS=true
```

**Security Level**: ✅ Strict

**When to Use:**
- Production environments
- Public-facing APIs

### Multiple Origins

```env
# Comma-separated list
CORS_ORIGINS=https://app.com,https://admin.app.com,https://mobile.app.com
```

### Wildcard Subdomains

```env
# Allow all subdomains (use with caution)
CORS_ORIGINS=https://*.app.com
```

### CORS with Credentials

```env
# Allow cookies and auth headers
CORS_CREDENTIALS=true

# Note: Cannot use * with credentials
CORS_ORIGINS=https://app.com
```

## Rate Limiting

### Development Rate Limiting

**Configuration:**
```env
RATE_LIMIT_ENABLED=false
```

**When to Use:**
- Local development
- No rate limits needed

### Moderate Rate Limiting

**Configuration:**
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # 1000 requests per window
RATE_LIMIT_SKIP_SUCCESSFUL=false
```

**When to Use:**
- Staging environments
- Internal tools
- Trusted users

### Strict Rate Limiting

**Configuration:**
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # 100 requests per window
RATE_LIMIT_SKIP_SUCCESSFUL=false
```

**When to Use:**
- Production environments
- Public APIs
- Untrusted users

### Custom Rate Limits

```env
# Very strict (API with heavy operations)
RATE_LIMIT_WINDOW=3600000  # 1 hour
RATE_LIMIT_MAX=50          # 50 requests per hour

# Lenient (high-traffic API)
RATE_LIMIT_WINDOW=60000    # 1 minute
RATE_LIMIT_MAX=1000        # 1000 requests per minute
```

### Skip Successful Requests

```env
# Only count failed requests
RATE_LIMIT_SKIP_SUCCESSFUL=true
```

Useful for:
- Penalizing failed auth attempts
- Allowing unlimited successful requests

## Environment-Specific Security

### Development Environment

**File**: `.env.local`

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Authentication - Disabled or Dev Token
AUTH_ENABLED=false
AUTH_TYPE=dev-token
DEV_TOKEN=dev-12345

# CORS - Permissive
CORS_ORIGINS=*
CORS_CREDENTIALS=true

# Rate Limiting - Disabled
RATE_LIMIT_ENABLED=false

# Logging - Verbose
LOG_LEVEL=debug
LOG_FORMAT=simple

# Admin - Enabled
ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=false
```

**Security Level**: ⚠️ Low (Development Only)

### Staging Environment

**File**: `.env.staging`

```env
# Server
NODE_ENV=staging
PORT=8080
HOST=0.0.0.0

# Authentication - Dev Token or Basic
AUTH_ENABLED=true
AUTH_TYPE=basic
BASIC_USERNAME=staging-user
BASIC_PASSWORD=staging-secure-password

# CORS - Restricted
CORS_ORIGINS=https://staging.app.com,https://test.app.com
CORS_CREDENTIALS=true

# Rate Limiting - Moderate
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=500

# Logging - Info
LOG_LEVEL=info
LOG_FORMAT=json

# Admin - Enabled with Auth
ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=true
```

**Security Level**: ⚡ Medium (Internal Use)

### Production Environment

**File**: `.env.production`

```env
# Server
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Authentication - JWT
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=your-very-secure-secret-key-min-32-chars-random
JWT_EXPIRY=1h

# CORS - Strict
CORS_ORIGINS=https://app.com,https://www.app.com
CORS_CREDENTIALS=true

# Rate Limiting - Strict
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Proxy - Restricted
PROXY_ENABLED=true
PROXY_ALLOWED_DOMAINS=trusted-api.com,partner-api.com
PROXY_BLOCKED_DOMAINS=*

# Logging - Production
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE=./logs/production.log

# Admin - Disabled or Restricted
ADMIN_ENABLED=false
# Or if needed:
# ADMIN_ENABLED=true
# ADMIN_AUTH_REQUIRED=true
```

**Security Level**: ✅ High (Production Ready)

## Best Practices

### 1. Secret Management

**❌ Don't:**
```env
# Weak secret
JWT_SECRET=secret

# Default password
BASIC_PASSWORD=password

# Committed to git
# .env file in repository
```

**✅ Do:**
```env
# Strong secret (32+ chars, random)
JWT_SECRET=8f7d6e5c4b3a2918f7d6e5c4b3a2918f7d6e5c4b3a291

# Strong password
BASIC_PASSWORD=X9$mK2#pL5@nQ8&rT3

# Use .env.example for templates
# Add .env to .gitignore
```

**Generate Strong Secrets:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

### 2. HTTPS/TLS

**❌ Don't:**
- Use HTTP in production
- Send credentials over HTTP
- Disable certificate validation

**✅ Do:**
- Always use HTTPS in production
- Use valid SSL certificates
- Enable HSTS headers
- Redirect HTTP to HTTPS

**Example with nginx:**
```nginx
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### 3. Credential Rotation

**Schedule:**
- JWT secrets: Every 90 days
- Passwords: Every 90 days
- Dev tokens: Every 30 days
- API keys: Every 180 days

**Process:**
1. Generate new credentials
2. Update configuration
3. Deploy changes
4. Invalidate old credentials
5. Monitor for issues

### 4. Monitoring and Logging

**What to Log:**
- Authentication attempts (success/failure)
- Rate limit violations
- CORS violations
- Admin endpoint access
- Proxy requests
- Errors and exceptions

**What NOT to Log:**
- Passwords
- JWT secrets
- Full tokens
- Sensitive user data

**Example Log Entry:**
```json
{
  "timestamp": "2024-10-14T12:00:00Z",
  "level": "warn",
  "event": "auth_failure",
  "ip": "192.168.1.100",
  "endpoint": "/api/users",
  "reason": "invalid_token"
}
```

### 5. IP Whitelisting

For internal tools, consider IP whitelisting:

```javascript
// In your middleware
const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];

if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip)) {
  return res.status(403).json({
    error: 'IP not allowed'
  });
}
```

### 6. Request Validation

**Validate:**
- Content-Type headers
- Request body size
- JSON structure
- Query parameters
- URL paths

**Example:**
```env
# Limit request body size
MAX_REQUEST_SIZE=10mb

# Limit URL length
MAX_URL_LENGTH=2048
```

### 7. Security Headers

Add security headers to responses:

```javascript
// Helmet.js or custom middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## Security Checklist

### Development

- [ ] Authentication disabled or dev-token mode
- [ ] CORS set to `*` or localhost
- [ ] Rate limiting disabled
- [ ] Debug logging enabled
- [ ] Admin endpoints enabled
- [ ] `.env` file in `.gitignore`
- [ ] Not exposed to public internet

### Staging

- [ ] Basic or JWT authentication enabled
- [ ] CORS restricted to staging domains
- [ ] Moderate rate limiting enabled
- [ ] Info-level logging
- [ ] Admin endpoints require auth
- [ ] HTTPS enabled
- [ ] Secrets not committed to git

### Production

- [ ] JWT authentication enabled
- [ ] Strong JWT secret (32+ chars)
- [ ] CORS restricted to production domains
- [ ] Strict rate limiting enabled
- [ ] Warn/error-level logging
- [ ] Admin endpoints disabled or heavily restricted
- [ ] HTTPS with valid certificate
- [ ] HSTS enabled
- [ ] Security headers configured
- [ ] Secrets in environment variables or secrets manager
- [ ] Monitoring and alerting configured
- [ ] Regular security audits scheduled
- [ ] Credential rotation policy in place
- [ ] Backup and disaster recovery plan
- [ ] DDoS protection (Cloudflare, AWS Shield, etc.)

## Common Security Mistakes

### 1. Using Weak Secrets

**❌ Bad:**
```env
JWT_SECRET=secret
JWT_SECRET=12345
JWT_SECRET=myapp
```

**✅ Good:**
```env
JWT_SECRET=8f7d6e5c4b3a2918f7d6e5c4b3a2918f7d6e5c4b3a291
```

### 2. Exposing Sensitive Data

**❌ Bad:**
```javascript
// Returning full config including secrets
app.get('/admin/config', (req, res) => {
  res.json(config);
});
```

**✅ Good:**
```javascript
// Hiding sensitive data
app.get('/admin/config', (req, res) => {
  const safeConfig = { ...config };
  delete safeConfig.jwtSecret;
  delete safeConfig.passwords;
  res.json(safeConfig);
});
```

### 3. No Rate Limiting

**❌ Bad:**
```env
RATE_LIMIT_ENABLED=false
```

**✅ Good:**
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
```

### 4. Permissive CORS in Production

**❌ Bad:**
```env
CORS_ORIGINS=*
```

**✅ Good:**
```env
CORS_ORIGINS=https://app.com,https://www.app.com
```

### 5. No HTTPS

**❌ Bad:**
```
http://api.example.com
```

**✅ Good:**
```
https://api.example.com
```

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CORS Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Getting Help

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security concerns to your team lead
3. Include detailed description and reproduction steps
4. Allow time for fix before public disclosure
