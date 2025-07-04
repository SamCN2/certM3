package signer

import (
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ogt11/certm3/mw/internal/config"
	"github.com/ogt11/certm3/mw/internal/logging"
	"github.com/ogt11/certm3/mw/pkg/metrics"
)

// OIDs for public key algorithms
var (
	oidPublicKeyRSA     = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 1}
	oidPublicKeyECDSA   = asn1.ObjectIdentifier{1, 2, 840, 10045, 2, 1}
	oidExtensionRequest = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 9, 14}
)

// OIDs for name attributes
var (
	oidCommonName         = asn1.ObjectIdentifier{2, 5, 4, 3}
	oidCountry            = asn1.ObjectIdentifier{2, 5, 4, 6}
	oidOrganization       = asn1.ObjectIdentifier{2, 5, 4, 10}
	oidOrganizationalUnit = asn1.ObjectIdentifier{2, 5, 4, 11}
	oidLocality           = asn1.ObjectIdentifier{2, 5, 4, 7}
	oidProvince           = asn1.ObjectIdentifier{2, 5, 4, 8}
	oidStreetAddress      = asn1.ObjectIdentifier{2, 5, 4, 9}
	oidPostalCode         = asn1.ObjectIdentifier{2, 5, 4, 17}
)

// GroupOID is the base OID for group information
var GroupOID asn1.ObjectIdentifier

// UsernameOID is the OID for username information
var UsernameOID asn1.ObjectIdentifier

// Signer represents a certificate signer
type Signer struct {
	config   *config.Config
	logger   *logging.Logger
	metrics  *metrics.Metrics
	caCert   *x509.Certificate
	caKey    interface{}
	groupOID asn1.ObjectIdentifier
}

func New(cfg *config.Config, logger *logging.Logger, metrics *metrics.Metrics, caCert *x509.Certificate, caKey interface{}, groupOID string) *Signer {
	// Parse OID
	groupOIDParsed, err := parseOID(groupOID)
	if err != nil {
		logger.Fatal("invalid group OID: %v", err)
	}

	return &Signer{
		config:   cfg,
		logger:   logger,
		metrics:  metrics,
		caCert:   caCert,
		caKey:    caKey,
		groupOID: groupOIDParsed,
	}
}

// parseOID parses a string OID into an ObjectIdentifier
func parseOID(oid string) (asn1.ObjectIdentifier, error) {
	var result asn1.ObjectIdentifier
	parts := strings.Split(oid, ".")
	for _, part := range parts {
		num, err := strconv.Atoi(part)
		if err != nil {
			return nil, fmt.Errorf("invalid OID component '%s': %v", part, err)
		}
		result = append(result, num)
	}
	if len(result) == 0 {
		return nil, fmt.Errorf("empty OID")
	}
	return result, nil
}

// pkcs10 represents a PKCS#10 certificate request
type pkcs10 struct {
	CertificationRequestInfo struct {
		Version              int
		Subject              asn1.RawValue
		SubjectPublicKeyInfo struct {
			Algorithm        pkix.AlgorithmIdentifier
			SubjectPublicKey asn1.BitString
			FullBytes        []byte `asn1:"optional"`
		}
		Attributes []struct {
			Type      asn1.ObjectIdentifier
			Value     asn1.RawValue
			FullBytes []byte `asn1:"optional"`
		} `asn1:"tag:0,optional,set"`
		FullBytes []byte `asn1:"optional"`
	}
	SignatureAlgorithm pkix.AlgorithmIdentifier
	SignatureValue     asn1.BitString
}

// parseName parses an ASN.1 Name structure into a pkix.Name
func parseName(raw asn1.RawValue, name *pkix.Name) error {
	var rdnSequence []asn1.RawValue
	if _, err := asn1.Unmarshal(raw.FullBytes, &rdnSequence); err != nil {
		return fmt.Errorf("failed to unmarshal RDN sequence: %v", err)
	}

	for _, rdn := range rdnSequence {
		var attrTypeAndValue struct {
			Type  asn1.ObjectIdentifier
			Value asn1.RawValue
		}
		if _, err := asn1.Unmarshal(rdn.FullBytes, &attrTypeAndValue); err != nil {
			return fmt.Errorf("failed to unmarshal attribute type and value: %v", err)
		}

		value, err := parseAttributeValue(attrTypeAndValue.Value)
		if err != nil {
			return fmt.Errorf("failed to parse attribute value: %v", err)
		}

		switch {
		case attrTypeAndValue.Type.Equal(oidCommonName):
			name.CommonName = value
		case attrTypeAndValue.Type.Equal(oidCountry):
			name.Country = append(name.Country, value)
		case attrTypeAndValue.Type.Equal(oidOrganization):
			name.Organization = append(name.Organization, value)
		case attrTypeAndValue.Type.Equal(oidOrganizationalUnit):
			name.OrganizationalUnit = append(name.OrganizationalUnit, value)
		case attrTypeAndValue.Type.Equal(oidLocality):
			name.Locality = append(name.Locality, value)
		case attrTypeAndValue.Type.Equal(oidProvince):
			name.Province = append(name.Province, value)
		case attrTypeAndValue.Type.Equal(oidStreetAddress):
			name.StreetAddress = append(name.StreetAddress, value)
		case attrTypeAndValue.Type.Equal(oidPostalCode):
			name.PostalCode = append(name.PostalCode, value)
		}
	}

	return nil
}

// parseAttributeValue parses an ASN.1 attribute value into a string
func parseAttributeValue(raw asn1.RawValue) (string, error) {
	switch raw.Tag {
	case asn1.TagUTF8String:
		var value string
		if _, err := asn1.Unmarshal(raw.FullBytes, &value); err != nil {
			return "", fmt.Errorf("failed to unmarshal UTF8String: %v", err)
		}
		return value, nil
	case asn1.TagPrintableString:
		var value string
		if _, err := asn1.Unmarshal(raw.FullBytes, &value); err != nil {
			return "", fmt.Errorf("failed to unmarshal PrintableString: %v", err)
		}
		return value, nil
	case asn1.TagIA5String:
		var value string
		if _, err := asn1.Unmarshal(raw.FullBytes, &value); err != nil {
			return "", fmt.Errorf("failed to unmarshal IA5String: %v", err)
		}
		return value, nil
	default:
		return "", fmt.Errorf("unsupported string type: %v", raw.Tag)
	}
}

// parseCSR parses a CSR in various formats
func (s *Signer) parseCSR(csrPEM string) (*x509.CertificateRequest, error) {
	// Decode PEM block
	block, _ := pem.Decode([]byte(csrPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	// Parse as standard x509 CSR
	csr, err := x509.ParseCertificateRequest(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSR: %v", err)
	}

	// Parse the raw CSR to extract extensions from attributes
	var pkcs10Req pkcs10
	if _, err := asn1.Unmarshal(block.Bytes, &pkcs10Req); err != nil {
		s.logger.Warn("Failed to parse CSR attributes, using standard extensions only: %v", err)
		return csr, nil
	}

	// Extract extensions from CSR attributes
	var extensions []pkix.Extension
	for _, attr := range pkcs10Req.CertificationRequestInfo.Attributes {
		if attr.Type.Equal(oidExtensionRequest) {
			s.logger.Info("Found extension request attribute, value tag: %v, length: %d", attr.Value.Tag, len(attr.Value.Bytes))
			s.logger.Info("Extension request attribute value bytes: %x", attr.Value.Bytes)

			// Try to parse as a raw ASN.1 structure first to understand the format
			var rawValue asn1.RawValue
			if _, err := asn1.Unmarshal(attr.Value.FullBytes, &rawValue); err != nil {
				s.logger.Warn("Failed to parse extension request attribute as raw value: %v", err)
				continue
			}
			s.logger.Info("Raw value tag: %v, length: %d, isCompound: %v", rawValue.Tag, len(rawValue.Bytes), rawValue.IsCompound)

			// The extension request attribute value is a SET containing SEQUENCE-wrapped extensions
			// Parse as a SET of SEQUENCE structures
			var extReqSet []asn1.RawValue
			if _, err := asn1.Unmarshal(rawValue.FullBytes, &extReqSet); err != nil {
				s.logger.Warn("Failed to parse extension request attribute SET: %v", err)
				continue
			}

			s.logger.Info("Successfully parsed extension request as SET with %d items", len(extReqSet))

			// Parse each extension in the SET
			for i, extRaw := range extReqSet {
				// Node-forge adds an extra SEQUENCE wrapper, so we need to parse it as a SEQUENCE first
				var extSeq asn1.RawValue
				if _, err := asn1.Unmarshal(extRaw.FullBytes, &extSeq); err != nil {
					s.logger.Warn("Failed to parse extension %d SEQUENCE wrapper: %v", i, err)
					continue
				}

				var ext pkix.Extension
				if _, err := asn1.Unmarshal(extSeq.FullBytes, &ext); err != nil {
					s.logger.Warn("Failed to parse extension %d: %v", i, err)
					continue
				}
				extensions = append(extensions, ext)
				s.logger.Info("Successfully parsed extension %d: %v", i, ext.Id)
			}
		}
	}

	// If we found extensions in attributes, add them to the CSR
	if len(extensions) > 0 {
		// Combine existing extensions with new ones
		allExtensions := make([]pkix.Extension, 0, len(csr.Extensions)+len(extensions))
		allExtensions = append(allExtensions, csr.Extensions...)
		allExtensions = append(allExtensions, extensions...)
		csr.Extensions = allExtensions

		s.logger.Info("Added %d extensions from CSR attributes", len(extensions))
	}

	return csr, nil
}

// SignCSR signs a certificate signing request with group validation
func (s *Signer) SignCSR(csrPEM []byte, requestedGroups []string) ([]byte, error) {
	// Parse the CSR using our flexible parser
	csr, err := s.parseCSR(string(csrPEM))
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSR: %v", err)
	}

	// Verify the CSR signature
	if err := csr.CheckSignature(); err != nil {
		return nil, fmt.Errorf("invalid CSR signature: %v", err)
	}

	// Extract username from CN
	username := ""
	for _, name := range csr.Subject.Names {
		if name.Type.Equal(oidCommonName) {
			if str, ok := name.Value.(string); ok {
				username = str
				break
			}
		}
	}
	if username == "" {
		return nil, fmt.Errorf("no CommonName found in CSR")
	}

	// Get user's actual groups from backend API
	actualGroups, err := s.getUserGroups(username)
	if err != nil {
		// Log the error but proceed with actualGroups as empty.
		// The intersection will be empty, but default groups (username, 'users') will still be added.
		s.logger.Error("Failed to get user groups from backend for user %s: %v. Proceeding with only default groups and any valid requested groups if backend check was intended to be non-critical for subset requests.", username, err)
		actualGroups = []string{} // Ensure actualGroups is empty if lookup fails, to prevent partial/stale data issues.
	}

	// Log the groups as requested by the client and as known by the backend
	s.logger.Info("User %s requested groups: %v", username, requestedGroups)
	s.logger.Info("User %s actual groups from backend: %v", username, actualGroups)

	// Intersect requestedGroups with actualGroups from the backend.
	// This gives the set of groups that the user both requested and is legitimately a member of.
	intersectedGroups := s.intersectGroups(requestedGroups, actualGroups)
	s.logger.Info("Intersection of requested and actual groups for %s: %v", username, intersectedGroups)

	// Use a set to ensure uniqueness and easily add default groups.
	finalAuthorizedGroupsSet := make(map[string]struct{})
	for _, group := range intersectedGroups {
		finalAuthorizedGroupsSet[group] = struct{}{}
	}

	// Ensure the user's own username and the "users" group are always included.
	// This is a policy decision. If these should *only* be included if requested AND valid,
	// then this addition step should be conditional or removed.
	// Current interpretation: these are mandatory baseline groups.
	finalAuthorizedGroupsSet[username] = struct{}{}
	finalAuthorizedGroupsSet["users"] = struct{}{}

	finalAuthorizedGroups := make([]string, 0, len(finalAuthorizedGroupsSet))
	for groupName := range finalAuthorizedGroupsSet {
		finalAuthorizedGroups = append(finalAuthorizedGroups, groupName)
	}

	s.logger.Info("Final authorized groups for user %s to be included in certificate: %v", username, finalAuthorizedGroups)

	// Generate a random serial number
	serialNumber, err := generateSerialNumber()
	if err != nil {
		return nil, fmt.Errorf("failed to generate serial number: %v", err)
	}

	// Create certificate template
	template := &x509.Certificate{
		SerialNumber:          serialNumber,
		Subject:               csr.Subject, // Preserved from CSR
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(time.Duration(s.config.Signer.CertValidityDays) * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment, // Consider making this configurable via s.config
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}, // Consider making this configurable via s.config
		BasicConstraintsValid: true,
		IsCA:                  false,

		// Fields from CSR
		DNSNames:       csr.DNSNames,
		EmailAddresses: csr.EmailAddresses,
		IPAddresses:    csr.IPAddresses,
		URIs:           csr.URIs,
		PublicKey:      csr.PublicKey, // This is critical! Must use PublicKey from CSR.

		// Extensions:
		// Start with an empty slice. Policy for preserving other CSR extensions can be added here if needed.
		Extensions: []pkix.Extension{},
	}

	// Add group extension using the finalAuthorizedGroups
	if len(finalAuthorizedGroups) > 0 {
		groupExt, errGroupExt := s.createGroupExtension(finalAuthorizedGroups)
		if errGroupExt != nil {
			return nil, fmt.Errorf("failed to create group extension: %v", errGroupExt)
		}
		template.Extensions = append(template.Extensions, groupExt)
	} else {
		s.logger.Warn("No authorized groups for user %s after intersection and addition of defaults; group extension will be omitted.", username)
	}

	s.logger.Info("Certificate template for user %s prepared with %d extensions.", username, len(template.Extensions))
	for i, ext := range template.Extensions {
		s.logger.Info("Template Extension %d for %s: OID=%v, Critical=%v, Value length=%d", i, username, ext.Id, ext.Critical, len(ext.Value))
	}

	// Create the certificate using CA cert & key, template, and crucially the CSR's Public Key
	certDER, err := x509.CreateCertificate(rand.Reader, template, s.caCert, csr.PublicKey, s.caKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create certificate for user %s: %v", username, err)
	}

	// For verification and logging, parse the created certificate
	createdCert, parseErr := x509.ParseCertificate(certDER)
	if parseErr != nil {
		s.logger.Error("Failed to parse the newly created certificate for verification logging (user %s): %v", username, parseErr)
	} else {
		s.logger.Info("Final created certificate for user %s has %d extensions.", username, len(createdCert.Extensions))
		for i, ext := range createdCert.Extensions {
			s.logger.Info("Final cert extension %d for %s: OID=%v, Critical=%v, Value length=%d, Value (hex): %x", i, username, ext.Id, ext.Critical, len(ext.Value), ext.Value)
		}
	}

	// Convert to PEM
	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certDER,
	})

	return certPEM, nil
}

// generateSerialNumber generates a random serial number for the certificate
func generateSerialNumber() (*big.Int, error) {
	// Generate a random 128-bit number
	serialBytes := make([]byte, 16)
	if _, err := rand.Read(serialBytes); err != nil {
		return nil, err
	}
	return new(big.Int).SetBytes(serialBytes), nil
}

// GetCACertificate returns the CA certificate in PEM format
func (s *Signer) GetCACertificate() ([]byte, error) {
	if s.caCert == nil {
		return nil, fmt.Errorf("CA certificate not initialized")
	}

	// Convert CA certificate to PEM
	caCertPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: s.caCert.Raw,
	})

	return caCertPEM, nil
}

// getUserGroups retrieves the user's groups from the backend API
func (s *Signer) getUserGroups(username string) ([]string, error) {
	// First, get the user info from backend
	userURL := fmt.Sprintf("%s/users/username/%s", s.config.AppServer.BackendAPIURL, username)
	userResp, err := http.Get(userURL)
	if err != nil {
		return nil, fmt.Errorf("failed to call backend API for user: %v", err)
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("backend API returned status %d for user lookup", userResp.StatusCode)
	}

	var userData struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&userData); err != nil {
		return nil, fmt.Errorf("failed to decode user response: %v", err)
	}

	// Now get the groups for this user
	groupsURL := fmt.Sprintf("%s/users/%s/groups", s.config.AppServer.BackendAPIURL, userData.ID)
	groupsResp, err := http.Get(groupsURL)
	if err != nil {
		return nil, fmt.Errorf("failed to call backend API for groups: %v", err)
	}
	defer groupsResp.Body.Close()

	if groupsResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("backend API returned status %d for groups lookup", groupsResp.StatusCode)
	}

	var groups []string
	if err := json.NewDecoder(groupsResp.Body).Decode(&groups); err != nil {
		return nil, fmt.Errorf("failed to decode groups response: %v", err)
	}

	return groups, nil
}

// intersectGroups returns the intersection of two string slices
func (s *Signer) intersectGroups(requested, actual []string) []string {
	actualSet := make(map[string]bool)
	for _, group := range actual {
		actualSet[group] = true
	}

	var intersection []string
	for _, group := range requested {
		if actualSet[group] {
			intersection = append(intersection, group)
		}
	}

	return intersection
}

// contains checks if a string slice contains a specific string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// createGroupExtension creates a group extension with the specified groups
func (s *Signer) createGroupExtension(groups []string) (pkix.Extension, error) {
	// Encode groups as ASN.1 SEQUENCE OF UTF8String
	// Use a simple slice of strings - Go will encode this as SEQUENCE OF UTF8String
	sequenceBytes, err := asn1.Marshal(groups)
	if err != nil {
		return pkix.Extension{}, fmt.Errorf("failed to marshal group sequence: %v", err)
	}

	s.logger.Info("Created group extension with OID %v and %d groups: %v", s.groupOID, len(groups), groups)

	return pkix.Extension{
		Id:       s.groupOID,
		Critical: false,
		Value:    sequenceBytes,
	}, nil
}
