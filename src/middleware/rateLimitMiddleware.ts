/**
 * Rate limiting middleware with suspicious activity detection
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RateLimitConfig } from '../types/config';
import { SuspiciousActivityResult } from '../types/middleware';

export class RateLimitMiddleware {
    private rateLimitConfig: RateLimitConfig;
    private suspiciousIPs: Map<string, { count: number; lastSeen: number; blocked: boolean }> = new Map();
    private blockedIPs: Set<string> = new Set();

    constructor(rateLimitConfig: RateLimitConfig) {
        this.rateLimitConfig = rateLimitConfig;

        // Clean up suspicious IPs every 5 minutes
        setInterval(() => {
            this.cleanupSuspiciousIPs();
        }, 5 * 60 * 1000);
    }

    /**
     * Create rate limiter instance
     */
    createRateLimiter() {
        return rateLimit({
            windowMs: this.rateLimitConfig.windowMs,
            max: this.rateLimitConfig.maxRequests,
            skipSuccessfulRequests: this.rateLimitConfig.skipSuccessfulRequests,

            // Custom key generator to include suspicious activity
            keyGenerator: (req: Request) => {
                const ip = this.getClientIP(req);
                const suspiciousResult = this.detectSuspiciousActivity(req);

                // Apply stricter limits for suspicious requests
                if (suspiciousResult.isSuspicious && suspiciousResult.riskLevel === 'high') {
                    return `suspicious:${ip}`;
                }

                return ip;
            },

            // Custom handler for rate limit exceeded
            handler: (req: Request, res: Response) => {
                const ip = this.getClientIP(req);
                const suspiciousResult = this.detectSuspiciousActivity(req);

                // Block high-risk IPs temporarily
                if (suspiciousResult.riskLevel === 'high') {
                    this.blockIP(ip, 15 * 60 * 1000); // Block for 15 minutes
                }

                const retryAfter = Math.ceil(this.rateLimitConfig.windowMs / 1000);

                res.status(429).json({
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests from this IP',
                        timestamp: new Date().toISOString(),
                        retryAfter: retryAfter,
                        suggestions: [
                            `Wait ${retryAfter} seconds before making another request`,
                            'Consider implementing request batching',
                            'Check if your requests are being flagged as suspicious'
                        ]
                    }
                });
            },

            // Skip function to bypass rate limiting for certain conditions
            skip: (req: Request) => {
                const ip = this.getClientIP(req);

                // Don't skip if IP is blocked
                if (this.blockedIPs.has(ip)) {
                    return false;
                }

                // Skip rate limiting for admin endpoints with proper auth
                if (req.path.startsWith('/admin/') && (req as any).user?.roles?.includes('admin')) {
                    return true;
                }

                return false;
            },

            // Standard headers
            standardHeaders: true,
            legacyHeaders: false,
        });
    }

    /**
     * IP blocking middleware
     */
    checkBlockedIPs = (req: Request, res: Response, next: NextFunction): void => {
        const ip = this.getClientIP(req);

        if (this.blockedIPs.has(ip)) {
            res.status(403).json({
                error: {
                    code: 'IP_BLOCKED',
                    message: 'Your IP has been temporarily blocked due to suspicious activity',
                    timestamp: new Date().toISOString(),
                    suggestions: [
                        'Wait for the block to expire',
                        'Contact support if you believe this is an error',
                        'Ensure your requests follow proper API usage patterns'
                    ]
                }
            });
            return;
        }

        next();
    };

    /**
     * Detect suspicious activity
     */
    detectSuspiciousActivity(req: Request): SuspiciousActivityResult {
        const ip = this.getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        const origin = req.headers.origin;
        const referer = req.headers.referer;

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        const reasons: string[] = [];
        let isSuspicious = false;

        // Check for missing or suspicious User-Agent
        if (!userAgent || userAgent.length < 10) {
            reasons.push('Missing or suspicious User-Agent');
            riskLevel = 'medium';
            isSuspicious = true;
        }

        // Check for bot-like User-Agent patterns
        const botPatterns = [
            /bot/i, /crawler/i, /spider/i, /scraper/i,
            /curl/i, /wget/i, /python/i, /java/i
        ];

        if (botPatterns.some(pattern => pattern.test(userAgent))) {
            reasons.push('Bot-like User-Agent detected');
            riskLevel = 'medium';
            isSuspicious = true;
        }

        // Check for origin/referer mismatch
        if (origin && referer) {
            try {
                const originHost = new URL(origin).host;
                const refererHost = new URL(referer).host;

                if (originHost !== refererHost) {
                    reasons.push('Origin and Referer mismatch');
                    riskLevel = 'medium';
                    isSuspicious = true;
                }
            } catch {
                // Invalid URLs
                reasons.push('Invalid Origin or Referer headers');
                riskLevel = 'high';
                isSuspicious = true;
            }
        }

        // Check for suspicious request patterns
        const path = req.path.toLowerCase();
        const suspiciousPaths = [
            '/admin', '/.env', '/config', '/wp-admin', '/phpmyadmin',
            '/api/v1/admin', '/debug', '/test', '/dev'
        ];

        if (suspiciousPaths.some(suspPath => path.includes(suspPath)) &&
            !req.headers.authorization) {
            reasons.push('Accessing sensitive paths without authentication');
            riskLevel = 'high';
            isSuspicious = true;
        }

        // Check for rapid requests from same IP
        const ipInfo = this.suspiciousIPs.get(ip);
        const now = Date.now();

        if (ipInfo) {
            const timeDiff = now - ipInfo.lastSeen;

            if (timeDiff < 1000) { // Less than 1 second between requests
                ipInfo.count++;
                ipInfo.lastSeen = now;

                if (ipInfo.count > 10) {
                    reasons.push('Rapid successive requests');
                    riskLevel = 'high';
                    isSuspicious = true;
                }
            } else {
                ipInfo.count = Math.max(0, ipInfo.count - 1);
                ipInfo.lastSeen = now;
            }
        } else {
            this.suspiciousIPs.set(ip, { count: 1, lastSeen: now, blocked: false });
        }

        // Check for large payloads
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > 10 * 1024 * 1024) { // 10MB
            reasons.push('Unusually large request payload');
            riskLevel = 'high';
            isSuspicious = true;
        }

        const shouldBlock = riskLevel === 'high' && isSuspicious;

        return {
            isSuspicious,
            reason: reasons.join(', '),
            riskLevel,
            shouldBlock
        };
    }

    /**
     * Block IP temporarily
     */
    private blockIP(ip: string, duration: number): void {
        this.blockedIPs.add(ip);

        // Update suspicious IP info
        const ipInfo = this.suspiciousIPs.get(ip);
        if (ipInfo) {
            ipInfo.blocked = true;
        }

        // Unblock after duration
        setTimeout(() => {
            this.blockedIPs.delete(ip);
            const ipInfo = this.suspiciousIPs.get(ip);
            if (ipInfo) {
                ipInfo.blocked = false;
            }
        }, duration);

        console.warn(`IP ${ip} blocked for ${duration}ms due to suspicious activity`);
    }

    /**
     * Get client IP address
     */
    private getClientIP(req: Request): string {
        const forwardedFor = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];
        const connectionIp = req.connection?.remoteAddress;
        const socketIp = req.socket?.remoteAddress;

        if (typeof forwardedFor === 'string') {
            const parts = forwardedFor.split(',');
            return (parts[0] || forwardedFor).trim();
        }

        if (typeof realIp === 'string') {
            const parts = realIp.split(',');
            return (parts[0] || realIp).trim();
        }

        if (typeof connectionIp === 'string') {
            const parts = connectionIp.split(',');
            return (parts[0] || connectionIp).trim();
        }

        if (typeof socketIp === 'string') {
            const parts = socketIp.split(',');
            return (parts[0] || socketIp).trim();
        }

        return 'unknown';
    }

    /**
     * Clean up old suspicious IP entries
     */
    private cleanupSuspiciousIPs(): void {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes

        for (const [ip, info] of this.suspiciousIPs.entries()) {
            if (now - info.lastSeen > maxAge && !info.blocked) {
                this.suspiciousIPs.delete(ip);
            }
        }
    }

    /**
     * Update rate limit configuration
     */
    updateConfig(rateLimitConfig: RateLimitConfig): void {
        this.rateLimitConfig = rateLimitConfig;
    }

    /**
     * Get current rate limit configuration info
     */
    getConfigInfo(): RateLimitConfig & { suspiciousIPs: number; blockedIPs: number } {
        return {
            ...this.rateLimitConfig,
            suspiciousIPs: this.suspiciousIPs.size,
            blockedIPs: this.blockedIPs.size
        };
    }

    /**
     * Get suspicious activity statistics
     */
    getSuspiciousActivityStats(): {
        suspiciousIPs: Array<{ ip: string; count: number; lastSeen: Date; blocked: boolean }>;
        blockedIPs: string[];
    } {
        const suspiciousIPs = Array.from(this.suspiciousIPs.entries()).map(([ip, info]) => ({
            ip,
            count: info.count,
            lastSeen: new Date(info.lastSeen),
            blocked: info.blocked
        }));

        return {
            suspiciousIPs,
            blockedIPs: Array.from(this.blockedIPs)
        };
    }
}