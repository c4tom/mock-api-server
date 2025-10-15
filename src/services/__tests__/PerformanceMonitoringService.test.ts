/**
 * Unit tests for PerformanceMonitoringService
 */

import { PerformanceMonitoringService, PerformanceRequestRecord } from '../PerformanceMonitoringService';

describe('PerformanceMonitoringService', () => {
    let service: PerformanceMonitoringService;

    beforeEach(() => {
        service = new PerformanceMonitoringService();
    });

    afterEach(() => {
        service.destroy();
    });

    describe('recordRequest', () => {
        it('should record a request successfully', () => {
            const record: PerformanceRequestRecord = {
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 150,
                timestamp: Date.now()
            };

            service.recordRequest(record);
            const metrics = service.getMetrics();

            expect(metrics.requests.total).toBe(1);
            expect(metrics.requests.successful).toBe(1);
            expect(metrics.requests.failed).toBe(0);
        });

        it('should record failed requests', () => {
            const record: PerformanceRequestRecord = {
                method: 'GET',
                path: '/api/users',
                statusCode: 404,
                responseTime: 50,
                timestamp: Date.now(),
                error: 'Not Found'
            };

            service.recordRequest(record);
            const metrics = service.getMetrics();

            expect(metrics.requests.total).toBe(1);
            expect(metrics.requests.successful).toBe(0);
            expect(metrics.requests.failed).toBe(1);
        });

        it('should emit request event when recording', (done) => {
            const record: PerformanceRequestRecord = {
                method: 'POST',
                path: '/api/users',
                statusCode: 201,
                responseTime: 200,
                timestamp: Date.now()
            };

            service.on('request', (emittedRecord) => {
                expect(emittedRecord).toEqual(record);
                done();
            });

            service.recordRequest(record);
        });

        it('should limit stored requests to prevent memory issues', () => {
            // Record more than maxStoredRequests
            for (let i = 0; i < 11000; i++) {
                service.recordRequest({
                    method: 'GET',
                    path: '/test',
                    statusCode: 200,
                    responseTime: 100,
                    timestamp: Date.now()
                });
            }

            const metrics = service.getMetrics();
            // Should be capped at 10000
            expect(metrics.requests.total).toBeLessThanOrEqual(10000);
        });
    });

    describe('getMetrics', () => {
        it('should return comprehensive metrics', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            service.recordRequest({
                method: 'POST',
                path: '/api/users',
                statusCode: 201,
                responseTime: 200,
                timestamp: Date.now()
            });

            const metrics = service.getMetrics();

            expect(metrics).toHaveProperty('requests');
            expect(metrics).toHaveProperty('system');
            expect(metrics).toHaveProperty('memory');
            expect(metrics).toHaveProperty('cpu');
            expect(metrics).toHaveProperty('endpoints');
            expect(metrics).toHaveProperty('errors');
            expect(metrics).toHaveProperty('timestamp');
        });

        it('should calculate response time percentiles correctly', () => {
            const responseTimes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

            responseTimes.forEach((time) => {
                service.recordRequest({
                    method: 'GET',
                    path: '/test',
                    statusCode: 200,
                    responseTime: time,
                    timestamp: Date.now()
                });
            });

            const metrics = service.getMetrics();

            expect(metrics.requests.medianResponseTime).toBeGreaterThan(0);
            expect(metrics.requests.p95ResponseTime).toBeGreaterThanOrEqual(metrics.requests.medianResponseTime);
            expect(metrics.requests.p99ResponseTime).toBeGreaterThanOrEqual(metrics.requests.p95ResponseTime);
        });

        it('should track slowest requests', () => {
            service.recordRequest({
                method: 'GET',
                path: '/slow',
                statusCode: 200,
                responseTime: 5000,
                timestamp: Date.now()
            });

            service.recordRequest({
                method: 'GET',
                path: '/fast',
                statusCode: 200,
                responseTime: 50,
                timestamp: Date.now()
            });

            const metrics = service.getMetrics();

            expect(metrics.requests.slowestRequests.length).toBeGreaterThan(0);
            expect(metrics.requests.slowestRequests[0]?.responseTime).toBe(5000);
            expect(metrics.requests.slowestRequests[0]?.path).toBe('/slow');
        });
    });

    describe('getEndpointMetrics', () => {
        it('should aggregate metrics by endpoint', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 150,
                timestamp: Date.now()
            });

            service.recordRequest({
                method: 'POST',
                path: '/api/users',
                statusCode: 201,
                responseTime: 200,
                timestamp: Date.now()
            });

            const metrics = service.getMetrics();

            expect(metrics.endpoints.length).toBeGreaterThan(0);

            const getUsersEndpoint = metrics.endpoints.find(
                (e) => e.method === 'GET' && e.path === '/api/users'
            );

            expect(getUsersEndpoint).toBeDefined();
            expect(getUsersEndpoint?.count).toBe(2);
            expect(getUsersEndpoint?.averageResponseTime).toBe(125);
        });

        it('should calculate error rate per endpoint', () => {
            // 3 successful requests
            for (let i = 0; i < 3; i++) {
                service.recordRequest({
                    method: 'GET',
                    path: '/api/users',
                    statusCode: 200,
                    responseTime: 100,
                    timestamp: Date.now()
                });
            }

            // 1 failed request
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 500,
                responseTime: 50,
                timestamp: Date.now(),
                error: 'Internal Server Error'
            });

            const metrics = service.getMetrics();
            const endpoint = metrics.endpoints.find(
                (e) => e.method === 'GET' && e.path === '/api/users'
            );

            expect(endpoint?.errorRate).toBe(25); // 1 out of 4 = 25%
        });
    });

    describe('getErrorMetrics', () => {
        it('should track errors by status code', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 404,
                responseTime: 50,
                timestamp: Date.now(),
                error: 'Not Found'
            });

            service.recordRequest({
                method: 'GET',
                path: '/api/posts',
                statusCode: 500,
                responseTime: 100,
                timestamp: Date.now(),
                error: 'Internal Server Error'
            });

            service.recordRequest({
                method: 'GET',
                path: '/api/comments',
                statusCode: 404,
                responseTime: 50,
                timestamp: Date.now(),
                error: 'Not Found'
            });

            const metrics = service.getMetrics();

            expect(metrics.errors.total).toBe(3);
            expect(metrics.errors.byStatusCode[404]).toBe(2);
            expect(metrics.errors.byStatusCode[500]).toBe(1);
        });

        it('should track errors by endpoint', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 404,
                responseTime: 50,
                timestamp: Date.now(),
                error: 'Not Found'
            });

            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 500,
                responseTime: 100,
                timestamp: Date.now(),
                error: 'Internal Server Error'
            });

            const metrics = service.getMetrics();

            expect(metrics.errors.byEndpoint['GET /api/users']).toBe(2);
        });

        it('should track recent errors', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 404,
                responseTime: 50,
                timestamp: Date.now(),
                error: 'Not Found'
            });

            const metrics = service.getMetrics();

            expect(metrics.errors.recentErrors.length).toBe(1);
            expect(metrics.errors.recentErrors[0]?.statusCode).toBe(404);
            expect(metrics.errors.recentErrors[0]?.message).toBe('Not Found');
        });
    });

    describe('exportPrometheus', () => {
        it('should export metrics in Prometheus format', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            const prometheus = service.exportPrometheus();

            expect(prometheus).toContain('# HELP http_requests_total');
            expect(prometheus).toContain('# TYPE http_requests_total counter');
            expect(prometheus).toContain('http_requests_total 1');
            expect(prometheus).toContain('process_heap_bytes');
            expect(prometheus).toContain('process_cpu_usage_percent');
        });
    });

    describe('exportJSON', () => {
        it('should export metrics in JSON format', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            const json = service.exportJSON();
            const parsed = JSON.parse(json);

            expect(parsed).toHaveProperty('requests');
            expect(parsed).toHaveProperty('system');
            expect(parsed).toHaveProperty('memory');
            expect(parsed).toHaveProperty('cpu');
        });
    });

    describe('exportCSV', () => {
        it('should export metrics in CSV format', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            const csv = service.exportCSV();

            expect(csv).toContain('Metric,Value,Unit,Timestamp');
            expect(csv).toContain('Total Requests,1,count');
            expect(csv).toContain('Average Response Time');
            expect(csv).toContain('Heap Used');
            expect(csv).toContain('CPU Usage');
        });
    });

    describe('getSummary', () => {
        it('should return healthy status with good metrics', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            const summary = service.getSummary();

            // Health can be 'healthy' or 'warning' depending on system resources
            expect(['healthy', 'warning']).toContain(summary.health);
            expect(summary.metrics).toHaveProperty('requestsPerSecond');
            expect(summary.metrics).toHaveProperty('averageResponseTime');
            expect(summary.metrics).toHaveProperty('errorRate');
        });

        it('should detect high error rate', () => {
            // Add 5 failed requests and 5 successful
            for (let i = 0; i < 5; i++) {
                service.recordRequest({
                    method: 'GET',
                    path: '/test',
                    statusCode: 500,
                    responseTime: 100,
                    timestamp: Date.now(),
                    error: 'Error'
                });
            }

            for (let i = 0; i < 5; i++) {
                service.recordRequest({
                    method: 'GET',
                    path: '/test',
                    statusCode: 200,
                    responseTime: 100,
                    timestamp: Date.now()
                });
            }

            const summary = service.getSummary();

            expect(summary.health).not.toBe('healthy');
            expect(summary.issues.some(issue => issue.includes('Error rate'))).toBe(true);
        });
    });

    describe('reset', () => {
        it('should reset all metrics', () => {
            service.recordRequest({
                method: 'GET',
                path: '/api/users',
                statusCode: 200,
                responseTime: 100,
                timestamp: Date.now()
            });

            let metrics = service.getMetrics();
            expect(metrics.requests.total).toBe(1);

            service.reset();

            metrics = service.getMetrics();
            expect(metrics.requests.total).toBe(0);
        });

        it('should emit reset event', (done) => {
            service.on('reset', () => {
                done();
            });

            service.reset();
        });
    });

    describe('memory and CPU metrics', () => {
        it('should return memory metrics', () => {
            const metrics = service.getMetrics();

            expect(metrics.memory).toHaveProperty('heapUsed');
            expect(metrics.memory).toHaveProperty('heapTotal');
            expect(metrics.memory).toHaveProperty('heapUsedPercentage');
            expect(metrics.memory).toHaveProperty('rss');
            expect(metrics.memory.heapUsed).toBeGreaterThan(0);
            expect(metrics.memory.heapTotal).toBeGreaterThan(0);
        });

        it('should return CPU metrics', () => {
            const metrics = service.getMetrics();

            expect(metrics.cpu).toHaveProperty('usage');
            expect(metrics.cpu).toHaveProperty('loadAverage');
            expect(metrics.cpu).toHaveProperty('cores');
            expect(metrics.cpu.cores).toBeGreaterThan(0);
            expect(Array.isArray(metrics.cpu.loadAverage)).toBe(true);
        });

        it('should return system metrics', () => {
            const metrics = service.getMetrics();

            expect(metrics.system).toHaveProperty('uptime');
            expect(metrics.system).toHaveProperty('platform');
            expect(metrics.system).toHaveProperty('nodeVersion');
            expect(metrics.system).toHaveProperty('processUptime');
            expect(metrics.system.uptime).toBeGreaterThan(0);
        });
    });
});
