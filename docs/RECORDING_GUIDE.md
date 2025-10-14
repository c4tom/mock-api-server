# Request Recording and Replay Guide

The Mock API Server includes a powerful request recording and replay feature that allows you to capture real API requests and responses for testing, documentation, and debugging purposes.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Recording Requests](#recording-requests)
- [Managing Recordings](#managing-recordings)
- [Replaying Requests](#replaying-requests)
- [Collections](#collections)
- [Import/Export](#importexport)
- [API Reference](#api-reference)
- [Use Cases](#use-cases)

## Overview

The recording feature captures:
- Request method, URL, path, and query parameters
- Request headers and body
- Response status code, headers, and body
- Request duration
- Timestamp

Recordings can be:
- Stored in memory or persisted to files
- Organized into collections
- Exported and imported as JSON
- Replayed with optional modifications
- Filtered by method, path, or collection

## Configuration

Add these environment variables to your `.env` file:

```bash
# Enable request recording feature
RECORDING_ENABLED=true

# Auto-record all requests (if false, use /admin/recording/start to begin)
RECORDING_AUTO_RECORD=false

# Maximum number of recordings to keep in memory
RECORDING_MAX_RECORDINGS=1000

# Storage type: memory | file
RECORDING_STORAGE_TYPE=file

# Storage path for file-based storage
RECORDING_STORAGE_PATH=./data/recordings

# Paths to exclude from recording (comma-separated)
RECORDING_EXCLUDE_PATHS=/admin,/dashboard,/health

# Headers to include in recordings (comma-separated, empty = all)
RECORDING_INCLUDE_HEADERS=content-type,authorization,user-agent

# Headers to exclude from recordings (comma-separated)
RECORDING_EXCLUDE_HEADERS=cookie,set-cookie
```

### Configuration Options

- **RECORDING_ENABLED**: Enable/disable the recording feature
- **RECORDING_AUTO_RECORD**: Automatically record all requests on server start
- **RECORDING_MAX_RECORDINGS**: Maximum number of recordings to keep (oldest are removed first)
- **RECORDING_STORAGE_TYPE**: 
  - `memory`: Store recordings in memory (lost on restart)
  - `file`: Persist recordings to disk
- **RECORDING_STORAGE_PATH**: Directory for file storage
- **RECORDING_EXCLUDE_PATHS**: Paths to exclude from recording (e.g., admin endpoints)
- **RECORDING_INCLUDE_HEADERS**: Specific headers to include (empty = all headers)
- **RECORDING_EXCLUDE_HEADERS**: Headers to exclude (e.g., sensitive data)

## Recording Requests

### Start Recording

```bash
POST /admin/recording/start
```

Response:
```json
{
  "success": true,
  "message": "Recording started",
  "data": {
    "startedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Stop Recording

```bash
POST /admin/recording/stop
```

Response:
```json
{
  "success": true,
  "message": "Recording stopped",
  "data": {
    "stoppedAt": "2024-01-15T10:35:00.000Z",
    "recordingsCount": 42
  }
}
```

### Check Recording Status

```bash
GET /admin/recording/status
```

Response:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "recording": true,
    "autoRecord": false,
    "recordingsCount": 42,
    "collectionsCount": 3,
    "maxRecordings": 1000,
    "storageType": "file"
  }
}
```

## Managing Recordings

### List All Recordings

```bash
GET /admin/recordings?limit=50&offset=0&method=GET&path=/api/users
```

Query Parameters:
- `limit`: Number of recordings to return (default: 50)
- `offset`: Pagination offset (default: 0)
- `method`: Filter by HTTP method (optional)
- `path`: Filter by path substring (optional)
- `collection`: Filter by collection name (optional)

Response:
```json
{
  "success": true,
  "data": {
    "recordings": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": 1705315800000,
        "method": "GET",
        "url": "/api/users?page=1",
        "path": "/api/users",
        "query": { "page": "1" },
        "headers": {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0..."
        },
        "response": {
          "statusCode": 200,
          "headers": {
            "content-type": "application/json"
          },
          "body": { "users": [...] }
        },
        "duration": 125,
        "tags": ["api", "users"],
        "collection": "User API Tests"
      }
    ],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

### Get a Specific Recording

```bash
GET /admin/recordings/:id
```

### Delete a Recording

```bash
DELETE /admin/recordings/:id
```

### Clear All Recordings

```bash
DELETE /admin/recordings
```

### Get Recording Statistics

```bash
GET /admin/recording/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalRecordings": 42,
    "totalCollections": 3,
    "oldestRecording": 1705315800000,
    "newestRecording": 1705319400000,
    "storageSize": 524288
  }
}
```

## Replaying Requests

Replay a recorded request to test how your application handles it:

```bash
POST /admin/recordings/:id/replay
Content-Type: application/json

{
  "delay": 100,
  "modifyRequest": null,
  "modifyResponse": null
}
```

Request Body:
- `delay`: Optional delay in milliseconds before sending response
- `modifyRequest`: Optional function to modify the request (not yet implemented)
- `modifyResponse`: Optional function to modify the response (not yet implemented)

The replay endpoint will return the exact response that was recorded, including:
- Status code
- Headers
- Body
- Optional delay

## Collections

Collections allow you to organize related recordings together.

### Create a Collection

```bash
POST /admin/recording/collections
Content-Type: application/json

{
  "name": "User API Tests",
  "description": "Collection of user-related API requests",
  "recordingIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "tags": ["api", "users", "testing"]
}
```

Response:
```json
{
  "success": true,
  "message": "Collection created successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "User API Tests",
    "description": "Collection of user-related API requests",
    "createdAt": 1705315800000,
    "updatedAt": 1705315800000,
    "requests": [...],
    "tags": ["api", "users", "testing"]
  }
}
```

### List All Collections

```bash
GET /admin/recording/collections
```

### Get a Specific Collection

```bash
GET /admin/recording/collections/:id
```

### Delete a Collection

```bash
DELETE /admin/recording/collections/:id
```

## Import/Export

### Export a Collection

Export a collection as a JSON file:

```bash
GET /admin/recording/collections/:id/export
```

This will download a JSON file containing the collection and all its recordings.

### Import a Collection

Import a previously exported collection:

```bash
POST /admin/recording/collections/import
Content-Type: application/json

{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "User API Tests",
  "description": "Collection of user-related API requests",
  "createdAt": 1705315800000,
  "updatedAt": 1705315800000,
  "requests": [...],
  "tags": ["api", "users", "testing"]
}
```

Note: New IDs will be generated to avoid conflicts with existing recordings.

## API Reference

### Recording Control Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/recording/start` | Start recording requests |
| POST | `/admin/recording/stop` | Stop recording requests |
| GET | `/admin/recording/status` | Get recording status |
| GET | `/admin/recording/stats` | Get recording statistics |

### Recording Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/recordings` | List all recordings |
| GET | `/admin/recordings/:id` | Get a specific recording |
| DELETE | `/admin/recordings/:id` | Delete a recording |
| DELETE | `/admin/recordings` | Clear all recordings |
| POST | `/admin/recordings/:id/replay` | Replay a recording |

### Collection Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/recording/collections` | Create a collection |
| GET | `/admin/recording/collections` | List all collections |
| GET | `/admin/recording/collections/:id` | Get a specific collection |
| DELETE | `/admin/recording/collections/:id` | Delete a collection |
| GET | `/admin/recording/collections/:id/export` | Export a collection |
| POST | `/admin/recording/collections/import` | Import a collection |

## Use Cases

### 1. API Documentation

Record real API interactions to generate accurate documentation:

1. Start recording
2. Perform typical API operations
3. Stop recording
4. Create a collection with descriptive names
5. Export the collection for documentation

### 2. Integration Testing

Capture production API responses for testing:

1. Record requests in production (with sensitive data filtered)
2. Export collections
3. Import in test environment
4. Replay requests to verify behavior

### 3. Debugging

Capture problematic requests for analysis:

1. Enable auto-recording
2. Reproduce the issue
3. Review recorded requests
4. Replay to debug

### 4. Performance Testing

Record and replay requests to test performance:

1. Record typical user workflows
2. Create collections for different scenarios
3. Replay with various delays to simulate network conditions
4. Analyze response times

### 5. API Mocking

Use recordings as mock responses:

1. Record real API responses
2. Export collections
3. Use recordings to create mock endpoints
4. Develop offline with realistic data

## Best Practices

1. **Exclude Sensitive Paths**: Always exclude admin and health check endpoints
2. **Filter Headers**: Exclude sensitive headers like cookies and authorization tokens
3. **Use Collections**: Organize recordings into logical collections
4. **Regular Cleanup**: Periodically clear old recordings to save space
5. **File Storage**: Use file storage for important recordings that need to persist
6. **Descriptive Names**: Use clear, descriptive names for collections
7. **Tag Recordings**: Use tags to categorize and filter recordings
8. **Export Regularly**: Export important collections as backups

## Troubleshooting

### Recordings Not Being Saved

- Check that `RECORDING_ENABLED=true`
- Verify recording is started with `/admin/recording/start`
- Check that the path is not in `RECORDING_EXCLUDE_PATHS`
- Verify storage path exists and is writable

### Storage Full

- Increase `RECORDING_MAX_RECORDINGS`
- Clear old recordings with `DELETE /admin/recordings`
- Switch to file storage for better capacity

### Missing Headers

- Check `RECORDING_INCLUDE_HEADERS` configuration
- Verify headers are not in `RECORDING_EXCLUDE_HEADERS`
- Some headers may be filtered by Express middleware

### Import Fails

- Verify JSON format matches export format
- Check for valid UUIDs in recording IDs
- Ensure collection structure is correct

## Security Considerations

1. **Sensitive Data**: Always exclude sensitive headers and paths
2. **Authentication**: Protect recording endpoints with authentication
3. **Storage**: Secure the recordings directory with appropriate permissions
4. **Export**: Be careful when sharing exported collections
5. **Production**: Consider disabling auto-record in production
6. **Cleanup**: Regularly delete recordings containing sensitive data

## Examples

### Example: Recording a User Workflow

```bash
# Start recording
curl -X POST http://localhost:3000/admin/recording/start

# Perform user actions
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl -X POST http://localhost:3000/api/users -d '{"name":"John"}'

# Stop recording
curl -X POST http://localhost:3000/admin/recording/stop

# Get recordings
curl http://localhost:3000/admin/recordings

# Create collection
curl -X POST http://localhost:3000/admin/recording/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Workflow",
    "recordingIds": ["id1", "id2", "id3"]
  }'

# Export collection
curl http://localhost:3000/admin/recording/collections/:id/export > user-workflow.json
```

### Example: Replaying a Request

```bash
# Get recording ID
RECORDING_ID=$(curl http://localhost:3000/admin/recordings | jq -r '.data.recordings[0].id')

# Replay with delay
curl -X POST http://localhost:3000/admin/recordings/$RECORDING_ID/replay \
  -H "Content-Type: application/json" \
  -d '{"delay": 500}'
```
