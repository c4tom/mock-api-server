# Mock API Server

A flexible backend server that can act as both a mock data server (similar to jsonplaceholder) and a CORS proxy for development. Configurable through environment files with support for different security levels.

## Features

- 🎭 **Mock Data Server**: Serve mock data through REST endpoints
- 🔄 **CORS Proxy**: Bypass CORS limitations during development
- 🔀 **Request/Response Transformation**: Transform data with field mapping, custom functions, and more
- 🔌 **WebSocket Support**: Real-time mock events and WebSocket proxying
- 🔮 **GraphQL Support**: Built-in GraphQL endpoint with playground and proxy functionality
- 🔐 **Flexible Authentication**: JWT, HTTP Basic, dev-token, or bypass modes
- 🛡️ **Security Controls**: Rate limiting, origin validation, suspicious activity detection
- 📝 **Request Logging**: Detailed logging with winston
- ⚙️ **Hot Reload**: Configuration changes without server restart
- 🎯 **Admin Endpoints**: Runtime configuration management

## Quick Start

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

### Development Mode

```bash
# Copy the development environment file
cp .env.local .env

# Start the server
npm run dev
```

The server will start on `http://localhost:3000` with relaxed security settings.

### Production Mode

```bash
# Copy the production environment file
cp .env.production .env

# Build and start
npm run build
npm start
```

## Configuration

### Environment Files

The server uses environment files for configuration:

- **`.env.local`**: Development settings (relaxed security, debug logging)
- **`.env.production`**: Production settings (strict security, structured logging)
- **`.env`**: Active configuration (copy from .env.local or .env.production)

### Core Configuration Variables

#### Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `PORT` | Server port | `3000` | `8080` |
| `HOST` | Server host | `localhost` | `0.0.0.0` |

#### Authentication Configuration

| Variable | Description | Values | Example |
|----------|-------------|--------|---------|
| `AUTH_ENABLED` | Enable authentication | `true`/`false` | `false` |
| `AUTH_TYPE` | Authentication type | `jwt`, `basic`, `dev-token`, `bypass`, `disabled` | `dev-token` |
| `JWT_SECRET` | JWT secret key | string | `your-secret-key` |
| `JWT_EXPIRY` | JWT token expiry | time string | `1h`, `24h` |
| `DEV_TOKEN` | Development token | string | `dev-12345` |
| `BYPASS_HEADER` | Bypass header name | string | `X-Dev-Bypass` |
| `BYPASS_VALUE` | Bypass header value | string | `allow` |
| `BASIC_USERNAME` | HTTP Basic username | string | `admin` |
| `BASIC_PASSWORD` | HTTP Basic password | string | `password` |

#### CORS Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `*` or `https://app.com,https://admin.app.com` |
| `CORS_CREDENTIALS` | Allow credentials | `true`/`false` |

#### Rate Limiting

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `false` | `true` |
| `RATE_LIMIT_WINDOW` | Time window (ms) | `900000` | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `1000` | `100` |
| `RATE_LIMIT_SKIP_SUCCESSFUL` | Skip successful requests | `false` | `true` |

#### Mock Data Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MOCK_DATA_PATH` | Path to mock data files | `./data/mock` | `./data/production` |
| `ENABLE_CRUD` | Enable CRUD operations | `true` | `false` |
| `DEFAULT_DELAY` | Response delay (ms) | `0` | `100` |

#### Proxy Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `PROXY_ENABLED` | Enable proxy functionality | `true` |
| `PROXY_TIMEOUT` | Request timeout (ms) | `5000` |
| `PROXY_RETRIES` | Number of retries | `2` |
| `PROXY_ROUTES` | Named proxy routes | `api1:https://api.com,api2:https://service.com` |
| `PROXY_ALLOWED_DOMAINS` | Allowed domains | `api.com,service.com` |
| `PROXY_BLOCKED_DOMAINS` | Blocked domains | `malicious.com,spam.com` |

#### Logging Configuration

| Variable | Description | Values | Example |
|----------|-------------|--------|---------|
| `LOG_LEVEL` | Logging level | `silent`, `error`, `warn`, `info`, `debug` | `debug` |
| `LOG_FORMAT` | Log format | `simple`, `json` | `simple` |
| `LOG_FILE` | Log file path | path | `./logs/app.log` |

#### Admin Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ADMIN_ENABLED` | Enable admin endpoints | `true` | `false` |
| `ADMIN_AUTH_REQUIRED` | Require auth for admin | `false` | `true` |

## Usage Examples

### Mock Data Server

Create mock data files in the configured `MOCK_DATA_PATH`:

```json
// data/mock/users.json
{
  "endpoint": "/api/users",
  "method": "GET",
  "response": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" },
    { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "statusCode": 200
}
```

Access the endpoint:
```bash
curl http://localhost:3000/api/users
```

### CORS Proxy

#### Using Named Routes

```bash
# Configure in .env
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com

# Use the proxy
curl http://localhost:3000/proxy/jsonplaceholder/posts
```

#### Using Query Parameter

```bash
curl "http://localhost:3000/proxy?url=https://api.github.com/users/octocat"
```

### Authentication

#### Dev Token Mode (Development)

```bash
# Configure in .env
AUTH_ENABLED=false
AUTH_TYPE=dev-token
DEV_TOKEN=dev-12345

# Make request with token
curl -H "Authorization: Bearer dev-12345" http://localhost:3000/api/users
```

#### Bypass Mode (AI Studio / Development)

```bash
# Configure in .env
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow

# Make request with bypass header
curl -H "X-Dev-Bypass: allow" http://localhost:3000/api/users
```

#### JWT Mode (Production)

```bash
# Configure in .env
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=your-secret-key

# Get token (implement your own auth endpoint)
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' | jq -r '.token')

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
```

#### HTTP Basic Auth (Production)

```bash
# Configure in .env
AUTH_TYPE=basic
BASIC_USERNAME=admin
BASIC_PASSWORD=secret

# Make request with basic auth
curl -u admin:secret http://localhost:3000/api/users
```

### Admin Endpoints

```bash
# Health check
curl http://localhost:3000/admin/health

# View configuration (sensitive data hidden)
curl http://localhost:3000/admin/config

# Reload configuration
curl -X POST http://localhost:3000/admin/reload
```

## AI Studio Setup

For use with AI Studio or similar environments where you can't easily manage authentication:

1. **Use Dev Token Mode**:
```env
AUTH_ENABLED=false
AUTH_TYPE=dev-token
DEV_TOKEN=simple-token-123
```

Then configure AI Studio to send:
```
Authorization: Bearer simple-token-123
```

2. **Use Bypass Mode** (even simpler):
```env
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow
```

Then configure AI Studio to send:
```
X-Dev-Bypass: allow
```

3. **Disable Authentication** (least secure):
```env
AUTH_ENABLED=false
```

## Security Considerations

### Development Environment

- ✅ Use `.env.local` configuration
- ✅ Enable dev-token or bypass mode for easy testing
- ✅ Use permissive CORS (`*`) for flexibility
- ✅ Disable rate limiting for faster development
- ✅ Enable debug logging
- ⚠️ Never expose development server to public internet

### Production Environment

- ✅ Use `.env.production` configuration
- ✅ Enable JWT or HTTP Basic authentication
- ✅ Restrict CORS to specific origins
- ✅ Enable rate limiting and suspicious activity detection
- ✅ Use structured JSON logging
- ✅ Disable admin endpoints or require authentication
- ✅ Use HTTPS/TLS in production
- ✅ Change all default secrets and passwords
- ✅ Regularly rotate JWT secrets
- ✅ Monitor logs for suspicious activity

### Best Practices

1. **Never commit `.env` files** - Use `.env.local` and `.env.production` as templates
2. **Use strong secrets** - Generate cryptographically secure secrets for JWT
3. **Rotate credentials** - Regularly update passwords and tokens
4. **Monitor logs** - Watch for authentication failures and suspicious patterns
5. **Limit CORS origins** - Only allow trusted domains in production
6. **Enable rate limiting** - Protect against abuse and DoS attacks
7. **Use HTTPS** - Always use TLS in production environments
8. **Validate inputs** - The server validates configurations, but verify your settings
9. **Principle of least privilege** - Only enable features you need

## Troubleshooting

### Authentication Issues

**Problem**: Getting 401 Unauthorized errors

**Solutions**:
- Check `AUTH_ENABLED` is set correctly
- Verify `AUTH_TYPE` matches your authentication method
- For dev-token: Ensure token matches `DEV_TOKEN` value
- For bypass: Check header name and value match configuration
- For JWT: Verify token is valid and not expired
- For basic: Check username and password are correct

### CORS Issues

**Problem**: CORS errors in browser

**Solutions**:
- Add your origin to `CORS_ORIGINS`
- Use `*` for development (not recommended for production)
- Ensure `CORS_CREDENTIALS` is set if sending cookies
- Check browser console for specific CORS error messages

### Rate Limiting

**Problem**: Getting 429 Too Many Requests

**Solutions**:
- Increase `RATE_LIMIT_MAX` value
- Increase `RATE_LIMIT_WINDOW` for longer time window
- Disable rate limiting in development: `RATE_LIMIT_ENABLED=false`
- Wait for the rate limit window to reset

### Proxy Issues

**Problem**: Proxy requests failing

**Solutions**:
- Verify target URL is in `PROXY_ALLOWED_DOMAINS`
- Check target URL is not in `PROXY_BLOCKED_DOMAINS`
- Increase `PROXY_TIMEOUT` for slow APIs
- Check external API is accessible from server
- Review logs for specific error messages

### Configuration Not Loading

**Problem**: Changes to .env not taking effect

**Solutions**:
- Restart the server after .env changes
- Use admin reload endpoint: `POST /admin/reload`
- Check for syntax errors in .env file
- Verify .env file is in the correct location
- Check file permissions

## WebSocket Support

The server provides WebSocket support for real-time communication and WebSocket proxying. See the [WebSocket Guide](docs/WEBSOCKET_GUIDE.md) for detailed documentation.

### Quick Example

```javascript
// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:3000/ws');

// Subscribe to mock events
ws.send(JSON.stringify({
  type: 'subscribe',
  event: 'ticker'
}));

// Receive real-time updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Features

- **Mock Events**: Send periodic or on-demand mock data to clients
- **WebSocket Proxy**: Proxy WebSocket connections to external servers
- **Real-time Updates**: Enable real-time features during development
- **Event Subscriptions**: Subscribe/unsubscribe to specific events
- **Heartbeat Support**: Automatic connection health monitoring

Test the WebSocket functionality using the [WebSocket Test Client](docs/websocket-test-client.html).

## Request/Response Transformation

The server supports powerful data transformation capabilities. See the [Transformation Guide](docs/TRANSFORMATION_GUIDE.md) for detailed documentation.

### Quick Example

```typescript
// Transform snake_case to camelCase
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    fieldMapping: {
      user_id: 'userId',
      first_name: 'firstName',
      last_name: 'lastName'
    }
  }
}
```

### Features

- **Field Mapping**: Rename fields (e.g., snake_case ↔ camelCase)
- **Field Removal**: Strip sensitive or unnecessary data
- **Field Addition**: Inject metadata, timestamps, or computed values
- **Custom Functions**: Apply complex transformation logic
- **Response Wrapping**: Wrap responses in standard formats

See [config/transformations.example.ts](config/transformations.example.ts) for more examples.

## API Reference

### Mock Endpoints

Dynamically created based on mock data files in `MOCK_DATA_PATH`.

### Proxy Endpoints

- `GET /proxy/:route/*` - Named proxy route
- `GET /proxy?url=<target>` - Direct proxy with URL parameter

### Admin Endpoints

- `GET /admin/health` - Server health status
- `GET /admin/config` - Current configuration (sensitive data hidden)
- `POST /admin/reload` - Reload configuration from files

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- ConfigManager.test.ts
```

### Building

```bash
# Build TypeScript
npm run build

# Build and watch
npm run build:watch
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

## License

MIT

## Support

For issues and questions, please check the troubleshooting section or review the configuration documentation above.
