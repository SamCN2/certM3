package main

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/ogt11/certm3/mw/internal/app"
	"github.com/ogt11/certm3/mw/internal/config"
	"github.com/ogt11/certm3/mw/internal/logging"
	"github.com/ogt11/certm3/mw/internal/security"
	"github.com/ogt11/certm3/mw/pkg/metrics"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "./config.yaml", "Path to config file")
	testAPI := flag.Bool("testapi", false, "Run in test API mode")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		panic(err)
	}

	// Ensure JWT secret exists
	jwtSecretPath := "/var/spool/certM3/mw/JWT-secret"
	if err := os.MkdirAll(filepath.Dir(jwtSecretPath), 0755); err != nil {
		panic(err)
	}

	jwtSecret, err := os.ReadFile(jwtSecretPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Generate a new JWT secret
			secret := make([]byte, 32)
			if _, err := rand.Read(secret); err != nil {
				panic(err)
			}
			jwtSecret = []byte(base64.StdEncoding.EncodeToString(secret))
			if err := os.WriteFile(jwtSecretPath, jwtSecret, 0600); err != nil {
				panic(err)
			}
		} else {
			panic(err)
		}
	}

	// Trim whitespace and update config with JWT secret
	cfg.AppServer.JWTSecret = strings.TrimSpace(string(jwtSecret))
	fmt.Printf("JWT secret in config: '%s'\n", cfg.AppServer.JWTSecret)

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		panic(err)
	}

	// Initialize logger
	log, err := logging.New(cfg.LogLevel, cfg.LogFile)
	if err != nil {
		panic(err)
	}

	// Initialize metrics
	m := metrics.New()

	// Initialize JWT manager
	jwtManager := security.NewJWTManager(cfg.AppServer.JWTSecret, "certM3", "certM3-app")

	// Create HTTP client with mTLS
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
				// TODO: Add client certificate and CA certificate
			},
			DialContext: (&net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 30 * time.Second,
				DualStack: false, // Force IPv4
			}).DialContext,
		},
		Timeout: 30 * time.Second,
	}

	// Create handler
	h := app.NewHandler(log, m, jwtManager, client, cfg.AppServer.BackendAPIURL, *testAPI)

	// If test API mode is enabled, run the test API flow and exit
	if *testAPI {
		if err := app.RunTestAPI(h, log); err != nil {
			log.Fatal(err)
		}
		return
	}

	// Create router for external HTTPS
	r := mux.NewRouter()

	// Add middleware
	r.Use(m.HTTPMiddleware)
	r.Use(app.LoggingMiddleware(log))
	r.Use(app.NewRateLimiter(cfg.AppServer.RateLimitPerIP, time.Second, m).RateLimitMiddleware)
	r.Use(app.AuthMiddleware(jwtManager, log, m))

	// Add routes
	r.HandleFunc("/app/initiate-request", h.InitiateRequest).Methods("POST")
	r.HandleFunc("/app/validate-email", h.ValidateEmail).Methods("POST")
	r.HandleFunc("/app/submit-csr", h.SubmitCSR).Methods("POST")

	// Add metrics endpoint
	r.Handle("/metrics", m.Handler())

	// Add health check endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Create HTTP server for external access
	srv := &http.Server{
		Addr:         cfg.AppServer.ListenAddr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Info("Starting server on ", cfg.AppServer.ListenAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	log.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
	log.Info("Server stopped")
}
