/**
 * Joi validation schemas for configuration validation
 */

import Joi from 'joi';

// Authentication configuration schema
const authenticationSchema = Joi.object({
  enabled: Joi.boolean().required(),
  type: Joi.string().valid('jwt', 'basic', 'dev-token', 'bypass', 'disabled').required(),
  jwtSecret: Joi.string().when('type', {
    is: 'jwt',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  devToken: Joi.string().when('type', {
    is: 'dev-token',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  basicCredentials: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }).when('type', {
    is: 'basic',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

// CORS configuration schema
const corsSchema = Joi.object({
  allowedOrigins: Joi.array().items(Joi.string()).required(),
  allowCredentials: Joi.boolean().required(),
});

// Rate limit configuration schema
const rateLimitSchema = Joi.object({
  windowMs: Joi.number().positive().required(),
  maxRequests: Joi.number().positive().required(),
  skipSuccessfulRequests: Joi.boolean().required(),
});

// Security configuration schema
const securitySchema = Joi.object({
  authentication: authenticationSchema.required(),
  cors: corsSchema.required(),
  rateLimit: rateLimitSchema.required(),
});

// Server configuration schema
const serverSchema = Joi.object({
  port: Joi.number().port().required(),
  host: Joi.string().required(),
  environment: Joi.string().valid('development', 'production').required(),
  adminEnabled: Joi.boolean().required(),
});

// Mock endpoint schema
const mockEndpointSchema = Joi.object({
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').required(),
  path: Joi.string().required(),
  response: Joi.any().required(),
  statusCode: Joi.number().min(100).max(599).default(200),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  delay: Joi.number().min(0).optional(),
});

// Mock configuration schema
const mockSchema = Joi.object({
  dataPath: Joi.string().required(),
  endpoints: Joi.array().items(mockEndpointSchema).required(),
  defaultDelay: Joi.number().min(0).required(),
  enableCrud: Joi.boolean().required(),
});

// Proxy auth schema
const proxyAuthSchema = Joi.object({
  type: Joi.string().valid('bearer', 'basic', 'apikey').required(),
  token: Joi.string().when('type', {
    is: 'bearer',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  username: Joi.string().when('type', {
    is: 'basic',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  password: Joi.string().when('type', {
    is: 'basic',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  apiKeyHeader: Joi.string().when('type', {
    is: 'apikey',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  apiKeyValue: Joi.string().when('type', {
    is: 'apikey',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

// Proxy route schema
const proxyRouteSchema = Joi.object({
  name: Joi.string().required(),
  targetUrl: Joi.string().uri().required(),
  pathRewrite: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  auth: proxyAuthSchema.optional(),
});

// Proxy configuration schema
const proxySchema = Joi.object({
  enabled: Joi.boolean().required(),
  routes: Joi.object().pattern(Joi.string(), proxyRouteSchema).required(),
  timeout: Joi.number().positive().required(),
  retries: Joi.number().min(0).max(10).required(),
  allowedDomains: Joi.array().items(Joi.string()).required(),
  blockedDomains: Joi.array().items(Joi.string()).required(),
});

// Logging configuration schema
const loggingSchema = Joi.object({
  level: Joi.string().valid('silent', 'error', 'warn', 'info', 'debug').required(),
  format: Joi.string().valid('json', 'simple').required(),
  file: Joi.string().optional(),
});

// Main application configuration schema
export const appConfigSchema = Joi.object({
  server: serverSchema.required(),
  security: securitySchema.required(),
  mock: mockSchema.required(),
  proxy: proxySchema.required(),
  logging: loggingSchema.required(),
});

// Environment variables schema for validation
export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('localhost'),
  
  // Authentication
  AUTH_ENABLED: Joi.boolean().default(false),
  AUTH_TYPE: Joi.string().valid('jwt', 'basic', 'dev-token', 'bypass', 'disabled').default('disabled'),
  JWT_SECRET: Joi.string().optional(),
  DEV_TOKEN: Joi.string().optional(),
  BASIC_USERNAME: Joi.string().optional(),
  BASIC_PASSWORD: Joi.string().optional(),
  
  // CORS
  CORS_ORIGINS: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(false),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: Joi.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().positive().default(100),
  RATE_LIMIT_SKIP_SUCCESS: Joi.boolean().default(false),
  
  // Mock Data
  MOCK_DATA_PATH: Joi.string().default('./data/mock'),
  ENABLE_CRUD: Joi.boolean().default(true),
  DEFAULT_DELAY: Joi.number().min(0).default(0),
  
  // Proxy
  PROXY_ENABLED: Joi.boolean().default(true),
  PROXY_TIMEOUT: Joi.number().positive().default(5000),
  PROXY_RETRIES: Joi.number().min(0).max(10).default(3),
  PROXY_ROUTES: Joi.string().allow('').default(''),
  PROXY_ALLOWED_DOMAINS: Joi.string().allow('').default(''),
  PROXY_BLOCKED_DOMAINS: Joi.string().allow('').default(''),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('silent', 'error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('simple'),
  LOG_FILE: Joi.string().optional(),
  
  // Admin
  ADMIN_ENABLED: Joi.boolean().default(true),
}).unknown(true); // Allow unknown environment variables