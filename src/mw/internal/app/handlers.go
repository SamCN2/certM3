package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"regexp"
	"time"

	"github.com/gorilla/mux"
	"github.com/ogt11/certm3/mw/internal/logging"
	"github.com/ogt11/certm3/mw/internal/security"
	"github.com/ogt11/certm3/mw/pkg/metrics"
)

// min returns the smaller of x or y
func min(x, y int) int {
	return int(math.Min(float64(x), float64(y)))
}

// Handler holds the dependencies for the handlers
type Handler struct {
	logger     *logging.Logger
	metrics    *metrics.Metrics
	jwtManager *security.JWTManager
	client     *http.Client
	backendURL string
	testMode   bool
}

// NewHandler creates a new handler
// IMPORTANT: We use the same backend API call code path in both test and production modes.
// This ensures that any issues with the frontend can be isolated from backend API integration issues.
// The testMode flag is only used to bypass JWT validation in SubmitCSR, not to modify backend API calls.
func NewHandler(logger *logging.Logger, metrics *metrics.Metrics, jwtManager *security.JWTManager, client *http.Client, backendURL string, testMode bool) *Handler {
	return &Handler{
		logger:     logger,
		metrics:    metrics,
		jwtManager: jwtManager,
		client:     client,
		backendURL: backendURL,
		testMode:   testMode,
	}
}

// InitiateRequest handles the initiation of a new request
// IMPORTANT: This uses the same backend API call code path as production.
// Do not modify this to use different URLs or mock responses in test mode.
// This ensures that frontend issues can be properly isolated from backend API issues.
func (h *Handler) InitiateRequest(w http.ResponseWriter, r *http.Request) {
	// Read and decode request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	// Log the raw request body
	h.logger.WithFields(map[string]interface{}{
		"raw_body": string(body),
	}).Info("Raw request body")

	// Parse request body
	var req struct {
		Email       string `json:"email"`
		Username    string `json:"username"`
		DisplayName string `json:"displayName"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Log the parsed request body
	h.logger.WithFields(map[string]interface{}{
		"parsed_request": req,
	}).Info("Parsed request body")

	// Validate required fields
	if req.Email == "" {
		h.logger.LogSecurityEvent("missing_email", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordSecurityEvent("missing_email")
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}
	if req.Username == "" {
		h.logger.LogSecurityEvent("missing_username", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordSecurityEvent("missing_username")
		http.Error(w, "Username is required", http.StatusBadRequest)
		return
	}

	// Validate email format
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		h.logger.LogSecurityEvent("invalid_email_format", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"email":      req.Email,
		})
		h.metrics.RecordSecurityEvent("invalid_email_format")
		http.Error(w, "Invalid email format", http.StatusBadRequest)
		return
	}

	// Validate username format (alphanumeric and underscore only)
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	if !usernameRegex.MatchString(req.Username) {
		h.logger.LogSecurityEvent("invalid_username_format", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"username":   req.Username,
		})
		h.metrics.RecordSecurityEvent("invalid_username_format")
		http.Error(w, "Invalid username format", http.StatusBadRequest)
		return
	}

	// Create new request body for backend
	reqBody, err := json.Marshal(map[string]string{
		"email":       req.Email,
		"username":    req.Username,
		"displayName": req.DisplayName,
	})
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Record request initiation attempt
	h.metrics.RecordRequestInitiation("attempted")

	// Send request to backend
	start := time.Now()
	backendReq, err := http.NewRequest("POST", h.backendURL+"/requests", bytes.NewBuffer(reqBody))
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordBackendRequest("POST", "/requests", "error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	backendReq.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(backendReq)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordBackendRequest("POST", "/requests", "error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Record backend request metrics
	h.metrics.RecordBackendRequest("POST", "/requests", string(resp.StatusCode), time.Since(start), nil)

	// Record request initiation result
	if resp.StatusCode == http.StatusOK {
		h.metrics.RecordRequestInitiation("success")
	} else {
		h.metrics.RecordRequestInitiation("failed")
	}

	// Copy response to client
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
	}
}

// ValidateEmail handles email validation
func (h *Handler) ValidateEmail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RequestID      string `json:"requestId"`
		ChallengeToken string `json:"challengeToken"`
	}

	// Read and decode request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	// Log the raw request body for debugging
	h.logger.WithFields(map[string]interface{}{
		"raw_body":     string(body),
		"content_type": r.Header.Get("Content-Type"),
	}).Info("Raw request body received")

	if err := json.Unmarshal(body, &req); err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Log the request body received
	h.logger.WithFields(map[string]interface{}{
		"request_body": req,
	}).Info("Received request body for email validation")

	// Validate required fields
	if req.RequestID == "" {
		h.logger.LogSecurityEvent("missing_request_id", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordSecurityEvent("missing_request_id")
		http.Error(w, "Request ID is required", http.StatusBadRequest)
		return
	}
	if req.ChallengeToken == "" {
		h.logger.LogSecurityEvent("missing_validation_code", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordSecurityEvent("missing_validation_code")
		http.Error(w, "Validation code is required", http.StatusBadRequest)
		return
	}

	// Validate request ID format (UUID)
	requestIDRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	if !requestIDRegex.MatchString(req.RequestID) {
		h.logger.LogSecurityEvent("invalid_request_id_format", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"request_id": req.RequestID,
		})
		h.metrics.RecordSecurityEvent("invalid_request_id_format")
		http.Error(w, "Invalid request ID format", http.StatusBadRequest)
		return
	}

	// Validate challenge token format (challenge-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
	challengeRegex := regexp.MustCompile(`^challenge-[a-f0-9-]+$`)
	if !challengeRegex.MatchString(req.ChallengeToken) {
		h.logger.LogSecurityEvent("invalid_validation_code_format", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"code":       req.ChallengeToken,
		})
		h.metrics.RecordSecurityEvent("invalid_validation_code_format")
		http.Error(w, "Invalid validation code format", http.StatusBadRequest)
		return
	}

	// Create new request body for backend
	reqBody, err := json.Marshal(map[string]string{
		"challenge": req.ChallengeToken,
	})
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Record email validation attempt
	h.metrics.RecordEmailValidation("attempted")

	// Send request to backend
	start := time.Now()
	backendReq, err := http.NewRequest("POST", fmt.Sprintf("%s/requests/%s/validate", h.backendURL, req.RequestID), bytes.NewBuffer(reqBody))
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	backendReq.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(backendReq)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordBackendRequest("POST", "/requests/validate", "error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Record backend request metrics
	h.metrics.RecordBackendRequest("POST", "/requests/validate", string(resp.StatusCode), time.Since(start), nil)

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Record email validation result
	if resp.StatusCode == http.StatusOK {
		h.metrics.RecordEmailValidation("success")

		// Parse backend response to get user ID
		var backendResp struct {
			UserID string `json:"userId"`
		}
		if err := json.Unmarshal(respBody, &backendResp); err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Generate JWT token
		token, err := h.jwtManager.GenerateToken(backendResp.UserID, req.RequestID)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Send token response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		}); err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
		}
	} else {
		h.metrics.RecordEmailValidation("failed")
		// Copy error response to client
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := w.Write(respBody); err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
		}
	}
}

// SubmitCSR handles CSR submission
func (h *Handler) SubmitCSR(w http.ResponseWriter, r *http.Request) {
	var userID, requestID string
	var ok bool

	if !h.testMode {
		// Get user ID and request ID from context (set by auth middleware)
		userID, ok = r.Context().Value("user_id").(string)
		if !ok {
			h.logger.LogSecurityEvent("missing_user_id", map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			h.metrics.RecordSecurityEvent("missing_user_id")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		requestID, ok = r.Context().Value("request_id").(string)
		if !ok {
			h.logger.LogSecurityEvent("missing_request_id", map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			h.metrics.RecordSecurityEvent("missing_request_id")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	// Log the CSR submission
	h.logger.WithFields(map[string]interface{}{
		"user_id":    userID,
		"request_id": requestID,
	}).Info("CSR submission received")

	// Read and decode request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	// Log the raw request body for debugging
	h.logger.WithFields(map[string]interface{}{
		"raw_body":     string(body),
		"content_type": r.Header.Get("Content-Type"),
		"body_length":  len(body),
		"first_bytes":  string(body[:min(100, len(body))]),
	}).Info("Raw request body received")

	// Parse request body as JSON
	// The CSR must be sent as a PEM-encoded string in the csr field of a JSON object.
	var req struct {
		CSR string `json:"csr"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		h.logger.LogSecurityEvent("invalid_csr_format", map[string]interface{}{
			"component":  "middleware",
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
			"error":      err.Error(),
			"body":       string(body),
			"body_bytes": body,
			"body_type":  fmt.Sprintf("%T", body),
		})
		h.metrics.RecordSecurityEvent("invalid_csr_format")
		http.Error(w, "Invalid request format: request must be JSON with a csr field", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.CSR == "" {
		h.logger.LogSecurityEvent("missing_csr", map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
		})
		h.metrics.RecordSecurityEvent("missing_csr")
		http.Error(w, "CSR is required", http.StatusBadRequest)
		return
	}

	// Record certificate request
	h.metrics.RecordCertificateRequest("submitted")

	// Create signer request
	// Protocol: Raw JSON messages over Unix domain socket
	// Request format:
	// {
	//   "requestId": "string",
	//   "csr": "string",  // PEM-encoded CSR
	//   "groups": ["string"],
	//   "token": "string"
	// }
	signerReq := struct {
		RequestID string   `json:"requestId"`
		CSR       string   `json:"csr"`
		Groups    []string `json:"groups"`
		Token     string   `json:"token"`
	}{
		RequestID: requestID,
		CSR:       req.CSR,
		Groups:    []string{},                    // Will be extracted from CSR
		Token:     r.Header.Get("Authorization"), // Send the JWT token
	}

	// Send request to signer
	start := time.Now()

	// Create Unix domain socket connection to signer
	conn, err := net.Dial("unix", "/var/run/certM3/mw/signer.sock")
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
		})
		h.metrics.RecordSignerRequest("error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// Send request as raw JSON
	if err := json.NewEncoder(conn).Encode(signerReq); err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
		})
		h.metrics.RecordSignerRequest("error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Read response
	var signerResp struct {
		Success bool `json:"success"`
		Data    struct {
			Certificate   string `json:"certificate"`
			CACertificate string `json:"caCertificate"`
		} `json:"data,omitempty"`
		Error string `json:"error,omitempty"`
	}

	if err := json.NewDecoder(conn).Decode(&signerResp); err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"component":  "middleware",
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
		})
		h.metrics.RecordSignerRequest("error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if !signerResp.Success {
		h.logger.LogError(fmt.Errorf("signer error: %s", signerResp.Error), map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
			"user_id":    userID,
			"request_id": requestID,
		})
		h.metrics.RecordSignerRequest("error", time.Since(start), fmt.Errorf(signerResp.Error))
		http.Error(w, "Failed to sign CSR", http.StatusInternalServerError)
		return
	}

	// Return the signed certificate
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"certificate":   signerResp.Data.Certificate,
		"caCertificate": signerResp.Data.CACertificate,
	})
}

// CheckUsername handles username availability check
func (h *Handler) CheckUsername(w http.ResponseWriter, r *http.Request) {
	// Extract username from the URL path
	vars := mux.Vars(r)
	username := vars["username"]

	// Forward the request to the backend API
	backendReq, err := http.NewRequest("GET", h.backendURL+"/api/request/check-username/"+username, nil)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	resp, err := h.client.Do(backendReq)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Set response content type
	w.Header().Set("Content-Type", "application/json")

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// If backend returns 404, username is available
	if resp.StatusCode == http.StatusNotFound {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]bool{"available": true})
		return
	}

	// If backend returns 200, username is taken
	if resp.StatusCode == http.StatusOK {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]bool{"available": false})
		return
	}

	// For any other status code, return the error as JSON
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}
