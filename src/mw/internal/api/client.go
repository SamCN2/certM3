package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client represents an API client
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new API client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// RequestStatus represents the status of a certificate request
type RequestStatus struct {
	Status     string    `json:"status"`
	IsExpired  bool      `json:"isExpired"`
	ExpiryTime time.Time `json:"expiryTime"`
}

// Group represents a group in the system
type Group struct {
	Name        string    `json:"name"`
	DisplayName string    `json:"displayName"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CertificateMetadata represents metadata for a certificate
type CertificateMetadata struct {
	SerialNumber string    `json:"serialNumber"`
	CodeVersion  string    `json:"codeVersion"`
	Username     string    `json:"username"`
	UserID       string    `json:"userId"`
	CommonName   string    `json:"commonName"`
	Email        string    `json:"email"`
	Fingerprint  string    `json:"fingerprint"`
	NotBefore    time.Time `json:"notBefore"`
	NotAfter     time.Time `json:"notAfter"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	CreatedBy    string    `json:"createdBy"`
	UpdatedAt    time.Time `json:"updatedAt"`
	UpdatedBy    string    `json:"updatedBy"`
}

// GetRequestStatus gets the status of a certificate request
func (c *Client) GetRequestStatus(requestID string) (*RequestStatus, error) {
	url := fmt.Sprintf("%s/requests/%s", c.baseURL, requestID)
	req, err := http.NewRequest("GET", url, nil)
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

	var status RequestStatus
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &status, nil
}

// GetUserGroups gets the groups for a user
func (c *Client) GetUserGroups(username string) ([]string, error) {
	url := fmt.Sprintf("%s/users?filter[where][username]=%s", c.baseURL, username)
	req, err := http.NewRequest("GET", url, nil)
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

	var users []struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	if len(users) == 0 {
		return nil, fmt.Errorf("user not found")
	}

	// Get user's groups
	url = fmt.Sprintf("%s/users/%s/groups", c.baseURL, users[0].ID)
	req, err = http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	resp, err = c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var groups []Group
	if err := json.NewDecoder(resp.Body).Decode(&groups); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	groupNames := make([]string, len(groups))
	for i, group := range groups {
		groupNames[i] = group.Name
	}

	return groupNames, nil
}

// StoreCertificateMetadata stores certificate metadata in the API
func (c *Client) StoreCertificateMetadata(metadata *CertificateMetadata) error {
	url := fmt.Sprintf("%s/certificates", c.baseURL)
	body, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	return nil
}
