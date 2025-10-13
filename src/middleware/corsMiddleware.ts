/**
 * CORS middleware for origin validation and header management
 */

import { Request, Response, NextFunction } from 'express';
import { CorsConfig } from '../types/config';

export class CorsMiddleware {
    private corsConfig: CorsConfig;

    constructor(corsConfig: CorsConfig) {
        this.corsConfig = corsConfig;
    }

    /**
     * CORS origin validation middleware
     */
    validateOrigin = (req: Request, res: Response, next: NextFunction): void => {
        const origin = req.headers.origin;
        const referer = req.headers.referer;

        // Allow requests without origin (direct API calls, server-to-server)
        if (!origin && !referer) {
            this.addCorsHeaders(res, '*');
            return next();
        }

        // Check if all origins are allowed (development mode)
        if (this.corsConfig.allowedOrigins.includes('*')) {
            this.addCorsHeaders(res, origin || '*');
            return next();
        }

        // Validate origin against allowed list
        const requestOrigin = origin || this.extractOriginFromReferer(referer);

        if (!requestOrigin) {
            return this.sendCorsError(res, 'Unable to determine request origin');
        }

        const isAllowed = this.isOriginAllowed(requestOrigin);

        if (!isAllowed) {
            return this.sendCorsError(res, `Origin '${requestOrigin}' is not allowed`);
        }

        this.addCorsHeaders(res, requestOrigin);
        next();
    };

    /**
     * Handle preflight OPTIONS requests
     */
    handlePreflight = (req: Request, res: Response, next: NextFunction): void => {
        if (req.method === 'OPTIONS') {
            const origin = req.headers.origin;

            // Add preflight-specific headers
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers',
                'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Dev-Bypass, X-API-Key'
            );
            res.header('Access-Control-Max-Age', '86400'); // 24 hours

            // Set appropriate origin
            if (this.corsConfig.allowedOrigins.includes('*')) {
                this.addCorsHeaders(res, origin || '*');
            } else if (origin && this.isOriginAllowed(origin)) {
                this.addCorsHeaders(res, origin);
            } else {
                this.addCorsHeaders(res, 'null');
            }

            return res.status(204).end();
        }

        next();
    };

    /**
     * Add CORS headers to response
     */
    addCorsHeaders(res: Response, origin: string): void {
        res.header('Access-Control-Allow-Origin', origin);

        if (this.corsConfig.allowCredentials) {
            res.header('Access-Control-Allow-Credentials', 'true');
        }

        // Add common CORS headers
        res.header('Access-Control-Expose-Headers',
            'Content-Length, Content-Type, X-Request-ID, X-Response-Time'
        );
    }

    /**
     * Check if origin is allowed
     */
    private isOriginAllowed(origin: string): boolean {
        // Exact match
        if (this.corsConfig.allowedOrigins.includes(origin)) {
            return true;
        }

        // Wildcard match
        return this.corsConfig.allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin.includes('*')) {
                const pattern = allowedOrigin.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(origin);
            }
            return false;
        });
    }

    /**
     * Extract origin from referer header
     */
    private extractOriginFromReferer(referer?: string): string | null {
        if (!referer) {
            return null;
        }

        try {
            const url = new URL(referer);
            return `${url.protocol}//${url.host}`;
        } catch {
            return null;
        }
    }

    /**
     * Send CORS error response
     */
    private sendCorsError(res: Response, message: string): void {
        res.status(403).json({
            error: {
                code: 'CORS_ORIGIN_NOT_ALLOWED',
                message,
                timestamp: new Date().toISOString(),
                suggestions: [
                    'Check that your origin is included in the CORS_ORIGINS configuration',
                    'For development, you can set CORS_ORIGINS=* to allow all origins',
                    'Ensure your request includes the correct Origin header'
                ]
            }
        });
    }

    /**
     * Update CORS configuration
     */
    updateConfig(corsConfig: CorsConfig): void {
        this.corsConfig = corsConfig;
    }

    /**
     * Get current CORS configuration info
     */
    getConfigInfo(): CorsConfig {
        return { ...this.corsConfig };
    }
}