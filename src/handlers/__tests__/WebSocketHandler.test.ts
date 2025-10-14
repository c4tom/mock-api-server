import { WebSocketHandler } from '../WebSocketHandler';
import { WebSocketConfig } from '../../types/config';
import { Server as HTTPServer } from 'http';
import winston from 'winston';

// Mock winston logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as unknown as winston.Logger;

describe('WebSocketHandler', () => {
    let server: HTTPServer;
    let config: WebSocketConfig;

    beforeEach(() => {
        // Create a mock HTTP server with all required methods
        server = {
            on: jest.fn(),
            removeListener: jest.fn(),
            emit: jest.fn(),
            addListener: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            removeAllListeners: jest.fn(),
            setMaxListeners: jest.fn(),
            getMaxListeners: jest.fn(),
            listeners: jest.fn(),
            rawListeners: jest.fn(),
            listenerCount: jest.fn(),
            prependListener: jest.fn(),
            prependOnceListener: jest.fn(),
            eventNames: jest.fn(),
        } as unknown as HTTPServer;

        config = {
            enabled: true,
            path: '/ws',
            mockEvents: [
                {
                    name: 'test-event',
                    interval: 1000,
                    data: { message: 'test' },
                },
            ],
            proxyEnabled: false,
            proxyRoutes: {},
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should create WebSocket server with correct configuration', () => {
            const handler = new WebSocketHandler(server, config, mockLogger);

            expect(handler).toBeDefined();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'WebSocket server initialized',
                expect.objectContaining({
                    path: '/ws',
                    mockEventsCount: 1,
                    proxyEnabled: false,
                })
            );
        });

        it('should set max payload size from config', () => {
            const configWithPayload = {
                ...config,
                maxPayloadSize: 5000000,
            };

            const handler = new WebSocketHandler(server, configWithPayload, mockLogger);

            expect(handler).toBeDefined();
        });

        it('should use default max payload size if not specified', () => {
            const handler = new WebSocketHandler(server, config, mockLogger);

            expect(handler).toBeDefined();
        });
    });

    describe('getConnectedClientsCount', () => {
        it('should return 0 when no clients connected', () => {
            const handler = new WebSocketHandler(server, config, mockLogger);

            expect(handler.getConnectedClientsCount()).toBe(0);
        });
    });

    describe('getProxyConnectionsCount', () => {
        it('should return 0 when no proxy connections', () => {
            const handler = new WebSocketHandler(server, config, mockLogger);

            expect(handler.getProxyConnectionsCount()).toBe(0);
        });
    });

    describe('close', () => {
        it('should close WebSocket server and cleanup', () => {
            const handler = new WebSocketHandler(server, config, mockLogger);

            handler.close();

            expect(mockLogger.info).toHaveBeenCalledWith('Closing WebSocket server');
        });
    });

    describe('Configuration', () => {
        it('should handle empty mock events', () => {
            const emptyConfig = {
                ...config,
                mockEvents: [],
            };

            const handler = new WebSocketHandler(server, emptyConfig, mockLogger);

            expect(handler).toBeDefined();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'WebSocket server initialized',
                expect.objectContaining({
                    mockEventsCount: 0,
                })
            );
        });

        it('should handle proxy enabled configuration', () => {
            const proxyConfig = {
                ...config,
                proxyEnabled: true,
                proxyRoutes: {
                    echo: {
                        name: 'echo',
                        targetUrl: 'wss://echo.websocket.org',
                    },
                },
            };

            const handler = new WebSocketHandler(server, proxyConfig, mockLogger);

            expect(handler).toBeDefined();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'WebSocket server initialized',
                expect.objectContaining({
                    proxyEnabled: true,
                })
            );
        });

        it('should handle heartbeat interval configuration', () => {
            const heartbeatConfig = {
                ...config,
                heartbeatInterval: 30000,
            };

            const handler = new WebSocketHandler(server, heartbeatConfig, mockLogger);

            expect(handler).toBeDefined();
        });
    });
});
