import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server as HTTPServer } from 'http';
import { IncomingMessage } from 'http';
import winston from 'winston';
import { WebSocketConfig, WebSocketMockEvent, WebSocketProxyRoute } from '../types/config';

/**
 * WebSocket Handler for mock data and proxy functionality
 */
export class WebSocketHandler {
    private wss: WebSocketServer;
    private config: WebSocketConfig;
    private logger: winston.Logger;
    private mockIntervals: Map<string, NodeJS.Timeout> = new Map();
    private proxyConnections: Map<WebSocket, WebSocket> = new Map();

    constructor(
        server: HTTPServer,
        config: WebSocketConfig,
        logger: winston.Logger
    ) {
        this.config = config;
        this.logger = logger;

        // Create WebSocket server
        this.wss = new WebSocketServer({
            server,
            path: config.path,
            maxPayload: config.maxPayloadSize || 10 * 1024 * 1024, // 10MB default
        });

        this.setupWebSocketServer();
        this.logger.info('WebSocket server initialized', {
            path: config.path,
            mockEventsCount: config.mockEvents?.length || 0,
            proxyEnabled: config.proxyEnabled,
        });
    }

    /**
     * Setup WebSocket server event handlers
     */
    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
            const clientId = this.generateClientId();
            const url = request.url || '';

            this.logger.info('WebSocket client connected', {
                clientId,
                url,
                origin: request.headers.origin,
                userAgent: request.headers['user-agent'],
            });

            // Check if this is a proxy connection
            if (this.config.proxyEnabled && url.startsWith(`${this.config.path}/proxy/`)) {
                this.handleProxyConnection(ws, url, clientId);
            } else {
                // Handle mock data connection
                this.handleMockConnection(ws, clientId);
            }

            // Setup heartbeat
            if (this.config.heartbeatInterval) {
                this.setupHeartbeat(ws, clientId);
            }
        });

        this.wss.on('error', (error: Error) => {
            this.logger.error('WebSocket server error', { error: error.message, stack: error.stack });
        });
    }

    /**
     * Handle mock data WebSocket connection
     */
    private handleMockConnection(ws: WebSocket, clientId: string): void {
        // Send welcome message
        this.sendMessage(ws, {
            type: 'connected',
            clientId,
            timestamp: new Date().toISOString(),
            message: 'Connected to Mock API WebSocket server',
        });

        // Setup mock event intervals for this client
        this.setupMockEvents(ws, clientId);

        // Handle incoming messages
        ws.on('message', (data: RawData) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMockMessage(ws, message, clientId);
            } catch (error) {
                this.logger.error('Failed to parse WebSocket message', {
                    clientId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                this.sendError(ws, 'Invalid message format');
            }
        });

        // Handle connection close
        ws.on('close', (code: number, reason: Buffer) => {
            this.logger.info('WebSocket client disconnected', {
                clientId,
                code,
                reason: reason.toString(),
            });
            this.cleanupMockEvents(clientId);
        });

        // Handle errors
        ws.on('error', (error: Error) => {
            this.logger.error('WebSocket client error', {
                clientId,
                error: error.message,
            });
        });
    }

    /**
     * Handle proxy WebSocket connection
     */
    private handleProxyConnection(ws: WebSocket, url: string, clientId: string): void {
        // Extract route name from URL
        const pathParts = url.replace(`${this.config.path}/proxy/`, '').split('/');
        const routeName = pathParts[0];

        if (!routeName) {
            this.logger.warn('WebSocket proxy route name missing', { clientId });
            this.sendError(ws, 'Proxy route name is required');
            ws.close(1008, 'Route name missing');
            return;
        }

        const proxyRoute = this.config.proxyRoutes[routeName];

        if (!proxyRoute) {
            this.logger.warn('WebSocket proxy route not found', { clientId, routeName });
            this.sendError(ws, `Proxy route '${routeName}' not found`);
            ws.close(1008, 'Route not found');
            return;
        }

        this.logger.info('Establishing WebSocket proxy connection', {
            clientId,
            routeName,
            targetUrl: proxyRoute.targetUrl,
        });

        try {
            // Create WebSocket connection to target
            const targetWs = new WebSocket(proxyRoute.targetUrl, {
                headers: this.buildProxyHeaders(proxyRoute),
            });

            // Store proxy connection mapping
            this.proxyConnections.set(ws, targetWs);

            // Forward messages from client to target
            ws.on('message', (data: RawData) => {
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(data);
                }
            });

            // Forward messages from target to client
            targetWs.on('message', (data: RawData) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            // Handle target connection open
            targetWs.on('open', () => {
                this.logger.info('WebSocket proxy connection established', {
                    clientId,
                    routeName,
                });
                this.sendMessage(ws, {
                    type: 'proxy_connected',
                    clientId,
                    routeName,
                    timestamp: new Date().toISOString(),
                });
            });

            // Handle target connection close
            targetWs.on('close', (code: number, reason: Buffer) => {
                this.logger.info('WebSocket proxy target disconnected', {
                    clientId,
                    routeName,
                    code,
                    reason: reason.toString(),
                });
                this.proxyConnections.delete(ws);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(code, reason);
                }
            });

            // Handle target connection error
            targetWs.on('error', (error: Error) => {
                this.logger.error('WebSocket proxy target error', {
                    clientId,
                    routeName,
                    error: error.message,
                });
                this.sendError(ws, `Proxy connection error: ${error.message}`);
                this.proxyConnections.delete(ws);
                ws.close(1011, 'Proxy error');
            });

            // Handle client disconnect
            ws.on('close', () => {
                this.logger.info('WebSocket proxy client disconnected', { clientId, routeName });
                this.proxyConnections.delete(ws);
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.close();
                }
            });

            // Handle client error
            ws.on('error', (error: Error) => {
                this.logger.error('WebSocket proxy client error', {
                    clientId,
                    routeName,
                    error: error.message,
                });
                this.proxyConnections.delete(ws);
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.close();
                }
            });
        } catch (error) {
            this.logger.error('Failed to establish WebSocket proxy connection', {
                clientId,
                routeName,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            this.sendError(ws, 'Failed to establish proxy connection');
            ws.close(1011, 'Proxy connection failed');
        }
    }

    /**
     * Build headers for proxy connection
     */
    private buildProxyHeaders(route: WebSocketProxyRoute): Record<string, string> {
        const headers: Record<string, string> = {};

        if (route.auth) {
            switch (route.auth.type) {
                case 'bearer':
                    if (route.auth.token) {
                        headers['Authorization'] = `Bearer ${route.auth.token}`;
                    }
                    break;
                case 'basic':
                    if (route.auth.username && route.auth.password) {
                        const credentials = Buffer.from(
                            `${route.auth.username}:${route.auth.password}`
                        ).toString('base64');
                        headers['Authorization'] = `Basic ${credentials}`;
                    }
                    break;
                case 'apikey':
                    if (route.auth.apiKeyHeader && route.auth.apiKeyValue) {
                        headers[route.auth.apiKeyHeader] = route.auth.apiKeyValue;
                    }
                    break;
            }
        }

        return headers;
    }

    /**
     * Setup mock events for a client
     */
    private setupMockEvents(ws: WebSocket, clientId: string): void {
        if (!this.config.mockEvents || this.config.mockEvents.length === 0) {
            return;
        }

        this.config.mockEvents.forEach((event: WebSocketMockEvent) => {
            if (event.interval && event.interval > 0) {
                // Setup interval-based event
                const intervalId = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        this.sendMessage(ws, {
                            type: 'event',
                            name: event.name,
                            data: event.data,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }, event.interval);

                this.mockIntervals.set(`${clientId}-${event.name}`, intervalId);
            }
        });
    }

    /**
     * Handle incoming mock messages
     */
    private handleMockMessage(ws: WebSocket, message: any, clientId: string): void {
        this.logger.debug('Received WebSocket message', { clientId, message });

        switch (message.type) {
            case 'ping':
                this.sendMessage(ws, {
                    type: 'pong',
                    timestamp: new Date().toISOString(),
                });
                break;

            case 'subscribe':
                this.handleSubscribe(ws, message, clientId);
                break;

            case 'unsubscribe':
                this.handleUnsubscribe(ws, message, clientId);
                break;

            case 'request':
                this.handleRequest(ws, message, clientId);
                break;

            default:
                this.logger.warn('Unknown message type', { clientId, type: message.type });
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }

    /**
     * Handle subscribe message
     */
    private handleSubscribe(ws: WebSocket, message: any, clientId: string): void {
        const eventName = message.event;
        if (!eventName) {
            this.sendError(ws, 'Event name is required for subscription');
            return;
        }

        const event = this.config.mockEvents.find((e) => e.name === eventName);
        if (!event) {
            this.sendError(ws, `Event '${eventName}' not found`);
            return;
        }

        this.logger.info('Client subscribed to event', { clientId, eventName });

        // Send immediate event data
        this.sendMessage(ws, {
            type: 'event',
            name: event.name,
            data: event.data,
            timestamp: new Date().toISOString(),
        });

        // Setup interval if configured
        if (event.interval && event.interval > 0) {
            const intervalKey = `${clientId}-${eventName}`;
            if (!this.mockIntervals.has(intervalKey)) {
                const intervalId = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        this.sendMessage(ws, {
                            type: 'event',
                            name: event.name,
                            data: event.data,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }, event.interval);

                this.mockIntervals.set(intervalKey, intervalId);
            }
        }

        this.sendMessage(ws, {
            type: 'subscribed',
            event: eventName,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Handle unsubscribe message
     */
    private handleUnsubscribe(ws: WebSocket, message: any, clientId: string): void {
        const eventName = message.event;
        if (!eventName) {
            this.sendError(ws, 'Event name is required for unsubscription');
            return;
        }

        const intervalKey = `${clientId}-${eventName}`;
        const intervalId = this.mockIntervals.get(intervalKey);

        if (intervalId) {
            clearInterval(intervalId);
            this.mockIntervals.delete(intervalKey);
            this.logger.info('Client unsubscribed from event', { clientId, eventName });
        }

        this.sendMessage(ws, {
            type: 'unsubscribed',
            event: eventName,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Handle request message
     */
    private handleRequest(ws: WebSocket, message: any, clientId: string): void {
        const eventName = message.event;
        if (!eventName) {
            this.sendError(ws, 'Event name is required for request');
            return;
        }

        const event = this.config.mockEvents.find((e) => e.name === eventName);
        if (!event) {
            this.sendError(ws, `Event '${eventName}' not found`);
            return;
        }

        this.logger.debug('Client requested event data', { clientId, eventName });

        this.sendMessage(ws, {
            type: 'response',
            event: eventName,
            data: event.data,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Setup heartbeat for connection
     */
    private setupHeartbeat(ws: WebSocket, clientId: string): void {
        const interval = this.config.heartbeatInterval!;
        let isAlive = true;

        ws.on('pong', () => {
            isAlive = true;
        });

        const heartbeatInterval = setInterval(() => {
            if (!isAlive) {
                this.logger.warn('WebSocket client heartbeat timeout', { clientId });
                ws.terminate();
                clearInterval(heartbeatInterval);
                return;
            }

            isAlive = false;
            ws.ping();
        }, interval);

        ws.on('close', () => {
            clearInterval(heartbeatInterval);
        });
    }

    /**
     * Send message to client
     */
    private sendMessage(ws: WebSocket, message: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send error message to client
     */
    private sendError(ws: WebSocket, error: string): void {
        this.sendMessage(ws, {
            type: 'error',
            error,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Cleanup mock events for a client
     */
    private cleanupMockEvents(clientId: string): void {
        const keysToDelete: string[] = [];

        this.mockIntervals.forEach((_, key) => {
            if (key.startsWith(`${clientId}-`)) {
                const intervalId = this.mockIntervals.get(key);
                if (intervalId) {
                    clearInterval(intervalId);
                }
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach((key) => this.mockIntervals.delete(key));
    }

    /**
     * Generate unique client ID
     */
    private generateClientId(): string {
        return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get connected clients count
     */
    public getConnectedClientsCount(): number {
        return this.wss.clients.size;
    }

    /**
     * Get proxy connections count
     */
    public getProxyConnectionsCount(): number {
        return this.proxyConnections.size;
    }

    /**
     * Broadcast message to all connected clients
     */
    public broadcast(message: any): void {
        const messageStr = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    /**
     * Close all connections and cleanup
     */
    public close(): void {
        this.logger.info('Closing WebSocket server');

        // Clear all intervals
        this.mockIntervals.forEach((intervalId) => clearInterval(intervalId));
        this.mockIntervals.clear();

        // Close all proxy connections
        this.proxyConnections.forEach((targetWs, clientWs) => {
            if (targetWs.readyState === WebSocket.OPEN) {
                targetWs.close();
            }
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
            }
        });
        this.proxyConnections.clear();

        // Close WebSocket server
        this.wss.close(() => {
            this.logger.info('WebSocket server closed');
        });
    }
}
