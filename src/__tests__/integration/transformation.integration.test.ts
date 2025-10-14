/**
 * Integration tests for transformation middleware
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { createTransformationMiddleware } from '../../middleware/transformationMiddleware';
import { TransformationConfig } from '../../types/transformation';

describe('Transformation Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('Field Mapping', () => {
        it('should transform response field names', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users',
                    method: 'GET',
                    responseTransform: {
                        fieldMapping: {
                            user_id: 'id',
                            user_name: 'name',
                            email_address: 'email'
                        }
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users', (_req: Request, res: Response) => {
                res.json({
                    user_id: 1,
                    user_name: 'John Doe',
                    email_address: 'john@example.com'
                });
            });

            const response = await request(app).get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                name: 'John Doe',
                email: 'john@example.com'
            });
        });

        it('should transform request field names', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users',
                    method: 'POST',
                    requestTransform: {
                        fieldMapping: {
                            firstName: 'first_name',
                            lastName: 'last_name'
                        }
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.post('/api/users', (req: Request, res: Response) => {
                res.json(req.body);
            });

            const response = await request(app)
                .post('/api/users')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com'
            });
        });
    });

    describe('Field Removal', () => {
        it('should remove sensitive fields from response', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users/:id',
                    method: 'GET',
                    responseTransform: {
                        removeFields: ['password', 'ssn', 'internalId']
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users/:id', (_req: Request, res: Response) => {
                res.json({
                    id: 1,
                    name: 'John Doe',
                    password: 'hashed_password',
                    ssn: '123-45-6789',
                    internalId: 'internal-123'
                });
            });

            const response = await request(app).get('/api/users/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                name: 'John Doe'
            });
            expect(response.body.password).toBeUndefined();
            expect(response.body.ssn).toBeUndefined();
            expect(response.body.internalId).toBeUndefined();
        });
    });

    describe('Field Addition', () => {
        it('should add metadata to response', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users',
                    method: 'GET',
                    responseTransform: {
                        addFields: {
                            apiVersion: '1.0',
                            server: 'mock-api'
                        }
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users', (_req: Request, res: Response) => {
                res.json({
                    id: 1,
                    name: 'John Doe'
                });
            });

            const response = await request(app).get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                name: 'John Doe',
                apiVersion: '1.0',
                server: 'mock-api'
            });
        });
    });

    describe('Custom Transformation Functions', () => {
        it('should apply custom transformation to response', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users/:id',
                    method: 'GET',
                    responseTransform: {
                        customFunction: (data) => ({
                            ...data,
                            fullName: `${data.firstName} ${data.lastName}`,
                            _links: {
                                self: `/api/users/${data.id}`
                            }
                        })
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users/:id', (_req: Request, res: Response) => {
                res.json({
                    id: 1,
                    firstName: 'John',
                    lastName: 'Doe'
                });
            });

            const response = await request(app).get('/api/users/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                _links: {
                    self: '/api/users/1'
                }
            });
        });
    });

    describe('Response Wrapping', () => {
        it('should wrap response in data field', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users',
                    method: 'GET',
                    responseTransform: {
                        addFields: {
                            success: true
                        },
                        wrapResponse: 'data'
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users', (_req: Request, res: Response) => {
                res.json([
                    { id: 1, name: 'John' },
                    { id: 2, name: 'Jane' }
                ]);
            });

            const response = await request(app).get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                data: [
                    { id: 1, name: 'John' },
                    { id: 2, name: 'Jane' }
                ],
                success: true
            });
        });
    });

    describe('Combined Transformations', () => {
        it('should apply multiple transformations in order', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users',
                    method: 'GET',
                    responseTransform: {
                        customFunction: (data) => {
                            if (Array.isArray(data)) {
                                return data.map(user => ({
                                    ...user,
                                    processed: true
                                }));
                            }
                            return data;
                        },
                        fieldMapping: {
                            user_id: 'id',
                            user_name: 'name'
                        },
                        removeFields: ['internal']
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users', (_req: Request, res: Response) => {
                res.json([
                    { user_id: 1, user_name: 'John', internal: 'secret1' },
                    { user_id: 2, user_name: 'Jane', internal: 'secret2' }
                ]);
            });

            const response = await request(app).get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([
                { id: 1, name: 'John', processed: true },
                { id: 2, name: 'Jane', processed: true }
            ]);
        });
    });

    describe('Path Matching', () => {
        it('should match path with parameters', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users/:id',
                    method: 'GET',
                    responseTransform: {
                        addFields: {
                            matched: true
                        }
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/users/:id', (req: Request, res: Response) => {
                res.json({ id: req.params['id'], name: 'John' });
            });

            const response = await request(app).get('/api/users/123');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: '123',
                name: 'John',
                matched: true
            });
        });

        it('should not transform unmatched paths', async () => {
            const transformations: TransformationConfig[] = [
                {
                    path: '/api/users',
                    method: 'GET',
                    responseTransform: {
                        addFields: {
                            transformed: true
                        }
                    }
                }
            ];

            const transformMiddleware = createTransformationMiddleware(transformations);
            app.use(transformMiddleware.middleware());

            app.get('/api/posts', (_req: Request, res: Response) => {
                res.json({ id: 1, title: 'Post' });
            });

            const response = await request(app).get('/api/posts');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                title: 'Post'
            });
            expect(response.body.transformed).toBeUndefined();
        });
    });
});
