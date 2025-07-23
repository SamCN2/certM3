# CertM3 Package Deployment Logging Analysis and Plan

## Executive Summary

The CertM3 system has inconsistent logging across its three main components:
- **API (Node.js/LoopBack 4)**: Uses basic `console.log` with no structured logging
- **Middleware (Go)**: Has excellent structured JSON logging with verbose mode
- **Signer (Go)**: Uses the same structured logging as middleware

Additionally, there's confusion between "production" and "development" environments that doesn't align with the project's philosophy of using real domain names and production-like configurations in all environments.

## Current State Analysis

### 1. Backend (API) Logging Issues

**Current Implementation:**
```typescript
// src/api/src/index.ts
console.log(`Server is running at ${url}`);
console.error('Cannot start the application.', err);

// src/api/src/controllers/group.controller.ts
fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Created new membership: ${JSON.stringify(newMembership)}\n`);
```

**Problems:**
- No structured logging framework
- No log levels (debug, info, warn, error)
- No request correlation IDs
- Mixed logging approaches (console.log + direct file writes)
- No centralized configuration
- No integration with PM2 logging

### 2. Middleware Logging (Good Example)

**Current Implementation:**
```go
// src/mw/internal/logging/logger.go
type Logger struct {
    *logrus.Logger
    verbose bool
}

// JSON formatter with timestamps
log.SetFormatter(&logrus.JSONFormatter{
    TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
})
```

**Features:**
- ✅ Structured JSON logging
- ✅ Log levels (debug, info, warn, error)
- ✅ Request correlation (request_id)
- ✅ User correlation (user_id)
- ✅ Security event logging
- ✅ Verbose mode toggle
- ✅ File and stdout output

### 3. Environment Variable Confusion

**Current Usage:**
```javascript
// src/api/src/config.ts
const env = process.env.NODE_ENV || 'development';
export const config = configs[env];

// PM2 configs
env: { 
  PORT: 3000,
  NODE_ENV: 'production'
}
```

**Problems:**
- `NODE_ENV` is set to 'production' in PM2 but the system doesn't actually use different configurations
- The API has `development` and `production` configs that are nearly identical
- The middleware doesn't use `NODE_ENV` at all
- Environment variables are scattered and inconsistent

## Detailed Plan

### Phase 1: Add Structured Logging to API (Immediate Priority)

#### 1.1 Add Winston Logger to API

**Files to Modify:**
- `src/api/package.json` - Add Winston dependency
- `src/api/src/index.ts` - Replace console.log with structured logging
- `src/api/src/application.ts` - Add logger initialization
- `src/api/src/controllers/*.ts` - Replace all console.log calls
- `src/api/src/sequence.ts` - Add request correlation

**Implementation:**
```typescript
// src/api/src/logger.ts (new file)
import winston from 'winston';
import { ConfigLoader } from './config-loader';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    const configLoader = ConfigLoader.getInstance();
    const config = configLoader.getConfig();
    
    this.logger = winston.createLogger({
      level: config.log_level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: config.log_file || '/var/spool/certM3/logs/api/app.log' 
        })
      ]
    });

    // Add console output if verbose mode is enabled
    if (config.verbose) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  // Request-specific logging
  logRequest(req: any, res: any, duration: number) {
    this.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      request_id: req.headers['x-request-id'],
      user_id: req.user?.id
    });
  }
}
```

#### 1.2 Add Request Correlation

**Modify `src/api/src/sequence.ts`:**
```typescript
import { MiddlewareSequence, RequestContext, HttpErrors } from '@loopback/rest';
import { Logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export class MySequence extends MiddlewareSequence {
  private logger = Logger.getInstance();

  async handle(context: RequestContext): Promise<void> {
    const startTime = Date.now();
    
    // Generate request ID if not present
    if (!context.request.headers['x-request-id']) {
      context.request.headers['x-request-id'] = uuidv4();
    }

    try {
      await super.handle(context);
      
      // Log successful request
      this.logger.logRequest(
        context.request, 
        context.response, 
        Date.now() - startTime
      );
    } catch (error) {
      // Log error with request context
      this.logger.error('Request failed', {
        method: context.request.method,
        path: context.request.path,
        error: error.message,
        stack: error.stack,
        request_id: context.request.headers['x-request-id']
      });

      // Handle HTTP errors
      if (error instanceof HttpErrors.HttpError) {
        context.response.status(error.statusCode);
        context.response.send({
          error: {
            statusCode: error.statusCode,
            name: error.name,
            message: error.message,
          },
        });
        return;
      }

      // Handle other errors
      context.response.status(500);
      context.response.send({
        error: {
          statusCode: 500,
          name: 'InternalServerError',
          message: 'An internal server error occurred',
        },
      });
    }
  }
}
```

### Phase 2: Eliminate Environment Variable Confusion

#### 2.1 Remove NODE_ENV Dependencies

**Files to Clean:**
- `src/api/src/config.ts` - Remove development/production configs
- `scripts/certm3.pm2.config.js` - Remove NODE_ENV environment variables
- `pkg/etc/certm3.pm2.config.js` - Remove NODE_ENV environment variables
- `ecosystem.config.js` - Remove NODE_ENV environment variables

**Implementation:**
```typescript
// src/api/src/config.ts (simplified)
import { ConfigLoader } from './config-loader';

export interface ApiConfig {
  api: {
    prefix: string;
    port: number;
    host: string;
  };
  database: {
    host: string;
    database: string;
    username: string;
    password: string;
  };
}

// Single config source - no environment distinction
function getConfig(): ApiConfig {
  const configLoader = ConfigLoader.getInstance();
  const apiConfig = configLoader.getApiConfig();
  const dbConfig = configLoader.getDatabaseConfig();
  
  return {
    api: {
      prefix: apiConfig.prefix,
      port: apiConfig.port,
      host: apiConfig.host, // Use config value directly
    },
    database: {
      host: dbConfig.host,
      database: dbConfig.database,
      username: dbConfig.user,
      password: dbConfig.password,
    },
  };
}

export const config = getConfig();
```

#### 2.2 Update PM2 Configurations

**Remove NODE_ENV from all PM2 configs:**
```javascript
// scripts/certm3.pm2.config.js and pkg/etc/certm3.pm2.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/index.js',
    args: '--config ../etc/config.yaml',
    cwd: 'api',
    watch: false,
    error_file: '/var/spool/certM3/logs/api-error.log',
    out_file: '/var/spool/certM3/logs/api-out.log',
    log_file: '/var/spool/certM3/logs/api-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    env: { 
      PORT: 3000
      // NODE_ENV removed
    }
  },
  // ... other apps with NODE_ENV removed
  ]
};
```

### Phase 3: Unified Logging Configuration

#### 3.1 Add Logging Section to Config

**Update `config/config.yaml`:**
```yaml
# Logging configuration
logging:
  level: info  # debug, info, warn, error
  verbose: false  # Enable console output in addition to file
  format: json  # json or text
  correlation:
    enabled: true
    header: x-request-id
  
  # Service-specific log files
  services:
    api:
      log_file: /var/spool/certM3/logs/api/app.log
      level: info
    middleware:
      log_file: /var/spool/certM3/logs/mw/app.log
      level: info
    signer:
      log_file: /var/spool/certM3/logs/signer/signer.log
      level: info

# ... rest of existing config
```

#### 3.2 Update ConfigLoader

**Modify `src/api/src/config-loader.ts`:**
```typescript
export interface CertM3Config {
  logging: {
    level: string;
    verbose: boolean;
    format: string;
    correlation: {
      enabled: boolean;
      header: string;
    };
    services: {
      api: {
        log_file: string;
        level: string;
      };
      middleware: {
        log_file: string;
        level: string;
      };
      signer: {
        log_file: string;
        level: string;
      };
    };
  };
  // ... rest of existing interface
}
```

### Phase 4: Add Verbose Logging Switch for Package

#### 4.1 Command Line Flag for Verbose Logging

**Modify `src/api/src/index.ts`:**
```typescript
function parseArgs() {
  const args = process.argv.slice(2);
  const configPath = args.find((arg, index) => 
    arg === '--config' && args[index + 1]
  ) ? args[args.indexOf('--config') + 1] : null;
  
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  return { configPath, verbose };
}

export async function main(options: ApplicationConfig = {}) {
  const { configPath, verbose } = parseArgs();
  
  // Set config path if provided
  if (configPath) {
    ConfigLoader.getInstance().setConfigPath(configPath);
  }

  // Override verbose setting if provided via command line
  if (verbose) {
    const configLoader = ConfigLoader.getInstance();
    const config = configLoader.getConfig();
    config.logging.verbose = true;
  }

  // ... rest of main function
}
```

#### 4.2 Update PM2 Configs to Support Verbose Mode

**Add verbose flag option:**
```javascript
// scripts/certm3.pm2.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/index.js',
    args: '--config ../etc/config.yaml --verbose', // Add --verbose for debugging
    cwd: 'api',
    // ... rest of config
  }]
};
```

### Phase 5: Implementation Steps

#### Step 1: Add Winston Dependency
```bash
cd src/api
npm install winston
npm install --save-dev @types/winston
```

#### Step 2: Create Logger Implementation
- Create `src/api/src/logger.ts`
- Update `src/api/src/index.ts`
- Update `src/api/src/sequence.ts`

#### Step 3: Replace Console Logs
- Search and replace all `console.log` and `console.error` calls
- Update controller files to use structured logging
- Remove direct file writes (like `fs.appendFileSync`)

#### Step 4: Update Configuration
- Remove `NODE_ENV` from all PM2 configs
- Simplify `src/api/src/config.ts`
- Update config files to include logging section

#### Step 5: Test and Deploy
- Test verbose logging with `--verbose` flag
- Verify structured logs are generated
- Test request correlation
- Deploy to remote host for testing

## Benefits

### Immediate Benefits
1. **Structured Logging**: API will have consistent JSON logs like middleware
2. **Request Correlation**: Can trace requests across all services
3. **Verbose Mode**: Easy debugging switch for package deployments
4. **No Environment Confusion**: Single config approach eliminates NODE_ENV issues

### Long-term Benefits
1. **Operational Efficiency**: Single log format across all services
2. **Better Debugging**: Structured logs with correlation IDs
3. **Security Monitoring**: Consistent security event logging
4. **Performance Monitoring**: Request timing and error tracking

## Files Requiring Changes

### High Priority
- `src/api/package.json` - Add Winston
- `src/api/src/logger.ts` - New structured logger
- `src/api/src/index.ts` - Replace console.log
- `src/api/src/sequence.ts` - Add request correlation
- `src/api/src/config.ts` - Remove environment configs
- `scripts/certm3.pm2.config.js` - Remove NODE_ENV
- `pkg/etc/certm3.pm2.config.js` - Remove NODE_ENV

### Medium Priority
- `src/api/src/controllers/*.ts` - Replace console.log calls
- `config/config.yaml` - Add logging section
- `config/config.default.yaml` - Add logging section
- `src/api/src/config-loader.ts` - Update interface

### Low Priority
- `ecosystem.config.js` - Remove NODE_ENV
- Documentation updates
- Test file updates

## Conclusion

This plan addresses the core issues:
1. **API logging is now structured and consistent** with middleware
2. **Verbose logging switch** provides easy debugging for package deployments
3. **Environment variable confusion is eliminated** by removing NODE_ENV dependencies
4. **Single configuration approach** aligns with the project's philosophy

The implementation is phased to minimize risk and provide immediate benefits while building toward a comprehensive logging solution. 