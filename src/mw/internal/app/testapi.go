package app

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	cryptorand "crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"time"

	"github.com/ogt11/certm3/mw/internal/logging"
)

// TestAPIRequest represents the request body for initiating a test API request
type TestAPIRequest struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

// TestAPIResponse represents the response from initiating a test API request
type TestAPIResponse struct {
	RequestID string `json:"requestId"`
}

// CSRRequest represents the request body for submitting a CSR
type CSRRequest struct {
	RequestID string `json:"requestId"`
	CSR       string `json:"csr"`
}

// CertificateResponse represents the response from submitting a CSR
type CertificateResponse struct {
	Certificate string `json:"certificate"`
}

// RunTestAPI runs the test API flow
func RunTestAPI(h *Handler, log *logging.Logger) error {
	log.Info("Starting test API flow")

	// Generate random username
	username := fmt.Sprintf("testuser%d", time.Now().UnixNano())
	log.WithFields(map[string]interface{}{
		"username": username,
	}).Info("Generated test username")

	// Step 1: Initiate request
	initiateReq := struct {
		Email       string `json:"email"`
		Username    string `json:"username"`
		DisplayName string `json:"displayName"`
	}{
		Email:       fmt.Sprintf("test%s@example.com", username),
		Username:    username,
		DisplayName: "Test User",
	}

	// Create request body
	reqBody, err := json.Marshal(initiateReq)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %v", err)
	}

	// Create request and response recorder
	req := httptest.NewRequest("POST", "/app/initiate-request", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	// Call handler directly
	h.InitiateRequest(w, req)

	// Check response
	if w.Code != http.StatusOK {
		return fmt.Errorf("initiate request failed with status %d: %s", w.Code, w.Body.String())
	}

	// Parse response
	var initiateResp struct {
		ID        string `json:"id"`
		Challenge string `json:"challenge"`
	}
	if err := json.NewDecoder(w.Body).Decode(&initiateResp); err != nil {
		return fmt.Errorf("failed to decode response: %v", err)
	}

	log.WithFields(map[string]interface{}{
		"request_id": initiateResp.ID,
		"challenge":  initiateResp.Challenge,
	}).Info("Initiate response")

	// Add a small delay to allow the backend to create the file
	time.Sleep(2 * time.Second)

	// Find the most recent test email for the username
	emailDir := "/var/spool/certM3/test-emails/"
	pattern := fmt.Sprintf("*-%s-validation.txt", username)

	// Try multiple times to find the email file
	maxAttempts := 5
	var matches []string
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		log.WithFields(map[string]interface{}{
			"attempt": attempt,
			"max":     maxAttempts,
			"dir":     emailDir,
			"pattern": pattern,
		}).Info("Looking for validation email")

		// Log directory contents
		files, err := os.ReadDir(emailDir)
		if err != nil {
			log.WithError(err).Error("Failed to read email directory")
			return fmt.Errorf("failed to read email directory: %v", err)
		}

		log.Info("Directory contents:")
		for _, file := range files {
			log.Info("  " + file.Name())
		}

		// Use filepath.Glob to find matching files
		matches, err = filepath.Glob(filepath.Join(emailDir, pattern))
		if err != nil {
			return fmt.Errorf("error searching for test email: %v", err)
		}

		if len(matches) > 0 {
			log.Info("Found matching files:")
			for _, match := range matches {
				log.Info("  " + match)
			}
			break
		}

		if attempt < maxAttempts {
			log.Info("Email file not found, waiting before retry...")
			time.Sleep(2 * time.Second)
			continue
		}

		// On last attempt, try to find any files that might match partially
		allFiles, err := filepath.Glob(filepath.Join(emailDir, "*"))
		if err != nil {
			return fmt.Errorf("error searching for any files: %v", err)
		}
		log.Info("No exact matches found. All files in directory:")
		for _, file := range allFiles {
			log.Info("  " + file)
		}
		return fmt.Errorf("no test email found for username %s in directory %s after %d attempts", username, emailDir, maxAttempts)
	}

	// Find the most recent file
	latestFile := matches[0]
	latestMod := time.Time{}
	for _, file := range matches {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}
		if info.ModTime().After(latestMod) {
			latestMod = info.ModTime()
			latestFile = file
		}
	}

	log.WithFields(map[string]interface{}{
		"file": latestFile,
	}).Info("Using most recent file")

	// Read the email file
	emailContent, err := os.ReadFile(latestFile)
	if err != nil {
		return fmt.Errorf("failed to read test email: %v", err)
	}

	log.WithFields(map[string]interface{}{
		"content": string(emailContent),
	}).Info("Email content")

	// Extract the challenge code using regex
	challengeRe := regexp.MustCompile(`challenge-[a-f0-9-]+`)
	challengeToken := ""
	if match := challengeRe.FindString(string(emailContent)); match != "" {
		challengeToken = match
	} else {
		return fmt.Errorf("challenge code not found in test email")
	}

	log.WithFields(map[string]interface{}{
		"token": challengeToken,
	}).Info("Extracted challenge token")

	// Step 2: Validate email
	validateReq := struct {
		RequestID      string `json:"requestId"`
		ChallengeToken string `json:"challengeToken"`
	}{
		RequestID:      initiateResp.ID,
		ChallengeToken: challengeToken,
	}

	// Create request body
	reqBody, err = json.Marshal(validateReq)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %v", err)
	}

	// Create request and response recorder
	req = httptest.NewRequest("POST", "/app/validate-email", bytes.NewBuffer(reqBody))
	w = httptest.NewRecorder()

	// Call handler directly
	h.ValidateEmail(w, req)

	// Check response
	if w.Code != http.StatusOK {
		return fmt.Errorf("validate email failed with status %d: %s", w.Code, w.Body.String())
	}

	// Parse response
	var validateResp struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(w.Body).Decode(&validateResp); err != nil {
		return fmt.Errorf("failed to decode response: %v", err)
	}

	log.WithFields(map[string]interface{}{
		"token": validateResp.Token,
	}).Info("Validate response")

	// Step 3: Submit CSR
	// Generate CSR
	csr, err := generateCSR(username)
	if err != nil {
		return fmt.Errorf("failed to generate CSR: %v", err)
	}

	// Create request body for signer
	reqBody, err = json.Marshal(struct {
		CSR string `json:"csr"`
	}{
		CSR: csr,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal request: %v", err)
	}

	// Create Unix domain socket connection to signer
	conn, err := net.Dial("unix", "/var/run/certM3/mw/signer.sock")
	if err != nil {
		return fmt.Errorf("failed to connect to signer: %v", err)
	}
	defer conn.Close()

	// Send request to signer
	start := time.Now()
	if err := json.NewEncoder(conn).Encode(reqBody); err != nil {
		h.metrics.RecordSignerRequest("error", time.Since(start), err)
		return fmt.Errorf("failed to send request to signer: %v", err)
	}

	// Read response from signer
	var signerResp struct {
		Certificate string `json:"certificate"`
		Error       string `json:"error,omitempty"`
	}
	if err := json.NewDecoder(conn).Decode(&signerResp); err != nil {
		h.metrics.RecordSignerRequest("error", time.Since(start), err)
		return fmt.Errorf("failed to read response from signer: %v", err)
	}

	// Check for signer error
	if signerResp.Error != "" {
		h.metrics.RecordSignerRequest("error", time.Since(start), fmt.Errorf(signerResp.Error))
		return fmt.Errorf("signer error: %s", signerResp.Error)
	}

	// Record successful signer request
	h.metrics.RecordSignerRequest("success", time.Since(start), nil)

	log.WithFields(map[string]interface{}{
		"certificate": signerResp.Certificate,
	}).Info("Submit CSR response")

	return nil
}

// generateCSR generates a CSR based on the provided userId
func generateCSR(userId string) (string, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), cryptorand.Reader)
	if err != nil {
		return "", fmt.Errorf("failed to generate private key: %v", err)
	}

	csrTemplate := x509.CertificateRequest{
		Subject: pkix.Name{
			CommonName:         userId,
			Organization:       []string{"ogt11.com"},
			OrganizationalUnit: []string{"CertM3"},
			Locality:           []string{"City"},
			Province:           []string{"State"},
			Country:            []string{"US"},
		},
		SignatureAlgorithm: x509.ECDSAWithSHA256,
		ExtraExtensions: []pkix.Extension{
			{
				Id:       asn1.ObjectIdentifier{1, 3, 6, 1, 4, 1, 10049, 1}, // Groups extension
				Critical: false,
				Value:    []byte(`{"groups":["test-group"]}`),
			},
			{
				Id:       asn1.ObjectIdentifier{1, 3, 6, 1, 4, 1, 10049, 2}, // Username extension
				Critical: false,
				Value:    []byte(userId),
			},
		},
	}

	csrBytes, err := x509.CreateCertificateRequest(cryptorand.Reader, &csrTemplate, privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to create CSR: %v", err)
	}

	csrPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE REQUEST",
		Bytes: csrBytes,
	})

	return string(csrPEM), nil
}
