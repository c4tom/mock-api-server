# API Reference

Complete API documentation for the Mock API Server.

## Table of Contents

- [Mock Data Endpoints](#mock-data-endpoints)
- [Proxy Endpoints](#proxy-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Authentication](#authentication)
- [Error Responses](#error-responses)

## Mock Data Endpoints

Mock endpoints are dynamically created based on JSON files in your configured `MOCK_DATA_PATH`.

### Endpoint Structure

Each mock data file defines an endpoint:

```json
{
  "endpoint": "/api/resource",
  "method": "GET",
  "statusCode": 200,
  "delay": 0,
  "headers": {
    "Content-Type": "application/json"
  },
  "response": { ... }
}
```

### GET Requests

Retrieve mock data from configured endpoints.

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3000
```

**Response:**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john.doe@example.com"
}
```

### POST Requests (CRUD Enabled)

Create new resources when `ENABLE_CRUD=true`.

**Request:**
```http
POST /api/users HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "newuser",
  "email": "new@example.com"
}
```

**Response:**
```json
{
  "id": 4,
  "username": "newuser",
  "email": "new@example.com",
  "createdAt": "2024-10-14T12:00:00Z"
}
```

### PUT Requests (CRUD Enabled)

Update existing resources.

**Request:**
```http
PUT /api/users/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "email": "updated@example.com"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "updated@example.com"
}
```

### DELETE Requests (CRUD Enabled)

Delete resources.

**Request:**
```http
DELETE /api/users/1 HTTP/1.1
Host: localhost:3000
```

**Response:**
```http
HTTP/1.1 204 No Content
```

### Query Parameters

Mock endpoints support basic query parameters for filtering:

**Request:**
```http
GET /api/users?role=admin HTTP/1.1
```

**Response:**
```json
[
  {
    "id": 1,
    "username": "johndoe",
    "role": "admin"
  }
]
```

## Proxy Endpoints

### Named Proxy Routes

Use configured proxy routes for cleaner URLs.

**Configuration:**
```env
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com,github:https://api.github.com
```

**Request:**
```http
GET /proxy/jsonplaceholder/posts/1 HTTP/1.1
Host: localhost:3000
```

**Proxied to:**
```
https://jsonplaceholder.typicode.com/posts/1
```

**Response:**
```json
{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident",
  "body": "quia et suscipit..."
}
```

### Direct URL Proxy

Proxy to any allowed URL using query parameter.

**Request:**
```http
GET /proxy?url=https://api.github.com/users/octocat HTTP/1.1
Host: localhost:3000
```

**Response:**
```json
{
  "login": "octocat",
  "id": 583231,
  "avatar_url": "https://avatars.githubusercontent.com/u/583231"
}
```

### Proxy with Authentication

Forward authentication headers to external APIs.

**Request:**
```http
GET /proxy/api/protected HTTP/1.1
Host: localhost:3000
Authorization: Bearer external-api-token
```

The `Authorization` header is forwarded to the external API.

### Proxy POST Requests

**Request:**
```http
POST /proxy/jsonplaceholder/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "title": "New Post",
  "body": "Content here",
  "userId": 1
}
```

**Response:**
```json
{
  "id": 101,
  "title": "New Post",
  "body": "Content here",
  "userId": 1
}
```

## Admin Endpoints

Administrative endpoints for server management.

### Health Check

Check server health and status.

**Request:**
```http
GET /admin/health HTTP/1.1
Host: localhost:3000
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2024-10-14T12:00:00Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### Configuration View

View current server configuration (sensitive data hidden).

**Request:**
```http
GET /admin/config HTTP/1.1
Host: localhost:3000
```

**Response:**
```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "environment": "development"
  },
  "security": {
    "authentication": {
      "enabled": false,
      "type": "dev-token"
    },
    "cors": {
      "allowedOrigins": ["*"]
    }
  },
  "mock": {
    "dataPath": "./data/mock",
    "enableCrud": true
  }
}
```

### Configuration Reload

Reload configuration from environment files without restarting.

**Request:**
```http
POST /admin/reload HTTP/1.1
Host: localhost:3000
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration reloaded successfully",
  "timestamp": "2024-10-14T12:00:00Z"
}
```

## Authentication

### No Authentication

When `AUTH_ENABLED=false`:

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3000
```

No authentication headers required.

### Dev Token

When `AUTH_TYPE=dev-token`:

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3000
Authorization: Bearer dev-12345
```

### Bypass Mode

When `AUTH_TYPE=bypass`:

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3000
X-Dev-Bypass: allow
```

### JWT Authentication

When `AUTH_TYPE=jwt`:

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### HTTP Basic Authentication

When `AUTH_TYPE=basic`:

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3000
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

Or using curl:
```bash
curl -u admin:password http://localhost:3000/api/users
```

## Error Responses

### 400 Bad Request

Invalid request format or parameters.

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request parameters",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456"
  }
}
```

### 401 Unauthorized

Missing or invalid authentication.

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "suggestions": [
      "Include Authorization header with valid token",
      "For development, use dev-token mode: AUTH_TYPE=dev-token"
    ]
  }
}
```

### 403 Forbidden

Origin not allowed or access denied.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Origin not allowed",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "details": {
      "origin": "https://unauthorized.com",
      "allowedOrigins": ["https://app.com"]
    }
  }
}
```

### 404 Not Found

Endpoint not configured.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Endpoint not found",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "suggestions": [
      "Check endpoint configuration in mock data files",
      "Verify MOCK_DATA_PATH is correct"
    ]
  }
}
```

### 413 Payload Too Large

Request body exceeds size limit.

```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Request payload exceeds maximum size",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "details": {
      "maxSize": "10MB",
      "receivedSize": "15MB"
    }
  }
}
```

### 415 Unsupported Media Type

Content-Type not supported.

```json
{
  "error": {
    "code": "UNSUPPORTED_MEDIA_TYPE",
    "message": "Content-Type not supported",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "details": {
      "received": "application/x-custom",
      "supported": ["application/json", "application/xml", "text/plain"]
    }
  }
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "details": {
      "limit": 100,
      "window": "15 minutes",
      "retryAfter": 300
    }
  }
}
```

**Response Headers:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1697289600
```

### 500 Internal Server Error

Server error.

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456"
  }
}
```

### 502 Bad Gateway

Proxy target unreachable.

```json
{
  "error": {
    "code": "BAD_GATEWAY",
    "message": "Unable to reach external API",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "details": {
      "targetUrl": "https://api.external.com",
      "reason": "Connection timeout"
    }
  }
}
```

### 503 Service Unavailable

Server temporarily unavailable.

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "timestamp": "2024-10-14T12:00:00Z",
    "requestId": "req-123456",
    "details": {
      "retryAfter": 60
    }
  }
}
```

## Response Headers

### Standard Headers

All responses include:

```http
X-Request-Id: req-123456
X-Response-Time: 45ms
Content-Type: application/json
```

### CORS Headers

When CORS is enabled:

```http
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Rate Limit Headers

When rate limiting is enabled:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1697289600
```

## Examples

### Complete Request/Response Flow

**Request:**
```http
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer dev-12345
Origin: https://app.com

{
  "title": "New Post",
  "body": "Content here",
  "userId": 1
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-Id: req-789012
X-Response-Time: 23ms
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Credentials: true

{
  "id": 101,
  "title": "New Post",
  "body": "Content here",
  "userId": 1,
  "createdAt": "2024-10-14T12:00:00Z"
}
```
