package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Client represents a client for the PostgREST backend API.
type Client struct {
	baseURL    string
	httpClient *http.Client
	jwtToken   string // JWT for authenticating with the PostgREST backend
}

// NewClient creates a new API client.
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SetAuthToken sets the JWT to be used for subsequent requests.
func (c *Client) SetAuthToken(token string) {
	c.jwtToken = token
}

// Data structures with snake_case json tags to match PostgREST's output.

// RequestStatus represents the status of a certificate request.
type RequestStatus struct {
	Status     string    `json:"status"`
	IsExpired  bool      `json:"is_expired"` // Assuming this logic will be in the view/function
	ExpiryTime time.Time `json:"expiry_time"`  // Assuming this logic will be in the view/function
}

// Group represents a group in the system.
type Group struct {
	Name        string    `json:"name"`
	DisplayName string    `json:"display_name"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CertificateMetadata represents metadata for a certificate.
type CertificateMetadata struct {
	SerialNumber     string    `json:"serial_number"`
	CodeVersion      string    `json:"code_version"`
	Username         string    `json:"username"`
	UserID           string    `json:"user_id"`
	CommonName       string    `json:"common_name"`
	Email            string    `json:"email"`
	Fingerprint      string    `json:"fingerprint"`
	NotBefore        time.Time `json:"not_before"`
	NotAfter         time.Time `json:"not_after"`
	Status           string    `json:"status"`
	RevokedAt        time.Time `json:"revoked_at,omitempty"`
	RevocationReason string    `json:"revocation_reason,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	CreatedBy        string    `json:"created_by,omitempty"`
	UpdatedAt        time.Time `json:"updated_at"`
	UpdatedBy        string    `json:"updated_by,omitempty"`
}

// --- Rewritten API methods ---

// newAuthenticatedRequest creates a new HTTP request and adds the Authorization header.
func (c *Client) newAuthenticatedRequest(method, url string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	if c.jwtToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.jwtToken)
	}
	if method == "POST" || method == "PATCH" {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

// GetRequestStatus gets the status of a certificate request from PostgREST.
func (c *Client) GetRequestStatus(requestID string) (*RequestStatus, error) {
	// PostgREST syntax for filtering by a primary key
	endpoint := fmt.Sprintf("%s/requests?id=eq.%s", c.baseURL, url.QueryEscape(requestID))
	req, err := c.newAuthenticatedRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var statuses []RequestStatus
	if err := json.NewDecoder(resp.Body).Decode(&statuses); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	if len(statuses) == 0 {
		return nil, fmt.Errorf("request with ID %s not found", requestID)
	}

	return &statuses[0], nil
}

// GetUserGroups gets the groups for a user by calling the new database function.
func (c *Client) GetUserGroups(username string) ([]string, error) {
	// Call the RPC endpoint for the get_user_groups function
	endpoint := fmt.Sprintf("%s/rpc/get_user_groups", c.baseURL)
	payload := map[string]string{"p_username": username}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %v", err)
	}

	req, err := c.newAuthenticatedRequest("POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var groups []struct {
		GroupName string `json:"group_name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&groups); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	groupNames := make([]string, len(groups))
	for i, g := range groups {
		groupNames[i] = g.GroupName
	}

	return groupNames, nil
}

// StoreCertificateMetadata stores certificate metadata in the API via PostgREST.
func (c *Client) StoreCertificateMetadata(metadata *CertificateMetadata) error {
	// POST to the /certificates view
	endpoint := fmt.Sprintf("%s/certificates", c.baseURL)
	body, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %v", err)
	}

	req, err := c.newAuthenticatedRequest("POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// PostgREST returns 201 Created on success
	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error: %s - %s", resp.Status, string(respBody))
	}

	return nil
}
