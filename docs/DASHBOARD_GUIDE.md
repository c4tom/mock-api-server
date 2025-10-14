# Dashboard Guide

## Overview

The Mock API Server includes a comprehensive web-based dashboard for real-time monitoring, configuration management, and analytics visualization. The dashboard provides an intuitive interface to monitor server health, track requests, and manage configurations without needing to use command-line tools.

## Features

### 1. Real-Time Monitoring
- **Server Status**: Live uptime tracking
- **Request Metrics**: Total requests, error rate, and average response time
- **Memory Usage**: Current heap memory consumption
- **Auto-Refresh**: Metrics update automatically every 5 seconds

### 2. Request Tracking
- **Recent Requests Table**: View the last 50 requests with details:
  - Timestamp
  - HTTP method
  - Request path
  - Status code
  - Response time
  - Client IP address
- **Color-Coded Methods**: Visual distinction between GET, POST, PUT, DELETE
- **Status Indicators**: Success (2xx), Warning (3xx), Error (4xx/5xx)

### 3. Configuration Viewer
- **Live Configuration**: View current server configuration
- **Sensitive Data Protection**: Automatically masks secrets and credentials
- **Reload Functionality**: Reload configuration without restarting the server
- **JSON Formatting**: Pretty-printed configuration for easy reading

### 4. Analytics Dashboard
- **Response Time Chart**: Line chart showing response times for recent requests
- **Top Requested Paths**: Most frequently accessed endpoints
- **Status Code Distribution**: Breakdown of responses by status code category (2xx, 3xx, 4xx, 5xx)
- **Visual Insights**: Chart.js powered visualizations

## Accessing the Dashboard

### Prerequisites
- Admin endpoints must be enabled in your configuration
- Authentication must be configured if required

### URL
```
http://localhost:3000/dashboard
```

Replace `localhost:3000` with your server's host and port.

### Authentication
If authentication is enabled, you'll need to provide credentials:

**Development Mode (dev-token):**
```bash
# Access with dev token in header
curl -H "Authorization: Bearer your-dev-token" http://localhost:3000/dashboard
```

**JWT Authentication:**
```bash
# Access with JWT token
curl -H "Authorization: Bearer your-jwt-token" http://localhost:3000/dashboard
```

**HTTP Basic Authentication:**
```bash
# Access with basic auth
curl -u username:password http://localhost:3000/dashboard
```

## Dashboard Sections

### Metrics Cards

The top section displays key metrics in card format:

1. **Server Status**
   - Shows uptime in human-readable format (days, hours, minutes, seconds)
   - Green pulsing indicator shows server is online

2. **Total Requests**
   - Count of all requests since server startup
   - Includes all HTTP methods and endpoints

3. **Error Rate**
   - Percentage of requests that resulted in 4xx or 5xx status codes
   - Helps identify issues quickly

4. **Avg Response Time**
   - Average response time across all requests in milliseconds
   - Useful for performance monitoring

5. **Memory Usage**
   - Current heap memory usage in MB
   - Helps identify memory leaks or high consumption

### Tabs

#### Recent Requests Tab
- Default active tab
- Shows a table of the most recent 50 requests
- Updates automatically every 5 seconds
- Sortable by clicking column headers
- Color-coded for easy scanning:
  - **Blue**: GET requests
  - **Green**: POST requests
  - **Orange**: PUT requests
  - **Red**: DELETE requests

#### Configuration Tab
- Displays current server configuration
- Sensitive data (passwords, tokens, secrets) are masked with `***`
- **Reload Configuration** button to reload from .env files
- JSON formatted for readability

#### Analytics Tab
- **Response Time Chart**: Line graph showing response times over the last 20 requests
- **Most Requested Paths**: Top 5 most frequently accessed endpoints
- **Status Code Distribution**: Breakdown by status code category

## API Endpoints

The dashboard uses the following API endpoints:

### Get Metrics
```http
GET /dashboard/api/metrics
```

Returns system metrics including uptime, memory usage, request counts, and performance data.

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600000,
    "memory": {
      "rss": 52428800,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1048576,
      "arrayBuffers": 524288
    },
    "requestCount": 1234,
    "errorCount": 12,
    "averageResponseTime": 45.6
  }
}
```

### Get Recent Requests
```http
GET /dashboard/api/requests?limit=50
```

Returns recent request history.

**Query Parameters:**
- `limit` (optional): Number of requests to return (default: 50, max: 1000)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": 1697234567890,
      "method": "GET",
      "path": "/api/users",
      "statusCode": 200,
      "responseTime": 45,
      "ip": "127.0.0.1"
    }
  ]
}
```

### Get Configuration
```http
GET /dashboard/api/config
```

Returns current server configuration with sensitive data masked.

**Response:**
```json
{
  "success": true,
  "data": {
    "server": {
      "port": 3000,
      "host": "localhost",
      "environment": "development",
      "adminEnabled": true
    },
    "security": {
      "authentication": {
        "enabled": true,
        "type": "jwt",
        "jwtSecret": "***"
      }
    }
  }
}
```

## Configuration

### Enable Dashboard

The dashboard is automatically enabled when admin endpoints are enabled:

**.env.local (Development):**
```bash
ADMIN_ENABLED=true
```

**.env.production (Production):**
```bash
ADMIN_ENABLED=true
```

### Security Considerations

1. **Always Enable Authentication in Production**
   ```bash
   AUTH_ENABLED=true
   AUTH_TYPE=jwt
   JWT_SECRET=your-secure-secret
   ```

2. **Restrict CORS Origins**
   ```bash
   CORS_ORIGINS=https://yourdomain.com
   ```

3. **Use HTTPS in Production**
   - Deploy behind a reverse proxy (nginx, Apache)
   - Enable SSL/TLS certificates

4. **Limit Access by IP** (if possible)
   - Configure firewall rules
   - Use VPN for remote access

## Customization

### Styling

The dashboard uses a modern dark theme with purple accents. To customize:

1. The HTML is generated in `src/handlers/DashboardHandler.ts`
2. Modify the `<style>` section in the `generateDashboardHTML()` method
3. Colors, fonts, and layout can be adjusted

### Metrics

To add custom metrics:

1. Extend the `RequestMetric` interface in `DashboardHandler.ts`
2. Update the `recordRequest()` method to capture additional data
3. Modify the dashboard HTML to display new metrics

### Charts

The dashboard uses Chart.js for visualizations. To add new charts:

1. Add a new canvas element in the HTML
2. Create a new Chart instance in the JavaScript section
3. Fetch data from a new API endpoint if needed

## Troubleshooting

### Dashboard Not Loading

**Issue**: Dashboard returns 404

**Solution**:
- Ensure `ADMIN_ENABLED=true` in your .env file
- Restart the server after configuration changes
- Check server logs for errors

### Authentication Errors

**Issue**: 401 Unauthorized when accessing dashboard

**Solution**:
- Verify authentication is configured correctly
- Check that you're providing valid credentials
- For development, use `AUTH_TYPE=dev-token` or `AUTH_TYPE=bypass`

### Metrics Not Updating

**Issue**: Dashboard shows stale data

**Solution**:
- Check browser console for JavaScript errors
- Verify the API endpoints are accessible
- Check CORS configuration if accessing from different origin
- Clear browser cache and reload

### Chart Not Displaying

**Issue**: Analytics chart is blank or not rendering

**Solution**:
- Ensure Chart.js CDN is accessible
- Check browser console for errors
- Verify there is request data to display
- Try a different browser

## Performance

### Resource Usage

The dashboard is lightweight and has minimal impact on server performance:

- **Memory**: Stores last 1000 requests in memory (~100KB)
- **CPU**: Negligible overhead for metrics collection
- **Network**: Auto-refresh uses ~5KB per update

### Optimization Tips

1. **Reduce Auto-Refresh Frequency**
   - Modify the `setInterval` duration in the dashboard HTML
   - Default is 5000ms (5 seconds)

2. **Limit Request History**
   - Adjust `maxMetrics` in `DashboardHandler.ts`
   - Default is 1000 requests

3. **Disable in Production** (if not needed)
   ```bash
   ADMIN_ENABLED=false
   ```

## Examples

### Monitoring API Performance

1. Open dashboard at `http://localhost:3000/dashboard`
2. Switch to Analytics tab
3. Monitor the Response Time chart
4. Check for spikes or trends
5. Investigate slow endpoints in the "Most Requested Paths" section

### Debugging Errors

1. Open Recent Requests tab
2. Look for red status indicators (4xx/5xx errors)
3. Note the request path and method
4. Check the response time for timeout issues
5. Use the IP address to identify problematic clients

### Configuration Management

1. Open Configuration tab
2. Review current settings
3. Make changes to .env files
4. Click "Reload Configuration" button
5. Verify changes in the configuration display

## Integration with Other Tools

### Prometheus/Grafana

Export metrics to Prometheus:

```javascript
// Add to your server
app.get('/metrics', (req, res) => {
  const metrics = dashboardHandler.getMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(`
    # HELP requests_total Total number of requests
    # TYPE requests_total counter
    requests_total ${metrics.requestCount}
    
    # HELP errors_total Total number of errors
    # TYPE errors_total counter
    errors_total ${metrics.errorCount}
  `);
});
```

### Logging Services

Forward dashboard data to external logging:

```javascript
// Send metrics to external service
setInterval(async () => {
  const metrics = await fetch('/dashboard/api/metrics');
  await sendToLoggingService(metrics);
}, 60000);
```

## Best Practices

1. **Regular Monitoring**: Check dashboard daily in production
2. **Set Alerts**: Monitor error rate and response time thresholds
3. **Secure Access**: Always use authentication in production
4. **Performance Baseline**: Establish normal metrics for comparison
5. **Incident Response**: Use dashboard as first step in troubleshooting

## Future Enhancements

Potential improvements for the dashboard:

- [ ] User authentication and role-based access
- [ ] Custom metric alerts and notifications
- [ ] Export data to CSV/JSON
- [ ] Historical data persistence
- [ ] Custom dashboard layouts
- [ ] Mobile-responsive design improvements
- [ ] Dark/light theme toggle
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering and search
- [ ] Performance profiling tools

## Support

For issues or questions about the dashboard:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review server logs for errors
3. Consult the [API Reference](./API_REFERENCE.md)
4. Open an issue on GitHub
