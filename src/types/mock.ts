/**
 * Mock data handling types and interfaces
 */

import { Request, Response } from 'express';
import { MockEndpoint, ValidationResult } from './config';

// Re-export types from config to maintain compatibility
export { MockEndpoint, ValidationResult };

// Mock data set structure
export interface MockDataSet {
    endpoints: Record<string, ExtendedMockEndpoint>;
    versions?: Record<string, VersionedMockDataSet>;
}

// Versioned mock data set
export interface VersionedMockDataSet {
    version: string;
    endpoints: Record<string, ExtendedMockEndpoint>;
}

// Extended mock endpoint with runtime data (extends the base MockEndpoint from config)
export interface ExtendedMockEndpoint extends MockEndpoint {
    contentType?: string;
    version?: string;
}

// Mock data file structure
export interface MockDataFile {
    name: string;
    version?: string;
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
    version?: string;
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



// Request context for mock handling
export interface MockRequestContext {
    method: string;
    path: string;
    query: Record<string, any>;
    body: any;
    headers: Record<string, string>;
    version?: string;
}

// Response formatting options
export interface ResponseFormatOptions {
    contentType: 'json' | 'xml' | 'text';
    data: any;
    statusCode: number;
    headers: Record<string, string>;
}