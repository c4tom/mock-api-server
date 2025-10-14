# Mock Data Files

This directory contains sample mock data files for the Mock API Server. Each JSON file defines a mock endpoint with its configuration and response data.

## File Structure

Each mock data file follows this structure:

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

## Available Mock Endpoints

### 1. Users (`users.json`)
- **Endpoint**: `/api/users`
- **Method**: GET
- **Description**: Returns a list of users with profiles
- **Features**: Nested profile objects, user roles, timestamps

### 2. Posts (`posts.json`)
- **Endpoint**: `/api/posts`
- **Method**: GET
- **Description**: Blog posts with comments
- **Features**: Relationships (userId), nested comments, tags array

### 3. Products (`products.json`)
- **Endpoint**: `/api/products`
- **Method**: GET
- **Description**: E-commerce product catalog
- **Features**: Nested specifications, ratings, image arrays, inventory tracking

### 4. Todos (`todos.json`)
- **Endpoint**: `/api/todos`
- **Method**: GET
- **Description**: Task management items
- **Features**: Priority levels, due dates, tags, completion status

### 5. Books XML (`xml-example.json`)
- **Endpoint**: `/api/books`
- **Method**: GET
- **Content-Type**: application/xml
- **Description**: Demonstrates XML response format

### 6. Status Text (`text-example.json`)
- **Endpoint**: `/api/status`
- **Method**: GET
- **Content-Type**: text/plain
- **Description**: Demonstrates plain text response format

### 7. Organizations (`nested-relationships.json`)
- **Endpoint**: `/api/organizations`
- **Method**: GET
- **Description**: Complex nested data structure
- **Features**: Multiple levels of nesting, departments, teams, projects, milestones

## Using Mock Data

### Loading Mock Data

The server automatically loads all JSON files from this directory on startup. Configure the path in your `.env` file:

```bash
MOCK_DATA_PATH=./data
```

### CRUD Operations

When `ENABLE_CRUD=true` is set, the server supports:

- **GET**: Retrieve mock data
- **POST**: Add new items (stored in memory)
- **PUT**: Update existing items
- **DELETE**: Remove items

Example POST request:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "new@example.com",
    "firstName": "New",
    "lastName": "User"
  }'
```

### Response Delays

Simulate network latency by setting the `delay` field (in milliseconds):

```json
{
  "delay": 100
}
```

## Creating Custom Mock Data

1. Create a new JSON file in this directory
2. Follow the structure shown above
3. Restart the server or use the reload endpoint:

```bash
curl -X POST http://localhost:3000/admin/reload
```

## Tips

- Use realistic data for better testing
- Include edge cases (null values, empty arrays, etc.)
- Add relationships between entities using IDs
- Test different response formats (JSON, XML, text)
- Use delays to simulate real-world API behavior
