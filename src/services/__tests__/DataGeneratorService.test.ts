/**
 * Tests for DataGeneratorService
 */

// Mock faker before importing the service
jest.mock('@faker-js/faker', () => ({
    faker: {
        seed: jest.fn(),
        datatype: {
            boolean: jest.fn(() => true),
        },
        string: {
            alpha: jest.fn((length: number) => 'a'.repeat(length || 5)),
            uuid: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
        },
        number: {
            int: jest.fn(({ min, max }: any) => Math.floor((min + max) / 2)),
        },
        date: {
            recent: jest.fn(() => new Date('2024-01-01')),
        },
        internet: {
            email: jest.fn(() => 'test@example.com'),
            url: jest.fn(() => 'https://example.com'),
            domainName: jest.fn(() => 'example.com'),
        },
        person: {
            fullName: jest.fn(() => 'John Doe'),
            firstName: jest.fn(() => 'John'),
            lastName: jest.fn(() => 'Doe'),
            jobTitle: jest.fn(() => 'Software Engineer'),
        },
        phone: {
            number: jest.fn(() => '+1234567890'),
        },
        location: {
            streetAddress: jest.fn(() => '123 Main St'),
            city: jest.fn(() => 'New York'),
            country: jest.fn(() => 'USA'),
            zipCode: jest.fn(() => '12345'),
        },
        company: {
            name: jest.fn(() => 'Acme Corp'),
        },
        image: {
            url: jest.fn(() => 'https://example.com/image.jpg'),
            avatar: jest.fn(() => 'https://example.com/avatar.jpg'),
        },
        lorem: {
            paragraph: jest.fn(() => 'Lorem ipsum dolor sit amet'),
            sentence: jest.fn(() => 'Lorem ipsum dolor'),
            word: jest.fn(() => 'lorem'),
        },
        commerce: {
            productName: jest.fn(() => 'Product Name'),
            price: jest.fn(({ min, max }: any) => ((min + max) / 2).toFixed(2)),
        },
        color: {
            human: jest.fn(() => 'blue'),
        },
        helpers: {
            arrayElement: jest.fn((arr: any[]) => arr[0]),
        },
    },
}));

import { DataGeneratorService } from '../DataGeneratorService';
import { DataGenerationSchema, FieldSchema } from '../../types/generation';

describe('DataGeneratorService', () => {
    let service: DataGeneratorService;

    beforeEach(() => {
        service = new DataGeneratorService();
    });

    describe('generate', () => {
        it('should generate multiple items based on count', () => {
            const schema: DataGenerationSchema = {
                name: 'test',
                count: 5,
                fields: {
                    id: { type: 'uuid' },
                    name: { type: 'name' }
                }
            };

            const result = service.generate(schema);

            expect(result).toHaveLength(5);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('name');
        });

        it('should generate 10 items by default when count is not specified', () => {
            const schema: DataGenerationSchema = {
                name: 'test',
                fields: {
                    id: { type: 'uuid' }
                }
            };

            const result = service.generate(schema);

            expect(result).toHaveLength(10);
        });

        it('should generate consistent data with seed', () => {
            const schema: DataGenerationSchema = {
                name: 'test',
                count: 3,
                fields: {
                    name: { type: 'name' }
                }
            };

            const result1 = service.generate(schema, { seed: 12345 });
            const result2 = service.generate(schema, { seed: 12345 });

            expect(result1).toEqual(result2);
        });
    });

    describe('generateSingle', () => {
        it('should generate a single item', () => {
            const schema: DataGenerationSchema = {
                name: 'test',
                fields: {
                    id: { type: 'uuid' },
                    email: { type: 'email' }
                }
            };

            const result = service.generateSingle(schema);

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('email');
            expect(typeof result.id).toBe('string');
            expect(typeof result.email).toBe('string');
        });
    });

    describe('generateField', () => {
        describe('basic types', () => {
            it('should generate string', () => {
                const result = service.generateField('test', { type: 'string' });
                expect(typeof result).toBe('string');
            });

            it('should generate string with specific length', () => {
                const result = service.generateField('test', { type: 'string', length: 10 });
                expect(typeof result).toBe('string');
                expect(result.length).toBe(10);
            });

            it('should generate number', () => {
                const result = service.generateField('test', { type: 'number' });
                expect(typeof result).toBe('number');
            });

            it('should generate number within range', () => {
                const result = service.generateField('test', { type: 'number', min: 10, max: 20 });
                expect(result).toBeGreaterThanOrEqual(10);
                expect(result).toBeLessThanOrEqual(20);
            });

            it('should generate boolean', () => {
                const result = service.generateField('test', { type: 'boolean' });
                expect(typeof result).toBe('boolean');
            });

            it('should generate date', () => {
                const result = service.generateField('test', { type: 'date' });
                expect(typeof result).toBe('string');
                expect(new Date(result).toString()).not.toBe('Invalid Date');
            });
        });

        describe('person types', () => {
            it('should generate email', () => {
                const result = service.generateField('test', { type: 'email' });
                expect(typeof result).toBe('string');
                expect(result).toMatch(/@/);
            });

            it('should generate name', () => {
                const result = service.generateField('test', { type: 'name' });
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });

            it('should generate firstName', () => {
                const result = service.generateField('test', { type: 'firstName' });
                expect(typeof result).toBe('string');
            });

            it('should generate lastName', () => {
                const result = service.generateField('test', { type: 'lastName' });
                expect(typeof result).toBe('string');
            });

            it('should generate phone', () => {
                const result = service.generateField('test', { type: 'phone' });
                expect(typeof result).toBe('string');
            });

            it('should generate jobTitle', () => {
                const result = service.generateField('test', { type: 'jobTitle' });
                expect(typeof result).toBe('string');
            });
        });

        describe('location types', () => {
            it('should generate address', () => {
                const result = service.generateField('test', { type: 'address' });
                expect(typeof result).toBe('string');
            });

            it('should generate city', () => {
                const result = service.generateField('test', { type: 'city' });
                expect(typeof result).toBe('string');
            });

            it('should generate country', () => {
                const result = service.generateField('test', { type: 'country' });
                expect(typeof result).toBe('string');
            });

            it('should generate zipCode', () => {
                const result = service.generateField('test', { type: 'zipCode' });
                expect(typeof result).toBe('string');
            });
        });

        describe('company types', () => {
            it('should generate company', () => {
                const result = service.generateField('test', { type: 'company' });
                expect(typeof result).toBe('string');
            });
        });

        describe('internet types', () => {
            it('should generate url', () => {
                const result = service.generateField('test', { type: 'url' });
                expect(typeof result).toBe('string');
                expect(result).toMatch(/^https?:\/\//);
            });

            it('should generate uuid', () => {
                const result = service.generateField('test', { type: 'uuid' });
                expect(typeof result).toBe('string');
                expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            });

            it('should generate avatar', () => {
                const result = service.generateField('test', { type: 'avatar' });
                expect(typeof result).toBe('string');
            });

            it('should generate image', () => {
                const result = service.generateField('test', { type: 'image' });
                expect(typeof result).toBe('string');
            });
        });

        describe('text types', () => {
            it('should generate paragraph', () => {
                const result = service.generateField('test', { type: 'paragraph' });
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(10);
            });

            it('should generate sentence', () => {
                const result = service.generateField('test', { type: 'sentence' });
                expect(typeof result).toBe('string');
            });

            it('should generate word', () => {
                const result = service.generateField('test', { type: 'word' });
                expect(typeof result).toBe('string');
            });
        });

        describe('commerce types', () => {
            it('should generate product', () => {
                const result = service.generateField('test', { type: 'product' });
                expect(typeof result).toBe('string');
            });

            it('should generate price', () => {
                const result = service.generateField('test', { type: 'price' });
                expect(typeof result).toBe('string');
            });

            it('should generate color', () => {
                const result = service.generateField('test', { type: 'color' });
                expect(typeof result).toBe('string');
            });
        });

        describe('complex types', () => {
            it('should generate array', () => {
                const schema: FieldSchema = {
                    type: 'array',
                    length: 3,
                    items: { type: 'string' }
                };

                const result = service.generateField('test', schema);

                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(3);
                expect(typeof result[0]).toBe('string');
            });

            it('should generate object', () => {
                const schema: FieldSchema = {
                    type: 'object',
                    properties: {
                        name: { type: 'name' },
                        email: { type: 'email' }
                    }
                };

                const result = service.generateField('test', schema);

                expect(typeof result).toBe('object');
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('email');
            });

            it('should generate nested objects', () => {
                const schema: FieldSchema = {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                name: { type: 'name' },
                                contact: {
                                    type: 'object',
                                    properties: {
                                        email: { type: 'email' },
                                        phone: { type: 'phone' }
                                    }
                                }
                            }
                        }
                    }
                };

                const result = service.generateField('test', schema);

                expect(result.user).toBeDefined();
                expect(result.user.name).toBeDefined();
                expect(result.user.contact).toBeDefined();
                expect(result.user.contact.email).toBeDefined();
                expect(result.user.contact.phone).toBeDefined();
            });
        });

        describe('enum values', () => {
            it('should select from enum values', () => {
                const schema: FieldSchema = {
                    type: 'string',
                    enum: ['admin', 'user', 'guest']
                };

                const result = service.generateField('test', schema);

                expect(['admin', 'user', 'guest']).toContain(result);
            });
        });

        describe('custom faker methods', () => {
            it('should call custom faker method', () => {
                const schema: FieldSchema = {
                    type: 'string',
                    faker: 'internet.domainName'
                };

                const result = service.generateField('test', schema);

                expect(typeof result).toBe('string');
            });

            it('should handle invalid faker method gracefully', () => {
                const schema: FieldSchema = {
                    type: 'string',
                    faker: 'invalid.method.path'
                };

                const result = service.generateField('test', schema);

                expect(typeof result).toBe('string');
            });
        });
    });

    describe('complex schema generation', () => {
        it('should generate complete user profile', () => {
            const schema: DataGenerationSchema = {
                name: 'users',
                count: 1,
                fields: {
                    id: { type: 'uuid' },
                    firstName: { type: 'firstName' },
                    lastName: { type: 'lastName' },
                    email: { type: 'email' },
                    age: { type: 'number', min: 18, max: 80 },
                    isActive: { type: 'boolean' },
                    role: { type: 'string', enum: ['admin', 'user', 'moderator'] },
                    address: {
                        type: 'object',
                        properties: {
                            street: { type: 'address' },
                            city: { type: 'city' },
                            country: { type: 'country' }
                        }
                    },
                    tags: {
                        type: 'array',
                        length: 3,
                        items: { type: 'word' }
                    }
                }
            };

            const result = service.generate(schema);

            expect(result).toHaveLength(1);
            const user = result[0];

            expect(user.id).toBeDefined();
            expect(user.firstName).toBeDefined();
            expect(user.lastName).toBeDefined();
            expect(user.email).toBeDefined();
            expect(user.age).toBeGreaterThanOrEqual(18);
            expect(user.age).toBeLessThanOrEqual(80);
            expect(typeof user.isActive).toBe('boolean');
            expect(['admin', 'user', 'moderator']).toContain(user.role);
            expect(user.address).toBeDefined();
            expect(user.address.street).toBeDefined();
            expect(user.address.city).toBeDefined();
            expect(user.address.country).toBeDefined();
            expect(Array.isArray(user.tags)).toBe(true);
            expect(user.tags).toHaveLength(3);
        });
    });
});
