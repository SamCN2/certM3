# Prometheus and Grafana Integration

## Overview
The CertM3 middleware and backend services should be instrumented with Prometheus metrics and integrated with Grafana for monitoring and visualization.

## Requirements

### Prometheus Integration
1. Add Prometheus metrics endpoints to:
   - Middleware app (`/metrics`)
   - Middleware signer (`/metrics`)
   - Backend service (`/metrics`)

2. Instrument key metrics:
   - Request counts and latencies
   - Error rates
   - Group operation metrics
   - Certificate signing metrics
   - Resource usage (CPU, memory, disk)
   - Active connections
   - Queue lengths

3. Configure Prometheus:
   - Service discovery for all components
   - Scrape intervals
   - Retention policies
   - Alert rules

### Grafana Integration
1. Create dashboards for:
   - Service health overview
   - Request metrics
   - Error rates
   - Resource usage
   - Group operations
   - Certificate operations

2. Set up alerts for:
   - Service availability
   - High error rates
   - Resource thresholds
   - Performance degradation

## Implementation Notes

### Middleware App Metrics
```go
// Key metrics to expose
- http_requests_total
- http_request_duration_seconds
- group_operations_total
- group_operation_errors_total
- certificate_requests_total
- certificate_request_duration_seconds
- active_connections
- queue_length
```

### Middleware Signer Metrics
```go
// Key metrics to expose
- signing_operations_total
- signing_duration_seconds
- signing_errors_total
- queue_length
- active_workers
```

### Backend Metrics
```go
// Key metrics to expose
- api_requests_total
- api_request_duration_seconds
- database_operations_total
- database_operation_duration_seconds
- active_users
- group_count
- certificate_count
```

## Configuration

### Prometheus Configuration
```yaml
scrape_configs:
  - job_name: 'certm3-middleware'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'certm3-signer'
    static_configs:
      - targets: ['localhost:8081']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'certm3-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard Requirements
1. Service Overview
   - Service status
   - Request rates
   - Error rates
   - Response times

2. Group Operations
   - Operation counts
   - Error rates
   - Latency distribution

3. Certificate Operations
   - Request counts
   - Processing times
   - Success/failure rates

4. Resource Usage
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

## Dependencies
- Prometheus
- Grafana
- Go Prometheus client library
- Node.js Prometheus client library

## Related Issues
- #TODO: Add link to metrics implementation issue
- #TODO: Add link to dashboard design issue
- #TODO: Add link to alert configuration issue 