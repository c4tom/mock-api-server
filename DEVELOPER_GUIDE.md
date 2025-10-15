# Mock API Server - Developer Guide

Technical documentation for developers working on or extending the Mock API Server.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Development Setup](#development-setup)
5. [Testing](#testing)
6. [Adding Features](#adding-features)
7. [Build and Deployment](#build-and-deployment)
8. [Contributing](#contributing)

## Architecture Overview

### Technology Stack

- **Runtime**: Node.js 16+
- **Language**: TypeScript 4.9+
- **Framework**: Express.js
- **WebSocket**: ws library
- **GraphQL**: graphql + express-graphql
- **Database**: Knex.js (SQLite, PostgreSQL, MongoDB support)
- **Testing**: Jest
- **Logging**: Winston
- **Validation**: Joi

### Design Principles

1. **Modularity**: Each feature is self-contained in its own handler/service
2. **Configuration-Driven**: All behavior controlled through environment variables
3. **Type Safety**: Full TypeScript coverage with strict mode
4. **Testability**: Dependency injection and mocking support
5. **Extensibility**: Easy to add new features without modifying core

### Request Flow

```
Client Request
    ↓
Express Middleware Stack
    ↓
Authentication Middleware
    ↓
Rate Limiting Middleware
    ↓
Logging Middleware
    ↓
Route Handler (Mock/Proxy/Admin/WebSocket/GraphQL)
    ↓
Service Layer (if needed)
    ↓
Response
```

## Project Structure

```
mock-api-server/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── config/
│   │   └── ConfigManager.ts     # Configuration management
│   ├── types/
│   │   ├── index.ts             # Type exports
│   │   ├── config.ts            # Configuration types
│   │   ├── database.ts          # Database types
│   │   └── validation.ts        # Joi validation schemas
│   ├── handlers/
│   │   ├── index.ts             # Handler exports
│   │   ├── MockDataHandler.ts   # Mock data endpoints
│   │   ├── ProxyHandler.ts      # CORS proxy
│   │   ├── AdminHandler.ts      # Admin endpoints
│   │   ├── WebSocketHandler.ts  # WebSocket support
│   │   ├── GraphQLHandler.ts    # GraphQL endpoint
│   │   ├── DashboardHandler.ts  # Dashboard UI
│   │   └── __tests__/           # Handler tests
│   ├── services/
│   │   ├── index.ts             # Service exports
│   │   ├── DatabaseService.ts   # Database operations
│   │   ├── DataGenerationService.ts  # Faker data generation
│   │   ├── PerformanceMonitoringService.ts  # Metrics
│   │   └── __tests__/           # Service tests
│   ├── middleware/
│   │   ├── auth.ts              # Authentication
│   │   ├── rateLimit.ts         # Rate limiting
│   │   ├── logging.ts           # Request logging
│   │   └── errorHandler.ts      # Error handling
│   └── utils/
│       ├── logger.ts            # Winston logger
│       └── validation.ts        # Input validation
├── data/
│   ├── mock/                    # Mock data files
│   ├── templates/               # Data generation templates
│   └── websocket-events.json    # WebSocket mock events
├── config/
│   └── transformations.example.ts  # Transformation examples
├── docs/                        # Documentation
├── examples/                    # Usage examples
├── logs/                        # Log files
├── dist/                        # Compiled JavaScript
├── .env.local                   # Development config template
├── .env.production              # Production config template
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### Key Directories

- **src/**: TypeScript source code
- **src/handlers/**: Request handlers for different features
- **src/services/**: Business logic and external integrations
- **src/middleware/**: Express middleware functions
- **data/**: Mock data and templates
- **docs/**: User and technical documentation
- **examples/**: Usage examples and demos

## Core Components

### 1. ConfigManager

Manages all configuration from environment variables.

**Location**: `src/config/ConfigManager.ts`

**Responsibilities**:
- Load and parse environment variables
- Validate configuration
- Provide type-safe config access
- Support hot reload

**Usage**:
```typescript
import { ConfigManager } from './config/ConfigManager';

const config = ConfigManager.getInstance();
const port = config.get('PORT');
const authConfig = config.getAuthConfig();
```

**Adding New Config**:

1. Add type to `src/types/config.ts`:
```typescript
export interface MyFeatureConfig {
  enabled: boolean;
  option: string;
}
```

2. Add validation to `src/types/validation.ts`:
```typescript
export const myFeatureConfigSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  option: Joi.string().default('default')
});
```

3. Add parsing to `ConfigManager.ts`:
```typescript
getMyFeatureConfig(): MyFeatureConfig {
  return {
    enabled: this.get('MY_FEATURE_ENABLED') === 'true',
    option: this.get('MY_FEATURE_OPTION') || 'default'
  };
}
```

### 2. Handlers

Handle HTTP requests for specific features.

**Base Pattern**:
```typescript
export class MyHandler {
  private config: MyFeatureConfig;

  constructor(config: MyFeatureConfig) {
    this.config = config;
  }

  setupRoutes(app: Express): void {
    app.get('/my-endpoint', this.handleRequest.bind(this));
  }

  private async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Handle request
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
```

**Existing Handlers**:
- `MockDataHandler`: Serves mock data from files
- `ProxyHandler`: CORS proxy functionality
- `AdminHandler`: Admin endpoints
- `WebSocketHandler`: WebSocket connections
- `GraphQLHandler`: GraphQL endpoint
- `DashboardHandler`: Web dashboard

### 3. Services

Encapsulate business logic and external integrations.

**Base Pattern**:
```typescript
export class MyService {
  private config: MyServiceConfig;

  constructor(config: MyServiceConfig) {
    this.config = config;
  }

  async doSomething(): Promise<Result> {
    // Business logic
    return result;
  }
}
```

**Existing Services**:
- `DatabaseService`: Database operations
- `DataGenerationService`: Faker.js integration
- `PerformanceMonitoringService`: Metrics collection

### 4. Middleware

Express middleware for cross-cutting concerns.

**Authentication Middleware**:
```typescript
// src/middleware/auth.ts
export function authMiddleware(config: AuthConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Validate authentication
    if (isAuthenticated(req)) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
```

**Existing Middleware**:
- `authMiddleware`: Authentication
- `rateLimitMiddleware`: Rate limiting
- `loggingMiddleware`: Request logging
- `errorHandler`: Error handling

## Development Setup

### Prerequisites

```bash
# Check Node.js version
node --version  # Should be 16+

# Check npm/pnpm
npm --version
# or
pnpm --version
```

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd mock-api-server

# Install dependencies
npm install
# or
pnpm install

# Copy environment file
cp .env.local .env

# Start development server
npm run dev
```

### Development Commands

```bash
# Start with hot reload
npm run dev

# Build TypeScript
npm run build

# Build and watch
npm run build:watch

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- ConfigManager.test.ts

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npx tsc --noEmit
```

### IDE Setup

**VS Code** (recommended):

Install extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Testing

### Test Structure

Tests are colocated with source files in `__tests__/` directories.

```
src/
├── handlers/
│   ├── MockDataHandler.ts
│   └── __tests__/
│       └── MockDataHandler.test.ts
```

### Writing Tests

**Unit Test Example**:

```typescript
import { MyService } from '../MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService({ enabled: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('doSomething', () => {
    it('should return expected result', async () => {
      const result = await service.doSomething();
      expect(result).toEqual({ success: true });
    });

    it('should handle errors', async () => {
      // Test error case
      await expect(service.doSomething()).rejects.toThrow();
    });
  });
});
```

**Integration Test Example**:

```typescript
import request from 'supertest';
import express from 'express';
import { MyHandler } from '../MyHandler';

describe('MyHandler Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    const handler = new MyHandler({ enabled: true });
    handler.setupRoutes(app);
  });

  it('should handle GET request', async () => {
    const response = await request(app)
      .get('/my-endpoint')
      .expect(200);

    expect(response.body).toEqual({ success: true });
  });
});
```

### Mocking

**Mock External Dependencies**:

```typescript
jest.mock('../DatabaseService');

import { DatabaseService } from '../DatabaseService';

const mockDb = DatabaseService as jest.MockedClass<typeof DatabaseService>;

beforeEach(() => {
  mockDb.mockClear();
  mockDb.prototype.query.mockResolvedValue([]);
});
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

Target: 80%+ coverage for critical paths.

## Adding Features

### Step-by-Step Guide

#### 1. Define Configuration

Add types in `src/types/config.ts`:

```typescript
export interface MyFeatureConfig {
  enabled: boolean;
  option1: string;
  option2: number;
}
```

Add validation in `src/types/validation.ts`:

```typescript
export const myFeatureConfigSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  option1: Joi.string().required(),
  option2: Joi.number().min(0).default(100)
});
```

#### 2. Update ConfigManager

Add getter in `src/config/ConfigManager.ts`:

```typescript
getMyFeatureConfig(): MyFeatureConfig {
  const config = {
    enabled: this.get('MY_FEATURE_ENABLED') === 'true',
    option1: this.get('MY_FEATURE_OPTION1') || 'default',
    option2: parseInt(this.get('MY_FEATURE_OPTION2') || '100', 10)
  };

  const { error } = myFeatureConfigSchema.validate(config);
  if (error) {
    throw new Error(`Invalid config: ${error.message}`);
  }

  return config;
}
```

#### 3. Create Handler/Service

Create `src/handlers/MyFeatureHandler.ts`:

```typescript
import { Express, Request, Response, NextFunction } from 'express';
import { MyFeatureConfig } from '../types/config';
import { logger } from '../utils/logger';

export class MyFeatureHandler {
  private config: MyFeatureConfig;

  constructor(config: MyFeatureConfig) {
    this.config = config;
  }

  setupRoutes(app: Express): void {
    if (!this.config.enabled) {
      logger.info('MyFeature is disabled');
      return;
    }

    app.get('/my-feature', this.handleRequest.bind(this));
    logger.info('MyFeature routes registered');
  }

  private async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Implementation
      res.json({ success: true });
    } catch (error) {
      logger.error('MyFeature error:', error);
      next(error);
    }
  }
}
```

#### 4. Write Tests

Create `src/handlers/__tests__/MyFeatureHandler.test.ts`:

```typescript
import { MyFeatureHandler } from '../MyFeatureHandler';
import express from 'express';
import request from 'supertest';

describe('MyFeatureHandler', () => {
  let app: express.Express;
  let handler: MyFeatureHandler;

  beforeEach(() => {
    app = express();
    handler = new MyFeatureHandler({
      enabled: true,
      option1: 'test',
      option2: 100
    });
    handler.setupRoutes(app);
  });

  it('should handle requests', async () => {
    const response = await request(app)
      .get('/my-feature')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

#### 5. Integrate with Main App

Update `src/index.ts`:

```typescript
import { MyFeatureHandler } from './handlers/MyFeatureHandler';

// Get config
const myFeatureConfig = config.getMyFeatureConfig();

// Create handler
const myFeatureHandler = new MyFeatureHandler(myFeatureConfig);

// Setup routes
myFeatureHandler.setupRoutes(app);
```

#### 6. Update Documentation

- Add to `README.md` features list
- Create `docs/MY_FEATURE_GUIDE.md`
- Add examples to `examples/`
- Update `USER_GUIDE.md`

#### 7. Add Environment Variables

Update `.env.local` and `.env.production`:

```env
# My Feature Configuration
MY_FEATURE_ENABLED=true
MY_FEATURE_OPTION1=value
MY_FEATURE_OPTION2=100
```

Update `.env.example`:

```env
# My Feature
MY_FEATURE_ENABLED=false
MY_FEATURE_OPTION1=
MY_FEATURE_OPTION2=100
```

## Build and Deployment

### Building for Production

```bash
# Clean previous build
rm -rf dist/

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### Running Production Build

```bash
# Set production environment
cp .env.production .env

# Start server
npm start
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY data/ ./data/
COPY docs/ ./docs/

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
# Build image
docker build -t mock-api-server .

# Run container
docker run -p 3000:3000 \
  -e AUTH_TYPE=jwt \
  -e JWT_SECRET=your-secret \
  mock-api-server
```

### Environment-Specific Builds

**Development**:
```bash
NODE_ENV=development npm run build
```

**Production**:
```bash
NODE_ENV=production npm run build
```

### Deployment Checklist

- [ ] Update version in `package.json`
- [ ] Run all tests: `npm test`
- [ ] Check linting: `npm run lint`
- [ ] Build successfully: `npm run build`
- [ ] Update `CHANGELOG.md`
- [ ] Review security settings in `.env.production`
- [ ] Test production build locally
- [ ] Update documentation
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Deploy to environment
- [ ] Verify health endpoint
- [ ] Monitor logs

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write JSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names

### Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: bug fix
docs: documentation changes
test: add or update tests
refactor: code refactoring
chore: maintenance tasks
```

Examples:
```
feat: add GraphQL proxy support
fix: handle WebSocket connection errors
docs: update API reference
test: add DatabaseService tests
refactor: simplify ConfigManager
chore: update dependencies
```

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Write/update tests
4. Update documentation
5. Run tests: `npm test`
6. Run linting: `npm run lint`
7. Push branch: `git push origin feature/my-feature`
8. Create pull request
9. Address review comments
10. Merge after approval

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Type safety maintained
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Backward compatibility maintained

## Advanced Topics

### Custom Middleware

Create reusable middleware:

```typescript
// src/middleware/myMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export function myMiddleware(options: MyOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Middleware logic
    next();
  };
}
```

### Custom Transformations

Add transformation functions:

```typescript
// config/transformations.ts
export const customTransformations = {
  myTransform: (data: any) => {
    // Transform logic
    return transformedData;
  }
};
```

### Database Migrations

For database features:

```typescript
// migrations/001_initial.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('my_table', (table) => {
    table.increments('id');
    table.string('name');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('my_table');
}
```

### Performance Optimization

Tips for optimization:

1. **Caching**: Use in-memory cache for frequently accessed data
2. **Database Indexing**: Add indexes for common queries
3. **Connection Pooling**: Reuse database connections
4. **Compression**: Enable gzip compression
5. **Lazy Loading**: Load data only when needed
6. **Batch Operations**: Group database operations

### Debugging

**VS Code Launch Configuration**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

**Logging**:

```typescript
import { logger } from './utils/logger';

logger.debug('Debug message', { data });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

## Resources

### Internal Documentation

- [User Guide](USER_GUIDE.md) - User-facing documentation
- [Frontend Guide](FRONTEND_GUIDE.md) - Web interfaces guide
- [API Reference](docs/API_REFERENCE.md) - Complete API docs
- [Feature Guides](docs/) - Detailed feature documentation

### External Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Joi Validation](https://joi.dev/api/)

### Community

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas

## Troubleshooting Development Issues

### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf dist/ node_modules/.cache

# Rebuild
npm run build
```

### Test Failures

```bash
# Run specific test
npm test -- MyHandler.test.ts

# Run with verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u
```

### Dependency Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

Happy coding! 🚀
