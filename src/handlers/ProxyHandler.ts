/**
 * ProxyHandler - Handles CORS proxy functionality
 * Forwards requests to external APIs and adds appropriate CORS headers
 */

import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import { ProxyConfig, ProxyRoute, ProxyAuth, ValidationResult } from '../types';

export interface ProxyResponse {
    status: number;
    headers: Record<string, string>;
    data: any;
    responseTime: number;
}

export class ProxyHandler {
    private config: ProxyConfig;
    private allowedOrigins: string[];

    constructor(config: ProxyConfig, allowedOrigins: string[] = ['*']) {
        this.config = config;
        this.allowedOrigins = allowedOrigins;
    }

    /**
     * Handle proxy request - main entry point
     */
    async handleProxyRequest(req: Request, res: Response): Promise<void> {
        try {
            // Extract target URL from request
            const targetUrl = this.extractTargetUrl(req);

            // Validate target URL
            if (!this.validateTargetUrl(targetUrl)) {
                res.status(400).json({
                    error: {
                        code: 'INVALID_TARGET_URL',
                        message: 'Target URL is not allowed or is invalid',
                        suggestions: [
                            'Check if the domain is in the allowed domains list',
                            'Ensure the URL uses http or https protocol',
                            'Verify the URL format is correct'
                        ]
                    }
                });
                return;
            }

            // Forward the request
            const proxyResponse = await this.forwardRequest(targetUrl, req);

            // Add CORS headers
            this.addCorsHeaders(res, req.headers.origin);

            // Filter and set response headers
            const filteredHeaders = this.filterResponseHeaders(proxyResponse.headers);
            Object.entries(filteredHeaders).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            // Set response status and data
            res.status(proxyResponse.status);

            // Handle different content types
            if (typeof proxyResponse.data === 'string') {
                res.send(proxyResponse.data);
            } else {
                res.json(proxyResponse.data);
            }

        } catch (error) {
            this.handleProxyError(error, res, req);
        }
    }

    /**
     * Extract target URL from request
     */
    private extractTargetUrl(req: Request): string {
        // Check for direct URL parameter
        if (req.query['url']) {
            return req.query['url'] as string;
        }

        // Check for named route
        const routeName = req.params['route'];
        if (routeName && this.config.routes[routeName]) {
            const route = this.config.routes[routeName];
            const path = req.params[0] || ''; // Capture remaining path
            return this.buildTargetUrl(route, path, req.query);
        }

        throw new Error('No target URL specified');
    }

    /**
     * Build target URL from route configuration
     */
    private buildTargetUrl(route: ProxyRoute, path: string, query: any): string {
        let targetUrl = route.targetUrl;

        // Remove trailing slash from target URL
        if (targetUrl.endsWith('/')) {
            targetUrl = targetUrl.slice(0, -1);
        }

        // Apply path rewriting if configured
        let finalPath = path;
        if (route.pathRewrite) {
            Object.entries(route.pathRewrite).forEach(([pattern, replacement]) => {
                finalPath = finalPath.replace(new RegExp(pattern), replacement);
            });
        }

        // Ensure path starts with /
        if (finalPath && !finalPath.startsWith('/')) {
            finalPath = '/' + finalPath;
        }

        // Build final URL
        let url = targetUrl + finalPath;

        // Add query parameters
        const queryString = new URLSearchParams(query).toString();
        if (queryString) {
            url += '?' + queryString;
        }

        return url;
    }

    /**
     * Validate target URL against allowed/blocked domains
     */
    validateTargetUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);

            // Check protocol
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return false;
            }

            const hostname = parsedUrl.hostname;

            // Check blocked domains first
            if (this.config.blockedDomains.length > 0) {
                const isBlocked = this.config.blockedDomains.some(domain => {
                    return hostname === domain || hostname.endsWith('.' + domain);
                });
                if (isBlocked) {
                    return false;
                }
            }

            // Check allowed domains
            if (this.config.allowedDomains.length === 0) {
                return true; // No restrictions
            }

            return this.config.allowedDomains.some(domain => {
                return hostname === domain || hostname.endsWith('.' + domain);
            });

        } catch (error) {
            return false; // Invalid URL
        }
    }

    /**
     * Add CORS headers to response
     */
    addCorsHeaders(res: Response, origin?: string): void {
        // Determine allowed origin
        let allowedOrigin = '*';

        if (origin && this.allowedOrigins.length > 0 && !this.allowedOrigins.includes('*')) {
            if (this.allowedOrigins.includes(origin)) {
                allowedOrigin = origin;
            } else {
                allowedOrigin = 'null'; // Deny origin
            }
        } else if (origin && this.allowedOrigins.includes('*')) {
            allowedOrigin = origin;
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }

    /**
     * Forward request to target URL with retry logic
     */
    async forwardRequest(targetUrl: string, req: Request): Promise<ProxyResponse> {
        const startTime = Date.now();

        // Prepare headers
        const headers = this.filterRequestHeaders(req.headers);

        // Add authentication if configured
        const route = this.findRouteForUrl(targetUrl);
        if (route?.auth) {
            this.addAuthenticationHeaders(headers, route.auth);
        }

        // Add custom headers from route configuration
        if (route?.headers) {
            Object.assign(headers, route.headers);
        }

        // Execute request with retry logic
        return this.executeRequestWithRetry(targetUrl, req, headers, startTime);
    }

    /**
     * Execute request with exponential backoff retry logic
     */
    private async executeRequestWithRetry(
        targetUrl: string,
        req: Request,
        headers: Record<string, any>,
        startTime: number,
        attempt: number = 1
    ): Promise<ProxyResponse> {
        try {
            const response: AxiosResponse = await axios({
                method: req.method as any,
                url: targetUrl,
                headers,
                data: req.body,
                timeout: this.config.timeout,
                validateStatus: () => true, // Don't throw on HTTP error status
                maxRedirects: 5,
            });

            const responseTime = Date.now() - startTime;

            return {
                status: response.status,
                headers: response.headers as Record<string, string>,
                data: response.data,
                responseTime
            };

        } catch (error) {
            const shouldRetry = this.shouldRetryRequest(error, attempt);

            if (shouldRetry && attempt <= this.config.retries) {
                // Calculate exponential backoff delay
                const baseDelay = 1000; // 1 second
                const delay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
                const totalDelay = delay + jitter;

                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`Proxy request failed (attempt ${attempt}/${this.config.retries}), retrying in ${Math.round(totalDelay)}ms:`, errorMessage);

                // Wait before retry
                await this.sleep(totalDelay);

                // Retry the request
                return this.executeRequestWithRetry(targetUrl, req, headers, startTime, attempt + 1);
            }

            // Handle final error
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error(`Request timeout after ${this.config.timeout}ms`);
                }
                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error(`Unable to connect to ${targetUrl}`);
                }
                if (error.response) {
                    throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
                }
            }
            throw error;
        }
    }

    /**
     * Determine if a request should be retried based on the error
     */
    private shouldRetryRequest(error: any, attempt: number): boolean {
        if (attempt >= this.config.retries) {
            return false;
        }

        if (axios.isAxiosError(error)) {
            // Retry on network errors
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
                return true;
            }

            // Retry on timeout
            if (error.code === 'ECONNABORTED') {
                return true;
            }

            // Retry on 5xx server errors
            if (error.response && error.response.status >= 500) {
                return true;
            }

            // Retry on 429 (Too Many Requests)
            if (error.response && error.response.status === 429) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Find route configuration for a given URL
     */
    private findRouteForUrl(url: string): ProxyRoute | undefined {
        const parsedUrl = new URL(url);
        return Object.values(this.config.routes).find(route => {
            const routeUrl = new URL(route.targetUrl);
            return routeUrl.hostname === parsedUrl.hostname;
        });
    }

    /**
     * Add authentication headers based on route configuration
     */
    private addAuthenticationHeaders(headers: Record<string, any>, auth: ProxyAuth): void {
        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    headers['Authorization'] = `Bearer ${auth.token}`;
                }
                break;

            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;

            case 'apikey':
                if (auth.apiKeyHeader && auth.apiKeyValue) {
                    headers[auth.apiKeyHeader] = auth.apiKeyValue;
                }
                break;
        }
    }

    /**
     * Filter request headers to remove sensitive/problematic ones
     */
    private filterRequestHeaders(headers: any): Record<string, any> {
        const filtered: Record<string, any> = {};
        const blockedHeaders = [
            'host',
            'connection',
            'upgrade',
            'proxy-connection',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
            'transfer-encoding'
        ];

        Object.entries(headers).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if (!blockedHeaders.includes(lowerKey) && !lowerKey.startsWith('x-forwarded-')) {
                filtered[key] = value;
            }
        });

        return filtered;
    }

    /**
     * Filter response headers to remove sensitive/problematic ones
     */
    private filterResponseHeaders(headers: Record<string, string>): Record<string, string> {
        const filtered: Record<string, string> = {};
        const blockedHeaders = [
            'connection',
            'upgrade',
            'proxy-connection',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
            'transfer-encoding',
            'set-cookie', // Remove cookies for security
            'access-control-allow-origin', // We set our own CORS headers
            'access-control-allow-methods',
            'access-control-allow-headers',
            'access-control-allow-credentials',
            'access-control-max-age'
        ];

        Object.entries(headers).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if (!blockedHeaders.includes(lowerKey)) {
                filtered[key] = value;
            }
        });

        return filtered;
    }

    /**
     * Handle proxy errors
     */
    handleProxyError(error: any, res: Response, req?: Request): void {
        console.error('Proxy error:', error);

        // Add CORS headers even for errors
        if (req) {
            this.addCorsHeaders(res, req.headers.origin);
        }

        let statusCode = 500;
        let errorCode = 'PROXY_ERROR';
        let message = 'An error occurred while proxying the request';
        let suggestions: string[] = [];

        if (error.message) {
            if (error.message.includes('timeout')) {
                statusCode = 504;
                errorCode = 'PROXY_TIMEOUT';
                message = 'The target server did not respond within the timeout period';
                suggestions = [
                    'Try again later',
                    'Check if the target server is responding',
                    'Consider increasing the timeout configuration'
                ];
            } else if (error.message.includes('connect')) {
                statusCode = 502;
                errorCode = 'PROXY_CONNECTION_ERROR';
                message = 'Unable to connect to the target server';
                suggestions = [
                    'Check if the target URL is correct',
                    'Verify the target server is running',
                    'Check network connectivity'
                ];
            } else if (error.message.includes('INVALID_TARGET_URL')) {
                statusCode = 400;
                errorCode = 'INVALID_TARGET_URL';
                message = error.message;
            }
        }

        res.status(statusCode).json({
            error: {
                code: errorCode,
                message,
                timestamp: new Date().toISOString(),
                suggestions
            }
        });
    }

    /**
     * Update configuration
     */
    updateConfig(config: ProxyConfig, allowedOrigins: string[] = ['*']): void {
        this.config = config;
        this.allowedOrigins = allowedOrigins;
    }

    /**
     * Get current configuration
     */
    getConfig(): ProxyConfig {
        return { ...this.config };
    }

    /**
     * Validate proxy configuration
     */
    static validateConfig(config: Partial<ProxyConfig>): ValidationResult {
        if (!config) {
            return { valid: false, error: 'Configuration is required' };
        }

        if (config.timeout !== undefined && (config.timeout < 1000 || config.timeout > 60000)) {
            return { valid: false, error: 'Timeout must be between 1000ms and 60000ms' };
        }

        if (config.retries !== undefined && (config.retries < 0 || config.retries > 10)) {
            return { valid: false, error: 'Retries must be between 0 and 10' };
        }

        if (config.routes) {
            for (const [name, route] of Object.entries(config.routes)) {
                try {
                    new URL(route.targetUrl);
                } catch {
                    return { valid: false, error: `Invalid target URL for route '${name}': ${route.targetUrl}` };
                }
            }
        }

        return { valid: true };
    }
}