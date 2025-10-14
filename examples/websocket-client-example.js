#!/usr/bin/env node

/**
 * WebSocket Client Example
 * 
 * This example demonstrates how to connect to the Mock API Server's WebSocket
 * and interact with mock events.
 * 
 * Usage:
 *   node examples/websocket-client-example.js
 * 
 * Make sure the server is running with WebSocket enabled:
 *   npm run dev
 */

const WebSocket = require('ws');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';
const RECONNECT_DELAY = 5000;

let ws = null;
let reconnectTimeout = null;

/**
 * Connect to WebSocket server
 */
function connect() {
    console.log(`\n🔌 Connecting to ${WS_URL}...`);

    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('✅ Connected to WebSocket server\n');

        // Subscribe to ticker events
        console.log('📊 Subscribing to ticker events...');
        ws.send(JSON.stringify({
            type: 'subscribe',
            event: 'ticker'
        }));

        // Subscribe to notifications
        console.log('🔔 Subscribing to notifications...');
        ws.send(JSON.stringify({
            type: 'subscribe',
            event: 'notifications'
        }));

        // Send a ping every 10 seconds
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('🏓 Sending ping...');
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 10000);
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(message);
        } catch (error) {
            console.error('❌ Failed to parse message:', error.message);
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', (code, reason) => {
        console.log(`\n🔌 Disconnected (code: ${code}, reason: ${reason || 'none'})`);
        console.log(`⏳ Reconnecting in ${RECONNECT_DELAY / 1000} seconds...`);

        // Attempt to reconnect
        reconnectTimeout = setTimeout(() => {
            connect();
        }, RECONNECT_DELAY);
    });
}

/**
 * Handle incoming messages
 */
function handleMessage(message) {
    const timestamp = new Date().toLocaleTimeString();

    switch (message.type) {
        case 'connected':
            console.log(`✅ [${timestamp}] Connected with client ID: ${message.clientId}`);
            break;

        case 'subscribed':
            console.log(`✅ [${timestamp}] Subscribed to event: ${message.event}`);
            break;

        case 'unsubscribed':
            console.log(`✅ [${timestamp}] Unsubscribed from event: ${message.event}`);
            break;

        case 'event':
            console.log(`📨 [${timestamp}] Event '${message.name}':`, JSON.stringify(message.data, null, 2));
            break;

        case 'response':
            console.log(`📨 [${timestamp}] Response for '${message.event}':`, JSON.stringify(message.data, null, 2));
            break;

        case 'pong':
            console.log(`🏓 [${timestamp}] Pong received`);
            break;

        case 'error':
            console.error(`❌ [${timestamp}] Error:`, message.error);
            break;

        case 'proxy_connected':
            console.log(`✅ [${timestamp}] Proxy connected to route: ${message.routeName}`);
            break;

        default:
            console.log(`📨 [${timestamp}] Unknown message type:`, message.type);
    }
}

/**
 * Graceful shutdown
 */
function shutdown() {
    console.log('\n\n👋 Shutting down...');

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }

    if (ws) {
        ws.close();
    }

    setTimeout(() => {
        console.log('✅ Goodbye!\n');
        process.exit(0);
    }, 1000);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the client
console.log('='.repeat(60));
console.log('WebSocket Client Example');
console.log('='.repeat(60));
console.log('Press Ctrl+C to exit\n');

connect();
