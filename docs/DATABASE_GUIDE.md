# Database Persistence Guide

This guide explains how to use database persistence for mock data in the Mock API Server.

## Overview

The Mock API Server supports optional database persistence for mock data, allowing CRUD operations to persist across server restarts. This feature supports three database types:

- **SQLite** - File-based or in-memory database (recommended for development)
- **PostgreSQL** - Full-featured relational database (recommended for production)
- **MongoDB** - NoSQL document database (for flexible schema requirements)

## Configuration

### Enable Database Persistence

Add the following to your `.env.local` or `.env.production` file:

```bash
# Enable database persistence
DATABASE_ENABLED=true

# Choose database type
DATABASE_TYPE=sqlite  # or postgresql, mongodb
```

### SQLite Configuration

SQLite is the simplest option and requires no external database server:

```bash
DATABASE_TYPE=sqlite
DATABASE_SQLITE_FILENAME=./data/mock-data.db
DATABASE_SQLITE_MEMORY=false  # Set to true for in-memory database
```

**Pros:**
- No external dependencies
- Easy setup
- Good for development and testing
- Portable (single file)

**Cons:**
- Not suitable for high-concurrency scenarios
- Limited to single server instance

### PostgreSQL Configuration

PostgreSQL provides robust relational database features:

```bash
DATABASE_TYPE=postgresql
DATABASE_PG_HOST=localhost
DATABASE_PG_PORT=5432
DATABASE_PG_DATABASE=mockapi
DATABASE_PG_USERNAME=postgres
DATABASE_PG_PASSWORD=your-password
DATABASE_PG_SSL=false
DATABASE_PG_POOL_SIZE=10
```

**Pros:**
- Production-ready
- Supports multiple server instances
- ACID compliance
- Advanced querying capabilities

**Cons:**
- Requires PostgreSQL server
- More complex setup

### MongoDB Configuration

MongoDB offers flexible schema and document-based storage:

```bash
DATABASE_TYPE=mongodb
DATABASE_MONGO_URI=mongodb://localhost:27017
DATABASE_MONGO_DATABASE=mockapi
DATABASE_MONGO_MAX_POOL=10
DATABASE_MONGO_MIN_POOL=2
DATABASE_MONGO_TIMEOUT=5000
```

**Pros:**
- Flexible schema
- Good for nested/complex data structures
- Horizontal scaling support
- JSON-native storage

**Cons:**
- Requires MongoDB server
- Different query paradigm

### Database Options

```bash
# Automatically create tables/collections on startup
DATABASE_AUTO_MIGRATE=true

# Sync initial mock data to database on startup
DATABASE_SYNC_ON_STARTUP=true
```

## How It Works

### Data Synchronization

When database persistence is enabled:

1. **On Startup**: If `DATABASE_SYNC_ON_STARTUP=true`, the server will:
   - Check if collections exist in the database
   - If empty, seed them with initial data from JSON files
   - If data exists, use the database as the source of truth

2. **CRUD Operations**: All POST, PUT, DELETE operations are persisted to the database

3. **GET Requests**: Data is fetched from the database instead of in-memory storage

### Collection Naming

Collections/tables are automatically created based on endpoint paths:

- `/mock/users` → `users` collection
- `/mock/api/posts` → `api_posts` collection
- `/mock/products/:id` → `products` collection

### Data Structure

Each record in the database includes:

```json
{
  "id": 1,
  "data": { /* your mock data */ },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Example 1: SQLite for Development

```bash
# .env.local
DATABASE_ENABLED=true
DATABASE_TYPE=sqlite
DATABASE_SQLITE_FILENAME=./data/dev-mock.db
DATABASE_AUTO_MIGRATE=true
DATABASE_SYNC_ON_STARTUP=true
```

### Example 2: PostgreSQL for Production

```bash
# .env.production
DATABASE_ENABLED=true
DATABASE_TYPE=postgresql
DATABASE_PG_HOST=db.example.com
DATABASE_PG_PORT=5432
DATABASE_PG_DATABASE=mockapi_prod
DATABASE_PG_USERNAME=mockapi_user
DATABASE_PG_PASSWORD=${DB_PASSWORD}  # Use environment variable
DATABASE_PG_SSL=true
DATABASE_PG_POOL_SIZE=20
DATABASE_AUTO_MIGRATE=true
DATABASE_SYNC_ON_STARTUP=false  # Don't overwrite production data
```

### Example 3: MongoDB for Flexible Schema

```bash
# .env.local
DATABASE_ENABLED=true
DATABASE_TYPE=mongodb
DATABASE_MONGO_URI=mongodb://localhost:27017
DATABASE_MONGO_DATABASE=mockapi_dev
DATABASE_AUTO_MIGRATE=true
DATABASE_SYNC_ON_STARTUP=true
```

## API Operations

### Create (POST)

```bash
curl -X POST http://localhost:3000/mock/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

Response:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Read (GET)

```bash
# Get all users
curl http://localhost:3000/mock/users

# Get specific user
curl http://localhost:3000/mock/users/1
```

### Update (PUT)

```bash
curl -X PUT http://localhost:3000/mock/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}'
```

### Delete (DELETE)

```bash
curl -X DELETE http://localhost:3000/mock/users/1
```

## Health Check

Check database connection status:

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
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "abc123"
  }
}
```

## Migration from In-Memory to Database

To migrate existing in-memory data to database:

1. **Enable database persistence**:
   ```bash
   DATABASE_ENABLED=true
   DATABASE_SYNC_ON_STARTUP=true
   ```

2. **Restart the server**: Initial data from JSON files will be seeded to the database

3. **Verify data**: Check that data is persisted by restarting the server and querying endpoints

4. **Disable sync** (optional): Once data is seeded, you can disable sync:
   ```bash
   DATABASE_SYNC_ON_STARTUP=false
   ```

## Troubleshooting

### Connection Errors

**SQLite:**
- Ensure the directory for the database file exists
- Check file permissions

**PostgreSQL:**
- Verify PostgreSQL server is running
- Check connection credentials
- Ensure database exists: `CREATE DATABASE mockapi;`
- Check firewall/network settings

**MongoDB:**
- Verify MongoDB server is running
- Check connection URI format
- Ensure database user has proper permissions

### Data Not Persisting

1. Check that `DATABASE_ENABLED=true`
2. Verify database connection in logs
3. Check database health endpoint: `/admin/database/health`
4. Ensure CRUD operations are enabled: `ENABLE_CRUD=true`

### Performance Issues

**SQLite:**
- Consider using PostgreSQL for high-concurrency scenarios
- Enable WAL mode for better concurrent access

**PostgreSQL:**
- Increase pool size: `DATABASE_PG_POOL_SIZE=20`
- Add database indexes for frequently queried fields
- Monitor connection pool usage

**MongoDB:**
- Increase pool size: `DATABASE_MONGO_MAX_POOL=20`
- Add indexes for frequently queried fields
- Monitor connection pool usage

## Best Practices

1. **Development**: Use SQLite for simplicity
2. **Production**: Use PostgreSQL or MongoDB for reliability
3. **Backups**: Regularly backup your database
4. **Security**: Use strong passwords and SSL connections in production
5. **Monitoring**: Monitor database health and connection pool usage
6. **Testing**: Test database failover and recovery procedures

## Advanced Configuration

### Connection Pooling

Adjust pool sizes based on your load:

```bash
# PostgreSQL
DATABASE_PG_POOL_SIZE=20  # Max connections

# MongoDB
DATABASE_MONGO_MAX_POOL=20  # Max connections
DATABASE_MONGO_MIN_POOL=5   # Min connections
```

### SSL/TLS Connections

For production environments:

```bash
# PostgreSQL
DATABASE_PG_SSL=true

# MongoDB (include in URI)
DATABASE_MONGO_URI=mongodb://user:pass@host:27017/db?ssl=true
```

### Read Replicas (Advanced)

For high-availability setups, configure read replicas in your database and update connection strings accordingly.

## Examples

See the `examples/` directory for complete examples:
- `examples/database-sqlite-example.md`
- `examples/database-postgresql-example.md`
- `examples/database-mongodb-example.md`

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Configuration Guide](../README.md#configuration)
- [Troubleshooting](./TROUBLESHOOTING.md)
