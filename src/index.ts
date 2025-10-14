import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import winston from 'winston';
import { ConfigManager } from './config';
import {
  SecurityMiddleware,
  createTransformationMiddleware
} from './middleware';
import { AdminHandler, MockDataHandler, ProxyHandler, WebSocketHandler, GraphQLHandler } from './handlers';
import { LoggingService } from './services';
import { AppConfig } from './types';
import { TransformationConfig } from './types/transformation';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: process.env['LOG_FORMAT'] === 'json'
    ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
    : winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.simple()
    ),
  transports: [
    new winston.transports.Console(),
    ...(process.env['LOG_FILE'] ? [new winston.transports.File({ filename: process.env['LOG_FILE'] })] : [])
  ]
});

// Create Express app
const app: Express = express();

// Initialize configuration and handlers
let config: AppConfig;
let configManager: ConfigManager;
let loggingService: LoggingService;
let adminHandler: AdminHandler;
let mockDataHandler: MockDataHandler;
let proxyHandler: ProxyHandler;
let securityMiddleware: SecurityMiddleware;
let transformationMiddleware: ReturnType<typeof createTransformationMiddleware>;
let webSocketHandler: WebSocketHandler | undefined;
let graphqlHandler: GraphQLHandler | undefined;
let server: any;

/**
 * Validates required configurations before server startup
 */
function validateStartupConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Validate server configuration
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    errors.push('Invalid port number. Must be between 1 and 65535');
  }

  if (!config.server.host) {
    errors.push('Host configuration is required');
  }

  // Validate authentication configuration
  if (config.security.authentication.enabled) {
    if (config.security.authentication.type === 'jwt' && !config.security.authentication.jwtSecret) {
      errors.push('JWT secret is required when JWT authentication is enabled');
    }

    if (config.security.authentication.type === 'basic' && !config.security.authentication.basicCredentials) {
      errors.push('Basic credentials are required when Basic authentication is enabled');
    }

    if (config.security.authentication.type === 'dev-token' && !config.security.authentication.devToken) {
      errors.push('Dev token is required when dev-token authentication is enabled');
    }
  }

  // Validate CORS configuration
  if (config.server.environment === 'production' &&
    config.security.cors.allowedOrigins.includes('*')) {
    logger.warn('Warning: CORS is set to allow all origins (*) in production environment');
  }

  // Validate proxy configuration
  if (config.proxy.enabled) {
    if (!config.proxy.routes || Object.keys(config.proxy.routes).length === 0) {
      logger.warn('Proxy is enabled but no routes are configured');
    }

    if (config.proxy.timeout && config.proxy.timeout < 1000) {
      logger.warn('Proxy timeout is very low (< 1000ms), this may cause frequent timeouts');
    }
  }

  // Validate mock configuration
  if (config.mock.dataPath && !config.mock.dataPath.trim()) {
    errors.push('Mock data path cannot be empty');
  }

  if (errors.length > 0) {
    logger.error('Configuration validation failed', { errors });
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  logger.info('Configuration validation passed');
}

async function initializeApp() {
  try {
    // Load configuration
    configManager = new ConfigManager();
    config = await configManager.loadConfig(process.env['NODE_ENV'] || 'development');

    // Validate configuration before proceeding
    validateStartupConfig(config);

    // Initialize services and handlers
    loggingService = new LoggingService(config.logging);
    adminHandler = new AdminHandler(configManager, config, loggingService);
    mockDataHandler = new MockDataHandler(config.mock);
    proxyHandler = new ProxyHandler(
      config.proxy,
      config.security.cors.allowedOrigins,
      config.proxy.cache
    );
    securityMiddleware = new SecurityMiddleware(config.security);

    // Initialize transformation middleware
    transformationMiddleware = createTransformationMiddleware(loadTransformations());

    // Set proxy handler reference in admin handler for cache management
    adminHandler.setProxyHandler(proxyHandler);

    // Initialize GraphQL handler if enabled
    if (config.graphql?.enabled) {
      graphqlHandler = new GraphQLHandler(config.graphql);
      logger.info('GraphQL handler initialized', {
        path: config.graphql.path,
        playground: config.graphql.playground,
        proxyEnabled: config.graphql.proxyEnabled,
      });
    }

    logger.info('Application initialized successfully', {
      environment: config.server.environment,
      port: config.server.port,
      host: config.server.host,
      authEnabled: config.security.authentication.enabled,
      authType: config.security.authentication.type,
      proxyEnabled: config.proxy.enabled,
      adminEnabled: config.server.adminEnabled,
      graphqlEnabled: config.graphql?.enabled || false,
      transformationsLoaded: transformationMiddleware.getTransformations().length
    });
  } catch (error) {
    logger.error('Failed to initialize application', { error });
    throw error;
  }
}

/**
 * Load transformation configurations
 * Attempts to load from config/transformations.ts or returns empty array
 */
function loadTransformations(): TransformationConfig[] {
  try {
    // Try to load transformations from config file
    const transformationsPath = './config/transformations';
    const transformations = require(transformationsPath);

    if (transformations.default) {
      logger.info('Loaded transformations from config file', {
        count: transformations.default.length
      });
      return transformations.default;
    }

    if (Array.isArray(transformations)) {
      logger.info('Loaded transformations from config file', {
        count: transformations.length
      });
      return transformations;
    }

    logger.info('No transformations found in config file');
    return [];
  } catch (error) {
    // Config file doesn't exist or has errors - that's okay
    logger.debug('No transformation config file found, using empty transformations');
    return [];
  }
}

// Request logging will be handled by LoggingService

/**
 * Comprehensive error handling middleware
 * Handles different error types with appropriate responses and logging
 */
const errorHandler = (error: any, req: Request, res: Response, _next: NextFunction): void => {
  const requestId = (req as any).requestId || 'unknown';
  const timestamp = new Date().toISOString();

  // Log error with full context
  logger.error('Request error', {
    requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Prevent sending response if headers already sent
  if (res.headersSent) {
    logger.warn('Headers already sent, cannot send error response', { requestId });
    return;
  }

  // Handle validation errors (400)
  if (error.name === 'ValidationError' || error.isJoi) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.details || error.message,
        requestId,
        timestamp,
        suggestions: [
          'Check the request payload format',
          'Ensure all required fields are provided',
          'Verify data types match the expected schema'
        ]
      }
    });
    return;
  }

  // Handle authentication errors (401)
  if (error.name === 'UnauthorizedError' || error.status === 401 || error.code === 'UNAUTHORIZED') {
    const suggestions = [
      'Check your authentication token',
      'Ensure proper Authorization header is set'
    ];

    // Add environment-specific suggestions
    if (config?.server.environment === 'development') {
      suggestions.push('For development, consider using dev-token mode');
      suggestions.push('Set AUTH_TYPE=dev-token and DEV_TOKEN=your-token in .env.local');
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Authentication required',
        requestId,
        timestamp,
        suggestions
      }
    });
    return;
  }

  // Handle authorization/forbidden errors (403)
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: error.message || 'Access denied',
        requestId,
        timestamp,
        suggestions: [
          'Verify you have permission to access this resource',
          'Check if your origin is in the allowed origins list',
          'Ensure your IP is not blocked'
        ]
      }
    });
    return;
  }

  // Handle not found errors (404)
  if (error.status === 404 || error.code === 'NOT_FOUND') {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: error.message || 'Resource not found',
        requestId,
        timestamp,
        suggestions: [
          'Check the endpoint URL',
          'Verify the HTTP method',
          'Check available routes in the documentation'
        ]
      }
    });
    return;
  }

  // Handle payload too large errors (413)
  if (error.status === 413 || error.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload is too large',
        requestId,
        timestamp,
        suggestions: [
          'Reduce the size of your request payload',
          'Maximum payload size is 10MB',
          'Consider splitting large requests into smaller chunks'
        ]
      }
    });
    return;
  }

  // Handle unsupported media type errors (415)
  if (error.status === 415 || error.code === 'UNSUPPORTED_MEDIA_TYPE') {
    res.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported media type',
        requestId,
        timestamp,
        suggestions: [
          'Supported formats: JSON, XML, text',
          'Set appropriate Content-Type header',
          'Check the API documentation for supported formats'
        ]
      }
    });
    return;
  }

  // Handle rate limit errors (429)
  if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.retryAfter || 60;
    res.status(429)
      .header('Retry-After', retryAfter.toString())
      .json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          requestId,
          timestamp,
          retryAfter,
          suggestions: [
            `Wait ${retryAfter} seconds before retrying`,
            'Reduce the frequency of your requests',
            'Consider implementing request throttling on the client side'
          ]
        }
      });
    return;
  }

  // Handle proxy errors (502)
  if (error.code === 'PROXY_ERROR' || error.status === 502) {
    logger.error('Proxy error occurred', {
      requestId,
      targetUrl: error.targetUrl,
      error: error.message,
      stack: error.stack
    });

    res.status(502).json({
      error: {
        code: 'PROXY_ERROR',
        message: error.message || 'Failed to proxy request to external API',
        requestId,
        timestamp,
        suggestions: [
          'Check if the target API is accessible',
          'Verify the proxy configuration',
          'Check network connectivity',
          'Review proxy timeout settings'
        ]
      }
    });
    return;
  }

  // Handle timeout errors (504)
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || error.status === 504) {
    res.status(504).json({
      error: {
        code: 'GATEWAY_TIMEOUT',
        message: 'Request timeout',
        requestId,
        timestamp,
        suggestions: [
          'The request took too long to complete',
          'Try again later',
          'Check if the target service is responding slowly'
        ]
      }
    });
    return;
  }

  // Handle service unavailable errors (503)
  if (error.status === 503 || error.code === 'SERVICE_UNAVAILABLE') {
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        requestId,
        timestamp,
        suggestions: [
          'The service is temporarily unavailable',
          'Try again in a few moments',
          'Check the service status page'
        ]
      }
    });
    return;
  }

  // Default server error (500)
  const isDevelopment = config?.server.environment === 'development';

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      requestId,
      timestamp,
      ...(isDevelopment && { stack: error.stack }),
      suggestions: [
        'An unexpected error occurred on the server',
        'Please try again later',
        'If the problem persists, contact support with the request ID'
      ]
    }
  });
};

// Setup middleware chain
function setupMiddleware() {
  // Basic Express middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (first in chain)
  app.use(loggingService.requestLogger);

  // Security middleware chain
  app.use(securityMiddleware.handlePreflight);
  app.use(securityMiddleware.validateOrigin);
  app.use(securityMiddleware.checkBlockedIPs);
  app.use(securityMiddleware.applyRateLimit);

  // Transformation middleware (after security, before routes)
  app.use(transformationMiddleware.middleware());

  // Authentication middleware will be applied per route as needed
  // This will be applied per route as needed
}

// Setup routes
function setupRoutes() {
  // Health check endpoint (no auth required)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Mock API Server is running',
      environment: config.server.environment,
      version: process.env['npm_package_version'] || '1.0.0'
    });
  });

  // Admin routes (with auth if enabled)
  if (config.server.adminEnabled) {
    const adminAuth = config.security.authentication.enabled
      ? securityMiddleware.requireAdmin
      : (_req: Request, _res: Response, next: NextFunction) => next();

    // Get current configuration
    app.get('/admin/config', adminAuth, adminHandler.getConfig);

    // Reload configuration
    app.post('/admin/reload', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        await adminHandler.reloadConfig(req as any, res, next);

        // Update config reference and reinitialize handlers with new config
        config = configManager.getConfig();
        loggingService.updateConfig(config.logging);
        adminHandler.updateConfig(config);
        adminHandler.updateLoggingService(loggingService);
        mockDataHandler = new MockDataHandler(config.mock);
        proxyHandler = new ProxyHandler(
          config.proxy,
          config.security.cors.allowedOrigins,
          config.proxy.cache
        );
        securityMiddleware = new SecurityMiddleware(config.security);

        // Update proxy handler reference in admin handler
        adminHandler.setProxyHandler(proxyHandler);

        // Reinitialize GraphQL handler if enabled
        if (config.graphql?.enabled) {
          graphqlHandler = new GraphQLHandler(config.graphql);
        } else {
          graphqlHandler = undefined;
        }

        logger.info('Configuration reloaded and handlers reinitialized successfully');
      } catch (error) {
        next(error);
      }
    });

    // Health check with detailed info
    app.get('/admin/health', adminAuth, adminHandler.getHealthStatus);

    // Server statistics
    app.get('/admin/stats', adminAuth, adminHandler.getServerStats);

    // WebSocket statistics
    app.get('/admin/websocket/stats', adminAuth, (req: Request, res: Response) => {
      if (!webSocketHandler) {
        res.status(404).json({
          error: {
            code: 'WEBSOCKET_NOT_ENABLED',
            message: 'WebSocket server is not enabled',
            timestamp: new Date().toISOString(),
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          enabled: true,
          connectedClients: webSocketHandler.getConnectedClientsCount(),
          proxyConnections: webSocketHandler.getProxyConnectionsCount(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId
        }
      });
    });

    // Recent request logs
    app.get('/admin/logs', adminAuth, (req: Request, res: Response) => {
      const limit = parseInt(req.query['limit'] as string) || 50;
      const recentRequests = loggingService.getRecentRequests(limit);

      res.json({
        success: true,
        data: {
          requests: recentRequests,
          count: recentRequests.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId
        }
      });
    });

    // Cache management endpoints
    app.get('/admin/cache/stats', adminAuth, adminHandler.getCacheStats);
    app.post('/admin/cache/clear', adminAuth, adminHandler.clearCache);
    app.post('/admin/cache/invalidate/:routeName', adminAuth, adminHandler.invalidateCacheByRoute);

    // Transformation management endpoints
    app.get('/admin/transformations', adminAuth, (req: Request, res: Response) => {
      const transformations = transformationMiddleware.getTransformations();
      res.json({
        success: true,
        data: {
          transformations,
          count: transformations.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId
        }
      });
    });

    app.post('/admin/transformations', adminAuth, (req: Request, res: Response) => {
      try {
        const transformation = req.body as TransformationConfig;

        // Basic validation
        if (!transformation.path) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Transformation path is required',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        transformationMiddleware.addTransformation(transformation);

        logger.info('Transformation added', {
          path: transformation.path,
          method: transformation.method
        });

        res.json({
          success: true,
          message: 'Transformation added successfully',
          data: transformation,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
          }
        });
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'TRANSFORMATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to add transformation',
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    app.delete('/admin/transformations', adminAuth, (req: Request, res: Response) => {
      try {
        const { path, method } = req.body;

        if (!path) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Transformation path is required',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        transformationMiddleware.removeTransformation(path, method);

        logger.info('Transformation removed', { path, method });

        res.json({
          success: true,
          message: 'Transformation removed successfully',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
          }
        });
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'TRANSFORMATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to remove transformation',
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    // GraphQL statistics
    app.get('/admin/graphql/stats', adminAuth, (req: Request, res: Response) => {
      if (!graphqlHandler) {
        res.status(404).json({
          error: {
            code: 'GRAPHQL_NOT_ENABLED',
            message: 'GraphQL endpoint is not enabled',
            timestamp: new Date().toISOString(),
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          enabled: true,
          path: config.graphql?.path,
          playground: config.graphql?.playground,
          introspection: config.graphql?.introspection,
          proxyEnabled: config.graphql?.proxyEnabled,
          proxyEndpoint: config.graphql?.proxyEndpoint,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId
        }
      });
    });
  }

  // Mock data routes (with auth if enabled)
  const mockAuth = config.security.authentication.enabled
    ? securityMiddleware.authenticateRequest
    : (_req: Request, _res: Response, next: NextFunction) => next();

  // Handle all mock data routes
  app.all('/mock/*', mockAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await mockDataHandler.handleRequest(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Proxy routes (with auth if enabled)
  if (config.proxy.enabled) {
    const proxyAuth = config.security.authentication.enabled
      ? securityMiddleware.authenticateRequest
      : (_req: Request, _res: Response, next: NextFunction) => next();

    // Generic proxy endpoint
    app.all('/proxy', proxyAuth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        await proxyHandler.handleProxyRequest(req, res);
      } catch (error) {
        next(error);
      }
    });

    // Named proxy routes
    Object.keys(config.proxy.routes).forEach(routeName => {
      app.all(`/proxy/${routeName}/*`, proxyAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
          await proxyHandler.handleProxyRequest(req, res);
        } catch (error) {
          next(error);
        }
      });
    });
  }

  // GraphQL routes (with auth if enabled)
  if (config.graphql?.enabled && graphqlHandler) {
    const graphqlAuth = config.security.authentication.enabled
      ? securityMiddleware.authenticateRequest
      : (_req: Request, _res: Response, next: NextFunction) => next();

    // GraphQL endpoint
    app.all(config.graphql.path, graphqlAuth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!graphqlHandler) {
          res.status(404).json({
            error: {
              code: 'GRAPHQL_NOT_INITIALIZED',
              message: 'GraphQL handler is not initialized',
              timestamp: new Date().toISOString(),
            }
          });
          return;
        }
        await graphqlHandler.handleRequest(req, res);
      } catch (error) {
        next(error);
      }
    });

    // GraphQL proxy endpoint (if enabled)
    if (config.graphql.proxyEnabled && config.graphql.proxyEndpoint) {
      app.post(`${config.graphql.path}/proxy`, graphqlAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
          if (!graphqlHandler) {
            res.status(404).json({
              error: {
                code: 'GRAPHQL_NOT_INITIALIZED',
                message: 'GraphQL handler is not initialized',
                timestamp: new Date().toISOString(),
              }
            });
            return;
          }
          await graphqlHandler.handleProxyRequest(req, res);
        } catch (error) {
          next(error);
        }
      });
    }
  }

  // OPTIONS handling for CORS preflight
  app.options('*', (req: Request, res: Response) => {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Dev-Bypass');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  });

  // 404 handler for unmatched routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check the endpoint URL',
          'Verify the HTTP method',
          'Check available routes in the documentation'
        ]
      }
    });
  });

  // Error handling middleware (last in chain)
  app.use(loggingService.errorLogger);
  app.use(errorHandler);
}

/**
 * Gracefully shuts down the server
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, initiating graceful shutdown`);

  // Close WebSocket connections first
  if (webSocketHandler) {
    logger.info('Closing WebSocket connections');
    webSocketHandler.close();
  }

  // Stop accepting new connections
  if (server) {
    server.close((err: Error | undefined) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err });
        process.exit(1);
      }

      logger.info('Server closed successfully');

      // Perform cleanup tasks
      logger.info('Performing cleanup tasks');

      // Close any open connections, database connections, etc.
      // In this case, we don't have persistent connections to close

      logger.info('Cleanup completed, exiting process');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000); // 10 second timeout
  } else {
    logger.info('No active server to close, exiting');
    process.exit(0);
  }
}

// Initialize and start server
async function startServer() {
  try {
    await initializeApp();
    setupMiddleware();
    setupRoutes();

    const PORT = config.server.port;
    const HOST = config.server.host;

    // Check if port is available before binding
    server = app.listen(PORT, HOST, () => {
      // Initialize WebSocket server if enabled
      if (config.websocket?.enabled) {
        webSocketHandler = new WebSocketHandler(server, config.websocket, logger);
        logger.info('WebSocket server enabled', {
          path: config.websocket.path,
          proxyEnabled: config.websocket.proxyEnabled,
        });
      }

      logger.info('Mock API Server started successfully', {
        port: PORT,
        host: HOST,
        environment: config.server.environment,
        adminEnabled: config.server.adminEnabled,
        proxyEnabled: config.proxy.enabled,
        authEnabled: config.security.authentication.enabled,
        authType: config.security.authentication.type,
        websocketEnabled: config.websocket?.enabled || false,
        nodeVersion: process.version,
        pid: process.pid
      });

      console.log('\n=================================');
      console.log('Mock API Server is running!');
      console.log('=================================');
      console.log(`Server URL: http://${HOST}:${PORT}`);
      console.log(`Health check: http://${HOST}:${PORT}/health`);
      if (config.server.adminEnabled) {
        console.log(`Admin panel: http://${HOST}:${PORT}/admin/health`);
      }
      if (config.websocket?.enabled) {
        console.log(`WebSocket URL: ws://${HOST}:${PORT}${config.websocket.path}`);
      }
      if (config.graphql?.enabled) {
        console.log(`GraphQL endpoint: http://${HOST}:${PORT}${config.graphql.path}`);
        if (config.graphql.playground) {
          console.log(`GraphQL Playground: http://${HOST}:${PORT}${config.graphql.path}`);
        }
      }
      console.log(`Environment: ${config.server.environment}`);
      console.log(`Process ID: ${process.pid}`);
      console.log('=================================\n');
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`, { error });
        console.error(`\nError: Port ${PORT} is already in use.`);
        console.error('Please choose a different port or stop the process using this port.\n');
        process.exit(1);
      } else if (error.code === 'EACCES') {
        logger.error(`Permission denied to bind to port ${PORT}`, { error });
        console.error(`\nError: Permission denied to bind to port ${PORT}.`);
        console.error('Try using a port number above 1024 or run with elevated privileges.\n');
        process.exit(1);
      } else {
        logger.error('Server error', { error });
        console.error('\nServer error:', error.message, '\n');
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('\nFailed to start server:', error instanceof Error ? error.message : error, '\n');
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  console.error('\nUncaught exception:', error.message);
  console.error('Stack trace:', error.stack, '\n');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  console.error('\nUnhandled promise rejection:', reason, '\n');
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Set server start time for metrics
process.env['SERVER_START_TIME'] = new Date().toISOString();

// Start the server
startServer();

export default app;