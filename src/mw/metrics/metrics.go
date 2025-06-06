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

		// Track request duration
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start).Seconds()

		// Record metrics
		m.httpRequestDuration.WithLabelValues(method, path).Observe(duration)
		m.httpRequestsTotal.WithLabelValues(method, path, "200").Inc() // TODO: Get actual status code
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

// SetActiveUsers sets the number of active users
func (m *Metrics) SetActiveUsers(count float64) {
	m.activeUsers.Set(count)
}

// SetActiveCertificates sets the number of active certificates
func (m *Metrics) SetActiveCertificates(count float64) {
	m.activeCertificates.Set(count)
} 