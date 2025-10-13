/**
 * Main security middleware that combines authentication, CORS, and rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityConfig } from '../types/config';
import { AuthenticatedRequest, SecurityMiddleware as ISecurityMiddleware, SuspiciousActivityResult } from '../types/middleware';
import { AuthMiddleware } from './authMiddleware';
import { CorsMiddleware } from './corsMiddleware';
import { RateLimitMiddleware } from './rateLimitMiddleware';

export class SecurityMiddleware implements ISecurityMiddleware {
    private authMiddleware: AuthMiddleware;
    private corsMiddleware: CorsMiddleware;
    private rateLimitMiddleware: RateLimitMiddleware;

    constructor(securityConfig: SecurityConfig) {
        this.authMiddleware = new AuthMiddleware(securityConfig.authentication);
        this.corsMiddleware = new CorsMiddleware(securityConfig.cors);
        this.rateLimitMiddleware = new RateLimitMiddleware(securityConfig.rateLimit);
    }

    /**
     * Authentication middleware
     */
    async authenticateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        return this.authMiddleware.authenticate(req, res, next);
    }

    /**
     * Optional authentication middleware
     */
    optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        return this.authMiddleware.optionalAuth(req, res, next);
    };

    /**
     * Admin authentication middleware
     */
    requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        return this.authMiddleware.requireAdmin(req, res, next);
    };

    /**
     * CORS origin validation middleware
     */
    validateOrigin(req: Request, res: Response, next: NextFunction): void {
        return this.corsMiddleware.validateOrigin(req, res, next);
    }

    /**
     * Handle CORS preflight requests
     */
    handlePreflight = (req: Request, res: Response, next: NextFunction): void => {
        return this.corsMiddleware.handlePreflight(req, res, next);
    };

    /**
     * Rate limiting middleware
     */
    applyRateLimit(req: Request, res: Response, next: NextFunction): void {
        const rateLimiter = this.rateLimitMiddleware.createRateLimiter();
        return rateLimiter(req, res, next);
    }

    /**
     * IP blocking middleware
     */
    checkBlockedIPs = (req: Request, res: Response, next: NextFunction): void => {
        return this.rateLimitMiddleware.checkBlockedIPs(req, res, next);
    };

    /**
     * Detect suspicious activity
     */
    detectSuspiciousActivity(req: Request): SuspiciousActivityResult {
        return this.rateLimitMiddleware.detectSuspiciousActivity(req);
    }

    /**
     * Combined security middleware chain
     */
    securityChain = () => {
        return [
            this.handlePreflight,
            this.validateOrigin,
            this.checkBlockedIPs,
            this.applyRateLimit
        ];
    };

    /**
     * Security middleware for authenticated routes
     */
    authenticatedSecurityChain = () => {
        return [
            this.handlePreflight,
            this.validateOrigin,
            this.checkBlockedIPs,
            this.applyRateLimit,
            this.authenticateRequest
        ];
    };

    /**
     * Security middleware for admin routes
     */
    adminSecurityChain = () => {
        return [
            this.handlePreflight,
            this.validateOrigin,
            this.checkBlockedIPs,
            this.applyRateLimit,
            this.authenticateRequest,
            this.requireAdmin
        ];
    };

    /**
     * Request logging middleware
     */
    requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const startTime = Date.now();
        req.startTime = startTime;
        req.requestId = this.generateRequestId();

        // Log request
        const ip = this.getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const suspiciousResult = this.detectSuspiciousActivity(req);

        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
            ip,
            userAgent,
            user: req.user?.username || 'anonymous',
            requestId: req.requestId,
            suspicious: suspiciousResult.isSuspicious ? {
                level: suspiciousResult.riskLevel,
                reason: suspiciousResult.reason
            } : false
        });

        // Log response when finished
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode}`, {
                duration: `${duration}ms`,
                requestId: req.requestId,
                contentLength: res.get('content-length') || '0'
            });
        });

        // Add response headers
        res.setHeader('X-Request-ID', req.requestId);
        res.setHeader('X-Response-Time', Date.now() - startTime);

        next();
    };

    /**
     * Error handling middleware
     */
    errorHandler = (error: any, req: AuthenticatedRequest, res: Response, _next: NextFunction): void => {
        console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.path}:`, {
            error: error.message,
            stack: error.stack,
            requestId: req.requestId,
            user: req.user?.username || 'anonymous'
        });

        // Don't expose internal errors in production
        const isDevelopment = process.env['NODE_ENV'] === 'development';

        let statusCode = 500;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';

        // Handle specific error types
        if (error.name === 'ValidationError') {
            statusCode = 400;
            message = 'Validation failed';
            code = 'VALIDATION_ERROR';
        } else if (error.name === 'UnauthorizedError') {
            statusCode = 401;
            message = 'Unauthorized';
            code = 'UNAUTHORIZED';
        } else if (error.name === 'ForbiddenError') {
            statusCode = 403;
            message = 'Forbidden';
            code = 'FORBIDDEN';
        }

        res.status(statusCode).json({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
                ...(isDevelopment && { details: error.message, stack: error.stack })
            }
        });
    };

    /**
     * Update security configuration
     */
    updateConfig(securityConfig: SecurityConfig): void {
        this.authMiddleware.updateConfig(securityConfig.authentication);
        this.corsMiddleware.updateConfig(securityConfig.cors);
        this.rateLimitMiddleware.updateConfig(securityConfig.rateLimit);
    }

    /**
     * Get security configuration info
     */
    getConfigInfo(): any {
        return {
            authentication: this.authMiddleware.getConfigInfo(),
            cors: this.corsMiddleware.getConfigInfo(),
            rateLimit: this.rateLimitMiddleware.getConfigInfo()
        };
    }

    /**
     * Get security statistics
     */
    getSecurityStats(): any {
        return {
            suspiciousActivity: this.rateLimitMiddleware.getSuspiciousActivityStats(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get client IP address
     */
    private getClientIP(req: Request): string {
        const forwardedFor = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];
        const connectionIp = req.connection?.remoteAddress;
        const socketIp = req.socket?.remoteAddress;

        let ip: string = 'unknown';

        if (typeof forwardedFor === 'string') {
            ip = forwardedFor;
        } else if (typeof realIp === 'string') {
            ip = realIp;
        } else if (connectionIp) {
            ip = connectionIp;
        } else if (socketIp) {
            ip = socketIp;
        }

        // @ts-ignore - ip is guaranteed to be defined by the logic above
        return ip.split(',')[0].trim();
    }
}