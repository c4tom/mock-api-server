# API Versioning - Quick Start Guide

## What is API Versioning?

API versioning allows you to serve multiple versions of your API simultaneously. This is useful for:
- Testing different API versions side by side
- Gradually migrating clients from old to new versions
- Maintaining backward compatibility during API evolution

## Quick Setup (5 minutes)

### Step 1: Enable Versioning

Add these lines to your `.env.local` file:

```bash
VERSIONING_ENABLED=true
VERSIONING_SUPPORTED_VERSIONS=v1,v2
VERSIONING_DEFAULT_VERSION=v1
```

### Step 2: Create Versioned Mock Data

Create two files in the `data/` directory:

**`data/users-v1.json`** (Simple structure):
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

**`data/users-v2.json`** (Enhanced structure):
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

### Step 3: Start the Server

```bash
npm run dev
```

### Step 4: Test It!

```bash
# Request v1 API
curl -H "API-Version: v1" http://localhost:3000/mock/users

# Request v2 API
curl -H "API-Version: v2" http://localhost:3000/mock/users

# Or use URL prefix
curl http://localhost:3000/mock/v1/users
curl http://localhost:3000/mock/v2/users
```

## How It Works

### Version Negotiation

The server checks for the API version in this order:

1. **Header** (`API-Version: v1`)
2. **URL Prefix** (`/v1/users`)
3. **Default Version** (if configured)

### Example Requests

```bash
# Header-based (recommended)
curl -H "API-Version: v1" http://localhost:3000/mock/users

# URL-based
curl http://localhost:3000/mock/v1/users

# Default version (no version specified)
curl http://localhost:3000/mock/users
```

## Configuration Options

| Variable | Description | Example |
|----------|-------------|---------|
| `VERSIONING_ENABLED` | Enable versioning | `true` |
| `VERSIONING_SUPPORTED_VERSIONS` | Comma-separated list | `v1,v2,v3` |
| `VERSIONING_DEFAULT_VERSION` | Default when not specified | `v1` |
| `VERSIONING_HEADER` | Header name | `API-Version` |
| `VERSIONING_PREFIX` | Enable URL prefix | `true` |
| `VERSIONING_STRICT_MODE` | Require version | `false` |

## Common Use Cases

### 1. Testing Migration

Test both old and new API versions before migrating clients:

```bash
# Test old version still works
curl -H "API-Version: v1" http://localhost:3000/mock/users

# Test new version
curl -H "API-Version: v2" http://localhost:3000/mock/users
```

### 2. Gradual Rollout

Keep v1 as default while rolling out v2:

```bash
VERSIONING_DEFAULT_VERSION=v1
```

Clients without version specification get v1, while new clients can opt into v2.

### 3. Breaking Changes

When making breaking changes, create a new version:

```bash
VERSIONING_SUPPORTED_VERSIONS=v1,v2,v3
```

Old clients continue using v1/v2, new clients use v3.

## JavaScript/TypeScript Example

```javascript
// Create versioned API clients
const v1Client = axios.create({
  baseURL: 'http://localhost:3000/mock',
  headers: { 'API-Version': 'v1' }
});

const v2Client = axios.create({
  baseURL: 'http://localhost:3000/mock',
  headers: { 'API-Version': 'v2' }
});

// Use different versions
const v1Users = await v1Client.get('/users');
const v2Users = await v2Client.get('/users');

console.log('V1 Users:', v1Users.data);
console.log('V2 Users:', v2Users.data);
```

## Error Handling

### Unsupported Version

```bash
curl -H "API-Version: v99" http://localhost:3000/mock/users
```

Response:
```json
{
  "error": {
    "code": "UNSUPPORTED_VERSION",
    "message": "API version 'v99' is not supported",
    "supportedVersions": ["v1", "v2"]
  }
}
```

### Version Required (Strict Mode)

When `VERSIONING_STRICT_MODE=true`:

```bash
curl http://localhost:3000/mock/users
```

Response:
```json
{
  "error": {
    "code": "VERSION_REQUIRED",
    "message": "API version is required",
    "suggestions": [
      "Set API-Version header",
      "Use URL prefix: /v{version}",
      "Supported versions: v1, v2"
    ]
  }
}
```

## Testing Script

Run the included test script:

```bash
./test-versioning.sh
```

This will test:
- Header-based versioning
- URL prefix versioning
- Default version
- Error handling
- Version priority

## Next Steps

1. **Read the Full Guide**: See [docs/VERSIONING_GUIDE.md](docs/VERSIONING_GUIDE.md)
2. **Check Examples**: See [examples/versioning-example.md](examples/versioning-example.md)
3. **Run Tests**: Execute `./test-versioning.sh`

## Troubleshooting

### Version Not Recognized

**Problem**: Server doesn't recognize the version.

**Solution**:
1. Check `VERSIONING_ENABLED=true`
2. Verify version is in `VERSIONING_SUPPORTED_VERSIONS`
3. Check header name matches `VERSIONING_HEADER`

### Wrong Data Returned

**Problem**: Server returns data from wrong version.

**Solution**:
1. Check `version` field in mock data files
2. Verify file naming convention
3. Check endpoint version configuration

### 404 Error

**Problem**: Endpoint returns 404.

**Solution**:
1. Check if endpoint is defined for that version
2. Verify path matches exactly
3. Check method (GET, POST, etc.)

## Support

For more help:
- [Full Documentation](docs/VERSIONING_GUIDE.md)
- [Examples](examples/versioning-example.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
