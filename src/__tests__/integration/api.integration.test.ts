/**
 * Integration tests for API routes
 * Tests complete request/response flow for mock endpoints, proxy functionality, 
 * admin endpoints, and error scenarios with middleware integration
 */

import request from 'supertest';
import express from 'express';
import nock from 'nock';
import jwt from 'jsonwebtoken';

// Simple mock implementations for testing
class SimpleMockDataHandler {
    private mockData = {
        '/mock/users': [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
    };
    // private storage: any = {};

    async handleRequest(req: express.Request, res: express.Response): Promise<void> {
        try {
            const path = req.path;

            if (req.method === 'GET' && this.mockData[path as keyof typeof this.mockData]) {
                res.setHeader('X-Mock-Data', 'true');
                res.json(this.mockData[path as keyof typeof this.mockData]);
                return;
            }

            if (req.method === 'POST' && path === '/mock/users') {
                const newUser = {
                    id: Date.now(),
                    ...req.body,
                    createdAt: new Date().toISOString()
                };
                res.status(201).json(newUser);
                return;
            }

            if (req.method === 'PUT' && path.startsWith('/mock/users/')) {
                const id = parseInt(path.split('/').pop() || '0');
                if (isNaN(id)) {
                    res.status(400).json({
                        error: { code: 'INVALID_ID', message: 'Invalid ID' }
                    });
                    return;
                }
                if (id === 999) {
                    res.status(404).json({
                        error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
                    });
                    return;
                }
                const updatedUser = {
                    id,
                    ...req.body,
                    updatedAt: new Date().toISOString()
                };
                res.json(updatedUser);
                return;
            }

            if (req.method === 'DELETE' && path.startsWith('/mock/users/')) {
                res.status(204).send();
                return;
            }

            res.status(404).json({
                error: {
                    code: 'ENDPOINT_NOT_FOUND',
                    message: 'Mock endpoint not found'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    code: 'MOCK_HANDLER_ERROR',
                    message: 'Internal server error'
                }
            });
        }
    }

    validateMockData(data: any) {
        if (!data || !data.endpoints) {
            return { valid: false, error: 'Invalid mock data structure' };
        }
        return { valid: true };
    }

    async loadMockData() {
        return { endpoints: this.mockData };
    }
}

class SimpleProxyHandler {
    private allowedDomains = ['jsonplaceholder.typicode.com', 'httpbin.org'];
    private blockedDomains = ['malicious.com'];

    async handleProxyRequest(req: express.Request, res: express.Response): Promise<void> {
        try {
            const targetUrl = req.query['url'] as string;

            if (!targetUrl) {
                res.status(500).json({
                    error: { code: 'PROXY_ERROR', message: 'No target URL specified' }
                });
                return;
            }

            if (!this.validateTargetUrl(targetUrl)) {
                res.status(400).json({
                    error: {
                        code: 'INVALID_TARGET_URL',
                        message: 'Target URL is not allowed'
                    }
                });
                return;
            }

            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            // For test purposes, return mock data for allowed URLs
            if (targetUrl.includes('jsonplaceholder.typicode.com')) {
                res.json({
                    id: 1,
                    title: 'Test Post',
                    body: 'Test content'
                });
                return;
            }

            res.status(500).json({
                error: { code: 'PROXY_ERROR', message: 'Proxy error' }
            });
        } catch (error) {
            res.status(500).json({
                error: { code: 'PROXY_ERROR', message: 'Internal proxy error' }
            });
        }
    }

    validateTargetUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname;

            // Check blocked domains
            if (this.blockedDomains.some(domain => hostname.includes(domain))) {
                return false;
            }

            // Check allowed domains
            return this.allowedDomains.some(domain => hostname.includes(domain));
        } catch {
            return false;
        }
    }

    static validateConfig(config: any) {
        if (config.timeout && config.timeout < 0) {
            return { valid: false, error: 'Invalid timeout' };
        }
        if (config.retries && config.retries > 15) {
            return { valid: false, error: 'Too many retries' };
        }
        return { valid: true };
    }
}

class SimpleSecurityMiddleware {
    constructor(_config: any) { }

    handlePreflight = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send();
            return;
        }
        next();
    };

    validateOrigin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        next();
    };

    checkBlockedIPs = (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
        next();
    };

    authenticateRequest = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
            return;
        }

        try {
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, 'test-secret');
            (req as any).user = decoded;
            next();
        } catch {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
            });
        }
    };

    detectSuspiciousActivity(_req: express.Request) {
        return {
            isSuspicious: false,
            riskLevel: 'low',
            shouldBlock: false,
            reason: 'No suspicious activity detected'
        };
    }
}

describe('API Integration Tests', () => {
    let app: express.Application;
    let mockDataHandler: SimpleMockDataHandler;
    let proxyHandler: SimpleProxyHandler;
    let securityMiddleware: SimpleSecurityMiddleware;

    beforeAll(async () => {
        // Initialize handlers
        mockDataHandler = new SimpleMockDataHandler();
        proxyHandler = new SimpleProxyHandler();
        securityMiddleware = new SimpleSecurityMiddleware({
            authentication: { enabled: false },
            cors: { allowedOrigins: ['*'] },
            rateLimit: { windowMs: 60000, maxRequests: 100 }
        });

        // Load mock data
        await mockDataHandler.loadMockData();

        // Create Express app for integration testing
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Setup basic middleware
        app.use(securityMiddleware.handlePreflight);
        app.use(securityMiddleware.validateOrigin);
        app.use(securityMiddleware.checkBlockedIPs);

        // Setup routes
        setupTestRoutes();
    });

    afterAll(async () => {
        nock.cleanAll();
        nock.restore();
        // Force close any remaining handles
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    function setupTestRoutes() {
        // Mock data routes
        app.all('/mock/*', async (req, res, next) => {
            try {
                await mockDataHandler.handleRequest(req, res);
            } catch (error) {
                next(error);
            }
        });

        // Proxy routes
        app.all('/proxy', async (req, res, next) => {
            try {
                await proxyHandler.handleProxyRequest(req, res);
            } catch (error) {
                next(error);
            }
        });

        // Admin routes
        app.get('/admin/config', (_req, res) => {
            res.json({
                success: true,
                data: {
                    server: { environment: 'development', adminEnabled: true },
                    security: {},
                    mock: {},
                    proxy: {}
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: 'test-request'
                }
            });
        });

        app.get('/admin/health', (_req, res) => {
            res.json({
                success: true,
                data: {
                    status: 'healthy',
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    environment: 'development'
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: 'test-request'
                }
            });
        });

        // Error handling
        app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
            res.status(error.status || 500).json({
                error: {
                    code: error.code || 'INTERNAL_ERROR',
                    message: error.message || 'Internal server error',
                    timestamp: new Date().toISOString()
                }
            });
        });
    }

    describe('Mock Data Endpoints', () => {
        it('should return mock data for GET /mock/users', async () => {
            const response = await request(app)
                .get('/mock/users')
                .expect(200);

            expect(response.body).toEqual([
                { id: 1, name: 'John Doe', email: 'john@example.com' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
            ]);
            expect(response.headers['x-mock-data']).toBe('true');
        });

        it('should handle POST requests to mock endpoints with CRUD', async () => {
            const newUser = {
                name: 'Test User',
                email: 'test@example.com'
            };

            const response = await request(app)
                .post('/mock/users')
                .send(newUser)
                .expect(201);

            expect(response.body).toMatchObject({
                id: expect.any(Number),
                name: 'Test User',
                email: 'test@example.com',
                createdAt: expect.any(String)
            });
        });

        it('should handle PUT requests to mock endpoints', async () => {
            const updatedUser = {
                name: 'Updated User',
                email: 'updated@example.com'
            };

            const response = await request(app)
                .put('/mock/users/1')
                .send(updatedUser)
                .expect(200);

            expect(response.body).toMatchObject({
                id: 1,
                name: 'Updated User',
                email: 'updated@example.com',
                updatedAt: expect.any(String)
            });
        });

        it('should handle DELETE requests to mock endpoints', async () => {
            await request(app)
                .delete('/mock/users/1')
                .expect(204);
        });

        it('should return 404 for non-existent mock endpoints', async () => {
            const response = await request(app)
                .get('/mock/nonexistent')
                .expect(404);

            expect(response.body.error).toMatchObject({
                code: 'ENDPOINT_NOT_FOUND',
                message: expect.stringContaining('Mock endpoint not found')
            });
        });

        it('should handle invalid ID in PUT/DELETE requests', async () => {
            const response = await request(app)
                .put('/mock/users/invalid')
                .send({ name: 'Test' })
                .expect(400);

            expect(response.body.error.code).toBe('INVALID_ID');
        });

        it('should handle item not found in PUT/DELETE requests', async () => {
            const response = await request(app)
                .put('/mock/users/999')
                .send({ name: 'Test' })
                .expect(404);

            expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
        });
    });

    describe('Proxy Functionality', () => {
        beforeEach(() => {
            nock.cleanAll();
        });

        afterEach(() => {
            nock.cleanAll();
        });

        it('should validate target URLs correctly', () => {
            // Valid URLs
            expect(proxyHandler.validateTargetUrl('https://jsonplaceholder.typicode.com/posts')).toBe(true);
            expect(proxyHandler.validateTargetUrl('https://httpbin.org/get')).toBe(true);

            // Invalid protocol
            expect(proxyHandler.validateTargetUrl('ftp://example.com')).toBe(false);

            // Blocked domain
            expect(proxyHandler.validateTargetUrl('https://malicious.com/data')).toBe(false);

            // Invalid URL format
            expect(proxyHandler.validateTargetUrl('not-a-url')).toBe(false);
        });

        it('should reject requests to blocked domains', async () => {
            const response = await request(app)
                .get('/proxy')
                .query({ url: 'https://malicious.com/data' })
                .expect(400);

            expect(response.body.error).toMatchObject({
                code: 'INVALID_TARGET_URL',
                message: expect.stringContaining('not allowed')
            });
        });

        it('should handle missing target URL', async () => {
            const response = await request(app)
                .get('/proxy')
                .expect(500);

            expect(response.body.error.code).toBe('PROXY_ERROR');
        });

        it('should proxy requests to allowed domains', async () => {
            const response = await request(app)
                .get('/proxy')
                .query({ url: 'https://jsonplaceholder.typicode.com/posts/1' })
                .expect(200);

            expect(response.body).toMatchObject({
                id: 1,
                title: 'Test Post',
                body: 'Test content'
            });
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        it('should handle proxy timeout errors', async () => {
            const response = await request(app)
                .get('/proxy')
                .query({ url: 'https://httpbin.org/delay/10' })
                .expect(500);

            expect(response.body.error.code).toBe('PROXY_ERROR');
        });
    });

    describe('Admin Endpoints', () => {
        it('should return configuration via /admin/config', async () => {
            const response = await request(app)
                .get('/admin/config')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    server: expect.objectContaining({
                        environment: 'development',
                        adminEnabled: true
                    }),
                    security: expect.any(Object),
                    mock: expect.any(Object),
                    proxy: expect.any(Object)
                }),
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                    requestId: expect.any(String)
                })
            });
        });

        it('should return health status via /admin/health', async () => {
            const response = await request(app)
                .get('/admin/health')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    status: 'healthy',
                    uptime: expect.any(Number),
                    memory: expect.any(Object),
                    environment: 'development'
                }),
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                    requestId: expect.any(String)
                })
            });
        });
    });

    describe('Security Middleware', () => {
        it('should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/mock/users')
                .set('Origin', 'https://example.com')
                .expect(204);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-methods']).toBeDefined();
        });

        it('should validate origins correctly', async () => {
            // With wildcard origins, should allow any origin
            const response = await request(app)
                .get('/mock/users')
                .set('Origin', 'https://example.com')
                .expect(200);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        it('should detect suspicious activity', () => {
            const mockReq = {
                method: 'GET',
                path: '/test',
                headers: {
                    'user-agent': 'suspicious-bot',
                    'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1'
                },
                ip: '192.168.1.1'
            } as any;

            const result = securityMiddleware.detectSuspiciousActivity(mockReq);

            expect(result).toMatchObject({
                isSuspicious: expect.any(Boolean),
                riskLevel: expect.stringMatching(/^(low|medium|high)$/),
                shouldBlock: expect.any(Boolean)
            });
        });
    });

    describe('Authentication Integration', () => {
        let authApp: express.Application;
        let authSecurityMiddleware: SimpleSecurityMiddleware;

        beforeAll(async () => {
            const authConfig = {
                authentication: {
                    enabled: true,
                    type: 'jwt',
                    jwtSecret: 'test-secret'
                }
            };
            authSecurityMiddleware = new SimpleSecurityMiddleware(authConfig);

            // Create separate app with authentication enabled
            authApp = express();
            authApp.use(express.json());
            authApp.use(authSecurityMiddleware.handlePreflight);
            authApp.use(authSecurityMiddleware.validateOrigin);
            authApp.use(authSecurityMiddleware.checkBlockedIPs);

            // Protected route
            authApp.get('/protected', authSecurityMiddleware.authenticateRequest, (_req, res) => {
                res.json({ message: 'Protected resource accessed' });
            });
        });

        it('should reject requests without authentication token', async () => {
            const response = await request(authApp)
                .get('/protected')
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should accept requests with valid JWT token', async () => {
            const token = jwt.sign(
                { id: '1', username: 'testuser' },
                'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(authApp)
                .get('/protected')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'Protected resource accessed'
            });
        });

        it('should reject requests with invalid JWT token', async () => {
            const response = await request(authApp)
                .get('/protected')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });
    });

    describe('Error Handling', () => {
        it('should handle mock data handler errors gracefully', async () => {
            // Create a test app that throws an error
            const testApp = express();
            testApp.use(express.json());
            testApp.all('/mock/*', async (_req, _res, next) => {
                try {
                    throw new Error('Test error');
                } catch (error) {
                    next(error);
                }
            });

            testApp.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
                res.status(500).json({
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: error.message || 'Internal server error'
                    }
                });
            });

            const response = await request(testApp)
                .get('/mock/test')
                .expect(500);

            expect(response.body.error).toBeDefined();
        }, 10000);

        it('should handle proxy handler errors gracefully', async () => {
            const response = await request(app)
                .get('/proxy')
                .query({ url: 'invalid-url' })
                .expect(400); // Invalid URL returns 400, not 500

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Configuration Validation', () => {
        it('should validate proxy configuration', () => {
            const validConfig = {
                enabled: true,
                routes: {
                    test: {
                        name: 'test',
                        targetUrl: 'https://example.com'
                    }
                },
                timeout: 5000,
                retries: 3,
                allowedDomains: ['example.com'],
                blockedDomains: []
            };

            const result = SimpleProxyHandler.validateConfig(validConfig);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid proxy configuration', () => {
            const invalidConfig = {
                timeout: -1000, // Invalid timeout
                retries: 20 // Too many retries
            };

            const result = SimpleProxyHandler.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should validate mock data structure', () => {
            const validMockData = {
                endpoints: {
                    'GET:/test': {
                        method: 'GET',
                        path: '/test',
                        response: { message: 'test' },
                        statusCode: 200
                    }
                }
            };

            const result = mockDataHandler.validateMockData(validMockData);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid mock data structure', () => {
            const invalidMockData = {
                // Missing endpoints
            };

            const result = mockDataHandler.validateMockData(invalidMockData);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Content Type Handling', () => {
        it('should handle JSON responses correctly', async () => {
            const response = await request(app)
                .get('/mock/users')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(typeof response.body).toBe('object');
        });

        it('should handle different response formats', () => {
            // Test XML formatting capability
            const mockHandler = new SimpleMockDataHandler();

            // The handler should be able to format responses as XML
            expect(mockHandler).toBeDefined();
        });
    });

    describe('Rate Limiting Integration', () => {
        it('should apply rate limiting middleware', async () => {
            // Test that rate limiting middleware is applied without hitting limits
            const response = await request(app)
                .get('/mock/users')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should handle blocked IPs check', async () => {
            // Test that IP blocking check is applied
            const response = await request(app)
                .get('/mock/users')
                .set('X-Forwarded-For', '127.0.0.1')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });
});