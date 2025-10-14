/**
 * Transformation configurations for the Mock API Server
 * 
 * This file defines request/response transformations that will be applied
 * to your API endpoints. Uncomment and modify the examples below to get started.
 * 
 * For more examples, see config/transformations.example.ts
 */

import { TransformationConfig } from '../src/types/transformation';

/**
 * Define your transformations here
 */
const transformations: TransformationConfig[] = [
    // Example: Convert snake_case to camelCase for user endpoints
    // {
    //   path: '/mock/users',
    //   method: 'GET',
    //   responseTransform: {
    //     fieldMapping: {
    //       user_id: 'userId',
    //       first_name: 'firstName',
    //       last_name: 'lastName',
    //       created_at: 'createdAt'
    //     }
    //   }
    // },

    // Example: Remove sensitive fields from responses
    // {
    //   path: '/mock/users/:id',
    //   method: 'GET',
    //   responseTransform: {
    //     removeFields: ['password', 'ssn', 'internalId']
    //   }
    // },

    // Example: Add metadata to all responses
    // {
    //   path: '/mock/*',
    //   responseTransform: {
    //     addFields: {
    //       apiVersion: '1.0',
    //       timestamp: new Date().toISOString()
    //     }
    //   }
    // },

    // Example: Wrap responses in standard format
    // {
    //   path: '/mock/users',
    //   method: 'GET',
    //   responseTransform: {
    //     wrapResponse: 'data',
    //     addFields: {
    //       success: true
    //     }
    //   }
    // },

    // Example: Custom transformation with computed fields
    // {
    //   path: '/mock/users/:id',
    //   method: 'GET',
    //   responseTransform: {
    //     customFunction: (data, req) => {
    //       const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    //       return {
    //         ...data,
    //         fullName,
    //         _links: {
    //           self: `/mock/users/${data.id}`,
    //           posts: `/mock/users/${data.id}/posts`
    //         }
    //       };
    //     }
    //   }
    // }
];

export default transformations;
