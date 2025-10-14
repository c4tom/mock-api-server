/**
 * Data generation types and interfaces
 */

// Data generation schema types
export type FieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'email'
    | 'name'
    | 'firstName'
    | 'lastName'
    | 'phone'
    | 'address'
    | 'city'
    | 'country'
    | 'zipCode'
    | 'company'
    | 'jobTitle'
    | 'url'
    | 'uuid'
    | 'image'
    | 'avatar'
    | 'paragraph'
    | 'sentence'
    | 'word'
    | 'price'
    | 'product'
    | 'color'
    | 'array'
    | 'object';

// Field schema definition
export interface FieldSchema {
    type: FieldType;
    min?: number;
    max?: number;
    length?: number;
    format?: string;
    enum?: any[];
    items?: FieldSchema;
    properties?: Record<string, FieldSchema>;
    faker?: string; // Custom faker method path (e.g., 'internet.email')
}

// Data generation schema
export interface DataGenerationSchema {
    name: string;
    count?: number;
    fields: Record<string, FieldSchema>;
}

// Generation options
export interface GenerationOptions {
    locale?: string;
    seed?: number;
}

// Generated data template
export interface DataTemplate {
    name: string;
    schema: DataGenerationSchema;
    options?: GenerationOptions;
}

// Data generator interface
export interface IDataGenerator {
    generate(schema: DataGenerationSchema, options?: GenerationOptions): any[];
    generateSingle(schema: DataGenerationSchema, options?: GenerationOptions): any;
    generateField(fieldName: string, fieldSchema: FieldSchema): any;
}
