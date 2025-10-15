/**
 * Performance Monitoring Service
 * Provides detailed performance metrics, memory/CPU monitoring, and export capabilities
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as v8 from 'v8';

export interface DetailedMetrics {
    requests: RequestMetrics;
    system: SystemMetrics;
    memory: MemoryMetrics;
    cpu: CPUMetrics;
    endpoints: EndpointMetrics[];
    errors: ErrorMetrics;
    timestamp: string;
}

export interface RequestMetrics {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    medianResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    requestsPerMinute: number;
    slowestRequests: SlowRequest[];
}

export interface SystemMetrics {
    uptime: number;
    platform: string;
    nodeVersion: string;
    processUptime: number;
    hostname: string;
}

export interface MemoryMetrics {
    heapUsed: number;
    heapTotal: number;
    heapUsedPercentage: number;
    external: number;
    rss: number;
    arrayBuffers: number;
    v8HeapStatistics: v8.HeapStatistics;
}

export interface CPUMetrics {
    usage: number;
    loadAverage: number[];
    cores: number;
    model: string;
}

export interface EndpointMetrics {
    path: string;
    method: string;
    count: number;
    averageResponseTime: number;
    errorRate: number;
    lastAccessed: string;
}

export interface ErrorMetrics {
    total: number;
    byStatusCode: Record<number, number>;
    byEndpoint: Record<string, number>;
    recentErrors: RecentError[];
}

export interface SlowRequest {
    method: string;
    path: string;
    responseTime: number;
    timestamp: string;
    statusCode: number;
}

export interface RecentError {
    method: string;
    path: string;
    statusCode: number;
    message: string;
    timestamp: string;
}

export interface PerformanceRequestRecord {
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    timestamp: number;
    error?: string;
}

export interface MetricsExportFormat {
    prometheus?: boolean;
    json?: boolean;
    csv?: boolean;
}

export class PerformanceMonitoringService extends EventEmitter {
    private requests: PerformanceRequestRecord[] = [];
    private cpuUsageStart: NodeJS.CpuUsage;
    private maxStoredRequests: number = 10000;
    private metricsInterval: NodeJS.Timeout | null = null;
    private cpuSamples: number[] = [];
    private maxCpuSamples: number = 60; // Keep 60 samples (1 minute at 1 sample/sec)

    constructor() {
        super();
        this.cpuUsageStart = process.cpuUsage();
        this.startCPUMonitoring();
    }

    /**
     * Record a request for metrics tracking
     */
    recordRequest(record: PerformanceRequestRecord): void {
        this.requests.push(record);

        // Trim old requests to prevent memory issues
        if (this.requests.length > this.maxStoredRequests) {
            this.requests = this.requests.slice(-this.maxStoredRequests);
        }

        // Emit event for real-time monitoring
        this.emit('request', record);
    }

    /**
     * Get comprehensive performance metrics
     */
    getMetrics(): DetailedMetrics {
        const recentRequests = this.getRecentRequests(60000); // Last minute

        return {
            requests: this.getRequestMetrics(recentRequests),
            system: this.getSystemMetrics(),
            memory: this.getMemoryMetrics(),
            cpu: this.getCPUMetrics(),
            endpoints: this.getEndpointMetrics(),
            errors: this.getErrorMetrics(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get request metrics
     */
    private getRequestMetrics(requests: PerformanceRequestRecord[]): RequestMetrics {
        const successful = requests.filter(r => r.statusCode < 400);
        const failed = requests.filter(r => r.statusCode >= 400);
        const responseTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);

        const averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;

        const medianResponseTime = responseTimes.length > 0
            ? responseTimes[Math.floor(responseTimes.length / 2)]
            : 0;

        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p99Index = Math.floor(responseTimes.length * 0.99);

        const p95ResponseTime = responseTimes.length > 0 ? (responseTimes[p95Index] || 0) : 0;
        const p99ResponseTime = responseTimes.length > 0 ? (responseTimes[p99Index] || 0) : 0;

        // Calculate requests per second/minute
        const requestsPerMinute = requests.length;
        const requestsPerSecond = requestsPerMinute / 60;

        // Get slowest requests
        const slowestRequests = [...this.requests]
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, 10)
            .map(r => ({
                method: r.method,
                path: r.path,
                responseTime: r.responseTime,
                timestamp: new Date(r.timestamp).toISOString(),
                statusCode: r.statusCode
            }));

        return {
            total: this.requests.length,
            successful: successful.length,
            failed: failed.length,
            averageResponseTime: Math.round(averageResponseTime * 100) / 100,
            medianResponseTime: medianResponseTime || 0,
            p95ResponseTime: p95ResponseTime || 0,
            p99ResponseTime: p99ResponseTime || 0,
            requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
            requestsPerMinute,
            slowestRequests
        };
    }

    /**
     * Get system metrics
     */
    private getSystemMetrics(): SystemMetrics {
        return {
            uptime: os.uptime(),
            platform: `${os.platform()} ${os.release()}`,
            nodeVersion: process.version,
            processUptime: process.uptime(),
            hostname: os.hostname()
        };
    }

    /**
     * Get memory metrics
     */
    private getMemoryMetrics(): MemoryMetrics {
        const memUsage = process.memoryUsage();
        const v8Stats = v8.getHeapStatistics() as unknown as v8.HeapStatistics;

        return {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            heapUsedPercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
            external: memUsage.external,
            rss: memUsage.rss,
            arrayBuffers: memUsage.arrayBuffers,
            v8HeapStatistics: v8Stats
        };
    }

    /**
     * Get CPU metrics
     */
    private getCPUMetrics(): CPUMetrics {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();

        // Calculate average CPU usage from samples
        const avgUsage = this.cpuSamples.length > 0
            ? this.cpuSamples.reduce((sum, val) => sum + val, 0) / this.cpuSamples.length
            : 0;

        return {
            usage: Math.round(avgUsage * 100) / 100,
            loadAverage: loadAvg,
            cores: cpus.length,
            model: cpus[0]?.model || 'Unknown'
        };
    }

    /**
     * Get endpoint-specific metrics
     */
    private getEndpointMetrics(): EndpointMetrics[] {
        const endpointMap = new Map<string, {
            count: number;
            totalResponseTime: number;
            errors: number;
            lastAccessed: number;
        }>();

        this.requests.forEach(req => {
            const key = `${req.method} ${req.path}`;
            const existing = endpointMap.get(key) || {
                count: 0,
                totalResponseTime: 0,
                errors: 0,
                lastAccessed: 0
            };

            existing.count++;
            existing.totalResponseTime += req.responseTime;
            if (req.statusCode >= 400) {
                existing.errors++;
            }
            existing.lastAccessed = Math.max(existing.lastAccessed, req.timestamp);

            endpointMap.set(key, existing);
        });

        return Array.from(endpointMap.entries())
            .map(([key, data]) => {
                const [method, ...pathParts] = key.split(' ');
                const path = pathParts.join(' ');

                return {
                    path,
                    method: method || 'UNKNOWN',
                    count: data.count,
                    averageResponseTime: Math.round((data.totalResponseTime / data.count) * 100) / 100,
                    errorRate: (data.errors / data.count) * 100,
                    lastAccessed: new Date(data.lastAccessed).toISOString()
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // Top 20 endpoints
    }

    /**
     * Get error metrics
     */
    private getErrorMetrics(): ErrorMetrics {
        const errors = this.requests.filter(r => r.statusCode >= 400);

        const byStatusCode: Record<number, number> = {};
        const byEndpoint: Record<string, number> = {};

        errors.forEach(err => {
            byStatusCode[err.statusCode] = (byStatusCode[err.statusCode] || 0) + 1;
            const endpoint = `${err.method} ${err.path}`;
            byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
        });

        const recentErrors = errors
            .slice(-20)
            .map(err => ({
                method: err.method,
                path: err.path,
                statusCode: err.statusCode,
                message: err.error || 'Unknown error',
                timestamp: new Date(err.timestamp).toISOString()
            }));

        return {
            total: errors.length,
            byStatusCode,
            byEndpoint,
            recentErrors
        };
    }

    /**
     * Get requests within a time window
     */
    private getRecentRequests(timeWindowMs: number): PerformanceRequestRecord[] {
        const cutoff = Date.now() - timeWindowMs;
        return this.requests.filter(r => r.timestamp >= cutoff);
    }

    /**
     * Start CPU monitoring
     */
    private startCPUMonitoring(): void {
        this.metricsInterval = setInterval(() => {
            const cpuUsage = process.cpuUsage(this.cpuUsageStart);
            const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
            const elapsedTime = 1; // 1 second interval

            const cpuPercent = (totalUsage / elapsedTime) * 100;

            this.cpuSamples.push(cpuPercent);
            if (this.cpuSamples.length > this.maxCpuSamples) {
                this.cpuSamples.shift();
            }

            this.cpuUsageStart = process.cpuUsage();
        }, 1000);
    }

    /**
     * Export metrics in Prometheus format
     */
    exportPrometheus(): string {
        const metrics = this.getMetrics();
        const lines: string[] = [];

        // Request metrics
        lines.push('# HELP http_requests_total Total number of HTTP requests');
        lines.push('# TYPE http_requests_total counter');
        lines.push(`http_requests_total ${metrics.requests.total}`);

        lines.push('# HELP http_requests_successful Total number of successful HTTP requests');
        lines.push('# TYPE http_requests_successful counter');
        lines.push(`http_requests_successful ${metrics.requests.successful}`);

        lines.push('# HELP http_requests_failed Total number of failed HTTP requests');
        lines.push('# TYPE http_requests_failed counter');
        lines.push(`http_requests_failed ${metrics.requests.failed}`);

        lines.push('# HELP http_request_duration_milliseconds HTTP request duration in milliseconds');
        lines.push('# TYPE http_request_duration_milliseconds summary');
        lines.push(`http_request_duration_milliseconds{quantile="0.5"} ${metrics.requests.medianResponseTime}`);
        lines.push(`http_request_duration_milliseconds{quantile="0.95"} ${metrics.requests.p95ResponseTime}`);
        lines.push(`http_request_duration_milliseconds{quantile="0.99"} ${metrics.requests.p99ResponseTime}`);
        lines.push(`http_request_duration_milliseconds_sum ${metrics.requests.averageResponseTime * metrics.requests.total}`);
        lines.push(`http_request_duration_milliseconds_count ${metrics.requests.total}`);

        // Memory metrics
        lines.push('# HELP process_heap_bytes Process heap size in bytes');
        lines.push('# TYPE process_heap_bytes gauge');
        lines.push(`process_heap_bytes{type="used"} ${metrics.memory.heapUsed}`);
        lines.push(`process_heap_bytes{type="total"} ${metrics.memory.heapTotal}`);

        lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
        lines.push('# TYPE process_resident_memory_bytes gauge');
        lines.push(`process_resident_memory_bytes ${metrics.memory.rss}`);

        // CPU metrics
        lines.push('# HELP process_cpu_usage_percent Process CPU usage percentage');
        lines.push('# TYPE process_cpu_usage_percent gauge');
        lines.push(`process_cpu_usage_percent ${metrics.cpu.usage}`);

        // System metrics
        lines.push('# HELP process_uptime_seconds Process uptime in seconds');
        lines.push('# TYPE process_uptime_seconds counter');
        lines.push(`process_uptime_seconds ${metrics.system.processUptime}`);

        return lines.join('\n');
    }

    /**
     * Export metrics in JSON format
     */
    exportJSON(): string {
        return JSON.stringify(this.getMetrics(), null, 2);
    }

    /**
     * Export metrics in CSV format
     */
    exportCSV(): string {
        const metrics = this.getMetrics();
        const lines: string[] = [];

        // Header
        lines.push('Metric,Value,Unit,Timestamp');

        // Request metrics
        lines.push(`Total Requests,${metrics.requests.total},count,${metrics.timestamp}`);
        lines.push(`Successful Requests,${metrics.requests.successful},count,${metrics.timestamp}`);
        lines.push(`Failed Requests,${metrics.requests.failed},count,${metrics.timestamp}`);
        lines.push(`Average Response Time,${metrics.requests.averageResponseTime},ms,${metrics.timestamp}`);
        lines.push(`Median Response Time,${metrics.requests.medianResponseTime},ms,${metrics.timestamp}`);
        lines.push(`P95 Response Time,${metrics.requests.p95ResponseTime},ms,${metrics.timestamp}`);
        lines.push(`P99 Response Time,${metrics.requests.p99ResponseTime},ms,${metrics.timestamp}`);
        lines.push(`Requests Per Second,${metrics.requests.requestsPerSecond},req/s,${metrics.timestamp}`);

        // Memory metrics
        lines.push(`Heap Used,${metrics.memory.heapUsed},bytes,${metrics.timestamp}`);
        lines.push(`Heap Total,${metrics.memory.heapTotal},bytes,${metrics.timestamp}`);
        lines.push(`Heap Used Percentage,${metrics.memory.heapUsedPercentage.toFixed(2)},%,${metrics.timestamp}`);
        lines.push(`RSS,${metrics.memory.rss},bytes,${metrics.timestamp}`);

        // CPU metrics
        lines.push(`CPU Usage,${metrics.cpu.usage},%,${metrics.timestamp}`);
        lines.push(`Load Average (1m),${metrics.cpu.loadAverage[0]},load,${metrics.timestamp}`);
        lines.push(`Load Average (5m),${metrics.cpu.loadAverage[1]},load,${metrics.timestamp}`);
        lines.push(`Load Average (15m),${metrics.cpu.loadAverage[2]},load,${metrics.timestamp}`);

        // System metrics
        lines.push(`Process Uptime,${metrics.system.processUptime},seconds,${metrics.timestamp}`);
        lines.push(`System Uptime,${metrics.system.uptime},seconds,${metrics.timestamp}`);

        return lines.join('\n');
    }

    /**
     * Get metrics summary for quick overview
     */
    getSummary(): {
        health: 'healthy' | 'warning' | 'critical';
        issues: string[];
        metrics: {
            requestsPerSecond: number;
            averageResponseTime: number;
            errorRate: number;
            memoryUsage: number;
            cpuUsage: number;
        };
    } {
        const metrics = this.getMetrics();
        const issues: string[] = [];
        let health: 'healthy' | 'warning' | 'critical' = 'healthy';

        // Check memory usage
        if (metrics.memory.heapUsedPercentage > 90) {
            issues.push('Critical: Memory usage above 90%');
            health = 'critical';
        } else if (metrics.memory.heapUsedPercentage > 75) {
            issues.push('Warning: Memory usage above 75%');
            if (health === 'healthy') health = 'warning';
        }

        // Check CPU usage
        if (metrics.cpu.usage > 90) {
            issues.push('Critical: CPU usage above 90%');
            health = 'critical';
        } else if (metrics.cpu.usage > 75) {
            issues.push('Warning: CPU usage above 75%');
            if (health !== 'critical') health = 'warning';
        }

        // Check error rate
        const errorRate = (metrics.requests.failed / metrics.requests.total) * 100;
        if (errorRate > 10) {
            issues.push(`Critical: Error rate above 10% (${errorRate.toFixed(2)}%)`);
            health = 'critical';
        } else if (errorRate > 5) {
            issues.push(`Warning: Error rate above 5% (${errorRate.toFixed(2)}%)`);
            if (health === 'healthy') health = 'warning';
        }

        // Check response time
        if (metrics.requests.p95ResponseTime > 5000) {
            issues.push('Warning: P95 response time above 5 seconds');
            if (health !== 'critical') health = 'warning';
        }

        return {
            health,
            issues,
            metrics: {
                requestsPerSecond: metrics.requests.requestsPerSecond,
                averageResponseTime: metrics.requests.averageResponseTime,
                errorRate,
                memoryUsage: metrics.memory.heapUsedPercentage,
                cpuUsage: metrics.cpu.usage
            }
        };
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.requests = [];
        this.cpuSamples = [];
        this.cpuUsageStart = process.cpuUsage();
        this.emit('reset');
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        this.removeAllListeners();
    }
}
