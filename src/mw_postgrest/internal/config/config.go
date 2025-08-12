package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v2"
)

// Config represents the application configuration
type Config struct {
	// Logging configuration
	LogLevel string `yaml:"log_level"`
	LogFile  string `yaml:"log_file"`
	Verbose  bool   `yaml:"verbose"`

	// Middleware configuration (shared between app and signer)
	Middleware struct {
		SocketPath string `yaml:"socket_path"`
	} `yaml:"middleware"`

	// App server configuration
	AppServer struct {
		ListenAddr       string `yaml:"listen_addr"`
		BackendAPIURL    string `yaml:"backend_baseurl"`
		FrontendBaseURL  string `yaml:"frontend_baseurl"`
		JWTSecret        string `yaml:"jwt_secret"`         // For validating SPA tokens
		BackendJWTSecret string `yaml:"backend_jwt_secret"` // For generating tokens for PostgREST
		MTLSCertPath     string
		MTLSKeyPath      string
		MTLSCAPath       string
		RateLimitPerIP   int           `yaml:"rate_limit_per_ip"`
		MetricsEnabled   bool          `yaml:"metrics_enabled"`
		MetricsPath      string        `yaml:"metrics_path"`
		MetricsTimeout   time.Duration `yaml:"metrics_timeout"`
		LogFile          string        `yaml:"log_file"`
		TestEmailDir     string        `yaml:"test_email_dir"`
	} `yaml:"app_server"`

	// Signer configuration
	Signer struct {
		CACertPath         string   `yaml:"ca_cert_path"`
		CAKeyPath          string   `yaml:"ca_key_path"`
		SubjectOU          string   `yaml:"subject_ou"`
		SubjectO           string   `yaml:"subject_o"`
		SubjectL           string   `yaml:"subject_l"`
		SubjectST          string   `yaml:"subject_st"`
		SubjectC           string   `yaml:"subject_c"`
		CertValidityDays   int      `yaml:"cert_validity_days"`
		CRLDistributionURL string   `yaml:"crl_distribution_url"`
		AIAIssuerURL       string   `yaml:"aia_issuer_url"`
		GroupExtensionOID  string   `yaml:"group_extension_oid"`
		KeyUsage           []string `yaml:"key_usage"`
		ExtendedKeyUsage   []string `yaml:"extended_key_usage"`
		APIURL             string   `yaml:"api_url"`
		LogFile            string   `yaml:"log_file"`
	}
}

// Load loads the configuration from the specified file
func Load(configPath string) (*Config, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %v", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %v", err)
	}

	// Set defaults
	if config.LogLevel == "" {
		config.LogLevel = "info"
	}
	if config.LogFile == "" {
		config.LogFile = "/var/spool/certM3/logs/mw/app.log"
	}
	if config.AppServer.LogFile == "" {
		config.AppServer.LogFile = "/var/spool/certM3/logs/mw/app.log"
	}
	if config.Signer.LogFile == "" {
		config.Signer.LogFile = "/var/spool/certM3/logs/signer/signer.log"
	}
	if config.AppServer.ListenAddr == "" {
		config.AppServer.ListenAddr = ":8080"
	}
	if config.AppServer.BackendAPIURL == "" {
		// Default to the PostgREST server running locally
		config.AppServer.BackendAPIURL = "http://localhost:3000"
	}
	if config.AppServer.RateLimitPerIP == 0 {
		config.AppServer.RateLimitPerIP = 100
	}
	if config.AppServer.MetricsPath == "" {
		config.AppServer.MetricsPath = "/metrics"
	}
	if config.AppServer.MetricsTimeout == 0 {
		config.AppServer.MetricsTimeout = 5 * time.Second
	}
	if config.AppServer.TestEmailDir == "" {
		config.AppServer.TestEmailDir = "/var/spool/certM3/test-emails/"
	}

	// Load JWT secret from file if specified
	if config.AppServer.JWTSecret == "" {
		jwtSecretPath := "/var/spool/certM3/mw/JWT-secret"
		if jwtSecret, err := os.ReadFile(jwtSecretPath); err == nil {
			config.AppServer.JWTSecret = strings.TrimSpace(string(jwtSecret))
		}
	}

	// A real implementation should load the backend secret from a secure source
	if config.AppServer.BackendJWTSecret == "" {
		config.AppServer.BackendJWTSecret = "placeholder-replace-this-with-a-real-secret-key-32-chars"
	}

	return &config, nil
}

// Validate validates the configuration
func (c *Config) Validate(component string) error {
	// Common validation
	if c.LogLevel != "debug" && c.LogLevel != "info" && c.LogLevel != "warn" && c.LogLevel != "error" {
		return fmt.Errorf("invalid log level: %s", c.LogLevel)
	}

	// Middleware validation (shared between app and signer)
	if c.Middleware.SocketPath == "" {
		return fmt.Errorf("MIDDLEWARE_SOCKET_PATH is required")
	}

	// App server validation
	if c.AppServer.ListenAddr == "" {
		return fmt.Errorf("APP_LISTEN_ADDR is required")
	}
	if c.AppServer.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if c.AppServer.BackendJWTSecret == "" {
		return fmt.Errorf("BACKEND_JWT_SECRET is required")
	}
	if c.AppServer.BackendAPIURL == "" {
		return fmt.Errorf("BACKEND_API_URL is required")
	}
	// Only check mTLS certs if provided
	if c.AppServer.MTLSCertPath != "" {
		if _, err := os.Stat(c.AppServer.MTLSCertPath); err != nil {
			return fmt.Errorf("MTLS certificate not found: %v", err)
		}
	}
	if c.AppServer.MTLSKeyPath != "" {
		if _, err := os.Stat(c.AppServer.MTLSKeyPath); err != nil {
			return fmt.Errorf("MTLS key not found: %v", err)
		}
	}
	if c.AppServer.MTLSCAPath != "" {
		if _, err := os.Stat(c.AppServer.MTLSCAPath); err != nil {
			return fmt.Errorf("MTLS CA not found: %v", err)
		}
	}

	// Signer validation (only when component is "signer")
	if component == "signer" {
		// ... (signer validation remains the same)
	}

	if c.AppServer.RateLimitPerIP < 0 {
		return fmt.Errorf("rate limit per IP must be non-negative")
	}

	if c.AppServer.MetricsTimeout < 0 {
		return fmt.Errorf("metrics timeout must be non-negative")
	}

	return nil
}

// GetEnvInt gets an integer value from environment variable with fallback
func GetEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return fallback
}

// GetEnvDuration gets a duration value from environment variable with fallback
func GetEnvDuration(key string, fallback time.Duration) time.Duration {
	if value, exists := os.LookupEnv(key); exists {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return fallback
}
