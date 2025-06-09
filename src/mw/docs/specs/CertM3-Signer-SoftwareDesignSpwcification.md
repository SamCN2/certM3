Go CSR Signing Service Specification

Version: 1.0
Date: May 31, 2025

1. Overview

This document specifies a Go application that functions as a dedicated Certificate Signing Request (CSR) signing service. It listens on a local UNIX domain socket, receives CSR data and validated metadata via JSON, signs certificates using a local CA, and returns the signed certificate or an error via JSON. The service emphasizes security, configurability, and clear logging.

2. Command-Line Interface (CLI)

The application shall support the following command-line flags:

    -c <filepath> (Required)
        Specifies the path to the configuration file.
        Example: csr-signer -c /etc/csr-signer/config.ini
    -t (Optional)
        Test configuration mode. The application will parse and validate the configuration file specified by -c, check CA path and file permissions, and then exit with status 0 on success or non-zero on failure. It will not attempt to load CA keys or start the listener.
        Example: csr-signer -c /etc/csr-signer/config.ini -t
    -T (Optional)
        Test API endpoint mode ("Stupid" API). The application will start and listen on the configured UNIX socket. Upon receiving a valid JSON request, it will parse the input, construct a representation of what a certificate would look like (including Subject, SANs, custom role extensions, etc., based on input and config), but will not perform any actual cryptographic signing or use the CA private key. It will return a JSON response indicating test mode and the proposed certificate data. This mode is for testing integration with the middleware.
        Example: csr-signer -c /etc/csr-signer/config.ini -T

3. Configuration File

The configuration file (specified by -c) shall be a plain text file with attribute = value pairs, one per line. Lines starting with # or ; shall be treated as comments and ignored. Whitespace around = should be ignored.

Required Configuration Attributes:

    SocketPath = /path/to/signer.sock
        Filesystem path for the UNIX domain socket the service will listen on.
    CAPath = /etc/csr-signer/ca
        Path to the directory containing the CA's certificate (ca-cert.pem) and private key (ca-key.pem).
    PrivateKeyPasswordEnvVar = SIGNER_CA_KEY_PASSWORD
        Name of the environment variable from which to read the passphrase for decrypting ca-key.pem. If the variable is not set or is empty, the key is assumed to be unencrypted.
    SubjectOU = "Service Operations"
        Organizational Unit (OU) to be included in the Subject Distinguished Name (DN) of issued certificates.
    SubjectO = "My Organization"
        Organization (O) to be included in the Subject DN.
    SubjectL = "My City"
        Locality (L) to be included in the Subject DN.
    SubjectST = "My State"
        State/Province (ST) to be included in the Subject DN.
    SubjectC = "US"
        Country (C) to be included in the Subject DN (2-letter ISO code).
    DefaultCertificateValidityDays = 365
        Integer representing the default lifespan of issued certificates in days.
    CRLDistributionPointURL = http://crl.example.com/ca.crl
        URL to be embedded in the CRL Distribution Points extension.
    AIAIssuerURL = http://certs.example.com/ca.crt
        URL for the Authority Information Access (AIA) caIssuers extension (points to the CA certificate).
    RoleExtensionOID = 1.3.6.1.4.1.YOUR_PEN.1.1
        The Object Identifier (OID) string for the custom extension used to store roles/groups. The value of this extension will be an ASN.1 SEQUENCE OF UTF8String.
    KeyUsage = digitalSignature,keyEncipherment
        Comma-separated list of key usages. Valid values: digitalSignature, contentCommitment, keyEncipherment, dataEncipherment, keyAgreement, keyCertSign, crlSign, encipherOnly, decipherOnly. For client certs, digitalSignature is typical.
    ExtendedKeyUsage = clientAuth,emailProtection
        Comma-separated list of extended key usages. Can be OIDs or common names like any, serverAuth, clientAuth, codeSigning, emailProtection, timeStamping, OCSPSigning.

4. Core Functionality

4.1. Startup & Initialization
1.  Parse command-line flags.
2.  Load and parse the configuration file specified by -c.
3.  If -t (Test Config Mode):
* Validate syntax of the config file.
* Verify existence and readability of CAPath, CAPath/ca-cert.pem.
* Verify SocketPath directory writability (for socket creation).
* Log results to stderr and exit (0 for success, non-zero for failure).
4.  Load CA:
* Load ca-cert.pem from CAPath.
* Security Check: Verify the loaded CA certificate:
* BasicConstraints.IsCA must be true.
* KeyUsage must include x509.KeyUsageCertSign.
* If checks fail, log critical error to syslog (AUTHPRIV facility), stderr, and exit.
* Load ca-key.pem from CAPath. If PrivateKeyPasswordEnvVar is set and non-empty, attempt to decrypt the private key using the password from the specified environment variable. If decryption fails, log critical error and exit.
5.  Setup UNIX Domain Socket Listener:
* Remove any existing file at SocketPath.
* Call net.Listen("unix", SocketPath).
* Set appropriate file permissions on the socket file (e.g., 0660) to allow access only by the application's user and designated group (shared with middleware).
* If listener setup fails, log critical error and exit.
6.  Log successful startup and readiness to accept connections.

4.2. Request Handling
1.  For each accepted connection on the UNIX socket, a new goroutine shall be spawned to handle the request.
2.  Read the incoming data from the connection (expected to be a single JSON object per connection).
3.  Deserialize the JSON input. Validate required fields (csr_pem, subject_common_name, validated_email, authorized_roles).
4.  If -T (Test API Endpoint Mode):
* Parse the CSR PEM to extract public key and subject info (do not verify CSR signature in this mode).
* Construct a textual representation of the certificate data that would be generated:
* Proposed Subject DN (using input CN and config O, OU, etc.).
* Proposed SANs (using input email).
* Proposed custom role extension data (using input roles and config OID).
* Proposed issuer (from loaded CA cert subject).
* Proposed validity period.
* Do not perform cryptographic signing.
* Return a JSON response (see Section 6.3) indicating test mode and this proposed data.
5.  If Normal Operation Mode:
* CSR Processing:
* Decode the csr_pem.
* Parse the x509.CertificateRequest.
* Verify the CSR's signature using the public key within the CSR. If invalid, return a JSON error.
* Serial Number: Generate a cryptographically secure unique positive integer for the serial number.
* Validity Period: Calculate NotBefore (current time) and NotAfter (current time + DefaultCertificateValidityDays).
* Subject DN Construction:
* CommonName from input.subject_common_name.
* OrganizationalUnit, Organization, Locality, StateOrProvince, Country from corresponding config file values.
* Extensions Construction:
* BasicConstraints: IsCA: false, PathLen: -1 (explicitly no path len). Critical: true.
* KeyUsage: Parsed from config.KeyUsage. Critical: true.
* ExtKeyUsage: Parsed from config.ExtendedKeyUsage.
* SubjectKeyIdentifier: Derived from the subject's public key (from CSR).
* AuthorityKeyIdentifier: Derived from the CA certificate's public key.
* SubjectAlternativeName: RFC822Name using input.validated_email.
* CRLDistributionPoints: Using config.CRLDistributionPointURL.
* AuthorityInformationAccess: AuthorityAccessDescription with AccessMethod: id-ad-caIssuers and Location: GeneralName{Tag: 6, Value: config.AIAIssuerURL}.
* Custom Role Extension:
* OID: config.RoleExtensionOID.
* Value: ASN.1 DER-encoded SEQUENCE OF UTF8String of input.authorized_roles.
* Critical: false (typically).
* Certificate Template: Create an x509.Certificate template struct populating all above fields, including the Public Key from the CSR.
* Signing: Call x509.CreateCertificate using the template, the loaded CA certificate, the subject's public key (from CSR), and the loaded CA private key.
* Encoding: PEM-encode the resulting signed certificate bytes.
* Return a JSON success response containing the PEM certificate and metadata (see Section 6.1).
6.  If any step fails (e.g., ASN.1 encoding, signing error), return a JSON error response (see Section 6.2).
7.  Close the connection.

5. Input JSON Structure (from Middleware)
JSON

{
  "csr_pem": "PEM-encoded CSR string",
  "subject_common_name": "User's Display Name",
  "validated_email": "user.validated@example.com",
  "authorized_roles": ["roleA", "groupB"]
}

6. Output JSON Structure (to Middleware)

6.1. Success Response (Normal Mode)
JSON

{
  "certificate_pem": "PEM-encoded signed certificate string",
  "serial_number": "hexadecimal string of the serial number",
  "not_before": "RFC3339 timestamp string (UTC)",
  "not_after": "RFC3339 timestamp string (UTC)"
}

6.2. Error Response (Normal or Test Mode)
JSON

{
  "error": "Descriptive error message string"
}

6.3. Success Response (-T Test API Endpoint Mode)
JSON

{
  "mode": "test_simulated_certificate",
  "input_csr_subject": "Actual Subject from input CSR if parsable",
  "proposed_certificate_subject_dn": "CN=User...,OU=Service Ops,...",
  "proposed_certificate_sans": {"rfc822_name": "user.validated@example.com"},
  "proposed_certificate_roles": {
    "oid": "configured.role.oid",
    "values": ["roleA", "groupB"]
  },
  "proposed_issuer_dn": "DN of the CA cert from config",
  "proposed_validity_not_before": "RFC3339 timestamp string (UTC)",
  "proposed_validity_not_after": "RFC3339 timestamp string (UTC)",
  "message": "THIS IS NOT A VALID SIGNED CERTIFICATE. TEST MODE OPERATION ONLY."
}

7. Logging

    The application shall log to stderr and syslog (or journald equivalent).
    The syslog facility LOG_AUTHPRIV should be used for sensitive operations like CA key loading failures, permission issues, and successful/failed signing events. General operational messages can use LOG_DAEMON or LOG_LOCAL0.
    Log Levels: INFO, WARNING, ERROR, CRITICAL/FATAL.
    Key Log Events:
        Application start/stop.
        Configuration loading (success, errors).
        CA certificate/key loading (success, errors, passphrase status).
        Listener setup (success, errors).
        New connection accepted (with remote peer info if available from UNIX socket).
        JSON request parsing (success, errors, basic summary of request).
        CSR parsing and validation (success, errors).
        Certificate signing success (include Subject CN and new Serial Number).
        Certificate signing failure (include reason).
        -T mode request handling.

8. Security Considerations

    The ca-key.pem file and the configuration file (if it were to contain sensitive data) must have highly restrictive file permissions.
    The PrivateKeyPasswordEnvVar method is preferred over a plaintext password in the config file for decrypting the CA private key. The environment variable should be set securely for the service's runtime environment.
    The UNIX domain socket (SocketPath) file permissions must be set to restrict access to only the user/group the middleware runs as.
    The application must not expose the CA private key material outside its own process.
    Input validation must be strict for all fields in the JSON request.
    The application code should be reviewed for common Go security pitfalls.

9. Error Handling

    Operational errors (bad input, crypto failures) result in a JSON error response to the client (middleware).
    Fatal errors (config issues, CA load failure, listener failure) result in termination of the application with appropriate logs.

