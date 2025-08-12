package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/ogt11/certm3/mw_postgrest/internal/api"
	"github.com/ogt11/certm3/mw_postgrest/internal/config"
	"github.com/ogt11/certm3/mw_postgrest/internal/logging"
	"github.com/ogt11/certm3/mw_postgrest/internal/security"
	"github.com/ogt11/certm3/mw_postgrest/pkg/metrics"
)

// Handler holds the dependencies for the handlers, now using the new API client.
type Handler struct {
	logger         *logging.Logger
	metrics        *metrics.Metrics
	jwtManager     *security.JWTManager
	apiClient      *api.Client // Use the new PostgREST-aware client
	backendURL     string
	testMode       bool
	config         *config.Config
}

// NewHandler creates a new handler with the new API client.
func NewHandler(logger *logging.Logger, metrics *metrics.Metrics, jwtManager *security.JWTManager, apiClient *api.Client, backendURL string, testMode bool, config *config.Config) *Handler {
	return &Handler{
		logger:     logger,
		metrics:    metrics,
		jwtManager: jwtManager,
		apiClient:  apiClient,
		backendURL: backendURL, // Still useful for other potential direct calls
		testMode:   testMode,
		config:     config,
	}
}

// generateBackendJWT is a placeholder for the logic that creates a JWT for PostgREST.
// In a real implementation, it would take user info and generate a token with the 'web_user' role.
func (h *Handler) generateBackendJWT(username string) (string, error) {
	// This is a simplified placeholder.
	// A real implementation would use the jwtManager with the BackendJWTSecret.
	// For now, we'll assume no auth is needed for the backend for initial testing,
	// or we can use a pre-shared token if PostgREST is configured for it.
	// The key is that the apiClient needs a token set via SetAuthToken.

	// For demonstration, let's create a token with the required 'role' claim.
	claims := map[string]interface{}{
		"role": "web_user",
		"username": username,
		"exp": time.Now().Add(time.Minute * 5).Unix(),
	}

	// This should use a different secret than the one for the SPA.
	// We'll use the BackendJWTSecret from the config.
	token, err := h.jwtManager.GenerateTokenWithClaims(claims, h.config.AppServer.BackendJWTSecret)
	if err != nil {
		return "", err
	}

	return token, nil
}


// CheckUsername handles username availability check using the new PostgREST API.
func (h *Handler) CheckUsername(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]

	h.logger.WithFields(map[string]interface{}{"username": username}).Info("Checking username availability via PostgREST")

	// The new API client doesn't have a specific `CheckUsername` method.
	// We need to use a generic method or implement the logic here.
	// The logic is: query the /users view and if we get a result, it's taken.
	// For now, let's assume we will add a `UserExists` method to the client.
	// Let's placeholder that for now.
	// A GET to /users?username=eq.{username} will return a list.
	// If the list is not empty, the user exists.
	// This logic should probably be in the api client itself.
	// Let's assume we add a `GetUserByUsername` to the client.

	// For now, we simulate the call.
	// In a real implementation, we would do:
	// h.apiClient.SetAuthToken(...)
	// user, err := h.apiClient.GetUserByUsername(username)

	// Let's just write the intended logic directly here for now.
	// NOTE: This endpoint is unauthenticated. So we can't generate a JWT yet.
	// This means the 'anonymous' role in PostgREST must have SELECT permission on the username column of the users view.
	// Let's add that to a new migration file.

	// This handler is now a placeholder. The logic needs to be moved to use the new client.
	// For now, we will just return a dummy response.

	// TODO: Re-implement this handler fully once the client is integrated.
	h.logger.WithFields(map[string]interface{}{
		"username": username,
		"path":     r.URL.Path,
	}).Info("DEBUG: CheckUsername handler called (PostgREST version)")

	// A simple proxying logic for now, as the original spec suggested for this endpoint.
	// This shows how we can still do direct proxying if needed.
	backendURL := fmt.Sprintf("%s/users?username=eq.%s&select=id", h.backendURL, username)

	backendReq, err := http.NewRequest("GET", backendURL, nil)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// This endpoint is public, so no JWT is needed.
	// We rely on the 'anonymous' role in PostgREST.

	resp, err := http.DefaultClient.Do(backendReq)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var results []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// If the results array is empty, the username is available.
	available := len(results) == 0

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"available": available})
}

// --- Placeholder Handlers ---

func (h *Handler) InitiateRequest(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement using the new api.Client
	http.Error(w, "Not Implemented", http.StatusNotImplemented)
}

func (h *Handler) ValidateEmail(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement using the new api.Client
	http.Error(w, "Not Implemented", http.StatusNotImplemented)
}

func (h *Handler) SubmitCSR(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement using the new api.Client
	http.Error(w, "Not Implemented", http.StatusNotImplemented)
}

func (h *Handler) GetUserGroups(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement using the new api.Client
	vars := mux.Vars(r)
	username := vars["username"]

	// 1. Generate a JWT for the backend request.
	// This endpoint is for getting groups for a user, so it should be authenticated.
	// However, the original call was unauthenticated. Let's assume for now it's a public call.
	// In a real scenario, this would likely be a protected endpoint.
	backendToken, err := h.generateBackendJWT(username)
	if err != nil {
		h.logger.LogError(err, nil)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	h.apiClient.SetAuthToken(backendToken)

	// 2. Call the new client method
	groups, err := h.apiClient.GetUserGroups(username)
	if err != nil {
		h.logger.LogError(err, map[string]interface{}{"username": username})
		http.Error(w, "Failed to get user groups", http.StatusInternalServerError)
		return
	}

	// 3. Return the response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "ok"})
}

// RegisterRoutes registers all HTTP routes for the app.
func RegisterRoutes(r *mux.Router, h *Handler) {
	r.HandleFunc("/app/initiate-request", h.InitiateRequest).Methods("POST")
	r.HandleFunc("/app/validate-email", h.ValidateEmail).Methods("POST")
	r.HandleFunc("/app/submit-csr", h.SubmitCSR).Methods("POST")
	r.HandleFunc("/app/check-username/{username}", h.CheckUsername).Methods("GET")
	r.HandleFunc("/app/groups/{username}", h.GetUserGroups).Methods("GET")
	r.HandleFunc("/app/health", h.HealthCheck).Methods("GET")
}
