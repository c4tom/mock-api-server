/**
 * Authentication Service for handling different authentication methods
 */

import jwt from 'jsonwebtoken';
import { AuthResult, UserInfo, JWTPayload, AuthService as IAuthService } from '../types/auth';
import { AuthenticationConfig } from '../types/config';

export class AuthService implements IAuthService {
    private authConfig: AuthenticationConfig;

    constructor(authConfig: AuthenticationConfig) {
        this.authConfig = authConfig;
    }

    /**
     * Validate JWT token
     */
    async validateJWT(token: string): Promise<AuthResult> {
        try {
            if (!this.authConfig.jwtSecret) {
                return {
                    valid: false,
                    error: 'JWT secret not configured'
                };
            }

            // Remove 'Bearer ' prefix if present
            const cleanToken = token.replace(/^Bearer\s+/i, '');

            const decoded = jwt.verify(cleanToken, this.authConfig.jwtSecret) as JWTPayload;

            const user: UserInfo = {
                id: decoded.sub,
                ...(decoded.username && { username: decoded.username }),
                ...(decoded.email && { email: decoded.email }),
                roles: decoded.roles || []
            };

            return {
                valid: true,
                user
            };
        } catch (error) {
            let errorMessage = 'Invalid JWT token';

            if (error instanceof jwt.TokenExpiredError) {
                errorMessage = 'JWT token has expired';
            } else if (error instanceof jwt.JsonWebTokenError) {
                errorMessage = 'Invalid JWT token format';
            } else if (error instanceof jwt.NotBeforeError) {
                errorMessage = 'JWT token not active yet';
            }

            return {
                valid: false,
                error: errorMessage
            };
        }
    }

    /**
     * Validate HTTP Basic authentication
     */
    async validateBasicAuth(credentials: string): Promise<AuthResult> {
        try {
            if (!this.authConfig.basicCredentials) {
                return {
                    valid: false,
                    error: 'Basic authentication credentials not configured'
                };
            }

            // Remove 'Basic ' prefix if present
            const cleanCredentials = credentials.replace(/^Basic\s+/i, '');

            // Decode base64 credentials
            const decoded = Buffer.from(cleanCredentials, 'base64').toString('utf-8');
            const [username, password] = decoded.split(':');

            if (!username || !password) {
                return {
                    valid: false,
                    error: 'Invalid Basic authentication format'
                };
            }

            // Validate against configured credentials
            const { username: configUsername, password: configPassword } = this.authConfig.basicCredentials;

            if (username === configUsername && password === configPassword) {
                const user: UserInfo = {
                    id: username,
                    username: username,
                    roles: ['user']
                };

                return {
                    valid: true,
                    user
                };
            }

            return {
                valid: false,
                error: 'Invalid username or password'
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Failed to validate Basic authentication'
            };
        }
    }

    /**
     * Validate development token
     */
    validateDevToken(token: string): boolean {
        if (!this.authConfig.devToken) {
            return false;
        }

        // Remove 'Bearer ' prefix if present
        const cleanToken = token.replace(/^Bearer\s+/i, '');

        return cleanToken === this.authConfig.devToken;
    }

    /**
     * Check if request has bypass header for development
     */
    checkBypass(headers: Record<string, string>): boolean {
        const bypassHeader = headers['x-dev-bypass'];

        // Accept any value for the bypass header in development mode
        return !!bypassHeader;
    }

    /**
     * Update authentication configuration
     */
    updateConfig(authConfig: AuthenticationConfig): void {
        this.authConfig = authConfig;
    }

    /**
     * Get current authentication configuration (without sensitive data)
     */
    getConfigInfo(): any {
        const info: any = {
            enabled: this.authConfig.enabled,
            type: this.authConfig.type
        };

        // Only include configured secrets as indicators
        if (this.authConfig.jwtSecret) {
            info.jwtSecret = '[CONFIGURED]';
        }

        if (this.authConfig.devToken) {
            info.devToken = '[CONFIGURED]';
        }

        if (this.authConfig.basicCredentials) {
            info.basicCredentials = {
                username: this.authConfig.basicCredentials.username,
                password: '[HIDDEN]'
            };
        }

        return info;
    }

    /**
     * Generate a sample JWT token for testing (development only)
     */
    generateSampleJWT(payload: Partial<JWTPayload> = {}): string | null {
        if (!this.authConfig.jwtSecret) {
            return null;
        }

        const defaultPayload: JWTPayload = {
            sub: 'test-user',
            username: 'testuser',
            email: 'test@example.com',
            roles: ['user'],
            ...payload
        };

        return jwt.sign(defaultPayload, this.authConfig.jwtSecret, {
            expiresIn: '1h'
        });
    }
}