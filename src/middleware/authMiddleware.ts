/**
 * Authentication middleware for handling different authentication methods
 */

import { Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthenticatedRequest } from '../types/middleware';
import { AuthenticationConfig } from '../types/config';

export class AuthMiddleware {
    private authService: AuthService;
    private authConfig: AuthenticationConfig;

    constructor(authConfig: AuthenticationConfig) {
        this.authConfig = authConfig;
        this.authService = new AuthService(authConfig);
    }

    /**
     * Main authentication middleware
     */
    authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Skip authentication if disabled
            if (!this.authConfig.enabled || this.authConfig.type === 'disabled') {
                return next();
            }

            // Check for bypass mode in development
            if (this.authConfig.type === 'bypass') {
                if (this.authService.checkBypass(req.headers as Record<string, string>)) {
                    req.user = {
                        id: 'bypass-user',
                        username: 'bypass',
                        roles: ['user']
                    };
                    return next();
                }
                // If bypass header not present, continue with normal auth
            }

            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return this.sendAuthError(res, 'Missing Authorization header', 401);
            }

            let authResult;

            switch (this.authConfig.type) {
                case 'jwt':
                    authResult = await this.authService.validateJWT(authHeader);
                    break;

                case 'basic':
                    authResult = await this.authService.validateBasicAuth(authHeader);
                    break;

                case 'dev-token':
                    const isValidDevToken = this.authService.validateDevToken(authHeader);
                    authResult = {
                        valid: isValidDevToken,
                        user: isValidDevToken ? {
                            id: 'dev-user',
                            username: 'developer',
                            roles: ['user', 'admin']
                        } : undefined,
                        error: isValidDevToken ? undefined : 'Invalid development token'
                    };
                    break;

                case 'bypass':
                    // Already handled above, but fallback to error
                    return this.sendAuthError(res, 'Bypass mode requires X-Dev-Bypass header', 401);

                default:
                    return this.sendAuthError(res, 'Unsupported authentication type', 500);
            }

            if (!authResult.valid) {
                return this.sendAuthError(res, authResult.error || 'Authentication failed', 401);
            }

            // Set user information on request
            if (authResult.user) {
                req.user = authResult.user;
            }
            next();

        } catch (error) {
            console.error('Authentication middleware error:', error);
            return this.sendAuthError(res, 'Internal authentication error', 500);
        }
    };

    /**
     * Middleware for admin-only endpoints
     */
    requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            return this.sendAuthError(res, 'Authentication required', 401);
        }

        if (!req.user.roles?.includes('admin')) {
            return this.sendAuthError(res, 'Admin access required', 403);
        }

        next();
    };

    /**
     * Optional authentication middleware (doesn't fail if no auth provided)
     */
    optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !this.authConfig.enabled) {
                return next();
            }

            // Try to authenticate, but don't fail if it doesn't work
            let authResult;

            switch (this.authConfig.type) {
                case 'jwt':
                    authResult = await this.authService.validateJWT(authHeader);
                    break;

                case 'basic':
                    authResult = await this.authService.validateBasicAuth(authHeader);
                    break;

                case 'dev-token':
                    const isValidDevToken = this.authService.validateDevToken(authHeader);
                    authResult = {
                        valid: isValidDevToken,
                        user: isValidDevToken ? {
                            id: 'dev-user',
                            username: 'developer',
                            roles: ['user', 'admin']
                        } : undefined
                    };
                    break;

                default:
                    return next();
            }

            if (authResult.valid && authResult.user) {
                req.user = authResult.user;
            }

            next();
        } catch (error) {
            // Log error but don't fail the request
            console.error('Optional authentication error:', error);
            next();
        }
    };

    /**
     * Update authentication configuration
     */
    updateConfig(authConfig: AuthenticationConfig): void {
        this.authConfig = authConfig;
        this.authService.updateConfig(authConfig);
    }

    /**
     * Send authentication error response
     */
    private sendAuthError(res: Response, message: string, statusCode: number): void {
        const suggestions = this.getAuthSuggestions();

        res.status(statusCode).json({
            error: {
                code: statusCode === 401 ? 'AUTHENTICATION_REQUIRED' : 'AUTHORIZATION_FAILED',
                message,
                timestamp: new Date().toISOString(),
                suggestions
            }
        });
    }

    /**
     * Get current authentication configuration info
     */
    getConfigInfo(): any {
        return this.authService.getConfigInfo();
    }

    /**
     * Get authentication suggestions based on current configuration
     */
    private getAuthSuggestions(): string[] {
        const suggestions: string[] = [];

        if (!this.authConfig.enabled) {
            suggestions.push('Authentication is currently disabled');
            return suggestions;
        }

        switch (this.authConfig.type) {
            case 'jwt':
                suggestions.push('Provide a valid JWT token in the Authorization header: "Bearer <token>"');
                if (this.authService.generateSampleJWT()) {
                    suggestions.push('For testing, you can generate a sample JWT using the /admin/sample-jwt endpoint');
                }
                break;

            case 'basic':
                suggestions.push('Provide Basic authentication credentials: "Basic <base64(username:password)>"');
                break;

            case 'dev-token':
                suggestions.push('Provide the development token: "Bearer <dev-token>"');
                suggestions.push('This mode is intended for development and AI Studio environments');
                break;

            case 'bypass':
                suggestions.push('Add the X-Dev-Bypass header to your request');
                suggestions.push('This mode is intended for development environments only');
                break;
        }

        return suggestions;
    }
}