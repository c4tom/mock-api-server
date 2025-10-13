/**
 * Unit tests for ConfigManager
 */

import { ConfigManager } from '../ConfigManager';
import { AppConfig, DEFAULT_CONFIG } from '../../types/config';
import { existsSync } from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  watchFile: jest.fn(),
  unwatchFile: jest.fn(),
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    configManager = new ConfigManager();
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration with default values when no env file exists', async () => {
      mockExistsSync.mockReturnValue(false);
      
      // Set minimal required environment variables
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'false',
        AUTH_TYPE: 'disabled',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      const config = await configManager.loadConfig('development');

      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('localhost');
      expect(config.server.environment).toBe('development');
      expect(config.security.authentication.enabled).toBe(false);
      expect(config.security.authentication.type).toBe('disabled');
    });

    it('should load configuration from .env.local for development', async () => {
      mockExistsSync.mockReturnValue(true);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: '4000',
        HOST: '0.0.0.0',
        AUTH_ENABLED: 'true',
        AUTH_TYPE: 'jwt',
        JWT_SECRET: 'test-secret',
        CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
        CORS_CREDENTIALS: 'true',
        RATE_LIMIT_WINDOW: '600000',
        RATE_LIMIT_MAX: '200',
        RATE_LIMIT_SKIP_SUCCESS: 'true',
        MOCK_DATA_PATH: './data/test',
        ENABLE_CRUD: 'false',
        DEFAULT_DELAY: '500',
        PROXY_ENABLED: 'false',
        PROXY_TIMEOUT: '10000',
        PROXY_RETRIES: '5',
        PROXY_ROUTES: 'test:https://test.com',
        PROXY_ALLOWED_DOMAINS: 'test.com,api.test.com',
        PROXY_BLOCKED_DOMAINS: 'malicious.com',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'json',
        LOG_FILE: './logs/test.log',
        ADMIN_ENABLED: 'false',
      };

      const config = await configManager.loadConfig('development');

      expect(config.server.port).toBe(4000);
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.security.authentication.enabled).toBe(true);
      expect(config.security.authentication.type).toBe('jwt');
      expect(config.security.authentication.jwtSecret).toBe('test-secret');
      expect(config.security.cors.allowedOrigins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
      expect(config.security.cors.allowCredentials).toBe(true);
      expect(config.proxy.enabled).toBe(false);
      expect(config.proxy.routes['test']?.targetUrl).toBe('https://test.com');
      expect(config.proxy.allowedDomains).toEqual(['test.com', 'api.test.com']);
      expect(config.proxy.blockedDomains).toEqual(['malicious.com']);
      expect(config.logging.level).toBe('debug');
      expect(config.logging.format).toBe('json');
      expect(config.logging.file).toBe('./logs/test.log');
    });

    it('should load configuration from .env.production for production', async () => {
      mockExistsSync.mockReturnValue(true);
      
      process.env = {
        NODE_ENV: 'production',
        PORT: '8080',
        HOST: '0.0.0.0',
        AUTH_ENABLED: 'true',
        AUTH_TYPE: 'basic',
        BASIC_USERNAME: 'admin',
        BASIC_PASSWORD: 'secret',
        CORS_ORIGINS: 'https://myapp.com',
        CORS_CREDENTIALS: 'true',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '50',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/production',
        ENABLE_CRUD: 'false',
        DEFAULT_DELAY: '100',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '15000',
        PROXY_RETRIES: '2',
        PROXY_ROUTES: 'api:https://api.production.com',
        PROXY_ALLOWED_DOMAINS: 'api.production.com',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'warn',
        LOG_FORMAT: 'json',
        ADMIN_ENABLED: 'false',
      };

      const config = await configManager.loadConfig('production');

      expect(config.server.environment).toBe('production');
      expect(config.server.port).toBe(8080);
      expect(config.security.authentication.type).toBe('basic');
      expect(config.security.authentication.basicCredentials).toEqual({
        username: 'admin',
        password: 'secret',
      });
      expect(config.security.cors.allowedOrigins).toEqual(['https://myapp.com']);
      expect(config.security.rateLimit.maxRequests).toBe(50);
      expect(config.mock.enableCrud).toBe(false);
      expect(config.server.adminEnabled).toBe(false);
    });

    it('should handle dev-token authentication type', async () => {
      mockExistsSync.mockReturnValue(false);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'true',
        AUTH_TYPE: 'dev-token',
        DEV_TOKEN: 'dev-12345',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      const config = await configManager.loadConfig('development');

      expect(config.security.authentication.type).toBe('dev-token');
      expect(config.security.authentication.devToken).toBe('dev-12345');
    });

    it('should throw error for invalid configuration', async () => {
      mockExistsSync.mockReturnValue(false);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: 'invalid-port', // Invalid port
        HOST: 'localhost',
        AUTH_ENABLED: 'false',
        AUTH_TYPE: 'disabled',
      };

      await expect(configManager.loadConfig('development')).rejects.toThrow('Environment validation failed');
    });

    it('should throw error when JWT secret is missing for JWT auth', async () => {
      mockExistsSync.mockReturnValue(false);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'true',
        AUTH_TYPE: 'jwt',
        // JWT_SECRET is missing
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      await expect(configManager.loadConfig('development')).rejects.toThrow('Configuration validation failed');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const validConfig: AppConfig = {
        ...DEFAULT_CONFIG,
        server: {
          port: 3000,
          host: 'localhost',
          environment: 'development',
          adminEnabled: true,
        },
      };

      const result = configManager.validateConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid port', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        server: {
          ...DEFAULT_CONFIG.server,
          port: -1, // Invalid port
        },
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('port');
    });

    it('should reject invalid environment', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        server: {
          ...DEFAULT_CONFIG.server,
          environment: 'invalid' as any, // Invalid environment
        },
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('environment');
    });

    it('should reject invalid authentication type', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        security: {
          ...DEFAULT_CONFIG.security,
          authentication: {
            ...DEFAULT_CONFIG.security.authentication,
            type: 'invalid' as any, // Invalid auth type
          },
        },
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('type');
    });

    it('should reject invalid log level', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        logging: {
          ...DEFAULT_CONFIG.logging,
          level: 'invalid' as any, // Invalid log level
        },
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('level');
    });
  });

  describe('reloadConfig', () => {
    it('should reload configuration successfully', async () => {
      mockExistsSync.mockReturnValue(false);
      
      // Initial load
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'false',
        AUTH_TYPE: 'disabled',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      await configManager.loadConfig('development');
      
      // Change environment
      process.env['PORT'] = '4000';
      process.env['LOG_LEVEL'] = 'debug';

      await configManager.reloadConfig();
      const config = configManager.getConfig();

      expect(config.server.port).toBe(4000);
      expect(config.logging.level).toBe('debug');
    });

    it('should call reload callbacks', async () => {
      mockExistsSync.mockReturnValue(false);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'false',
        AUTH_TYPE: 'disabled',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      await configManager.loadConfig('development');

      const callback = jest.fn();
      configManager.onConfigReload(callback);

      await configManager.reloadConfig();

      expect(callback).toHaveBeenCalledWith(configManager.getConfig());
    });

    it('should handle callback errors gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'false',
        AUTH_TYPE: 'disabled',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      await configManager.loadConfig('development');

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();
      
      configManager.onConfigReload(errorCallback);
      configManager.onConfigReload(successCallback);

      // Should not throw despite callback error
      await expect(configManager.reloadConfig()).resolves.not.toThrow();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return a copy of current configuration', async () => {
      mockExistsSync.mockReturnValue(false);
      
      process.env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        AUTH_ENABLED: 'false',
        AUTH_TYPE: 'disabled',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'false',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_SKIP_SUCCESS: 'false',
        MOCK_DATA_PATH: './data/mock',
        ENABLE_CRUD: 'true',
        DEFAULT_DELAY: '0',
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRIES: '3',
        PROXY_ROUTES: '',
        PROXY_ALLOWED_DOMAINS: '',
        PROXY_BLOCKED_DOMAINS: '',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'simple',
        ADMIN_ENABLED: 'true',
      };

      await configManager.loadConfig('development');
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('callback management', () => {
    it('should add and remove reload callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      configManager.onConfigReload(callback1);
      configManager.onConfigReload(callback2);

      configManager.offConfigReload(callback1);

      // Only callback2 should remain
      expect((configManager as any).reloadCallbacks).toHaveLength(1);
      expect((configManager as any).reloadCallbacks[0]).toBe(callback2);
    });

    it('should handle removing non-existent callback', () => {
      const callback = jest.fn();

      // Should not throw
      expect(() => configManager.offConfigReload(callback)).not.toThrow();
    });
  });

  describe('utility methods', () => {
    it('should parse string arrays correctly', () => {
      const configManagerInstance = configManager as any;

      expect(configManagerInstance.parseStringArray('')).toEqual([]);
      expect(configManagerInstance.parseStringArray('  ')).toEqual([]);
      expect(configManagerInstance.parseStringArray('a')).toEqual(['a']);
      expect(configManagerInstance.parseStringArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(configManagerInstance.parseStringArray('a, b , c ')).toEqual(['a', 'b', 'c']);
      expect(configManagerInstance.parseStringArray('a,,c')).toEqual(['a', 'c']);
    });

    it('should parse proxy routes correctly', () => {
      const configManagerInstance = configManager as any;

      expect(configManagerInstance.parseProxyRoutes('')).toEqual({});
      expect(configManagerInstance.parseProxyRoutes('api:https://api.com')).toEqual({
        api: { name: 'api', targetUrl: 'https://api.com' },
      });
      expect(configManagerInstance.parseProxyRoutes('api1:https://api1.com,api2:https://api2.com')).toEqual({
        api1: { name: 'api1', targetUrl: 'https://api1.com' },
        api2: { name: 'api2', targetUrl: 'https://api2.com' },
      });
    });

    it('should get correct config file path', () => {
      const configManagerInstance = configManager as any;

      expect(configManagerInstance.getConfigFilePath('development')).toContain('.env.local');
      expect(configManagerInstance.getConfigFilePath('production')).toContain('.env.production');
      expect(configManagerInstance.getConfigFilePath('test')).toContain('.env');
    });
  });
});