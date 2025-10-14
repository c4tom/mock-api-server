# WebSocket Guide

This guide explains how to use the WebSocket functionality in the Mock API Server for real-time communication and WebSocket proxying.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Mock WebSocket Events](#mock-websocket-events)
- [WebSocket Proxy](#websocket-proxy)
- [Client Examples](#client-examples)
- [Message Protocol](#message-protocol)
- [Admin Endpoints](#admin-endpoints)
- [Troubleshooting](#troubleshooting)

## Overview

The Mock API Server provides WebSocket support for:

1. **Mock WebSocket Events**: Send periodic or on-demand mock data to connected clients
2. **WebSocket Proxy**: Proxy WebSocket connections to external WebSocket servers with CORS support
3. **Real-time Communication**: Enable real-time features in your applications during development

## Configuration

### Environment Variables

Add these variables to your `.env.local` or `.env.production` file:

```bash
# Enable WebSocket server
WEBSOCKET_ENABLED=true

# WebSocket server path (default: /ws)
WEBSOCKET_PATH=/ws

# Mock events configuration (JSON array)
WEBSOCKET_MOCK_EVENTS=[{"name":"ticker","interval":2000,"data":{"price":100}}]

# Enable WebSocket proxy
WEBSOCKET_PROXY_ENABLED=true

# WebSocket proxy routes (format: name:ws://url,name2:wss://url2)
WEBSOCKET_PROXY_ROUTES=echo:wss://echo.websocket.org,chat:wss://chat.example.com

# Heartbeat interval in milliseconds (optional)
WEBSOCKET_HEARTBEAT_INTERVAL=30000

# Max payload size in bytes (optional, default: 10MB)
WEBSOCKET_MAX_PAYLOAD=10485760
```

### Mock Events Configuration

Mock events are defined as JSON arrays with the following structure:

```json
[
  {
    "name": "ticker",
    "interval": 2000,
    "data": {
      "symbol": "MOCK",
      "price": 100.50,
      "change": 1.25
    }
  },
  {
    "name": "notifications",
    "interval": 5000,
    "data": {
      "message": "System update",
      "type": "info"
    }
  }
]
```

**Properties:**
- `name` (required): Event name identifier
- `interval` (optional): Milliseconds between automatic broadcasts (0 or omit for on-demand only)
- `data` (required): The data payload to send with the event
- `condition` (optional): Future feature for conditional event triggering

## Mock WebSocket Events

### Connecting to Mock WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to mock WebSocket server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
};
```

### Subscribing to Events

```javascript
// Subscribe to a specific event
ws.send(JSON.stringify({
  type: 'subscribe',
  event: 'ticker'
}));

// You'll receive:
// { type: 'subscribed', event: 'ticker', timestamp: '...' }
// { type: 'event', name: 'ticker', data: {...}, timestamp: '...' }
```

### Unsubscribing from Events

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  event: 'ticker'
}));

// You'll receive:
// { type: 'unsubscribed', event: 'ticker', timestamp: '...' }
```

### Requesting Event Data

```javascript
// Request current data for an event (one-time)
ws.send(JSON.stringify({
  type: 'request',
  event: 'ticker'
}));

// You'll receive:
// { type: 'response', event: 'ticker', data: {...}, timestamp: '...' }
```

### Ping/Pong

```javascript
// Send ping to check connection
ws.send(JSON.stringify({
  type: 'ping'
}));

// You'll receive:
// { type: 'pong', timestamp: '...' }
```

## WebSocket Proxy

### Configuration

Configure proxy routes in your environment file:

```bash
WEBSOCKET_PROXY_ENABLED=true
WEBSOCKET_PROXY_ROUTES=echo:wss://echo.websocket.org,binance:wss://stream.binance.com:9443
```

### Connecting to Proxy

```javascript
// Connect through proxy to external WebSocket
const ws = new WebSocket('ws://localhost:3000/ws/proxy/echo');

ws.onopen = () => {
  console.log('Connected through proxy');
  ws.send('Hello from proxy!');
};

ws.onmessage = (event) => {
  console.log('Received from target:', event.data);
};
```

### Proxy with Authentication

Configure authentication in code or environment:

```javascript
// The proxy will forward authentication headers to the target
// Configure in environment or programmatically
```

## Client Examples

### React Example

```jsx
import { useEffect, useState } from 'react';

function WebSocketComponent() {
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:3000/ws');

    websocket.onopen = () => {
      console.log('Connected');
      // Subscribe to ticker events
      websocket.send(JSON.stringify({
        type: 'subscribe',
        event: 'ticker'
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'event') {
        setMessages(prev => [...prev, message]);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  return (
    <div>
      <h2>WebSocket Messages</h2>
      {messages.map((msg, idx) => (
        <div key={idx}>
          {msg.name}: {JSON.stringify(msg.data)}
        </div>
      ))}
    </div>
  );
}
```

### Node.js Example

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Subscribe to notifications
  ws.send(JSON.stringify({
    type: 'subscribe',
    event: 'notifications'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
  
  if (message.type === 'event' && message.name === 'notifications') {
    console.log('Notification:', message.data);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected');
});
```

### Python Example

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("Connection closed")

def on_open(ws):
    print("Connected")
    # Subscribe to ticker
    ws.send(json.dumps({
        "type": "subscribe",
        "event": "ticker"
    }))

ws = websocket.WebSocketApp(
    "ws://localhost:3000/ws",
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

ws.run_forever()
```

## Message Protocol

### Client to Server Messages

#### Subscribe
```json
{
  "type": "subscribe",
  "event": "event_name"
}
```

#### Unsubscribe
```json
{
  "type": "unsubscribe",
  "event": "event_name"
}
```

#### Request
```json
{
  "type": "request",
  "event": "event_name"
}
```

#### Ping
```json
{
  "type": "ping"
}
```

### Server to Client Messages

#### Connected
```json
{
  "type": "connected",
  "clientId": "client-123",
  "timestamp": "2024-01-01T00:00:00Z",
  "message": "Connected to Mock API WebSocket server"
}
```

#### Event
```json
{
  "type": "event",
  "name": "ticker",
  "data": {
    "price": 100.50
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Subscribed
```json
{
  "type": "subscribed",
  "event": "ticker",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Unsubscribed
```json
{
  "type": "unsubscribed",
  "event": "ticker",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Response
```json
{
  "type": "response",
  "event": "ticker",
  "data": {
    "price": 100.50
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Pong
```json
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Error
```json
{
  "type": "error",
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Proxy Connected
```json
{
  "type": "proxy_connected",
  "clientId": "client-123",
  "routeName": "echo",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Admin Endpoints

### Get WebSocket Statistics

```bash
GET /admin/websocket/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "connectedClients": 5,
    "proxyConnections": 2
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req-123"
  }
}
```

## Troubleshooting

### Connection Refused

**Problem:** Cannot connect to WebSocket server

**Solutions:**
1. Verify `WEBSOCKET_ENABLED=true` in your environment file
2. Check that the server is running
3. Verify the WebSocket path matches your configuration
4. Check firewall settings

### No Messages Received

**Problem:** Connected but not receiving messages

**Solutions:**
1. Verify mock events are configured in `WEBSOCKET_MOCK_EVENTS`
2. Check that event intervals are set (if expecting automatic messages)
3. Subscribe to events explicitly using the subscribe message
4. Check server logs for errors

### Proxy Connection Failed

**Problem:** Cannot connect through WebSocket proxy

**Solutions:**
1. Verify `WEBSOCKET_PROXY_ENABLED=true`
2. Check that the proxy route is configured correctly
3. Verify the target WebSocket URL is accessible
4. Check authentication configuration if required
5. Review server logs for detailed error messages

### Heartbeat Timeout

**Problem:** Connection closes unexpectedly

**Solutions:**
1. Adjust `WEBSOCKET_HEARTBEAT_INTERVAL` to a higher value
2. Ensure client responds to ping messages
3. Check network stability
4. Review connection timeout settings

### Payload Too Large

**Problem:** Large messages are rejected

**Solutions:**
1. Increase `WEBSOCKET_MAX_PAYLOAD` value
2. Split large messages into smaller chunks
3. Compress data before sending
4. Review message size requirements

## Best Practices

1. **Always handle errors**: Implement error handlers for WebSocket connections
2. **Implement reconnection logic**: Handle disconnections gracefully with exponential backoff
3. **Validate messages**: Always validate incoming messages before processing
4. **Use heartbeats**: Implement ping/pong to detect dead connections
5. **Clean up subscriptions**: Unsubscribe from events when no longer needed
6. **Monitor connection count**: Use admin endpoints to monitor active connections
7. **Set appropriate intervals**: Don't set event intervals too low to avoid overwhelming clients
8. **Handle backpressure**: Implement flow control for high-frequency events

## Security Considerations

1. **Authentication**: WebSocket connections respect the server's authentication configuration
2. **Origin validation**: CORS settings apply to WebSocket connections
3. **Rate limiting**: Consider implementing rate limiting for WebSocket messages
4. **Payload size**: Set appropriate `WEBSOCKET_MAX_PAYLOAD` limits
5. **Proxy targets**: Only configure trusted WebSocket proxy targets
6. **Message validation**: Always validate message structure and content

## Performance Tips

1. **Batch updates**: Group multiple updates into single messages when possible
2. **Throttle events**: Use appropriate intervals to balance real-time needs with performance
3. **Limit subscriptions**: Only subscribe to events you need
4. **Clean up**: Close connections and clear intervals when done
5. **Monitor memory**: Watch for memory leaks in long-running connections
6. **Use binary data**: Consider binary protocols for large data transfers

## Examples Repository

For more examples and use cases, check the `examples/websocket/` directory in the repository.
