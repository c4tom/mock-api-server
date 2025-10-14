# API Versioning Guide

This guide explains how to use the API versioning feature in the Mock API Server.

## Overview

The API versioning feature allows you to:
- Serve multiple versions of your API simultaneously
- Test different API versions side by side
- Gradually migrate from one API version to another
- Support version negotiation via headers or URL prefixes

## Configuration

### Enable Versioning

Add the following environment variables to your `.env.local` or `.env.production` file:

```bash
# Enable API versioning
VERSIONING_ENABLED=true

# Supported versions (comma-separated)
VERSIONING_SUPPORTED_VERSIONS=v1,v2,v3

# Default version (optional - used when no version is specified)
VERSIONING_DEFAULT_VERSION=v1

# Version header name (default: API-Version)
VERSIONING_HEADER=API-Version

# Enable URL prefix versioning (default: true)
VERSIONING_PREFIX=true

# Strict mode - reject requests without version (default: false)
VERSIONING_STRICT_MODE=false
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `VERSIONING_ENABLED` | boolean | false | Enable/disable API versioning |
| `VERSIONING_SUPPORTED_VERSIONS` | string[] | ['v1'] | List of supported API versions |
| `VERSIONING_DEFAULT_VERSION` | string | undefined | Default version when none specified |
| `VERSIONING_HEADER` | string | 'API-Version' | HTTP header name for version negotiation |
| `VERSIONING_PREFIX` | boolean | true | Enable URL prefix versioning (e.g., /v1/users) |
| `VERSIONING_STRICT_MODE` | boolean | false | Reject requests without version |

## Version Negotiation

The server supports two methods for specifying the API version:

### 1. Header-Based Versioning

Specify the version using the configured header (default: `API-Version`):

```bash
# Request v1 of the API
curl -H "API-Version: v1" http://localhost:3000/mock/users

# Request v2 of the API
curl -H "API-Version: v2" http://localhost:3000/mock/users
```

### 2. URL Prefix Versioning

Include the version in the URL path:

```bash
# Request v1 of the API
curl http://localhost:3000/mock/v1/users

# Request v2 of the API
curl http://localhost:3000/mock/v2/users
```

### Priority Order

When both methods are used, the header takes precedence:

1. **Header** (`API-Version` header)
2. **URL Prefix** (e.g., `/v1/users`)
3. **Default Version** (if configured)

## Creating Versioned Mock Data

### Method 1: Version in File Name

Create separate JSON files for each version:

```
data/
  ├── users-v1.json
  ├── users-v2.json
  └── products-v1.json
```

**Example: `data/users-v1.json`**

```json
{
  "name": "Users API v1",
  "version": "v1",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users",
      "response": [
        {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com"
        }
      ]
    }
  ]
}
```

**Example: `data/users-v2.json`**

```json
{
  "name": "Users API v2",
  "version": "v2",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users",
      "response": [
        {
          "id": 1,
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "profile": {
            "avatar": "https://example.com/avatars/john.jpg",
            "bio": "Software developer"
          }
        }
      ]
    }
  ]
}
```

### Method 2: Version in Endpoint Configuration

Specify version for individual endpoints:

```json
{
  "name": "Mixed Version Endpoints",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users",
      "version": "v1",
      "response": [
        {
          "id": 1,
          "name": "John Doe"
        }
      ]
    },
    {
      "method": "GET",
      "path": "/users",
      "version": "v2",
      "response": [
        {
          "id": 1,
          "firstName": "John",
          "lastName": "Doe"
        }
      ]
    }
  ]
}
```

## Usage Examples

### Example 1: Basic Versioning

**Configuration:**
```bash
VERSIONING_ENABLED=true
VERSIONING_SUPPORTED_VERSIONS=v1,v2
VERSIONING_DEFAULT_VERSION=v1
```

**Requests:**
```bash
# Uses default version (v1)
curl http://localhost:3000/mock/users

# Explicitly request v1
curl -H "API-Version: v1" http://localhost:3000/mock/users

# Request v2
curl -H "API-Version: v2" http://localhost:3000/mock/users

# URL-based versioning
curl http://localhost:3000/mock/v2/users
```

### Example 2: Strict Mode

**Configuration:**
```bash
VERSIONING_ENABLED=true
VERSIONING_SUPPORTED_VERSIONS=v1,v2
VERSIONING_STRICT_MODE=true
```

**Requests:**
```bash
# This will fail with 400 error (version required)
curl http://localhost:3000/mock/users

# This will succeed
curl -H "API-Version: v1" http://localhost:3000/mock/users
```

### Example 3: Header-Only Versioning

**Configuration:**
```bash
VERSIONING_ENABLED=true
VERSIONING_SUPPORTED_VERSIONS=v1,v2
VERSIONING_PREFIX=false
```

**Requests:**
```bash
# Header-based versioning works
curl -H "API-Version: v1" http://localhost:3000/mock/users

# URL prefix versioning is disabled
curl http://localhost:3000/mock/v1/users  # Will not work
```

## Error Responses

### Version Required (Strict Mode)

When `VERSIONING_STRICT_MODE=true` and no version is provided:

```json
{
  "error": {
    "code": "VERSION_REQUIRED",
    "message": "API version is required",
    "timestamp": "2024-01-15T10:30:00Z",
    "suggestions": [
      "Set API-Version header",
      "Use URL prefix: /v{version}",
      "Supported versions: v1, v2"
    ]
  }
}
```

### Unsupported Version

When requesting a version that isn't supported:

```json
{
  "error": {
    "code": "UNSUPPORTED_VERSION",
    "message": "API version 'v3' is not supported",
    "timestamp": "2024-01-15T10:30:00Z",
    "supportedVersions": ["v1", "v2"],
    "suggestions": [
      "Use one of the supported versions: v1, v2"
    ]
  }
}
```

### Endpoint Not Found

When an endpoint doesn't exist for the requested version:

```json
{
  "error": {
    "code": "ENDPOINT_NOT_FOUND",
    "message": "Mock endpoint not found: /users",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestedVersion": "v2",
    "availableVersions": ["v1", "v2"],
    "availableEndpointsForVersion": [
      "GET:/products",
      "GET:/orders"
    ]
  }
}
```

## Best Practices

### 1. Version Naming

Use semantic versioning for clarity:
- `v1`, `v2`, `v3` for major versions
- `v1.1`, `v1.2` for minor versions (if needed)

### 2. Backward Compatibility

When creating a new version:
- Keep old versions available for a transition period
- Document breaking changes clearly
- Provide migration guides

### 3. Default Version

Set a default version for:
- Easier testing during development
- Backward compatibility with existing clients
- Gradual migration

### 4. File Organization

Organize versioned mock data files:

```
data/
  ├── v1/
  │   ├── users.json
  │   └── products.json
  ├── v2/
  │   ├── users.json
  │   └── products.json
  └── shared/
      └── common.json
```

Or use version suffixes:

```
data/
  ├── users-v1.json
  ├── users-v2.json
  ├── products-v1.json
  └── products-v2.json
```

### 5. Testing Multiple Versions

Test all supported versions regularly:

```bash
# Test v1
curl -H "API-Version: v1" http://localhost:3000/mock/users

# Test v2
curl -H "API-Version: v2" http://localhost:3000/mock/users

# Compare responses
diff <(curl -s -H "API-Version: v1" http://localhost:3000/mock/users) \
     <(curl -s -H "API-Version: v2" http://localhost:3000/mock/users)
```

## Integration with Other Features

### CRUD Operations

CRUD operations work with versioned endpoints:

```bash
# Create user in v1
curl -X POST -H "API-Version: v1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}' \
  http://localhost:3000/mock/users

# Create user in v2 (different schema)
curl -X POST -H "API-Version: v2" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Alice","lastName":"Johnson","email":"alice@example.com"}' \
  http://localhost:3000/mock/users
```

### Database Persistence

When using database persistence, data is stored per version:
- Each version maintains its own data
- CRUD operations are isolated by version
- Migrations between versions are manual

### Transformations

Apply transformations to specific versions:

```typescript
{
  path: '/users',
  method: 'GET',
  version: 'v1',
  response: {
    transform: (data) => {
      // Transform v1 response
      return data.map(user => ({
        id: user.id,
        name: user.name
      }));
    }
  }
}
```

## Troubleshooting

### Issue: Version not recognized

**Problem:** Server doesn't recognize the version in requests.

**Solution:**
1. Check `VERSIONING_ENABLED=true` in config
2. Verify version is in `VERSIONING_SUPPORTED_VERSIONS`
3. Check header name matches `VERSIONING_HEADER`
4. Ensure version format is correct (e.g., "v1" not "1")

### Issue: Wrong version data returned

**Problem:** Server returns data from wrong version.

**Solution:**
1. Check version field in mock data files
2. Verify file naming convention
3. Check endpoint version configuration
4. Review version priority order

### Issue: 404 for versioned endpoint

**Problem:** Endpoint exists but returns 404.

**Solution:**
1. Check if endpoint is defined for that version
2. Verify path matches exactly (including leading slash)
3. Check method (GET, POST, etc.)
4. Review available endpoints in error response

## Admin Endpoints

Check versioning configuration and status:

```bash
# Get current configuration
curl http://localhost:3000/admin/config

# Check available versions
curl http://localhost:3000/admin/stats
```

## Examples

See the `examples/` directory for complete examples:
- `examples/versioning-basic.md` - Basic versioning setup
- `examples/versioning-migration.md` - Migrating between versions
- `examples/versioning-testing.md` - Testing multiple versions

## Related Documentation

- [Mock Data Guide](./MOCK_DATA_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Configuration Guide](./CONFIGURATION_GUIDE.md)
