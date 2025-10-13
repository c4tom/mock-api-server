/**
 * Tests for ProxyHandler
 */

import { Request, Response } from 'express';
import axios from 'axios';
import { ProxyHandler } from '../ProxyHandler';
import { ProxyConfig } from '../../types/config';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Mock axios.isAxiosError
const mockIsAxiosError = jest.fn();
(axios as any).isAxiosError = mockIsAxiosError;

// Mock response object
const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
    };
    return res;
};

// Mock request object
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => {
    return {
        method: 'GET',
        path: '/proxy',
        query: {},
        body: {},
        headers: {},
        params: {},
        ...overrides,
    };
};

describe('ProxyHandler', () => {
    let handler: ProxyHandler;
    let mockConfig: ProxyConfig;
    let allowedOrigins: string[];
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();

        // Mock console methods to suppress logs during tests
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Reset axios.isAxiosError mock
        mockIsAxiosError.mockReset();

        mockConfig = {
            enabled: true,
            routes: {},
            timeout: 5000,
            retries: 3,
            allowedDomains: ['api.example.com', 'jsonplaceholder.typicode.com'],
            blockedDomains: ['malicious.com'],
        };

        allowedOrigins = ['http://localhost:3000', 'https://app.example.com'];
        handler = new ProxyHandler(mockConfig, allowedOrigins);
    });

    afterEach(() => {
        // Restore console methods
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    describe('Proxy Request Forwarding with Mock External APIs', () => {
        it('should forward GET request to external API successfully', async () => {
            // Arrange
            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { id: 1, title: 'Test Post' },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/posts/1' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/posts/1',
                headers: { origin: 'http://localhost:3000' },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ id: 1, title: 'Test Post' });
        });

        it('should forward POST request with body to external API', async () => {
            // Arrange
            const requestBody = { title: 'New Post', content: 'Post content' };
            const mockResponse = {
                status: 201,
                headers: { 'content-type': 'application/json' },
                data: { id: 2, ...requestBody },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'POST',
                query: { url: 'https://api.example.com/posts' },
                body: requestBody,
                headers: {
                    'content-type': 'application/json',
                    origin: 'http://localhost:3000',
                },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'POST',
                url: 'https://api.example.com/posts',
                headers: {
                    'content-type': 'application/json',
                    origin: 'http://localhost:3000'
                },
                data: requestBody,
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ id: 2, ...requestBody });
        });

        it('should handle named route forwarding', async () => {
            // Arrange
            mockConfig.routes = {
                'jsonplaceholder': {
                    name: 'jsonplaceholder',
                    targetUrl: 'https://jsonplaceholder.typicode.com',
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: [{ id: 1, name: 'User 1' }],
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'jsonplaceholder', 0: 'users' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/users',
                headers: { origin: 'http://localhost:3000' },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'User 1' }]);
        });

        it('should handle path rewriting in named routes', async () => {
            // Arrange
            mockConfig.routes = {
                'api': {
                    name: 'api',
                    targetUrl: 'https://api.example.com',
                    pathRewrite: {
                        '^v1': 'api/v1',
                        '/old': '/new',
                    },
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { version: 'v1' },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'api', 0: 'v1/status' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/api/v1/status',
                headers: { origin: 'http://localhost:3000' },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should handle string responses from external APIs', async () => {
            // Arrange
            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'text/plain' },
                data: 'Plain text response',
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/text' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.send).toHaveBeenCalledWith('Plain text response');
        });
    });

    describe('URL Validation and Domain Filtering', () => {
        it('should allow requests to domains in allowedDomains list', () => {
            // Test allowed domains
            expect(handler.validateTargetUrl('https://api.example.com/test')).toBe(true);
            expect(handler.validateTargetUrl('https://jsonplaceholder.typicode.com/posts')).toBe(true);
            expect(handler.validateTargetUrl('http://api.example.com/test')).toBe(true);
        });

        it('should allow subdomains of allowed domains', () => {
            expect(handler.validateTargetUrl('https://v1.api.example.com/test')).toBe(true);
            expect(handler.validateTargetUrl('https://cdn.api.example.com/assets')).toBe(true);
        });

        it('should block requests to domains not in allowedDomains list', () => {
            expect(handler.validateTargetUrl('https://unauthorized.com/test')).toBe(false);
            expect(handler.validateTargetUrl('https://evil.com/malware')).toBe(false);
        });

        it('should block requests to domains in blockedDomains list', () => {
            expect(handler.validateTargetUrl('https://malicious.com/test')).toBe(false);
            expect(handler.validateTargetUrl('https://sub.malicious.com/test')).toBe(false);
        });

        it('should block requests with invalid protocols', () => {
            expect(handler.validateTargetUrl('ftp://api.example.com/test')).toBe(false);
            expect(handler.validateTargetUrl('file:///etc/passwd')).toBe(false);
            expect(handler.validateTargetUrl('javascript:alert(1)')).toBe(false);
        });

        it('should block requests with invalid URLs', () => {
            expect(handler.validateTargetUrl('not-a-url')).toBe(false);
            expect(handler.validateTargetUrl('')).toBe(false);
            expect(handler.validateTargetUrl('://invalid')).toBe(false);
        });

        it('should allow all domains when allowedDomains is empty', () => {
            // Arrange
            const permissiveConfig: ProxyConfig = {
                ...mockConfig,
                allowedDomains: [],
                blockedDomains: [],
            };
            const permissiveHandler = new ProxyHandler(permissiveConfig, allowedOrigins);

            // Assert
            expect(permissiveHandler.validateTargetUrl('https://any-domain.com/test')).toBe(true);
            expect(permissiveHandler.validateTargetUrl('https://another-domain.org/api')).toBe(true);
        });

        it('should return 400 error for invalid target URLs', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://unauthorized.com/test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
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
        });
    });

    describe('CORS Header Addition and Authentication Forwarding', () => {
        it('should add CORS headers to successful responses', async () => {
            // Arrange
            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
        });

        it('should handle wildcard CORS when origin is allowed', async () => {
            // Arrange
            const wildcardHandler = new ProxyHandler(mockConfig, ['*']);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'https://any-origin.com' },
            });
            const res = createMockResponse();

            // Act
            await wildcardHandler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://any-origin.com');
        });

        it('should deny unauthorized origins', async () => {
            // Arrange
            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'https://unauthorized-origin.com' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
        });

        it('should forward Bearer token authentication', async () => {
            // Arrange
            mockConfig.routes = {
                'authenticated-api': {
                    name: 'authenticated-api',
                    targetUrl: 'https://api.example.com',
                    auth: {
                        type: 'bearer',
                        token: 'secret-bearer-token',
                    },
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { authenticated: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'authenticated-api', 0: 'protected' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/protected',
                headers: {
                    'Authorization': 'Bearer secret-bearer-token',
                    origin: 'http://localhost:3000',
                },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should forward Basic authentication', async () => {
            // Arrange
            mockConfig.routes = {
                'basic-auth-api': {
                    name: 'basic-auth-api',
                    targetUrl: 'https://api.example.com',
                    auth: {
                        type: 'basic',
                        username: 'testuser',
                        password: 'testpass',
                    },
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { authenticated: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'basic-auth-api', 0: 'protected' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            const expectedAuth = Buffer.from('testuser:testpass').toString('base64');
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/protected',
                headers: {
                    'Authorization': `Basic ${expectedAuth}`,
                    origin: 'http://localhost:3000',
                },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should forward API key authentication', async () => {
            // Arrange
            mockConfig.routes = {
                'apikey-api': {
                    name: 'apikey-api',
                    targetUrl: 'https://api.example.com',
                    auth: {
                        type: 'apikey',
                        apiKeyHeader: 'X-API-Key',
                        apiKeyValue: 'secret-api-key-123',
                    },
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { authenticated: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'apikey-api', 0: 'protected' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/protected',
                headers: {
                    'X-API-Key': 'secret-api-key-123',
                    origin: 'http://localhost:3000',
                },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should add custom headers from route configuration', async () => {
            // Arrange
            mockConfig.routes = {
                'custom-headers-api': {
                    name: 'custom-headers-api',
                    targetUrl: 'https://api.example.com',
                    headers: {
                        'X-Custom-Header': 'custom-value',
                        'User-Agent': 'MockAPIServer/1.0',
                    },
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'custom-headers-api', 0: 'test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/test',
                headers: {
                    'X-Custom-Header': 'custom-value',
                    'User-Agent': 'MockAPIServer/1.0',
                    origin: 'http://localhost:3000',
                },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should filter out sensitive request headers', async () => {
            // Arrange
            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:3000',
                    connection: 'keep-alive',
                    'proxy-authorization': 'Basic secret',
                    'x-forwarded-for': '192.168.1.1',
                    'content-type': 'application/json',
                    'authorization': 'Bearer user-token',
                },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert - Should only include safe headers
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/test',
                headers: {
                    'content-type': 'application/json',
                    'authorization': 'Bearer user-token',
                    origin: 'http://localhost:3000',
                },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should filter out sensitive response headers', async () => {
            // Arrange
            const mockResponse = {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                    'set-cookie': 'session=abc123; HttpOnly',
                    'access-control-allow-origin': '*',
                    'x-custom-header': 'keep-this',
                    'connection': 'close',
                    'proxy-authenticate': 'Basic',
                },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert - Should only set safe headers
            expect(res.setHeader).toHaveBeenCalledWith('content-type', 'application/json');
            expect(res.setHeader).toHaveBeenCalledWith('x-custom-header', 'keep-this');
            expect(res.setHeader).not.toHaveBeenCalledWith('set-cookie', expect.anything());
            expect(res.setHeader).not.toHaveBeenCalledWith('connection', expect.anything());
        });
    });

    describe('Timeout and Retry Behavior', () => {
        it('should handle request timeout errors', async () => {
            // Arrange
            const timeoutError = new Error('timeout of 5000ms exceeded');
            (timeoutError as any).code = 'ECONNABORTED';
            (timeoutError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            mockedAxios.mockRejectedValue(timeoutError);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/slow-endpoint' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(504);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_TIMEOUT',
                    message: 'The target server did not respond within the timeout period',
                    timestamp: expect.any(String),
                    suggestions: [
                        'Try again later',
                        'Check if the target server is responding',
                        'Consider increasing the timeout configuration'
                    ]
                }
            });
        });

        it('should handle connection errors', async () => {
            // Arrange
            const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:80');
            (connectionError as any).code = 'ECONNREFUSED';
            (connectionError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            mockedAxios.mockRejectedValue(connectionError);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/unreachable' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(502);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_CONNECTION_ERROR',
                    message: 'Unable to connect to the target server',
                    timestamp: expect.any(String),
                    suggestions: [
                        'Check if the target URL is correct',
                        'Verify the target server is running',
                        'Check network connectivity'
                    ]
                }
            });
        });

        it('should retry on network errors with exponential backoff', async () => {
            // Arrange
            const networkError = new Error('socket hang up');
            (networkError as any).code = 'ECONNRESET';
            (networkError as any).isAxiosError = true;

            // Mock axios.isAxiosError to return true for our error
            mockIsAxiosError.mockReturnValue(true);

            const successResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            // Mock first two calls to fail, third to succeed
            mockedAxios
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError)
                .mockResolvedValueOnce(successResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/unstable' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            const startTime = Date.now();
            await handler.handleProxyRequest(req as Request, res as Response);
            const endTime = Date.now();

            // Assert
            expect(mockedAxios).toHaveBeenCalledTimes(3);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true });

            // Should have waited for retries (at least 1000ms + 2000ms with some jitter)
            expect(endTime - startTime).toBeGreaterThan(2500);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Proxy request failed (attempt 1/3)'),
                expect.any(String)
            );
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Proxy request failed (attempt 2/3)'),
                expect.any(String)
            );
        });

        it('should retry on 5xx server errors', async () => {
            // Arrange
            const serverError = new Error('Internal Server Error');
            (serverError as any).response = {
                status: 500,
                statusText: 'Internal Server Error',
            };
            (serverError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            const successResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { recovered: true },
            };

            mockedAxios
                .mockRejectedValueOnce(serverError)
                .mockResolvedValueOnce(successResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/sometimes-fails' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ recovered: true });
        });

        it('should retry on 429 Too Many Requests', async () => {
            // Arrange
            const rateLimitError = new Error('Too Many Requests');
            (rateLimitError as any).response = {
                status: 429,
                statusText: 'Too Many Requests',
            };
            (rateLimitError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            const successResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce(successResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/rate-limited' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it('should not retry on 4xx client errors (except 429)', async () => {
            // Arrange
            const clientError = new Error('Not Found');
            (clientError as any).response = {
                status: 404,
                statusText: 'Not Found',
            };
            (clientError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            mockedAxios.mockRejectedValue(clientError);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/not-found' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledTimes(1); // No retries
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_ERROR',
                    message: 'An error occurred while proxying the request',
                    timestamp: expect.any(String),
                    suggestions: []
                }
            });
        });

        it('should stop retrying after max retries reached', async () => {
            // Arrange
            const networkError = new Error('socket hang up');
            (networkError as any).code = 'ECONNRESET';
            (networkError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            mockedAxios.mockRejectedValue(networkError);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/always-fails' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledTimes(3); // Initial + 2 retries (attempt <= retries)
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_ERROR',
                    message: 'An error occurred while proxying the request',
                    timestamp: expect.any(String),
                    suggestions: []
                }
            });

            expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // One warning per retry (2 retries)
        });

        it('should handle timeout configuration correctly', async () => {
            // Arrange
            const customTimeoutConfig: ProxyConfig = {
                ...mockConfig,
                timeout: 2000, // 2 seconds
            };
            const customHandler = new ProxyHandler(customTimeoutConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await customHandler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/test',
                headers: { origin: 'http://localhost:3000' },
                data: {},
                timeout: 2000, // Custom timeout
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should handle DNS resolution errors', async () => {
            // Arrange
            const dnsError = new Error('getaddrinfo ENOTFOUND api.example.com');
            (dnsError as any).code = 'ENOTFOUND';
            (dnsError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            mockedAxios.mockRejectedValue(dnsError);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(502);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_CONNECTION_ERROR',
                    message: 'Unable to connect to the target server',
                    timestamp: expect.any(String),
                    suggestions: [
                        'Check if the target URL is correct',
                        'Verify the target server is running',
                        'Check network connectivity'
                    ]
                }
            });
        });
    });

    describe('Configuration Management and Validation', () => {
        it('should validate proxy configuration correctly', () => {
            // Test valid configuration
            const validConfig: Partial<ProxyConfig> = {
                enabled: true,
                timeout: 5000,
                retries: 3,
                routes: {
                    'test': {
                        name: 'test',
                        targetUrl: 'https://api.example.com',
                    },
                },
            };

            const result = ProxyHandler.validateConfig(validConfig);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid timeout values', () => {
            const invalidConfig1 = { timeout: 500 }; // Too low
            const result1 = ProxyHandler.validateConfig(invalidConfig1);
            expect(result1.valid).toBe(false);
            expect(result1.error).toBe('Timeout must be between 1000ms and 60000ms');

            const invalidConfig2 = { timeout: 70000 }; // Too high
            const result2 = ProxyHandler.validateConfig(invalidConfig2);
            expect(result2.valid).toBe(false);
            expect(result2.error).toBe('Timeout must be between 1000ms and 60000ms');
        });

        it('should reject invalid retry values', () => {
            const invalidConfig1 = { retries: -1 }; // Negative
            const result1 = ProxyHandler.validateConfig(invalidConfig1);
            expect(result1.valid).toBe(false);
            expect(result1.error).toBe('Retries must be between 0 and 10');

            const invalidConfig2 = { retries: 15 }; // Too high
            const result2 = ProxyHandler.validateConfig(invalidConfig2);
            expect(result2.valid).toBe(false);
            expect(result2.error).toBe('Retries must be between 0 and 10');
        });

        it('should reject invalid route URLs', () => {
            const invalidConfig = {
                routes: {
                    'invalid': {
                        name: 'invalid',
                        targetUrl: 'not-a-valid-url',
                    },
                },
            };

            const result = ProxyHandler.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Invalid target URL for route 'invalid': not-a-valid-url");
        });

        it('should reject null or undefined configuration', () => {
            const result1 = ProxyHandler.validateConfig(null as any);
            expect(result1.valid).toBe(false);
            expect(result1.error).toBe('Configuration is required');

            const result2 = ProxyHandler.validateConfig(undefined as any);
            expect(result2.valid).toBe(false);
            expect(result2.error).toBe('Configuration is required');
        });

        it('should update configuration correctly', () => {
            // Arrange
            const newConfig: ProxyConfig = {
                enabled: false,
                routes: {
                    'new-route': {
                        name: 'new-route',
                        targetUrl: 'https://new-api.example.com',
                    },
                },
                timeout: 10000,
                retries: 1,
                allowedDomains: ['new-api.example.com'],
                blockedDomains: ['blocked.com'],
            };

            const newOrigins = ['https://new-origin.com'];

            // Act
            handler.updateConfig(newConfig, newOrigins);

            // Assert
            const currentConfig = handler.getConfig();
            expect(currentConfig).toEqual(newConfig);
            expect((handler as any).allowedOrigins).toEqual(newOrigins);
        });

        it('should get current configuration', () => {
            // Act
            const config = handler.getConfig();

            // Assert
            expect(config).toEqual(mockConfig);
            expect(config).not.toBe(mockConfig); // Should be a copy
        });
    });

    describe('Error Handling Edge Cases', () => {
        it('should handle missing target URL gracefully', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                // No URL query parameter or route
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_ERROR',
                    message: 'An error occurred while proxying the request',
                    timestamp: expect.any(String),
                    suggestions: []
                }
            });
        });

        it('should handle non-existent named routes', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                params: { route: 'non-existent-route', 0: 'test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'PROXY_ERROR',
                    message: 'An error occurred while proxying the request',
                    timestamp: expect.any(String),
                    suggestions: []
                }
            });
        });

        it('should add CORS headers even for error responses', async () => {
            // Arrange
            const networkError = new Error('connect ECONNREFUSED');
            (networkError as any).code = 'ECONNREFUSED';
            (networkError as any).isAxiosError = true;

            mockIsAxiosError.mockReturnValue(true);

            mockedAxios.mockRejectedValue(networkError);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/test' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        });

        it('should handle query parameters in target URLs', async () => {
            // Arrange
            mockConfig.routes = {
                'search-api': {
                    name: 'search-api',
                    targetUrl: 'https://api.example.com',
                },
            };
            handler = new ProxyHandler(mockConfig, allowedOrigins);

            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { success: true },
            };

            mockedAxios.mockResolvedValue(mockResponse);

            const req = createMockRequest({
                method: 'GET',
                params: { route: 'search-api', 0: 'search' },
                query: {
                    q: 'test query',
                    limit: '10'
                },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'GET',
                url: 'https://api.example.com/search?q=test+query&limit=10',
                headers: { origin: 'http://localhost:3000' },
                data: {},
                timeout: 5000,
                validateStatus: expect.any(Function),
                maxRedirects: 5,
            });
        });

        it('should handle HTTP error responses from external APIs', async () => {
            // Arrange
            const errorResponse = {
                status: 404,
                headers: { 'content-type': 'application/json' },
                data: { error: 'Not found' },
            };

            mockedAxios.mockResolvedValue(errorResponse);

            const req = createMockRequest({
                method: 'GET',
                query: { url: 'https://api.example.com/not-found' },
                headers: { origin: 'http://localhost:3000' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleProxyRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
        });
    });
});