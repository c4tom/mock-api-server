/**
 * Tests for CorsMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { CorsMiddleware } from '../corsMiddleware';
import { CorsConfig } from '../../types/config';

describe('CorsMiddleware', () => {
    let corsMiddleware: CorsMiddleware;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockHeader: jest.Mock;
    let mockEnd: jest.Mock;

    const defaultCorsConfig: CorsConfig = {
        allowedOrigins: ['https://example.com', 'https://app.example.com'],
        allowCredentials: true
    };

    beforeEach(() => {
        mockJson = jest.fn();
        mockEnd = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson, end: mockEnd });
        mockHeader = jest.fn();

        mockReq = {
            headers: {},
            method: 'GET',
            path: '/api/test'
        };

        mockRes = {
            status: mockStatus,
            json: mockJson,
            header: mockHeader,
            end: mockEnd
        } as any;

        mockNext = jest.fn();

        corsMiddleware = new CorsMiddleware(defaultCorsConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Origin Validation', () => {
        it('should allow requests from allowed origins', () => {
            mockReq.headers = {
                origin: 'https://example.com'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should block requests from non-allowed origins', () => {
            mockReq.headers = {
                origin: 'https://malicious.com'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    code: 'CORS_ORIGIN_NOT_ALLOWED',
                    message: "Origin 'https://malicious.com' is not allowed"
                })
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow requests without origin (direct API calls)', () => {
            mockReq.headers = {};

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should extract origin from referer when origin is missing', () => {
            mockReq.headers = {
                referer: 'https://example.com/page'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle wildcard origins in development mode', () => {
            corsMiddleware = new CorsMiddleware({
                allowedOrigins: ['*'],
                allowCredentials: false
            });

            mockReq.headers = {
                origin: 'https://any-origin.com'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://any-origin.com');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should support wildcard pattern matching', () => {
            corsMiddleware = new CorsMiddleware({
                allowedOrigins: ['https://*.example.com'],
                allowCredentials: true
            });

            mockReq.headers = {
                origin: 'https://subdomain.example.com'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://subdomain.example.com');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject origins that do not match wildcard pattern', () => {
            corsMiddleware = new CorsMiddleware({
                allowedOrigins: ['https://*.example.com'],
                allowCredentials: true
            });

            mockReq.headers = {
                origin: 'https://malicious.com'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle invalid referer URLs gracefully', () => {
            mockReq.headers = {
                referer: 'invalid-url'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                error: expect.objectContaining({
                    message: 'Unable to determine request origin'
                })
            });
        });
    });

    describe('Preflight Handling', () => {
        beforeEach(() => {
            mockReq.method = 'OPTIONS';
        });

        it('should handle preflight requests for allowed origins', () => {
            mockReq.headers = {
                origin: 'https://example.com'
            };

            corsMiddleware.handlePreflight(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers',
                'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Dev-Bypass, X-API-Key');
            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
            expect(mockStatus).toHaveBeenCalledWith(204);
            expect(mockEnd).toHaveBeenCalled();
        });

        it('should handle preflight requests with wildcard origins', () => {
            corsMiddleware = new CorsMiddleware({
                allowedOrigins: ['*'],
                allowCredentials: false
            });

            mockReq.headers = {
                origin: 'https://any-origin.com'
            };

            corsMiddleware.handlePreflight(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://any-origin.com');
            expect(mockStatus).toHaveBeenCalledWith(204);
        });

        it('should handle preflight requests for non-allowed origins', () => {
            mockReq.headers = {
                origin: 'https://malicious.com'
            };

            corsMiddleware.handlePreflight(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
            expect(mockStatus).toHaveBeenCalledWith(204);
        });

        it('should pass through non-OPTIONS requests', () => {
            mockReq.method = 'GET';

            corsMiddleware.handlePreflight(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockStatus).not.toHaveBeenCalled();
        });
    });

    describe('CORS Headers', () => {
        it('should add credentials header when enabled', () => {
            corsMiddleware.addCorsHeaders(mockRes as Response, 'https://example.com');

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Expose-Headers',
                'Content-Length, Content-Type, X-Request-ID, X-Response-Time');
        });

        it('should not add credentials header when disabled', () => {
            corsMiddleware = new CorsMiddleware({
                allowedOrigins: ['https://example.com'],
                allowCredentials: false
            });

            corsMiddleware.addCorsHeaders(mockRes as Response, 'https://example.com');

            expect(mockHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
            expect(mockHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        });
    });

    describe('Configuration Management', () => {
        it('should update configuration', () => {
            const newConfig: CorsConfig = {
                allowedOrigins: ['https://new-origin.com'],
                allowCredentials: false
            };

            expect(() => {
                corsMiddleware.updateConfig(newConfig);
            }).not.toThrow();

            const configInfo = corsMiddleware.getConfigInfo();
            expect(configInfo.allowedOrigins).toEqual(['https://new-origin.com']);
            expect(configInfo.allowCredentials).toBe(false);
        });

        it('should return configuration info', () => {
            const configInfo = corsMiddleware.getConfigInfo();

            expect(configInfo).toEqual({
                allowedOrigins: ['https://example.com', 'https://app.example.com'],
                allowCredentials: true
            });
        });
    });

    describe('Error Responses', () => {
        it('should provide helpful error messages and suggestions', () => {
            mockReq.headers = {
                origin: 'https://blocked-origin.com'
            };

            corsMiddleware.validateOrigin(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockJson).toHaveBeenCalledWith({
                error: {
                    code: 'CORS_ORIGIN_NOT_ALLOWED',
                    message: "Origin 'https://blocked-origin.com' is not allowed",
                    timestamp: expect.any(String),
                    suggestions: [
                        'Check that your origin is included in the CORS_ORIGINS configuration',
                        'For development, you can set CORS_ORIGINS=* to allow all origins',
                        'Ensure your request includes the correct Origin header'
                    ]
                }
            });
        });
    });
});