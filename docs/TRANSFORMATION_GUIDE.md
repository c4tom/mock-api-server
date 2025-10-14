# Request/Response Transformation Guide

The Mock API Server supports powerful request and response transformation capabilities, allowing you to modify data on-the-fly without changing your mock data files or backend logic.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Field Mapping](#field-mapping)
- [Field Removal](#field-removal)
- [Field Addition](#field-addition)
- [Custom Transformation Functions](#custom-transformation-functions)
- [Response Wrapping](#response-wrapping)
- [Path Matching](#path-matching)
- [Examples](#examples)

## Overview

Transformation middleware allows you to:

- **Rename fields** - Map field names between different formats (e.g., camelCase ↔ snake_case)
- **Remove fields** - Strip sensitive or unnecessary data from requests/responses
- **Add fields** - Inject additional data like timestamps, versions, or metadata
- **Custom transformations** - Apply complex logic with custom functions
- **Wrap responses** - Encapsulate response data in a wrapper object

## Configuration

### Basic Setup

```typescript
import { createTransformationMiddleware } from './middleware/transformationMiddleware';
import { TransformationConfig } from './types/transformation';

const transformations: TransformationConfig[] = [
  {
    path: '/api/users',
    method: 'GET',
    responseTransform: {
      fieldMapping: {
        user_id: 'id',
        user_name: 'name'
      }
    }
  }
];

const transformMiddleware = createTransformationMiddleware(transformations);
app.use(transformMiddleware.middleware());
```

### Transformation Config Structure

```typescript
interface TransformationConfig {
  path: string;                    // Endpoint path (supports :params)
  method?: string | string[];      // HTTP method(s) - optional, applies to all if omitted
  requestTransform?: RequestTransformation;
  responseTransform?: ResponseTransformation;
}
```

## Field Mapping

Rename fields in requests or responses. Useful for converting between naming conventions.

### Request Field Mapping

```typescript
{
  path: '/api/users',
  method: 'POST',
  requestTransform: {
    fieldMapping: {
      firstName: 'first_name',
      lastName: 'last_name',
      emailAddress: 'email'
    }
  }
}
```

**Input:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com"
}
```

**Transformed to:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

### Response Field Mapping

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    fieldMapping: {
      user_id: 'id',
      user_name: 'username',
      created_at: 'createdAt'
    }
  }
}
```

**Original Response:**
```json
{
  "user_id": 123,
  "user_name": "johndoe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Transformed Response:**
```json
{
  "id": 123,
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Array Handling

Field mapping automatically handles arrays:

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    fieldMapping: {
      user_id: 'id',
      user_name: 'name'
    }
  }
}
```

**Original:**
```json
[
  { "user_id": 1, "user_name": "John" },
  { "user_id": 2, "user_name": "Jane" }
]
```

**Transformed:**
```json
[
  { "id": 1, "name": "John" },
  { "id": 2, "name": "Jane" }
]
```

## Field Removal

Remove sensitive or unnecessary fields from requests or responses.

### Remove from Request

```typescript
{
  path: '/api/users',
  method: 'POST',
  requestTransform: {
    removeFields: ['password', 'ssn', 'creditCard']
  }
}
```

### Remove from Response

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    removeFields: ['password', 'internalId', 'secretKey']
  }
}
```

**Original:**
```json
{
  "id": 1,
  "name": "John",
  "password": "hashed_password",
  "internalId": "internal-123"
}
```

**Transformed:**
```json
{
  "id": 1,
  "name": "John"
}
```

## Field Addition

Add static or dynamic fields to requests or responses.

### Add to Request

```typescript
{
  path: '/api/users',
  method: 'POST',
  requestTransform: {
    addFields: {
      createdAt: new Date().toISOString(),
      source: 'api',
      version: '1.0'
    }
  }
}
```

### Add to Response

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    addFields: {
      apiVersion: '2.0',
      timestamp: new Date().toISOString(),
      server: 'mock-api'
    }
  }
}
```

## Custom Transformation Functions

Apply complex transformation logic with custom functions.

### Basic Custom Function

```typescript
{
  path: '/api/users',
  method: 'POST',
  requestTransform: {
    customFunction: (data) => {
      return {
        ...data,
        name: data.name.toUpperCase(),
        email: data.email.toLowerCase()
      };
    }
  }
}
```

### Access Request Context

```typescript
{
  path: '/api/users',
  method: 'POST',
  requestTransform: {
    customFunction: (data, req) => {
      return {
        ...data,
        requestMethod: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

### Complex Response Transformation

```typescript
{
  path: '/api/users/:id',
  method: 'GET',
  responseTransform: {
    customFunction: (data, req) => {
      // Add computed fields
      const fullName = `${data.firstName} ${data.lastName}`;
      const age = calculateAge(data.birthDate);
      
      // Add request context
      const requestedId = req.params?.id;
      
      return {
        ...data,
        fullName,
        age,
        requestedId,
        _links: {
          self: `/api/users/${data.id}`,
          posts: `/api/users/${data.id}/posts`
        }
      };
    }
  }
}
```

## Response Wrapping

Wrap response data in a container object.

### Simple Wrapping

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    wrapResponse: 'data'
  }
}
```

**Original:**
```json
{
  "id": 1,
  "name": "John"
}
```

**Wrapped:**
```json
{
  "data": {
    "id": 1,
    "name": "John"
  }
}
```

### Combined with Other Transformations

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    fieldMapping: { user_id: 'id' },
    addFields: { version: '1.0' },
    wrapResponse: 'data'
  }
}
```

**Result:**
```json
{
  "data": {
    "id": 1,
    "name": "John",
    "version": "1.0"
  }
}
```

## Path Matching

### Exact Path Match

```typescript
{
  path: '/api/users',
  method: 'GET',
  responseTransform: { /* ... */ }
}
```

Matches: `/api/users`

### Path with Parameters

```typescript
{
  path: '/api/users/:id',
  method: 'GET',
  responseTransform: { /* ... */ }
}
```

Matches: `/api/users/123`, `/api/users/456`, etc.

### Multiple Methods

```typescript
{
  path: '/api/users',
  method: ['GET', 'POST', 'PUT'],
  requestTransform: { /* ... */ },
  responseTransform: { /* ... */ }
}
```

Applies to GET, POST, and PUT requests.

### All Methods

```typescript
{
  path: '/api/users',
  // No method specified - applies to all methods
  responseTransform: { /* ... */ }
}
```

## Examples

### Example 1: API Version Migration

Convert old API format to new format:

```typescript
{
  path: '/api/v1/users',
  method: 'GET',
  responseTransform: {
    fieldMapping: {
      user_id: 'id',
      user_name: 'username',
      email_address: 'email',
      created_date: 'createdAt'
    },
    removeFields: ['legacy_field', 'deprecated_field'],
    addFields: {
      apiVersion: 'v1',
      migrationNotice: 'Please migrate to v2'
    }
  }
}
```

### Example 2: Add HATEOAS Links

```typescript
{
  path: '/api/users/:id',
  method: 'GET',
  responseTransform: {
    customFunction: (data, req) => ({
      ...data,
      _links: {
        self: { href: `/api/users/${data.id}` },
        posts: { href: `/api/users/${data.id}/posts` },
        comments: { href: `/api/users/${data.id}/comments` }
      }
    })
  }
}
```

### Example 3: Sanitize User Input

```typescript
{
  path: '/api/users',
  method: 'POST',
  requestTransform: {
    customFunction: (data) => ({
      ...data,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      bio: data.bio?.substring(0, 500) // Limit bio length
    }),
    removeFields: ['password', 'confirmPassword'], // Remove sensitive fields
    addFields: {
      createdAt: new Date().toISOString(),
      status: 'active'
    }
  }
}
```

### Example 4: Standardize API Response Format

```typescript
{
  path: '/api/*',
  method: 'GET',
  responseTransform: {
    customFunction: (data, req) => data,
    addFields: {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    },
    wrapResponse: 'data'
  }
}
```

**Result:**
```json
{
  "data": {
    "id": 1,
    "name": "John"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "abc123"
}
```

### Example 5: Convert Between Formats

```typescript
{
  path: '/api/products',
  method: 'GET',
  responseTransform: {
    customFunction: (data) => {
      if (Array.isArray(data)) {
        return data.map(product => ({
          ...product,
          price: {
            amount: product.price,
            currency: 'USD',
            formatted: `$${product.price.toFixed(2)}`
          }
        }));
      }
      return data;
    }
  }
}
```

## Best Practices

1. **Order of Operations**: Transformations are applied in this order:
   - Custom function
   - Field mapping
   - Field removal
   - Field addition
   - Response wrapping (response only)

2. **Performance**: Custom functions are executed on every request. Keep them lightweight.

3. **Immutability**: Always return new objects from custom functions rather than mutating the input.

4. **Error Handling**: Transformation errors return a 400 error for requests. Response transformation errors fall back to original data.

5. **Testing**: Test transformations thoroughly, especially custom functions with complex logic.

6. **Documentation**: Document your transformations, especially custom functions, for team members.

## Dynamic Configuration

You can add/remove transformations at runtime:

```typescript
const transformMiddleware = createTransformationMiddleware();

// Add transformation
transformMiddleware.addTransformation({
  path: '/api/users',
  method: 'GET',
  responseTransform: { /* ... */ }
});

// Remove transformation
transformMiddleware.removeTransformation('/api/users', 'GET');

// Get all transformations
const allTransforms = transformMiddleware.getTransformations();
```

## Integration with Mock Data

Transformations work seamlessly with mock data endpoints:

```typescript
// Mock data file: data/users.json
{
  "name": "users",
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "response": [
        { "user_id": 1, "user_name": "John" }
      ]
    }
  ]
}

// Transformation config
{
  path: '/api/users',
  method: 'GET',
  responseTransform: {
    fieldMapping: {
      user_id: 'id',
      user_name: 'name'
    }
  }
}

// Client receives:
[
  { "id": 1, "name": "John" }
]
```

## Troubleshooting

### Transformation Not Applied

- Check path and method match exactly
- Verify transformation is loaded before middleware is applied
- Check for errors in custom functions

### Unexpected Results

- Review transformation order (custom → mapping → remove → add → wrap)
- Check for field name conflicts
- Verify custom function returns correct data structure

### Performance Issues

- Profile custom functions for bottlenecks
- Consider caching computed values
- Avoid heavy operations in transformation functions
