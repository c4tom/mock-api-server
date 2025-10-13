/**
 * Tests for MockDataHandler
 */

import { Request, Response } from 'express';
import { MockDataHandler } from '../MockDataHandler';
import { MockConfig } from '../../types/config';

import { join } from 'path';

// Mock fs modules
jest.mock('fs/promises', () => ({
    readdir: jest.fn(),
    readFile: jest.fn(),
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
}));

const mockReaddir = require('fs/promises').readdir as jest.Mock;
const mockReadFile = require('fs/promises').readFile as jest.Mock;
const mockExistsSync = require('fs').existsSync as jest.Mock;

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
        path: '/test',
        query: {},
        body: {},
        headers: {},
        ...overrides,
    };
};

describe('MockDataHandler', () => {
    let handler: MockDataHandler;
    let mockConfig: MockConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();

        mockConfig = {
            dataPath: './test-data',
            endpoints: [],
            defaultDelay: 0,
            enableCrud: true,
        };

        handler = new MockDataHandler(mockConfig);
    });

    describe('Mock Data Loading and Endpoint Creation', () => {
        it('should load mock data from configuration endpoints', async () => {
            // Arrange
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/users',
                    response: [{ id: 1, name: 'John' }],
                    statusCode: 200,
                },
                {
                    method: 'POST',
                    path: '/users',
                    response: { message: 'User created' },
                    statusCode: 201,
                },
            ];

            handler = new MockDataHandler(mockConfig);
            mockExistsSync.mockReturnValue(false);

            // Act
            const result = await handler.loadMockData();

            // Assert
            expect(result.endpoints).toHaveProperty('GET:/users');
            expect(result.endpoints).toHaveProperty('POST:/users');
            expect(result.endpoints['GET:/users']?.response).toEqual([{ id: 1, name: 'John' }]);
            expect(result.endpoints['POST:/users']?.statusCode).toBe(201);
        });

        it('should load mock data from JSON files', async () => {
            // Arrange
            const mockFileContent = {
                name: 'test-endpoints',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/posts',
                        response: [{ id: 1, title: 'Test Post' }],
                        statusCode: 200,
                        contentType: 'json' as const,
                    },
                ],
            };

            mockExistsSync.mockReturnValue(true);
            mockReaddir.mockResolvedValue(['posts.json']);
            mockReadFile.mockResolvedValue(JSON.stringify(mockFileContent));

            // Act
            const result = await handler.loadMockData();

            // Assert
            expect(result.endpoints).toHaveProperty('GET:/posts');
            expect(result.endpoints['GET:/posts']?.response).toEqual([{ id: 1, title: 'Test Post' }]);
            expect(mockReaddir).toHaveBeenCalledWith('./test-data');
            expect(mockReadFile).toHaveBeenCalledWith(join('./test-data', 'posts.json'), 'utf-8');
        });

        it('should handle errors when loading from JSON files', async () => {
            // Arrange
            mockExistsSync.mockReturnValue(true);
            mockReaddir.mockRejectedValue(new Error('Directory not found'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            const result = await handler.loadMockData();

            // Assert - Should gracefully handle the error and return empty endpoints
            expect(result.endpoints).toEqual({});
            expect(consoleSpy).toHaveBeenCalledWith('Error loading mock data from JSON files:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        it('should skip invalid JSON files gracefully', async () => {
            // Arrange
            mockExistsSync.mockReturnValue(true);
            mockReaddir.mockResolvedValue(['invalid.json', 'valid.json']);
            mockReadFile
                .mockResolvedValueOnce('invalid json content')
                .mockResolvedValueOnce(JSON.stringify({
                    name: 'valid',
                    endpoints: [{ method: 'GET', path: '/valid', response: 'ok' }]
                }));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            const result = await handler.loadMockData();

            // Assert - Should handle the error and return empty endpoints due to the error in loadFromJsonFiles
            expect(result.endpoints).toEqual({});
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('CRUD Operations with In-Memory Persistence', () => {
        beforeEach(async () => {
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/users',
                    response: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
                    statusCode: 200,
                },
                {
                    method: 'POST',
                    path: '/users',
                    response: { message: 'Created' },
                    statusCode: 201,
                },
                {
                    method: 'PUT',
                    path: '/users/:id',
                    response: { message: 'Updated' },
                    statusCode: 200,
                },
                {
                    method: 'DELETE',
                    path: '/users/:id',
                    response: null,
                    statusCode: 204,
                },
            ];

            handler = new MockDataHandler(mockConfig);
            mockExistsSync.mockReturnValue(false);
            await handler.loadMockData();
        });

        it('should handle POST requests to create new items', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'POST',
                path: '/users',
                body: { name: 'Bob', email: 'bob@test.com' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 3,
                    name: 'Bob',
                    email: 'bob@test.com',
                    createdAt: expect.any(String),
                })
            );
        });

        it('should handle PUT requests to update existing items', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'PUT',
                path: '/users/1',
                body: { name: 'John Updated', email: 'john.updated@test.com' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 1,
                    name: 'John Updated',
                    email: 'john.updated@test.com',
                    updatedAt: expect.any(String),
                })
            );
        });

        it('should handle DELETE requests to remove items', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'DELETE',
                path: '/users/1',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });

        it('should return 404 when trying to update non-existent item', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'PUT',
                path: '/users/999',
                body: { name: 'Non-existent' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'ITEM_NOT_FOUND',
                    message: 'Item with ID 999 not found',
                },
            });
        });

        it('should return 404 when trying to delete non-existent item', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'DELETE',
                path: '/users/999',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'ITEM_NOT_FOUND',
                    message: 'Item with ID 999 not found',
                },
            });
        });

        it('should return 400 for invalid ID in PUT request', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'PUT',
                path: '/users/invalid-id',
                body: { name: 'Test' },
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid ID in path',
                },
            });
        });

        it('should persist data between requests', async () => {
            // Arrange - Create a new item
            const createReq = createMockRequest({
                method: 'POST',
                path: '/users',
                body: { name: 'Alice' },
            });
            const createRes = createMockResponse();

            // Act - Create item
            await handler.handleRequest(createReq as Request, createRes as Response);

            // Arrange - Get all items
            const getReq = createMockRequest({
                method: 'GET',
                path: '/users',
            });
            const getRes = createMockResponse();

            // Act - Get items
            await handler.handleRequest(getReq as Request, getRes as Response);

            // Assert - New item should be in the list
            expect(getRes.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Alice', id: 3 }),
                ])
            );
        });
    });

    describe('Response Formatting for Different Content Types', () => {
        beforeEach(async () => {
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/json',
                    response: { message: 'JSON response' },
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
                {
                    method: 'GET',
                    path: '/xml',
                    response: { message: 'XML response' },
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/xml' },
                },
                {
                    method: 'GET',
                    path: '/text',
                    response: 'Plain text response',
                    statusCode: 200,
                    headers: { 'Content-Type': 'text/plain' },
                },
            ];

            handler = new MockDataHandler(mockConfig);
            mockExistsSync.mockReturnValue(false);
            await handler.loadMockData();
        });

        it('should format JSON responses correctly', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                path: '/json',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'JSON response' });
        });

        it('should format XML responses correctly', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                path: '/xml',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining('<?xml version="1.0" encoding="UTF-8"?>')
            );
            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining('<response><message>XML response</message></response>')
            );
        });

        it('should format text responses correctly', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                path: '/text',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('Plain text response');
        });

        it('should handle custom headers in responses', async () => {
            // Arrange
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/custom-headers',
                    response: { data: 'test' },
                    statusCode: 200,
                    headers: {
                        'X-Custom-Header': 'custom-value',
                        'Cache-Control': 'no-cache',
                    },
                },
            ];

            handler = new MockDataHandler(mockConfig);
            await handler.loadMockData();

            const req = createMockRequest({
                method: 'GET',
                path: '/custom-headers',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
            expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
        });

        it('should handle response delays', async () => {
            // Arrange
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/delayed',
                    response: { message: 'Delayed response' },
                    statusCode: 200,
                    delay: 100,
                },
            ];

            handler = new MockDataHandler(mockConfig);
            await handler.loadMockData();

            const req = createMockRequest({
                method: 'GET',
                path: '/delayed',
            });
            const res = createMockResponse();

            const startTime = Date.now();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            const endTime = Date.now();
            expect(endTime - startTime).toBeGreaterThanOrEqual(95); // Allow for some timing variance
            expect(res.json).toHaveBeenCalledWith({ message: 'Delayed response' });
        });
    });

    describe('Error Handling for Invalid Mock Data', () => {
        it('should validate mock data structure correctly', () => {
            // Test valid data
            const validData = {
                endpoints: {
                    'GET:/test': {
                        method: 'GET',
                        path: '/test',
                        response: { message: 'test' },
                        statusCode: 200,
                    },
                },
            };

            const validResult = handler.validateMockData(validData);
            expect(validResult.valid).toBe(true);
        });

        it('should reject invalid mock data structure', () => {
            // Test invalid data - not an object
            const invalidResult1 = handler.validateMockData('invalid');
            expect(invalidResult1.valid).toBe(false);
            expect(invalidResult1.error).toBe('Mock data must be an object');

            // Test invalid data - missing endpoints
            const invalidResult2 = handler.validateMockData({});
            expect(invalidResult2.valid).toBe(false);
            expect(invalidResult2.error).toBe('Mock data must contain an endpoints object');

            // Test invalid data - endpoints not an object
            const invalidResult3 = handler.validateMockData({ endpoints: 'invalid' });
            expect(invalidResult3.valid).toBe(false);
            expect(invalidResult3.error).toBe('Mock data must contain an endpoints object');
        });

        it('should validate individual endpoints', () => {
            // Test endpoint without method
            const invalidEndpoint1 = {
                endpoints: {
                    'test': {
                        path: '/test',
                        response: 'test',
                    },
                },
            };

            const result1 = handler.validateMockData(invalidEndpoint1);
            expect(result1.valid).toBe(false);
            expect(result1.error).toContain('must have a valid method');

            // Test endpoint without path
            const invalidEndpoint2 = {
                endpoints: {
                    'test': {
                        method: 'GET',
                        response: 'test',
                    },
                },
            };

            const result2 = handler.validateMockData(invalidEndpoint2);
            expect(result2.valid).toBe(false);
            expect(result2.error).toContain('must have a valid path');

            // Test endpoint without response
            const invalidEndpoint3 = {
                endpoints: {
                    'test': {
                        method: 'GET',
                        path: '/test',
                    },
                },
            };

            const result3 = handler.validateMockData(invalidEndpoint3);
            expect(result3.valid).toBe(false);
            expect(result3.error).toContain('must have a response');

            // Test endpoint with invalid status code
            const invalidEndpoint4 = {
                endpoints: {
                    'test': {
                        method: 'GET',
                        path: '/test',
                        response: 'test',
                        statusCode: 999,
                    },
                },
            };

            const result4 = handler.validateMockData(invalidEndpoint4);
            expect(result4.valid).toBe(false);
            expect(result4.error).toContain('valid HTTP status code');
        });

        it('should handle 404 for unknown endpoints', async () => {
            // Arrange
            await handler.loadMockData(); // Load empty endpoints

            const req = createMockRequest({
                method: 'GET',
                path: '/unknown-endpoint',
            });
            const res = createMockResponse();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'ENDPOINT_NOT_FOUND',
                    message: 'Mock endpoint not found: /unknown-endpoint',
                    timestamp: expect.any(String),
                    availableEndpoints: expect.any(Array),
                },
            });
        });

        it('should handle internal server errors gracefully', async () => {
            // Arrange
            const req = createMockRequest({
                method: 'GET',
                path: '/test',
            });
            const res = createMockResponse();

            // Mock an error in the handler
            const originalFindMatchingEndpoint = (handler as any).findMatchingEndpoint;
            (handler as any).findMatchingEndpoint = jest.fn().mockImplementation(() => {
                throw new Error('Internal error');
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            await handler.handleRequest(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'MOCK_HANDLER_ERROR',
                    message: 'Internal server error while processing mock request',
                    timestamp: expect.any(String),
                },
            });
            expect(consoleSpy).toHaveBeenCalledWith('Error handling mock request:', expect.any(Error));

            // Cleanup
            (handler as any).findMatchingEndpoint = originalFindMatchingEndpoint;
            consoleSpy.mockRestore();
        });

        it('should handle validation errors during data loading', async () => {
            // Arrange - Create a fresh handler with empty config
            const emptyConfig: MockConfig = {
                dataPath: './test-data',
                endpoints: [], // No config endpoints
                defaultDelay: 0,
                enableCrud: true,
            };
            const freshHandler = new MockDataHandler(emptyConfig);

            mockExistsSync.mockReturnValue(true);
            mockReaddir.mockResolvedValue(['invalid.json']);
            mockReadFile.mockResolvedValue(JSON.stringify({
                name: 'invalid',
                endpoints: 'not-an-array', // Invalid structure
            }));

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Act
            const result = await freshHandler.loadMockData();

            // Assert
            expect(result.endpoints).toEqual({});
            expect(consoleSpy).toHaveBeenCalledWith('Invalid mock data file structure: invalid.json');

            consoleSpy.mockRestore();
        });
    });

    describe('Configuration Management', () => {
        it('should reload mock data when requested', async () => {
            // Arrange
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/initial',
                    response: { message: 'initial' },
                    statusCode: 200,
                },
            ];

            handler = new MockDataHandler(mockConfig);
            mockExistsSync.mockReturnValue(false);
            await handler.loadMockData();

            // Verify initial data
            const req1 = createMockRequest({ method: 'GET', path: '/initial' });
            const res1 = createMockResponse();
            await handler.handleRequest(req1 as Request, res1 as Response);
            expect(res1.json).toHaveBeenCalledWith({ message: 'initial' });

            // Update config
            mockConfig.endpoints = [
                {
                    method: 'GET',
                    path: '/updated',
                    response: { message: 'updated' },
                    statusCode: 200,
                },
            ];

            // Act
            await handler.reloadMockData();

            // Assert - old endpoint should not work
            const req2 = createMockRequest({ method: 'GET', path: '/initial' });
            const res2 = createMockResponse();
            await handler.handleRequest(req2 as Request, res2 as Response);
            expect(res2.status).toHaveBeenCalledWith(404);

            // New endpoint should work
            const req3 = createMockRequest({ method: 'GET', path: '/updated' });
            const res3 = createMockResponse();
            await handler.handleRequest(req3 as Request, res3 as Response);
            expect(res3.json).toHaveBeenCalledWith({ message: 'updated' });
        });

        it('should update configuration', () => {
            // Arrange
            const newConfig: MockConfig = {
                dataPath: './new-path',
                endpoints: [],
                defaultDelay: 500,
                enableCrud: false,
            };

            // Act
            handler.updateConfig(newConfig);

            // Assert
            expect((handler as any).config).toEqual(newConfig);
        });
    });
});