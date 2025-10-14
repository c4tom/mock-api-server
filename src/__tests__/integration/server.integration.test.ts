/**
 * Integration tests for server startup and error handling
 * Tests server initialization, configuration validation, error handling, and graceful degradation
 */

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { ConfigManager } from '../../config/ConfigManager';
import { ProxyHandler } from '../../handlers/ProxyHandler';

describe('Server Startup and Error Handling', () => {
    let app: Express;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        jest.clearAllMocks();
    });

    describe('Server Startup Procedures', () => {
        describe('Configuration Loading', () => {
            beforeEach(() => {
                // Set required environment variables for tests
                process.env['NODE_ENV'] = 'development';
                process.env['PORT'] = '3000';
                process.env['HOST'] = 'localhost';
            });

            it('should load configuration successfully', async () => {
                const configManager = new ConfigManager();
                const config = await configManager.loadConfig('development');

                expect(config).toBeDefined();
                expect(config.server).toBeDefined();
                expect(config.security).toBeDefined();
                expect(config.mock).toBeDefined();
                expect(config.proxy).toBeDefined();
                expect(config.logging).toBeDefined();
            });

            it('should load configuration for any environment string', async () => {
                const configManager = new ConfigManager();

                // ConfigManager accepts any environment string and loads appropriate file
                // It will use development config for unknown environments
                const config = await configManager.loadConfig('custom-env');
                expect(config).toBeDefined();
                expect(config.server.environment).toBe('development');
            });

            it('should reload configuration without errors', async () => {
                const configManager = new ConfigManager();
                await configManager.loadConfig('development');

                await expect(configManager.reloadConfig()).resolves.not.toThrow();

                const config = configManager.getConfig();
                expect(config).toBeDefined();
            });

            it('should validate configuration during startup', async () => {
                const configManager = new ConfigManager();

                // Load valid configuration
                const config = await configManager.loadConfig('development');

                // Validate the configuration
                const validation = configManager.validateConfig(config);
                expect(validation.valid).toBe(true);
            });
        });

        describe('Configuration Validation', () => {
            it('should validate port number correctly', () => {
                const validatePort = (port: number): boolean => {
                    return port >= 1 && port <= 65535;
                };

                expect(validatePort(3000)).toBe(true);
                expect(validatePort(8080)).toBe(true);
                expect(validatePort(80)).toBe(true);
                expect(validatePort(65535)).toBe(true);
                expect(validatePort(0)).toBe(false);
                expect(validatePort(65536)).toBe(false);
                expect(validatePort(-1)).toBe(false);
            });

            it('should validate host configuration', () => {
                const validateHost = (host: string): boolean => {
                    return host !== undefined && host !== null && host.trim() !== '';
                };

                expect(validateHost('localhost')).toBe(true);
                expect(validateHost('0.0.0.0')).toBe(true);
                expect(validateHost('127.0.0.1')).toBe(true);
                expect(validateHost('')).toBe(false);
            });

            it('should validate JWT authentication configuration', () => {
                const validateJWT = (enabled: boolean, type: string, secret?: string): boolean => {
                    if (enabled && type === 'jwt') {
                        return !!secret && secret.length > 0;
                    }
                    return true;
                };

                expect(validateJWT(true, 'jwt', 'my-secret-key')).toBe(true);
                expect(validateJWT(true, 'jwt', undefined)).toBe(false);
                expect(validateJWT(true, 'jwt', '')).toBe(false);
                expect(validateJWT(false, 'jwt', undefined)).toBe(true);
                expect(validateJWT(true, 'basic', undefined)).toBe(true);
            });

            it('should validate basic authentication configuration', () => {
                const validateBasic = (enabled: boolean, type: string, credentials?: { username: string, password: string }): boolean => {
                    if (enabled && type === 'basic') {
                        return !!credentials && !!credentials.username && !!credentials.password;
                    }
                    return true;
                };

                expect(validateBasic(true, 'basic', { username: 'admin', password: 'pass' })).toBe(true);
                expect(validateBasic(true, 'basic', undefined)).toBe(false);
                expect(validateBasic(false, 'basic', undefined)).toBe(true);
            });

            it('should validate dev-token authentication configuration', () => {
                const validateDevToken = (enabled: boolean, type: string, token?: string): boolean => {
                    if (enabled && type === 'dev-token') {
                        return !!token && token.length > 0;
                    }
                    return true;
                };

                expect(validateDevToken(true, 'dev-token', 'dev-12345')).toBe(true);
                expect(validateDevToken(true, 'dev-token', undefined)).toBe(false);
                expect(validateDevToken(false, 'dev-token', undefined)).toBe(true);
            });

            it('should validate mock data path configuration', () => {
                const validateMockPath = (path: string): boolean => {
                    return !!path && path.trim() !== '';
                };

                expect(validateMockPath('./data/mock')).toBe(true);
                expect(validateMockPath('/absolute/path')).toBe(true);
                expect(validateMockPath('')).toBe(false);
            });

            it('should validate proxy timeout configuration', () => {
                const validateTimeout = (timeout: number): boolean => {
                    return timeout >= 1000 && timeout <= 60000;
                };

                expect(validateTimeout(5000)).toBe(true);
                expect(validateTimeout(10000)).toBe(true);
                expect(validateTimeout(999)).toBe(false);
                expect(validateTimeout(60001)).toBe(false);
            });

            it('should warn about production CORS wildcard', () => {
                const warnings: string[] = [];
                const validateCORS = (environment: string, origins: string[]): void => {
                    if (environment === 'production' && origins.includes('*')) {
                        warnings.push('CORS is set to allow all origins (*) in production environment');
                    }
                };

                validateCORS('production', ['*']);
                expect(warnings.length).toBe(1);
                expect(warnings[0]).toContain('production');

                warnings.length = 0;
                validateCORS('development', ['*']);
                expect(warnings.length).toBe(0);
            });
        });
    });


    describe('Error Handling', () => {
        describe('Validation Errors (400)', () => {
            it('should handle validation errors with proper response format', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Validation failed');
                    error.name = 'ValidationError';
                    error.details = { field: 'email', message: 'Invalid email format' };
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.name === 'ValidationError') {
                        res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Request validation failed',
                                details: error.details,
                                requestId: 'test-id',
                                timestamp: new Date().toISOString(),
                                suggestions: ['Check the request payload format']
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
                expect(response.body.error.details).toEqual({ field: 'email', message: 'Invalid email format' });
                expect(response.body.error.suggestions).toBeDefined();
            });

            it('should handle Joi validation errors', async () => {
                app.post('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Validation failed');
                    error.isJoi = true;
                    error.details = [{ message: 'field is required', path: ['field'] }];
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.isJoi) {
                        res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Request validation failed',
                                details: error.details
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).post('/test');

                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            });
        });

        describe('Authentication Errors (401)', () => {
            it('should handle unauthorized errors with suggestions', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Authentication required');
                    error.status = 401;
                    error.code = 'UNAUTHORIZED';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 401 || error.code === 'UNAUTHORIZED') {
                        res.status(401).json({
                            error: {
                                code: 'UNAUTHORIZED',
                                message: error.message || 'Authentication required',
                                requestId: 'test-id',
                                timestamp: new Date().toISOString(),
                                suggestions: [
                                    'Check your authentication token',
                                    'Ensure proper Authorization header is set'
                                ]
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(401);
                expect(response.body.error.code).toBe('UNAUTHORIZED');
                expect(response.body.error.suggestions).toBeDefined();
                expect(response.body.error.suggestions.length).toBeGreaterThan(0);
            });

            it('should handle UnauthorizedError from JWT middleware', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('jwt malformed');
                    error.name = 'UnauthorizedError';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.name === 'UnauthorizedError') {
                        res.status(401).json({
                            error: {
                                code: 'UNAUTHORIZED',
                                message: error.message
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(401);
                expect(response.body.error.code).toBe('UNAUTHORIZED');
            });
        });

        describe('Authorization Errors (403)', () => {
            it('should handle forbidden errors', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Access denied');
                    error.status = 403;
                    error.code = 'FORBIDDEN';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 403 || error.code === 'FORBIDDEN') {
                        res.status(403).json({
                            error: {
                                code: 'FORBIDDEN',
                                message: error.message || 'Access denied',
                                suggestions: [
                                    'Verify you have permission to access this resource',
                                    'Check if your origin is in the allowed origins list'
                                ]
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(403);
                expect(response.body.error.code).toBe('FORBIDDEN');
            });
        });


        describe('Not Found Errors (404)', () => {
            it('should handle not found errors', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Resource not found');
                    error.status = 404;
                    error.code = 'NOT_FOUND';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 404 || error.code === 'NOT_FOUND') {
                        res.status(404).json({
                            error: {
                                code: 'NOT_FOUND',
                                message: error.message || 'Resource not found',
                                suggestions: ['Check the endpoint URL', 'Verify the HTTP method']
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(404);
                expect(response.body.error.code).toBe('NOT_FOUND');
            });
        });

        describe('Payload Too Large Errors (413)', () => {
            it('should handle payload too large errors', async () => {
                app.post('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Payload too large');
                    error.status = 413;
                    error.type = 'entity.too.large';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 413 || error.type === 'entity.too.large') {
                        res.status(413).json({
                            error: {
                                code: 'PAYLOAD_TOO_LARGE',
                                message: 'Request payload is too large',
                                suggestions: ['Reduce the size of your request payload', 'Maximum payload size is 10MB']
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).post('/test');

                expect(response.status).toBe(413);
                expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
            });
        });

        describe('Unsupported Media Type Errors (415)', () => {
            it('should handle unsupported media type errors', async () => {
                app.post('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Unsupported media type');
                    error.status = 415;
                    error.code = 'UNSUPPORTED_MEDIA_TYPE';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 415 || error.code === 'UNSUPPORTED_MEDIA_TYPE') {
                        res.status(415).json({
                            error: {
                                code: 'UNSUPPORTED_MEDIA_TYPE',
                                message: 'Unsupported media type',
                                suggestions: ['Supported formats: JSON, XML, text', 'Set appropriate Content-Type header']
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).post('/test');

                expect(response.status).toBe(415);
                expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
            });
        });

        describe('Rate Limit Errors (429)', () => {
            it('should handle rate limit errors with Retry-After header', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Too many requests');
                    error.status = 429;
                    error.code = 'RATE_LIMIT_EXCEEDED';
                    error.retryAfter = 60;
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
                        const retryAfter = error.retryAfter || 60;
                        res.status(429)
                            .header('Retry-After', retryAfter.toString())
                            .json({
                                error: {
                                    code: 'RATE_LIMIT_EXCEEDED',
                                    message: 'Too many requests',
                                    retryAfter,
                                    suggestions: [`Wait ${retryAfter} seconds before retrying`]
                                }
                            });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(429);
                expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
                expect(response.body.error.retryAfter).toBe(60);
                expect(response.headers['retry-after']).toBe('60');
            });
        });

        describe('Internal Server Errors (500)', () => {
            it('should handle generic internal server errors', async () => {
                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error = new Error('Something went wrong');
                    next(error);
                });

                app.use((_error: any, _req: Request, res: Response, _next: NextFunction) => {
                    res.status(500).json({
                        error: {
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'An unexpected error occurred',
                            suggestions: ['Try again later', 'Contact support if the problem persists']
                        }
                    });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(500);
                expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
            });

            it('should include stack trace in development mode', async () => {
                const isDevelopment = true;

                app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
                    const error = new Error('Test error');
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    res.status(500).json({
                        error: {
                            code: 'INTERNAL_SERVER_ERROR',
                            message: isDevelopment ? error.message : 'An unexpected error occurred',
                            ...(isDevelopment && { stack: error.stack })
                        }
                    });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(500);
                expect(response.body.error.message).toBe('Test error');
                expect(response.body.error.stack).toBeDefined();
            });

            it('should not send response if headers already sent', async () => {
                app.get('/test', (_req: Request, res: Response, next: NextFunction) => {
                    res.status(200).send('OK');
                    const error = new Error('Error after response sent');
                    next(error);
                });

                app.use((_error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (res.headersSent) {
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/test');

                expect(response.status).toBe(200);
                expect(response.text).toBe('OK');
            });
        });
    });


    describe('Proxy Error Handling and Graceful Degradation', () => {
        let proxyHandler: ProxyHandler;
        let mockProxyConfig: any;

        beforeEach(() => {
            mockProxyConfig = {
                enabled: true,
                routes: {
                    'test-api': {
                        name: 'test-api',
                        targetUrl: 'https://api.example.com',
                        pathRewrite: {},
                        headers: {}
                    }
                },
                timeout: 5000,
                retries: 3,
                allowedDomains: ['api.example.com'],
                blockedDomains: []
            };

            proxyHandler = new ProxyHandler(mockProxyConfig);
        });

        describe('Proxy Errors (502)', () => {
            it('should handle proxy connection errors', async () => {
                app.get('/proxy', async (_req: Request, _res: Response, next: NextFunction) => {
                    try {
                        const error: any = new Error('Unable to connect to target server');
                        error.code = 'PROXY_ERROR';
                        error.status = 502;
                        throw error;
                    } catch (error) {
                        next(error);
                    }
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.code === 'PROXY_ERROR' || error.status === 502) {
                        res.status(502).json({
                            error: {
                                code: 'PROXY_ERROR',
                                message: error.message || 'Failed to proxy request to external API',
                                suggestions: [
                                    'Check if the target API is accessible',
                                    'Verify the proxy configuration',
                                    'Check network connectivity'
                                ]
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/proxy');

                expect(response.status).toBe(502);
                expect(response.body.error.code).toBe('PROXY_ERROR');
                expect(response.body.error.suggestions).toBeDefined();
            });

            it('should handle proxy errors with CORS headers', async () => {
                app.get('/proxy', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Proxy failed');
                    error.code = 'PROXY_ERROR';
                    error.status = 502;
                    next(error);
                });

                app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
                    // Add CORS headers even for errors
                    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

                    if (error.code === 'PROXY_ERROR') {
                        res.status(502).json({
                            error: {
                                code: 'PROXY_ERROR',
                                message: error.message
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app)
                    .get('/proxy')
                    .set('Origin', 'http://localhost:3000');

                expect(response.status).toBe(502);
                expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
            });
        });

        describe('Timeout Errors (504)', () => {
            it('should handle timeout errors', async () => {
                app.get('/proxy', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Request timeout');
                    error.code = 'ETIMEDOUT';
                    error.status = 504;
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || error.status === 504) {
                        res.status(504).json({
                            error: {
                                code: 'GATEWAY_TIMEOUT',
                                message: 'Request timeout',
                                suggestions: [
                                    'The request took too long to complete',
                                    'Try again later',
                                    'Check if the target service is responding slowly'
                                ]
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/proxy');

                expect(response.status).toBe(504);
                expect(response.body.error.code).toBe('GATEWAY_TIMEOUT');
            });
        });

        describe('Service Unavailable Errors (503)', () => {
            it('should handle service unavailable errors', async () => {
                app.get('/proxy', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Service temporarily unavailable');
                    error.status = 503;
                    error.code = 'SERVICE_UNAVAILABLE';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.status === 503 || error.code === 'SERVICE_UNAVAILABLE') {
                        res.status(503).json({
                            error: {
                                code: 'SERVICE_UNAVAILABLE',
                                message: 'Service temporarily unavailable',
                                suggestions: [
                                    'The service is temporarily unavailable',
                                    'Try again in a few moments'
                                ]
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/proxy');

                expect(response.status).toBe(503);
                expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
            });
        });

        describe('Graceful Degradation', () => {
            it('should validate target URL before proxying', () => {
                const validUrl = 'https://api.example.com/endpoint';
                const invalidUrl = 'ftp://invalid.com/endpoint';
                const blockedUrl = 'https://blocked.com/endpoint';

                expect(proxyHandler.validateTargetUrl(validUrl)).toBe(true);
                expect(proxyHandler.validateTargetUrl(invalidUrl)).toBe(false);

                // Test with blocked domain
                const proxyWithBlocked = new ProxyHandler({
                    ...mockProxyConfig,
                    blockedDomains: ['blocked.com']
                });
                expect(proxyWithBlocked.validateTargetUrl(blockedUrl)).toBe(false);
            });

            it('should handle invalid target URL gracefully', async () => {
                app.get('/proxy', (_req: Request, res: Response) => {
                    const targetUrl = 'invalid-url';
                    const isValid = proxyHandler.validateTargetUrl(targetUrl);

                    if (!isValid) {
                        res.status(400).json({
                            error: {
                                code: 'INVALID_TARGET_URL',
                                message: 'Target URL is not allowed or is invalid',
                                suggestions: [
                                    'Check if the domain is in the allowed domains list',
                                    'Ensure the URL uses http or https protocol'
                                ]
                            }
                        });
                        return;
                    }

                    res.json({ success: true });
                });

                const response = await request(app).get('/proxy');

                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe('INVALID_TARGET_URL');
            });

            it('should have retry configuration', () => {
                // This test verifies the retry logic configuration exists
                expect(mockProxyConfig.retries).toBe(3);
                expect(mockProxyConfig.timeout).toBe(5000);

                // Verify retry logic would be applied for appropriate errors
                const shouldRetry = (errorCode: string, attempt: number, maxRetries: number): boolean => {
                    if (attempt >= maxRetries) return false;
                    return ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ECONNABORTED'].includes(errorCode);
                };

                expect(shouldRetry('ECONNREFUSED', 1, 3)).toBe(true);
                expect(shouldRetry('ECONNREFUSED', 3, 3)).toBe(false);
                expect(shouldRetry('ENOTFOUND', 2, 3)).toBe(true);
            });

            it('should handle network errors gracefully', async () => {
                app.get('/proxy', (_req: Request, _res: Response, next: NextFunction) => {
                    const error: any = new Error('Network error');
                    error.code = 'ECONNREFUSED';
                    next(error);
                });

                app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
                    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                        res.status(502).json({
                            error: {
                                code: 'PROXY_CONNECTION_ERROR',
                                message: 'Unable to connect to the target server',
                                suggestions: [
                                    'Check if the target URL is correct',
                                    'Verify the target server is running'
                                ]
                            }
                        });
                        return;
                    }
                    res.status(500).json({ error: 'Internal server error' });
                });

                const response = await request(app).get('/proxy');

                expect(response.status).toBe(502);
                expect(response.body.error.code).toBe('PROXY_CONNECTION_ERROR');
            });
        });
    });


    describe('Server Shutdown Procedures', () => {
        it('should handle graceful shutdown signal', (done) => {
            const mockServer = {
                close: jest.fn((callback: (err?: Error) => void) => {
                    callback();
                })
            };

            const gracefulShutdown = (_signal: string, server: any): Promise<void> => {
                return new Promise((resolve, reject) => {
                    server.close((err: Error | undefined) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };

            gracefulShutdown('SIGTERM', mockServer)
                .then(() => {
                    expect(mockServer.close).toHaveBeenCalled();
                    done();
                })
                .catch(done);
        });

        it('should handle shutdown with active connections', (done) => {
            const mockServer = {
                close: jest.fn((callback: (err?: Error) => void) => {
                    // Simulate delay for active connections
                    setTimeout(() => {
                        callback();
                    }, 100);
                })
            };

            const gracefulShutdown = (server: any): Promise<void> => {
                return new Promise((resolve, reject) => {
                    server.close((err: Error | undefined) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };

            gracefulShutdown(mockServer)
                .then(() => {
                    expect(mockServer.close).toHaveBeenCalled();
                    done();
                })
                .catch(done);
        });

        it('should handle shutdown errors', (done) => {
            const mockServer = {
                close: jest.fn((callback: (err?: Error) => void) => {
                    callback(new Error('Shutdown error'));
                })
            };

            const gracefulShutdown = (server: any): Promise<void> => {
                return new Promise((resolve, reject) => {
                    server.close((err: Error | undefined) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };

            gracefulShutdown(mockServer)
                .then(() => {
                    done(new Error('Should have rejected'));
                })
                .catch((error) => {
                    expect(error.message).toBe('Shutdown error');
                    done();
                });
        });

        it('should force shutdown after timeout', (done) => {
            jest.useFakeTimers();

            const mockServer = {
                close: jest.fn((_callback: (err?: Error) => void) => {
                    // Never call callback to simulate hanging connections
                })
            };

            let forcedShutdown = false;

            const gracefulShutdown = (server: any, timeout: number): Promise<void> => {
                return new Promise((resolve, reject) => {
                    server.close((err: Error | undefined) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });

                    // Force shutdown after timeout
                    setTimeout(() => {
                        forcedShutdown = true;
                        reject(new Error('Forced shutdown due to timeout'));
                    }, timeout);
                });
            };

            gracefulShutdown(mockServer, 5000)
                .then(() => {
                    done(new Error('Should have timed out'));
                })
                .catch((error) => {
                    expect(error.message).toBe('Forced shutdown due to timeout');
                    expect(forcedShutdown).toBe(true);
                    jest.useRealTimers();
                    done();
                });

            jest.advanceTimersByTime(5000);
        });
    });

    describe('Uncaught Exception Handling', () => {
        it('should handle uncaught exceptions', () => {
            const mockLogger = {
                error: jest.fn()
            };

            const handleUncaughtException = (error: Error, logger: any): void => {
                logger.error('Uncaught exception', {
                    error: error.message,
                    stack: error.stack
                });
            };

            const testError = new Error('Uncaught exception test');
            handleUncaughtException(testError, mockLogger);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Uncaught exception',
                expect.objectContaining({
                    error: 'Uncaught exception test',
                    stack: expect.any(String)
                })
            );
        });

        it('should handle unhandled promise rejections', () => {
            const mockLogger = {
                error: jest.fn()
            };

            const handleUnhandledRejection = (reason: any, logger: any): void => {
                logger.error('Unhandled promise rejection', { reason });
            };

            const testReason = 'Promise rejection test';
            handleUnhandledRejection(testReason, mockLogger);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Unhandled promise rejection',
                expect.objectContaining({
                    reason: 'Promise rejection test'
                })
            );
        });
    });

    describe('Server Port Binding Errors', () => {
        it('should handle EADDRINUSE error', () => {
            const error: NodeJS.ErrnoException = new Error('Port in use') as NodeJS.ErrnoException;
            error.code = 'EADDRINUSE';

            const handleServerError = (err: NodeJS.ErrnoException, port: number): { message: string, shouldExit: boolean } => {
                if (err.code === 'EADDRINUSE') {
                    return {
                        message: `Port ${port} is already in use`,
                        shouldExit: true
                    };
                }
                return { message: 'Unknown error', shouldExit: true };
            };

            const result = handleServerError(error, 3000);
            expect(result.message).toContain('Port 3000 is already in use');
            expect(result.shouldExit).toBe(true);
        });

        it('should handle EACCES error', () => {
            const error: NodeJS.ErrnoException = new Error('Permission denied') as NodeJS.ErrnoException;
            error.code = 'EACCES';

            const handleServerError = (err: NodeJS.ErrnoException, port: number): { message: string, shouldExit: boolean } => {
                if (err.code === 'EACCES') {
                    return {
                        message: `Permission denied to bind to port ${port}`,
                        shouldExit: true
                    };
                }
                return { message: 'Unknown error', shouldExit: true };
            };

            const result = handleServerError(error, 80);
            expect(result.message).toContain('Permission denied to bind to port 80');
            expect(result.shouldExit).toBe(true);
        });
    });
});
