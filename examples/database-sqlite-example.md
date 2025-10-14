# SQLite Database Persistence Example

This example demonstrates how to use SQLite database persistence with the Mock API Server.

## Setup

1. **Configure environment variables** (`.env.local`):

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Enable Database Persistence
DATABASE_ENABLED=true
DATABASE_TYPE=sqlite
DATABASE_SQLITE_FILENAME=./data/mock-data.db
DATABASE_SQLITE_MEMORY=false
DATABASE_AUTO_MIGRATE=true
DATABASE_SYNC_ON_STARTUP=true

# Mock Data Configuration
MOCK_DATA_PATH=./data
ENABLE_CRUD=true
DEFAULT_DELAY=0

# Authentication (optional)
AUTH_ENABLED=false

# CORS
CORS_ORIGINS=*

# Admin
ADMIN_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=simple
```

2. **Create mock data file** (`data/users.json`):

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/mock/users",
      "response": [
        {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "role": "admin"
        },
        {
          "id": 2,
          "name": "Jane Smith",
          "email": "jane@example.com",
          "role": "user"
        }
      ],
      "statusCode": 200
    }
  ]
}
```

3. **Start the server**:

```bash
npm run dev
```

## Usage

### 1. Get All Users

```bash
curl http://localhost:3000/mock/users
```

Response:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. Create New User

```bash
curl -X POST http://localhost:3000/mock/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Johnson",
    "email": "bob@example.com",
    "role": "user"
  }'
```

Response:
```json
{
  "id": 3,
  "name": "Bob Johnson",
  "email": "bob@example.com",
  "role": "user",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### 3. Update User

```bash
curl -X PUT http://localhost:3000/mock/users/3 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Johnson",
    "email": "bob.johnson@example.com",
    "role": "admin"
  }'
```

Response:
```json
{
  "id": 3,
  "name": "Bob Johnson",
  "email": "bob.johnson@example.com",
  "role": "admin",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

### 4. Delete User

```bash
curl -X DELETE http://localhost:3000/mock/users/3
```

Response: `204 No Content`

### 5. Check Database Health

```bash
curl http://localhost:3000/admin/database/health
```

Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "type": "sqlite",
    "latency": 2
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "abc123"
  }
}
```

## Persistence Verification

1. **Create a user**:
```bash
curl -X POST http://localhost:3000/mock/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "role": "user"}'
```

2. **Stop the server**: Press `Ctrl+C`

3. **Restart the server**:
```bash
npm run dev
```

4. **Verify data persisted**:
```bash
curl http://localhost:3000/mock/users
```

You should see the "Test User" in the response, confirming data persistence!

## Database File Location

The SQLite database file is stored at: `./data/mock-data.db`

You can inspect it using SQLite tools:

```bash
# Install sqlite3 (if not already installed)
# macOS: brew install sqlite
# Ubuntu: sudo apt-get install sqlite3

# Open database
sqlite3 ./data/mock-data.db

# List tables
.tables

# Query users table
SELECT * FROM users;

# Exit
.quit
```

## Advantages of SQLite

- **No external dependencies**: No need to install a separate database server
- **Simple setup**: Just enable in configuration
- **Portable**: Single file database
- **Perfect for development**: Fast and easy to use
- **Data persistence**: Survives server restarts

## Limitations

- **Single server**: Not suitable for multi-server deployments
- **Concurrency**: Limited concurrent write operations
- **Scalability**: Not ideal for high-traffic production environments

For production use cases, consider PostgreSQL or MongoDB.

## Troubleshooting

### Database file not created

- Ensure the `./data` directory exists
- Check file permissions
- Verify `DATABASE_ENABLED=true` in `.env.local`

### Data not persisting

- Check that `ENABLE_CRUD=true`
- Verify database connection in server logs
- Check database health endpoint

### Permission errors

```bash
# Fix permissions
chmod 755 ./data
chmod 644 ./data/mock-data.db
```

## Next Steps

- Try [PostgreSQL example](./database-postgresql-example.md) for production
- Try [MongoDB example](./database-mongodb-example.md) for flexible schemas
- Read the [Database Guide](../docs/DATABASE_GUIDE.md) for more details
