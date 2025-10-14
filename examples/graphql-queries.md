# GraphQL Query Examples

This document contains example GraphQL queries and mutations you can use with the Mock API Server.

## Table of Contents

- [Basic Queries](#basic-queries)
- [Queries with Variables](#queries-with-variables)
- [Nested Queries](#nested-queries)
- [Mutations](#mutations)
- [Advanced Queries](#advanced-queries)
- [Using cURL](#using-curl)
- [Using JavaScript](#using-javascript)

## Basic Queries

### Hello Query

```graphql
query {
  hello
}
```

**Response:**
```json
{
  "data": {
    "hello": "Hello from GraphQL Mock Server!"
  }
}
```

### Get All Users

```graphql
query {
  users {
    id
    name
    email
  }
}
```

### Get All Posts

```graphql
query {
  posts {
    id
    title
    content
  }
}
```

## Queries with Variables

### Get User by ID

**Query:**
```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    name
    email
  }
}
```

**Variables:**
```json
{
  "userId": "1"
}
```

### Get Post by ID

**Query:**
```graphql
query GetPost($postId: ID!) {
  post(id: $postId) {
    id
    title
    content
  }
}
```

**Variables:**
```json
{
  "postId": "1"
}
```

## Nested Queries

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

### Get Posts with Authors

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

### Get Multiple Users with Their Posts

```graphql
query GetUsersWithPosts {
  users {
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

## Mutations

### Create User

**Mutation:**
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
  "name": "Alice Johnson",
  "email": "alice@example.com"
}
```

### Update User

**Mutation:**
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
  "name": "Alice Smith",
  "email": "alice.smith@example.com"
}
```

### Delete User

**Mutation:**
```graphql
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id)
}
```

**Variables:**
```json
{
  "id": "1"
}
```

### Create Post

**Mutation:**
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
  "title": "My First GraphQL Post",
  "content": "This is the content of my first post using GraphQL.",
  "userId": "1"
}
```

### Update Post

**Mutation:**
```graphql
mutation UpdatePost($id: ID!, $title: String, $content: String) {
  updatePost(id: $id, title: $title, content: $content) {
    id
    title
    content
  }
}
```

**Variables:**
```json
{
  "id": "1",
  "title": "Updated Post Title",
  "content": "This is the updated content."
}
```

### Delete Post

**Mutation:**
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

## Advanced Queries

### Using Fragments

```graphql
fragment UserFields on User {
  id
  name
  email
}

fragment PostFields on Post {
  id
  title
  content
}

query GetUsersAndPosts {
  users {
    ...UserFields
    posts {
      ...PostFields
    }
  }
}
```

### Multiple Queries in One Request

```graphql
query GetMultipleData {
  users {
    id
    name
  }
  posts {
    id
    title
  }
}
```

### Aliasing

```graphql
query GetMultipleUsers {
  user1: user(id: "1") {
    id
    name
    email
  }
  user2: user(id: "2") {
    id
    name
    email
  }
}
```

### Inline Fragments

```graphql
query GetUserData($userId: ID!) {
  user(id: $userId) {
    id
    name
    ... on User {
      email
      posts {
        id
        title
      }
    }
  }
}
```

## Using cURL

### Simple Query

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'
```

### Query with Variables

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetUser($userId: ID!) { user(id: $userId) { id name email } }",
    "variables": {"userId": "1"}
  }'
```

### Mutation

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateUser($name: String!, $email: String!) { createUser(name: $name, email: $email) { id name email } }",
    "variables": {"name": "John Doe", "email": "john@example.com"}
  }'
```

### With Authentication

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-12345" \
  -d '{"query": "{ users { id name } }"}'
```

## Using JavaScript

### Fetch API

```javascript
async function graphqlQuery(query, variables = {}) {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();
  return result.data;
}

// Usage
const data = await graphqlQuery(`
  query GetUser($userId: ID!) {
    user(id: $userId) {
      id
      name
      email
    }
  }
`, { userId: '1' });

console.log(data.user);
```

### Axios

```javascript
const axios = require('axios');

async function graphqlQuery(query, variables = {}) {
  const response = await axios.post('http://localhost:3000/graphql', {
    query,
    variables,
  });

  return response.data.data;
}

// Usage
const data = await graphqlQuery(`
  query {
    users {
      id
      name
      email
    }
  }
`);

console.log(data.users);
```

### With Authentication

```javascript
async function authenticatedGraphqlQuery(query, variables = {}, token) {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();
  return result.data;
}

// Usage
const data = await authenticatedGraphqlQuery(
  `query { users { id name } }`,
  {},
  'dev-12345'
);
```

## Testing in GraphQL Playground

1. Start the server:
   ```bash
   npm run dev
   ```

2. Open your browser to:
   ```
   http://localhost:3000/graphql
   ```

3. The GraphQL Playground will load with:
   - Query editor on the left
   - Variables editor at the bottom
   - Results panel on the right
   - Schema documentation on the right sidebar

4. Try the hello query:
   ```graphql
   query {
     hello
   }
   ```

5. Click the "Play" button to execute

## Common Patterns

### Pagination (Future Enhancement)

```graphql
query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    name
    email
  }
}
```

### Filtering (Future Enhancement)

```graphql
query GetUsersByRole($role: String!) {
  users(role: $role) {
    id
    name
    email
  }
}
```

### Sorting (Future Enhancement)

```graphql
query GetUsersSorted($sortBy: String, $order: String) {
  users(sortBy: $sortBy, order: $order) {
    id
    name
    email
  }
}
```

## Error Handling

### Invalid Query

**Query:**
```graphql
query {
  invalidField
}
```

**Response:**
```json
{
  "errors": [
    {
      "message": "Cannot query field \"invalidField\" on type \"Query\".",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ]
    }
  ]
}
```

### Missing Required Variable

**Query:**
```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    name
  }
}
```

**Variables:** (empty)

**Response:**
```json
{
  "errors": [
    {
      "message": "Variable \"$userId\" of required type \"ID!\" was not provided."
    }
  ]
}
```

## Best Practices

1. **Use Variables**: Always use variables instead of inline values
2. **Request Only What You Need**: Only query the fields you actually need
3. **Use Fragments**: Reuse common field selections with fragments
4. **Handle Errors**: Always check for errors in the response
5. **Use Aliases**: When querying the same field multiple times
6. **Add Operation Names**: Name your queries and mutations for better debugging

## Additional Resources

- [GraphQL Official Documentation](https://graphql.org/learn/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [GraphQL Playground Documentation](https://github.com/graphql/graphql-playground)
