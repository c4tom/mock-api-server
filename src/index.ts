import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import winston from 'winston';
import { ConfigManager } from './config';
import {
  SecurityMiddleware
} from './middleware';
import { AdminHandler, MockDataHandler, ProxyHandler } from './handlers';
import { LoggingService } from './services';
import { AppConfig } from './types';

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

async function initializeApp() {
  try {
    // Load configuration
    configManager = new ConfigManager();
    config = await configManager.loadConfig(process.env['NODE_ENV'] || 'development');

    // Initialize services and handlers
    loggingService = new LoggingService(config.logging);
    adminHandler = new AdminHandler(configManager, config, loggingService);
    mockDataHandler = new MockDataHandler(config.mock);
    proxyHandler = new ProxyHandler(config.proxy);
    securityMiddleware = new SecurityMiddleware(config.security);

    logger.info('Application initialized successfully', {
      environment: config.server.environment,
      port: config.server.port
    });
  } catch (error) {
    logger.error('Failed to initialize application', { error });
    process.exit(1);
  }
}

// Request logging will be handled by LoggingService

// Error handling middleware
const errorHandler = (error: any, req: Request, res: Response, _next: NextFunction): void => {
  const requestId = (req as any).requestId || 'unknown';

  logger.error('Request error', {
    requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url
  });

  // Handle different error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.details,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (error.name === 'UnauthorizedError' || error.status === 401) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check your authentication token',
          'Ensure proper Authorization header is set',
          'For development, consider using dev-token mode'
        ]
      }
    });
    return;
  }

  if (error.status === 403) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
        requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (error.status === 429) {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        requestId,
        timestamp: new Date().toISOString(),
        retryAfter: error.retryAfter
      }
    });
    return;
  }

  // Default server error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId,
      timestamp: new Date().toISOString()
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
        proxyHandler = new ProxyHandler(config.proxy);
        securityMiddleware = new SecurityMiddleware(config.security);

        logger.info('Configuration reloaded and handlers reinitialized successfully');
      } catch (error) {
        next(error);
      }
    });

    // Health check with detailed info
    app.get('/admin/health', adminAuth, adminHandler.getHealthStatus);

    // Server statistics
    app.get('/admin/stats', adminAuth, adminHandler.getServerStats);

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

// Initialize and start server
async function startServer() {
  try {
    await initializeApp();
    setupMiddleware();
    setupRoutes();

    const PORT = config.server.port;
    const HOST = config.server.host;

    app.listen(PORT, HOST, () => {
      logger.info('Mock API Server started', {
        port: PORT,
        host: HOST,
        environment: config.server.environment,
        adminEnabled: config.server.adminEnabled,
        proxyEnabled: config.proxy.enabled,
        authEnabled: config.security.authentication.enabled
      });

      console.log(`Mock API Server running on http://${HOST}:${PORT}`);
      console.log(`Health check: http://${HOST}:${PORT}/health`);
      if (config.server.adminEnabled) {
        console.log(`Admin panel: http://${HOST}:${PORT}/admin/health`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Set server start time for metrics
process.env['SERVER_START_TIME'] = new Date().toISOString();

// Start the server
startServer();

export default app;