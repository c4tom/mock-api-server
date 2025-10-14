# GraphQL Guide

This guide explains how to use the GraphQL functionality in the Mock API Server.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Mock Data](#mock-data)
- [GraphQL Playground](#graphql-playground)
- [Custom Schema](#custom-schema)
- [GraphQL Proxy](#graphql-proxy)
- [Example Queries](#example-queries)
- [Example Mutations](#example-mutations)
- [Authentication](#authentication)
- [Best Practices](#best-practices)

## Overview

The Mock API Server includes built-in GraphQL support that allows you to:

- Serve mock GraphQL data with a default or custom schema
- Use GraphQL Playground for interactive query development
- Proxy GraphQL requests to external GraphQL APIs
- Integrate with existing authentication mechanisms

## Configuration

### Environment Variables

Add these variables to your `.env.local` or `.env.production` file:

```bash
# Enable GraphQL endpoint
GRAPHQL_ENABLED=true

# GraphQL endpoint path (default: /graphql)
GRAPHQL_PATH=/graphql

# Path to custom GraphQL schema file (optional)
GRAPHQL_SCHEMA_PATH=./data/graphql-schema.graphql

# Enable GraphQL Playground (default: true in development)
GRAPHQL_PLAYGROUND=true

# Enable schema introspection (default: true in development)
GRAPHQL_INTROSPECTION=true

# Enable GraphQL proxy functionality
GRAPHQL_PROXY_ENABLED=false

# External GraphQL endpoint to proxy to
GRAPHQL_PROXY_ENDPOINT=https://api.example.com/graphql

# Proxy authentication type (bearer, basic, apikey)
GRAPHQL_PROXY_AUTH_TYPE=bearer
GRAPHQL_PROXY_AUTH_TOKEN=your-token-here
```

### Development Configuration

For development, use these settings in `.env.local`:

```bash
GRAPHQL_ENABLED=true
GRAPHQL_PATH=/graphql
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true
GRAPHQL_PROXY_ENABLED=false
```

### Production Configuration

For production, use these settings in `.env.production`:

```bash
GRAPHQL_ENABLED=true
GRAPHQL_PATH=/graphql
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false
GRAPHQL_PROXY_ENABLED=true
GRAPHQL_PROXY_ENDPOINT=https://api.production.com/graphql
GRAPHQL_PROXY_AUTH_TYPE=bearer
GRAPHQL_PROXY_AUTH_TOKEN=your-production-token
```

## Mock Data

The GraphQL handler automatically loads mock data from:

1. Configuration (`mockData` property)
2. JSON files in the `data/` directory:
   - `data/users.json` - User data
   - `data/posts.json` - Post data

### Default Schema

The default schema includes:

**Types:**
- `User` - User with id, name, email, and posts
- `Post` - Post with id, title, content, userId, and user

**Queries:**
- `hello` - Returns a greeting message
- `user(id: ID!)` - Get a user by ID
- `users` - Get all users
- `post(id: ID!)` - Get a post by ID
- `posts` - Get all posts

**Mutations:**
- `createUser(name: String!, email: String!)` - Create a new user
- `updateUser(id: ID!, name: String, email: String)` - Update a user
- `deleteUser(id: ID!)` - Delete a user
- `createPost(title: String!, content: String!, userId: ID!)` - Create a new post
- `updatePost(id: ID!, title: String, content: String)` - Update a post
- `deletePost(id: ID!)` - Delete a post

## GraphQL Playground

When `GRAPHQL_PLAYGROUND=true`, you can access an interactive GraphQL Playground at your GraphQL endpoint URL.

### Accessing Playground

1. Start the server
2. Open your browser to `http://localhost:3000/graphql`
3. The GraphQL Playground interface will load

### Features

- Interactive query editor with syntax highlighting
- Auto-completion for queries and mutations
- Schema documentation browser
- Query history
- Variable editor
- Response viewer

## Custom Schema

You can provide a custom GraphQL schema file:

### 1. Create Schema File

Create a file at `data/graphql-schema.graphql`:

```graphql
type Query {
  hello: String!
  products: [Product!]!
  product(id: ID!): Product
}

type Mutation {
  createProduct(name: String!, price: Float!): Product!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  description: String
}
```

### 2. Configure Schema Path

Set the schema path in your environment file:

```bash
GRAPHQL_SCHEMA_PATH=./data/graphql-schema.graphql
```

### 3. Implement Resolvers

The handler will use the default resolvers for the schema. For custom logic, you'll need to modify the `GraphQLHandler` class.

## GraphQL Proxy

The GraphQL proxy allows you to forward GraphQL requests to an external GraphQL API while adding CORS headers and authentication.

### Configuration

```bash
GRAPHQL_PROXY_ENABLED=true
GRAPHQL_PROXY_ENDPOINT=https://api.github.com/graphql
GRAPHQL_PROXY_AUTH_TYPE=bearer
GRAPHQL_PROXY_AUTH_TOKEN=ghp_your_github_token
```

### Proxy Endpoint

Send requests to `/graphql/proxy` instead of `/graphql`:

```bash
curl -X POST http://localhost:3000/graphql/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ viewer { login } }"
  }'
```

### Authentication Types

**Bearer Token:**
```bash
GRAPHQL_PROXY_AUTH_TYPE=bearer
GRAPHQL_PROXY_AUTH_TOKEN=your-bearer-token
```

**Basic Authentication:**
```bash
GRAPHQL_PROXY_AUTH_TYPE=basic
GRAPHQL_PROXY_AUTH_USERNAME=username
GRAPHQL_PROXY_AUTH_PASSWORD=password
```

**API Key:**
```bash
GRAPHQL_PROXY_AUTH_TYPE=apikey
GRAPHQL_PROXY_AUTH_HEADER=X-API-Key
GRAPHQL_PROXY_AUTH_VALUE=your-api-key
```

## Example Queries

### Get All Users

```graphql
query GetAllUsers {
  users {
    id
    name
    email
  }
}
```

### Get User with Posts

```graphql
query GetUserWithPosts($userId: ID!) {
  user(id: $userId) {
    id
    name
    email
    posts {
      id
      title
      content
    }
  }
}
```

**Variables:**
```json
{
  "userId": "1"
}
```

### Get All Posts with Authors

```graphql
query GetPostsWithAuthors {
  posts {
    id
    title
    content
    user {
      id
      name
      email
    }
  }
}
```

## Example Mutations

### Create User

```graphql
mutation CreateUser($name: String!, $email: String!) {
  createUser(name: $name, email: $email) {
    id
    name
    email
  }
}
```

**Variables:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Update User

```graphql
mutation UpdateUser($id: ID!, $name: String, $email: String) {
  updateUser(id: $id, name: $name, email: $email) {
    id
    name
    email
  }
}
```

**Variables:**
```json
{
  "id": "1",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### Create Post

```graphql
mutation CreatePost($title: String!, $content: String!, $userId: ID!) {
  createPost(title: $title, content: $content, userId: $userId) {
    id
    title
    content
    user {
      name
    }
  }
}
```

**Variables:**
```json
{
  "title": "My First Post",
  "content": "This is the content of my first post.",
  "userId": "1"
}
```

### Delete Post

```graphql
mutation DeletePost($id: ID!) {
  deletePost(id: $id)
}
```

**Variables:**
```json
{
  "id": "1"
}
```

## Authentication

GraphQL endpoints respect the server's authentication configuration.

### With Authentication Enabled

If `AUTH_ENABLED=true`, include authentication headers:

**JWT:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"query": "{ users { id name } }"}'
```

**Dev Token:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-12345" \
  -d '{"query": "{ users { id name } }"}'
```

**Basic Auth:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -u username:password \
  -d '{"query": "{ users { id name } }"}'
```

## Best Practices

### Development

1. **Enable Playground**: Set `GRAPHQL_PLAYGROUND=true` for easy testing
2. **Enable Introspection**: Set `GRAPHQL_INTROSPECTION=true` for schema exploration
3. **Use Mock Data**: Load sample data from JSON files for realistic testing
4. **Disable Authentication**: Set `AUTH_ENABLED=false` for easier development

### Production

1. **Disable Playground**: Set `GRAPHQL_PLAYGROUND=false` to prevent public access
2. **Disable Introspection**: Set `GRAPHQL_INTROSPECTION=false` for security
3. **Enable Authentication**: Set `AUTH_ENABLED=true` to protect your API
4. **Use Proxy Mode**: Set `GRAPHQL_PROXY_ENABLED=true` to forward to production APIs
5. **Secure Tokens**: Use environment variables for sensitive tokens

### Performance

1. **Limit Query Depth**: Implement query depth limiting for complex queries
2. **Use Caching**: Cache frequently accessed data
3. **Optimize Resolvers**: Keep resolver logic efficient
4. **Monitor Performance**: Use admin endpoints to track GraphQL usage

### Security

1. **Validate Input**: Always validate user input in mutations
2. **Rate Limiting**: Use the server's rate limiting features
3. **CORS Configuration**: Set appropriate CORS origins
4. **Authentication**: Require authentication for sensitive operations
5. **Error Handling**: Don't expose sensitive information in error messages

## Admin Endpoints

### GraphQL Statistics

Get GraphQL endpoint statistics:

```bash
curl http://localhost:3000/admin/graphql/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "path": "/graphql",
    "playground": true,
    "introspection": true,
    "proxyEnabled": false,
    "proxyEndpoint": null
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc123"
  }
}
```

## Troubleshooting

### GraphQL Not Enabled

**Error:**
```json
{
  "error": {
    "code": "GRAPHQL_NOT_ENABLED",
    "message": "GraphQL endpoint is not enabled"
  }
}
```

**Solution:** Set `GRAPHQL_ENABLED=true` in your environment file.

### Schema Not Found

**Error:**
```
GraphQL schema file not found: ./data/graphql-schema.graphql
```

**Solution:** 
- Check that the schema file exists at the specified path
- Verify the `GRAPHQL_SCHEMA_PATH` configuration
- The handler will fall back to the default schema if the file is not found

### Playground Not Loading

**Issue:** GraphQL Playground doesn't load in the browser.

**Solution:**
- Ensure `GRAPHQL_PLAYGROUND=true`
- Check browser console for errors
- Verify the GraphQL endpoint is accessible
- Try accessing via GET request

### Proxy Connection Failed

**Error:**
```json
{
  "error": {
    "code": "GRAPHQL_PROXY_ERROR",
    "message": "Failed to connect to proxy endpoint"
  }
}
```

**Solution:**
- Verify `GRAPHQL_PROXY_ENDPOINT` is correct
- Check authentication credentials
- Ensure the external API is accessible
- Check network connectivity

## Examples

See the `examples/` directory for complete examples:

- `examples/graphql-queries.md` - Sample queries and mutations
- `examples/graphql-client.js` - JavaScript client example
- `examples/graphql-proxy.md` - Proxy configuration examples

## Additional Resources

- [GraphQL Official Documentation](https://graphql.org/)
- [GraphQL Playground](https://github.com/graphql/graphql-playground)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [GraphQL Schema Design](https://www.apollographql.com/docs/apollo-server/schema/schema/)
