/**
 * Admin endpoint handlers for configuration management and health monitoring
 */

import { Response, NextFunction } from 'express';
import { ConfigManager } from '../config';
import { AppConfig } from '../types/config';
import { AuthenticatedRequest } from '../types/middleware';
import { LoggingService } from '../services/LoggingService';

export class AdminHandler {
    private configManager: ConfigManager;
    private config: AppConfig;
    private loggingService: LoggingService | undefined;
    private proxyHandler: any; // Will be set from index.ts

    constructor(configManager: ConfigManager, config: AppConfig, loggingService?: LoggingService) {
        this.configManager = configManager;
        this.config = config;
        this.loggingService = loggingService;
    }

    /**
     * Set proxy handler reference for cache management
     */
    setProxyHandler(proxyHandler: any): void {
        this.proxyHandler = proxyHandler;
    }

    /**
     * Get current configuration (with sensitive data hidden)
     * GET /admin/config
     */
    getConfig = (req: AuthenticatedRequest, res: Response): void => {
        try {
            const safeConfig = this.sanitizeConfig(this.config);

            res.json({
                success: true,
                data: safeConfig,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    code: 'CONFIG_READ_ERROR',
                    message: 'Failed to read configuration',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
        }
    };

    /**
     * Reload configuration from files
     * POST /admin/reload
     */
    reloadConfig = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
        try {
            const oldConfig = { ...this.config };

            // Reload configuration
            await this.configManager.reloadConfig();
            this.config = this.configManager.getConfig();

            // Log configuration changes
            const changes = this.detectConfigChanges(oldConfig, this.config);

            console.log(`[${new Date().toISOString()}] Configuration reloaded by ${req.user?.username || 'anonymous'}`, {
                requestId: req.requestId,
                changes: changes.length > 0 ? changes : 'No changes detected'
            });

            res.json({
                success: true,
                message: 'Configuration reloaded successfully',
                data: {
                    changes: changes.length > 0 ? changes : 'No changes detected',
                    reloadedAt: new Date().toISOString()
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Configuration reload failed:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                requestId: req.requestId,
                user: req.user?.username || 'anonymous'
            });

            res.status(500).json({
                error: {
                    code: 'CONFIG_RELOAD_ERROR',
                    message: 'Failed to reload configuration',
                    details: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    suggestions: [
                        'Check configuration file syntax',
                        'Verify file permissions',
                        'Review server logs for detailed error information'
                    ]
                }
            });
        }
    };

    /**
     * Get detailed server health status
     * GET /admin/health
     */
    getHealthStatus = (req: AuthenticatedRequest, res: Response): void => {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();
            const cpuUsage = process.cpuUsage();

            // Calculate memory usage in MB
            const memoryStats = {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
                arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
            };

            // Calculate uptime in human-readable format
            const uptimeFormatted = this.formatUptime(uptime);

            // Get system information
            const systemInfo = {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                pid: process.pid,
                ppid: process.ppid
            };

            // Get configuration status
            const configStatus = {
                environment: this.config.server.environment,
                adminEnabled: this.config.server.adminEnabled,
                authEnabled: this.config.security.authentication.enabled,
                authType: this.config.security.authentication.type,
                proxyEnabled: this.config.proxy.enabled,
                mockDataEnabled: this.config.mock.endpoints.length > 0,
                corsOrigins: this.config.security.cors.allowedOrigins.length,
                rateLimitEnabled: this.config.security.rateLimit.maxRequests > 0
            };

            // Determine overall health status
            const healthStatus = this.determineHealthStatus(memoryStats, uptime);

            res.json({
                success: true,
                data: {
                    status: healthStatus.status,
                    message: healthStatus.message,
                    uptime: {
                        seconds: Math.floor(uptime),
                        formatted: uptimeFormatted
                    },
                    memory: {
                        ...memoryStats,
                        unit: 'MB'
                    },
                    cpu: {
                        user: Math.round(cpuUsage.user / 1000), // Convert to milliseconds
                        system: Math.round(cpuUsage.system / 1000)
                    },
                    system: systemInfo,
                    configuration: configStatus,
                    timestamp: new Date().toISOString()
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Health check failed:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                requestId: req.requestId
            });

            res.status(500).json({
                error: {
                    code: 'HEALTH_CHECK_ERROR',
                    message: 'Failed to retrieve health status',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
        }
    };

    /**
     * Get server statistics and metrics
     * GET /admin/stats
     */
    getServerStats = (req: AuthenticatedRequest, res: Response): void => {
        try {
            // Get performance metrics from logging service if available
            const performanceMetrics = this.loggingService?.getPerformanceMetrics();
            const requestsByStatus = this.loggingService?.getRequestsByStatus();
            const slowestRequests = this.loggingService?.getSlowestRequests(5);

            const stats = {
                server: {
                    startTime: process.env['SERVER_START_TIME'] || 'unknown',
                    uptime: process.uptime(),
                    environment: this.config.server.environment,
                    version: process.env['npm_package_version'] || '1.0.0'
                },
                requests: performanceMetrics ? {
                    total: performanceMetrics.totalRequests,
                    successful: performanceMetrics.successfulRequests,
                    failed: performanceMetrics.failedRequests,
                    averageResponseTime: performanceMetrics.averageResponseTime,
                    requestsPerMinute: performanceMetrics.requestsPerMinute,
                    errorRate: Math.round(performanceMetrics.errorRate * 100) / 100
                } : {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    averageResponseTime: 0,
                    requestsPerMinute: 0,
                    errorRate: 0
                },
                requestsByStatus: requestsByStatus || {},
                slowestRequests: slowestRequests || [],
                endpoints: {
                    mock: this.config.mock.endpoints.length,
                    proxy: Object.keys(this.config.proxy.routes).length,
                    admin: this.config.server.adminEnabled ? 4 : 0
                },
                security: {
                    authEnabled: this.config.security.authentication.enabled,
                    corsOriginsCount: this.config.security.cors.allowedOrigins.length,
                    rateLimitWindow: this.config.security.rateLimit.windowMs,
                    rateLimitMax: this.config.security.rateLimit.maxRequests
                }
            };

            res.json({
                success: true,
                data: stats,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    code: 'STATS_ERROR',
                    message: 'Failed to retrieve server statistics',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
        }
    };

    /**
     * Update configuration reference when config is reloaded
     */
    updateConfig(newConfig: AppConfig): void {
        this.config = newConfig;
    }

    /**
     * Update logging service reference
     */
    updateLoggingService(loggingService: LoggingService): void {
        this.loggingService = loggingService;
    }

    /**
     * Get cache statistics
     * GET /admin/cache/stats
     */
    getCacheStats = (req: AuthenticatedRequest, res: Response): void => {
        try {
            if (!this.proxyHandler) {
                res.status(503).json({
                    error: {
                        code: 'PROXY_NOT_INITIALIZED',
                        message: 'Proxy handler not initialized',
                        timestamp: new Date().toISOString(),
                        requestId: req.requestId
                    }
                });
                return;
            }

            const stats = this.proxyHandler.getCacheStats();

            if (!stats) {
                res.json({
                    success: true,
                    data: {
                        enabled: false,
                        message: 'Cache is not enabled'
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                        requestId: req.requestId
                    }
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    enabled: true,
                    ...stats
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    code: 'CACHE_STATS_ERROR',
                    message: 'Failed to retrieve cache statistics',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
        }
    };

    /**
     * Clear all cache entries
     * POST /admin/cache/clear
     */
    clearCache = (req: AuthenticatedRequest, res: Response): void => {
        try {
            if (!this.proxyHandler) {
                res.status(503).json({
                    error: {
                        code: 'PROXY_NOT_INITIALIZED',
                        message: 'Proxy handler not initialized',
                        timestamp: new Date().toISOString(),
                        requestId: req.requestId
                    }
                });
                return;
            }

            this.proxyHandler.clearCache();

            console.log(`[${new Date().toISOString()}] Cache cleared by ${req.user?.username || 'anonymous'}`, {
                requestId: req.requestId
            });

            res.json({
                success: true,
                message: 'Cache cleared successfully',
                data: {
                    clearedAt: new Date().toISOString()
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    code: 'CACHE_CLEAR_ERROR',
                    message: 'Failed to clear cache',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
        }
    };

    /**
     * Invalidate cache for a specific route
     * POST /admin/cache/invalidate/:routeName
     */
    invalidateCacheByRoute = (req: AuthenticatedRequest, res: Response): void => {
        try {
            if (!this.proxyHandler) {
                res.status(503).json({
                    error: {
                        code: 'PROXY_NOT_INITIALIZED',
                        message: 'Proxy handler not initialized',
                        timestamp: new Date().toISOString(),
                        requestId: req.requestId
                    }
                });
                return;
            }

            const routeName = req.params['routeName'];
            if (!routeName) {
                res.status(400).json({
                    error: {
                        code: 'MISSING_ROUTE_NAME',
                        message: 'Route name is required',
                        timestamp: new Date().toISOString(),
                        requestId: req.requestId
                    }
                });
                return;
            }

            const count = this.proxyHandler.invalidateCacheByRoute(routeName);

            console.log(`[${new Date().toISOString()}] Cache invalidated for route '${routeName}' by ${req.user?.username || 'anonymous'}`, {
                requestId: req.requestId,
                entriesInvalidated: count
            });

            res.json({
                success: true,
                message: `Cache invalidated for route '${routeName}'`,
                data: {
                    routeName,
                    entriesInvalidated: count,
                    invalidatedAt: new Date().toISOString()
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId,
                    user: req.user?.username || 'anonymous'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    code: 'CACHE_INVALIDATE_ERROR',
                    message: 'Failed to invalidate cache',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
        }
    };

    /**
     * Sanitize configuration by hiding sensitive data
     */
    private sanitizeConfig(config: AppConfig): any {
        return {
            ...config,
            security: {
                ...config.security,
                authentication: {
                    ...config.security.authentication,
                    jwtSecret: config.security.authentication.jwtSecret ? '[HIDDEN]' : undefined,
                    devToken: config.security.authentication.devToken ? '[HIDDEN]' : undefined,
                    basicCredentials: config.security.authentication.basicCredentials ? {
                        username: '[HIDDEN]',
                        password: '[HIDDEN]'
                    } : undefined
                }
            },
            proxy: {
                ...config.proxy,
                routes: Object.fromEntries(
                    Object.entries(config.proxy.routes).map(([key, route]) => [
                        key,
                        {
                            ...route,
                            auth: route.auth ? {
                                ...route.auth,
                                token: route.auth.token ? '[HIDDEN]' : undefined,
                                username: route.auth.username ? '[HIDDEN]' : undefined,
                                password: route.auth.password ? '[HIDDEN]' : undefined,
                                apiKeyValue: route.auth.apiKeyValue ? '[HIDDEN]' : undefined
                            } : undefined
                        }
                    ])
                )
            }
        };
    }

    /**
     * Detect changes between old and new configuration
     */
    private detectConfigChanges(oldConfig: AppConfig, newConfig: AppConfig): string[] {
        const changes: string[] = [];

        // Check server config changes
        if (oldConfig.server.port !== newConfig.server.port) {
            changes.push(`Server port changed: ${oldConfig.server.port} → ${newConfig.server.port}`);
        }
        if (oldConfig.server.adminEnabled !== newConfig.server.adminEnabled) {
            changes.push(`Admin enabled changed: ${oldConfig.server.adminEnabled} → ${newConfig.server.adminEnabled}`);
        }

        // Check security config changes
        if (oldConfig.security.authentication.enabled !== newConfig.security.authentication.enabled) {
            changes.push(`Authentication enabled changed: ${oldConfig.security.authentication.enabled} → ${newConfig.security.authentication.enabled}`);
        }
        if (oldConfig.security.authentication.type !== newConfig.security.authentication.type) {
            changes.push(`Authentication type changed: ${oldConfig.security.authentication.type} → ${newConfig.security.authentication.type}`);
        }

        // Check CORS changes
        const oldOrigins = oldConfig.security.cors.allowedOrigins.join(',');
        const newOrigins = newConfig.security.cors.allowedOrigins.join(',');
        if (oldOrigins !== newOrigins) {
            changes.push(`CORS origins changed`);
        }

        // Check rate limit changes
        if (oldConfig.security.rateLimit.maxRequests !== newConfig.security.rateLimit.maxRequests) {
            changes.push(`Rate limit max requests changed: ${oldConfig.security.rateLimit.maxRequests} → ${newConfig.security.rateLimit.maxRequests}`);
        }

        // Check proxy config changes
        if (oldConfig.proxy.enabled !== newConfig.proxy.enabled) {
            changes.push(`Proxy enabled changed: ${oldConfig.proxy.enabled} → ${newConfig.proxy.enabled}`);
        }

        const oldRoutes = Object.keys(oldConfig.proxy.routes).length;
        const newRoutes = Object.keys(newConfig.proxy.routes).length;
        if (oldRoutes !== newRoutes) {
            changes.push(`Proxy routes count changed: ${oldRoutes} → ${newRoutes}`);
        }

        // Check logging changes
        if (oldConfig.logging.level !== newConfig.logging.level) {
            changes.push(`Log level changed: ${oldConfig.logging.level} → ${newConfig.logging.level}`);
        }

        return changes;
    }

    /**
     * Format uptime in human-readable format
     */
    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return parts.join(' ');
    }

    /**
     * Determine overall health status based on system metrics
     */
    private determineHealthStatus(memoryStats: any, uptime: number): { status: string; message: string } {
        const memoryUsagePercent = (memoryStats.heapUsed / memoryStats.heapTotal) * 100;

        if (memoryUsagePercent > 90) {
            return {
                status: 'warning',
                message: 'High memory usage detected'
            };
        }

        if (uptime < 60) {
            return {
                status: 'starting',
                message: 'Server recently started'
            };
        }

        return {
            status: 'healthy',
            message: 'All systems operational'
        };
    }
}