# Mock API Server

A flexible backend server for mock data and CORS proxy with WebSocket, GraphQL, and real-time data generation.

## Quick Start

```bash
# Install
npm install

# Development
cp .env.local .env
npm run dev

# Production
cp .env.production .env
npm run build && npm start
```

Server runs on `http://localhost:3000`

## Key Features

- 🎭 Mock REST API with CRUD operations
- 🎲 Generate realistic test data with Faker.js
- 💾 Database persistence (SQLite, PostgreSQL, MongoDB)
- 🔄 CORS proxy for development
- 🔌 WebSocket support (mock events + proxy)
- 🔮 GraphQL endpoint with playground
- 📌 API versioning (header or URL-based)
- 🔀 Request/response transformation
- 🔐 Multiple auth modes (JWT, Basic, dev-token, bypass)
- 📊 Admin dashboard with real-time monitoring

## Configuration

Edit `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Auth (choose one)
AUTH_TYPE=dev-token          # Simple token for dev
AUTH_TYPE=bypass             # Header-based bypass
AUTH_TYPE=jwt                # JWT for production
AUTH_TYPE=basic              # HTTP Basic Auth

# CORS
CORS_ORIGINS=*               # Dev: allow all
CORS_ORIGINS=https://app.com # Prod: specific origins

# Proxy
PROXY_ENABLED=true
PROXY_ROUTES=api:https://api.example.com
```

## Usage Examples

### Mock Data
```bash
# Create data/mock/users.json
curl http://localhost:3000/api/users
```

### Proxy
```bash
curl http://localhost:3000/proxy/api/endpoint
```

### WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.send(JSON.stringify({ type: 'subscribe', event: 'ticker' }));
```

### GraphQL
```bash
# Open playground
open http://localhost:3000/graphql
```

## Documentation

- 📇 [Documentation Index](DOCUMENTATION_INDEX.md) - Complete documentation index
- 📖 [User Guide](USER_GUIDE.md) - Complete usage manual
- 🎨 [Frontend Guide](FRONTEND_GUIDE.md) - Dashboard, WebSocket client, GraphQL playground
- ⚡ [Frontend Quick Start](QUICK_START_FRONTEND.md) - Quick access to web interfaces
- 👨‍💻 [Developer Guide](DEVELOPER_GUIDE.md) - Architecture and development
- 📚 [Full README](README.md) - Detailed documentation
- 📁 [docs/](docs/) - Feature-specific guides

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Check code quality
```

## Admin Endpoints

```bash
curl http://localhost:3000/admin/health    # Health check
curl http://localhost:3000/admin/config    # View config
curl -X POST http://localhost:3000/admin/reload  # Reload config
```

## Support

- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Security Guide](docs/SECURITY_GUIDE.md)
- [API Reference](docs/API_REFERENCE.md)

## License

MIT
