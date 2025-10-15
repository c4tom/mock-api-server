# Database Persistence Feature Test

## Quick Test Instructions

### 1. Enable SQLite Database

Create or update `.env.local`:

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_ENABLED=true
DATABASE_TYPE=sqlite
DATABASE_SQLITE_FILENAME=./data/test-mock.db
DATABASE_AUTO_MIGRATE=true
DATABASE_SYNC_ON_STARTUP=true

# Mock Data
MOCK_DATA_PATH=./data
ENABLE_CRUD=true

# Auth (disabled for testing)
AUTH_ENABLED=false

# CORS
CORS_ORIGINS=*

# Admin
ADMIN_ENABLED=true

# Logging
LOG_LEVEL=info
```

### 2. Create Test Data File

Create `data/test-users.json`:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/mock/test-users",
      "response": [
        {
          "id": 1,
          "name": "Test User 1",
          "email": "test1@example.com"
        }
      ],
      "statusCode": 200
    }
  ]
}
```

### 3. Start Server

```bash
npm run dev
```

Expected log output:
```
Database connected successfully
Database persistence enabled
```

### 4. Test Database Health

```bash
curl http://localhost:3000/admin/database/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "type": "sqlite",
    "latency": 2
  }
}
```

### 5. Test CRUD Operations

#### Create
```bash
curl -X POST http://localhost:3000/mock/test-users \
  -H "Content-Type: application/json" \
  -d '{"name": "New User", "email": "new@example.com"}'
```

Expected: Status 201 with created user data

#### Read
```bash
curl http://localhost:3000/mock/test-users
```

Expected: Array with initial user and newly created user

#### Update
```bash
curl -X PUT http://localhost:3000/mock/test-users/2 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated User", "email": "updated@example.com"}'
```

Expected: Status 200 with updated user data

#### Delete
```bash
curl -X DELETE http://localhost:3000/mock/test-users/2
```

Expected: Status 204 (No Content)

### 6. Test Persistence

1. Stop the server (Ctrl+C)
2. Restart the server: `npm run dev`
3. Query the data: `curl http://localhost:3000/mock/test-users`

Expected: Data should still be present (proving persistence)

### 7. Verify Database File

```bash
ls -lh ./data/test-mock.db
```

Expected: Database file exists

### 8. Cleanup

```bash
rm ./data/test-mock.db
rm ./data/test-users.json
```

## Success Criteria

✅ Server starts with database enabled
✅ Database health endpoint returns connected status
✅ Create operation persists data
✅ Read operation retrieves data from database
✅ Update operation modifies data in database
✅ Delete operation removes data from database
✅ Data persists across server restarts
✅ Database file is created

## Troubleshooting

### Database not connecting
- Check that `DATABASE_ENABLED=true`
- Verify `./data` directory exists
- Check file permissions

### Data not persisting
- Ensure `ENABLE_CRUD=true`
- Check database health endpoint
- Review server logs for errors

### Permission errors
```bash
mkdir -p ./data
chmod 755 ./data
```

## Notes

- This test uses SQLite for simplicity
- PostgreSQL and MongoDB require external database servers
- The implementation is backward compatible - disabling database falls back to in-memory storage
