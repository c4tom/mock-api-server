/**
 * Mock Data Handler for processing mock API requests
 */

import { Request, Response } from 'express';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import {
    IMockDataHandler,
    MockDataSet,
    MockEndpoint,
    ExtendedMockEndpoint,
    MockDataFile,
    MockDataStorage,
    MockRequestContext,
    ResponseFormatOptions,
    ValidationResult
} from '../types/mock';
import { MockConfig } from '../types/config';
import { DataGeneratorService } from '../services/DataGeneratorService';
import { DataGenerationSchema } from '../types/generation';
import { DatabaseService } from '../services/DatabaseService';
import { DatabaseConfig } from '../types/database';

export class MockDataHandler implements IMockDataHandler {
    private mockData: MockDataSet;
    private storage: MockDataStorage;
    private config: MockConfig;
    private dataGenerator: DataGeneratorService;
    private databaseService?: DatabaseService;
    private useDatabasePersistence: boolean = false;

    constructor(config: MockConfig, databaseConfig?: DatabaseConfig) {
        this.config = config;
        this.mockData = { endpoints: {}, versions: {} };
        this.storage = {};
        this.dataGenerator = new DataGeneratorService();

        // Initialize database service if config is provided and enabled
        if (databaseConfig && databaseConfig.enabled) {
            this.databaseService = new DatabaseService(databaseConfig);
            this.useDatabasePersistence = true;
        }
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase(): Promise<void> {
        if (this.databaseService && this.useDatabasePersistence) {
            try {
                await this.databaseService.connect();
                console.log('Database connected successfully');

                // Sync data from database if configured
                const dbConfig = this.databaseService as any;
                if (dbConfig.config?.syncOnStartup) {
                    await this.syncFromDatabase();
                }
            } catch (error) {
                console.error('Failed to connect to database:', error);
                this.useDatabasePersistence = false;
            }
        }
    }

    /**
     * Close database connection
     */
    async closeDatabase(): Promise<void> {
        if (this.databaseService) {
            await this.databaseService.disconnect();
        }
    }

    /**
     * Handle incoming mock API requests
     */
    async handleRequest(req: Request, res: Response): Promise<void> {
        try {
            const context = this.createRequestContext(req);

            // Validate version if versioning is enabled
            if (this.config.versioning?.enabled) {
                if (this.config.versioning.strictMode && !context.version) {
                    res.status(400).json({
                        error: {
                            code: 'VERSION_REQUIRED',
                            message: 'API version is required',
                            timestamp: new Date().toISOString(),
                            suggestions: [
                                `Set ${this.config.versioning.versionHeader || 'API-Version'} header`,
                                `Use URL prefix: ${this.config.versioning.versionPrefix || '/v{version}'}`,
                                `Supported versions: ${this.config.versioning.supportedVersions.join(', ')}`
                            ]
                        }
                    });
                    return;
                }

                if (context.version && !this.isVersionSupported(context.version)) {
                    res.status(400).json({
                        error: {
                            code: 'UNSUPPORTED_VERSION',
                            message: `API version '${context.version}' is not supported`,
                            timestamp: new Date().toISOString(),
                            supportedVersions: this.config.versioning.supportedVersions,
                            suggestions: [
                                `Use one of the supported versions: ${this.config.versioning.supportedVersions.join(', ')}`
                            ]
                        }
                    });
                    return;
                }
            }

            const endpoint = this.findMatchingEndpoint(context);

            if (!endpoint) {
                this.sendNotFoundResponse(res, context.path, context.version);
                return;
            }

            // Apply delay if configured
            if (endpoint.delay && endpoint.delay > 0) {
                await this.delay(endpoint.delay);
            }

            // Handle CRUD operations if enabled
            if (this.config.enableCrud && this.isCrudMethod(context.method)) {
                await this.handleCrudOperation(context, endpoint, res);
                return;
            }

            // Handle regular mock response
            await this.sendMockResponse(endpoint, res);
        } catch (error) {
            console.error('Error handling mock request:', error);
            res.status(500).json({
                error: {
                    code: 'MOCK_HANDLER_ERROR',
                    message: 'Internal server error while processing mock request',
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Load mock data from JSON files and configuration
     */
    async loadMockData(): Promise<MockDataSet> {
        try {
            const mockDataSet: MockDataSet = { endpoints: {}, versions: {} };

            // Initialize versions if versioning is enabled
            if (this.config.versioning?.enabled) {
                for (const version of this.config.versioning.supportedVersions) {
                    const normalizedVersion = this.normalizeVersion(version);
                    mockDataSet.versions![normalizedVersion] = {
                        version: normalizedVersion,
                        endpoints: {}
                    };
                }
            }

            // Load endpoints from configuration
            if (this.config.endpoints && this.config.endpoints.length > 0) {
                for (const endpoint of this.config.endpoints) {
                    const extendedEndpoint: ExtendedMockEndpoint = {
                        ...endpoint,
                        delay: endpoint.delay ?? this.config.defaultDelay,
                        contentType: this.determineContentType(endpoint.headers),
                        ...(endpoint.version && { version: endpoint.version })
                    };

                    // If endpoint has a version, add to versioned endpoints
                    if (endpoint.version && mockDataSet.versions) {
                        const normalizedVersion = this.normalizeVersion(endpoint.version);
                        if (mockDataSet.versions[normalizedVersion]) {
                            const key = this.createEndpointKey(endpoint.method, endpoint.path);
                            mockDataSet.versions[normalizedVersion].endpoints[key] = extendedEndpoint;
                        }
                    } else {
                        // Add to general endpoints
                        const key = this.createEndpointKey(endpoint.method, endpoint.path);
                        mockDataSet.endpoints[key] = extendedEndpoint;
                    }
                }
            }

            // Load endpoints from JSON files
            if (this.config.dataPath && existsSync(this.config.dataPath)) {
                const fileEndpoints = await this.loadFromJsonFiles();

                // Merge file endpoints into mockDataSet
                for (const [key, endpoint] of Object.entries(fileEndpoints)) {
                    if (endpoint.version && mockDataSet.versions) {
                        const normalizedVersion = this.normalizeVersion(endpoint.version);
                        if (mockDataSet.versions[normalizedVersion]) {
                            mockDataSet.versions[normalizedVersion].endpoints[key] = endpoint;
                        }
                    } else {
                        mockDataSet.endpoints[key] = endpoint;
                    }
                }
            }

            this.mockData = mockDataSet;
            this.initializeStorage();

            return mockDataSet;
        } catch (error) {
            throw new Error(`Failed to load mock data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate mock data structure
     */
    validateMockData(data: any): ValidationResult {
        try {
            if (!data || typeof data !== 'object') {
                return {
                    valid: false,
                    error: 'Mock data must be an object'
                };
            }

            if (!data.endpoints || typeof data.endpoints !== 'object') {
                return {
                    valid: false,
                    error: 'Mock data must contain an endpoints object'
                };
            }

            // Validate each endpoint
            for (const [key, endpoint] of Object.entries(data.endpoints)) {
                const validation = this.validateEndpoint(endpoint as MockEndpoint);
                if (!validation.valid) {
                    return {
                        valid: false,
                        error: `Invalid endpoint '${key}': ${validation.error}`,
                        details: validation.details
                    };
                }
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Reload mock data from files
     */
    async reloadMockData(): Promise<void> {
        await this.loadMockData();
    }

    /**
     * Update configuration
     */
    updateConfig(config: MockConfig): void {
        this.config = config;
    }

    /**
     * Create request context from Express request
     */
    private createRequestContext(req: Request): MockRequestContext {
        const version = this.extractVersion(req);

        const context: MockRequestContext = {
            method: req.method.toUpperCase(),
            path: req.path,
            query: req.query as Record<string, any>,
            body: req.body,
            headers: req.headers as Record<string, string>
        };

        if (version) {
            context.version = version;
        }

        return context;
    }

    /**
     * Extract API version from request
     * Supports both header-based and URL-based versioning
     */
    private extractVersion(req: Request): string | undefined {
        if (!this.config.versioning?.enabled) {
            return undefined;
        }

        const versionConfig = this.config.versioning;

        // 1. Check version header (e.g., API-Version: v1)
        const headerName = versionConfig.versionHeader || 'API-Version';
        const headerVersion = req.headers[headerName.toLowerCase()] as string;
        if (headerVersion) {
            return this.normalizeVersion(headerVersion);
        }

        // 2. Check URL prefix (e.g., /v1/users)
        if (versionConfig.versionPrefix) {
            const pathParts = req.path.split('/').filter(p => p);
            if (pathParts.length > 0) {
                const firstPart = pathParts[0];
                // Check if first part matches version pattern (v1, v2, etc.)
                if (firstPart && /^v\d+$/i.test(firstPart)) {
                    return this.normalizeVersion(firstPart);
                }
            }
        }

        // 3. Use default version if configured
        return versionConfig.defaultVersion;
    }

    /**
     * Normalize version string (e.g., "v1", "1", "V1" -> "v1")
     */
    private normalizeVersion(version: string): string {
        const normalized = version.toLowerCase().trim();
        return normalized.startsWith('v') ? normalized : `v${normalized}`;
    }

    /**
     * Validate if version is supported
     */
    private isVersionSupported(version?: string): boolean {
        if (!this.config.versioning?.enabled || !version) {
            return true;
        }

        const supportedVersions = this.config.versioning.supportedVersions.map(v =>
            this.normalizeVersion(v)
        );

        return supportedVersions.includes(this.normalizeVersion(version));
    }

    /**
     * Find matching endpoint for request
     */
    private findMatchingEndpoint(context: MockRequestContext): MockEndpoint | null {
        // Normalize path by removing version prefix if present
        let normalizedPath = context.path;
        if (this.config.versioning?.enabled && this.config.versioning.versionPrefix && context.version) {
            const versionPrefix = `/${context.version}`;
            if (normalizedPath.startsWith(versionPrefix)) {
                normalizedPath = normalizedPath.substring(versionPrefix.length) || '/';
            }
        }

        // If versioning is enabled and version is specified, try version-specific endpoints first
        if (this.config.versioning?.enabled && context.version && this.mockData.versions) {
            const versionData = this.mockData.versions[context.version];
            if (versionData) {
                // Try exact match in versioned endpoints
                const exactKey = this.createEndpointKey(context.method, normalizedPath);
                if (versionData.endpoints[exactKey]) {
                    return versionData.endpoints[exactKey];
                }

                // Try pattern matching in versioned endpoints
                for (const endpoint of Object.values(versionData.endpoints)) {
                    if (this.matchesPattern(endpoint, { ...context, path: normalizedPath })) {
                        return endpoint;
                    }
                }
            }
        }

        // Fall back to non-versioned endpoints
        // Try exact match first
        const exactKey = this.createEndpointKey(context.method, normalizedPath);
        if (this.mockData.endpoints[exactKey]) {
            const endpoint = this.mockData.endpoints[exactKey];
            // If endpoint has a version, check if it matches
            if (endpoint.version && context.version && endpoint.version !== context.version) {
                return null;
            }
            return endpoint;
        }

        // Try pattern matching for dynamic routes
        for (const endpoint of Object.values(this.mockData.endpoints)) {
            // If endpoint has a version, check if it matches
            if (endpoint.version && context.version && endpoint.version !== context.version) {
                continue;
            }
            if (this.matchesPattern(endpoint, { ...context, path: normalizedPath })) {
                return endpoint;
            }
        }

        return null;
    }

    /**
     * Check if endpoint pattern matches request
     */
    private matchesPattern(endpoint: ExtendedMockEndpoint, context: MockRequestContext): boolean {
        if (endpoint.method !== context.method) {
            return false;
        }

        // Simple pattern matching for paths with parameters
        const endpointParts = endpoint.path.split('/');
        const requestParts = context.path.split('/');

        if (endpointParts.length !== requestParts.length) {
            return false;
        }

        for (let i = 0; i < endpointParts.length; i++) {
            const endpointPart = endpointParts[i];
            const requestPart = requestParts[i];

            // Skip parameter parts (starting with :)
            if (endpointPart && endpointPart.startsWith(':')) {
                continue;
            }

            if (endpointPart !== requestPart) {
                return false;
            }
        }

        return true;
    }

    /**
     * Handle CRUD operations
     */
    private async handleCrudOperation(
        context: MockRequestContext,
        endpoint: ExtendedMockEndpoint,
        res: Response
    ): Promise<void> {
        const storageKey = this.getStorageKey(endpoint.path);

        switch (context.method) {
            case 'POST':
                await this.handleCreate(storageKey, context, endpoint, res);
                break;
            case 'PUT':
                await this.handleUpdate(storageKey, context, endpoint, res);
                break;
            case 'DELETE':
                await this.handleDelete(storageKey, context, endpoint, res);
                break;
            default:
                await this.sendMockResponse(endpoint, res);
        }
    }

    /**
     * Handle CREATE operation
     */
    private async handleCreate(
        storageKey: string,
        context: MockRequestContext,
        endpoint: ExtendedMockEndpoint,
        res: Response
    ): Promise<void> {
        let newItem: any;

        if (this.useDatabasePersistence && this.databaseService) {
            // Use database persistence
            try {
                const collectionName = this.getCollectionName(storageKey);
                newItem = await this.databaseService.create(collectionName, context.body);
            } catch (error) {
                console.error('Database create error:', error);
                res.status(500).json({
                    error: {
                        code: 'DATABASE_ERROR',
                        message: 'Failed to create record in database'
                    }
                });
                return;
            }
        } else {
            // Use in-memory storage
            if (!this.storage[storageKey]) {
                this.storage[storageKey] = { data: [], lastId: 0 };
            }

            newItem = {
                id: ++this.storage[storageKey].lastId,
                ...context.body,
                createdAt: new Date().toISOString()
            };

            this.storage[storageKey].data.push(newItem);
        }

        const responseOptions: ResponseFormatOptions = {
            contentType: endpoint.contentType as any || 'json',
            data: newItem,
            statusCode: 201,
            headers: endpoint.headers || {}
        };

        this.sendFormattedResponse(res, responseOptions);
    }

    /**
     * Handle UPDATE operation
     */
    private async handleUpdate(
        storageKey: string,
        context: MockRequestContext,
        endpoint: ExtendedMockEndpoint,
        res: Response
    ): Promise<void> {
        // Extract ID from path (assuming /resource/:id pattern)
        const pathParts = context.path.split('/');
        const idStr = pathParts[pathParts.length - 1];
        const id = parseInt(idStr || '', 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid ID in path'
                }
            });
            return;
        }

        let updatedItem: any;

        if (this.useDatabasePersistence && this.databaseService) {
            // Use database persistence
            try {
                const collectionName = this.getCollectionName(storageKey);
                updatedItem = await this.databaseService.update(collectionName, id, context.body);

                if (!updatedItem) {
                    res.status(404).json({
                        error: {
                            code: 'ITEM_NOT_FOUND',
                            message: `Item with ID ${id} not found`
                        }
                    });
                    return;
                }
            } catch (error) {
                console.error('Database update error:', error);
                res.status(500).json({
                    error: {
                        code: 'DATABASE_ERROR',
                        message: 'Failed to update record in database'
                    }
                });
                return;
            }
        } else {
            // Use in-memory storage
            if (!this.storage[storageKey]) {
                this.storage[storageKey] = { data: [], lastId: 0 };
            }

            const itemIndex = this.storage[storageKey].data.findIndex(item => item.id === id);

            if (itemIndex === -1) {
                res.status(404).json({
                    error: {
                        code: 'ITEM_NOT_FOUND',
                        message: `Item with ID ${id} not found`
                    }
                });
                return;
            }

            updatedItem = {
                ...this.storage[storageKey].data[itemIndex],
                ...context.body,
                updatedAt: new Date().toISOString()
            };

            this.storage[storageKey].data[itemIndex] = updatedItem;
        }

        const responseOptions: ResponseFormatOptions = {
            contentType: endpoint.contentType as any || 'json',
            data: updatedItem,
            statusCode: 200,
            headers: endpoint.headers || {}
        };

        this.sendFormattedResponse(res, responseOptions);
    }

    /**
     * Handle DELETE operation
     */
    private async handleDelete(
        storageKey: string,
        context: MockRequestContext,
        _endpoint: ExtendedMockEndpoint,
        res: Response
    ): Promise<void> {
        // Extract ID from path
        const pathParts = context.path.split('/');
        const idStr = pathParts[pathParts.length - 1];
        const id = parseInt(idStr || '', 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid ID in path'
                }
            });
            return;
        }

        let deleted: boolean;

        if (this.useDatabasePersistence && this.databaseService) {
            // Use database persistence
            try {
                const collectionName = this.getCollectionName(storageKey);
                deleted = await this.databaseService.delete(collectionName, id);

                if (!deleted) {
                    res.status(404).json({
                        error: {
                            code: 'ITEM_NOT_FOUND',
                            message: `Item with ID ${id} not found`
                        }
                    });
                    return;
                }
            } catch (error) {
                console.error('Database delete error:', error);
                res.status(500).json({
                    error: {
                        code: 'DATABASE_ERROR',
                        message: 'Failed to delete record from database'
                    }
                });
                return;
            }
        } else {
            // Use in-memory storage
            if (!this.storage[storageKey]) {
                this.storage[storageKey] = { data: [], lastId: 0 };
            }

            const itemIndex = this.storage[storageKey].data.findIndex(item => item.id === id);

            if (itemIndex === -1) {
                res.status(404).json({
                    error: {
                        code: 'ITEM_NOT_FOUND',
                        message: `Item with ID ${id} not found`
                    }
                });
                return;
            }

            this.storage[storageKey].data.splice(itemIndex, 1);
        }

        res.status(204).send();
    }

    /**
     * Send regular mock response
     */
    private async sendMockResponse(endpoint: ExtendedMockEndpoint, res: Response): Promise<void> {
        let responseData = endpoint.response;

        // If response is a function, call it to get dynamic data
        if (typeof responseData === 'function') {
            responseData = responseData();
        }

        // Check if response is a generation schema
        if (this.isGenerationSchema(responseData)) {
            responseData = this.dataGenerator.generate(responseData as DataGenerationSchema);
        }

        // Handle array responses with storage data for GET requests
        if (Array.isArray(responseData) && this.config.enableCrud) {
            const storageKey = this.getStorageKey(endpoint.path);

            if (this.useDatabasePersistence && this.databaseService) {
                // Fetch from database
                try {
                    const collectionName = this.getCollectionName(storageKey);
                    const dbData = await this.databaseService.findAll(collectionName);
                    if (dbData.length > 0) {
                        responseData = dbData;
                    }
                } catch (error) {
                    console.error('Database fetch error:', error);
                    // Fall back to in-memory or default data
                }
            } else if (this.storage[storageKey] && this.storage[storageKey].data.length > 0) {
                // Use in-memory storage
                responseData = this.storage[storageKey].data;
            }
        }

        const responseOptions: ResponseFormatOptions = {
            contentType: endpoint.contentType as any || 'json',
            data: responseData,
            statusCode: endpoint.statusCode || 200,
            headers: endpoint.headers || {}
        };

        this.sendFormattedResponse(res, responseOptions);
    }

    /**
     * Send formatted response based on content type
     */
    private sendFormattedResponse(res: Response, options: ResponseFormatOptions): void {
        // Set custom headers
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }

        // Set status code
        res.status(options.statusCode);

        // Format and send response based on content type
        switch (options.contentType) {
            case 'xml':
                res.setHeader('Content-Type', 'application/xml');
                res.send(this.formatAsXml(options.data));
                break;
            case 'text':
                res.setHeader('Content-Type', 'text/plain');
                res.send(String(options.data));
                break;
            case 'json':
            default:
                res.setHeader('Content-Type', 'application/json');
                res.json(options.data);
                break;
        }
    }

    /**
     * Send 404 response for unknown endpoints
     */
    private sendNotFoundResponse(res: Response, path: string, version?: string): void {
        const errorResponse: any = {
            error: {
                code: 'ENDPOINT_NOT_FOUND',
                message: `Mock endpoint not found: ${path}`,
                timestamp: new Date().toISOString(),
                availableEndpoints: Object.keys(this.mockData.endpoints)
            }
        };

        // Add version information if versioning is enabled
        if (this.config.versioning?.enabled) {
            errorResponse.error.requestedVersion = version || 'none';
            errorResponse.error.availableVersions = this.config.versioning.supportedVersions;

            if (version && this.mockData.versions && this.mockData.versions[version]) {
                errorResponse.error.availableEndpointsForVersion =
                    Object.keys(this.mockData.versions[version].endpoints);
            }
        }

        res.status(404).json(errorResponse);
    }

    /**
     * Load endpoints from JSON files
     */
    private async loadFromJsonFiles(): Promise<Record<string, ExtendedMockEndpoint>> {
        const endpoints: Record<string, ExtendedMockEndpoint> = {};

        try {
            const files = await readdir(this.config.dataPath);
            const jsonFiles = files.filter(file => extname(file).toLowerCase() === '.json');

            for (const file of jsonFiles) {
                const filePath = join(this.config.dataPath, file);
                const fileContent = await readFile(filePath, 'utf-8');
                const mockDataFile: MockDataFile = JSON.parse(fileContent);

                // Validate file structure
                if (!mockDataFile.endpoints || !Array.isArray(mockDataFile.endpoints)) {
                    console.warn(`Invalid mock data file structure: ${file}`);
                    continue;
                }

                // Extract version from file if specified
                const fileVersion = mockDataFile.version;

                // Process endpoints from file
                for (const endpointConfig of mockDataFile.endpoints) {
                    const key = this.createEndpointKey(endpointConfig.method, endpointConfig.path);

                    // Use endpoint-specific version, fall back to file version
                    const version = endpointConfig.version || fileVersion;

                    endpoints[key] = {
                        method: endpointConfig.method.toUpperCase(),
                        path: endpointConfig.path,
                        response: endpointConfig.response,
                        statusCode: endpointConfig.statusCode || 200,
                        headers: endpointConfig.headers || {},
                        delay: endpointConfig.delay ?? this.config.defaultDelay,
                        contentType: endpointConfig.contentType || 'json',
                        version: version
                    } as ExtendedMockEndpoint;
                }
            }
        } catch (error) {
            console.error('Error loading mock data from JSON files:', error);
        }

        return endpoints;
    }

    /**
     * Initialize storage for CRUD operations
     */
    private initializeStorage(): void {
        this.storage = {};

        // Initialize storage for endpoints that support CRUD
        for (const endpoint of Object.values(this.mockData.endpoints)) {
            if (Array.isArray(endpoint.response)) {
                const storageKey = this.getStorageKey(endpoint.path);
                this.storage[storageKey] = {
                    data: [...endpoint.response],
                    lastId: endpoint.response.length
                };
            }
        }
    }

    /**
     * Validate individual endpoint
     */
    private validateEndpoint(endpoint: ExtendedMockEndpoint): ValidationResult {
        if (!endpoint.method || typeof endpoint.method !== 'string') {
            return { valid: false, error: 'Endpoint must have a valid method' };
        }

        if (!endpoint.path || typeof endpoint.path !== 'string') {
            return { valid: false, error: 'Endpoint must have a valid path' };
        }

        if (endpoint.response === undefined) {
            return { valid: false, error: 'Endpoint must have a response' };
        }

        if (endpoint.statusCode && (typeof endpoint.statusCode !== 'number' || endpoint.statusCode < 100 || endpoint.statusCode > 599)) {
            return { valid: false, error: 'Status code must be a valid HTTP status code' };
        }

        return { valid: true };
    }

    /**
     * Create endpoint key for storage
     */
    private createEndpointKey(method: string, path: string): string {
        return `${method.toUpperCase()}:${path}`;
    }

    /**
     * Get storage key for CRUD operations
     */
    private getStorageKey(path: string): string {
        // Remove parameter parts from path for storage key
        return path.replace(/\/:\w+/g, '');
    }

    /**
     * Check if method is a CRUD method
     */
    private isCrudMethod(method: string): boolean {
        return ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase());
    }

    /**
     * Determine content type from headers
     */
    private determineContentType(headers?: Record<string, string>): string {
        if (!headers) return 'json';

        const contentType = headers['Content-Type'] || headers['content-type'];
        if (!contentType) return 'json';

        if (contentType.includes('xml')) return 'xml';
        if (contentType.includes('text')) return 'text';
        return 'json';
    }

    /**
     * Format data as XML (simple implementation)
     */
    private formatAsXml(data: any): string {
        if (typeof data === 'string') return data;

        const convertToXml = (obj: any, rootName = 'root'): string => {
            if (typeof obj !== 'object' || obj === null) {
                return `<${rootName}>${String(obj)}</${rootName}>`;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => convertToXml(item, 'item')).join('');
            }

            let xml = `<${rootName}>`;
            for (const [key, value] of Object.entries(obj)) {
                xml += convertToXml(value, key);
            }
            xml += `</${rootName}>`;
            return xml;
        };

        return `<?xml version="1.0" encoding="UTF-8"?>\n${convertToXml(data, 'response')}`;
    }

    /**
     * Add delay to response
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if response data is a generation schema
     */
    private isGenerationSchema(data: any): boolean {
        return (
            data &&
            typeof data === 'object' &&
            'fields' in data &&
            typeof data.fields === 'object'
        );
    }

    /**
     * Get collection name from storage key
     */
    private getCollectionName(storageKey: string): string {
        // Remove leading slash and replace remaining slashes with underscores
        return storageKey.replace(/^\//, '').replace(/\//g, '_') || 'default';
    }

    /**
     * Sync data from database to memory
     */
    private async syncFromDatabase(): Promise<void> {
        if (!this.databaseService) {
            return;
        }

        try {
            // Sync all endpoints that have array responses
            for (const endpoint of Object.values(this.mockData.endpoints)) {
                if (Array.isArray(endpoint.response)) {
                    const storageKey = this.getStorageKey(endpoint.path);
                    const collectionName = this.getCollectionName(storageKey);

                    const dbData = await this.databaseService.findAll(collectionName);

                    if (dbData.length === 0 && endpoint.response.length > 0) {
                        // Seed database with initial data
                        await this.databaseService.createMany(collectionName, endpoint.response);
                        console.log(`Seeded database collection: ${collectionName}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync from database:', error);
        }
    }

    /**
     * Get database health status
     */
    async getDatabaseHealth(): Promise<any> {
        if (!this.databaseService) {
            return {
                enabled: false,
                message: 'Database persistence is not enabled'
            };
        }

        return await this.databaseService.healthCheck();
    }
}