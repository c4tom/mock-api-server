/**
 * Tests for SecurityMiddleware (Integration Tests)
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityMiddleware } from '../securityMiddleware';
import { SecurityConfig } from '../../types/config';
import { AuthenticatedRequest } from '../../types/middleware';

// Mock the individual middleware classes
jest.mock('../authMiddleware', () => ({
    AuthMiddleware: jest.fn().mockImplementation(() => ({
        authenticate: jest.fn((_req, _res, next) => next()),
        optionalAuth: jest.fn((_req, _res, next) => next()),
        requireAdmin: jest.fn((_req, _res, next) => next()),
        updateConfig: jest.fn(),
        getConfigInfo: jest.fn().mockReturnValue({ enabled: true, type: 'jwt' })
    }))
}));

jest.mock('../corsMiddleware', () => ({
    CorsMiddleware: jest.fn().mockImplementation(() => ({
        validateOrigin: jest.fn((_req, _res, next) => next()),
        handlePreflight: jest.fn((_req, _res, next) => next()),
        addCorsHeaders: jest.fn(),
        updateConfig: jest.fn(),
        getConfigInfo: jest.fn().mockReturnValue({ allowedOrigins: ['*'], allowCredentials: true })
    }))
}));

jest.mock('../rateLimitMiddleware', () => ({
    RateLimitMiddleware: jest.fn().mockImplementation(() => ({
        createRateLimiter: jest.fn(() => jest.fn((_req, _res, next) => next())),
        checkBlockedIPs: jest.fn((_req, _res, next) => next()),
        detectSuspiciousActivity: jest.fn().mockReturnValue({
            isSuspicious: false,
            riskLevel: 'low',
            reason: '',
            shouldBlock: false
        }),
        updateConfig: jest.fn(),
        getConfigInfo: jest.fn().mockReturnValue({ windowMs: 15000, maxRequests: 100, suspiciousIPs: 0, blockedIPs: 0 }),
        getSuspiciousActivityStats: jest.fn().mockReturnValue({ suspiciousIPs: [], blockedIPs: [] })
    }))
}));

describe('SecurityMiddleware', () => {
    let securityMiddleware: SecurityMiddleware;
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockSetHeader: jest.Mock;
    let mockOn: jest.Mock;

    const defaultSecurityConfig: SecurityConfig = {
        authentication: {
            enabled: true,
            type: 'jwt',
            jwtSecret: 'test-secret'
        },
        cors: {
            allowedOrigins: ['https://example.com'],
            allowCredentials: true
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            skipSuccessfulRequests: false
        }
    };

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockSetHeader = jest.fn();
        mockOn = jest.fn();

        mockReq = {
            headers: {},
            method: 'GET',
            path: '/api/test'
        } as any;

        mockRes = {
            status: mockStatus,
            json: mockJson,
            setHeader: mockSetHeader,
            on: mockOn,
            get: jest.fn().mockReturnValue('0')
        };

        mockNext = jest.fn();

        securityMiddleware = new SecurityMiddleware(defaultSecurityConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Security Chain Methods', () => {
        it('should return basic security chain', () => {
            const chain = securityMiddleware.securityChain();

            expect(Array.isArray(chain)).toBe(true);
            expect(chain).toHaveLength(4);
            expect(typeof chain[0]).toBe('function'); // handlePreflight
            expect(typeof chain[1]).toBe('function'); // validateOrigin
            expect(typeof chain[2]).toBe('function'); // checkBlockedIPs
            expect(typeof chain[3]).toBe('function'); // applyRateLimit
        });

        it('should return authenticated security chain', () => {
            const chain = securityMiddleware.authenticatedSecurityChain();

            expect(Array.isArray(chain)).toBe(true);
            expect(chain).toHaveLength(5);
            // Should include authentication middleware
        });

        it('should return admin security chain', () => {
            const chain = securityMiddleware.adminSecurityChain();

            expect(Array.isArray(chain)).toBe(true);
            expect(chain).toHaveLength(6);
            // Should include admin authentication middleware
        });
    });

    describe('Request Logging', () => {
        it('should log incoming requests', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 Test Browser'
            };

            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test'),
                expect.objectContaining({
                    ip: expect.any(String),
                    userAgent: 'Mozilla/5.0 Test Browser',
                    user: 'anonymous',
                    requestId: expect.any(String)
                })
            );

            expect(mockReq.startTime).toBeDefined();
            expect(mockReq.requestId).toBeDefined();
            expect(mockSetHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.requestId);
            expect(mockNext).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should log authenticated user requests', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockReq.user = {
                id: 'user123',
                username: 'testuser',
                roles: ['user']
            };

            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test'),
                expect.objectContaining({
                    user: 'testuser'
                })
            );

            consoleSpy.mockRestore();
        });

        it('should log suspicious activity', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Mock suspicious activity detection
            const mockDetectSuspicious = jest.fn().mockReturnValue({
                isSuspicious: true,
                riskLevel: 'high',
                reason: 'Bot-like User-Agent detected'
            });
            securityMiddleware.detectSuspiciousActivity = mockDetectSuspicious;

            mockReq.headers = {
                'user-agent': 'bot'
            };

            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test'),
                expect.objectContaining({
                    suspicious: {
                        level: 'high',
                        reason: 'Bot-like User-Agent detected'
                    }
                })
            );

            consoleSpy.mockRestore();
        });

        it('should log response when finished', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            // Simulate response finish event
            const finishCallback = mockOn.mock.calls.find(call => call[0] === 'finish')[1];
            finishCallback();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test'),
                expect.objectContaining({
                    duration: expect.stringContaining('ms'),
                    requestId: expect.any(String),
                    contentLength: '0'
                })
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        it('should handle validation errors', () => {
            const error = new Error('Validation failed');
            error.name = 'ValidationError';

            securityMiddleware.errorHandler(
                error,
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    timestamp: expect.any(String),
                    requestId: mockReq.requestId
                }
            });
        });

        it('should handle unauthorized errors', () => {
            const error = new Error('Unauthorized access');
            error.name = 'UnauthorizedError';

            securityMiddleware.errorHandler(
                error,
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    code: 'UNAUTHORIZED',
                    message: 'Unauthorized'
                })
            });
        });

        it('should handle forbidden errors', () => {
            const error = new Error('Access forbidden');
            error.name = 'ForbiddenError';

            securityMiddleware.errorHandler(
                error,
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    code: 'FORBIDDEN',
                    message: 'Forbidden'
                })
            });
        });

        it('should handle generic internal errors', () => {
            const error = new Error('Something went wrong');

            securityMiddleware.errorHandler(
                error,
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error'
                })
            });
        });

        it('should include error details in development mode', () => {
            const originalEnv = process.env['NODE_ENV'];
            process.env['NODE_ENV'] = 'development';

            const error = new Error('Development error');
            error.stack = 'Error stack trace';

            securityMiddleware.errorHandler(
                error,
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    details: 'Development error',
                    stack: 'Error stack trace'
                })
            });

            process.env['NODE_ENV'] = originalEnv;
        });

        it('should log errors with context', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const error = new Error('Test error');
            mockReq.user = {
                id: 'user123',
                username: 'testuser',
                roles: ['user']
            };

            securityMiddleware.errorHandler(
                error,
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error in GET /api/test'),
                expect.objectContaining({
                    error: 'Test error',
                    stack: expect.any(String),
                    requestId: mockReq.requestId,
                    user: 'testuser'
                })
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Configuration Management', () => {
        it('should update security configuration', () => {
            const newConfig: SecurityConfig = {
                authentication: {
                    enabled: false,
                    type: 'disabled'
                },
                cors: {
                    allowedOrigins: ['*'],
                    allowCredentials: false
                },
                rateLimit: {
                    windowMs: 30 * 60 * 1000,
                    maxRequests: 200,
                    skipSuccessfulRequests: true
                }
            };

            expect(() => {
                securityMiddleware.updateConfig(newConfig);
            }).not.toThrow();
        });

        it('should return configuration info', () => {
            const configInfo = securityMiddleware.getConfigInfo();

            expect(configInfo).toHaveProperty('authentication');
            expect(configInfo).toHaveProperty('cors');
            expect(configInfo).toHaveProperty('rateLimit');
        });

        it('should return security statistics', () => {
            const stats = securityMiddleware.getSecurityStats();

            expect(stats).toHaveProperty('suspiciousActivity');
            expect(stats).toHaveProperty('timestamp');
            expect(stats.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('Request ID Generation', () => {
        it('should generate unique request IDs', () => {
            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            const firstRequestId = mockReq.requestId;

            // Reset and generate another
            mockReq = { headers: {}, method: 'GET', path: '/api/test2' };
            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            const secondRequestId = mockReq.requestId;

            expect(firstRequestId).toBeDefined();
            expect(secondRequestId).toBeDefined();
            expect(firstRequestId).not.toBe(secondRequestId);
            expect(firstRequestId).toMatch(/^req_\d+_[a-z0-9]+$/);
        });
    });

    describe('Client IP Detection', () => {
        it('should detect IP from various headers', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockReq.headers = {
                'x-forwarded-for': '192.168.1.100, 10.0.0.1',
                'user-agent': 'Test Browser'
            };

            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    ip: expect.any(String)
                })
            );

            consoleSpy.mockRestore();
        });

        it('should handle missing IP information gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            delete mockReq.connection;
            delete mockReq.socket;
            mockReq.headers = {};

            securityMiddleware.requestLogger(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    ip: 'unknown'
                })
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Middleware Integration', () => {
        it('should delegate to auth middleware', async () => {
            // This tests that the security middleware properly delegates to its components
            await expect(
                securityMiddleware.authenticateRequest(
                    mockReq as AuthenticatedRequest,
                    mockRes as Response,
                    mockNext
                )
            ).resolves.not.toThrow();
        });

        it('should delegate to CORS middleware', () => {
            expect(() => {
                securityMiddleware.validateOrigin(
                    mockReq as Request,
                    mockRes as Response,
                    mockNext
                );
            }).not.toThrow();
        });

        it('should delegate to rate limit middleware', () => {
            expect(() => {
                securityMiddleware.applyRateLimit(
                    mockReq as Request,
                    mockRes as Response,
                    mockNext
                );
            }).not.toThrow();
        });

        it('should delegate suspicious activity detection', () => {
            const result = securityMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });
});