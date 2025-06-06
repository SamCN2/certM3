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

	// App server configuration
	AppServer struct {
		ListenAddr     string `yaml:"listen_addr"`
		SocketPath     string `yaml:"socket_path"`
		BackendAPIURL  string `yaml:"backend_api_url"`
		JWTSecret      string `yaml:"jwt_secret"`
		MTLSCertPath   string
		MTLSKeyPath    string
		MTLSCAPath     string
		RateLimitPerIP int           `yaml:"rate_limit_per_ip"`
		MetricsEnabled bool          `yaml:"metrics_enabled"`
		MetricsPath    string        `yaml:"metrics_path"`
		MetricsTimeout time.Duration `yaml:"metrics_timeout"`
	} `yaml:"app_server"`

	// Signer configuration
	Signer struct {
		SocketPath            string   `yaml:"socket_path"`
		CACertPath            string   `yaml:"ca_cert_path"`
		CAKeyPath             string   `yaml:"ca_key_path"`
		PrivateKeyPasswordVar string   `yaml:"private_key_password_var"`
		SubjectOU             string   `yaml:"subject_ou"`
		SubjectO              string   `yaml:"subject_o"`
		SubjectL              string   `yaml:"subject_l"`
		SubjectST             string   `yaml:"subject_st"`
		SubjectC              string   `yaml:"subject_c"`
		CertValidityDays      int      `yaml:"cert_validity_days"`
		CRLDistributionURL    string   `yaml:"crl_distribution_url"`
		AIAIssuerURL          string   `yaml:"aia_issuer_url"`
		RoleExtensionOID      string   `yaml:"role_extension_oid"`
		UsernameExtensionOID  string   `yaml:"username_extension_oid"`
		KeyUsage              []string `yaml:"key_usage"`
		ExtendedKeyUsage      []string `yaml:"extended_key_usage"`
		APIURL                string   `yaml:"api_url"`
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
		config.LogFile = "/var/log/certM3/mw/app.log"
	}
	if config.AppServer.ListenAddr == "" {
		config.AppServer.ListenAddr = ":8080"
	}
	if config.AppServer.BackendAPIURL == "" {
		config.AppServer.BackendAPIURL = "http://localhost:8081"
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

	// Load JWT secret from file if specified
	if config.AppServer.JWTSecret == "" {
		jwtSecretPath := "/var/spool/certM3/mw/JWT-secret"
		if jwtSecret, err := os.ReadFile(jwtSecretPath); err == nil {
			config.AppServer.JWTSecret = strings.TrimSpace(string(jwtSecret))
		}
	}

	return &config, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Common validation
	if c.LogLevel != "debug" && c.LogLevel != "info" && c.LogLevel != "warn" && c.LogLevel != "error" {
		return fmt.Errorf("invalid log level: %s", c.LogLevel)
	}

	// App server validation
	if c.AppServer.ListenAddr == "" {
		return fmt.Errorf("APP_LISTEN_ADDR is required")
	}
	if c.AppServer.SocketPath == "" {
		return fmt.Errorf("APP_SOCKET_PATH is required")
	}
	if c.AppServer.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
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

	// Signer validation
	if c.Signer.SocketPath == "" {
		return fmt.Errorf("SIGNER_SOCKET_PATH is required")
	}
	if c.Signer.CACertPath == "" {
		return fmt.Errorf("CA_CERT_PATH is required")
	}
	if c.Signer.CAKeyPath == "" {
		return fmt.Errorf("CA_KEY_PATH is required")
	}
	if _, err := os.Stat(c.Signer.CACertPath); err != nil {
		return fmt.Errorf("CA certificate not found: %v", err)
	}
	if _, err := os.Stat(c.Signer.CAKeyPath); err != nil {
		return fmt.Errorf("CA key not found: %v", err)
	}
	if c.Signer.SubjectOU == "" {
		return fmt.Errorf("SIGNER_SUBJECT_OU is required")
	}
	if c.Signer.SubjectO == "" {
		return fmt.Errorf("SIGNER_SUBJECT_O is required")
	}
	if c.Signer.SubjectL == "" {
		return fmt.Errorf("SIGNER_SUBJECT_L is required")
	}
	if c.Signer.SubjectST == "" {
		return fmt.Errorf("SIGNER_SUBJECT_ST is required")
	}
	if c.Signer.SubjectC == "" {
		return fmt.Errorf("SIGNER_SUBJECT_C is required")
	}
	if c.Signer.CertValidityDays == 0 {
		return fmt.Errorf("SIGNER_CERT_VALIDITY_DAYS is required")
	}
	if c.Signer.CRLDistributionURL == "" {
		return fmt.Errorf("SIGNER_CRL_URL is required")
	}
	if c.Signer.AIAIssuerURL == "" {
		return fmt.Errorf("SIGNER_AIA_URL is required")
	}
	if c.Signer.RoleExtensionOID == "" {
		return fmt.Errorf("SIGNER_ROLE_OID is required")
	}
	if c.Signer.UsernameExtensionOID == "" {
		return fmt.Errorf("SIGNER_USERNAME_OID is required")
	}
	if len(c.Signer.KeyUsage) == 0 {
		return fmt.Errorf("SIGNER_KEY_USAGE is required")
	}
	if len(c.Signer.ExtendedKeyUsage) == 0 {
		return fmt.Errorf("SIGNER_EXTENDED_KEY_USAGE is required")
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
