/**
 * Configuration Manager for loading, validating, and managing application configuration
 */

import { config } from 'dotenv';
import { existsSync, watchFile, unwatchFile } from 'fs';
import { join } from 'path';
import { AppConfig, DEFAULT_CONFIG, ValidationResult } from '../types/config';
import { appConfigSchema, envSchema } from '../types/validation';

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
      proxy: {
        enabled: env.PROXY_ENABLED,
        routes: this.parseProxyRoutes(env.PROXY_ROUTES),
        timeout: parseInt(env.PROXY_TIMEOUT, 10),
        retries: parseInt(env.PROXY_RETRIES, 10),
        allowedDomains: this.parseStringArray(env.PROXY_ALLOWED_DOMAINS),
        blockedDomains: this.parseStringArray(env.PROXY_BLOCKED_DOMAINS),
      },
      logging: {
        level: env.LOG_LEVEL,
        format: env.LOG_FORMAT,
        file: env.LOG_FILE,
      },
    };
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
   * Parse proxy routes from environment variable
   * Format: "name1:url1,name2:url2"
   */
  private parseProxyRoutes(routesString: string): Record<string, any> {
    const routes: Record<string, any> = {};
    
    if (!routesString || routesString.trim() === '') {
      return routes;
    }

    const routePairs = routesString.split(',');
    for (const pair of routePairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex > 0) {
        const name = pair.substring(0, colonIndex).trim();
        const targetUrl = pair.substring(colonIndex + 1).trim();
        if (name && targetUrl) {
          routes[name] = {
            name,
            targetUrl,
          };
        }
      }
    }

    return routes;
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