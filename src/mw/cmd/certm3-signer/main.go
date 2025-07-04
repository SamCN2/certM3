package main

import (
	"crypto/x509"
	"encoding/pem"
	"flag"
	"log"
	"net"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/ogt11/certm3/mw/internal/config"
	"github.com/ogt11/certm3/mw/internal/logging"
	"github.com/ogt11/certm3/mw/internal/signer"
	"github.com/ogt11/certm3/mw/pkg/metrics"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "config.yaml", "Path to config file")
	flag.Parse()

	// Load configuration
	config, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	logger, err := logging.New(config.LogLevel, config.Signer.LogFile, config.Verbose)
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}

	// Initialize metrics
	m := metrics.New()

	// Read CA certificate
	caCertPEM, err := os.ReadFile(config.Signer.CACertPath)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Fatal("CA certificate file not found at %s", config.Signer.CACertPath)
		}
		logger.Fatal("Failed to read CA certificate file: %v", err)
	}

	// Read CA key
	caKeyPEM, err := os.ReadFile(config.Signer.CAKeyPath)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Fatal("CA key file not found at %s", config.Signer.CAKeyPath)
		}
		logger.Fatal("Failed to read CA key file: %v", err)
	}

	// Decode CA certificate
	caCertBlock, _ := pem.Decode(caCertPEM)
	if caCertBlock == nil {
		logger.Fatal("Failed to decode CA certificate PEM block - file exists but is not in valid PEM format")
	}

	// Decode CA key
	caKeyBlock, _ := pem.Decode(caKeyPEM)
	if caKeyBlock == nil {
		logger.Fatal("Failed to decode CA key PEM block - file exists but is not in valid PEM format")
	}

	// Parse CA certificate
	caCert, err := x509.ParseCertificate(caCertBlock.Bytes)
	if err != nil {
		logger.Fatal("Failed to parse CA certificate - file exists and is PEM encoded but not a valid X.509 certificate: %v", err)
	}

	// Parse CA key
	var caKey interface{}
	// TODO: Following Postel's Law, we should be more liberal in what we accept.
	// Currently we only handle PKCS#1 (RSA/EC) and PKCS#8 formats.
	// We should consider adding support for:
	// - PKCS#12 (.p12/.pfx)
	// - OpenSSH private key format
	// - Other common key formats
	switch caKeyBlock.Type {
	case "RSA PRIVATE KEY":
		caKey, err = x509.ParsePKCS1PrivateKey(caKeyBlock.Bytes)
	case "EC PRIVATE KEY":
		caKey, err = x509.ParseECPrivateKey(caKeyBlock.Bytes)
	case "PRIVATE KEY":
		caKey, err = x509.ParsePKCS8PrivateKey(caKeyBlock.Bytes)
	default:
		logger.Fatal("CA key file exists but is not in a supported format. Found format: %s, supported formats: RSA PRIVATE KEY, EC PRIVATE KEY, PRIVATE KEY", caKeyBlock.Type)
	}
	if err != nil {
		logger.Fatal("Failed to parse CA key - file exists and is PEM encoded but not a valid private key: %v", err)
	}

	// Initialize signer
	s := signer.New(config, logger, m, caCert, caKey, config.Signer.GroupExtensionOID)

	// Initialize handler
	h := signer.NewHandler(logger, m, s)

	// Create socket directory
	socketDir := filepath.Dir(config.Signer.SocketPath)
	if err := os.MkdirAll(socketDir, 0755); err != nil {
		logger.Error("Failed to create socket directory: %v", err)
		os.Exit(1)
	}

	// Remove existing socket if it exists
	if err := os.Remove(config.Signer.SocketPath); err != nil && !os.IsNotExist(err) {
		logger.Error("Failed to remove existing socket: %v", err)
		os.Exit(1)
	}

	// Create Unix domain socket listener
	// Protocol: Raw JSON messages over Unix domain socket
	// Request format:
	// {
	//   "requestId": "string",
	//   "csr": "string",  // PEM-encoded CSR
	//   "groups": ["string"],
	//   "token": "string"
	// }
	// Response format:
	// {
	//   "success": true,
	//   "data": {
	//     "certificate": "string",  // PEM-encoded signed certificate
	//     "caCertificate": "string" // PEM-encoded CA certificate
	//   }
	// }
	listener, err := net.Listen("unix", config.Signer.SocketPath)
	if err != nil {
		logger.Error("Failed to create Unix domain socket: %v", err)
		os.Exit(1)
	}

	// Set socket permissions
	if err := os.Chmod(config.Signer.SocketPath, 0666); err != nil {
		logger.Error("Failed to set socket permissions: %v", err)
		os.Exit(1)
	}

	// Start server
	logger.Info("Starting server on %s", config.Signer.SocketPath)
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				logger.Error("Failed to accept connection: %v", err)
				continue
			}
			go h.HandleConnection(conn)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Shutdown server
	logger.Info("Shutting down server...")
	if err := listener.Close(); err != nil {
		logger.Error("Failed to close listener: %v", err)
	}

	// Remove socket file
	if err := os.Remove(config.Signer.SocketPath); err != nil && !os.IsNotExist(err) {
		logger.Error("Failed to remove socket file: %v", err)
	}

	logger.Info("Server exited properly")
}
