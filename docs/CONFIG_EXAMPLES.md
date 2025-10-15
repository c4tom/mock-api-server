# Configuration Examples

This document provides example configurations for different use cases and environments.

## Table of Contents

- [Development Environments](#development-environments)
- [Production Environments](#production-environments)
- [AI Studio / Cloud IDE Setup](#ai-studio--cloud-ide-setup)
- [Specific Use Cases](#specific-use-cases)

## Development Environments

### Local Development (No Authentication)

Perfect for solo development with no security concerns:

```env
NODE_ENV=development
PORT=3000
HOST=localhost

AUTH_ENABLED=false
CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true
DEFAULT_DELAY=0

PROXY_ENABLED=true
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com

LOG_LEVEL=debug
LOG_FORMAT=simple

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=false
```

### Team Development (Dev Token)

For team environments where you want minimal auth:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=dev-token
DEV_TOKEN=team-dev-token-2024

CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
RATE_LIMIT_ENABLED=false

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true

PROXY_ENABLED=true
PROXY_ROUTES=api:https://staging-api.company.com
PROXY_ALLOWED_DOMAINS=staging-api.company.com

LOG_LEVEL=info
LOG_FORMAT=simple

ADMIN_ENABLED=true
```

### Frontend Development with Multiple Services

When working with multiple frontend apps and services:

```env
NODE_ENV=development
PORT=3000
HOST=localhost

AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:4200
CORS_CREDENTIALS=true

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true
DEFAULT_DELAY=50

PROXY_ENABLED=true
PROXY_TIMEOUT=10000
PROXY_ROUTES=users:https://api.users.dev,posts:https://api.posts.dev,auth:https://api.auth.dev
PROXY_ALLOWED_DOMAINS=api.users.dev,api.posts.dev,api.auth.dev

LOG_LEVEL=debug
LOG_FORMAT=simple

ADMIN_ENABLED=true
```

## Production Environments

### Production with JWT Authentication

Standard production setup with JWT:

```env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRY=1h
JWT_ALGORITHM=HS256

CORS_ORIGINS=https://app.company.com,https://admin.company.com
CORS_CREDENTIALS=true

RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

SUSPICIOUS_ACTIVITY_ENABLED=true
SUSPICIOUS_ACTIVITY_THRESHOLD=10

MOCK_DATA_PATH=./data/production
ENABLE_CRUD=false
DEFAULT_DELAY=100

PROXY_ENABLED=true
PROXY_TIMEOUT=10000
PROXY_RETRIES=3
PROXY_ROUTES=api:https://api.company.com
PROXY_ALLOWED_DOMAINS=api.company.com
PROXY_BLOCKED_DOMAINS=malicious.com,spam.com

LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=./logs/app.log

ADMIN_ENABLED=false

HELMET_ENABLED=true
HSTS_ENABLED=true
```

### Production with HTTP Basic Auth

For simpler production setups or internal tools:

```env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=basic
BASIC_USERNAME=admin
BASIC_PASSWORD=REPLACE_WITH_STRONG_PASSWORD

CORS_ORIGINS=https://internal-tool.company.com
CORS_CREDENTIALS=true

RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=200

MOCK_DATA_PATH=./data/production
ENABLE_CRUD=false

PROXY_ENABLED=true
PROXY_ROUTES=internal:https://internal-api.company.com
PROXY_ALLOWED_DOMAINS=internal-api.company.com

LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE=./logs/app.log

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=true
```

### High-Security Production

Maximum security for sensitive environments:

```env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_SECRET_64_CHARS_MIN
JWT_EXPIRY=30m
JWT_ALGORITHM=HS256

CORS_ORIGINS=https://secure-app.company.com
CORS_CREDENTIALS=true

RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=600000
RATE_LIMIT_MAX=50
RATE_LIMIT_SKIP_SUCCESSFUL=false
RATE_LIMIT_BLOCK_DURATION=7200000

SUSPICIOUS_ACTIVITY_ENABLED=true
SUSPICIOUS_ACTIVITY_THRESHOLD=5
SUSPICIOUS_ACTIVITY_BLOCK_DURATION=14400000

MOCK_DATA_PATH=./data/production
ENABLE_CRUD=false
DEFAULT_DELAY=200

PROXY_ENABLED=true
PROXY_TIMEOUT=5000
PROXY_RETRIES=2
PROXY_ROUTES=secure:https://secure-api.company.com
PROXY_ALLOWED_DOMAINS=secure-api.company.com
PROXY_BLOCKED_DOMAINS=*

LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=30

ADMIN_ENABLED=false

HELMET_ENABLED=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000

MAX_REQUEST_SIZE=524288
VALIDATE_CONTENT_TYPE=true
REJECT_INVALID_JSON=true
```

## AI Studio / Cloud IDE Setup

### AI Studio with Bypass Mode

Easiest setup for AI Studio:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow-ai-studio

CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true

PROXY_ENABLED=true
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com,github:https://api.github.com
PROXY_ALLOWED_DOMAINS=jsonplaceholder.typicode.com,api.github.com,httpbin.org

LOG_LEVEL=info
LOG_FORMAT=simple

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=false
```

**AI Studio Configuration:**
Add custom header: `X-Dev-Bypass: allow-ai-studio`

### AI Studio with Dev Token

Alternative with simple token:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=dev-token
DEV_TOKEN=ai-studio-token-123

CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true

PROXY_ENABLED=true
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com
PROXY_ALLOWED_DOMAINS=jsonplaceholder.typicode.com

LOG_LEVEL=info
LOG_FORMAT=simple

ADMIN_ENABLED=true
```

**AI Studio Configuration:**
Add authorization header: `Authorization: Bearer ai-studio-token-123`

### Cloud IDE (Gitpod, CodeSandbox, etc.)

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

AUTH_ENABLED=false
CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true
DEFAULT_DELAY=0

PROXY_ENABLED=true
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com,github:https://api.github.com
PROXY_ALLOWED_DOMAINS=*

LOG_LEVEL=debug
LOG_FORMAT=simple

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=false

HOT_RELOAD=true
PRETTY_ERRORS=true
```

## Specific Use Cases

### Mock API Only (No Proxy)

When you only need mock data:

```env
NODE_ENV=development
PORT=3000
HOST=localhost

AUTH_ENABLED=false
CORS_ORIGINS=*

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true
DEFAULT_DELAY=0

PROXY_ENABLED=false

LOG_LEVEL=info
LOG_FORMAT=simple

ADMIN_ENABLED=true
```

### Proxy Only (No Mock Data)

When you only need CORS proxy:

```env
NODE_ENV=development
PORT=3000
HOST=localhost

AUTH_ENABLED=false
CORS_ORIGINS=*

MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=false

PROXY_ENABLED=true
PROXY_TIMEOUT=10000
PROXY_RETRIES=3
PROXY_ROUTES=api1:https://api1.com,api2:https://api2.com,api3:https://api3.com
PROXY_ALLOWED_DOMAINS=api1.com,api2.com,api3.com

LOG_LEVEL=info
LOG_FORMAT=simple

ADMIN_ENABLED=true
```

### Testing Environment

For automated testing:

```env
NODE_ENV=test
PORT=3001
HOST=localhost

AUTH_ENABLED=false
CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false

MOCK_DATA_PATH=./data/test
ENABLE_CRUD=true
DEFAULT_DELAY=0

PROXY_ENABLED=true
PROXY_TIMEOUT=5000
PROXY_ROUTES=test:https://httpbin.org
PROXY_ALLOWED_DOMAINS=httpbin.org

LOG_LEVEL=error
LOG_FORMAT=simple

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=false
```

### Staging Environment

Pre-production testing:

```env
NODE_ENV=staging
PORT=8080
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=STAGING_SECRET_KEY_REPLACE_ME
JWT_EXPIRY=2h

CORS_ORIGINS=https://staging.company.com,https://staging-admin.company.com
CORS_CREDENTIALS=true

RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=500

MOCK_DATA_PATH=./data/staging
ENABLE_CRUD=true
DEFAULT_DELAY=50

PROXY_ENABLED=true
PROXY_ROUTES=api:https://staging-api.company.com
PROXY_ALLOWED_DOMAINS=staging-api.company.com

LOG_LEVEL=debug
LOG_FORMAT=json
LOG_FILE=./logs/staging.log

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=true
```

### Demo Environment

For product demos:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

AUTH_ENABLED=true
AUTH_TYPE=dev-token
DEV_TOKEN=demo-access-2024

CORS_ORIGINS=*
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

MOCK_DATA_PATH=./data/demo
ENABLE_CRUD=true
DEFAULT_DELAY=100

PROXY_ENABLED=false

LOG_LEVEL=info
LOG_FORMAT=simple
LOG_FILE=./logs/demo.log

ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=false
```

## Migration Guides

### From Development to Staging

Changes needed:
1. Change `NODE_ENV` to `staging`
2. Enable authentication (`AUTH_ENABLED=true`)
3. Set specific CORS origins
4. Enable rate limiting
5. Update proxy routes to staging APIs
6. Change log level to `info` or `debug`
7. Enable admin authentication

### From Staging to Production

Changes needed:
1. Change `NODE_ENV` to `production`
2. Generate new, secure `JWT_SECRET`
3. Restrict CORS origins to production domains
4. Lower rate limits for stricter control
5. Update proxy routes to production APIs
6. Change log level to `warn` or `info`
7. Disable admin endpoints or require strong auth
8. Enable all security features (HELMET, HSTS)
9. Set `ENABLE_CRUD=false` for mock data
10. Review and update all secrets and passwords

## Security Checklist

Before deploying to production:

- [ ] Changed all default secrets and passwords
- [ ] Generated cryptographically secure JWT secret (min 32 chars)
- [ ] Restricted CORS origins to specific domains
- [ ] Enabled rate limiting with appropriate limits
- [ ] Enabled suspicious activity detection
- [ ] Disabled or secured admin endpoints
- [ ] Set appropriate log level (warn or info)
- [ ] Enabled security headers (HELMET, HSTS)
- [ ] Reviewed and validated proxy allowed domains
- [ ] Set ENABLE_CRUD=false for production mock data
- [ ] Configured proper log rotation
- [ ] Tested authentication flows
- [ ] Verified HTTPS/TLS is enabled
- [ ] Reviewed all environment variables
- [ ] Documented any custom configurations

## Tips

1. **Use .env.example**: Create a `.env.example` file with dummy values as a template
2. **Never commit secrets**: Add `.env` to `.gitignore`
3. **Use environment-specific files**: Keep `.env.local`, `.env.staging`, `.env.production` separate
4. **Validate on startup**: The server validates configuration on startup
5. **Test configurations**: Use the health endpoint to verify settings
6. **Monitor logs**: Watch logs after configuration changes
7. **Use hot reload**: Use `/admin/reload` to test config changes without restart
8. **Document custom settings**: Add comments in your .env files
9. **Rotate secrets regularly**: Change JWT secrets and passwords periodically
10. **Use strong secrets**: Generate secrets with `openssl rand -base64 32`
