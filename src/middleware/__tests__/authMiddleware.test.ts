/**
 * Tests for AuthMiddleware
 */

import { Response, NextFunction } from 'express';

import { AuthMiddleware } from '../authMiddleware';
import { AuthenticatedRequest } from '../../types/middleware';
import { AuthenticationConfig } from '../../types/config';

// Mock the AuthService
const mockAuthService = {
    validateJWT: jest.fn(),
    validateBasicAuth: jest.fn(),
    validateDevToken: jest.fn(),
    checkBypass: jest.fn(),
    updateConfig: jest.fn(),
    getConfigInfo: jest.fn().mockReturnValue({ enabled: true, type: 'jwt' }),
    generateSampleJWT: jest.fn()
};

jest.mock('../../services/AuthService', () => {
    return {
        AuthService: jest.fn().mockImplementation(() => mockAuthService)
    };
});

describe('AuthMiddleware', () => {
    let authMiddleware: AuthMiddleware;
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    const defaultAuthConfig: AuthenticationConfig = {
        enabled: true,
        type: 'jwt',
        jwtSecret: 'test-secret',
        devToken: 'dev-12345',
        basicCredentials: {
            username: 'admin',
            password: 'password123'
        }
    };

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });

        mockReq = {
            headers: {}
        };

        mockRes = {
            status: mockStatus,
            json: mockJson
        };

        mockNext = jest.fn();

        authMiddleware = new AuthMiddleware(defaultAuthConfig);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('JWT Authentication', () => {
        beforeEach(() => {
            authMiddleware = new AuthMiddleware({
                ...defaultAuthConfig,
                type: 'jwt'
            });
        });

        it('should authenticate valid JWT token', async () => {
            mockAuthService.validateJWT.mockResolvedValue({
                valid: true,
                user: {
                    id: 'user123',
                    username: 'testuser',
                    roles: ['user']
                }
            });

            mockReq.headers = {
                authorization: 'Bearer valid-token'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toEqual({
                id: 'user123',
                username: 'testuser',
                roles: ['user']
            });
        });

        it('should reject invalid JWT token', async () => {
            mockAuthService.validateJWT.mockResolvedValue({
                valid: false,
                error: 'Invalid JWT token'
            });

            mockReq.headers = {
                authorization: 'Bearer invalid-token'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Invalid JWT token'
                })
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject expired JWT token', async () => {
            mockAuthService.validateJWT.mockResolvedValue({
                valid: false,
                error: 'JWT token has expired'
            });

            mockReq.headers = {
                authorization: 'Bearer expired-token'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'JWT token has expired'
                })
            });
        });

        it('should handle missing JWT secret', async () => {
            mockAuthService.validateJWT.mockResolvedValue({
                valid: false,
                error: 'JWT secret not configured'
            });

            mockReq.headers = {
                authorization: 'Bearer some-token'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'JWT secret not configured'
                })
            });
        });
    });

    describe('Basic Authentication', () => {
        beforeEach(() => {
            authMiddleware = new AuthMiddleware({
                ...defaultAuthConfig,
                type: 'basic'
            });
        });

        it('should authenticate valid Basic credentials', async () => {
            mockAuthService.validateBasicAuth.mockResolvedValue({
                valid: true,
                user: {
                    id: 'admin',
                    username: 'admin',
                    roles: ['user']
                }
            });

            mockReq.headers = {
                authorization: 'Basic YWRtaW46cGFzc3dvcmQxMjM='
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toEqual({
                id: 'admin',
                username: 'admin',
                roles: ['user']
            });
        });

        it('should reject invalid Basic credentials', async () => {
            mockAuthService.validateBasicAuth.mockResolvedValue({
                valid: false,
                error: 'Invalid username or password'
            });

            mockReq.headers = {
                authorization: 'Basic invalid-credentials'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'Invalid username or password'
                })
            });
        });

        it('should reject malformed Basic credentials', async () => {
            mockAuthService.validateBasicAuth.mockResolvedValue({
                valid: false,
                error: 'Failed to validate Basic authentication'
            });

            mockReq.headers = {
                authorization: 'Basic invalid-base64'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: expect.stringContaining('Failed to validate Basic authentication')
                })
            });
        });
    });

    describe('Dev Token Authentication', () => {
        beforeEach(() => {
            authMiddleware = new AuthMiddleware({
                ...defaultAuthConfig,
                type: 'dev-token'
            });
        });

        it('should authenticate valid dev token', async () => {
            mockAuthService.validateDevToken.mockReturnValue(true);

            mockReq.headers = {
                authorization: 'Bearer dev-12345'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toEqual({
                id: 'dev-user',
                username: 'developer',
                roles: ['user', 'admin']
            });
        });

        it('should reject invalid dev token', async () => {
            mockAuthService.validateDevToken.mockReturnValue(false);

            mockReq.headers = {
                authorization: 'Bearer wrong-token'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'Invalid development token'
                })
            });
        });
    });

    describe('Bypass Mode Authentication', () => {
        beforeEach(() => {
            authMiddleware = new AuthMiddleware({
                ...defaultAuthConfig,
                type: 'bypass'
            });
        });

        it('should authenticate with bypass header', async () => {
            mockAuthService.checkBypass.mockReturnValue(true);

            mockReq.headers = {
                'x-dev-bypass': 'true'
            };

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toEqual({
                id: 'bypass-user',
                username: 'bypass',
                roles: ['user']
            });
        });

        it('should reject request without bypass header', async () => {
            mockAuthService.checkBypass.mockReturnValue(false);

            mockReq.headers = {};

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'Missing Authorization header'
                })
            });
        });
    });

    describe('Disabled Authentication', () => {
        beforeEach(() => {
            authMiddleware = new AuthMiddleware({
                ...defaultAuthConfig,
                enabled: false
            });
        });

        it('should skip authentication when disabled', async () => {
            mockReq.headers = {};

            await authMiddleware.authenticate(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeUndefined();
        });
    });

    describe('Admin Authentication', () => {
        it('should allow admin user', () => {
            mockReq.user = {
                id: 'admin123',
                username: 'admin',
                roles: ['user', 'admin']
            };

            authMiddleware.requireAdmin(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject non-admin user', () => {
            mockReq.user = {
                id: 'user123',
                username: 'user',
                roles: ['user']
            };

            authMiddleware.requireAdmin(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    code: 'AUTHORIZATION_FAILED',
                    message: 'Admin access required'
                })
            });
        });

        it('should reject unauthenticated user', () => {
            delete mockReq.user;

            authMiddleware.requireAdmin(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'Authentication required'
                })
            });
        });
    });

    describe('Optional Authentication', () => {
        it('should set user when valid token provided', async () => {
            mockAuthService.validateJWT.mockResolvedValue({
                valid: true,
                user: {
                    id: 'user123',
                    username: 'testuser',
                    roles: ['user']
                }
            });

            mockReq.headers = {
                authorization: 'Bearer valid-token'
            };

            await authMiddleware.optionalAuth(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeDefined();
        });

        it('should continue without user when no token provided', async () => {
            mockReq.headers = {};

            await authMiddleware.optionalAuth(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeUndefined();
        });

        it('should continue without user when invalid token provided', async () => {
            mockAuthService.validateJWT.mockResolvedValue({
                valid: false,
                error: 'Invalid token'
            });

            mockReq.headers = {
                authorization: 'Bearer invalid-token'
            };

            await authMiddleware.optionalAuth(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeUndefined();
        });
    });

    describe('Configuration Updates', () => {
        it('should update configuration', () => {
            const newConfig: AuthenticationConfig = {
                enabled: false,
                type: 'disabled'
            };

            expect(() => {
                authMiddleware.updateConfig(newConfig);
            }).not.toThrow();
        });

        it('should return configuration info', () => {
            const configInfo = authMiddleware.getConfigInfo();

            expect(configInfo).toBeDefined();
            expect(typeof configInfo).toBe('object');
        });
    });
});