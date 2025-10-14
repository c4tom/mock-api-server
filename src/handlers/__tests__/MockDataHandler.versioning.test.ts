/**
 * Tests for API Versioning in MockDataHandler
 */

import { Request, Response } from 'express';
import { MockDataHandler } from '../MockDataHandler';
import { MockConfig } from '../../types/config';

describe('MockDataHandler - API Versioning', () => {
    let mockConfig: MockConfig;
    let handler: MockDataHandler;
    let mockRequest: any;
    let mockResponse: Partial<Response>;
    let responseData: any;

    beforeEach(() => {
        // Reset mocks
        responseData = null;

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn((data) => {
                responseData = data;
                return mockResponse as Response;
            }),
            setHeader: jest.fn(),
            send: jest.fn(),
        };

        mockRequest = {
            method: 'GET',
            path: '/users',
            query: {},
            body: {},
            headers: {},
            get: jest.fn(),
        };
    });

    describe('Header-based versioning', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John v1' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, firstName: 'John', lastName: 'Doe' }],
                        statusCode: 200,
                        version: 'v2',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1', 'v2'],
                    versionHeader: 'API-Version',
                    strictMode: false,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should return v1 data when API-Version header is v1', async () => {
            mockRequest.headers = { 'api-version': 'v1' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John v1' }]);
        });

        it('should return v2 data when API-Version header is v2', async () => {
            mockRequest.headers = { 'api-version': 'v2' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, firstName: 'John', lastName: 'Doe' }]);
        });

        it('should normalize version strings (V1, v1, 1)', async () => {
            mockRequest.headers = { 'api-version': 'V1' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John v1' }]);
        });
    });

    describe('URL prefix versioning', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John v1' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, firstName: 'John', lastName: 'Doe' }],
                        statusCode: 200,
                        version: 'v2',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1', 'v2'],
                    versionPrefix: '/v',
                    strictMode: false,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should extract version from URL prefix /v1/users', async () => {
            mockRequest.path = '/v1/users';
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John v1' }]);
        });

        it('should extract version from URL prefix /v2/users', async () => {
            mockRequest.path = '/v2/users';
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, firstName: 'John', lastName: 'Doe' }]);
        });
    });

    describe('Default version', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John v1' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, firstName: 'John', lastName: 'Doe' }],
                        statusCode: 200,
                        version: 'v2',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1', 'v2'],
                    defaultVersion: 'v1',
                    strictMode: false,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should use default version when no version specified', async () => {
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John v1' }]);
        });
    });

    describe('Strict mode', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1'],
                    versionHeader: 'API-Version',
                    strictMode: true,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should return 400 error when version is required but not provided', async () => {
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseData.error.code).toBe('VERSION_REQUIRED');
        });

        it('should succeed when version is provided in strict mode', async () => {
            mockRequest.headers = { 'api-version': 'v1' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John' }]);
        });
    });

    describe('Unsupported version', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1', 'v2'],
                    strictMode: false,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should return 400 error for unsupported version', async () => {
            mockRequest.headers = { 'api-version': 'v3' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseData.error.code).toBe('UNSUPPORTED_VERSION');
            expect(responseData.error.supportedVersions).toEqual(['v1', 'v2']);
        });
    });

    describe('Version priority', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John v1' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, firstName: 'John', lastName: 'Doe' }],
                        statusCode: 200,
                        version: 'v2',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1', 'v2'],
                    versionHeader: 'API-Version',
                    versionPrefix: '/v',
                    strictMode: false,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should prioritize header over URL prefix', async () => {
            mockRequest.path = '/v1/users';
            mockRequest.headers = { 'api-version': 'v2' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            // Should return v2 data (from header) not v1 (from URL)
            expect(responseData).toEqual([{ id: 1, firstName: 'John', lastName: 'Doe' }]);
        });
    });

    describe('Endpoint not found with versioning', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John' }],
                        statusCode: 200,
                        version: 'v1',
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
                versioning: {
                    enabled: true,
                    supportedVersions: ['v1', 'v2'],
                    strictMode: false,
                },
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should return 404 with version info when endpoint not found', async () => {
            mockRequest.path = '/products';
            mockRequest.headers = { 'api-version': 'v1' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(responseData.error.code).toBe('ENDPOINT_NOT_FOUND');
            expect(responseData.error.requestedVersion).toBe('v1');
            expect(responseData.error.availableVersions).toEqual(['v1', 'v2']);
        });
    });

    describe('Versioning disabled', () => {
        beforeEach(() => {
            mockConfig = {
                dataPath: './data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        response: [{ id: 1, name: 'John' }],
                        statusCode: 200,
                    },
                ],
                defaultDelay: 0,
                enableCrud: false,
            };

            handler = new MockDataHandler(mockConfig);
        });

        it('should work normally when versioning is disabled', async () => {
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John' }]);
        });

        it('should ignore version headers when versioning is disabled', async () => {
            mockRequest.headers = { 'api-version': 'v1' };
            await handler.loadMockData();
            await handler.handleRequest(mockRequest as Request, mockResponse as Response);

            expect(responseData).toEqual([{ id: 1, name: 'John' }]);
        });
    });
});
