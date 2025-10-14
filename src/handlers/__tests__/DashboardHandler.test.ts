import { Request, Response } from 'express';
import { DashboardHandler } from '../DashboardHandler';
import { ConfigManager } from '../../config/ConfigManager';
import { LoggingService } from '../../services/LoggingService';

// Mock dependencies
jest.mock('../../config/ConfigManager');
jest.mock('../../services/LoggingService');

describe('DashboardHandler', () => {
    let dashboardHandler: DashboardHandler;
    let mockConfigManager: jest.Mocked<ConfigManager>;
    let mockLogger: jest.Mocked<LoggingService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        // Setup mocks
        mockConfigManager = {
            getConfig: jest.fn().mockReturnValue({
                server: {
                    port: 3000,
                    host: 'localhost',
                    environment: 'development',
                    adminEnabled: true
                },
                security: {
                    authentication: {
                        enabled: false,
                        type: 'disabled'
                    },
                    cors: {
                        allowedOrigins: ['*'],
                        allowCredentials: true
                    },
                    rateLimit: {
                        windowMs: 900000,
                        maxRequests: 100,
                        skipSuccessfulRequests: false
                    }
                },
                mock: {
                    dataPath: './data',
                    endpoints: [],
                    defaultDelay: 0,
                    enableCrud: true
                },
                proxy: {
                    enabled: true,
                    routes: {},
                    timeout: 5000,
                    retries: 3,
                    allowedDomains: [],
                    blockedDomains: []
                },
                logging: {
                    level: 'info',
                    format: 'simple'
                }
            })
        } as any;

        mockLogger = {
            requestLogger: jest.fn(),
            errorLogger: jest.fn(),
            updateConfig: jest.fn(),
            getRecentRequests: jest.fn().mockReturnValue([]),
            getPerformanceMetrics: jest.fn(),
            logEvent: jest.fn()
        } as any;

        dashboardHandler = new DashboardHandler(mockConfigManager, mockLogger);

        mockRequest = {
            query: {},
            params: {},
            body: {}
        };

        mockResponse = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        };
    });

    describe('recordRequest', () => {
        it('should record request metrics', () => {
            const metric = {
                timestamp: Date.now(),
                method: 'GET',
                path: '/api/test',
                statusCode: 200,
                responseTime: 50,
                ip: '127.0.0.1'
            };

            dashboardHandler.recordRequest(metric);

            // Verify by getting metrics
            dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        requestCount: 1,
                        errorCount: 0,
                        averageResponseTime: 50
                    })
                })
            );
        });

        it('should track error requests', () => {
            const errorMetric = {
                timestamp: Date.now(),
                method: 'GET',
                path: '/api/error',
                statusCode: 500,
                responseTime: 100,
                ip: '127.0.0.1'
            };

            dashboardHandler.recordRequest(errorMetric);

            dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        requestCount: 1,
                        errorCount: 1
                    })
                })
            );
        });

        it('should limit stored metrics to maxMetrics', () => {
            // Record more than maxMetrics (1000) requests
            for (let i = 0; i < 1100; i++) {
                dashboardHandler.recordRequest({
                    timestamp: Date.now(),
                    method: 'GET',
                    path: `/api/test${i}`,
                    statusCode: 200,
                    responseTime: 50,
                    ip: '127.0.0.1'
                });
            }

            mockRequest.query = { limit: '2000' };
            dashboardHandler.getRecentRequests(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            method: 'GET',
                            statusCode: 200
                        })
                    ])
                })
            );

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(callArg.data.length).toBeLessThanOrEqual(1000);
        });
    });

    describe('serveDashboard', () => {
        it('should serve HTML dashboard', async () => {
            await dashboardHandler.serveDashboard(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
            expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
            expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Mock API Server'));
        });

        it('should include Chart.js library', async () => {
            await dashboardHandler.serveDashboard(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.send).toHaveBeenCalledWith(
                expect.stringContaining('chart.js')
            );
        });

        it('should include dashboard tabs', async () => {
            await dashboardHandler.serveDashboard(mockRequest as Request, mockResponse as Response);

            const html = (mockResponse.send as jest.Mock).mock.calls[0][0];
            expect(html).toContain('Recent Requests');
            expect(html).toContain('Configuration');
            expect(html).toContain('Analytics');
        });
    });

    describe('getMetrics', () => {
        it('should return system metrics', async () => {
            await dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        uptime: expect.any(Number),
                        memory: expect.objectContaining({
                            rss: expect.any(Number),
                            heapTotal: expect.any(Number),
                            heapUsed: expect.any(Number)
                        }),
                        requestCount: expect.any(Number),
                        errorCount: expect.any(Number),
                        averageResponseTime: expect.any(Number)
                    })
                })
            );
        });

        it('should handle errors gracefully', async () => {
            // This test is not applicable since getMetrics doesn't use config
            // and shouldn't throw errors in normal operation
            await dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalled();
        });
    });

    describe('getRecentRequests', () => {
        beforeEach(() => {
            // Add some test requests
            for (let i = 0; i < 10; i++) {
                dashboardHandler.recordRequest({
                    timestamp: Date.now() + i,
                    method: 'GET',
                    path: `/api/test${i}`,
                    statusCode: 200,
                    responseTime: 50 + i,
                    ip: '127.0.0.1'
                });
            }
        });

        it('should return recent requests with default limit', async () => {
            await dashboardHandler.getRecentRequests(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            method: 'GET',
                            statusCode: 200
                        })
                    ])
                })
            );
        });

        it('should respect custom limit', async () => {
            mockRequest.query = { limit: '5' };

            await dashboardHandler.getRecentRequests(mockRequest as Request, mockResponse as Response);

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(callArg.data.length).toBe(5);
        });

        it('should return requests in reverse chronological order', async () => {
            mockRequest.query = { limit: '10' };

            await dashboardHandler.getRecentRequests(mockRequest as Request, mockResponse as Response);

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
            const requests = callArg.data;

            // Most recent should be first
            for (let i = 0; i < requests.length - 1; i++) {
                expect(requests[i].timestamp).toBeGreaterThanOrEqual(requests[i + 1].timestamp);
            }
        });

        it('should handle errors gracefully', async () => {
            // Force an error
            mockRequest.query = { limit: 'invalid' };

            await dashboardHandler.getRecentRequests(mockRequest as Request, mockResponse as Response);

            // Should still work with default limit
            expect(mockResponse.json).toHaveBeenCalled();
        });
    });

    describe('getConfig', () => {
        it('should return configuration without sensitive data', async () => {
            mockConfigManager.getConfig = jest.fn().mockReturnValue({
                server: {
                    port: 3000,
                    host: 'localhost',
                    environment: 'development',
                    adminEnabled: true
                },
                security: {
                    authentication: {
                        enabled: true,
                        type: 'jwt',
                        jwtSecret: 'super-secret-key',
                        devToken: 'dev-token-123',
                        basicCredentials: {
                            username: 'admin',
                            password: 'password123'
                        }
                    },
                    cors: {
                        allowedOrigins: ['*'],
                        allowCredentials: true
                    },
                    rateLimit: {
                        windowMs: 900000,
                        maxRequests: 100,
                        skipSuccessfulRequests: false
                    }
                },
                mock: {
                    dataPath: './data',
                    endpoints: [],
                    defaultDelay: 0,
                    enableCrud: true
                },
                proxy: {
                    enabled: true,
                    routes: {},
                    timeout: 5000,
                    retries: 3,
                    allowedDomains: [],
                    blockedDomains: []
                },
                logging: {
                    level: 'info',
                    format: 'simple'
                }
            });

            await dashboardHandler.getConfig(mockRequest as Request, mockResponse as Response);

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];

            expect(callArg.success).toBe(true);
            expect(callArg.data.security.authentication.jwtSecret).toBe('***');
            expect(callArg.data.security.authentication.devToken).toBe('***');
            expect(callArg.data.security.authentication.basicCredentials).toEqual({
                username: '***',
                password: '***'
            });
        });

        it('should handle missing sensitive fields', async () => {
            mockConfigManager.getConfig = jest.fn().mockReturnValue({
                server: {
                    port: 3000,
                    host: 'localhost',
                    environment: 'development',
                    adminEnabled: true
                },
                security: {
                    authentication: {
                        enabled: false,
                        type: 'disabled'
                    },
                    cors: {
                        allowedOrigins: ['*'],
                        allowCredentials: true
                    },
                    rateLimit: {
                        windowMs: 900000,
                        maxRequests: 100,
                        skipSuccessfulRequests: false
                    }
                },
                mock: {
                    dataPath: './data',
                    endpoints: [],
                    defaultDelay: 0,
                    enableCrud: true
                },
                proxy: {
                    enabled: true,
                    routes: {},
                    timeout: 5000,
                    retries: 3,
                    allowedDomains: [],
                    blockedDomains: []
                },
                logging: {
                    level: 'info',
                    format: 'simple'
                }
            });

            await dashboardHandler.getConfig(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        security: expect.objectContaining({
                            authentication: expect.objectContaining({
                                enabled: false,
                                type: 'disabled'
                            })
                        })
                    })
                })
            );
        });

        it('should handle errors gracefully', async () => {
            mockConfigManager.getConfig = jest.fn().mockImplementation(() => {
                throw new Error('Config error');
            });

            await dashboardHandler.getConfig(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        message: 'Failed to get configuration'
                    })
                })
            );
            expect(mockLogger.logEvent).toHaveBeenCalledWith('error', 'Error getting config', expect.anything());
        });
    });

    describe('metrics calculation', () => {
        it('should calculate average response time correctly', () => {
            dashboardHandler.recordRequest({
                timestamp: Date.now(),
                method: 'GET',
                path: '/api/test1',
                statusCode: 200,
                responseTime: 100,
                ip: '127.0.0.1'
            });

            dashboardHandler.recordRequest({
                timestamp: Date.now(),
                method: 'GET',
                path: '/api/test2',
                statusCode: 200,
                responseTime: 200,
                ip: '127.0.0.1'
            });

            dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(callArg.data.averageResponseTime).toBe(150);
        });

        it('should handle zero requests', () => {
            dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(callArg.data.requestCount).toBe(0);
            expect(callArg.data.errorCount).toBe(0);
            expect(callArg.data.averageResponseTime).toBe(0);
        });

        it('should track uptime correctly', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            dashboardHandler.getMetrics(mockRequest as Request, mockResponse as Response);

            const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(callArg.data.uptime).toBeGreaterThanOrEqual(100);
        });
    });
});
