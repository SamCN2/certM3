# CertM3 Logging Consolidation Analysis

## Current Logging State

### 1. **API Application (Node.js/LoopBack 4)**

**Current Logging:**
- **Primary Method**: `console.log` and `console.error`
- **Configuration**: No structured logging framework
- **Output**: Standard output/error streams
- **PM2 Integration**: PM2 handles log file management
  ```javascript
  // Example from src/api/src/index.ts
  console.log(`Server is running at ${url}`);
  console.error('Cannot start the application.', err);
  ```

**Issues:**
- No structured logging
- No log levels
- No request correlation
- No centralized configuration
- Mixed with application output

### 2. **Middleware Application (Go)**

**Current Logging:**
- **Primary Method**: Custom logger wrapper around `logrus`
- **Configuration**: YAML-based configuration
- **Output**: JSON-formatted logs to files and/or stdout
- **Features**: Request correlation, structured fields, security events

```go
// From src/mw/internal/logging/logger.go
type Logger struct {
    *logrus.Logger
    verbose bool
}

// JSON formatter with timestamps
log.SetFormatter(&logrus.JSONFormatter{
    TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
})
```

**Configuration:**
```yaml
# From config.yaml
log_level: debug
log_file: /var/log/certM3/mw/app.log
verbose: true
```

**Features:**
- ✅ Structured JSON logging
- ✅ Log levels (debug, info, warn, error)
- ✅ Request correlation (request_id)
- ✅ User correlation (user_id)
- ✅ Security event logging
- ✅ Metrics logging
- ✅ Error context

### 3. **Signer Application (Go)**

**Current Logging:**
- **Primary Method**: Same custom logger as middleware
- **Configuration**: Shared with middleware via YAML
- **Output**: Separate log file for signer operations

```yaml
# From config.yaml
signer:
  log_file: /var/spool/certM3/logs/signer/signer.log
```

### 4. **Frontend/Static Files**

**Current Logging:**
- **Primary Method**: `console.log` in browser
- **Output**: Browser console
- **Purpose**: Debug information for development

```javascript
// From static files
console.log("Index app starting...");
console.log("Checking username:", username);
console.log("Response:", data);
```

## Logging Consolidation Issues

### 🔴 **Critical Issues**

1. **Inconsistent Logging Formats**
   - API: Plain text console.log
   - Middleware/Signer: Structured JSON
   - Frontend: Browser console.log

2. **No Centralized Log Management**
   - Each application logs independently
   - No correlation across services
   - Different log file locations

3. **Missing Failed Request Logging**
   - API doesn't log failed requests to structured logs
   - No integration with the failed request tracking system

4. **No Request Tracing**
   - Cannot trace requests across API → Middleware → Signer
   - No distributed tracing IDs

### 🟡 **Moderate Issues**

1. **Inconsistent Log Levels**
   - API: No log levels
   - Middleware: Proper log levels
   - Frontend: No log levels

2. **No Log Aggregation**
   - Logs scattered across multiple files
   - No centralized log viewing
   - Difficult to correlate events

3. **Security Event Logging**
   - Only middleware logs security events
   - API doesn't log authentication/authorization events
   - No centralized security monitoring

## Recommended Consolidation Strategy

### Phase 1: API Logging Standardization

**Immediate Actions:**
1. **Add Winston Logger to API**
   ```typescript
   // Replace console.log with structured logging
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: '/var/log/certM3/api/app.log' }),
       new winston.transports.Console()
     ]
   });
   ```

2. **Add Request Correlation**
   ```typescript
   // Add request ID to all log entries
   logger.info('Request processed', {
     request_id: req.headers['x-request-id'],
     user_id: req.user?.id,
     method: req.method,
     path: req.path
   });
   ```

3. **Integrate Failed Request Logging**
   ```typescript
   // Log failed requests with structured data
   logger.error('Failed request recorded', {
     request_id: failedRequest.requestId,
     failure_reason: failedRequest.failureReason,
     step_failed: failedRequest.stepFailed,
     error_message: failedRequest.errorMessage
   });
   ```

### Phase 2: Unified Logging Configuration

**Create Unified Config:**
```yaml
# /etc/certM3/logging.yaml
logging:
  level: info
  format: json
  output:
    - file: /var/log/certM3/combined.log
    - console: true
  correlation:
    enabled: true
    header: x-request-id
  security:
    enabled: true
    file: /var/log/certM3/security.log
  metrics:
    enabled: true
    file: /var/log/certM3/metrics.log

services:
  api:
    log_file: /var/log/certM3/api/app.log
    level: info
  middleware:
    log_file: /var/log/certM3/mw/app.log
    level: info
  signer:
    log_file: /var/log/certM3/signer/signer.log
    level: info
```

### Phase 3: Log Aggregation

**Recommended Tools:**
1. **Filebeat** - Collect logs from all services
2. **Logstash** - Process and transform logs
3. **Elasticsearch** - Store and index logs
4. **Kibana** - Visualize and search logs

**Alternative:**
- **Fluentd** for log collection
- **Prometheus + Grafana** for metrics
- **Centralized syslog** for simple aggregation

### Phase 4: Distributed Tracing

**Add Request Tracing:**
```typescript
// Generate correlation IDs
const correlationId = uuid.v4();
req.headers['x-correlation-id'] = correlationId;

// Log with correlation ID
logger.info('Request started', {
  correlation_id: correlationId,
  service: 'api',
  endpoint: req.path
});
```

## Implementation Priority

### 🔴 **High Priority (Immediate)**
1. Add Winston logger to API
2. Standardize log format across all services
3. Add request correlation IDs
4. Integrate failed request logging

### 🟡 **Medium Priority (Next Sprint)**
1. Create unified logging configuration
2. Add security event logging to API
3. Implement log rotation
4. Add metrics logging

### 🟢 **Low Priority (Future)**
1. Implement log aggregation (ELK stack)
2. Add distributed tracing
3. Create log dashboards
4. Add log-based alerting

## Files Requiring Changes

### API Application
- `src/api/src/index.ts` - Add Winston logger
- `src/api/src/application.ts` - Add FailedRequestRepository binding
- `src/api/src/controllers/*.ts` - Replace console.log with structured logging
- `src/api/src/services/*.ts` - Add structured logging
- `src/api/package.json` - Add Winston dependency

### Middleware Application
- `src/mw/internal/logging/logger.go` - Enhance with correlation support
- `src/mw/config.yaml` - Update logging configuration
- `src/mw/internal/app/handlers.go` - Add correlation ID propagation

### Configuration
- Create `/etc/certM3/logging.yaml` - Unified logging config
- Update PM2 ecosystem files - Standardize log paths
- Update systemd service files - Add logging configuration

## Benefits of Consolidation

1. **Operational Efficiency**
   - Single place to view all logs
   - Consistent log format
   - Easier troubleshooting

2. **Security Monitoring**
   - Centralized security event logging
   - Better threat detection
   - Audit trail compliance

3. **Performance Monitoring**
   - Request tracing across services
   - Performance bottleneck identification
   - Error correlation

4. **Compliance**
   - Structured audit logs
   - Retention policy enforcement
   - Searchable log archives

## Conclusion

**Logging consolidation is necessary** due to the current inconsistent approach across services. The middleware has excellent structured logging, but the API uses basic console.log, creating operational inefficiencies and making troubleshooting difficult.

**Recommended approach:** Start with Phase 1 (API logging standardization) as it provides immediate benefits with minimal risk, then progress through the phases based on operational needs and resource availability. 