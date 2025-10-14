/**
 * Configuration Manager for loading, validating, and managing application configuration
 */

import { config } from 'dotenv';
import { existsSync, watchFile, unwatchFile } from 'fs';
import { join } from 'path';
import { AppConfig, DEFAULT_CONFIG, ValidationResult } from '../types/config';
import { appConfigSchema, envSchema } from '../types/validation';
import { ProxyConfigParser } from '../utils';

export class ConfigManager {
  private currentConfig: AppConfig;
  private configPath: string;
  private isWatching: boolean = false;
  private reloadCallbacks: Array<(config: AppConfig) => void> = [];

  constructor() {
    this.currentConfig = { ...DEFAULT_CONFIG };
    this.configPath = '';
  }

  /**
   * Load configuration from environment files
   */
  async loadConfig(environment: string = process.env['NODE_ENV'] || 'development'): Promise<AppConfig> {
    try {
      // Determine config file path
      this.configPath = this.getConfigFilePath(environment);

      // Load environment variables from file
      if (existsSync(this.configPath)) {
        config({ path: this.configPath });
      }

      // Validate environment variables
      const envValidation = envSchema.validate(process.env);
      if (envValidation.error) {
        throw new Error(`Environment validation failed: ${envValidation.error.message}`);
      }

      // Transform environment variables to AppConfig
      const appConfig = this.transformEnvToConfig(envValidation.value);

      // Validate the final configuration
      const configValidation = this.validateConfig(appConfig);
      if (!configValidation.valid) {
        throw new Error(`Configuration validation failed: ${configValidation.error}`);
      }

      this.currentConfig = appConfig;
      return this.currentConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reload configuration from files
   */
  async reloadConfig(): Promise<void> {
    try {
      const environment = this.currentConfig.server.environment;
      await this.loadConfig(environment);

      // Notify all registered callbacks
      this.reloadCallbacks.forEach(callback => {
        try {
          callback(this.currentConfig);
        } catch (error) {
          console.error('Error in config reload callback:', error);
        }
      });
    } catch (error) {
      throw new Error(`Failed to reload configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return { ...this.currentConfig };
  }

  /**
   * Validate configuration object
   */
  validateConfig(config: Partial<AppConfig>): ValidationResult {
    const validation = appConfigSchema.validate(config, { abortEarly: false });

    if (validation.error) {
      return {
        valid: false,
        error: validation.error.message,
        details: validation.error.details,
      };
    }

    return { valid: true };
  }

  /**
   * Enable hot reload functionality
   */
  enableHotReload(): void {
    if (this.isWatching || !this.configPath || !existsSync(this.configPath)) {
      return;
    }

    this.isWatching = true;
    watchFile(this.configPath, { interval: 1000 }, async () => {
      try {
        console.log('Configuration file changed, reloading...');
        await this.reloadConfig();
        console.log('Configuration reloaded successfully');
      } catch (error) {
        console.error('Failed to reload configuration:', error);
      }
    });
  }

  /**
   * Disable hot reload functionality
   */
  disableHotReload(): void {
    if (!this.isWatching || !this.configPath) {
      return;
    }

    this.isWatching = false;
    unwatchFile(this.configPath);
  }

  /**
   * Register callback for configuration reload events
   */
  onConfigReload(callback: (config: AppConfig) => void): void {
    this.reloadCallbacks.push(callback);
  }

  /**
   * Remove callback for configuration reload events
   */
  offConfigReload(callback: (config: AppConfig) => void): void {
    const index = this.reloadCallbacks.indexOf(callback);
    if (index > -1) {
      this.reloadCallbacks.splice(index, 1);
    }
  }

  /**
   * Get configuration file path based on environment
   */
  private getConfigFilePath(environment: string): string {
    const configFiles = {
      development: '.env.local',
      production: '.env.production',
    };

    const fileName = configFiles[environment as keyof typeof configFiles] || '.env';
    return join(process.cwd(), fileName);
  }

  /**
   * Transform environment variables to AppConfig structure
   */
  private transformEnvToConfig(env: any): AppConfig {
    return {
      server: {
        port: parseInt(env.PORT, 10),
        host: env.HOST,
        environment: env.NODE_ENV,
        adminEnabled: env.ADMIN_ENABLED,
      },
      security: {
        authentication: {
          enabled: env.AUTH_ENABLED,
          type: env.AUTH_TYPE,
          jwtSecret: env.JWT_SECRET || undefined,
          devToken: env.DEV_TOKEN || undefined,
          ...(env.BASIC_USERNAME && env.BASIC_PASSWORD && {
            basicCredentials: {
              username: env.BASIC_USERNAME,
              password: env.BASIC_PASSWORD,
            }
          }),
        },
        cors: {
          allowedOrigins: this.parseStringArray(env.CORS_ORIGINS),
          allowCredentials: env.CORS_CREDENTIALS,
        },
        rateLimit: {
          windowMs: parseInt(env.RATE_LIMIT_WINDOW, 10),
          maxRequests: parseInt(env.RATE_LIMIT_MAX, 10),
          skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESS,
        },
      },
      mock: {
        dataPath: env.MOCK_DATA_PATH,
        endpoints: [], // Will be loaded separately from JSON files
        defaultDelay: parseInt(env.DEFAULT_DELAY, 10),
        enableCrud: env.ENABLE_CRUD,
      },
      proxy: ProxyConfigParser.buildProxyConfig(env),
      logging: {
        level: env.LOG_LEVEL,
        format: env.LOG_FORMAT,
        file: env.LOG_FILE,
      },
      ...(env.WEBSOCKET_ENABLED && {
        websocket: {
          enabled: env.WEBSOCKET_ENABLED,
          path: env.WEBSOCKET_PATH || '/ws',
          mockEvents: this.parseWebSocketMockEvents(env.WEBSOCKET_MOCK_EVENTS),
          proxyEnabled: env.WEBSOCKET_PROXY_ENABLED || false,
          proxyRoutes: this.parseWebSocketProxyRoutes(env.WEBSOCKET_PROXY_ROUTES),
          heartbeatInterval: env.WEBSOCKET_HEARTBEAT_INTERVAL ? parseInt(env.WEBSOCKET_HEARTBEAT_INTERVAL, 10) : undefined,
          maxPayloadSize: env.WEBSOCKET_MAX_PAYLOAD ? parseInt(env.WEBSOCKET_MAX_PAYLOAD, 10) : undefined,
        }
      }),
      ...(env.GRAPHQL_ENABLED && {
        graphql: {
          enabled: env.GRAPHQL_ENABLED,
          path: env.GRAPHQL_PATH || '/graphql',
          schemaPath: env.GRAPHQL_SCHEMA_PATH || undefined,
          proxyEnabled: env.GRAPHQL_PROXY_ENABLED || false,
          proxyEndpoint: env.GRAPHQL_PROXY_ENDPOINT || undefined,
          proxyAuth: this.parseGraphQLProxyAuth(env),
          playground: env.GRAPHQL_PLAYGROUND !== undefined ? env.GRAPHQL_PLAYGROUND : true,
          introspection: env.GRAPHQL_INTROSPECTION !== undefined ? env.GRAPHQL_INTROSPECTION : true,
        }
      }),
      ...(env.RECORDING_ENABLED && {
        recording: {
          enabled: env.RECORDING_ENABLED,
          autoRecord: env.RECORDING_AUTO_RECORD || false,
          maxRecordings: env.RECORDING_MAX_RECORDINGS ? parseInt(env.RECORDING_MAX_RECORDINGS, 10) : 1000,
          storageType: env.RECORDING_STORAGE_TYPE || 'memory',
          storagePath: env.RECORDING_STORAGE_PATH || './data/recordings',
          excludePaths: this.parseStringArray(env.RECORDING_EXCLUDE_PATHS || ''),
          includeHeaders: this.parseStringArray(env.RECORDING_INCLUDE_HEADERS || ''),
          excludeHeaders: this.parseStringArray(env.RECORDING_EXCLUDE_HEADERS || ''),
        }
      }),
      ...(env.DATABASE_ENABLED && {
        database: {
          enabled: env.DATABASE_ENABLED,
          type: env.DATABASE_TYPE || 'sqlite',
          connection: this.parseDatabaseConnection(env),
          autoMigrate: env.DATABASE_AUTO_MIGRATE !== undefined ? env.DATABASE_AUTO_MIGRATE : true,
          syncOnStartup: env.DATABASE_SYNC_ON_STARTUP !== undefined ? env.DATABASE_SYNC_ON_STARTUP : true,
        }
      }),
    };
  }

  /**
   * Parse database connection configuration
   */
  private parseDatabaseConnection(env: any): any {
    const dbType = env.DATABASE_TYPE || 'sqlite';

    switch (dbType) {
      case 'sqlite':
        return {
          filename: env.DATABASE_SQLITE_FILENAME || './data/mock-data.db',
          memory: env.DATABASE_SQLITE_MEMORY || false,
        };

      case 'postgresql':
        return {
          host: env.DATABASE_PG_HOST || 'localhost',
          port: env.DATABASE_PG_PORT ? parseInt(env.DATABASE_PG_PORT, 10) : 5432,
          database: env.DATABASE_PG_DATABASE || 'mockapi',
          username: env.DATABASE_PG_USERNAME || 'postgres',
          password: env.DATABASE_PG_PASSWORD || '',
          ssl: env.DATABASE_PG_SSL || false,
          poolSize: env.DATABASE_PG_POOL_SIZE ? parseInt(env.DATABASE_PG_POOL_SIZE, 10) : 10,
        };

      case 'mongodb':
        return {
          uri: env.DATABASE_MONGO_URI || 'mongodb://localhost:27017',
          database: env.DATABASE_MONGO_DATABASE || 'mockapi',
          options: {
            maxPoolSize: env.DATABASE_MONGO_MAX_POOL ? parseInt(env.DATABASE_MONGO_MAX_POOL, 10) : 10,
            minPoolSize: env.DATABASE_MONGO_MIN_POOL ? parseInt(env.DATABASE_MONGO_MIN_POOL, 10) : 2,
            serverSelectionTimeoutMS: env.DATABASE_MONGO_TIMEOUT ? parseInt(env.DATABASE_MONGO_TIMEOUT, 10) : 5000,
          },
        };

      default:
        return {
          filename: './data/mock-data.db',
          memory: false,
        };
    }
  }

  /**
   * Parse comma-separated string into array
   */
  private parseStringArray(value: string): string[] {
    if (!value || value.trim() === '') {
      return [];
    }
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * Parse WebSocket mock events from JSON string
   */
  private parseWebSocketMockEvents(value: string | undefined): any[] {
    if (!value || value.trim() === '') {
      return [];
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Failed to parse WebSocket mock events:', error);
      return [];
    }
  }

  /**
   * Parse WebSocket proxy routes from environment variable
   */
  private parseWebSocketProxyRoutes(value: string | undefined): Record<string, any> {
    if (!value || value.trim() === '') {
      return {};
    }
    try {
      // Format: name1:url1,name2:url2
      const routes: Record<string, any> = {};
      const pairs = value.split(',');
      pairs.forEach(pair => {
        const [name, targetUrl] = pair.split(':').map(s => s.trim());
        if (name && targetUrl) {
          routes[name] = {
            name,
            targetUrl,
          };
        }
      });
      return routes;
    } catch (error) {
      console.error('Failed to parse WebSocket proxy routes:', error);
      return {};
    }
  }

  /**
   * Parse GraphQL proxy authentication from environment variables
   */
  private parseGraphQLProxyAuth(env: any): any {
    if (!env.GRAPHQL_PROXY_AUTH_TYPE) {
      return undefined;
    }

    const auth: any = {
      type: env.GRAPHQL_PROXY_AUTH_TYPE,
    };

    switch (env.GRAPHQL_PROXY_AUTH_TYPE) {
      case 'bearer':
        auth.token = env.GRAPHQL_PROXY_AUTH_TOKEN;
        break;
      case 'basic':
        auth.username = env.GRAPHQL_PROXY_AUTH_USERNAME;
        auth.password = env.GRAPHQL_PROXY_AUTH_PASSWORD;
        break;
      case 'apikey':
        auth.apiKeyHeader = env.GRAPHQL_PROXY_AUTH_HEADER;
        auth.apiKeyValue = env.GRAPHQL_PROXY_AUTH_VALUE;
        break;
    }

    return auth;
  }



  /**
   * Create example configuration files if they don't exist
   */
  async createExampleConfigs(): Promise<void> {
    const developmentConfig = `# Development Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Security (Relaxed)
AUTH_ENABLED=false
AUTH_TYPE=dev-token
DEV_TOKEN=dev-12345
CORS_ORIGINS=*
CORS_CREDENTIALS=false

# Rate Limiting (Disabled for development)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
RATE_LIMIT_SKIP_SUCCESS=true

# Mock Data
MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true
DEFAULT_DELAY=0

# Proxy
PROXY_ENABLED=true
PROXY_TIMEOUT=5000
PROXY_RETRIES=3
PROXY_ROUTES=jsonplaceholder:https://jsonplaceholder.typicode.com,github:https://api.github.com
PROXY_ALLOWED_DOMAINS=jsonplaceholder.typicode.com,api.github.com,httpbin.org
PROXY_BLOCKED_DOMAINS=

# Proxy Authentication Examples (uncomment and configure as needed)
# PROXY_AUTH_GITHUB_TYPE=bearer
# PROXY_AUTH_GITHUB_TOKEN=your-github-token
# PROXY_AUTH_API1_TYPE=basic
# PROXY_AUTH_API1_USERNAME=user
# PROXY_AUTH_API1_PASSWORD=pass
# PROXY_AUTH_API2_TYPE=apikey
# PROXY_AUTH_API2_HEADER=X-API-Key
# PROXY_AUTH_API2_VALUE=your-api-key

# Proxy Headers Examples (uncomment and configure as needed)
# PROXY_HEADERS_GITHUB=User-Agent:MyApp/1.0,Accept:application/vnd.github.v3+json

# Proxy Path Rewrite Examples (uncomment and configure as needed)
# PROXY_REWRITE_API1=^/api/v1:/api/v2,^/old:/new

# Logging
LOG_LEVEL=debug
LOG_FORMAT=simple

# Admin
ADMIN_ENABLED=true
`;

    const productionConfig = `# Production Configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Security (Strict)
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=your-secret-key-change-this
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESS=false

# Mock Data
MOCK_DATA_PATH=./data/production
ENABLE_CRUD=false
DEFAULT_DELAY=100

# Proxy
PROXY_ENABLED=true
PROXY_TIMEOUT=10000
PROXY_RETRIES=3
PROXY_ROUTES=api1:https://api.production.com,api2:https://service.production.com
PROXY_ALLOWED_DOMAINS=api.production.com,service.production.com
PROXY_BLOCKED_DOMAINS=malicious.com,spam.com

# Proxy Authentication (configure as needed)
PROXY_AUTH_API1_TYPE=bearer
PROXY_AUTH_API1_TOKEN=your-production-token
PROXY_AUTH_API2_TYPE=apikey
PROXY_AUTH_API2_HEADER=X-API-Key
PROXY_AUTH_API2_VALUE=your-production-api-key

# Proxy Headers (configure as needed)
PROXY_HEADERS_API1=User-Agent:ProductionApp/1.0
PROXY_HEADERS_API2=Accept:application/json,Content-Type:application/json

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=./logs/app.log

# Admin
ADMIN_ENABLED=false
`;

    // Write example files if they don't exist
    const fs = await import('fs/promises');

    if (!existsSync('.env.local')) {
      await fs.writeFile('.env.local', developmentConfig);
    }

    if (!existsSync('.env.production')) {
      await fs.writeFile('.env.production', productionConfig);
    }
  }
}