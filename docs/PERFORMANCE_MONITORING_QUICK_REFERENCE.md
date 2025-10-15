# Performance Monitoring Quick Reference

## Quick Start

```bash
# Get metrics
curl -u admin:password http://localhost:3000/admin/performance/metrics

# Get health summary
curl -u admin:password http://localhost:3000/admin/performance/summary

# Export formats
curl -u admin:password http://localhost:3000/admin/performance/export/prometheus
curl -u admin:password http://localhost:3000/admin/performance/export/json > metrics.json
curl -u admin:password http://localhost:3000/admin/performance/export/csv > metrics.csv

# Reset metrics
curl -X POST -u admin:password http://localhost:3000/admin/performance/reset
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/performance/metrics` | GET | Comprehensive metrics |
| `/admin/performance/summary` | GET | Health summary |
| `/admin/performance/export/prometheus` | GET | Prometheus format |
| `/admin/performance/export/json` | GET | JSON download |
| `/admin/performance/export/csv` | GET | CSV download |
| `/admin/performance/reset` | POST | Reset metrics |

## Key Metrics

### Request Metrics
- Total, successful, failed requests
- Average, median, P95, P99 response times
- Requests per second/minute
- Slowest requests

### System Metrics
- Uptime, platform, Node version
- Process uptime, hostname

### Memory Metrics
- Heap used/total, percentage
- RSS, external memory
- V8 heap statistics

### CPU Metrics
- Usage percentage
- Load average (1m, 5m, 15m)
- Cores, model

### Endpoint Metrics
- Count per endpoint
- Average response time
- Error rate
- Last accessed

### Error Metrics
- Total errors
- By status code
- By endpoint
- Recent errors

## Health Status

### Healthy
All metrics within normal ranges

### Warning
- Memory > 75%
- CPU > 75%
- Error rate > 5%
- P95 response time > 5s

### Critical
- Memory > 90%
- CPU > 90%
- Error rate > 10%

## Prometheus Integration

```yaml
# prometheus.yml
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

## Grafana Queries

```promql
# Request rate
rate(http_requests_total[5m])

# P95 response time
http_request_duration_milliseconds{quantile="0.95"}

# Error rate
rate(http_requests_failed[5m]) / rate(http_requests_total[5m]) * 100

# Memory usage
process_heap_bytes{type="used"} / process_heap_bytes{type="total"} * 100
```

## Monitoring Script

```bash
#!/bin/bash
while true; do
  HEALTH=$(curl -s -u admin:password \
    http://localhost:3000/admin/performance/summary | \
    jq -r '.data.health')
  
  if [ "$HEALTH" = "critical" ]; then
    echo "ALERT: Critical health status!"
  fi
  
  sleep 60
done
```

## Node.js Client

```javascript
const axios = require('axios');

async function getMetrics() {
  const { data } = await axios.get(
    'http://localhost:3000/admin/performance/summary',
    { auth: { username: 'admin', password: 'password' } }
  );
  
  return data.data;
}

// Monitor every 30 seconds
setInterval(async () => {
  const { health, metrics } = await getMetrics();
  console.log(`Health: ${health}`);
  console.log(`RPS: ${metrics.requestsPerSecond}`);
  console.log(`Memory: ${metrics.memoryUsage.toFixed(2)}%`);
}, 30000);
```

## Common Tasks

### Check Server Health
```bash
curl -s -u admin:password \
  http://localhost:3000/admin/performance/summary | \
  jq '.data.health'
```

### Get Error Rate
```bash
curl -s -u admin:password \
  http://localhost:3000/admin/performance/summary | \
  jq '.data.metrics.errorRate'
```

### Export Daily Metrics
```bash
curl -u admin:password \
  http://localhost:3000/admin/performance/export/json \
  > "metrics-$(date +%Y%m%d).json"
```

### Monitor Response Times
```bash
curl -s -u admin:password \
  http://localhost:3000/admin/performance/metrics | \
  jq '.data.requests | {avg: .averageResponseTime, p95: .p95ResponseTime, p99: .p99ResponseTime}'
```

### Check Memory Usage
```bash
curl -s -u admin:password \
  http://localhost:3000/admin/performance/metrics | \
  jq '.data.memory.heapUsedPercentage'
```

### List Slowest Endpoints
```bash
curl -s -u admin:password \
  http://localhost:3000/admin/performance/metrics | \
  jq '.data.endpoints | sort_by(.averageResponseTime) | reverse | .[0:5]'
```

## Troubleshooting

### High Memory Usage
```bash
# Check memory metrics
curl -s -u admin:password \
  http://localhost:3000/admin/performance/metrics | \
  jq '.data.memory'

# Reset metrics to free memory
curl -X POST -u admin:password \
  http://localhost:3000/admin/performance/reset
```

### High Error Rate
```bash
# Check error details
curl -s -u admin:password \
  http://localhost:3000/admin/performance/metrics | \
  jq '.data.errors'
```

### Slow Response Times
```bash
# Check slowest requests
curl -s -u admin:password \
  http://localhost:3000/admin/performance/metrics | \
  jq '.data.requests.slowestRequests'
```

## Best Practices

1. **Regular Monitoring:** Check metrics every 30-60 seconds
2. **Set Alerts:** Configure alerts for critical thresholds
3. **Export Data:** Periodically export for long-term analysis
4. **Reset After Deployments:** Reset metrics to track new version
5. **Monitor Trends:** Track P95/P99 to catch degradation early
6. **Correlate Issues:** Use endpoint metrics to identify problems

## See Also

- [Full Documentation](./PERFORMANCE_MONITORING_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Dashboard Guide](./DASHBOARD_GUIDE.md)
