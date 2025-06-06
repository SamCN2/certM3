package logging

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/sirupsen/logrus"
)

// Logger is a wrapper around logrus.Logger
type Logger struct {
	*logrus.Logger
}

// New creates a new logger
func New(level, logFile string) (*Logger, error) {
	log := logrus.New()

	// Set log level
	logLevel, err := logrus.ParseLevel(level)
	if err != nil {
		return nil, err
	}
	log.SetLevel(logLevel)

	// Set formatter
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
	})

	// Set output
	if logFile != "" {
		// Ensure log directory exists
		logDir := filepath.Dir(logFile)
		if err := os.MkdirAll(logDir, 0755); err != nil {
			return nil, err
		}

		// Open log file
		file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return nil, err
		}

		// Log to both file and stdout
		log.SetOutput(io.MultiWriter(os.Stdout, file))
	} else {
		log.SetOutput(os.Stdout)
	}

	return &Logger{log}, nil
}

// WithRequestID adds a request ID to the log entry
func (l *Logger) WithRequestID(requestID string) *logrus.Entry {
	return l.WithField("request_id", requestID)
}

// WithUserID adds a user ID to the log entry
func (l *Logger) WithUserID(userID string) *logrus.Entry {
	return l.WithField("user_id", userID)
}

// WithError adds an error to the log entry
func (l *Logger) WithError(err error) *logrus.Entry {
	return l.WithField("error", err.Error())
}

// WithFields adds multiple fields to the log entry
func (l *Logger) WithFields(fields map[string]interface{}) *logrus.Entry {
	return l.Logger.WithFields(logrus.Fields(fields))
}

// LogRequest logs a request with comprehensive details
func (l *Logger) LogRequest(r *http.Request, duration time.Duration, statusCode int) {
	fields := map[string]interface{}{
		"method":     r.Method,
		"path":       r.URL.Path,
		"query":      r.URL.RawQuery,
		"status":     statusCode,
		"duration":   duration,
		"remote_ip":  r.RemoteAddr,
		"user_agent": r.UserAgent(),
	}

	// Add request ID if available
	if requestID := r.Context().Value("request_id"); requestID != nil {
		fields["request_id"] = requestID
	}

	// Add user ID if available
	if userID := r.Context().Value("user_id"); userID != nil {
		fields["user_id"] = userID
	}

	l.WithFields(fields).Info("Request completed")
}

// LogSecurityEvent logs a security-related event
func (l *Logger) LogSecurityEvent(eventType string, details map[string]interface{}) {
	fields := map[string]interface{}{
		"event_type": eventType,
		"timestamp":  time.Now().UTC(),
	}

	// Add request ID if available
	if requestID, ok := details["request_id"]; ok {
		fields["request_id"] = requestID
	}

	// Add user ID if available
	if userID, ok := details["user_id"]; ok {
		fields["user_id"] = userID
	}

	// Add additional details
	for k, v := range details {
		if k != "request_id" && k != "user_id" {
			fields[k] = v
		}
	}

	l.WithFields(fields).Info("Security event")
}

// LogError logs an error with context
func (l *Logger) LogError(err error, context map[string]interface{}) {
	fields := map[string]interface{}{
		"error":     err.Error(),
		"timestamp": time.Now().UTC(),
	}

	// Add context fields
	for k, v := range context {
		fields[k] = v
	}

	l.WithFields(fields).Error("Error occurred")
}

// LogMetrics logs a metric with context
func (l *Logger) LogMetrics(metricName string, value float64, tags map[string]string) {
	fields := map[string]interface{}{
		"metric_name": metricName,
		"value":       value,
		"timestamp":   time.Now().UTC(),
	}

	// Add tags
	for k, v := range tags {
		fields[k] = v
	}

	l.WithFields(fields).Info("Metric recorded")
}
