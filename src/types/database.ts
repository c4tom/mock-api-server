/**
 * Database persistence types and interfaces
 */

// Database configuration
export interface DatabaseConfig {
    enabled: boolean;
    type: 'sqlite' | 'postgresql' | 'mongodb';
    connection: SQLiteConfig | PostgreSQLConfig | MongoDBConfig;
    autoMigrate?: boolean;
    syncOnStartup?: boolean;
}

// SQLite configuration
export interface SQLiteConfig {
    filename: string;
    memory?: boolean;
}

// PostgreSQL configuration
export interface PostgreSQLConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
}

// MongoDB configuration
export interface MongoDBConfig {
    uri: string;
    database: string;
    options?: {
        maxPoolSize?: number;
        minPoolSize?: number;
        serverSelectionTimeoutMS?: number;
    };
}

// Database service interface
export interface IDatabaseService {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    // CRUD operations
    findAll(collection: string, filter?: any): Promise<any[]>;
    findOne(collection: string, filter: any): Promise<any | null>;
    create(collection: string, data: any): Promise<any>;
    update(collection: string, id: any, data: any): Promise<any | null>;
    delete(collection: string, id: any): Promise<boolean>;

    // Bulk operations
    createMany(collection: string, data: any[]): Promise<any[]>;
    deleteMany(collection: string, filter: any): Promise<number>;

    // Collection management
    collectionExists(collection: string): Promise<boolean>;
    createCollection(collection: string): Promise<void>;
    dropCollection(collection: string): Promise<void>;

    // Health check
    healthCheck(): Promise<DatabaseHealthStatus>;
}

// Database health status
export interface DatabaseHealthStatus {
    connected: boolean;
    type: string;
    latency?: number;
    error?: string;
}

// Database record structure
export interface DatabaseRecord {
    id: string | number;
    data: any;
    createdAt: Date;
    updatedAt: Date;
}

// Query options
export interface QueryOptions {
    limit?: number;
    offset?: number;
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 0 | 1>;
}
