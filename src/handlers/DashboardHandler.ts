import { Request, Response } from 'express';
import { ConfigManager } from '../config/ConfigManager';
import { LoggingService } from '../services/LoggingService';

interface RequestMetric {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip: string;
}

interface SystemMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export class DashboardHandler {
  private configManager: ConfigManager;
  private logger: LoggingService;
  private requestMetrics: RequestMetric[] = [];
  private maxMetrics = 1000;
  private startTime: number;
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;

  constructor(configManager: ConfigManager, logger: LoggingService) {
    this.configManager = configManager;
    this.logger = logger;
    this.startTime = Date.now();
  }

  recordRequest(metric: RequestMetric): void {
    this.requestMetrics.push(metric);
    this.requestCount++;
    this.totalResponseTime += metric.responseTime;

    if (metric.statusCode >= 400) {
      this.errorCount++;
    }

    // Keep only last N metrics
    if (this.requestMetrics.length > this.maxMetrics) {
      this.requestMetrics.shift();
    }
  }

  serveDashboard = async (_req: Request, res: Response): Promise<void> => {
    const html = this.generateDashboardHTML();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  };

  getMetrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const metrics: SystemMetrics = {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.logEvent('error', 'Error getting metrics', { error });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get metrics' }
      });
    }
  };

  getRecentRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query['limit'] as string) || 50;
      const recentRequests = this.requestMetrics.slice(-limit).reverse();

      res.json({
        success: true,
        data: recentRequests
      });
    } catch (error) {
      this.logger.logEvent('error', 'Error getting recent requests', { error });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get recent requests' }
      });
    }
  };

  getConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      const config = this.configManager.getConfig();

      // Remove sensitive data
      const safeConfig = {
        ...config,
        security: {
          ...config.security,
          authentication: {
            ...config.security.authentication,
            jwtSecret: config.security.authentication.jwtSecret ? '***' : undefined,
            devToken: config.security.authentication.devToken ? '***' : undefined,
            basicCredentials: config.security.authentication.basicCredentials ? { username: '***', password: '***' } : undefined
          }
        }
      };

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      this.logger.logEvent('error', 'Error getting config', { error });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get configuration' }
      });
    }
  };

  private generateDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mock API Server - Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #334155;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
    }

    .card-title {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .card-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 8px;
    }

    .card-label {
      font-size: 0.875rem;
      color: #64748b;
    }

    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }

    .status-online {
      background: #10b981;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .section {
      background: #1e293b;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      border: 1px solid #334155;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: #f1f5f9;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 12px;
      background: #0f172a;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }

    td {
      padding: 12px;
      border-top: 1px solid #334155;
      font-size: 0.875rem;
    }

    tr:hover {
      background: #0f172a;
    }

    .method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .method-get { background: #3b82f6; color: white; }
    .method-post { background: #10b981; color: white; }
    .method-put { background: #f59e0b; color: white; }
    .method-delete { background: #ef4444; color: white; }

    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-success { background: #10b981; color: white; }
    .status-error { background: #ef4444; color: white; }
    .status-warning { background: #f59e0b; color: white; }

    .chart-container {
      height: 300px;
      margin-top: 20px;
    }

    .config-editor {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
    }

    .config-editor pre {
      margin: 0;
      color: #e2e8f0;
    }

    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn:active {
      transform: translateY(0);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .spinner {
      border: 3px solid #334155;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 2px solid #334155;
    }

    .tab {
      padding: 12px 24px;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #e2e8f0;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Mock API Server</h1>
      <p class="subtitle">
        <span class="status-indicator status-online"></span>
        Real-time monitoring and configuration dashboard
      </p>
    </header>

    <div class="grid" id="metrics-grid">
      <div class="card">
        <div class="card-title">Server Status</div>
        <div class="card-value" id="uptime">--</div>
        <div class="card-label">Uptime</div>
      </div>
      <div class="card">
        <div class="card-title">Total Requests</div>
        <div class="card-value" id="request-count">0</div>
        <div class="card-label">Since startup</div>
      </div>
      <div class="card">
        <div class="card-title">Error Rate</div>
        <div class="card-value" id="error-rate">0%</div>
        <div class="card-label">Failed requests</div>
      </div>
      <div class="card">
        <div class="card-title">Avg Response Time</div>
        <div class="card-value" id="avg-response">0ms</div>
        <div class="card-label">Average latency</div>
      </div>
      <div class="card">
        <div class="card-title">Memory Usage</div>
        <div class="card-value" id="memory-usage">0 MB</div>
        <div class="card-label">Heap used</div>
      </div>
    </div>

    <div class="section">
      <div class="tabs">
        <button class="tab active" onclick="switchTab('requests')">Recent Requests</button>
        <button class="tab" onclick="switchTab('config')">Configuration</button>
        <button class="tab" onclick="switchTab('analytics')">Analytics</button>
      </div>

      <div id="requests-tab" class="tab-content active">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Response Time</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody id="requests-table">
              <tr>
                <td colspan="6" class="loading">
                  <div class="spinner"></div>
                  Loading requests...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="config-tab" class="tab-content">
        <div style="margin-bottom: 16px;">
          <button class="btn" onclick="reloadConfig()">🔄 Reload Configuration</button>
        </div>
        <div class="config-editor">
          <pre id="config-display">Loading configuration...</pre>
        </div>
      </div>

      <div id="analytics-tab" class="tab-content">
        <div class="chart-container">
          <canvas id="requests-chart"></canvas>
        </div>
        <div class="grid" style="margin-top: 20px;">
          <div class="card">
            <div class="card-title">Most Requested Paths</div>
            <div id="top-paths" style="font-size: 0.875rem; margin-top: 12px;">
              Loading...
            </div>
          </div>
          <div class="card">
            <div class="card-title">Status Code Distribution</div>
            <div id="status-distribution" style="font-size: 0.875rem; margin-top: 12px;">
              Loading...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script>
    let requestsChart = null;

    function formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return days + 'd ' + (hours % 24) + 'h';
      if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
      if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
      return seconds + 's';
    }

    function formatBytes(bytes) {
      return (bytes / 1024 / 1024).toFixed(2);
    }

    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    }

    function getMethodClass(method) {
      return 'method-' + method.toLowerCase();
    }

    function getStatusClass(status) {
      if (status >= 200 && status < 300) return 'status-success';
      if (status >= 400) return 'status-error';
      return 'status-warning';
    }

    async function fetchMetrics() {
      try {
        const response = await fetch('/dashboard/api/metrics');
        const result = await response.json();
        
        if (result.success) {
          const data = result.data;
          document.getElementById('uptime').textContent = formatUptime(data.uptime);
          document.getElementById('request-count').textContent = data.requestCount.toLocaleString();
          
          const errorRate = data.requestCount > 0 
            ? ((data.errorCount / data.requestCount) * 100).toFixed(1)
            : '0';
          document.getElementById('error-rate').textContent = errorRate + '%';
          
          document.getElementById('avg-response').textContent = Math.round(data.averageResponseTime) + 'ms';
          document.getElementById('memory-usage').textContent = formatBytes(data.memory.heapUsed) + ' MB';
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    }

    async function fetchRecentRequests() {
      try {
        const response = await fetch('/dashboard/api/requests?limit=50');
        const result = await response.json();
        
        if (result.success) {
          const tbody = document.getElementById('requests-table');
          tbody.innerHTML = result.data.map(req => \`
            <tr>
              <td>\${formatTime(req.timestamp)}</td>
              <td><span class="method \${getMethodClass(req.method)}">\${req.method}</span></td>
              <td>\${req.path}</td>
              <td><span class="status \${getStatusClass(req.statusCode)}">\${req.statusCode}</span></td>
              <td>\${req.responseTime}ms</td>
              <td>\${req.ip}</td>
            </tr>
          \`).join('');

          updateAnalytics(result.data);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      }
    }

    async function fetchConfig() {
      try {
        const response = await fetch('/dashboard/api/config');
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('config-display').textContent = 
            JSON.stringify(result.data, null, 2);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    }

    async function reloadConfig() {
      try {
        const response = await fetch('/admin/reload', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
          alert('Configuration reloaded successfully!');
          fetchConfig();
        } else {
          alert('Failed to reload configuration: ' + result.error.message);
        }
      } catch (error) {
        alert('Error reloading configuration: ' + error.message);
      }
    }

    function updateAnalytics(requests) {
      // Update chart
      const last20 = requests.slice(-20).reverse();
      const labels = last20.map(r => formatTime(r.timestamp));
      const responseTimes = last20.map(r => r.responseTime);

      if (requestsChart) {
        requestsChart.destroy();
      }

      const ctx = document.getElementById('requests-chart');
      requestsChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Response Time (ms)',
            data: responseTimes,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#e2e8f0' }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8' },
              grid: { color: '#334155' }
            },
            x: {
              ticks: { color: '#94a3b8' },
              grid: { color: '#334155' }
            }
          }
        }
      });

      // Top paths
      const pathCounts = {};
      requests.forEach(r => {
        pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
      });
      const topPaths = Object.entries(pathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      document.getElementById('top-paths').innerHTML = topPaths
        .map(([path, count]) => \`<div style="margin-bottom: 8px;">\${path}: <strong>\${count}</strong></div>\`)
        .join('') || 'No data yet';

      // Status distribution
      const statusCounts = {};
      requests.forEach(r => {
        const statusGroup = Math.floor(r.statusCode / 100) + 'xx';
        statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
      });
      
      document.getElementById('status-distribution').innerHTML = Object.entries(statusCounts)
        .map(([status, count]) => \`<div style="margin-bottom: 8px;">\${status}: <strong>\${count}</strong></div>\`)
        .join('') || 'No data yet';
    }

    function switchTab(tabName) {
      // Update tab buttons
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      event.target.classList.add('active');

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabName + '-tab').classList.add('active');

      // Load data if needed
      if (tabName === 'config') {
        fetchConfig();
      }
    }

    // Initial load
    fetchMetrics();
    fetchRecentRequests();

    // Auto-refresh every 5 seconds
    setInterval(() => {
      fetchMetrics();
      fetchRecentRequests();
    }, 5000);
  </script>
</body>
</html>`;
  }
}
