/**
 * Request Recording and Replay Handler
 * Records API requests and responses for testing and documentation
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
    RecordedRequest,
    RequestCollection,
    ReplayOptions,
    RecordingStats
} from '../types/recording';
import { RecordingConfig } from '../types/config';
import { AuthenticatedRequest } from '../types/middleware';

export class RecordingHandler {
    private recordings: Map<string, RecordedRequest> = new Map();
    private collections: Map<string, RequestCollection> = new Map();
    private config: RecordingConfig;
    private isRecording: boolean = false;

    constructor(config?: Partial<RecordingConfig>) {
        this.config = {
            enabled: config?.enabled ?? true,
            autoRecord: config?.autoRecord ?? false,
            maxRecordings: config?.maxRecordings ?? 1000,
            storageType: config?.storageType ?? 'memory',
            storagePath: config?.storagePath ?? './data/recordings',
            excludePaths: config?.excludePaths ?? ['/admin', '/dashboard', '/health'],
            includeHeaders: config?.includeHeaders ?? ['content-type', 'authorization', 'user-agent'],
            excludeHeaders: config?.excludeHeaders ?? ['cookie', 'set-cookie']
        };

        // Create storage directory if using file storage
        if (this.config.storageType === 'file' && this.config.storagePath) {
            if (!existsSync(this.config.storagePath)) {
                mkdirSync(this.config.storagePath, { recursive: true });
            }
        }

        this.isRecording = this.config.autoRecord;
    }

    /**
     * Middleware to record requests and responses
     */
    recordingMiddleware = () => {
        return (req: Request, res: Response, next: NextFunction) => {
            // Skip if recording is disabled or path is excluded
            if (!this.config.enabled || !this.isRecording || this.shouldExcludePath(req.path)) {
                next();
                return;
            }

            const startTime = Date.now();
            const requestId = uuidv4();

            // Capture request data
            const requestData = {
                id: requestId,
                timestamp: startTime,
                method: req.method,
                url: req.originalUrl,
                path: req.path,
                query: req.query,
                headers: this.filterHeaders(req.headers, 'include'),
                body: req.body
            };

            // Capture response data
            const originalSend = res.send;
            const originalJson = res.json;
            let responseBody: any;

            res.send = function (body: any): Response {
                responseBody = body;
                return originalSend.call(this, body);
            };

            res.json = function (body: any): Response {
                responseBody = body;
                return originalJson.call(this, body);
            };

            res.on('finish', async () => {
                const duration = Date.now() - startTime;

                const recordedRequest: RecordedRequest = {
                    ...requestData,
                    response: {
                        statusCode: res.statusCode,
                        headers: this.filterHeaders(res.getHeaders() as Record<string, string>, 'include'),
                        body: responseBody
                    },
                    duration
                };

                // Store recording
                await this.storeRecording(recordedRequest);
            });

            next();
        };
    };

    /**
     * Start recording requests
     */
    startRecording = (req: AuthenticatedRequest, res: Response): void => {
        this.isRecording = true;

        res.json({
            success: true,
            message: 'Recording started',
            data: {
                startedAt: new Date().toISOString()
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Stop recording requests
     */
    stopRecording = (req: AuthenticatedRequest, res: Response): void => {
        this.isRecording = false;

        res.json({
            success: true,
            message: 'Recording stopped',
            data: {
                stoppedAt: new Date().toISOString(),
                recordingsCount: this.recordings.size
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Get recording status
     */
    getRecordingStatus = (req: AuthenticatedRequest, res: Response): void => {
        res.json({
            success: true,
            data: {
                enabled: this.config.enabled,
                recording: this.isRecording,
                autoRecord: this.config.autoRecord,
                recordingsCount: this.recordings.size,
                collectionsCount: this.collections.size,
                maxRecordings: this.config.maxRecordings,
                storageType: this.config.storageType
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Get all recordings
     */
    getRecordings = (req: AuthenticatedRequest, res: Response): void => {
        const limit = parseInt(req.query['limit'] as string) || 50;
        const offset = parseInt(req.query['offset'] as string) || 0;
        const method = req.query['method'] as string;
        const path = req.query['path'] as string;
        const collection = req.query['collection'] as string;

        let recordings = Array.from(this.recordings.values());

        // Apply filters
        if (method) {
            recordings = recordings.filter(r => r.method === method.toUpperCase());
        }
        if (path) {
            recordings = recordings.filter(r => r.path.includes(path));
        }
        if (collection) {
            recordings = recordings.filter(r => r.collection === collection);
        }

        // Sort by timestamp (newest first)
        recordings.sort((a, b) => b.timestamp - a.timestamp);

        // Apply pagination
        const paginatedRecordings = recordings.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                recordings: paginatedRecordings,
                total: recordings.length,
                limit,
                offset
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Get a specific recording by ID
     */
    getRecording = (req: AuthenticatedRequest, res: Response): void => {
        const recordingId = req.params['id'];

        if (!recordingId) {
            res.status(400).json({
                error: {
                    code: 'MISSING_RECORDING_ID',
                    message: 'Recording ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        const recording = this.recordings.get(recordingId);

        if (!recording) {
            res.status(404).json({
                error: {
                    code: 'RECORDING_NOT_FOUND',
                    message: `Recording with ID ${recordingId} not found`,
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        res.json({
            success: true,
            data: recording,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Delete a recording
     */
    deleteRecording = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const recordingId = req.params['id'];

        if (!recordingId) {
            res.status(400).json({
                error: {
                    code: 'MISSING_RECORDING_ID',
                    message: 'Recording ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        const recording = this.recordings.get(recordingId);

        if (!recording) {
            res.status(404).json({
                error: {
                    code: 'RECORDING_NOT_FOUND',
                    message: `Recording with ID ${recordingId} not found`,
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        this.recordings.delete(recordingId);

        // Delete from file storage if applicable
        if (this.config.storageType === 'file' && this.config.storagePath) {
            const filePath = join(this.config.storagePath, `${recordingId}.json`);
            try {
                if (existsSync(filePath)) {
                    await fs.unlink(filePath);
                }
            } catch (error) {
                console.error('Failed to delete recording file:', error);
            }
        }

        res.json({
            success: true,
            message: 'Recording deleted successfully',
            data: {
                deletedId: recordingId
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Clear all recordings
     */
    clearRecordings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const count = this.recordings.size;
        this.recordings.clear();

        // Clear file storage if applicable
        if (this.config.storageType === 'file' && this.config.storagePath) {
            try {
                const files = await fs.readdir(this.config.storagePath);
                for (const file of files) {
                    if (file.endsWith('.json') && !file.includes('collection')) {
                        await fs.unlink(join(this.config.storagePath, file));
                    }
                }
            } catch (error) {
                console.error('Failed to clear recording files:', error);
            }
        }

        res.json({
            success: true,
            message: 'All recordings cleared',
            data: {
                deletedCount: count
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Replay a recorded request
     */
    replayRecording = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const recordingId = req.params['id'];
        const options: ReplayOptions = req.body || {};

        if (!recordingId) {
            res.status(400).json({
                error: {
                    code: 'MISSING_RECORDING_ID',
                    message: 'Recording ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        let recording = this.recordings.get(recordingId);

        if (!recording) {
            res.status(404).json({
                error: {
                    code: 'RECORDING_NOT_FOUND',
                    message: `Recording with ID ${recordingId} not found`,
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        // Apply modifications if provided
        if (options.modifyRequest) {
            recording = options.modifyRequest(recording);
        }

        let response = recording.response;
        if (options.modifyResponse) {
            response = options.modifyResponse(response);
        }

        // Apply delay if specified
        if (options.delay && options.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }

        // Send the recorded response
        res.status(response.statusCode);
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        res.send(response.body);
    };

    /**
     * Create a collection from selected recordings
     */
    createCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { name, description, recordingIds, tags } = req.body;

        if (!name) {
            res.status(400).json({
                error: {
                    code: 'MISSING_COLLECTION_NAME',
                    message: 'Collection name is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        if (!recordingIds || !Array.isArray(recordingIds) || recordingIds.length === 0) {
            res.status(400).json({
                error: {
                    code: 'MISSING_RECORDINGS',
                    message: 'At least one recording ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        // Validate all recording IDs exist
        const recordings: RecordedRequest[] = [];
        for (const id of recordingIds) {
            const recording = this.recordings.get(id);
            if (!recording) {
                res.status(404).json({
                    error: {
                        code: 'RECORDING_NOT_FOUND',
                        message: `Recording with ID ${id} not found`,
                        timestamp: new Date().toISOString(),
                        requestId: req.requestId
                    }
                });
                return;
            }
            recordings.push({ ...recording, collection: name });
        }

        const collectionId = uuidv4();
        const collection: RequestCollection = {
            id: collectionId,
            name,
            description,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            requests: recordings,
            tags
        };

        this.collections.set(collectionId, collection);

        // Update recordings with collection reference
        recordings.forEach(recording => {
            this.recordings.set(recording.id, recording);
        });

        // Save to file if using file storage
        if (this.config.storageType === 'file' && this.config.storagePath) {
            await this.saveCollection(collection);
        }

        res.json({
            success: true,
            message: 'Collection created successfully',
            data: collection,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Get all collections
     */
    getCollections = (req: AuthenticatedRequest, res: Response): void => {
        const collections = Array.from(this.collections.values());

        res.json({
            success: true,
            data: {
                collections,
                total: collections.length
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Get a specific collection
     */
    getCollection = (req: AuthenticatedRequest, res: Response): void => {
        const collectionId = req.params['id'];

        if (!collectionId) {
            res.status(400).json({
                error: {
                    code: 'MISSING_COLLECTION_ID',
                    message: 'Collection ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        const collection = this.collections.get(collectionId);

        if (!collection) {
            res.status(404).json({
                error: {
                    code: 'COLLECTION_NOT_FOUND',
                    message: `Collection with ID ${collectionId} not found`,
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        res.json({
            success: true,
            data: collection,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Export a collection to JSON
     */
    exportCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const collectionId = req.params['id'];

        if (!collectionId) {
            res.status(400).json({
                error: {
                    code: 'MISSING_COLLECTION_ID',
                    message: 'Collection ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        const collection = this.collections.get(collectionId);

        if (!collection) {
            res.status(404).json({
                error: {
                    code: 'COLLECTION_NOT_FOUND',
                    message: `Collection with ID ${collectionId} not found`,
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${collection.name}.json"`);
        res.send(JSON.stringify(collection, null, 2));
    };

    /**
     * Import a collection from JSON
     */
    importCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const collection = req.body as RequestCollection;

        if (!collection || !collection.name || !collection.requests) {
            res.status(400).json({
                error: {
                    code: 'INVALID_COLLECTION',
                    message: 'Invalid collection format',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        // Generate new IDs to avoid conflicts
        const newCollectionId = uuidv4();
        const newCollection: RequestCollection = {
            ...collection,
            id: newCollectionId,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Import recordings
        newCollection.requests.forEach(recording => {
            const newRecordingId = uuidv4();
            const newRecording = {
                ...recording,
                id: newRecordingId,
                collection: newCollection.name
            };
            this.recordings.set(newRecordingId, newRecording);
        });

        this.collections.set(newCollectionId, newCollection);

        // Save to file if using file storage
        if (this.config.storageType === 'file' && this.config.storagePath) {
            await this.saveCollection(newCollection);
        }

        res.json({
            success: true,
            message: 'Collection imported successfully',
            data: newCollection,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Delete a collection
     */
    deleteCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const collectionId = req.params['id'];

        if (!collectionId) {
            res.status(400).json({
                error: {
                    code: 'MISSING_COLLECTION_ID',
                    message: 'Collection ID is required',
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        const collection = this.collections.get(collectionId);

        if (!collection) {
            res.status(404).json({
                error: {
                    code: 'COLLECTION_NOT_FOUND',
                    message: `Collection with ID ${collectionId} not found`,
                    timestamp: new Date().toISOString(),
                    requestId: req.requestId
                }
            });
            return;
        }

        this.collections.delete(collectionId);

        // Delete from file storage if applicable
        if (this.config.storageType === 'file' && this.config.storagePath) {
            const filePath = join(this.config.storagePath, `collection-${collectionId}.json`);
            try {
                if (existsSync(filePath)) {
                    await fs.unlink(filePath);
                }
            } catch (error) {
                console.error('Failed to delete collection file:', error);
            }
        }

        res.json({
            success: true,
            message: 'Collection deleted successfully',
            data: {
                deletedId: collectionId
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Get recording statistics
     */
    getStats = (req: AuthenticatedRequest, res: Response): void => {
        const recordings = Array.from(this.recordings.values());
        const timestamps = recordings.map(r => r.timestamp);

        const stats: RecordingStats = {
            totalRecordings: recordings.length,
            totalCollections: this.collections.size,
            oldestRecording: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
            newestRecording: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
            storageSize: this.calculateStorageSize()
        };

        res.json({
            success: true,
            data: stats,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            }
        });
    };

    /**
     * Store a recording
     */
    private async storeRecording(recording: RecordedRequest): Promise<void> {
        // Check if we've reached the max recordings limit
        if (this.recordings.size >= this.config.maxRecordings) {
            // Remove oldest recording
            const entries = Array.from(this.recordings.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            if (entries.length > 0 && entries[0]) {
                const oldestId = entries[0][0];
                this.recordings.delete(oldestId);
            }
        }

        this.recordings.set(recording.id, recording);

        // Save to file if using file storage
        if (this.config.storageType === 'file' && this.config.storagePath) {
            await this.saveRecording(recording);
        }
    }

    /**
     * Save recording to file
     */
    private async saveRecording(recording: RecordedRequest): Promise<void> {
        if (!this.config.storagePath) return;

        const filePath = join(this.config.storagePath, `${recording.id}.json`);
        try {
            await fs.writeFile(filePath, JSON.stringify(recording, null, 2));
        } catch (error) {
            console.error('Failed to save recording to file:', error);
        }
    }

    /**
     * Save collection to file
     */
    private async saveCollection(collection: RequestCollection): Promise<void> {
        if (!this.config.storagePath) return;

        const filePath = join(this.config.storagePath, `collection-${collection.id}.json`);
        try {
            await fs.writeFile(filePath, JSON.stringify(collection, null, 2));
        } catch (error) {
            console.error('Failed to save collection to file:', error);
        }
    }

    /**
     * Check if path should be excluded from recording
     */
    private shouldExcludePath(path: string): boolean {
        if (!this.config.excludePaths) return false;

        return this.config.excludePaths.some(excludePath =>
            path.startsWith(excludePath)
        );
    }

    /**
     * Filter headers based on include/exclude lists
     */
    private filterHeaders(
        headers: Record<string, any>,
        mode: 'include' | 'exclude'
    ): Record<string, string> {
        const filtered: Record<string, string> = {};
        const list = mode === 'include' ? this.config.includeHeaders : this.config.excludeHeaders;

        if (!list || list.length === 0) {
            // If no filter list, return all headers (converted to strings)
            Object.entries(headers).forEach(([key, value]) => {
                filtered[key] = String(value);
            });
            return filtered;
        }

        Object.entries(headers).forEach(([key, value]) => {
            const shouldInclude = mode === 'include'
                ? list.includes(key.toLowerCase())
                : !list.includes(key.toLowerCase());

            if (shouldInclude) {
                filtered[key] = String(value);
            }
        });

        return filtered;
    }

    /**
     * Calculate approximate storage size in bytes
     */
    private calculateStorageSize(): number {
        let size = 0;

        // Calculate recordings size
        this.recordings.forEach(recording => {
            size += JSON.stringify(recording).length;
        });

        // Calculate collections size
        this.collections.forEach(collection => {
            size += JSON.stringify(collection).length;
        });

        return size;
    }

    /**
     * Load recordings from file storage
     */
    async loadFromStorage(): Promise<void> {
        if (this.config.storageType !== 'file' || !this.config.storagePath) {
            return;
        }

        try {
            const files = await fs.readdir(this.config.storagePath);

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = join(this.config.storagePath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);

                if (file.startsWith('collection-')) {
                    // Load collection
                    this.collections.set(data.id, data as RequestCollection);
                } else {
                    // Load recording
                    this.recordings.set(data.id, data as RecordedRequest);
                }
            }

            console.log(`Loaded ${this.recordings.size} recordings and ${this.collections.size} collections from storage`);
        } catch (error) {
            console.error('Failed to load recordings from storage:', error);
        }
    }
}
