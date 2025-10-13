/**
 * Mock data handling types and interfaces
 */

import { Request, Response } from 'express';

// Mock data set structure
export interface MockDataSet {
    endpoints: Record<string, MockEndpoint>;
}

// Extended mock endpoint with runtime data
export interface MockEndpoint {
    method: string;
    path: string;
    response: any;
    statusCode: number;
    headers?: Record<string, string>;
    delay?: number;
    contentType?: string;
}

// Mock data file structure
export interface MockDataFile {
    name: string;
    endpoints: MockEndpointConfig[];
}

// Configuration for mock endpoints from JSON files
export interface MockEndpointConfig {
    method: string;
    path: string;
    response: any;
    statusCode?: number;
    headers?: Record<string, string>;
    delay?: number;
    contentType?: 'json' | 'xml' | 'text';
}

// In-memory data storage for CRUD operations
export interface MockDataStorage {
    [path: string]: {
        data: any[];
        lastId: number;
    };
}

// Mock data handler interface
export interface IMockDataHandler {
    handleRequest(req: Request, res: Response): Promise<void>;
    loadMockData(): Promise<MockDataSet>;
    validateMockData(data: any): ValidationResult;
    reloadMockData(): Promise<void>;
}

// Validation result
export interface ValidationResult {
    valid: boolean;
    error?: string;
    details?: any;
}

// Request context for mock handling
export interface MockRequestContext {
    method: string;
    path: string;
    query: Record<string, any>;
    body: any;
    headers: Record<string, string>;
}

// Response formatting options
export interface ResponseFormatOptions {
    contentType: 'json' | 'xml' | 'text';
    data: any;
    statusCode: number;
    headers?: Record<string, string>;
}