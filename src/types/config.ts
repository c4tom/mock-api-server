/**
 * Configuration interfaces and types for the Mock API Server
 */

// Main application configuration interface
export interface AppConfig {
  server: ServerConfig;
  security: SecurityConfig;
  mock: MockConfig;
  proxy: ProxyConfig;
  logging: LoggingConfig;
}

// Server configuration
export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production';
  adminEnabled: boolean;
}

// Security configuration
export interface SecurityConfig {
  authentication: AuthenticationConfig;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
}

export interface AuthenticationConfig {
  enabled: boolean;
  type: 'jwt' | 'basic' | 'dev-token' | 'bypass' | 'disabled';
  jwtSecret?: string;
  devToken?: string;
  basicCredentials?: {
    username: string;
    password: string;
  };
}

export interface CorsConfig {
  allowedOrigins: string[];
  allowCredentials: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

// Mock data configuration
export interface MockConfig {
  dataPath: string;
  endpoints: MockEndpoint[];
  defaultDelay: number;
  enableCrud: boolean;
}

export interface MockEndpoint {
  method: string;
  path: string;
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
  delay?: number;
}

// Proxy configuration
export interface ProxyConfig {
  enabled: boolean;
  routes: Record<string, ProxyRoute>;
  timeout: number;
  retries: number;
  allowedDomains: string[];
  blockedDomains: string[];
  cache?: CacheConfig;
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // milliseconds
  maxSize: number; // maximum number of entries
  routeTTLs?: Record<string, number>; // per-route TTL overrides
}

export interface ProxyRoute {
  name: string;
  targetUrl: string;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: ProxyAuth;
}

export interface ProxyAuth {
  type: 'bearer' | 'basic' | 'apikey';
  token?: string;
  username?: string;
  password?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
}

// Logging configuration
export interface LoggingConfig {
  level: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  file?: string;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

// Default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  server: {
    port: 3000,
    host: 'localhost',
    environment: 'development',
    adminEnabled: true,
  },
  security: {
    authentication: {
      enabled: false,
      type: 'disabled',
    },
    cors: {
      allowedOrigins: ['*'],
      allowCredentials: false,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
    },
  },
  mock: {
    dataPath: './data/mock',
    endpoints: [],
    defaultDelay: 0,
    enableCrud: true,
  },
  proxy: {
    enabled: true,
    routes: {},
    timeout: 5000,
    retries: 3,
    allowedDomains: [],
    blockedDomains: [],
  },
  logging: {
    level: 'info',
    format: 'simple',
  },
};