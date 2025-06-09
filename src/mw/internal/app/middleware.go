package app

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/ogt11/certm3/mw/internal/logging"
	"github.com/ogt11/certm3/mw/internal/security"
	"github.com/ogt11/certm3/mw/pkg/metrics"
)

// RateLimiter implements a simple rate limiter
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
	metrics  *metrics.Metrics
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration, metrics *metrics.Metrics) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
		metrics:  metrics,
	}
}

// RateLimitMiddleware returns a middleware that limits requests per IP
func (rl *RateLimiter) RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		rl.mu.Lock()
		now := time.Now()
		windowStart := now.Add(-rl.window)

		// Clean up old requests
		var validRequests []time.Time
		for _, t := range rl.requests[ip] {
			if t.After(windowStart) {
				validRequests = append(validRequests, t)
			}
		}
		rl.requests[ip] = validRequests

		// Check if rate limit exceeded
		if len(validRequests) >= rl.limit {
			rl.mu.Unlock()
			rl.metrics.RecordRateLimitExceeded(r.URL.Path)
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		// Add current request
		rl.requests[ip] = append(rl.requests[ip], now)
		rl.mu.Unlock()

		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware returns a middleware that logs requests
func LoggingMiddleware(log *logging.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Create a custom response writer to capture the status code
			rw := &responseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			// Call the next handler
			next.ServeHTTP(rw, r)

			// Log request with comprehensive details
			log.Info("Request completed",
				"method", r.Method,
				"path", r.URL.Path,
				"remote_addr", r.RemoteAddr,
				"status", rw.statusCode,
				"duration", time.Since(start),
			)
		})
	}
}

// AuthMiddleware returns a middleware that validates JWT tokens
func AuthMiddleware(jwtManager *security.JWTManager, log *logging.Logger, metrics *metrics.Metrics) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip authentication for health check, metrics, initiate-request, validate-email, and check-username endpoints
			if r.URL.Path == "/health" || r.URL.Path == "/metrics" ||
				r.URL.Path == "/app/initiate-request" || r.URL.Path == "/app/validate-email" ||
				strings.HasPrefix(r.URL.Path, "/app/check-username/") ||
				strings.HasPrefix(r.URL.Path, "/app/get-groups/") {
				next.ServeHTTP(w, r)
				return
			}

			// Get token from Authorization header
			authHeader := r.Header.Get("Authorization")
			log.LogSecurityEvent("debug_auth_header", map[string]interface{}{
				"path":        r.URL.Path,
				"auth_header": authHeader,
				"headers":     r.Header,
			})
			if authHeader == "" {
				log.LogSecurityEvent("missing_auth_header", map[string]interface{}{
					"path":       r.URL.Path,
					"remote_ip":  r.RemoteAddr,
					"user_agent": r.UserAgent(),
				})
				metrics.RecordSecurityEvent("missing_auth_header")
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			// Extract token from Bearer header
			if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
				log.LogSecurityEvent("invalid_auth_header", map[string]interface{}{
					"path":       r.URL.Path,
					"remote_ip":  r.RemoteAddr,
					"user_agent": r.UserAgent(),
				})
				metrics.RecordSecurityEvent("invalid_auth_header")
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}
			tokenString := authHeader[7:]

			// Validate token
			claims, err := jwtManager.ValidateToken(tokenString)
			if err != nil {
				log.LogSecurityEvent("invalid_token", map[string]interface{}{
					"path":       r.URL.Path,
					"remote_ip":  r.RemoteAddr,
					"user_agent": r.UserAgent(),
					"error":      err.Error(),
				})
				metrics.RecordJWTValidation("error", err)
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Record successful validation
			metrics.RecordJWTValidation("success", nil)

			// Add claims to request context
			ctx := r.Context()
			ctx = context.WithValue(ctx, "user_id", claims.UserID)
			ctx = context.WithValue(ctx, "request_id", claims.RequestID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
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
