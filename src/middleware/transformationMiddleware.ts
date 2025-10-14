/**
 * Transformation Middleware for request/response data transformation
 */

import { Request, Response, NextFunction } from 'express';
import {
    TransformationConfig,
    RequestTransformation,
    ResponseTransformation,
    FieldMapping,
    TransformationResult
} from '../types/transformation';

export class TransformationMiddleware {
    private transformations: Map<string, TransformationConfig>;

    constructor(transformations: TransformationConfig[] = []) {
        this.transformations = new Map();
        this.loadTransformations(transformations);
    }

    /**
     * Load transformation configurations
     */
    loadTransformations(transformations: TransformationConfig[]): void {
        this.transformations.clear();
        for (const config of transformations) {
            const key = this.createTransformationKey(config.path, config.method);
            this.transformations.set(key, config);
        }
    }

    /**
     * Add a transformation configuration
     */
    addTransformation(config: TransformationConfig): void {
        const key = this.createTransformationKey(config.path, config.method);
        this.transformations.set(key, config);
    }

    /**
     * Remove a transformation configuration
     */
    removeTransformation(path: string, method?: string | string[]): void {
        const key = this.createTransformationKey(path, method);
        this.transformations.delete(key);
    }

    /**
     * Get all transformations
     */
    getTransformations(): TransformationConfig[] {
        return Array.from(this.transformations.values());
    }

    /**
     * Middleware function for Express
     */
    middleware() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const config = this.findMatchingTransformation(req);

            if (!config) {
                next();
                return;
            }

            // Transform request if configured
            if (config.requestTransform) {
                const result = this.transformRequest(req, config.requestTransform);
                if (!result.success) {
                    res.status(400).json({
                        error: {
                            code: 'REQUEST_TRANSFORMATION_ERROR',
                            message: result.error || 'Failed to transform request',
                            timestamp: new Date().toISOString()
                        }
                    });
                    return;
                }
                req.body = result.data;
            }

            // Transform response if configured
            if (config.responseTransform) {
                this.interceptResponse(res, config.responseTransform, req);
            }

            next();
        };
    }

    /**
     * Transform request data
     */
    private transformRequest(
        req: Request,
        transformation: RequestTransformation
    ): TransformationResult {
        try {
            let data = { ...req.body };

            // Apply custom function first if provided
            if (transformation.customFunction) {
                data = transformation.customFunction(data, req);
            }

            // Apply field mapping
            if (transformation.fieldMapping) {
                data = this.applyFieldMapping(data, transformation.fieldMapping);
            }

            // Remove fields
            if (transformation.removeFields) {
                data = this.removeFields(data, transformation.removeFields);
            }

            // Add fields
            if (transformation.addFields) {
                data = { ...data, ...transformation.addFields };
            }

            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown transformation error'
            };
        }
    }

    /**
     * Intercept and transform response
     */
    private interceptResponse(
        res: Response,
        transformation: ResponseTransformation,
        req: Request
    ): void {
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        let isTransformed = false;

        // Override json method
        res.json = function (data: any): Response {
            if (isTransformed) {
                return originalJson(data);
            }
            isTransformed = true;
            const result = transformResponseData(data, transformation, req);
            if (result.success) {
                return originalJson(result.data);
            }
            return originalJson(data);
        };

        // Override send method for non-JSON responses
        res.send = function (data: any): Response {
            if (isTransformed) {
                return originalSend(data);
            }
            // Only transform if data looks like JSON
            if (typeof data === 'object' || (typeof data === 'string' && data.trim().startsWith('{'))) {
                try {
                    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                    isTransformed = true;
                    const result = transformResponseData(parsedData, transformation, req);
                    if (result.success) {
                        return originalSend(JSON.stringify(result.data));
                    }
                } catch {
                    // If parsing fails, send original data
                }
            }
            return originalSend(data);
        };

        // Helper function to transform response data
        function transformResponseData(
            data: any,
            transformation: ResponseTransformation,
            req: Request
        ): TransformationResult {
            try {
                let transformedData = data;

                // Apply custom function first if provided
                if (transformation.customFunction) {
                    transformedData = transformation.customFunction(transformedData, req);
                }

                // Apply field mapping
                if (transformation.fieldMapping) {
                    transformedData = applyFieldMapping(transformedData, transformation.fieldMapping);
                }

                // Remove fields
                if (transformation.removeFields) {
                    transformedData = removeFields(transformedData, transformation.removeFields);
                }

                // Wrap response if configured (before adding fields)
                if (transformation.wrapResponse) {
                    transformedData = { [transformation.wrapResponse]: transformedData };
                }

                // Add fields (after wrapping so they're at the root level)
                if (transformation.addFields) {
                    transformedData = { ...transformedData, ...transformation.addFields };
                }

                return { success: true, data: transformedData };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown transformation error'
                };
            }
        }

        function applyFieldMapping(data: any, mapping: FieldMapping): any {
            if (Array.isArray(data)) {
                return data.map(item => applyFieldMapping(item, mapping));
            }

            if (typeof data !== 'object' || data === null) {
                return data;
            }

            const result: any = {};

            for (const [key, value] of Object.entries(data)) {
                const newKey = mapping[key] || key;
                result[newKey] = value;
            }

            return result;
        }

        function removeFields(data: any, fields: string[]): any {
            if (Array.isArray(data)) {
                return data.map(item => removeFields(item, fields));
            }

            if (typeof data !== 'object' || data === null) {
                return data;
            }

            const result: any = {};

            for (const [key, value] of Object.entries(data)) {
                if (!fields.includes(key)) {
                    result[key] = value;
                }
            }

            return result;
        }
    }

    /**
     * Apply field mapping to data
     */
    private applyFieldMapping(data: any, mapping: FieldMapping): any {
        if (Array.isArray(data)) {
            return data.map(item => this.applyFieldMapping(item, mapping));
        }

        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const result: any = {};

        for (const [key, value] of Object.entries(data)) {
            const newKey = mapping[key] || key;
            result[newKey] = value;
        }

        return result;
    }

    /**
     * Remove fields from data
     */
    private removeFields(data: any, fields: string[]): any {
        if (Array.isArray(data)) {
            return data.map(item => this.removeFields(item, fields));
        }

        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const result: any = {};

        for (const [key, value] of Object.entries(data)) {
            if (!fields.includes(key)) {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Find matching transformation for request
     */
    private findMatchingTransformation(req: Request): TransformationConfig | null {
        const method = req.method.toUpperCase();
        const path = req.path;

        // Try exact match with method
        const exactKey = this.createTransformationKey(path, method);
        if (this.transformations.has(exactKey)) {
            return this.transformations.get(exactKey)!;
        }

        // Try match without method (applies to all methods)
        const pathKey = this.createTransformationKey(path);
        if (this.transformations.has(pathKey)) {
            return this.transformations.get(pathKey)!;
        }

        // Try pattern matching
        for (const config of this.transformations.values()) {
            if (this.matchesPattern(config, path, method)) {
                return config;
            }
        }

        return null;
    }

    /**
     * Check if transformation config matches request
     */
    private matchesPattern(config: TransformationConfig, path: string, method: string): boolean {
        // Check method match
        if (config.method) {
            const methods = Array.isArray(config.method) ? config.method : [config.method];
            if (!methods.map(m => m.toUpperCase()).includes(method)) {
                return false;
            }
        }

        // Check path pattern match
        const configParts = config.path.split('/');
        const pathParts = path.split('/');

        if (configParts.length !== pathParts.length) {
            return false;
        }

        for (let i = 0; i < configParts.length; i++) {
            const configPart = configParts[i];
            const pathPart = pathParts[i];

            // Skip parameter parts (starting with :)
            if (configPart && configPart.startsWith(':')) {
                continue;
            }

            if (configPart !== pathPart) {
                return false;
            }
        }

        return true;
    }

    /**
     * Create transformation key
     */
    private createTransformationKey(path: string, method?: string | string[]): string {
        if (!method) {
            return path;
        }

        if (Array.isArray(method)) {
            return `${method.map(m => m.toUpperCase()).join('|')}:${path}`;
        }

        return `${method.toUpperCase()}:${path}`;
    }
}

/**
 * Create transformation middleware instance
 */
export function createTransformationMiddleware(
    transformations: TransformationConfig[] = []
): TransformationMiddleware {
    return new TransformationMiddleware(transformations);
}
