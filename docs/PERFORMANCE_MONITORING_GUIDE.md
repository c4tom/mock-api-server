# Performance Monitoring Guide

## Overview

The Mock API Server includes comprehensive performance monitoring capabilities that track detailed metrics about requests, system resources, memory usage, and CPU utilization. This guide explains how to use the performance monitoring features.

## Features

- **Request Metrics**: Track request counts, response times, and throughput
- **Response Time Analysis**: Calculate average, median, P95, and P99 response times
- **Endpoint Analytics**: Per-endpoint metrics including error rates
- **System Monitoring**: CPU usage, memory consumption, and system uptime
- **Error Tracking**: Detailed error metrics by status code and endpoint
- **Multiple Export Formats**: Prometheus, JSON, and CSV exports
- **Health Checks**: Automatic health status detection with issue reporting

## Accessing Performance Metrics

### Admin Endpoints

All performance monitoring endpoints require admin authentication (if enabled).

#### Get Comprehensive Metrics

```bash
GET /admin/performance/metrics
```

Returns detailed performance metrics including:
- Request statistics (total, successful, failed)
- Response time percentiles (average, median, P95, P99)
- Requests per second/minute
- Slowest requests
- System metrics (uptime, platform, Node version)
- Memory metrics (heap usage, RSS, V8 statistics)
- CPU metrics (usage percentage, load average)
- Per-endpoint metrics
- Error statistics

**Example Response:**

```json
{
  "success": true,
  "data": {
    "requests": {
      "total": 1523,
      "successful": 1450,
      "failed": 73,
      "averageResponseTime": 145.32,
      "medianResponseTime": 120,
      "p95ResponseTime": 450,
      "p99ResponseTime": 890,
      "requestsPerSecond": 12.5,
      "requestsPerMinute": 750,
      "slowestRequests": [
        {
          "method": "POST",
          "path": "/api/users",
          "responseTime": 2340,
          "timestamp": "2024-01-15T10:30:45.123Z",
          "statusCode": 201
        }
      ]
    },
    "system": {
      "uptime": 345678,
      "platform": "linux 5.15.0",
      "nodeVersion": "v18.17.0",
      "processUptime": 12345,
      "hostname": "api-server-01"
    },
    "memory": {
      "heapUsed": 45678912,
      "heapTotal": 67108864,
      "heapUsedPercentage": 68.05,
      "external": 1234567,
      "rss": 89012345,
      "arrayBuffers": 123456
    },
    "cpu": {
      "usage": 23.45,
      "loadAverage": [1.2, 1.5, 1.8],
      "cores": 4,
      "model": "Intel(R) Core(TM) i7-9750H"
    },
    "endpoints": [
      {
        "path": "/api/users",
        "method": "GET",
        "count": 450,
        "averageResponseTime": 125.5,
        "errorRate": 2.3,
        "lastAccessed": "2024-01-15T10:35:22.456Z"
      }
    ],
    "errors": {
      "total": 73,
      "byStatusCode": {
        "404": 45,
        "500": 20,
        "401": 8
      },
      "byEndpoint": {
        "GET /api/posts": 30,
        "POST /api/users": 15
      },
      "recentErrors": [
        {
          "method": "GET",
          "path": "/api/posts/999",
          "statusCode": 404,
          "message": "Not Found",
          "timestamp": "2024-01-15T10:35:00.123Z"
        }
      ]
    },
    "timestamp": "2024-01-15T10:35:30.789Z"
  }
}
```

#### Get Performance Summary

```bash
GET /admin/performance/summary
```

Returns a quick health overview with detected issues.

**Example Response:**

```json
{
  "success": true,
  "data": {
    "health": "warning",
    "issues": [
      "Warning: Memory usage above 75%",
      "Warning: P95 response time above 5 seconds"
    ],
    "metrics": {
      "requestsPerSecond": 12.5,
      "averageResponseTime": 145.32,
      "errorRate": 4.79,
      "memoryUsage": 78.5,
      "cpuUsage": 23.45
    }
  }
}
```

**Health Status:**
- `healthy`: All metrics within normal ranges
- `warning`: Some metrics approaching thresholds
- `critical`: Metrics exceeding critical thresholds

**Warning Thresholds:**
- Memory usage > 75%
- CPU usage > 75%
- Error rate > 5%
- P95 response time > 5 seconds

**Critical Thresholds:**
- Memory usage > 90%
- CPU usage > 90%
- Error rate > 10%

### Export Formats

#### Prometheus Format

```bash
GET /admin/performance/export/prometheus
```

Exports metrics in Prometheus text format for integration with Prometheus monitoring.

**Example Response:**

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total 1523

# HELP http_requests_successful Total number of successful HTTP requests
# TYPE http_requests_successful counter
http_requests_successful 1450

# HELP http_request_duration_milliseconds HTTP request duration in milliseconds
# TYPE http_request_duration_milliseconds summary
http_request_duration_milliseconds{quantile="0.5"} 120
http_request_duration_milliseconds{quantile="0.95"} 450
http_request_duration_milliseconds{quantile="0.99"} 890

# HELP process_heap_bytes Process heap size in bytes
# TYPE process_heap_bytes gauge
process_heap_bytes{type="used"} 45678912
process_heap_bytes{type="total"} 67108864

# HELP process_cpu_usage_percent Process CPU usage percentage
# TYPE process_cpu_usage_percent gauge
process_cpu_usage_percent 23.45
```

#### JSON Format

```bash
GET /admin/performance/export/json
```

Downloads metrics as a JSON file with timestamp in filename.

#### CSV Format

```bash
GET /admin/performance/export/csv
```

Downloads metrics as a CSV file for spreadsheet analysis.

**Example CSV:**

```csv
Metric,Value,Unit,Timestamp
Total Requests,1523,count,2024-01-15T10:35:30.789Z
Successful Requests,1450,count,2024-01-15T10:35:30.789Z
Failed Requests,73,count,2024-01-15T10:35:30.789Z
Average Response Time,145.32,ms,2024-01-15T10:35:30.789Z
Heap Used,45678912,bytes,2024-01-15T10:35:30.789Z
CPU Usage,23.45,%,2024-01-15T10:35:30.789Z
```

### Reset Metrics

```bash
POST /admin/performance/reset
```

Resets all performance metrics to start fresh tracking.

**Example Response:**

```json
{
  "success": true,
  "message": "Performance metrics reset successfully",
  "meta": {
    "timestamp": "2024-01-15T10:40:00.000Z",
    "requestId": "req_1234567890"
  }
}
```

## Integration Examples

### Prometheus Integration

Add the Mock API Server as a scrape target in your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mock-api-server'
    scrape_interval: 30s
    metrics_path: '/admin/performance/export/prometheus'
    static_configs:
      - targets: ['localhost:3000']
    basic_auth:
      username: 'admin'
      password: 'your-password'
```

### Grafana Dashboard

Create a Grafana dashboard using the Prometheus metrics:

**Request Rate Panel:**
```promql
rate(http_requests_total[5m])
```

**Response Time Panel:**
```promql
http_request_duration_milliseconds{quantile="0.95"}
```

**Error Rate Panel:**
```promql
rate(http_requests_failed[5m]) / rate(http_requests_total[5m]) * 100
```

**Memory Usage Panel:**
```promql
process_heap_bytes{type="used"} / process_heap_bytes{type="total"} * 100
```

### Automated Monitoring Script

```bash
#!/bin/bash

# Check server health every minute
while true; do
  HEALTH=$(curl -s -u admin:password http://localhost:3000/admin/performance/summary | jq -r '.data.health')
  
  if [ "$HEALTH" = "critical" ]; then
    echo "ALERT: Server health is critical!"
    # Send alert notification
  elif [ "$HEALTH" = "warning" ]; then
    echo "WARNING: Server health needs attention"
  fi
  
  sleep 60
done
```

### Node.js Monitoring Client

```javascript
const axios = require('axios');

async function monitorPerformance() {
  try {
    const response = await axios.get('http://localhost:3000/admin/performance/summary', {
      auth: {
        username: 'admin',
        password: 'your-password'
      }
    });

    const { health, issues, metrics } = response.data.data;

    console.log(`Health Status: ${health}`);
    console.log(`Requests/sec: ${metrics.requestsPerSecond}`);
    console.log(`Avg Response Time: ${metrics.averageResponseTime}ms`);
    console.log(`Error Rate: ${metrics.errorRate}%`);
    console.log(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}%`);
    console.log(`CPU Usage: ${metrics.cpuUsage.toFixed(2)}%`);

    if (issues.length > 0) {
      console.log('\nIssues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
  } catch (error) {
    console.error('Failed to fetch metrics:', error.message);
  }
}

// Monitor every 30 seconds
setInterval(monitorPerformance, 30000);
monitorPerformance();
```

## Understanding Metrics

### Response Time Percentiles

- **Average**: Mean response time across all requests
- **Median (P50)**: 50% of requests complete faster than this time
- **P95**: 95% of requests complete faster than this time
- **P99**: 99% of requests complete faster than this time

Higher percentiles (P95, P99) help identify outliers and worst-case performance.

### Memory Metrics

- **Heap Used**: Memory currently used by JavaScript objects
- **Heap Total**: Total heap memory allocated
- **RSS (Resident Set Size)**: Total memory allocated for the process
- **External**: Memory used by C++ objects bound to JavaScript

### CPU Metrics

- **Usage**: Current CPU usage percentage
- **Load Average**: System load over 1, 5, and 15 minutes
- **Cores**: Number of CPU cores available

### Endpoint Metrics

Each endpoint tracks:
- **Count**: Total number of requests
- **Average Response Time**: Mean response time for this endpoint
- **Error Rate**: Percentage of failed requests
- **Last Accessed**: Timestamp of most recent request

## Best Practices

1. **Regular Monitoring**: Check metrics regularly to establish baseline performance
2. **Set Alerts**: Configure alerts for critical thresholds
3. **Export Data**: Periodically export metrics for long-term analysis
4. **Reset Strategically**: Reset metrics after deployments to track new version performance
5. **Correlate Issues**: Use endpoint metrics to identify problematic routes
6. **Track Trends**: Monitor P95/P99 response times to catch performance degradation early

## Troubleshooting

### High Memory Usage

If memory usage is consistently high:
1. Check for memory leaks in custom transformations
2. Review the number of stored requests (capped at 10,000)
3. Consider restarting the server periodically
4. Monitor V8 heap statistics for garbage collection issues

### High CPU Usage

If CPU usage is elevated:
1. Check request rate - may need to scale horizontally
2. Review transformation complexity
3. Check for inefficient proxy configurations
4. Monitor load average to understand system-wide load

### Slow Response Times

If P95/P99 times are high:
1. Check slowest requests to identify problematic endpoints
2. Review proxy timeout settings
3. Check external API performance (for proxy routes)
4. Consider adding caching for frequently accessed data

### High Error Rate

If error rate is elevated:
1. Check error metrics by status code
2. Review error metrics by endpoint
3. Check recent errors for patterns
4. Review application logs for detailed error information

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/performance/metrics` | GET | Get comprehensive performance metrics |
| `/admin/performance/summary` | GET | Get health summary with issues |
| `/admin/performance/export/prometheus` | GET | Export metrics in Prometheus format |
| `/admin/performance/export/json` | GET | Download metrics as JSON file |
| `/admin/performance/export/csv` | GET | Download metrics as CSV file |
| `/admin/performance/reset` | POST | Reset all performance metrics |

All endpoints require admin authentication when security is enabled.
