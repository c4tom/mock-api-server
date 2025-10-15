# Mock API Server - User Guide

Complete guide for using the Mock API Server in your projects.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Core Features](#core-features)
5. [Configuration](#configuration)
6. [Common Use Cases](#common-use-cases)
7. [Troubleshooting](#troubleshooting)

## Introduction

The Mock API Server is a flexible development tool that provides:

- **Mock REST API**: Serve static or dynamic test data
- **CORS Proxy**: Bypass CORS restrictions during development
- **Real-time Communication**: WebSocket support for live updates
- **GraphQL Support**: Built-in GraphQL endpoint and playground
- **Data Generation**: Create realistic test data on-the-fly
- **Database Persistence**: Optional data storage

### Who Should Use This Guide

- Frontend developers needing a backend for development
- QA engineers setting up test environments
- Teams prototyping new features
- Anyone needing a quick API mock or proxy

## Installation

### Prerequisites

- Node.js 16+ or compatible runtime
- npm or pnpm package manager

### Setup

```bash
# Clone or download the project
cd mock-api-server

# Install dependencies
npm install
# or
pnpm install

# Copy environment file
cp .env.local .env

# Start the server
npm run dev
```

The server will start on `http://localhost:3000`

## Getting Started

### Your First Mock Endpoint

1. Create a mock data file in `data/mock/`:

```json
// data/mock/users.json
{
  "endpoint": "/api/users",
  "method": "GET",
  "response": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "statusCode": 200
}
```

2. Access the endpoint:

```bash
curl http://localhost:3000/api/users
```

3. You'll receive:

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
]
```

### Your First Proxy Request

1. Enable proxy in `.env`:

```env
PROXY_ENABLED=true
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com
```

2. Make a proxy request:

```bash
curl http://localhost:3000/proxy/jsonplaceholder/posts/1
```

3. The server forwards the request and returns the response.

## Core Features

### 1. Mock Data Server

Serve static or dynamic mock data through REST endpoints.

#### Static Mock Data

Create JSON files in `data/mock/`:

```json
{
  "endpoint": "/api/products",
  "method": "GET",
  "response": {
    "products": [
      { "id": 1, "name": "Laptop", "price": 999 },
      { "id": 2, "name": "Mouse", "price": 29 }
    ]
  }
}
```

#### Dynamic Data Generation

Use templates to generate realistic data:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "response": {
        "name": "users",
        "count": 50,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "name" },
          "email": { "type": "email" },
          "age": { "type": "number", "min": 18, "max": 80 }
        }
      }
    }
  ]
}
```

See [Data Generation Guide](docs/DATA_GENERATION_GUIDE.md) for all field types.

### 2. CORS Proxy

Bypass CORS restrictions during development.

#### Named Routes

Configure in `.env`:

```env
PROXY_ROUTES=api:https://api.example.com,github:https://api.github.com
```

Use the proxy:

```bash
# Proxy to api.example.com
curl http://localhost:3000/proxy/api/users

# Proxy to api.github.com
curl http://localhost:3000/proxy/github/users/octocat
```

#### Direct URL Proxy

```bash
curl "http://localhost:3000/proxy?url=https://api.github.com/users/octocat"
```

See [Proxy Guide](docs/PROXY_GUIDE.md) for advanced configuration.

### 3. WebSocket Support

Real-time communication for testing WebSocket features.

#### Mock Events

Configure mock events in `data/websocket-events.json`:

```json
{
  "events": [
    {
      "name": "ticker",
      "interval": 1000,
      "data": {
        "symbol": "BTC",
        "price": 50000
      }
    }
  ]
}
```

Connect from your app:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  event: 'ticker'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Ticker update:', data);
};
```

#### WebSocket Proxy

Proxy WebSocket connections to external servers:

```env
WEBSOCKET_PROXY_ENABLED=true
WEBSOCKET_PROXY_ROUTES=binance:wss://stream.binance.com:9443
```

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/proxy/binance/ws/btcusdt@ticker');
```

See [WebSocket Guide](docs/WEBSOCKET_GUIDE.md) for complete documentation.

### 4. GraphQL Support

Built-in GraphQL endpoint with playground.

#### Using the Playground

1. Open `http://localhost:3000/graphql` in your browser
2. Write queries in the editor
3. Execute and see results

#### Example Query

```graphql
query {
  users {
    id
    name
    email
  }
}
```

#### GraphQL Proxy

Proxy to external GraphQL APIs:

```env
GRAPHQL_PROXY_ENABLED=true
GRAPHQL_PROXY_URL=https://api.example.com/graphql
```

See [GraphQL Guide](docs/GRAPHQL_GUIDE.md) for schema definition and more.

### 5. API Versioning

Test multiple API versions simultaneously.

#### Configuration

```env
VERSIONING_ENABLED=true
VERSIONING_SUPPORTED_VERSIONS=v1,v2,v3
VERSIONING_DEFAULT_VERSION=v1
VERSIONING_HEADER=API-Version
```

#### Usage

Header-based:
```bash
curl -H "API-Version: v1" http://localhost:3000/mock/users
curl -H "API-Version: v2" http://localhost:3000/mock/users
```

URL-based:
```bash
curl http://localhost:3000/mock/v1/users
curl http://localhost:3000/mock/v2/users
```

Create version-specific data:
```
data/mock/v1/users.json
data/mock/v2/users.json
```

See [Versioning Guide](docs/VERSIONING_GUIDE.md) for details.

### 6. Database Persistence

Store mock data in a database instead of memory.

#### SQLite (Easiest)

```env
DATABASE_ENABLED=true
DATABASE_TYPE=sqlite
DATABASE_SQLITE_PATH=./data/mock.db
```

#### PostgreSQL

```env
DATABASE_ENABLED=true
DATABASE_TYPE=postgres
DATABASE_POSTGRES_HOST=localhost
DATABASE_POSTGRES_PORT=5432
DATABASE_POSTGRES_DATABASE=mockapi
DATABASE_POSTGRES_USER=user
DATABASE_POSTGRES_PASSWORD=password
```

#### MongoDB

```env
DATABASE_ENABLED=true
DATABASE_TYPE=mongodb
DATABASE_MONGODB_URI=mongodb://localhost:27017/mockapi
```

See [Database Guide](docs/DATABASE_GUIDE.md) for complete setup.

## Configuration

### Environment Variables

The server is configured through `.env` files.

#### Server Settings

```env
PORT=3000                    # Server port
HOST=localhost               # Server host
NODE_ENV=development         # Environment mode
```

#### Authentication

Choose one authentication mode:

**Development - No Auth:**
```env
AUTH_ENABLED=false
```

**Development - Simple Token:**
```env
AUTH_TYPE=dev-token
DEV_TOKEN=my-dev-token-123
```

**Development - Bypass Header:**
```env
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow
```

**Production - JWT:**
```env
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRY=24h
```

**Production - HTTP Basic:**
```env
AUTH_TYPE=basic
BASIC_USERNAME=admin
BASIC_PASSWORD=secure-password
```

#### CORS Settings

```env
# Development - Allow all
CORS_ORIGINS=*

# Production - Specific origins
CORS_ORIGINS=https://app.com,https://admin.app.com

# Allow credentials (cookies, auth headers)
CORS_CREDENTIALS=true
```

#### Rate Limiting

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000     # 15 minutes in ms
RATE_LIMIT_MAX=100           # Max requests per window
```

#### Logging

```env
LOG_LEVEL=info               # silent, error, warn, info, debug
LOG_FORMAT=simple            # simple or json
LOG_FILE=./logs/app.log      # Log file path
```

### Configuration Files

- `.env.local` - Development template (relaxed security)
- `.env.production` - Production template (strict security)
- `.env` - Active configuration (copy from templates)

## Common Use Cases

### Use Case 1: Frontend Development

**Scenario**: You're building a React app and need a backend API.

**Setup**:

1. Create mock data files for your endpoints
2. Use dev-token or disable auth
3. Enable CORS with `*`
4. Start the server

```env
AUTH_ENABLED=false
CORS_ORIGINS=*
MOCK_DATA_PATH=./data/mock
```

```bash
npm run dev
```

Your React app can now call `http://localhost:3000/api/*` endpoints.

### Use Case 2: Testing External APIs

**Scenario**: You need to test integration with an external API that has CORS restrictions.

**Setup**:

1. Enable proxy
2. Add the API as a named route
3. Use the proxy in your tests

```env
PROXY_ENABLED=true
PROXY_ROUTES=external:https://api.external.com
```

```javascript
// In your tests
fetch('http://localhost:3000/proxy/external/users')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Use Case 3: WebSocket Development

**Scenario**: Building a real-time dashboard with WebSocket updates.

**Setup**:

1. Create mock WebSocket events
2. Enable WebSocket support
3. Connect from your app

```json
// data/websocket-events.json
{
  "events": [
    {
      "name": "dashboard-stats",
      "interval": 2000,
      "data": {
        "users": 1234,
        "revenue": 56789
      }
    }
  ]
}
```

```javascript
// In your app
const ws = new WebSocket('ws://localhost:3000/ws');
ws.send(JSON.stringify({ type: 'subscribe', event: 'dashboard-stats' }));
```

### Use Case 4: API Versioning Testing

**Scenario**: Testing migration from v1 to v2 of your API.

**Setup**:

1. Enable versioning
2. Create data for both versions
3. Test both versions side-by-side

```env
VERSIONING_ENABLED=true
VERSIONING_SUPPORTED_VERSIONS=v1,v2
```

```
data/mock/v1/users.json  # Old format
data/mock/v2/users.json  # New format
```

```bash
# Test v1
curl -H "API-Version: v1" http://localhost:3000/mock/users

# Test v2
curl -H "API-Version: v2" http://localhost:3000/mock/users
```

### Use Case 5: Load Testing

**Scenario**: Generate large datasets for performance testing.

**Setup**:

1. Use data generation templates
2. Generate thousands of records
3. Enable database persistence for consistency

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "response": {
        "name": "users",
        "count": 10000,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "name" },
          "email": { "type": "email" }
        }
      }
    }
  ]
}
```

```env
DATABASE_ENABLED=true
DATABASE_TYPE=sqlite
```

## Troubleshooting

### Server Won't Start

**Problem**: Server fails to start or crashes immediately.

**Solutions**:
- Check port is not already in use: `lsof -i :3000`
- Verify `.env` file exists and is valid
- Check Node.js version: `node --version` (need 16+)
- Review logs for specific error messages
- Try with default `.env.local`: `cp .env.local .env`

### Authentication Errors

**Problem**: Getting 401 Unauthorized responses.

**Solutions**:
- Verify `AUTH_ENABLED` setting
- Check `AUTH_TYPE` matches your method
- For dev-token: Ensure header is `Authorization: Bearer <token>`
- For bypass: Check header name and value match config
- Try disabling auth temporarily: `AUTH_ENABLED=false`

### CORS Errors

**Problem**: Browser shows CORS errors.

**Solutions**:
- Set `CORS_ORIGINS=*` for development
- Add your origin: `CORS_ORIGINS=http://localhost:3001`
- Enable credentials if needed: `CORS_CREDENTIALS=true`
- Check browser console for specific CORS message
- Verify server is running and accessible

### Mock Data Not Loading

**Problem**: Endpoints return 404 or empty responses.

**Solutions**:
- Check file is in correct path: `data/mock/`
- Verify JSON syntax is valid
- Check `MOCK_DATA_PATH` in `.env`
- Review server logs for parsing errors
- Restart server after adding new files

### Proxy Not Working

**Problem**: Proxy requests fail or timeout.

**Solutions**:
- Verify `PROXY_ENABLED=true`
- Check target URL is accessible from server
- Add domain to `PROXY_ALLOWED_DOMAINS`
- Increase `PROXY_TIMEOUT` for slow APIs
- Check external API is not blocking your IP
- Review logs for specific error

### WebSocket Connection Fails

**Problem**: WebSocket connection won't establish.

**Solutions**:
- Verify WebSocket URL: `ws://localhost:3000/ws`
- Check `WEBSOCKET_ENABLED=true`
- Ensure no firewall blocking WebSocket
- Try from different client (browser vs Node.js)
- Check server logs for connection errors

### Rate Limiting Issues

**Problem**: Getting 429 Too Many Requests.

**Solutions**:
- Disable in development: `RATE_LIMIT_ENABLED=false`
- Increase limit: `RATE_LIMIT_MAX=1000`
- Increase window: `RATE_LIMIT_WINDOW=3600000` (1 hour)
- Wait for window to reset
- Check if multiple clients sharing same IP

### Performance Issues

**Problem**: Server is slow or unresponsive.

**Solutions**:
- Enable database persistence for large datasets
- Reduce generated data count in templates
- Enable response caching for proxy requests
- Check system resources (CPU, memory)
- Review logs for bottlenecks
- Consider using production build: `npm run build && npm start`

### Configuration Not Updating

**Problem**: Changes to `.env` not taking effect.

**Solutions**:
- Restart the server completely
- Use reload endpoint: `curl -X POST http://localhost:3000/admin/reload`
- Check for typos in variable names
- Verify no spaces around `=` in `.env`
- Check file is named `.env` not `.env.txt`

## Getting Help

### Documentation

- [Full README](README.md) - Complete documentation
- [Developer Guide](DEVELOPER_GUIDE.md) - Technical details
- [API Reference](docs/API_REFERENCE.md) - All endpoints
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Detailed solutions
- [Security Guide](docs/SECURITY_GUIDE.md) - Security best practices

### Feature-Specific Guides

- [Data Generation](docs/DATA_GENERATION_GUIDE.md)
- [WebSocket](docs/WEBSOCKET_GUIDE.md)
- [GraphQL](docs/GRAPHQL_GUIDE.md)
- [Database](docs/DATABASE_GUIDE.md)
- [Proxy](docs/PROXY_GUIDE.md)
- [Transformation](docs/TRANSFORMATION_GUIDE.md)
- [Versioning](docs/VERSIONING_GUIDE.md)
- [Cache](docs/CACHE_GUIDE.md)
- [Dashboard](docs/DASHBOARD_GUIDE.md)

### Quick Reference

Check [README-SHORT.md](README-SHORT.md) for a quick reference guide.

## Next Steps

Now that you understand the basics:

1. Explore the [examples/](examples/) directory for real-world usage
2. Check out [data/templates/](data/templates/) for data generation examples
3. Review [docs/](docs/) for advanced features
4. Read the [Security Guide](docs/SECURITY_GUIDE.md) before deploying

Happy mocking! 🎭
