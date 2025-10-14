# Documentation

Complete documentation for the Mock API Server.

## Quick Links

- [Main README](../README.md) - Getting started and overview
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Proxy Guide](./PROXY_GUIDE.md) - CORS proxy configuration and usage
- [Cache Guide](./CACHE_GUIDE.md) - Response caching configuration and usage
- [Security Guide](./SECURITY_GUIDE.md) - Security configuration and best practices
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- [Configuration Examples](../CONFIG_EXAMPLES.md) - Example configurations for different environments

## Documentation Structure

### Getting Started

Start with the [Main README](../README.md) for:
- Quick start guide
- Installation instructions
- Basic configuration
- Usage examples

### API Documentation

See [API Reference](./API_REFERENCE.md) for:
- Mock data endpoints
- Proxy endpoints
- Admin endpoints
- Authentication methods
- Error responses
- Request/response examples

### Proxy Configuration

See [Proxy Guide](./PROXY_GUIDE.md) for:
- How the proxy works
- Named proxy routes
- Domain filtering
- Authentication forwarding
- Advanced configuration
- Use cases and examples

### Response Caching

See [Cache Guide](./CACHE_GUIDE.md) for:
- Cache configuration
- TTL settings per route
- Cache invalidation strategies
- Performance optimization
- Admin endpoints for cache management
- Monitoring and statistics

### Security

See [Security Guide](./SECURITY_GUIDE.md) for:
- Authentication methods comparison
- CORS configuration
- Rate limiting strategies
- Environment-specific security
- Best practices
- Security checklist

### Troubleshooting

See [Troubleshooting](./TROUBLESHOOTING.md) for:
- Authentication issues
- CORS issues
- Rate limiting issues
- Proxy issues
- Configuration issues
- Performance issues
- Common error messages

### Configuration

See [Configuration Examples](../CONFIG_EXAMPLES.md) for:
- Development configurations
- Production configurations
- AI Studio setup
- Specific use cases
- Migration guides

## Sample Data

Sample mock data files are available in the [data/](../data/) directory:

- `users.json` - User profiles with nested data
- `posts.json` - Blog posts with comments
- `products.json` - E-commerce products
- `todos.json` - Task management items
- `nested-relationships.json` - Complex nested structures
- `xml-example.json` - XML response format
- `text-example.json` - Plain text response format

See [data/README.md](../data/README.md) for details on using and creating mock data.

## Quick Reference

### Common Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Build
npm run build

# Reload configuration
curl -X POST http://localhost:3000/admin/reload

# Check health
curl http://localhost:3000/admin/health
```

### Environment Variables

Key configuration variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development`, `production` |
| `PORT` | Server port | `3000` |
| `AUTH_TYPE` | Authentication type | `jwt`, `basic`, `dev-token`, `bypass` |
| `CORS_ORIGINS` | Allowed origins | `*`, `https://app.com` |
| `PROXY_ROUTES` | Named proxy routes | `api:https://api.com` |

See [Configuration Examples](../CONFIG_EXAMPLES.md) for complete examples.

### Authentication Quick Setup

**Development (No Auth):**
```env
AUTH_ENABLED=false
```

**AI Studio (Bypass):**
```env
AUTH_TYPE=bypass
BYPASS_HEADER=X-Dev-Bypass
BYPASS_VALUE=allow
```

**Production (JWT):**
```env
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=your-secure-secret
```

### CORS Quick Setup

**Development:**
```env
CORS_ORIGINS=*
```

**Production:**
```env
CORS_ORIGINS=https://app.com,https://www.app.com
```

### Proxy Quick Setup

**Named Routes:**
```env
PROXY_ENABLED=true
PROXY_ROUTES=api:https://api.example.com
```

**Usage:**
```bash
curl http://localhost:3000/proxy/api/endpoint
```

### Cache Quick Setup

**Enable Caching:**
```env
PROXY_CACHE_ENABLED=true
PROXY_CACHE_DEFAULT_TTL=300000
PROXY_CACHE_MAX_SIZE=100
```

**Per-Route TTL:**
```env
PROXY_CACHE_TTL_API=600000
```

**Check Stats:**
```bash
curl http://localhost:3000/admin/cache/stats
```

## Support

For issues and questions:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review the [API Reference](./API_REFERENCE.md)
3. Check the [Security Guide](./SECURITY_GUIDE.md) for security-related questions
4. Review server logs for error details

## Contributing

When adding new features or configurations:

1. Update relevant documentation
2. Add examples to [Configuration Examples](../CONFIG_EXAMPLES.md)
3. Update [API Reference](./API_REFERENCE.md) for new endpoints
4. Add troubleshooting entries if needed
5. Update this README with new documentation links
