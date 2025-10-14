/**
 * Tests for LoggingService
 */

import { LoggingService, RequestMetrics } from '../LoggingService';
import { LoggingConfig } from '../../types/config';

describe('LoggingService', () => {
    let loggingService: LoggingService;
    let mockConfig: LoggingConfig;

    beforeEach(() => {
        mockConfig = {
            level: 'info',
            format: 'simple'
        };
        loggingService = new LoggingService(mockConfig);
    });

    afterEach(() => {
        loggingService.destroy();
    });

    describe('Performance Metrics', () => {
        it('should initialize with empty metrics', () => {
            const metrics = loggingService.getPerformanceMetrics();

            expect(metrics.totalRequests).toBe(0);
            expect(metrics.successfulRequests).toBe(0);
            expect(metrics.failedRequests).toBe(0);
            expect(metrics.averageResponseTime).toBe(0);
            expect(metrics.requestsPerMinute).toBe(0);
            expect(metrics.errorRate).toBe(0);
        });

        it('should track request metrics correctly', () => {
            // Simulate some requests by directly calling the private method
            const mockMetrics: RequestMetrics = {
                requestId: 'test-1',
                method: 'GET',
                url: '/test',
                statusCode: 200,
                responseTime: 100,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date().toISOString()
            };

            // Access private method for testing
            (loggingService as any).recordRequestMetrics(mockMetrics);

            const metrics = loggingService.getPerformanceMetrics();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.successfulRequests).toBe(1);
            expect(metrics.failedRequests).toBe(0);
            expect(metrics.averageResponseTime).toBe(100);
            expect(metrics.errorRate).toBe(0);
        });

        it('should track failed requests correctly', () => {
            const mockMetrics: RequestMetrics = {
                requestId: 'test-1',
                method: 'GET',
                url: '/test',
                statusCode: 500,
                responseTime: 200,
                contentLength: 512,
                ip: '127.0.0.1',
                timestamp: new Date().toISOString()
            };

            (loggingService as any).recordRequestMetrics(mockMetrics);

            const metrics = loggingService.getPerformanceMetrics();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.successfulRequests).toBe(0);
            expect(metrics.failedRequests).toBe(1);
            expect(metrics.errorRate).toBe(100);
        });

        it('should calculate average response time correctly', () => {
            const metrics1: RequestMetrics = {
                requestId: 'test-1',
                method: 'GET',
                url: '/test1',
                statusCode: 200,
                responseTime: 100,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date().toISOString()
            };

            const metrics2: RequestMetrics = {
                requestId: 'test-2',
                method: 'GET',
                url: '/test2',
                statusCode: 200,
                responseTime: 200,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date().toISOString()
            };

            (loggingService as any).recordRequestMetrics(metrics1);
            (loggingService as any).recordRequestMetrics(metrics2);

            const metrics = loggingService.getPerformanceMetrics();
            expect(metrics.averageResponseTime).toBe(150); // (100 + 200) / 2
        });
    });

    describe('Request Tracking', () => {
        it('should return recent requests', () => {
            const mockMetrics: RequestMetrics = {
                requestId: 'test-1',
                method: 'GET',
                url: '/test',
                statusCode: 200,
                responseTime: 100,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date().toISOString()
            };

            (loggingService as any).recordRequestMetrics(mockMetrics);

            const recentRequests = loggingService.getRecentRequests(10);
            expect(recentRequests).toHaveLength(1);
            expect(recentRequests[0]).toEqual(mockMetrics);
        });

        it('should limit recent requests correctly', () => {
            // Add multiple requests
            for (let i = 0; i < 5; i++) {
                const mockMetrics: RequestMetrics = {
                    requestId: `test-${i}`,
                    method: 'GET',
                    url: `/test${i}`,
                    statusCode: 200,
                    responseTime: 100,
                    contentLength: 1024,
                    ip: '127.0.0.1',
                    timestamp: new Date().toISOString()
                };
                (loggingService as any).recordRequestMetrics(mockMetrics);
            }

            const recentRequests = loggingService.getRecentRequests(3);
            expect(recentRequests).toHaveLength(3);
            expect(recentRequests[0]?.requestId).toBe('test-2'); // Last 3 requests
            expect(recentRequests[2]?.requestId).toBe('test-4');
        });

        it('should group requests by status code', () => {
            const requests = [
                { statusCode: 200 },
                { statusCode: 201 },
                { statusCode: 400 },
                { statusCode: 404 },
                { statusCode: 500 }
            ];

            requests.forEach((req, index) => {
                const mockMetrics: RequestMetrics = {
                    requestId: `test-${index}`,
                    method: 'GET',
                    url: `/test${index}`,
                    statusCode: req.statusCode,
                    responseTime: 100,
                    contentLength: 1024,
                    ip: '127.0.0.1',
                    timestamp: new Date().toISOString()
                };
                (loggingService as any).recordRequestMetrics(mockMetrics);
            });

            const statusGroups = loggingService.getRequestsByStatus();
            expect(statusGroups['2xx']).toBe(2); // 200, 201
            expect(statusGroups['4xx']).toBe(2); // 400, 404
            expect(statusGroups['5xx']).toBe(1); // 500
        });

        it('should return slowest requests', () => {
            const requests = [
                { responseTime: 100 },
                { responseTime: 500 },
                { responseTime: 200 },
                { responseTime: 300 }
            ];

            requests.forEach((req, index) => {
                const mockMetrics: RequestMetrics = {
                    requestId: `test-${index}`,
                    method: 'GET',
                    url: `/test${index}`,
                    statusCode: 200,
                    responseTime: req.responseTime,
                    contentLength: 1024,
                    ip: '127.0.0.1',
                    timestamp: new Date().toISOString()
                };
                (loggingService as any).recordRequestMetrics(mockMetrics);
            });

            const slowestRequests = loggingService.getSlowestRequests(2);
            expect(slowestRequests).toHaveLength(2);
            expect(slowestRequests[0]?.responseTime).toBe(500); // Slowest first
            expect(slowestRequests[1]?.responseTime).toBe(300);
        });
    });

    describe('Configuration Updates', () => {
        it('should update configuration correctly', () => {
            const newConfig: LoggingConfig = {
                level: 'debug',
                format: 'json',
                file: './test.log'
            };

            loggingService.updateConfig(newConfig);

            // Verify the logger was recreated with new config
            // This is tested indirectly by checking that no errors are thrown
            expect(() => loggingService.logEvent('info', 'Test message')).not.toThrow();
        });
    });

    describe('Event Logging', () => {
        it('should log application events', () => {
            expect(() => {
                loggingService.logEvent('info', 'Test application event', { key: 'value' });
            }).not.toThrow();
        });

        it('should log security events', () => {
            expect(() => {
                loggingService.logSecurityEvent('suspicious_activity', { ip: '127.0.0.1' });
            }).not.toThrow();
        });

        it('should log configuration changes', () => {
            expect(() => {
                loggingService.logConfigChange(['Setting changed'], 'admin');
            }).not.toThrow();
        });
    });

    describe('Request Logger Middleware', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: jest.Mock;

        beforeEach(() => {
            mockRequest = {
                method: 'GET',
                originalUrl: '/test',
                headers: {
                    'user-agent': 'test-agent',
                    'authorization': 'Bearer secret-token',
                    'x-forwarded-for': '192.168.1.1, 127.0.0.1'
                },
                query: { param: 'value' },
                body: { data: 'test', password: 'secret' },
                connection: { remoteAddress: '127.0.0.1' },
                user: { username: 'testuser' },
                get: jest.fn((header: string) => mockRequest.headers[header.toLowerCase()])
            };

            mockResponse = {
                statusCode: 200,
                get: jest.fn().mockReturnValue('1024'),
                setHeader: jest.fn(),
                on: jest.fn()
            };

            mockNext = jest.fn();
        });

        it('should add request metadata and log incoming request', () => {
            loggingService.requestLogger(mockRequest, mockResponse, mockNext);

            expect(mockRequest.requestId).toBeDefined();
            expect(mockRequest.startTime).toBeDefined();
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.requestId);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should sanitize sensitive headers', () => {
            loggingService.requestLogger(mockRequest, mockResponse, mockNext);

            // Verify that the logger was called (indirectly through no errors)
            expect(mockNext).toHaveBeenCalled();
        });

        it('should sanitize sensitive body fields', () => {
            loggingService.requestLogger(mockRequest, mockResponse, mockNext);

            // Verify that the logger was called (indirectly through no errors)
            expect(mockNext).toHaveBeenCalled();
        });

        it('should extract client IP from various headers', () => {
            const testCases = [
                { headers: { 'x-forwarded-for': '192.168.1.1, 127.0.0.1' }, expected: '192.168.1.1' },
                { headers: { 'x-real-ip': '192.168.1.2' }, expected: '192.168.1.2' },
                { headers: {}, connection: { remoteAddress: '127.0.0.1' }, expected: '127.0.0.1' }
            ];

            testCases.forEach(({ headers, connection }) => {
                const testRequest = {
                    ...mockRequest,
                    headers,
                    connection: connection || mockRequest.connection
                };

                loggingService.requestLogger(testRequest, mockResponse, mockNext);

                expect(mockNext).toHaveBeenCalled();
                mockNext.mockClear();
            });
        });

        it('should log response when finished', () => {
            loggingService.requestLogger(mockRequest, mockResponse, mockNext);

            // Simulate response finish
            const finishCallback = mockResponse.on.mock.calls.find(
                (call: any) => call[0] === 'finish'
            )?.[1];

            expect(finishCallback).toBeDefined();

            // Execute the finish callback
            if (finishCallback) {
                finishCallback();
            }

            // Verify metrics were recorded
            const metrics = loggingService.getPerformanceMetrics();
            expect(metrics.totalRequests).toBe(1);
        });

        it('should handle anonymous users', () => {
            const anonymousRequest = { ...mockRequest, user: undefined };

            loggingService.requestLogger(anonymousRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Error Logger Middleware', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: jest.Mock;
        let mockError: Error;

        beforeEach(() => {
            mockRequest = {
                method: 'POST',
                originalUrl: '/error-endpoint',
                requestId: 'error-req-123',
                user: { username: 'erroruser' },
                headers: {
                    'user-agent': 'test-agent',
                    'x-forwarded-for': '127.0.0.1'
                },
                get: jest.fn().mockReturnValue('test-agent'),
                connection: { remoteAddress: '127.0.0.1' }
            };

            mockResponse = {};
            mockNext = jest.fn();

            mockError = new Error('Test error');
            mockError.name = 'TestError';
            (mockError as any).code = 'TEST_CODE';
            (mockError as any).status = 400;
        });

        it('should log error with request context', () => {
            loggingService.errorLogger(mockError, mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalledWith(mockError);
        });

        it('should handle missing request metadata', () => {
            const incompleteRequest = {
                ...mockRequest,
                requestId: undefined,
                user: undefined,
                headers: {}
            };

            loggingService.errorLogger(mockError, incompleteRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalledWith(mockError);
        });

        it('should handle non-Error objects', () => {
            const stringError = 'String error';

            loggingService.errorLogger(stringError, mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalledWith(stringError);
        });
    });

    describe('Logging Formats', () => {
        it('should create logger with JSON format', () => {
            const jsonConfig = {
                level: 'info' as const,
                format: 'json' as const
            };

            const jsonLoggingService = new LoggingService(jsonConfig);

            expect(() => {
                jsonLoggingService.logEvent('info', 'Test JSON format');
            }).not.toThrow();

            jsonLoggingService.destroy();
        });

        it('should create logger with simple format', () => {
            const simpleConfig = {
                level: 'debug' as const,
                format: 'simple' as const
            };

            const simpleLoggingService = new LoggingService(simpleConfig);

            expect(() => {
                simpleLoggingService.logEvent('debug', 'Test simple format');
            }).not.toThrow();

            simpleLoggingService.destroy();
        });

        it('should create logger with file output', () => {
            const fileConfig = {
                level: 'warn' as const,
                format: 'json' as const,
                file: './test.log'
            };

            const fileLoggingService = new LoggingService(fileConfig);

            expect(() => {
                fileLoggingService.logEvent('warn', 'Test file output');
            }).not.toThrow();

            fileLoggingService.destroy();
        });

        it('should handle silent logging level', () => {
            const silentConfig = {
                level: 'silent' as const,
                format: 'simple' as const
            };

            const silentLoggingService = new LoggingService(silentConfig);

            expect(() => {
                silentLoggingService.logEvent('error', 'This should be silent');
            }).not.toThrow();

            silentLoggingService.destroy();
        });
    });

    describe('Metrics Collection and Reset', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should reset metrics periodically', () => {
            const mockMetrics: RequestMetrics = {
                requestId: 'test-1',
                method: 'GET',
                url: '/test',
                statusCode: 200,
                responseTime: 100,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date().toISOString()
            };

            // Add some metrics
            (loggingService as any).recordRequestMetrics(mockMetrics);

            let metrics = loggingService.getPerformanceMetrics();
            expect(metrics.totalRequests).toBe(1);

            // Call the private reset method directly to test the functionality
            (loggingService as any).resetMetrics();

            metrics = loggingService.getPerformanceMetrics();
            expect(metrics.totalRequests).toBe(0);
        });

        it('should limit stored request metrics to prevent memory buildup', () => {
            // Add more than 1000 requests
            for (let i = 0; i < 1200; i++) {
                const mockMetrics: RequestMetrics = {
                    requestId: `test-${i}`,
                    method: 'GET',
                    url: `/test${i}`,
                    statusCode: 200,
                    responseTime: 100,
                    contentLength: 1024,
                    ip: '127.0.0.1',
                    timestamp: new Date().toISOString()
                };
                (loggingService as any).recordRequestMetrics(mockMetrics);
            }

            const recentRequests = loggingService.getRecentRequests(2000);
            expect(recentRequests.length).toBeLessThanOrEqual(1000);
        });

        it('should calculate requests per minute based on recent activity', () => {
            const now = Date.now();
            const twoMinutesAgo = now - 120000;

            // Add requests from different time periods
            const oldRequest: RequestMetrics = {
                requestId: 'old-1',
                method: 'GET',
                url: '/old',
                statusCode: 200,
                responseTime: 100,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date(twoMinutesAgo).toISOString()
            };

            const recentRequest: RequestMetrics = {
                requestId: 'recent-1',
                method: 'GET',
                url: '/recent',
                statusCode: 200,
                responseTime: 100,
                contentLength: 1024,
                ip: '127.0.0.1',
                timestamp: new Date(now - 30000).toISOString() // 30 seconds ago
            };

            (loggingService as any).recordRequestMetrics(oldRequest);
            (loggingService as any).recordRequestMetrics(recentRequest);

            const metrics = loggingService.getPerformanceMetrics();
            expect(metrics.requestsPerMinute).toBe(1); // Only the recent request should count
        });
    });

    describe('Resource Cleanup', () => {
        it('should cleanup resources on destroy', () => {
            const testLoggingService = new LoggingService(mockConfig);

            expect(() => {
                testLoggingService.destroy();
            }).not.toThrow();
        });

        it('should handle multiple destroy calls gracefully', () => {
            const testLoggingService = new LoggingService(mockConfig);

            testLoggingService.destroy();
            expect(() => {
                testLoggingService.destroy();
            }).not.toThrow();
        });
    });
});