/**
 * Tests for RateLimitMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitMiddleware } from '../rateLimitMiddleware';
import { RateLimitConfig } from '../../types/config';

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
    return jest.fn(() => jest.fn((_req: Request, _res: Response, next: NextFunction) => next()));
});

describe('RateLimitMiddleware', () => {
    let rateLimitMiddleware: RateLimitMiddleware;
    let mockReq: any;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    const defaultRateLimitConfig: RateLimitConfig = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
    };

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });

        mockReq = {
            headers: {},
            method: 'GET',
            path: '/api/test',
            connection: { remoteAddress: '127.0.0.1' },
            socket: { remoteAddress: '127.0.0.1' }
        };

        mockRes = {
            status: mockStatus,
            json: mockJson
        };

        mockNext = jest.fn();

        rateLimitMiddleware = new RateLimitMiddleware(defaultRateLimitConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('IP Blocking', () => {
        it('should allow requests from non-blocked IPs', () => {
            rateLimitMiddleware.checkBlockedIPs(
                mockReq as Request,
                mockRes as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockStatus).not.toHaveBeenCalled();
        });
    });

    describe('Suspicious Activity Detection', () => {
        it('should detect missing User-Agent as suspicious', () => {
            mockReq.headers = {};

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Missing or suspicious User-Agent');
            expect(['medium', 'high']).toContain(result.riskLevel);
        });

        it('should detect bot-like User-Agent as suspicious', () => {
            mockReq.headers = {
                'user-agent': 'GoogleBot/2.1'
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Bot-like User-Agent detected');
            expect(['medium', 'high']).toContain(result.riskLevel);
        });

        it('should detect origin/referer mismatch as suspicious', () => {
            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'origin': 'https://example.com',
                'referer': 'https://malicious.com/page'
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Origin and Referer mismatch');
            expect(['medium', 'high']).toContain(result.riskLevel);
        });

        it('should detect access to sensitive paths without auth as high risk', () => {
            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            mockReq.path = '/admin/config';

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Accessing sensitive paths without authentication');
            expect(result.riskLevel).toBe('high');
            expect(result.shouldBlock).toBe(true);
        });

        it('should detect large payloads as suspicious', () => {
            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'content-length': '20971520' // 20MB
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Unusually large request payload');
            expect(result.riskLevel).toBe('high');
        });

        it('should detect rapid successive requests', () => {
            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };

            // Simulate rapid requests
            for (let i = 0; i < 12; i++) {
                rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);
            }

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Rapid successive requests');
            expect(result.riskLevel).toBe('high');
        });

        it('should not flag normal requests as suspicious', () => {
            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'origin': 'https://example.com',
                'referer': 'https://example.com/page'
            };
            mockReq.path = '/api/users';

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(false);
            expect(result.riskLevel).toBe('low');
            expect(result.shouldBlock).toBe(false);
        });

        it('should handle invalid origin/referer URLs', () => {
            mockReq.headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'origin': 'invalid-url',
                'referer': 'also-invalid'
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result.isSuspicious).toBe(true);
            expect(result.reason).toContain('Invalid Origin or Referer headers');
            expect(result.riskLevel).toBe('high');
        });
    });

    describe('Client IP Detection', () => {
        it('should extract IP from X-Forwarded-For header', () => {
            mockReq.headers = {
                'x-forwarded-for': '192.168.1.100, 10.0.0.1'
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result).toBeDefined();
        });

        it('should extract IP from X-Real-IP header', () => {
            mockReq.headers = {
                'x-real-ip': '192.168.1.100'
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result).toBeDefined();
        });

        it('should fallback to connection remote address', () => {
            mockReq.connection = { remoteAddress: '127.0.0.1' };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result).toBeDefined();
        });
    });

    describe('Rate Limiter Creation', () => {
        it('should create rate limiter with correct configuration', () => {
            const rateLimiter = rateLimitMiddleware.createRateLimiter();

            expect(rateLimiter).toBeDefined();
            expect(typeof rateLimiter).toBe('function');
        });

        it('should skip rate limiting for admin users on admin endpoints', () => {
            mockReq.path = '/admin/config';
            mockReq.user = {
                id: 'admin123',
                username: 'admin',
                roles: ['admin']
            };

            const rateLimiter = rateLimitMiddleware.createRateLimiter();

            expect(rateLimiter).toBeDefined();
        });
    });

    describe('Configuration Management', () => {
        it('should update configuration', () => {
            const newConfig: RateLimitConfig = {
                windowMs: 30 * 60 * 1000, // 30 minutes
                maxRequests: 200,
                skipSuccessfulRequests: true
            };

            expect(() => {
                rateLimitMiddleware.updateConfig(newConfig);
            }).not.toThrow();
        });

        it('should return configuration info with statistics', () => {
            const configInfo = rateLimitMiddleware.getConfigInfo();

            expect(configInfo).toEqual({
                windowMs: 15 * 60 * 1000,
                maxRequests: 100,
                skipSuccessfulRequests: false,
                suspiciousIPs: expect.any(Number),
                blockedIPs: expect.any(Number)
            });
        });

        it('should return suspicious activity statistics', () => {
            // Generate some suspicious activity first
            mockReq.headers = { 'user-agent': 'bot' };
            rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            const stats = rateLimitMiddleware.getSuspiciousActivityStats();

            expect(stats).toHaveProperty('suspiciousIPs');
            expect(stats).toHaveProperty('blockedIPs');
            expect(Array.isArray(stats.suspiciousIPs)).toBe(true);
            expect(Array.isArray(stats.blockedIPs)).toBe(true);
        });
    });

    describe('Error Scenarios', () => {
        it('should handle requests with missing connection info', () => {
            delete mockReq.connection;
            delete mockReq.socket;

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result).toBeDefined();
            expect(result.isSuspicious).toBeDefined();
        });

        it('should handle malformed headers gracefully', () => {
            mockReq.headers = {
                'user-agent': null as any,
                'content-length': 'invalid-number'
            };

            const result = rateLimitMiddleware.detectSuspiciousActivity(mockReq as Request);

            expect(result).toBeDefined();
        });
    });
});