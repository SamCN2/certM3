# certM3 Middleware

This is the middleware component of the certM3 certificate management system.

## Configuration

The middleware can be configured using a YAML configuration file. By default, it looks for the configuration file at `/etc/certM3/mw/config.yaml`. You can specify a different location using the `CONFIG_PATH` environment variable.

### Configuration Options

#### Logging
- `log_level`: Log level (debug, info, warn, error). Default: info
- `log_file`: Path to the log file. Default: /var/log/certM3/mw/app.log

#### App Server
- `listen_addr`: Address to listen on for HTTP requests. Default: :8080
- `backend_api_url`: URL of the backend API. Default: http://localhost:8081
- `jwt_secret`: Secret key for JWT token generation and validation. If not specified, it will be loaded from /var/spool/certM3/mw/JWT-secret
- `rate_limit_per_ip`: Maximum number of requests per second per IP address. Default: 100
- `metrics_enabled`: Whether to enable Prometheus metrics. Default: true
- `metrics_path`: Path for the Prometheus metrics endpoint. Default: /metrics
- `metrics_timeout`: Timeout for metrics collection. Default: 5s

### Metrics

The middleware exposes Prometheus metrics at the `/metrics` endpoint (configurable via `metrics_path`). The following metrics are available:

#### HTTP Metrics
- `http_requests_total`: Total number of HTTP requests
- `http_request_duration_seconds`: HTTP request duration in seconds
- `http_requests_in_flight`: Number of HTTP requests currently being processed

#### Business Metrics
- `certificate_requests_total`: Total number of certificate requests
- `email_validations_total`: Total number of email validations
- `jwt_validations_total`: Total number of JWT validations
- `jwt_validation_errors_total`: Total number of JWT validation errors
- `rate_limit_exceeded_total`: Total number of rate limit exceeded events
- `security_events_total`: Total number of security events

#### Backend API Metrics
- `backend_requests_total`: Total number of backend API requests
- `backend_request_duration_seconds`: Backend API request duration in seconds
- `backend_request_errors_total`: Total number of backend API request errors

## Building

```bash
go build -o certm3-app ./cmd/certm3-app
```

## Running

```bash
./certm3-app
```

## Development

### Prerequisites
- Go 1.21 or later
- Make

### Building
```bash
make build
```

### Testing
```bash
make test
```

### Linting
```bash
make lint
``` 