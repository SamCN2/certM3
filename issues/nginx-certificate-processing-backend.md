# Backend API for Certificate Processing and Routing

## **Problem**
Currently, nginx can only extract basic certificate information (CN, expiry) but cannot parse custom extensions like group memberships. This limits our ability to do sophisticated routing based on certificate content.

## **Proposed Solution**
Create a backend API service that:
1. Receives certificate data from nginx
2. Parses custom extensions (group OID: 1.3.6.1.4.1.10049.6.5.1.1.1)
3. Validates certificate against our CA
4. Returns routing decisions and user information

## **API Endpoints**

### **POST /api/certificate/validate**
**Input:**
```json
{
  "certificate": "base64-encoded-cert",
  "chain": "base64-encoded-chain",
  "verify_result": "SUCCESS|FAILED"
}
```

**Output:**
```json
{
  "valid": true,
  "username": "mango",
  "groups": ["users", "admins"],
  "expires_at": "2026-07-07T23:25:35Z",
  "routing": {
    "action": "redirect",
    "destination": "/certm3/dashboard.html",
    "reason": "valid_certificate"
  }
}
```

### **Routing Decisions**
- **No Certificate**: `{ "action": "redirect", "destination": "/certm3/index.html", "reason": "no_certificate" }`
- **Expired Certificate**: `{ "action": "redirect", "destination": "/certm3/renew.html", "reason": "expired_certificate" }`
- **Invalid Certificate**: `{ "action": "redirect", "destination": "/certm3/error.html", "reason": "invalid_certificate" }`
- **Valid Certificate**: `{ "action": "proceed", "destination": null, "reason": "valid_certificate" }`

## **Implementation Options**

### **Option 1: Go Service**
- Leverage existing Go codebase
- Use crypto/x509 for certificate parsing
- Fast and efficient

### **Option 2: Node.js Service**
- Leverage existing API infrastructure
- Use node-forge or similar for certificate parsing
- Easy integration with existing codebase

### **Option 3: Python Service**
- Use cryptography library
- Good for rapid prototyping
- Easy certificate parsing

## **Nginx Integration**
```nginx
# Extract certificate data
map $ssl_client_cert $cert_data {
    default "";
}

# Call backend API
location /api/certificate/validate {
    proxy_pass http://localhost:3004;
    proxy_set_header X-Certificate-Data $cert_data;
    proxy_set_header X-Verify-Result $ssl_client_verify;
}
```

## **Benefits**
1. **Separation of Concerns**: Nginx handles SSL, backend handles business logic
2. **Flexibility**: Easy to add new routing rules and certificate validation
3. **Maintainability**: Certificate parsing logic in one place
4. **Testability**: Can unit test certificate processing independently

## **Future Enhancements**
- Certificate renewal workflow
- Group-based access control
- Certificate revocation checking
- Audit logging

## **Priority**
Medium - This would be nice to have but not critical for v2.0 initial release. 