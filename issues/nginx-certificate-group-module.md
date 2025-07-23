# Nginx Certificate Group Extension Module

## **Problem**
Nginx can extract basic certificate information (CN, expiry, serial) but cannot parse custom extensions like group memberships (OID: 1.3.6.1.4.1.10049.6.5.1.1.1). This limits our ability to do sophisticated routing and access control based on certificate content.

## **Solution**
Develop a custom nginx C module that:
1. Extracts group extension from client certificates
2. Sets nginx variables for use in configuration
3. Provides access control based on group membership

## **Module Features**

### **Core Functionality**
- Parse X.509 certificate extensions
- Extract group OID: `1.3.6.1.4.1.10049.6.5.1.1.1`
- Set nginx variables: `$ssl_client_groups`, `$ssl_client_group_count`
- Validate certificate chain against our CA

### **Nginx Variables Set**
```nginx
# Group information
$ssl_client_groups          # Comma-separated list of groups
$ssl_client_group_count     # Number of groups
$ssl_client_primary_group   # First group (for simple access control)
$ssl_client_has_admin       # "1" if user has admin group, "0" otherwise
```

### **Configuration Example**
```nginx
# Load the module
load_module modules/ngx_http_certm3_module.so;

# Use in location blocks
location /admin/ {
    if ($ssl_client_has_admin != "1") {
        return 403;
    }
    # ... rest of config
}

location /api/ {
    # Pass groups to backend
    proxy_set_header X-Client-Groups $ssl_client_groups;
    # ... rest of config
}
```

## **Technical Implementation**

### **Module Structure**
```
ngx_http_certm3_module/
├── config                    # Module configuration
├── ngx_http_certm3_module.c  # Main module file
├── ngx_http_certm3_module.h  # Header file
├── cert_parser.c            # Certificate parsing logic
├── cert_parser.h            # Certificate parsing header
├── group_extractor.c        # Group extension extraction
├── group_extractor.h        # Group extraction header
└── Makefile                 # Build configuration
```

### **Key Functions**
```c
// Main module functions
static ngx_int_t ngx_http_certm3_init(ngx_conf_t *cf);
static ngx_int_t ngx_http_certm3_variable(ngx_http_request_t *r, ngx_http_variable_value_t *v, uintptr_t data);

// Certificate parsing
ngx_int_t parse_certificate_extensions(ngx_http_request_t *r);
ngx_int_t extract_group_extension(X509 *cert, ngx_array_t *groups);

// Variable handlers
static ngx_int_t ngx_http_certm3_groups_variable(ngx_http_request_t *r, ngx_http_variable_value_t *v, uintptr_t data);
static ngx_int_t ngx_http_certm3_group_count_variable(ngx_http_request_t *r, ngx_http_variable_value_t *v, uintptr_t data);
static ngx_int_t ngx_http_certm3_has_admin_variable(ngx_http_request_t *r, ngx_http_variable_value_t *v, uintptr_t data);
```

### **Dependencies**
- OpenSSL development libraries
- nginx development headers
- C compiler (GCC/Clang)

## **Build Process**

### **Module Build**
```bash
# Build the module
cd ngx_http_certm3_module
make

# Install to nginx modules directory
sudo cp objs/ngx_http_certm3_module.so /usr/share/nginx/modules/
```

### **Nginx Integration**
```bash
# Add to nginx.conf
load_module modules/ngx_http_certm3_module.so;

# Rebuild nginx if needed
./configure --add-dynamic-module=./ngx_http_certm3_module
make && sudo make install
```

## **Testing Strategy**

### **Unit Tests**
- Certificate parsing with known group extensions
- Variable extraction and formatting
- Error handling for malformed certificates

### **Integration Tests**
- Test with real CertM3 certificates
- Verify group extraction accuracy
- Performance testing under load

### **Test Certificates**
- Certificate with single group
- Certificate with multiple groups
- Certificate without group extension
- Expired certificate
- Invalid certificate

## **Performance Considerations**
- Cache parsed group information per request
- Minimize memory allocations
- Use efficient string handling
- Consider certificate caching for repeated requests

## **Security Considerations**
- Validate certificate chain properly
- Sanitize group names before setting variables
- Handle malformed certificates gracefully
- Log security-relevant events

## **Future Enhancements**
- Support for multiple group OIDs
- Certificate revocation checking
- Group-based rate limiting
- Audit logging of group access

## **Priority**
High - This is essential for v2.0 group-based access control features.

## **Estimated Effort**
- Module development: 2-3 weeks
- Testing and integration: 1 week
- Documentation and deployment: 1 week
- Total: 4-5 weeks

## **Success Criteria**
1. Module successfully extracts groups from CertM3 certificates
2. Nginx variables are set correctly and consistently
3. Access control works based on group membership
4. Performance impact is minimal (< 5ms per request)
5. Module is stable and handles edge cases gracefully 