#!/bin/bash

# Configuration
BASE_URL="https://urp.ogt11.com"
CURL_OPTS="-s"
CURL_STATUS_OPTS="-s -o /dev/null -w '%{http_code}'"

# Test function for status codes
test_endpoint() {
    local method=$1
    local path=$2
    local expected_code=$3
    local description=$4
    local auth_header=$5
    
    echo "Testing $description..."
    echo "  $method $BASE_URL$path"
    
    local response_code
    if [ "$method" = "POST" ]; then
        if [ -n "$auth_header" ]; then
            response_code=$(curl $CURL_STATUS_OPTS -X POST -H "$auth_header" "$BASE_URL$path")
    else
            response_code=$(curl $CURL_STATUS_OPTS -X POST "$BASE_URL$path")
        fi
    else
        if [ -n "$auth_header" ]; then
            response_code=$(curl $CURL_STATUS_OPTS -H "$auth_header" "$BASE_URL$path")
        else
            response_code=$(curl $CURL_STATUS_OPTS "$BASE_URL$path")
        fi
    fi
    
    # Remove any quotes from the response code
    response_code=$(echo $response_code | tr -d "'")
    
    if [ "$response_code" = "$expected_code" ]; then
        echo "  ✓ Success: Got expected status code $response_code"
    else
        echo "  ✗ Failed: Got $response_code (expected $expected_code)"
    fi
    echo
}

# Test function for content
test_content() {
    local path=$1
    local expected_content=$2
    local description=$3
    
    echo "Testing $description content..."
    echo "  GET $BASE_URL$path"
    
    local response
    response=$(curl $CURL_OPTS "$BASE_URL$path")
    
    if echo "$response" | grep -q "$expected_content"; then
        echo "  ✓ Success: Found expected content"
    else
        echo "  ✗ Failed: Expected content not found"
        echo "  Expected to find: $expected_content"
    fi
    echo
}

# Test User Request Service
echo "Testing User Request Service..."
test_endpoint "GET" "/request/" "200" "Home page"
test_content "/request/" "Certificate Request Service" "Home page"

# Test API Endpoints
echo "Testing API Endpoints..."
# Note: These endpoints require authentication
test_endpoint "GET" "/api/users/check-username/test" "401" "User admin API (unauthorized)"
test_endpoint "POST" "/api/certificates/sign" "401" "CSR signing API (unauthorized)"

# Test Check Username Endpoint (should be accessible without authentication)
echo "Testing Check Username Endpoint..."
test_endpoint "GET" "/request/check-username/testuser" "200" "Check username (unauthenticated)"
test_endpoint "GET" "/request/check-username/invalid@user" "400" "Check username with invalid format"
test_content "/request/check-username/testuser" "available" "Check username response format"

# Test Static Files
echo "Testing Static Files..."
test_endpoint "GET" "/request/css/styles.css" "200" "CSS file"

echo "Test complete!" 
