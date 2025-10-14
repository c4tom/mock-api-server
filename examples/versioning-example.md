# API Versioning Example

This example demonstrates how to use the API versioning feature in the Mock API Server.

## Setup

1. Copy the versioning example configuration:
```bash
cp .env.versioning.example .env.local
```

2. Start the server:
```bash
npm run dev
```

## Example 1: Header-Based Versioning

### Request v1 API
```bash
curl -H "API-Version: v1" http://localhost:3000/mock/users
```

**Response (v1 format):**
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

### Request v2 API
```bash
curl -H "API-Version: v2" http://localhost:3000/mock/users
```

**Response (v2 format with enhanced fields):**
```json
[
  {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "profile": {
      "avatar": "https://example.com/avatars/john.jpg",
      "bio": "Software developer"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "profile": {
      "avatar": "https://example.com/avatars/jane.jpg",
      "bio": "Product manager"
    },
    "createdAt": "2024-01-02T00:00:00Z"
  }
]
```

## Example 2: URL Prefix Versioning

### Request v1 API via URL
```bash
curl http://localhost:3000/mock/v1/users
```

### Request v2 API via URL
```bash
curl http://localhost:3000/mock/v2/users
```

## Example 3: Testing Both Versions Side by Side

```bash
# Compare v1 and v2 responses
echo "=== V1 Response ==="
curl -s -H "API-Version: v1" http://localhost:3000/mock/users | jq

echo "\n=== V2 Response ==="
curl -s -H "API-Version: v2" http://localhost:3000/mock/users | jq
```

## Example 4: CRUD Operations with Versioning

### Create User in v1
```bash
curl -X POST \
  -H "API-Version: v1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Johnson","email":"alice@example.com"}' \
  http://localhost:3000/mock/users
```

**Response:**
```json
{
  "id": 3,
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Create User in v2
```bash
curl -X POST \
  -H "API-Version: v2" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Bob",
    "lastName":"Wilson",
    "email":"bob@example.com",
    "profile": {
      "avatar":"https://example.com/avatars/bob.jpg",
      "bio":"Designer"
    }
  }' \
  http://localhost:3000/mock/users
```

**Response:**
```json
{
  "id": 3,
  "firstName": "Bob",
  "lastName": "Wilson",
  "email": "bob@example.com",
  "profile": {
    "avatar": "https://example.com/avatars/bob.jpg",
    "bio": "Designer"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Example 5: Error Handling

### Unsupported Version
```bash
curl -H "API-Version: v99" http://localhost:3000/mock/users
```

**Response:**
```json
{
  "error": {
    "code": "UNSUPPORTED_VERSION",
    "message": "API version 'v99' is not supported",
    "timestamp": "2024-01-15T10:30:00Z",
    "supportedVersions": ["v1", "v2", "v3"],
    "suggestions": [
      "Use one of the supported versions: v1, v2, v3"
    ]
  }
}
```

### Version Required (Strict Mode)
When `VERSIONING_STRICT_MODE=true`:

```bash
curl http://localhost:3000/mock/users
```

**Response:**
```json
{
  "error": {
    "code": "VERSION_REQUIRED",
    "message": "API version is required",
    "timestamp": "2024-01-15T10:30:00Z",
    "suggestions": [
      "Set API-Version header",
      "Use URL prefix: /v{version}",
      "Supported versions: v1, v2, v3"
    ]
  }
}
```

## Example 6: JavaScript/TypeScript Client

### Using Fetch API

```javascript
// Request v1 API
const v1Response = await fetch('http://localhost:3000/mock/users', {
  headers: {
    'API-Version': 'v1'
  }
});
const v1Data = await v1Response.json();
console.log('V1 Users:', v1Data);

// Request v2 API
const v2Response = await fetch('http://localhost:3000/mock/users', {
  headers: {
    'API-Version': 'v2'
  }
});
const v2Data = await v2Response.json();
console.log('V2 Users:', v2Data);
```

### Using Axios

```javascript
import axios from 'axios';

// Create v1 client
const v1Client = axios.create({
  baseURL: 'http://localhost:3000/mock',
  headers: {
    'API-Version': 'v1'
  }
});

// Create v2 client
const v2Client = axios.create({
  baseURL: 'http://localhost:3000/mock',
  headers: {
    'API-Version': 'v2'
  }
});

// Use v1 API
const v1Users = await v1Client.get('/users');
console.log('V1 Users:', v1Users.data);

// Use v2 API
const v2Users = await v2Client.get('/users');
console.log('V2 Users:', v2Users.data);
```

## Example 7: Testing Migration from v1 to v2

```bash
#!/bin/bash

# Test script to verify migration from v1 to v2

echo "Testing v1 API..."
V1_RESPONSE=$(curl -s -H "API-Version: v1" http://localhost:3000/mock/users)
V1_COUNT=$(echo $V1_RESPONSE | jq 'length')
echo "V1 returned $V1_COUNT users"

echo "\nTesting v2 API..."
V2_RESPONSE=$(curl -s -H "API-Version: v2" http://localhost:3000/mock/users)
V2_COUNT=$(echo $V2_RESPONSE | jq 'length')
echo "V2 returned $V2_COUNT users"

# Verify v2 has enhanced fields
echo "\nVerifying v2 enhanced fields..."
HAS_PROFILE=$(echo $V2_RESPONSE | jq '.[0] | has("profile")')
HAS_FIRST_NAME=$(echo $V2_RESPONSE | jq '.[0] | has("firstName")')

if [ "$HAS_PROFILE" = "true" ] && [ "$HAS_FIRST_NAME" = "true" ]; then
  echo "✓ V2 API has enhanced fields"
else
  echo "✗ V2 API missing enhanced fields"
fi

# Verify v1 has simple structure
echo "\nVerifying v1 simple structure..."
HAS_NAME=$(echo $V1_RESPONSE | jq '.[0] | has("name")')
HAS_PROFILE_V1=$(echo $V1_RESPONSE | jq '.[0] | has("profile")')

if [ "$HAS_NAME" = "true" ] && [ "$HAS_PROFILE_V1" = "false" ]; then
  echo "✓ V1 API has simple structure"
else
  echo "✗ V1 API structure unexpected"
fi
```

## Example 8: Admin Endpoints

### Check Versioning Configuration
```bash
curl http://localhost:3000/admin/config | jq '.data.mock.versioning'
```

**Response:**
```json
{
  "enabled": true,
  "defaultVersion": "v1",
  "supportedVersions": ["v1", "v2", "v3"],
  "versionHeader": "API-Version",
  "versionPrefix": true,
  "strictMode": false
}
```

## Tips

1. **Use Default Version for Backward Compatibility**: Set `VERSIONING_DEFAULT_VERSION=v1` to support existing clients without changes.

2. **Test All Versions**: Always test all supported versions when making changes.

3. **Document Breaking Changes**: Clearly document what changed between versions.

4. **Gradual Migration**: Keep old versions available during migration period.

5. **Version Naming**: Use semantic versioning (v1, v2, v3) for clarity.

## Related Documentation

- [Versioning Guide](../docs/VERSIONING_GUIDE.md)
- [API Reference](../docs/API_REFERENCE.md)
- [Mock Data Guide](../docs/MOCK_DATA_GUIDE.md)
