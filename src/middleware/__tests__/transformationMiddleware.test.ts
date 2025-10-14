/**
 * Tests for Transformation Middleware
 */

import { Request, Response } from 'express';
import {
    TransformationMiddleware,
    createTransformationMiddleware
} from '../transformationMiddleware';
import { TransformationConfig } from '../../types/transformation';

describe('TransformationMiddleware', () => {
    let middleware: TransformationMiddleware;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;
    let originalJsonMock: jest.Mock;
    let originalSendMock: jest.Mock;

    beforeEach(() => {
        middleware = new TransformationMiddleware();
        originalJsonMock = jest.fn().mockReturnThis();
        originalSendMock = jest.fn().mockReturnThis();

        mockReq = {
            method: 'GET',
            path: '/api/users',
            body: {},
            headers: {},
            query: {}
        };

        mockRes = {
            json: originalJsonMock,
            send: originalSendMock,
            status: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
    });

    describe('Field Mapping', () => {
        it('should rename fields in request body', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    fieldMapping: {
                        firstName: 'first_name',
                        lastName: 'last_name'
                    }
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.body).toEqual({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com'
            });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should rename fields in response data', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    fieldMapping: {
                        first_name: 'firstName',
                        last_name: 'lastName'
                    }
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com'
            };

            // Call the overridden json method
            (mockRes.json as any)(responseData);

            // Verify the original json method was called with transformed data
            expect(originalJsonMock).toHaveBeenCalledWith({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            });
        });

        it('should handle array data in field mapping', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    fieldMapping: {
                        user_id: 'id',
                        user_name: 'name'
                    }
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = [
                { user_id: 1, user_name: 'John' },
                { user_id: 2, user_name: 'Jane' }
            ];

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith([
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' }
            ]);
        });
    });

    describe('Field Removal', () => {
        it('should remove specified fields from request', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    removeFields: ['password', 'ssn']
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = {
                name: 'John',
                email: 'john@example.com',
                password: 'secret123',
                ssn: '123-45-6789'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.body).toEqual({
                name: 'John',
                email: 'john@example.com'
            });
            expect(mockReq.body.password).toBeUndefined();
            expect(mockReq.body.ssn).toBeUndefined();
        });

        it('should remove specified fields from response', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    removeFields: ['password', 'internalId']
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = {
                id: 1,
                name: 'John',
                password: 'hashed',
                internalId: 'internal-123'
            };

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith({
                id: 1,
                name: 'John'
            });
        });
    });

    describe('Field Addition', () => {
        it('should add fields to request', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    addFields: {
                        createdAt: '2024-01-01T00:00:00Z',
                        source: 'api'
                    }
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = {
                name: 'John',
                email: 'john@example.com'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.body).toEqual({
                name: 'John',
                email: 'john@example.com',
                createdAt: '2024-01-01T00:00:00Z',
                source: 'api'
            });
        });

        it('should add fields to response', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    addFields: {
                        version: '1.0',
                        timestamp: '2024-01-01T00:00:00Z'
                    }
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = {
                id: 1,
                name: 'John'
            };

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith({
                id: 1,
                name: 'John',
                version: '1.0',
                timestamp: '2024-01-01T00:00:00Z'
            });
        });
    });

    describe('Custom Transformation Functions', () => {
        it('should apply custom function to request', () => {
            const customFunction = jest.fn((data) => ({
                ...data,
                name: data.name.toUpperCase()
            }));

            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    customFunction
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = {
                name: 'john',
                email: 'john@example.com'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(customFunction).toHaveBeenCalled();
            expect(mockReq.body.name).toBe('JOHN');
        });

        it('should apply custom function to response', () => {
            const customFunction = jest.fn((data) => ({
                ...data,
                fullName: `${data.firstName} ${data.lastName}`
            }));

            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    customFunction
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = {
                firstName: 'John',
                lastName: 'Doe'
            };

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith({
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe'
            });
        });

        it('should pass request object to custom function', () => {
            const customFunction = jest.fn((data, req) => ({
                ...data,
                requestMethod: req?.method
            }));

            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    customFunction
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = { name: 'John' };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(customFunction).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('Response Wrapping', () => {
        it('should wrap response in specified field', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    wrapResponse: 'data'
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = {
                id: 1,
                name: 'John'
            };

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith({
                data: {
                    id: 1,
                    name: 'John'
                }
            });
        });

        it('should wrap array response', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    wrapResponse: 'users'
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = [
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' }
            ];

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith({
                users: [
                    { id: 1, name: 'John' },
                    { id: 2, name: 'Jane' }
                ]
            });
        });
    });

    describe('Combined Transformations', () => {
        it('should apply multiple transformations in order', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    customFunction: (data) => ({ ...data, processed: true }),
                    fieldMapping: { firstName: 'first_name' },
                    removeFields: ['temp'],
                    addFields: { source: 'api' }
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = {
                firstName: 'John',
                temp: 'remove-me'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.body).toEqual({
                first_name: 'John',
                processed: true,
                source: 'api'
            });
            expect(mockReq.body.temp).toBeUndefined();
        });

        it('should apply multiple response transformations', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    customFunction: (data) => ({ ...data, processed: true }),
                    fieldMapping: { user_id: 'id' },
                    removeFields: ['internal'],
                    addFields: { version: '1.0' },
                    wrapResponse: 'data'
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            const responseData = {
                user_id: 1,
                name: 'John',
                internal: 'secret'
            };

            (mockRes.json as any)(responseData);

            expect(originalJsonMock).toHaveBeenCalledWith({
                data: {
                    id: 1,
                    name: 'John',
                    processed: true
                },
                version: '1.0'
            });
        });
    });

    describe('Path Matching', () => {
        it('should match exact path', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    addFields: { matched: true }
                }
            };

            middleware.addTransformation(config);

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            (mockRes.json as any)({ id: 1 });

            expect(originalJsonMock).toHaveBeenCalledWith({
                id: 1,
                matched: true
            });
        });

        it('should match path with parameters', () => {
            const config: TransformationConfig = {
                path: '/api/users/:id',
                method: 'GET',
                responseTransform: {
                    addFields: { matched: true }
                }
            };

            middleware.addTransformation(config);
            mockReq = {
                ...mockReq,
                path: '/api/users/123'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            (mockRes.json as any)({ id: 123 });

            expect(originalJsonMock).toHaveBeenCalledWith({
                id: 123,
                matched: true
            });
        });

        it('should match multiple methods', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: ['GET', 'POST'],
                requestTransform: {
                    addFields: { matched: true }
                }
            };

            middleware.addTransformation(config);

            // Test GET
            mockReq.method = 'GET';
            mockReq.body = { name: 'John' };
            let middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);
            expect(mockReq.body.matched).toBe(true);

            // Test POST
            mockReq.method = 'POST';
            mockReq.body = { name: 'Jane' };
            middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);
            expect(mockReq.body.matched).toBe(true);
        });

        it('should not match different path', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {
                    addFields: { matched: true }
                }
            };

            middleware.addTransformation(config);
            mockReq = {
                ...mockReq,
                path: '/api/posts'
            };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            (mockRes.json as any)({ id: 1 });

            // Should not add the matched field
            expect(originalJsonMock).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('Error Handling', () => {
        it('should handle transformation errors gracefully', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'POST',
                requestTransform: {
                    customFunction: () => {
                        throw new Error('Transformation failed');
                    }
                }
            };

            middleware.addTransformation(config);
            mockReq.method = 'POST';
            mockReq.body = { name: 'John' };

            const middlewareFn = middleware.middleware();
            middlewareFn(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(originalJsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'REQUEST_TRANSFORMATION_ERROR'
                    })
                })
            );
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Middleware Management', () => {
        it('should load multiple transformations', () => {
            const configs: TransformationConfig[] = [
                { path: '/api/users', method: 'GET', responseTransform: {} },
                { path: '/api/posts', method: 'GET', responseTransform: {} }
            ];

            middleware.loadTransformations(configs);

            expect(middleware.getTransformations()).toHaveLength(2);
        });

        it('should remove transformation', () => {
            const config: TransformationConfig = {
                path: '/api/users',
                method: 'GET',
                responseTransform: {}
            };

            middleware.addTransformation(config);
            expect(middleware.getTransformations()).toHaveLength(1);

            middleware.removeTransformation('/api/users', 'GET');
            expect(middleware.getTransformations()).toHaveLength(0);
        });

        it('should create middleware with factory function', () => {
            const configs: TransformationConfig[] = [
                { path: '/api/users', method: 'GET', responseTransform: {} }
            ];

            const instance = createTransformationMiddleware(configs);

            expect(instance).toBeInstanceOf(TransformationMiddleware);
            expect(instance.getTransformations()).toHaveLength(1);
        });
    });
});
