/**
 * Example transformation configurations
 * 
 * This file demonstrates various transformation patterns you can use
 * in your Mock API Server.
 */

import { TransformationConfig } from '../src/types/transformation';

/**
 * Example 1: Convert snake_case to camelCase
 */
export const snakeToCamelTransform: TransformationConfig = {
    path: '/api/users',
    method: 'GET',
    responseTransform: {
        fieldMapping: {
            user_id: 'userId',
            first_name: 'firstName',
            last_name: 'lastName',
            email_address: 'emailAddress',
            created_at: 'createdAt',
            updated_at: 'updatedAt'
        }
    }
};

/**
 * Example 2: Remove sensitive fields from response
 */
export const sanitizeUserTransform: TransformationConfig = {
    path: '/api/users/:id',
    method: 'GET',
    responseTransform: {
        removeFields: ['password', 'passwordHash', 'ssn', 'internalId', 'secretKey']
    }
};

/**
 * Example 3: Add metadata to all responses
 */
export const addMetadataTransform: TransformationConfig = {
    path: '/api/*',
    responseTransform: {
        addFields: {
            apiVersion: '1.0',
            server: 'mock-api',
            timestamp: new Date().toISOString()
        }
    }
};

/**
 * Example 4: Wrap response in standard format
 */
export const standardResponseTransform: TransformationConfig = {
    path: '/api/users',
    method: 'GET',
    responseTransform: {
        wrapResponse: 'data',
        addFields: {
            success: true,
            timestamp: new Date().toISOString()
        }
    }
};

/**
 * Example 5: Transform request data before processing
 */
export const normalizeUserInputTransform: TransformationConfig = {
    path: '/api/users',
    method: 'POST',
    requestTransform: {
        customFunction: (data) => ({
            ...data,
            email: data.email?.toLowerCase().trim(),
            name: data.name?.trim(),
            username: data.username?.toLowerCase().trim()
        }),
        addFields: {
            createdAt: new Date().toISOString(),
            status: 'active',
            role: 'user'
        }
    }
};

/**
 * Example 6: Add HATEOAS links to resources
 */
export const addHateoasLinksTransform: TransformationConfig = {
    path: '/api/users/:id',
    method: 'GET',
    responseTransform: {
        customFunction: (data, req) => {
            const userId = data.id || req?.params?.id;
            return {
                ...data,
                _links: {
                    self: { href: `/api/users/${userId}`, method: 'GET' },
                    update: { href: `/api/users/${userId}`, method: 'PUT' },
                    delete: { href: `/api/users/${userId}`, method: 'DELETE' },
                    posts: { href: `/api/users/${userId}/posts`, method: 'GET' },
                    comments: { href: `/api/users/${userId}/comments`, method: 'GET' }
                }
            };
        }
    }
};

/**
 * Example 7: Paginate array responses
 */
export const paginationTransform: TransformationConfig = {
    path: '/api/users',
    method: 'GET',
    responseTransform: {
        customFunction: (data, req) => {
            if (!Array.isArray(data)) return data;

            const page = parseInt(req?.query?.page as string) || 1;
            const limit = parseInt(req?.query?.limit as string) || 10;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;

            const paginatedData = data.slice(startIndex, endIndex);

            return {
                data: paginatedData,
                pagination: {
                    page,
                    limit,
                    total: data.length,
                    totalPages: Math.ceil(data.length / limit),
                    hasNext: endIndex < data.length,
                    hasPrev: page > 1
                }
            };
        }
    }
};

/**
 * Example 8: Format prices with currency
 */
export const formatPricesTransform: TransformationConfig = {
    path: '/api/products',
    method: 'GET',
    responseTransform: {
        customFunction: (data) => {
            const formatPrice = (product: any) => ({
                ...product,
                price: {
                    amount: product.price,
                    currency: 'USD',
                    formatted: `$${product.price.toFixed(2)}`
                }
            });

            return Array.isArray(data) ? data.map(formatPrice) : formatPrice(data);
        }
    }
};

/**
 * Example 9: Add computed fields
 */
export const addComputedFieldsTransform: TransformationConfig = {
    path: '/api/users/:id',
    method: 'GET',
    responseTransform: {
        customFunction: (data) => {
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            const initials = `${data.firstName?.[0] || ''}${data.lastName?.[0] || ''}`.toUpperCase();

            return {
                ...data,
                fullName,
                initials,
                displayName: fullName || data.username || data.email
            };
        }
    }
};

/**
 * Example 10: Filter and sort data
 */
export const filterAndSortTransform: TransformationConfig = {
    path: '/api/users',
    method: 'GET',
    responseTransform: {
        customFunction: (data, req) => {
            if (!Array.isArray(data)) return data;

            let result = [...data];

            // Filter by status
            const status = req?.query?.status as string;
            if (status) {
                result = result.filter(user => user.status === status);
            }

            // Filter by role
            const role = req?.query?.role as string;
            if (role) {
                result = result.filter(user => user.role === role);
            }

            // Sort
            const sortBy = req?.query?.sortBy as string;
            const sortOrder = req?.query?.sortOrder as string;
            if (sortBy) {
                result.sort((a, b) => {
                    const aVal = a[sortBy];
                    const bVal = b[sortBy];
                    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                    return sortOrder === 'desc' ? -comparison : comparison;
                });
            }

            return result;
        }
    }
};

/**
 * Example 11: Validate and sanitize input
 */
export const validateInputTransform: TransformationConfig = {
    path: '/api/users',
    method: 'POST',
    requestTransform: {
        customFunction: (data) => {
            // Sanitize strings
            const sanitize = (str: string) => str?.trim().replace(/[<>]/g, '');

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (data.email && !emailRegex.test(data.email)) {
                throw new Error('Invalid email format');
            }

            return {
                ...data,
                name: sanitize(data.name),
                email: data.email?.toLowerCase().trim(),
                bio: sanitize(data.bio)?.substring(0, 500), // Limit length
                username: sanitize(data.username)?.toLowerCase()
            };
        },
        removeFields: ['password', 'confirmPassword'] // Remove before processing
    }
};

/**
 * Example 12: API versioning transformation
 */
export const apiVersionTransform: TransformationConfig = {
    path: '/api/v1/users',
    method: 'GET',
    responseTransform: {
        fieldMapping: {
            // Map old field names to new ones
            user_id: 'id',
            user_name: 'username',
            email_address: 'email'
        },
        removeFields: ['legacy_field', 'deprecated_field'],
        addFields: {
            apiVersion: 'v1',
            deprecationNotice: 'This API version is deprecated. Please migrate to v2.'
        }
    }
};

/**
 * Example 13: Combine multiple transformations
 */
export const complexTransform: TransformationConfig = {
    path: '/api/users/:id',
    method: 'GET',
    responseTransform: {
        // Step 1: Custom function for complex logic
        customFunction: (data, req) => {
            const userId = data.id || req?.params?.id;
            return {
                ...data,
                fullName: `${data.firstName} ${data.lastName}`,
                _links: {
                    self: `/api/users/${userId}`,
                    posts: `/api/users/${userId}/posts`
                }
            };
        },
        // Step 2: Field mapping
        fieldMapping: {
            user_id: 'id',
            created_at: 'createdAt'
        },
        // Step 3: Remove sensitive fields
        removeFields: ['password', 'ssn', 'internalId'],
        // Step 4: Add metadata
        addFields: {
            apiVersion: '1.0',
            timestamp: new Date().toISOString()
        }
        // Note: wrapResponse would be step 5 if needed
    }
};

/**
 * All example transformations
 */
export const exampleTransformations: TransformationConfig[] = [
    snakeToCamelTransform,
    sanitizeUserTransform,
    addMetadataTransform,
    standardResponseTransform,
    normalizeUserInputTransform,
    addHateoasLinksTransform,
    paginationTransform,
    formatPricesTransform,
    addComputedFieldsTransform,
    filterAndSortTransform,
    validateInputTransform,
    apiVersionTransform,
    complexTransform
];

/**
 * Usage example:
 * 
 * import { createTransformationMiddleware } from './middleware/transformationMiddleware';
 * import { exampleTransformations } from './config/transformations.example';
 * 
 * const transformMiddleware = createTransformationMiddleware(exampleTransformations);
 * app.use(transformMiddleware.middleware());
 */
