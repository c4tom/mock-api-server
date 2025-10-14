/**
 * Transformation types and interfaces
 */

import { Request } from 'express';

// Transformation configuration for an endpoint
export interface TransformationConfig {
    path: string;
    method?: string | string[];
    requestTransform?: RequestTransformation;
    responseTransform?: ResponseTransformation;
}

// Request transformation configuration
export interface RequestTransformation {
    fieldMapping?: FieldMapping;
    customFunction?: TransformFunction;
    removeFields?: string[];
    addFields?: Record<string, any>;
}

// Response transformation configuration
export interface ResponseTransformation {
    fieldMapping?: FieldMapping;
    customFunction?: TransformFunction;
    removeFields?: string[];
    addFields?: Record<string, any>;
    wrapResponse?: string; // Wrap response in a field (e.g., "data")
}

// Field mapping for renaming fields
export interface FieldMapping {
    [sourceField: string]: string; // sourceField -> targetField
}

// Custom transformation function type
export type TransformFunction = (data: any, req?: Request) => any;

// Transformation context
export interface TransformationContext {
    originalData: any;
    transformedData: any;
    request: Request;
    config: TransformationConfig;
}

// Transformation result
export interface TransformationResult {
    success: boolean;
    data?: any;
    error?: string;
}
