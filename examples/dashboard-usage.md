# Dashboard Usage Examples

This guide provides practical examples of using the Mock API Server dashboard for monitoring and management.

## Basic Setup

### 1. Enable Dashboard

Add to your `.env.local`:

```bash
# Enable admin endpoints (required for dashboard)
ADMIN_ENABLED=true

# Optional: Disable auth for development
AUTH_ENABLED=false
```

### 2. Start Server

```bash
npm run dev
```

### 3. Access Dashboard

Open your browser and navigate to:
```
http://localhost:3000/dashboard
```

## Common Use Cases

### Monitoring API Performance

**Scenario**: You want to monitor how your API is performing during development.

**Steps**:
1. Open dashboard at `http://localhost:3000/dashboard`
2. Observe the **Avg Response Time** metric card
3. Switch to the **Analytics** tab
4. Watch the response time chart update in real-time
5. Identify slow endpoints in the chart

**What to look for**:
- Response times consistently above 100ms may indicate performance issues
- Sudden spikes in response time could indicate resource contention
- Gradual increase in response time might suggest memory leaks

### Debugging Failed Requests

**Scenario**: Your frontend is receiving errors and you need to identify the cause.

**Steps**:
1. Open the **Recent Requests** tab
2. Look for red status indicators (4xx/5xx errors)
3. Note the request path, method, and status code
4. Check the response time to rule out timeouts
5. Use the IP address to identify which client is affected

**Example**:
```
Time: 14:23:45
Method: POST (green)
Path: /api/users
Status: 400 (red)
Response Time: 15ms
IP: 127.0.0.1
```

This indicates a validation error (400) on a POST request to `/api/users`.

### Tracking Error Rates

**Scenario**: You want to ensure your API maintains high reliability.

**Steps**:
1. Monitor the **Error Rate** metric card
2. Set a threshold (e.g., < 5% is acceptable)
3. If error rate exceeds threshold, investigate in Recent Requests tab
4. Check the **Status Code Distribution** in Analytics tab

**Healthy API indicators**:
- Error rate below 5%
- Most requests return 2xx status codes
- 4xx errors are minimal (client errors)
- 5xx errors are rare or non-existent (server errors)

### Configuration Management

**Scenario**: You need to update proxy routes without restarting the server.

**Steps**:
1. Edit your `.env.local` file:
   ```bash
   PROXY_ROUTES=api:https://new-api.com,users:https://users-api.com
   ```
2. Open dashboard **Configuration** tab
3. Click **Reload Configuration** button
4. Verify the new routes appear in the configuration display

**Benefits**:
- Zero downtime configuration updates
- Immediate feedback on configuration changes
- No need to restart development server

### Analyzing Traffic Patterns

**Scenario**: You want to understand which endpoints are most frequently used.

**Steps**:
1. Switch to **Analytics** tab
2. Review **Most Requested Paths** section
3. Identify top 5 endpoints
4. Consider caching frequently accessed endpoints

**Example output**:
```
/api/users: 245
/api/posts: 189
/api/products: 156
/api/comments: 98
/api/categories: 67
```

**Actions**:
- Enable caching for top endpoints
- Optimize slow but frequently accessed endpoints
- Consider rate limiting for high-traffic endpoints

### Memory Monitoring

**Scenario**: You suspect a memory leak in your application.

**Steps**:
1. Note the initial **Memory Usage** value
2. Perform typical operations in your application
3. Monitor memory usage over time
4. Look for steady increase without corresponding decrease

**Warning signs**:
- Memory usage continuously increases
- Memory doesn't decrease after operations complete
- Memory usage exceeds 500MB for a simple API

**Actions**:
- Review code for memory leaks
- Check for unclosed connections
- Verify proper cleanup in request handlers

## Advanced Usage

### Using Dashboard API Programmatically

You can access dashboard data programmatically for custom monitoring:

```javascript
// Fetch current metrics
async function getMetrics() {
  const response = await fetch('http://localhost:3000/dashboard/api/metrics');
  const data = await response.json();
  
  console.log('Uptime:', data.data.uptime);
  console.log('Request Count:', data.data.requestCount);
  console.log('Error Rate:', 
    (data.data.errorCount / data.data.requestCount * 100).toFixed(2) + '%'
  );
}

// Fetch recent requests
async function getRecentRequests(limit = 10) {
  const response = await fetch(
    `http://localhost:3000/dashboard/api/requests?limit=${limit}`
  );
  const data = await response.json();
  
  data.data.forEach(req => {
    console.log(`${req.method} ${req.path} - ${req.statusCode} (${req.responseTime}ms)`);
  });
}

// Monitor error rate
setInterval(async () => {
  const response = await fetch('http://localhost:3000/dashboard/api/metrics');
  const data = await response.json();
  const errorRate = (data.data.errorCount / data.data.requestCount) * 100;
  
  if (errorRate > 5) {
    console.warn(`High error rate detected: ${errorRate.toFixed(2)}%`);
  }
}, 30000); // Check every 30 seconds
```

### Custom Alerts

Create a simple alerting system:

```javascript
const THRESHOLDS = {
  errorRate: 5,        // 5%
  responseTime: 200,   // 200ms
  memoryUsage: 500     // 500MB
};

async function checkHealth() {
  const response = await fetch('http://localhost:3000/dashboard/api/metrics');
  const { data } = await response.json();
  
  const errorRate = (data.errorCount / data.requestCount) * 100;
  const memoryMB = data.memory.heapUsed / 1024 / 1024;
  
  const alerts = [];
  
  if (errorRate > THRESHOLDS.errorRate) {
    alerts.push(`High error rate: ${errorRate.toFixed(2)}%`);
  }
  
  if (data.averageResponseTime > THRESHOLDS.responseTime) {
    alerts.push(`Slow response time: ${data.averageResponseTime.toFixed(2)}ms`);
  }
  
  if (memoryMB > THRESHOLDS.memoryUsage) {
    alerts.push(`High memory usage: ${memoryMB.toFixed(2)}MB`);
  }
  
  if (alerts.length > 0) {
    console.error('ALERTS:', alerts.join(', '));
    // Send notification (email, Slack, etc.)
  }
}

// Run health check every minute
setInterval(checkHealth, 60000);
```

### Export Metrics to CSV

```javascript
async function exportMetricsToCSV() {
  const response = await fetch('http://localhost:3000/dashboard/api/requests?limit=1000');
  const { data } = await response.json();
  
  const csv = [
    'Timestamp,Method,Path,Status,ResponseTime,IP',
    ...data.map(req => 
      `${new Date(req.timestamp).toISOString()},${req.method},${req.path},${req.statusCode},${req.responseTime},${req.ip}`
    )
  ].join('\n');
  
  // Save to file or download
  console.log(csv);
}
```

## Integration Examples

### Slack Notifications

```javascript
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';

async function sendSlackAlert(message) {
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
}

// Monitor and alert
setInterval(async () => {
  const response = await fetch('http://localhost:3000/dashboard/api/metrics');
  const { data } = await response.json();
  const errorRate = (data.errorCount / data.requestCount) * 100;
  
  if (errorRate > 10) {
    await sendSlackAlert(
      `🚨 High error rate detected: ${errorRate.toFixed(2)}%\n` +
      `Total requests: ${data.requestCount}\n` +
      `Errors: ${data.errorCount}`
    );
  }
}, 60000);
```

### Prometheus Metrics Export

```javascript
// Add this endpoint to your server
app.get('/metrics', async (req, res) => {
  const response = await fetch('http://localhost:3000/dashboard/api/metrics');
  const { data } = await response.json();
  
  const metrics = `
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total ${data.requestCount}

# HELP api_errors_total Total number of API errors
# TYPE api_errors_total counter
api_errors_total ${data.errorCount}

# HELP api_response_time_avg Average response time in milliseconds
# TYPE api_response_time_avg gauge
api_response_time_avg ${data.averageResponseTime}

# HELP api_memory_heap_used Heap memory used in bytes
# TYPE api_memory_heap_used gauge
api_memory_heap_used ${data.memory.heapUsed}
  `.trim();
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

## Troubleshooting

### Dashboard Not Loading

**Problem**: Browser shows "Cannot GET /dashboard"

**Solution**:
```bash
# Check if admin is enabled
grep ADMIN_ENABLED .env.local

# Should show:
ADMIN_ENABLED=true

# Restart server
npm run dev
```

### Authentication Required

**Problem**: Dashboard shows 401 Unauthorized

**Solution**:
```bash
# For development, disable auth
echo "AUTH_ENABLED=false" >> .env.local

# Or use dev-token mode
echo "AUTH_TYPE=dev-token" >> .env.local
echo "DEV_TOKEN=my-dev-token" >> .env.local

# Then access with token
curl -H "Authorization: Bearer my-dev-token" http://localhost:3000/dashboard
```

### Metrics Not Updating

**Problem**: Dashboard shows stale data

**Solution**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify API endpoints are accessible:
   ```bash
   curl http://localhost:3000/dashboard/api/metrics
   ```
4. Clear browser cache and reload

### CORS Errors

**Problem**: Dashboard API calls fail with CORS errors

**Solution**:
```bash
# Add your origin to allowed origins
echo "CORS_ORIGINS=http://localhost:3000,http://localhost:3001" >> .env.local

# Restart server
npm run dev
```

## Best Practices

1. **Regular Monitoring**: Check dashboard at least once per day during development
2. **Set Baselines**: Establish normal metrics for comparison
3. **Document Anomalies**: Note unusual patterns for future reference
4. **Use Alerts**: Set up automated alerts for critical thresholds
5. **Export Data**: Regularly export metrics for historical analysis
6. **Secure Access**: Always enable authentication in production
7. **Performance Impact**: Dashboard has minimal overhead, but disable if not needed

## Tips and Tricks

### Keyboard Shortcuts

While the dashboard doesn't have built-in shortcuts, you can use browser shortcuts:
- `Ctrl/Cmd + R`: Refresh dashboard
- `F12`: Open developer console
- `Ctrl/Cmd + Shift + R`: Hard refresh (clear cache)

### Browser Extensions

Useful extensions for dashboard usage:
- **JSON Viewer**: Format JSON in Configuration tab
- **Auto Refresh**: Auto-reload dashboard at intervals
- **Dark Reader**: Dark mode for dashboard

### Mobile Access

The dashboard is accessible on mobile devices:
1. Ensure your mobile device is on the same network
2. Find your computer's IP address
3. Access: `http://YOUR_IP:3000/dashboard`

### Multiple Dashboards

Monitor multiple servers:
1. Open dashboard in multiple browser tabs
2. Use different ports for different servers
3. Bookmark each dashboard for quick access

## Next Steps

- Review [Dashboard Guide](../docs/DASHBOARD_GUIDE.md) for detailed documentation
- Check [API Reference](../docs/API_REFERENCE.md) for dashboard API details
- Explore [Troubleshooting Guide](../docs/TROUBLESHOOTING.md) for common issues
