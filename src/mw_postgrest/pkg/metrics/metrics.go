package metrics

import (
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds all prometheus metrics
type Metrics struct {
	// HTTP metrics
	httpRequestsTotal    *prometheus.CounterVec
	httpRequestDuration  *prometheus.HistogramVec
	httpRequestsInFlight *prometheus.GaugeVec

	// Business logic metrics
	csrSigningTotal     *prometheus.CounterVec
	csrSigningDuration  *prometheus.HistogramVec
	csrSigningErrors    *prometheus.CounterVec
	activeUsers         prometheus.Gauge
	activeCertificates  prometheus.Gauge
	certificateRequests *prometheus.CounterVec
	emailValidations    *prometheus.CounterVec

	// Security metrics
	jwtValidationsTotal *prometheus.CounterVec
	jwtValidationErrors *prometheus.CounterVec
	rateLimitExceeded   *prometheus.CounterVec
	securityEventsTotal *prometheus.CounterVec

	// Backend API metrics
	backendRequestsTotal   *prometheus.CounterVec
	backendRequestDuration *prometheus.HistogramVec
	backendRequestErrors   *prometheus.CounterVec
}

// New creates a new Metrics instance
func New() *Metrics {
	return &Metrics{
		httpRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests",
			},
			[]string{"method", "path", "status"},
		),
		httpRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "HTTP request duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "path"},
		),
		httpRequestsInFlight: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "http_requests_in_flight",
				Help: "Current number of HTTP requests being served",
			},
			[]string{"method", "path"},
		),
		csrSigningTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "csr_signing_total",
				Help: "Total number of CSR signing operations",
			},
			[]string{"status"},
		),
		csrSigningDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "csr_signing_duration_seconds",
				Help:    "CSR signing duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"status"},
		),
		csrSigningErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "csr_signing_errors_total",
				Help: "Total number of CSR signing errors",
			},
			[]string{"error_type"},
		),
		activeUsers: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "active_users",
				Help: "Number of active users",
			},
		),
		activeCertificates: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "active_certificates",
				Help: "Number of active certificates",
			},
		),
		certificateRequests: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "certificate_requests_total",
				Help: "Total number of certificate requests",
			},
			[]string{"status"},
		),
		emailValidations: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "email_validations_total",
				Help: "Total number of email validations",
			},
			[]string{"status"},
		),
		jwtValidationsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "jwt_validations_total",
				Help: "Total number of JWT validations",
			},
			[]string{"status"},
		),
		jwtValidationErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "jwt_validation_errors_total",
				Help: "Total number of JWT validation errors",
			},
			[]string{"error_type"},
		),
		rateLimitExceeded: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "rate_limit_exceeded_total",
				Help: "Total number of rate limit exceeded events",
			},
			[]string{"path"},
		),
		securityEventsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "security_events_total",
				Help: "Total number of security events",
			},
			[]string{"event_type"},
		),
		backendRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "backend_requests_total",
				Help: "Total number of backend API requests",
			},
			[]string{"method", "path", "status"},
		),
		backendRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "backend_request_duration_seconds",
				Help:    "Backend API request duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "path"},
		),
		backendRequestErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "backend_request_errors_total",
				Help: "Total number of backend API request errors",
			},
			[]string{"error_type"},
		),
	}
}

// HTTPMiddleware returns a middleware that records HTTP metrics
func (m *Metrics) HTTPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		method := r.Method

		// Track in-flight requests
		m.httpRequestsInFlight.WithLabelValues(method, path).Inc()
		defer m.httpRequestsInFlight.WithLabelValues(method, path).Dec()

		// Create response writer that captures status code
		rw := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Track request duration
		start := time.Now()
		next.ServeHTTP(rw, r)
		duration := time.Since(start).Seconds()

		// Record metrics
		m.httpRequestDuration.WithLabelValues(method, path).Observe(duration)
		m.httpRequestsTotal.WithLabelValues(method, path, string(rw.statusCode)).Inc()
	})
}

// Handler returns the Prometheus metrics handler
func (m *Metrics) Handler() http.Handler {
	return promhttp.Handler()
}

// RecordCSRSigning records metrics for a CSR signing operation
func (m *Metrics) RecordCSRSigning(status string, duration time.Duration, err error) {
	m.csrSigningTotal.WithLabelValues(status).Inc()
	m.csrSigningDuration.WithLabelValues(status).Observe(duration.Seconds())
	if err != nil {
		m.csrSigningErrors.WithLabelValues(err.Error()).Inc()
	}
}

// RecordCertificateRequest records metrics for a certificate request
func (m *Metrics) RecordCertificateRequest(status string) {
	m.certificateRequests.WithLabelValues(status).Inc()
}

// RecordEmailValidation records metrics for an email validation
func (m *Metrics) RecordEmailValidation(status string) {
	m.emailValidations.WithLabelValues(status).Inc()
}

// RecordJWTValidation records metrics for a JWT validation
func (m *Metrics) RecordJWTValidation(status string, err error) {
	m.jwtValidationsTotal.WithLabelValues(status).Inc()
	if err != nil {
		m.jwtValidationErrors.WithLabelValues(err.Error()).Inc()
	}
}

// RecordRateLimitExceeded records metrics for rate limit exceeded events
func (m *Metrics) RecordRateLimitExceeded(path string) {
	m.rateLimitExceeded.WithLabelValues(path).Inc()
}

// RecordSecurityEvent records metrics for security events
func (m *Metrics) RecordSecurityEvent(eventType string) {
	m.securityEventsTotal.WithLabelValues(eventType).Inc()
}

// RecordBackendRequest records metrics for a backend API request
func (m *Metrics) RecordBackendRequest(method, path, status string, duration time.Duration, err error) {
	m.backendRequestsTotal.WithLabelValues(method, path, status).Inc()
	m.backendRequestDuration.WithLabelValues(method, path).Observe(duration.Seconds())
	if err != nil {
		m.backendRequestErrors.WithLabelValues(err.Error()).Inc()
	}
}

// SetActiveUsers sets the number of active users
func (m *Metrics) SetActiveUsers(count float64) {
	m.activeUsers.Set(count)
}

// SetActiveCertificates sets the number of active certificates
func (m *Metrics) SetActiveCertificates(count float64) {
	m.activeCertificates.Set(count)
}

// RecordRequestInitiation records metrics for a request initiation
func (m *Metrics) RecordRequestInitiation(status string) {
	m.certificateRequests.WithLabelValues(status).Inc()
}

// RecordSignerRequest records metrics for a signer request
func (m *Metrics) RecordSignerRequest(status string, duration time.Duration, err error) {
	m.csrSigningTotal.WithLabelValues(status).Inc()
	m.csrSigningDuration.WithLabelValues(status).Observe(duration.Seconds())
	if err != nil {
		m.csrSigningErrors.WithLabelValues(err.Error()).Inc()
	}
}

// responseWriter is a wrapper around http.ResponseWriter that captures the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code before writing it
func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
