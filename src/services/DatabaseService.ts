/**
 * Database Service for persistent storage
 * Supports SQLite, PostgreSQL, and MongoDB
 */

import {
    IDatabaseService,
    DatabaseConfig,
    DatabaseHealthStatus,
    SQLiteConfig,
    PostgreSQLConfig,
    MongoDBConfig
} from '../types/database';

export class DatabaseService implements IDatabaseService {
    private config: DatabaseConfig;
    private connection: any;
    private connected: boolean = false;
    private dbType: 'sqlite' | 'postgresql' | 'mongodb';

    constructor(config: DatabaseConfig) {
        this.config = config;
        this.dbType = config.type;
    }

    /**
     * Connect to the database
     */
    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        try {
            switch (this.dbType) {
                case 'sqlite':
                    await this.connectSQLite();
                    break;
                case 'postgresql':
                    await this.connectPostgreSQL();
                    break;
                case 'mongodb':
                    await this.connectMongoDB();
                    break;
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }

            this.connected = true;

            if (this.config.autoMigrate) {
                await this.runMigrations();
            }
        } catch (error) {
            throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Disconnect from the database
     */
    async disconnect(): Promise<void> {
        if (!this.connected) {
            return;
        }

        try {
            switch (this.dbType) {
                case 'sqlite':
                    if (this.connection) {
                        this.connection.close();
                    }
                    break;
                case 'postgresql':
                    if (this.connection) {
                        await this.connection.end();
                    }
                    break;
                case 'mongodb':
                    if (this.connection) {
                        await this.connection.close();
                    }
                    break;
            }

            this.connected = false;
            this.connection = null;
        } catch (error) {
            throw new Error(`Failed to disconnect from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if database is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Find all records in a collection
     */
    async findAll(collection: string, filter: any = {}): Promise<any[]> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteFindAll(collection, filter);
                case 'postgresql':
                    return await this.postgresqlFindAll(collection, filter);
                case 'mongodb':
                    return await this.mongodbFindAll(collection, filter);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to find records: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find one record in a collection
     */
    async findOne(collection: string, filter: any): Promise<any | null> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteFindOne(collection, filter);
                case 'postgresql':
                    return await this.postgresqlFindOne(collection, filter);
                case 'mongodb':
                    return await this.mongodbFindOne(collection, filter);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to find record: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a new record
     */
    async create(collection: string, data: any): Promise<any> {
        this.ensureConnected();

        try {
            const record = {
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteCreate(collection, record);
                case 'postgresql':
                    return await this.postgresqlCreate(collection, record);
                case 'mongodb':
                    return await this.mongodbCreate(collection, record);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to create record: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a record
     */
    async update(collection: string, id: any, data: any): Promise<any | null> {
        this.ensureConnected();

        try {
            const updateData = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteUpdate(collection, id, updateData);
                case 'postgresql':
                    return await this.postgresqlUpdate(collection, id, updateData);
                case 'mongodb':
                    return await this.mongodbUpdate(collection, id, updateData);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a record
     */
    async delete(collection: string, id: any): Promise<boolean> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteDelete(collection, id);
                case 'postgresql':
                    return await this.postgresqlDelete(collection, id);
                case 'mongodb':
                    return await this.mongodbDelete(collection, id);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create many records
     */
    async createMany(collection: string, data: any[]): Promise<any[]> {
        this.ensureConnected();

        try {
            const records = data.map(item => ({
                ...item,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));

            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteCreateMany(collection, records);
                case 'postgresql':
                    return await this.postgresqlCreateMany(collection, records);
                case 'mongodb':
                    return await this.mongodbCreateMany(collection, records);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to create records: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete many records
     */
    async deleteMany(collection: string, filter: any): Promise<number> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteDeleteMany(collection, filter);
                case 'postgresql':
                    return await this.postgresqlDeleteMany(collection, filter);
                case 'mongodb':
                    return await this.mongodbDeleteMany(collection, filter);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to delete records: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if collection exists
     */
    async collectionExists(collection: string): Promise<boolean> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    return await this.sqliteCollectionExists(collection);
                case 'postgresql':
                    return await this.postgresqlCollectionExists(collection);
                case 'mongodb':
                    return await this.mongodbCollectionExists(collection);
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to check collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a collection
     */
    async createCollection(collection: string): Promise<void> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    await this.sqliteCreateCollection(collection);
                    break;
                case 'postgresql':
                    await this.postgresqlCreateCollection(collection);
                    break;
                case 'mongodb':
                    await this.mongodbCreateCollection(collection);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Drop a collection
     */
    async dropCollection(collection: string): Promise<void> {
        this.ensureConnected();

        try {
            switch (this.dbType) {
                case 'sqlite':
                    await this.sqliteDropCollection(collection);
                    break;
                case 'postgresql':
                    await this.postgresqlDropCollection(collection);
                    break;
                case 'mongodb':
                    await this.mongodbDropCollection(collection);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${this.dbType}`);
            }
        } catch (error) {
            throw new Error(`Failed to drop collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<DatabaseHealthStatus> {
        const startTime = Date.now();

        try {
            if (!this.connected) {
                return {
                    connected: false,
                    type: this.dbType,
                    error: 'Not connected'
                };
            }

            // Perform a simple query to check connection
            switch (this.dbType) {
                case 'sqlite':
                    this.connection.prepare('SELECT 1').get();
                    break;
                case 'postgresql':
                    await this.connection.query('SELECT 1');
                    break;
                case 'mongodb':
                    await this.connection.db().admin().ping();
                    break;
            }

            const latency = Date.now() - startTime;

            return {
                connected: true,
                type: this.dbType,
                latency
            };
        } catch (error) {
            return {
                connected: false,
                type: this.dbType,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Private helper methods

    private ensureConnected(): void {
        if (!this.connected) {
            throw new Error('Database not connected');
        }
    }

    private async runMigrations(): Promise<void> {
        // Run any necessary migrations
        // This is a placeholder for future migration logic
    }

    // SQLite implementation methods
    private async connectSQLite(): Promise<void> {
        const Database = require('better-sqlite3');
        const config = this.config.connection as SQLiteConfig;

        this.connection = new Database(config.filename, {
            memory: config.memory
        });

        // Enable foreign keys
        this.connection.pragma('foreign_keys = ON');
    }

    private async sqliteFindAll(collection: string, filter: any): Promise<any[]> {
        const exists = await this.sqliteCollectionExists(collection);
        if (!exists) {
            return [];
        }

        let query = `SELECT * FROM ${collection}`;
        const params: any[] = [];

        if (filter && Object.keys(filter).length > 0) {
            const conditions = Object.keys(filter).map(key => `${key} = ?`);
            query += ` WHERE ${conditions.join(' AND ')}`;
            params.push(...Object.values(filter));
        }

        const stmt = this.connection.prepare(query);
        const rows = stmt.all(...params);

        return rows.map((row: any) => this.deserializeRow(row));
    }

    private async sqliteFindOne(collection: string, filter: any): Promise<any | null> {
        const exists = await this.sqliteCollectionExists(collection);
        if (!exists) {
            return null;
        }

        const conditions = Object.keys(filter).map(key => `${key} = ?`);
        const query = `SELECT * FROM ${collection} WHERE ${conditions.join(' AND ')} LIMIT 1`;

        const stmt = this.connection.prepare(query);
        const row = stmt.get(...Object.values(filter));

        return row ? this.deserializeRow(row) : null;
    }

    private async sqliteCreate(collection: string, data: any): Promise<any> {
        await this.ensureCollectionExists(collection);

        const { id, ...dataWithoutId } = data;
        const keys = Object.keys(dataWithoutId);
        const values = Object.values(dataWithoutId).map(v => this.serializeValue(v));
        const placeholders = keys.map(() => '?').join(', ');

        const query = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders})`;
        const stmt = this.connection.prepare(query);
        const result = stmt.run(...values);

        return this.sqliteFindOne(collection, { id: result.lastInsertRowid });
    }

    private async sqliteUpdate(collection: string, id: any, data: any): Promise<any | null> {
        const exists = await this.sqliteCollectionExists(collection);
        if (!exists) {
            return null;
        }

        const { id: _, ...updateData } = data;
        const keys = Object.keys(updateData);
        const values = Object.values(updateData).map(v => this.serializeValue(v));
        const setClause = keys.map(key => `${key} = ?`).join(', ');

        const query = `UPDATE ${collection} SET ${setClause} WHERE id = ?`;
        const stmt = this.connection.prepare(query);
        stmt.run(...values, id);

        return this.sqliteFindOne(collection, { id });
    }

    private async sqliteDelete(collection: string, id: any): Promise<boolean> {
        const exists = await this.sqliteCollectionExists(collection);
        if (!exists) {
            return false;
        }

        const query = `DELETE FROM ${collection} WHERE id = ?`;
        const stmt = this.connection.prepare(query);
        const result = stmt.run(id);

        return result.changes > 0;
    }

    private async sqliteCreateMany(collection: string, data: any[]): Promise<any[]> {
        await this.ensureCollectionExists(collection);

        const results: any[] = [];
        const insert = this.connection.transaction((records: any[]) => {
            for (const record of records) {
                const { id, ...dataWithoutId } = record;
                const keys = Object.keys(dataWithoutId);
                const values = Object.values(dataWithoutId).map(v => this.serializeValue(v));
                const placeholders = keys.map(() => '?').join(', ');

                const query = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders})`;
                const stmt = this.connection.prepare(query);
                const result = stmt.run(...values);

                results.push({ ...record, id: result.lastInsertRowid });
            }
        });

        insert(data);
        return results;
    }

    private async sqliteDeleteMany(collection: string, filter: any): Promise<number> {
        const exists = await this.sqliteCollectionExists(collection);
        if (!exists) {
            return 0;
        }

        let query = `DELETE FROM ${collection}`;
        const params: any[] = [];

        if (filter && Object.keys(filter).length > 0) {
            const conditions = Object.keys(filter).map(key => `${key} = ?`);
            query += ` WHERE ${conditions.join(' AND ')}`;
            params.push(...Object.values(filter));
        }

        const stmt = this.connection.prepare(query);
        const result = stmt.run(...params);

        return result.changes;
    }

    private async sqliteCollectionExists(collection: string): Promise<boolean> {
        const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
        const stmt = this.connection.prepare(query);
        const result = stmt.get(collection);

        return !!result;
    }

    private async sqliteCreateCollection(collection: string): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS ${collection} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `;

        this.connection.exec(query);
    }

    private async sqliteDropCollection(collection: string): Promise<void> {
        const query = `DROP TABLE IF EXISTS ${collection}`;
        this.connection.exec(query);
    }

    // PostgreSQL implementation methods
    private async connectPostgreSQL(): Promise<void> {
        const { Pool } = require('pg');
        const config = this.config.connection as PostgreSQLConfig;

        this.connection = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password,
            ssl: config.ssl,
            max: config.poolSize || 10
        });
    }

    private async postgresqlFindAll(collection: string, filter: any): Promise<any[]> {
        const exists = await this.postgresqlCollectionExists(collection);
        if (!exists) {
            return [];
        }

        let query = `SELECT * FROM ${collection}`;
        const params: any[] = [];

        if (filter && Object.keys(filter).length > 0) {
            const conditions = Object.keys(filter).map((key, i) => `${key} = $${i + 1}`);
            query += ` WHERE ${conditions.join(' AND ')}`;
            params.push(...Object.values(filter));
        }

        const result = await this.connection.query(query, params);
        return result.rows.map((row: any) => this.deserializeRow(row));
    }

    private async postgresqlFindOne(collection: string, filter: any): Promise<any | null> {
        const exists = await this.postgresqlCollectionExists(collection);
        if (!exists) {
            return null;
        }

        const conditions = Object.keys(filter).map((key, i) => `${key} = $${i + 1}`);
        const query = `SELECT * FROM ${collection} WHERE ${conditions.join(' AND ')} LIMIT 1`;

        const result = await this.connection.query(query, Object.values(filter));
        return result.rows.length > 0 ? this.deserializeRow(result.rows[0]) : null;
    }

    private async postgresqlCreate(collection: string, data: any): Promise<any> {
        await this.ensureCollectionExists(collection);

        const { id, ...dataWithoutId } = data;
        const keys = Object.keys(dataWithoutId);
        const values = Object.values(dataWithoutId).map(v => this.serializeValue(v));
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.connection.query(query, values);

        return this.deserializeRow(result.rows[0]);
    }

    private async postgresqlUpdate(collection: string, id: any, data: any): Promise<any | null> {
        const exists = await this.postgresqlCollectionExists(collection);
        if (!exists) {
            return null;
        }

        const { id: _, ...updateData } = data;
        const keys = Object.keys(updateData);
        const values = Object.values(updateData).map(v => this.serializeValue(v));
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

        const query = `UPDATE ${collection} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
        const result = await this.connection.query(query, [...values, id]);

        return result.rows.length > 0 ? this.deserializeRow(result.rows[0]) : null;
    }

    private async postgresqlDelete(collection: string, id: any): Promise<boolean> {
        const exists = await this.postgresqlCollectionExists(collection);
        if (!exists) {
            return false;
        }

        const query = `DELETE FROM ${collection} WHERE id = $1`;
        const result = await this.connection.query(query, [id]);

        return result.rowCount > 0;
    }

    private async postgresqlCreateMany(collection: string, data: any[]): Promise<any[]> {
        await this.ensureCollectionExists(collection);

        const results: any[] = [];

        for (const record of data) {
            const created = await this.postgresqlCreate(collection, record);
            results.push(created);
        }

        return results;
    }

    private async postgresqlDeleteMany(collection: string, filter: any): Promise<number> {
        const exists = await this.postgresqlCollectionExists(collection);
        if (!exists) {
            return 0;
        }

        let query = `DELETE FROM ${collection}`;
        const params: any[] = [];

        if (filter && Object.keys(filter).length > 0) {
            const conditions = Object.keys(filter).map((key, i) => `${key} = $${i + 1}`);
            query += ` WHERE ${conditions.join(' AND ')}`;
            params.push(...Object.values(filter));
        }

        const result = await this.connection.query(query, params);
        return result.rowCount;
    }

    private async postgresqlCollectionExists(collection: string): Promise<boolean> {
        const query = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`;
        const result = await this.connection.query(query, [collection]);

        return result.rows[0].exists;
    }

    private async postgresqlCreateCollection(collection: string): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS ${collection} (
        id SERIAL PRIMARY KEY,
        data JSONB,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await this.connection.query(query);
    }

    private async postgresqlDropCollection(collection: string): Promise<void> {
        const query = `DROP TABLE IF EXISTS ${collection}`;
        await this.connection.query(query);
    }

    // MongoDB implementation methods
    private async connectMongoDB(): Promise<void> {
        const { MongoClient } = require('mongodb');
        const config = this.config.connection as MongoDBConfig;

        const client = new MongoClient(config.uri, config.options);
        await client.connect();

        this.connection = client;
    }

    private async mongodbFindAll(collection: string, filter: any): Promise<any[]> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const results = await coll.find(filter || {}).toArray();
        return results.map((doc: any) => this.convertMongoDoc(doc));
    }

    private async mongodbFindOne(collection: string, filter: any): Promise<any | null> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const doc = await coll.findOne(filter);
        return doc ? this.convertMongoDoc(doc) : null;
    }

    private async mongodbCreate(collection: string, data: any): Promise<any> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const result = await coll.insertOne(data);
        return { ...data, id: result.insertedId.toString() };
    }

    private async mongodbUpdate(collection: string, id: any, data: any): Promise<any | null> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const { ObjectId } = require('mongodb');
        const objectId = typeof id === 'string' ? new ObjectId(id) : id;

        const result = await coll.findOneAndUpdate(
            { _id: objectId },
            { $set: data },
            { returnDocument: 'after' }
        );

        return result.value ? this.convertMongoDoc(result.value) : null;
    }

    private async mongodbDelete(collection: string, id: any): Promise<boolean> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const { ObjectId } = require('mongodb');
        const objectId = typeof id === 'string' ? new ObjectId(id) : id;

        const result = await coll.deleteOne({ _id: objectId });
        return result.deletedCount > 0;
    }

    private async mongodbCreateMany(collection: string, data: any[]): Promise<any[]> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const result = await coll.insertMany(data);
        return data.map((item, i) => ({
            ...item,
            id: result.insertedIds[i].toString()
        }));
    }

    private async mongodbDeleteMany(collection: string, filter: any): Promise<number> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);
        const coll = db.collection(collection);

        const result = await coll.deleteMany(filter);
        return result.deletedCount;
    }

    private async mongodbCollectionExists(collection: string): Promise<boolean> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);

        const collections = await db.listCollections({ name: collection }).toArray();
        return collections.length > 0;
    }

    private async mongodbCreateCollection(collection: string): Promise<void> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);

        await db.createCollection(collection);
    }

    private async mongodbDropCollection(collection: string): Promise<void> {
        const config = this.config.connection as MongoDBConfig;
        const db = this.connection.db(config.database);

        await db.dropCollection(collection);
    }

    // Helper methods
    private async ensureCollectionExists(collection: string): Promise<void> {
        const exists = await this.collectionExists(collection);
        if (!exists) {
            await this.createCollection(collection);
        }
    }

    private serializeValue(value: any): any {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value;
    }

    private deserializeRow(row: any): any {
        const result: any = { ...row };

        // Try to parse JSON fields
        for (const [key, value] of Object.entries(result)) {
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                    result[key] = JSON.parse(value);
                } catch {
                    // Keep as string if not valid JSON
                }
            }
        }

        return result;
    }

    private convertMongoDoc(doc: any): any {
        const { _id, ...rest } = doc;
        return {
            id: _id.toString(),
            ...rest
        };
    }
}
