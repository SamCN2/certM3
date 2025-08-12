package security

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the claims in a JWT token for the SPA.
type JWTClaims struct {
	UserID    string `json:"user_id"`
	RequestID string `json:"request_id"`
	Username  string `json:"username"`
	jwt.RegisteredClaims
}

// JWTManager handles JWT operations.
type JWTManager struct {
	secret   []byte
	issuer   string
	audience string
}

// NewJWTManager creates a new JWT manager.
func NewJWTManager(secret, issuer, audience string) *JWTManager {
	return &JWTManager{
		secret:   []byte(secret),
		issuer:   issuer,
		audience: audience,
	}
}

// GenerateToken generates a new JWT token for the SPA.
func (m *JWTManager) GenerateToken(userID, requestID, username string) (string, error) {
	claims := JWTClaims{
		UserID:    userID,
		RequestID: requestID,
		Username:  username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    m.issuer,
			Audience:  []string{m.audience},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

// GenerateTokenWithClaims generates a new JWT token with a custom set of claims and secret.
// This is used to generate tokens for the PostgREST backend.
func (m *JWTManager) GenerateTokenWithClaims(claims map[string]interface{}, secret string) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)
	token.Claims = jwt.MapClaims(claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken validates a JWT token from the SPA.
func (m *JWTManager) ValidateToken(tokenString string) (*JWTClaims, error) {
	// Parse token with claims
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("token validation failed: %v", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Get claims
	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Validate issuer
	if claims.Issuer != m.issuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", m.issuer, claims.Issuer)
	}

	// Validate audience
	if len(claims.Audience) == 0 || claims.Audience[0] != m.audience {
		return nil, fmt.Errorf("invalid audience: expected %s, got %v", m.audience, claims.Audience)
	}

	// Validate required claims
	if claims.UserID == "" {
		return nil, fmt.Errorf("missing user_id claim")
	}
	if claims.RequestID == "" {
		return nil, fmt.Errorf("missing request_id claim")
	}

	return claims, nil
}

// MTLSClient creates an HTTP client configured for mTLS.
func MTLSClient(certPath, keyPath, caPath string) (*http.Client, error) {
	// Load client certificate
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load client certificate: %v", err)
	}

	// Load CA certificate
	caCert, err := ioutil.ReadFile(caPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load CA certificate: %v", err)
	}

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to append CA certificate")
	}

	// Configure TLS
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caCertPool,
		MinVersion:   tls.VersionTLS12,
	}

	// Create HTTP client
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: time.Minute, // 1 minute timeout
	}

	return client, nil
}
