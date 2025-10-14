/**
 * Tests for AdminHandler - admin endpoints and monitoring functionality
 */

import { Response, NextFunction } from 'express';
import { AdminHandler } from '../AdminHandler';
import { ConfigManager } from '../../config/ConfigManager';
import { LoggingService } from '../../services/LoggingService';
import { AppConfig, DEFAULT_CONFIG } from '../../types/config';
import { AuthenticatedRequest } from '../../types/middleware';

// Mock dependencies
jest.mock('../../config/ConfigManager');
jest.mock('../../services/LoggingService');

describe('AdminHandler', () => {
    let adminHandler: AdminHandler;
    let mockConfigManager: jest.Mocked<ConfigManager>;
    let mockLoggingService: jest.Mocked<LoggingService>;
    let mockConfig: AppConfig;
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        // Create mock config
        mockConfig = {
            ...DEFAULT_CONFIG,
            server: {
                ...DEFAULT_CONFIG.server,
                adminEnabled: true,
                environment: 'development'
            },
            security: {
                ...DEFAULT_CONFIG.security,
                authentication: {
                    enabled: true,
                    type: 'jwt',
                    jwtSecret: 'test-secret'
                }
            }
        };

        // Create mock ConfigManager
        mockConfigManager = {
            getConfig: jest.fn().mockReturnValue(mockConfig),
            reloadConfig: jest.fn().mockResolvedValue(undefined),
            validateConfig: jest.fn().mockReturnValue({ valid: true }),
            loadConfig: jest.fn().mockResolvedValue(mockConfig),
            enableHotReload: jest.fn(),
            disableHotReload: jest.fn(),
            onConfigReload: jest.fn(),
            offConfigReload: jest.fn(),
            createExampleConfigs: jest.fn().mockResolvedValue(undefined)
        } as any;

        // Create mock LoggingService
        mockLoggingService = {
            getPerformanceMetrics: jest.fn().mockReturnValue({
                totalRequests: 100,
                successfulRequests: 95,
                failedRequests: 5,
                averageResponseTime: 150,
                requestsPerMinute: 10,
                errorRate: 5.0
            }),
            getRequestsByStatus: jest.fn().mockReturnValue({
                '2xx': 95,
                '4xx': 3,
                '5xx': 2
            }),
            getSlowestRequests: jest.fn().mockReturnValue([
                {
                    requestId: 'req-1',
                    method: 'GET',
                    url: '/slow-endpoint',
                    statusCode: 200,
                    responseTime: 500,
                    contentLength: 1024,
                    ip: '127.0.0.1',
                    timestamp: '2023-01-01T00:00:00.000Z'
                }
            ]),
            requestLogger: jest.fn(),
            errorLogger: jest.fn(),
            logEvent: jest.fn(),
            logSecurityEvent: jest.fn(),
            logConfigChange: jest.fn(),
            updateConfig: jest.fn(),
            getRecentRequests: jest.fn(),
            destroy: jest.fn()
        } as any;

        // Create AdminHandler instance
        adminHandler = new AdminHandler(mockConfigManager, mockConfig, mockLoggingService);

        // Create mock request and response
        mockRequest = {
            requestId: 'test-request-123',
            user: {
                id: 'user-1',
                username: 'admin',
                email: 'admin@test.com',
                roles: ['admin']
            }
        };

        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn()
        };

        mockNext = jest.fn();

        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('getConfig', () => {
        it('should return sanitized configuration with success response', () => {
            adminHandler.getConfig(mockRequest as AuthenticatedRequest, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    server: mockConfig.server,
                    security: expect.objectContaining({
                        authentication: expect.objectContaining({
                            enabled: true,
                            type: 'jwt',
                            jwtSecret: '[HIDDEN]'
                        })
                    })
                }),
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                    requestId: 'test-request-123',
                    user: 'admin'
                })
            });
        });

        it('should hide sensitive data in configuration', () => {
            const configWithSecrets = {
                ...mockConfig,
                security: {
                    ...mockConfig.security,
                    authentication: {
                        enabled: true,
                        type: 'basic' as const,
                        basicCredentials: {
                            username: 'secret-user',
                            password: 'secret-pass'
                        }
                    }
                },
                proxy: {
                    ...mockConfig.proxy,
                    routes: {
                        'api1': {
                            name: 'api1',
                            targetUrl: 'https://api.example.com',
                            auth: {
                                type: 'bearer' as const,
                                token: 'secret-token'
                            }
                        }
                    }
                }
            };

            adminHandler.updateConfig(configWithSecrets);
            adminHandler.getConfig(mockRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.security.authentication.basicCredentials).toEqual({
                username: '[HIDDEN]',
                password: '[HIDDEN]'
            });
            expect(responseCall.data.proxy.routes.api1.auth.token).toBe('[HIDDEN]');
        });

        it('should handle anonymous user', () => {
            const anonymousRequest = { ...mockRequest };
            delete anonymousRequest.user;

            adminHandler.getConfig(anonymousRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.meta.user).toBe('anonymous');
        });

        it('should handle errors gracefully', () => {
            // Force an error by making the config getter throw
            jest.spyOn(adminHandler as any, 'sanitizeConfig').mockImplementation(() => {
                throw new Error('Config error');
            });

            adminHandler.getConfig(mockRequest as AuthenticatedRequest, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'CONFIG_READ_ERROR',
                    message: 'Failed to read configuration',
                    timestamp: expect.any(String),
                    requestId: 'test-request-123'
                }
            });
        });
    });

    describe('reloadConfig', () => {
        it('should reload configuration successfully', async () => {
            const updatedConfig = { ...mockConfig, server: { ...mockConfig.server, port: 4000 } };
            mockConfigManager.getConfig.mockReturnValue(updatedConfig);

            await adminHandler.reloadConfig(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockConfigManager.reloadConfig).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Configuration reloaded successfully',
                data: {
                    changes: expect.arrayContaining([
                        expect.stringContaining('Server port changed: 3000 → 4000')
                    ]),
                    reloadedAt: expect.any(String)
                },
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                    requestId: 'test-request-123',
                    user: 'admin'
                })
            });
        });

        it('should detect no changes when configuration is identical', async () => {
            await adminHandler.reloadConfig(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response,
                mockNext
            );

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.changes).toBe('No changes detected');
        });

        it('should detect multiple configuration changes', async () => {
            const updatedConfig = {
                ...mockConfig,
                server: { ...mockConfig.server, port: 4000, adminEnabled: false },
                security: {
                    ...mockConfig.security,
                    authentication: { ...mockConfig.security.authentication, enabled: false }
                }
            };
            mockConfigManager.getConfig.mockReturnValue(updatedConfig);

            await adminHandler.reloadConfig(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response,
                mockNext
            );

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.changes).toEqual(
                expect.arrayContaining([
                    'Server port changed: 3000 → 4000',
                    'Admin enabled changed: true → false',
                    'Authentication enabled changed: true → false'
                ])
            );
        });

        it('should handle reload errors gracefully', async () => {
            const reloadError = new Error('Failed to reload config file');
            mockConfigManager.reloadConfig.mockRejectedValue(reloadError);

            await adminHandler.reloadConfig(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'CONFIG_RELOAD_ERROR',
                    message: 'Failed to reload configuration',
                    details: 'Failed to reload config file',
                    timestamp: expect.any(String),
                    requestId: 'test-request-123',
                    suggestions: [
                        'Check configuration file syntax',
                        'Verify file permissions',
                        'Review server logs for detailed error information'
                    ]
                }
            });

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Configuration reload failed:'),
                expect.objectContaining({
                    error: 'Failed to reload config file',
                    requestId: 'test-request-123',
                    user: 'admin'
                })
            );
        });

        it('should log configuration reload activity', async () => {
            await adminHandler.reloadConfig(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response,
                mockNext
            );

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Configuration reloaded by admin'),
                expect.objectContaining({
                    requestId: 'test-request-123',
                    changes: 'No changes detected'
                })
            );
        });
    });

    describe('getHealthStatus', () => {
        beforeEach(() => {
            // Mock process methods
            jest.spyOn(process, 'memoryUsage').mockReturnValue({
                rss: 50 * 1024 * 1024, // 50MB
                heapTotal: 30 * 1024 * 1024, // 30MB
                heapUsed: 20 * 1024 * 1024, // 20MB
                external: 5 * 1024 * 1024, // 5MB
                arrayBuffers: 2 * 1024 * 1024 // 2MB
            });

            jest.spyOn(process, 'uptime').mockReturnValue(3661); // 1 hour, 1 minute, 1 second
            jest.spyOn(process, 'cpuUsage').mockReturnValue({
                user: 100000, // 100ms
                system: 50000 // 50ms
            });

            Object.defineProperty(process, 'version', { value: 'v18.0.0' });
            Object.defineProperty(process, 'platform', { value: 'linux' });
            Object.defineProperty(process, 'arch', { value: 'x64' });
            Object.defineProperty(process, 'pid', { value: 12345 });
            Object.defineProperty(process, 'ppid', { value: 1234 });
        });

        it('should return comprehensive health status', () => {
            adminHandler.getHealthStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    status: 'healthy',
                    message: 'All systems operational',
                    uptime: {
                        seconds: 3661,
                        formatted: '1h 1m 1s'
                    },
                    memory: {
                        rss: 50,
                        heapTotal: 30,
                        heapUsed: 20,
                        external: 5,
                        arrayBuffers: 2,
                        unit: 'MB'
                    },
                    cpu: {
                        user: 100,
                        system: 50
                    },
                    system: {
                        nodeVersion: 'v18.0.0',
                        platform: 'linux',
                        architecture: 'x64',
                        pid: 12345,
                        ppid: 1234
                    },
                    configuration: {
                        environment: 'development',
                        adminEnabled: true,
                        authEnabled: true,
                        authType: 'jwt',
                        proxyEnabled: true,
                        mockDataEnabled: false,
                        corsOrigins: 1,
                        rateLimitEnabled: true
                    },
                    timestamp: expect.any(String)
                },
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                    requestId: 'test-request-123',
                    user: 'admin'
                })
            });
        });

        it('should detect high memory usage warning', () => {
            // Mock high memory usage (95% heap used)
            jest.spyOn(process, 'memoryUsage').mockReturnValue({
                rss: 100 * 1024 * 1024,
                heapTotal: 100 * 1024 * 1024,
                heapUsed: 95 * 1024 * 1024, // 95% usage
                external: 5 * 1024 * 1024,
                arrayBuffers: 2 * 1024 * 1024
            });

            adminHandler.getHealthStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.status).toBe('warning');
            expect(responseCall.data.message).toBe('High memory usage detected');
        });

        it('should detect recently started server', () => {
            jest.spyOn(process, 'uptime').mockReturnValue(30); // 30 seconds

            adminHandler.getHealthStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.status).toBe('starting');
            expect(responseCall.data.message).toBe('Server recently started');
        });

        it('should format uptime correctly', () => {
            // Test various uptime formats
            const testCases = [
                { uptime: 30, expected: '30s' },
                { uptime: 90, expected: '1m 30s' },
                { uptime: 3661, expected: '1h 1m 1s' },
                { uptime: 90061, expected: '1d 1h 1m 1s' }
            ];

            testCases.forEach(({ uptime, expected }) => {
                jest.spyOn(process, 'uptime').mockReturnValue(uptime);

                adminHandler.getHealthStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

                const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
                expect(responseCall.data.uptime.formatted).toBe(expected);

                jest.clearAllMocks();
            });
        });

        it('should handle health check errors gracefully', () => {
            jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
                throw new Error('Memory access error');
            });

            adminHandler.getHealthStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'HEALTH_CHECK_ERROR',
                    message: 'Failed to retrieve health status',
                    timestamp: expect.any(String),
                    requestId: 'test-request-123'
                }
            });

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Health check failed:'),
                expect.objectContaining({
                    error: 'Memory access error',
                    requestId: 'test-request-123'
                })
            );
        });
    });

    describe('getServerStats', () => {
        beforeEach(() => {
            process.env['SERVER_START_TIME'] = '2023-01-01T00:00:00.000Z';
            process.env['npm_package_version'] = '1.2.3';
            jest.spyOn(process, 'uptime').mockReturnValue(3600); // 1 hour
        });

        it('should return comprehensive server statistics', () => {
            adminHandler.getServerStats(mockRequest as AuthenticatedRequest, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    server: {
                        startTime: '2023-01-01T00:00:00.000Z',
                        uptime: 3600,
                        environment: 'development',
                        version: '1.2.3'
                    },
                    requests: {
                        total: 100,
                        successful: 95,
                        failed: 5,
                        averageResponseTime: 150,
                        requestsPerMinute: 10,
                        errorRate: 5.0
                    },
                    requestsByStatus: {
                        '2xx': 95,
                        '4xx': 3,
                        '5xx': 2
                    },
                    slowestRequests: [
                        {
                            requestId: 'req-1',
                            method: 'GET',
                            url: '/slow-endpoint',
                            statusCode: 200,
                            responseTime: 500,
                            contentLength: 1024,
                            ip: '127.0.0.1',
                            timestamp: '2023-01-01T00:00:00.000Z'
                        }
                    ],
                    endpoints: {
                        mock: 0,
                        proxy: 0,
                        admin: 4
                    },
                    security: {
                        authEnabled: true,
                        corsOriginsCount: 1,
                        rateLimitWindow: 900000,
                        rateLimitMax: 100
                    }
                },
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                    requestId: 'test-request-123',
                    user: 'admin'
                })
            });

            expect(mockLoggingService.getPerformanceMetrics).toHaveBeenCalled();
            expect(mockLoggingService.getRequestsByStatus).toHaveBeenCalled();
            expect(mockLoggingService.getSlowestRequests).toHaveBeenCalledWith(5);
        });

        it('should handle missing logging service gracefully', () => {
            const adminHandlerWithoutLogging = new AdminHandler(mockConfigManager, mockConfig);

            adminHandlerWithoutLogging.getServerStats(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.requests).toEqual({
                total: 0,
                successful: 0,
                failed: 0,
                averageResponseTime: 0,
                requestsPerMinute: 0,
                errorRate: 0
            });
            expect(responseCall.data.requestsByStatus).toEqual({});
            expect(responseCall.data.slowestRequests).toEqual([]);
        });

        it('should handle missing environment variables', () => {
            delete process.env['SERVER_START_TIME'];
            delete process.env['npm_package_version'];

            adminHandler.getServerStats(mockRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.server.startTime).toBe('unknown');
            expect(responseCall.data.server.version).toBe('1.0.0');
        });

        it('should handle stats retrieval errors gracefully', () => {
            mockLoggingService.getPerformanceMetrics.mockImplementation(() => {
                throw new Error('Stats error');
            });

            adminHandler.getServerStats(mockRequest as AuthenticatedRequest, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'STATS_ERROR',
                    message: 'Failed to retrieve server statistics',
                    timestamp: expect.any(String),
                    requestId: 'test-request-123'
                }
            });
        });
    });

    describe('updateConfig', () => {
        it('should update configuration reference', () => {
            const newConfig = { ...mockConfig, server: { ...mockConfig.server, port: 4000 } };

            adminHandler.updateConfig(newConfig);

            // Verify the config is updated by checking getConfig response
            adminHandler.getConfig(mockRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.server.port).toBe(4000);
        });
    });

    describe('updateLoggingService', () => {
        it('should update logging service reference', () => {
            const newLoggingService = {
                ...mockLoggingService,
                getPerformanceMetrics: jest.fn().mockReturnValue({
                    totalRequests: 200,
                    successfulRequests: 190,
                    failedRequests: 10,
                    averageResponseTime: 120,
                    requestsPerMinute: 15,
                    errorRate: 5.0
                })
            } as any;

            adminHandler.updateLoggingService(newLoggingService);

            adminHandler.getServerStats(mockRequest as AuthenticatedRequest, mockResponse as Response);

            const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.data.requests.total).toBe(200);
            expect(newLoggingService.getPerformanceMetrics).toHaveBeenCalled();
        });
    });

    describe('Authentication Integration', () => {
        it('should work with different user types', () => {
            const testUsers = [
                { id: '1', username: 'admin', roles: ['admin'] },
                { id: '2', username: 'user', email: 'user@test.com' },
                undefined // anonymous user
            ];

            testUsers.forEach((user, index) => {
                const request = { ...mockRequest, user };

                adminHandler.getConfig(request as AuthenticatedRequest, mockResponse as Response);

                const responseCall = (mockResponse.json as jest.Mock).mock.calls[index][0];
                expect(responseCall.meta.user).toBe(user?.username || 'anonymous');
            });
        });
    });
});