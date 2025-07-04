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
	"github.com/ogt11/certm3/mw/internal/config"
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
	config     *config.Config
}

// NewHandler creates a new handler
// IMPORTANT: We use the same backend API call code path in both test and production modes.
// This ensures that any issues with the frontend can be isolated from backend API integration issues.
// The testMode flag is only used to bypass JWT validation in SubmitCSR, not to modify backend API calls.
func NewHandler(logger *logging.Logger, metrics *metrics.Metrics, jwtManager *security.JWTManager, client *http.Client, backendURL string, testMode bool, config *config.Config) *Handler {
	return &Handler{
		logger:     logger,
		metrics:    metrics,
		jwtManager: jwtManager,
		client:     client,
		backendURL: backendURL,
		testMode:   testMode,
		config:     config,
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
	backendReq, err := http.NewRequest("POST", h.config.AppServer.BackendBaseURL+"/requests", bytes.NewBuffer(reqBody))
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
	backendReq, err := http.NewRequest("POST", h.config.AppServer.BackendBaseURL+"/requests/"+req.RequestID+"/validate", bytes.NewBuffer(reqBody))
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

		// Get request details to get the username
		start = time.Now()
		requestReq, err := http.NewRequest("GET", h.config.AppServer.BackendBaseURL+"/requests/"+req.RequestID, nil)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			h.metrics.RecordBackendRequest("GET", "/requests", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		requestReq.Header.Set("Content-Type", "application/json")

		requestResp, err := h.client.Do(requestReq)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			h.metrics.RecordBackendRequest("GET", "/requests", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		requestBody, err := io.ReadAll(requestResp.Body)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			requestResp.Body.Close()
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		requestResp.Body.Close()

		var requestData struct {
			Username string `json:"username"`
		}
		if err := json.Unmarshal(requestBody, &requestData); err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Create self group
		selfGroupData := struct {
			Name        string `json:"name"`
			DisplayName string `json:"displayName"`
			Description string `json:"description"`
		}{
			Name:        requestData.Username,
			DisplayName: requestData.Username + "'s Group",
			Description: "Personal group for " + requestData.Username,
		}

		h.logger.WithFields(map[string]interface{}{
			"username":   requestData.Username,
			"group_data": selfGroupData,
			"endpoint":   h.config.AppServer.BackendBaseURL + "/groups",
			"request_id": req.RequestID,
		}).Info("Creating self group")

		// Create self group
		start = time.Now()
		selfGroupBody, err := json.Marshal(selfGroupData)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		selfGroupReq, err := http.NewRequest("POST", h.config.AppServer.BackendBaseURL+"/groups", bytes.NewBuffer(selfGroupBody))
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			h.metrics.RecordBackendRequest("POST", "/groups", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		selfGroupReq.Header.Set("Content-Type", "application/json")

		selfGroupResp, err := h.client.Do(selfGroupReq)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			h.metrics.RecordBackendRequest("POST", "/groups", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		respBody, err = io.ReadAll(selfGroupResp.Body)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			selfGroupResp.Body.Close()
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		selfGroupResp.Body.Close()

		h.logger.WithFields(map[string]interface{}{
			"status_code": selfGroupResp.StatusCode,
			"group_name":  requestData.Username,
			"response":    string(respBody),
		}).Info("Self group creation response")

		if selfGroupResp.StatusCode != http.StatusCreated && selfGroupResp.StatusCode != http.StatusOK {
			h.logger.WithFields(map[string]interface{}{
				"status_code": selfGroupResp.StatusCode,
				"group_name":  requestData.Username,
				"response":    string(respBody),
			}).Error("Failed to create self group")
			http.Error(w, "Failed to create self group", http.StatusInternalServerError)
			return
		}

		// Add user to self group
		membersData := struct {
			UserIDs []string `json:"userIds"`
		}{
			UserIDs: []string{backendResp.UserID},
		}

		membersBody, err := json.Marshal(membersData)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		h.logger.WithFields(map[string]interface{}{
			"user_id":    backendResp.UserID,
			"group_name": requestData.Username,
			"endpoint":   h.config.AppServer.BackendBaseURL + "/groups/" + requestData.Username + "/members",
		}).Info("Adding user to self group")

		// Add to self group
		start = time.Now()
		selfMembersReq, err := http.NewRequest("POST", h.config.AppServer.BackendBaseURL+"/groups/"+requestData.Username+"/members", bytes.NewBuffer(membersBody))
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
				"user_id":    backendResp.UserID,
				"group_name": requestData.Username,
			})
			h.metrics.RecordBackendRequest("POST", "/groups/members", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		selfMembersReq.Header.Set("Content-Type", "application/json")

		selfMembersResp, err := h.client.Do(selfMembersReq)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
				"user_id":    backendResp.UserID,
				"group_name": requestData.Username,
			})
			h.metrics.RecordBackendRequest("POST", "/groups/members", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		respBody, err = io.ReadAll(selfMembersResp.Body)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
				"user_id":    backendResp.UserID,
				"group_name": requestData.Username,
			})
			selfMembersResp.Body.Close()
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		selfMembersResp.Body.Close()

		h.logger.WithFields(map[string]interface{}{
			"status_code": selfMembersResp.StatusCode,
			"user_id":     backendResp.UserID,
			"group_name":  requestData.Username,
			"response":    string(respBody),
		}).Info("Self group membership response")

		if selfMembersResp.StatusCode != http.StatusNoContent {
			h.logger.WithFields(map[string]interface{}{
				"status_code": selfMembersResp.StatusCode,
				"user_id":     backendResp.UserID,
				"group_name":  requestData.Username,
				"response":    string(respBody),
			}).Error("Failed to add user to self group")
			http.Error(w, "Failed to add user to self group", http.StatusInternalServerError)
			return
		}

		// Add user to users group
		start = time.Now()
		usersGroupBody, err := json.Marshal(membersData)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
			})
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		h.logger.WithFields(map[string]interface{}{
			"user_id":    backendResp.UserID,
			"group_name": "users",
			"endpoint":   h.config.AppServer.BackendBaseURL + "/groups/users/members",
		}).Info("Adding user to users group")

		usersGroupReq, err := http.NewRequest("POST", h.config.AppServer.BackendBaseURL+"/groups/users/members", bytes.NewBuffer(usersGroupBody))
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
				"user_id":    backendResp.UserID,
				"group_name": "users",
			})
			h.metrics.RecordBackendRequest("POST", "/groups/members", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		usersGroupReq.Header.Set("Content-Type", "application/json")

		usersGroupResp, err := h.client.Do(usersGroupReq)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
				"user_id":    backendResp.UserID,
				"group_name": "users",
			})
			h.metrics.RecordBackendRequest("POST", "/groups/members", "error", time.Since(start), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		respBody, err = io.ReadAll(usersGroupResp.Body)
		if err != nil {
			h.logger.LogError(err, map[string]interface{}{
				"path":       r.URL.Path,
				"remote_ip":  r.RemoteAddr,
				"user_agent": r.UserAgent(),
				"user_id":    backendResp.UserID,
				"group_name": "users",
			})
			usersGroupResp.Body.Close()
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		usersGroupResp.Body.Close()

		h.logger.WithFields(map[string]interface{}{
			"status_code": usersGroupResp.StatusCode,
			"user_id":     backendResp.UserID,
			"group_name":  "users",
			"response":    string(respBody),
		}).Info("Users group membership response")

		if usersGroupResp.StatusCode != http.StatusNoContent {
			h.logger.WithFields(map[string]interface{}{
				"status_code": usersGroupResp.StatusCode,
				"user_id":     backendResp.UserID,
				"group_name":  "users",
				"response":    string(respBody),
			}).Error("Failed to add user to users group")
			http.Error(w, "Failed to add user to users group", http.StatusInternalServerError)
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
	// The request can also contain a "groups" field, which is an array of strings.
	var req struct {
		CSR    string   `json:"csr"`
		Groups []string `json:"groups"` // Added to receive requested groups
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
		Groups:    req.Groups, // Pass the groups received in the request
		Token:     r.Header.Get("Authorization"), // Send the JWT token
	}

	// Log the groups being sent to the signer
	h.logger.WithFields(map[string]interface{}{
		"user_id":        userID,
		"request_id":     requestID,
		"requested_groups": req.Groups,
	}).Info("Sending CSR and requested groups to signer service")

	// Send request to signer
	start := time.Now()

	// Create Unix domain socket connection to signer
	conn, err := net.Dial("unix", h.config.Signer.SocketPath)
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

	// Debug log to confirm handler execution
	h.logger.WithFields(map[string]interface{}{
		"username": username,
		"path":     r.URL.Path,
	}).Debug("DEBUG: CheckUsername handler called")

	h.logger.WithFields(map[string]interface{}{
		"username": username,
		"path":     r.URL.Path,
	}).Info("Checking username availability")

	// Send request to backend
	start := time.Now()
	backendURL := h.config.AppServer.BackendBaseURL + "/request/check-username/" + username
	h.logger.WithFields(map[string]interface{}{
		"backend_url": backendURL,
		"username":    username,
		"config_url":  h.config.AppServer.BackendBaseURL,
	}).Info("DEBUG: Full backend URL")

	backendReq, err := http.NewRequest("GET", backendURL, nil)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordBackendRequest("GET", "/request/check-username", "error", time.Since(start), err)
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

	h.logger.WithFields(map[string]interface{}{
		"status_code": resp.StatusCode,
		"headers":     resp.Header,
		"url":         resp.Request.URL.String(),
	}).Info("DEBUG: Backend response details")

	// Check the response status code
	h.logger.WithFields(map[string]interface{}{
		"status_code": resp.StatusCode,
		"headers":     resp.Header,
		"username":    username,
	}).Info("DEBUG: Backend response status code")

	// Default to username being unavailable
	available := false
	statusMsg := "Username is taken"

	// Only mark as available if we get a 404
	// if resp.StatusCode == http.StatusNotFound {
	if resp.StatusCode == 404 {
		available = true
		statusMsg = "Username is available"
	}

	h.logger.WithFields(map[string]interface{}{
		"username": username,
		"status":   resp.StatusCode,
	}).Info("DEBUG: " + statusMsg)

	json.NewEncoder(w).Encode(map[string]bool{"available": available})
}

// HealthCheck handles the health check endpoint
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	h.logger.WithFields(map[string]interface{}{
		"path":        r.URL.Path,
		"method":      r.Method,
		"remote_addr": r.RemoteAddr,
	}).Debug("HealthCheck handler called")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"build": "timestamp",
		"ts":    time.Now().Unix(),
	})
}

// GetUserGroups handles retrieving a user's groups
func (h *Handler) GetUserGroups(w http.ResponseWriter, r *http.Request) {
	// Extract username from the URL path
	vars := mux.Vars(r)
	username := vars["username"]

	h.logger.WithFields(map[string]interface{}{
		"username": username,
		"path":     r.URL.Path,
	}).Info("Getting user groups")

	// First, get the user info from backend
	start := time.Now()
	userURL := h.config.AppServer.BackendBaseURL + "/users/username/" + username
	h.logger.WithFields(map[string]interface{}{
		"user_url": userURL,
		"username": username,
	}).Info("DEBUG: Getting user info from backend")

	userReq, err := http.NewRequest("GET", userURL, nil)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create user request")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	userResp, err := h.client.Do(userReq)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get user info")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		h.logger.WithFields(map[string]interface{}{
			"status_code": userResp.StatusCode,
		}).Error("Failed to get user info")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	var userData struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&userData); err != nil {
		h.logger.WithError(err).Error("Failed to decode user response")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Now get the groups for this user
	start = time.Now()
	groupsURL := h.config.AppServer.BackendBaseURL + "/users/" + userData.ID + "/groups"
	h.logger.WithFields(map[string]interface{}{
		"groups_url": groupsURL,
		"user_id":    userData.ID,
	}).Info("DEBUG: Getting user groups from backend")

	groupsReq, err := http.NewRequest("GET", groupsURL, nil)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordBackendRequest("GET", "/users/groups", "error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	groupsResp, err := h.client.Do(groupsReq)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		h.metrics.RecordBackendRequest("GET", "/users/groups", "error", time.Since(start), err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer groupsResp.Body.Close()

	// Record backend request metrics
	h.metrics.RecordBackendRequest("GET", "/users/groups", string(groupsResp.StatusCode), time.Since(start), nil)

	if groupsResp.StatusCode != http.StatusOK {
		h.logger.LogError(fmt.Errorf("unexpected status code: %d", groupsResp.StatusCode), map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Parse and return the groups
	var groups []string
	if err := json.NewDecoder(groupsResp.Body).Decode(&groups); err != nil {
		h.logger.LogError(err, map[string]interface{}{
			"path":       r.URL.Path,
			"remote_ip":  r.RemoteAddr,
			"user_agent": r.UserAgent(),
		})
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Return the groups
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

// RegisterRoutes registers all HTTP routes for the app
func RegisterRoutes(r *mux.Router, h *Handler) {
	r.HandleFunc("/app/initiate-request", h.InitiateRequest).Methods("POST")
	r.HandleFunc("/app/validate-email", h.ValidateEmail).Methods("POST")
	r.HandleFunc("/app/submit-csr", h.SubmitCSR).Methods("POST")
	r.HandleFunc("/app/check-username/{username}", h.CheckUsername).Methods("GET")
	r.HandleFunc("/app/groups/{username}", h.GetUserGroups).Methods("GET")
	r.HandleFunc("/app/health", h.HealthCheck).Methods("GET")
}
