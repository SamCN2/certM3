package signer

import (
	"encoding/json"
	"io"
	"net"
	"net/http"

	"github.com/ogt11/certm3/mw/internal/logging"
	"github.com/ogt11/certm3/mw/pkg/metrics"
)

// min returns the smaller of two integers
func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}

// Handler holds dependencies for the handlers
type Handler struct {
	logger  *logging.Logger
	metrics *metrics.Metrics
	signer  *Signer
}

// NewHandler creates a new handler instance
func NewHandler(logger *logging.Logger, metrics *metrics.Metrics, signer *Signer) *Handler {
	return &Handler{
		logger:  logger,
		metrics: metrics,
		signer:  signer,
	}
}

// SignRequest represents the incoming signing request
// Note: Private key and passphrase handling is done entirely in the browser.
// The middleware and signer never handle private keys or passphrases.
type SignRequest struct {
	RequestID string   `json:"requestId"`
	CSR       string   `json:"csr"`
	Groups    []string `json:"groups"`
	Token     string   `json:"token"`
}

// SignResponse represents the signing response
type SignResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Certificate   string `json:"certificate"`
		CACertificate string `json:"caCertificate"`
	} `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

// SignCSR handles CSR signing requests
func (h *Handler) SignCSR(w http.ResponseWriter, r *http.Request) {
	var req SignRequest

	// Read and decode request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("Failed to read request body: %v", err)
		http.Error(w, "Failed to read request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Log the raw request body
	h.logger.WithFields(map[string]interface{}{
		"raw_body":    string(body),
		"body_length": len(body),
		"first_bytes": string(body[:min(100, len(body))]),
	}).Info("Raw request body received by signer")

	if err := json.Unmarshal(body, &req); err != nil {
		h.logger.Error("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.CSR == "" || req.RequestID == "" || req.Token == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Verify JWT token
	if err := h.verifyToken(req.Token, req.RequestID); err != nil {
		h.logger.Error("Token verification failed: %v", err)
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Sign the CSR
	certPEM, err := h.signer.SignCSR([]byte(req.CSR))
	if err != nil {
		h.logger.Error("Failed to sign CSR: %v", err)
		http.Error(w, "Failed to sign CSR", http.StatusInternalServerError)
		return
	}

	// Get CA certificate
	caCertPEM, err := h.signer.GetCACertificate()
	if err != nil {
		h.logger.Error("Failed to get CA certificate: %v", err)
		http.Error(w, "Failed to get CA certificate", http.StatusInternalServerError)
		return
	}

	// Return the signed certificate and CA certificate
	w.Header().Set("Content-Type", "application/json")
	response := SignResponse{
		Success: true,
	}
	response.Data.Certificate = string(certPEM)
	response.Data.CACertificate = string(caCertPEM)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// HandleConnection handles a raw JSON connection over Unix domain socket
func (h *Handler) HandleConnection(conn net.Conn) {
	defer conn.Close()

	// Read request
	var req SignRequest
	if err := json.NewDecoder(conn).Decode(&req); err != nil {
		h.logger.Error("Failed to decode request: %v", err)
		h.logger.WithFields(map[string]interface{}{
			"component": "signer",
			"error":     err.Error(),
		}).Error("JSON decode error")
		sendErrorResponse(conn, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.CSR == "" || req.RequestID == "" || req.Token == "" {
		sendErrorResponse(conn, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Verify JWT token
	if err := h.verifyToken(req.Token, req.RequestID); err != nil {
		h.logger.Error("Token verification failed: %v", err)
		sendErrorResponse(conn, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Sign the CSR
	// Pass req.Groups, which originates from the initial JSON request to app/handlers.go
	certPEM, err := h.signer.SignCSR([]byte(req.CSR), req.Groups)
	if err != nil {
		h.logger.Error("Failed to sign CSR: %v", err)
		sendErrorResponse(conn, "Failed to sign CSR", http.StatusInternalServerError)
		return
	}

	// Get CA certificate
	caCertPEM, err := h.signer.GetCACertificate()
	if err != nil {
		h.logger.Error("Failed to get CA certificate: %v", err)
		sendErrorResponse(conn, "Failed to get CA certificate", http.StatusInternalServerError)
		return
	}

	// Return the signed certificate and CA certificate
	response := SignResponse{
		Success: true,
	}
	response.Data.Certificate = string(certPEM)
	response.Data.CACertificate = string(caCertPEM)

	if err := json.NewEncoder(conn).Encode(response); err != nil {
		h.logger.WithFields(map[string]interface{}{
			"component": "signer",
			"error":     err.Error(),
		}).Error("Failed to encode response")
		return
	}
}

// sendErrorResponse sends a standardized error response over the connection
func sendErrorResponse(conn net.Conn, message string, status int) {
	json.NewEncoder(conn).Encode(SignResponse{
		Success: false,
		Error:   message,
	})
}

// verifyToken is a placeholder for token verification that should be handled by the middleware
func (h *Handler) verifyToken(token, requestId string) error {
	// Token verification is handled by the middleware layer
	return nil
}
