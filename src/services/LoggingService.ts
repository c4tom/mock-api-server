/**
 * Logging and monitoring service with structured logging and performance metrics
 */

import winston, { Logger } from 'winston';
import { Request, Response, NextFunction } from 'express';
import { LoggingConfig } from '../types/config';
import { AuthenticatedRequest } from '../types/middleware';

export interface RequestMetrics {
    requestId: string;
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    contentLength: number;
    userAgent?: string | undefined;
    ip: string;
    user?: string | undefined;
    timestamp: string;
}

export interface PerformanceMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    lastReset: string;
}

export class LoggingService {
    private logger: Logger;
    private config: LoggingConfig;
    private requestMetrics: RequestMetrics[] = [];
    private performanceMetrics: PerformanceMetrics;
    private metricsResetInterval: NodeJS.Timeout | null = null;

    constructor(config: LoggingConfig) {
        this.config = config;
        this.performanceMetrics = this.initializeMetrics();
        this.logger = this.createLogger();
        this.startMetricsCollection();
    }

    /**
     * Create winston logger with appropriate configuration
     */
    private createLogger(): Logger {
        const transports: winston.transport[] = [
            new winston.transports.Console({
                silent: this.config.level === 'silent'
            })
        ];

        // Add file transport if configured
        if (this.config.file) {
            transports.push(
                new winston.transports.File({
                    filename: this.config.file,
                    maxsize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 5,
                    tailable: true
                })
            );
        }

        const format = this.config.format === 'json'
            ? winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            )
            : winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
                })
            );

        return winston.createLogger({
            level: this.config.level,
            format,
            transports,
            exitOnError: false
        });
    }

    /**
     * Initialize performance metrics
     */
    private initializeMetrics(): PerformanceMetrics {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            requestsPerMinute: 0,
            errorRate: 0,
            lastReset: new Date().toISOString()
        };
    }

    /**
     * Start metrics collection and periodic reset
     */
    private startMetricsCollection(): void {
        // Reset metrics every hour to prevent memory buildup
        this.metricsResetInterval = setInterval(() => {
            this.resetMetrics();
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * Request logging middleware
     */
    requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        // Add request metadata
        req.requestId = requestId;
        req.startTime = startTime;

        // Get client information
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent');
        const user = req.user?.username;

        // Log incoming request
        this.logger.info('Request received', {
            requestId,
            method: req.method,
            url: req.originalUrl,
            ip,
            userAgent,
            user,
            headers: this.sanitizeHeaders(req.headers),
            query: req.query,
            body: this.sanitizeBody(req.body)
        });

        // Log response when finished
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            const contentLength = parseInt(res.get('Content-Length') || '0', 10);

            // Create request metrics
            const metrics: RequestMetrics = {
                requestId,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTime,
                contentLength,
                userAgent,
                ip,
                user,
                timestamp: new Date().toISOString()
            };

            // Store metrics
            this.recordRequestMetrics(metrics);

            // Log response
            const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
            this.logger.log(logLevel, 'Request completed', {
                requestId,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                contentLength,
                user
            });
        });

        // Add response headers
        res.setHeader('X-Request-ID', requestId);
        res.setHeader('X-Response-Time', Date.now() - startTime);

        next();
    };

    /**
     * Error logging middleware
     */
    errorLogger = (error: any, req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        const requestId = req.requestId || 'unknown';
        const user = req.user?.username || 'anonymous';

        this.logger.error('Request error', {
            requestId,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                status: error.status
            },
            request: {
                method: req.method,
                url: req.originalUrl,
                ip: this.getClientIP(req),
                userAgent: req.get('User-Agent'),
                user
            }
        });

        next(error);
    };

    /**
     * Record request metrics for performance monitoring
     */
    private recordRequestMetrics(metrics: RequestMetrics): void {
        // Add to metrics array (keep last 1000 requests)
        this.requestMetrics.push(metrics);
        if (this.requestMetrics.length > 1000) {
            this.requestMetrics.shift();
        }

        // Update performance metrics
        this.performanceMetrics.totalRequests++;

        if (metrics.statusCode < 400) {
            this.performanceMetrics.successfulRequests++;
        } else {
            this.performanceMetrics.failedRequests++;
        }

        // Calculate average response time
        const totalResponseTime = this.requestMetrics.reduce((sum, m) => sum + m.responseTime, 0);
        this.performanceMetrics.averageResponseTime = Math.round(totalResponseTime / this.requestMetrics.length);

        // Calculate error rate
        this.performanceMetrics.errorRate = (this.performanceMetrics.failedRequests / this.performanceMetrics.totalRequests) * 100;

        // Calculate requests per minute (based on last 60 seconds)
        const oneMinuteAgo = Date.now() - 60000;
        const recentRequests = this.requestMetrics.filter(m =>
            new Date(m.timestamp).getTime() > oneMinuteAgo
        );
        this.performanceMetrics.requestsPerMinute = recentRequests.length;
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Get recent request metrics
     */
    getRecentRequests(limit: number = 100): RequestMetrics[] {
        return this.requestMetrics.slice(-limit);
    }

    /**
     * Get request metrics by status code
     */
    getRequestsByStatus(): Record<string, number> {
        const statusCounts: Record<string, number> = {};

        this.requestMetrics.forEach(metrics => {
            const statusRange = `${Math.floor(metrics.statusCode / 100)}xx`;
            statusCounts[statusRange] = (statusCounts[statusRange] || 0) + 1;
        });

        return statusCounts;
    }

    /**
     * Get slowest requests
     */
    getSlowestRequests(limit: number = 10): RequestMetrics[] {
        return [...this.requestMetrics]
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, limit);
    }

    /**
     * Log application events
     */
    logEvent(level: string, message: string, meta?: any): void {
        this.logger.log(level, message, {
            ...meta,
            timestamp: new Date().toISOString(),
            type: 'application_event'
        });
    }

    /**
     * Log security events
     */
    logSecurityEvent(event: string, details: any): void {
        this.logger.warn('Security event', {
            event,
            details,
            timestamp: new Date().toISOString(),
            type: 'security_event'
        });
    }

    /**
     * Log configuration changes
     */
    logConfigChange(changes: string[], user?: string): void {
        this.logger.info('Configuration changed', {
            changes,
            user: user || 'system',
            timestamp: new Date().toISOString(),
            type: 'config_change'
        });
    }

    /**
     * Update logging configuration
     */
    updateConfig(newConfig: LoggingConfig): void {
        this.config = newConfig;
        this.logger = this.createLogger();

        this.logEvent('info', 'Logging configuration updated', {
            newConfig: {
                level: newConfig.level,
                format: newConfig.format,
                file: newConfig.file ? '[CONFIGURED]' : undefined
            }
        });
    }

    /**
     * Reset performance metrics
     */
    private resetMetrics(): void {
        const oldMetrics = { ...this.performanceMetrics };
        this.performanceMetrics = this.initializeMetrics();
        this.requestMetrics = [];

        this.logger.info('Performance metrics reset', {
            previousMetrics: oldMetrics,
            type: 'metrics_reset'
        });
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
            ip = forwardedFor.split(',')[0]?.trim() || 'unknown';
        } else if (typeof realIp === 'string') {
            ip = realIp;
        } else if (connectionIp) {
            ip = connectionIp;
        } else if (socketIp) {
            ip = socketIp;
        }

        return ip;
    }

    /**
     * Sanitize request headers for logging
     */
    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };

        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Sanitize request body for logging
     */
    private sanitizeBody(body: any): any {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const sanitized = { ...body };

        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.metricsResetInterval) {
            clearInterval(this.metricsResetInterval);
            this.metricsResetInterval = null;
        }

        this.logger.end();
    }
}