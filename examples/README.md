# Examples

This directory contains example code demonstrating how to use various features of the Mock API Server.

## WebSocket Examples

### Node.js WebSocket Client

**File**: `websocket-client-example.js`

A complete Node.js example showing how to:
- Connect to the WebSocket server
- Subscribe to mock events
- Handle incoming messages
- Implement reconnection logic
- Send ping/pong for connection health

**Usage**:
```bash
# Make sure the server is running with WebSocket enabled
npm run dev

# In another terminal, run the example
node examples/websocket-client-example.js
```

**Expected Output**:
```
============================================================
WebSocket Client Example
============================================================
Press Ctrl+C to exit

🔌 Connecting to ws://localhost:3000/ws...
✅ Connected to WebSocket server

📊 Subscribing to ticker events...
🔔 Subscribing to notifications...
✅ [10:30:45] Connected with client ID: client-1234567890-abc123
✅ [10:30:45] Subscribed to event: ticker
✅ [10:30:45] Subscribed to event: notifications
📨 [10:30:47] Event 'ticker': {
  "symbol": "MOCK",
  "price": 100.5,
  "change": 1.25
}
📨 [10:30:50] Event 'notifications': {
  "message": "System update",
  "type": "info"
}
```

### Browser WebSocket Client

**File**: `../docs/websocket-test-client.html`

An interactive HTML/JavaScript client for testing WebSocket functionality in the browser.

**Usage**:
1. Start the server: `npm run dev`
2. Open `docs/websocket-test-client.html` in your browser
3. Click "Connect" to establish a WebSocket connection
4. Use the quick action buttons or send custom messages

**Features**:
- Visual connection status
- Message log with sent/received/error indicators
- Quick action buttons for common operations
- Message statistics
- Custom message sending

## Configuration Examples

### Basic WebSocket Configuration

Add to your `.env.local`:

```bash
# Enable WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/ws

# Mock events (JSON array)
WEBSOCKET_MOCK_EVENTS=[{"name":"ticker","interval":2000,"data":{"price":100}}]

# Optional: Enable proxy
WEBSOCKET_PROXY_ENABLED=true
WEBSOCKET_PROXY_ROUTES=echo:wss://echo.websocket.org
```

### Advanced Configuration

```bash
# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/ws

# Multiple mock events with different intervals
WEBSOCKET_MOCK_EVENTS=[
  {
    "name": "ticker",
    "interval": 2000,
    "data": {
      "symbol": "MOCK",
      "price": 100.50,
      "change": 1.25,
      "volume": 1000000
    }
  },
  {
    "name": "notifications",
    "interval": 5000,
    "data": {
      "message": "System update",
      "type": "info",
      "priority": "low"
    }
  },
  {
    "name": "metrics",
    "interval": 10000,
    "data": {
      "cpu": 45.2,
      "memory": 62.8,
      "disk": 78.5
    }
  }
]

# WebSocket Proxy
WEBSOCKET_PROXY_ENABLED=true
WEBSOCKET_PROXY_ROUTES=echo:wss://echo.websocket.org,binance:wss://stream.binance.com:9443

# Connection settings
WEBSOCKET_HEARTBEAT_INTERVAL=30000
WEBSOCKET_MAX_PAYLOAD=10485760
```

## GraphQL Examples

### Node.js GraphQL Client

**File**: `graphql-client-example.js`

A complete Node.js example showing how to:
- Execute GraphQL queries
- Use variables in queries
- Perform mutations (create, update, delete)
- Handle nested data
- Implement error handling
- Use authentication

**Usage**:
```bash
# Make sure the server is running with GraphQL enabled
npm run dev

# In another terminal, run the example
node examples/graphql-client-example.js
```

### GraphQL Query Examples

**File**: `graphql-queries.md`

A comprehensive collection of GraphQL query and mutation examples including:
- Basic queries
- Queries with variables
- Nested queries
- Mutations
- Advanced patterns (fragments, aliases)
- cURL examples
- JavaScript examples

### Basic GraphQL Configuration

Add to your `.env.local`:

```bash
# Enable GraphQL
GRAPHQL_ENABLED=true
GRAPHQL_PATH=/graphql
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true

# Optional: Custom schema
GRAPHQL_SCHEMA_PATH=./data/graphql-schema.graphql

# Optional: Enable proxy
GRAPHQL_PROXY_ENABLED=true
GRAPHQL_PROXY_ENDPOINT=https://api.example.com/graphql
GRAPHQL_PROXY_AUTH_TYPE=bearer
GRAPHQL_PROXY_AUTH_TOKEN=your-token-here
```

## More Examples

For more detailed examples and use cases, see:
- [GraphQL Guide](../docs/GRAPHQL_GUIDE.md) - Comprehensive GraphQL documentation
- [WebSocket Guide](../docs/WEBSOCKET_GUIDE.md) - Comprehensive WebSocket documentation
- [Transformation Guide](../docs/TRANSFORMATION_GUIDE.md) - Request/response transformation examples
- [API Reference](../docs/API_REFERENCE.md) - Complete API documentation

## Creating Your Own Examples

When creating examples:

1. **Keep it simple**: Focus on one feature at a time
2. **Add comments**: Explain what the code does
3. **Include error handling**: Show proper error handling patterns
4. **Provide usage instructions**: Clear steps to run the example
5. **Show expected output**: Help users verify it's working correctly

## Contributing

Have a useful example? Feel free to contribute by:
1. Creating a new example file
2. Adding documentation
3. Testing thoroughly
4. Submitting a pull request

## Support

For questions or issues with examples:
- Check the [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)
- Review the [API Reference](../docs/API_REFERENCE.md)
- Open an issue on GitHub
