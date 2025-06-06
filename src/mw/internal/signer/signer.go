package signer

import (
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/pem"
	"fmt"
	"math/big"
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
	config      *config.Config
	logger      *logging.Logger
	metrics     *metrics.Metrics
	caCert      *x509.Certificate
	caKey       interface{}
	groupOID    asn1.ObjectIdentifier
	usernameOID asn1.ObjectIdentifier
}

func New(cfg *config.Config, logger *logging.Logger, metrics *metrics.Metrics, caCert *x509.Certificate, caKey interface{}, groupOID, usernameOID string) *Signer {
	// Parse OIDs
	groupOIDParsed, err := parseOID(groupOID)
	if err != nil {
		logger.Fatal("invalid group OID: %v", err)
	}

	usernameOIDParsed, err := parseOID(usernameOID)
	if err != nil {
		logger.Fatal("invalid username OID: %v", err)
	}

	return &Signer{
		config:      cfg,
		logger:      logger,
		metrics:     metrics,
		caCert:      caCert,
		caKey:       caKey,
		groupOID:    groupOIDParsed,
		usernameOID: usernameOIDParsed,
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

	return csr, nil
}

// SignCSR signs a certificate signing request
func (s *Signer) SignCSR(csrPEM []byte) ([]byte, error) {
	// Parse the CSR using our flexible parser
	csr, err := s.parseCSR(string(csrPEM))
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSR: %v", err)
	}

	// Verify the CSR signature
	if err := csr.CheckSignature(); err != nil {
		return nil, fmt.Errorf("invalid CSR signature: %v", err)
	}

	// Generate a random serial number
	serialNumber, err := generateSerialNumber()
	if err != nil {
		return nil, fmt.Errorf("failed to generate serial number: %v", err)
	}

	// Create certificate template
	template := &x509.Certificate{
		SerialNumber:          serialNumber,
		Subject:               csr.Subject,
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(365 * 24 * time.Hour), // 1 year validity
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		BasicConstraintsValid: true,
		DNSNames:              csr.DNSNames,
		EmailAddresses:        csr.EmailAddresses,
		IPAddresses:           csr.IPAddresses,
		URIs:                  csr.URIs,
		Extensions:            csr.Extensions, // Preserve extensions from CSR
	}

	// Create the certificate
	certDER, err := x509.CreateCertificate(nil, template, s.caCert, csr.PublicKey, s.caKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create certificate: %v", err)
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

// ... existing code ...
