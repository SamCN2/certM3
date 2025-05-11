#!/bin/bash

# Test script for CertM3 web application
# This script tests the existence and basic functionality of app routes
# and their associated UI components.

# Base URL
BASE_URL="http://localhost:3001"

# Function to print a separator
print_separator() {
  echo "----------------------------------------"
}

# Test the root endpoint
echo "Testing root endpoint..."
RESPONSE=$(curl -s "${BASE_URL}/")
if echo "$RESPONSE" | grep -q "<!-- ROOT_TEST_1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p -->"; then
    echo "Root endpoint passed"
else
    echo "Root endpoint failed or comment not found"
fi
print_separator

# Test the /app endpoint
echo "Testing /app endpoint..."
RESPONSE=$(curl -s "${BASE_URL}/app")
if echo "$RESPONSE" | grep -q "<!-- APP_TEST_2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q -->"; then
    echo "/app endpoint passed"
else
    echo "/app endpoint failed or comment not found"
fi
print_separator

# Test the /app/request endpoint
echo "Testing /app/request endpoint..."
RESPONSE=$(curl -s "${BASE_URL}/app/request")
if echo "$RESPONSE" | grep -q "<!-- REQUEST_TEST_9d5g1b4c-3e6f-6g0h-1c4d-7e8f9g0h1b2c -->"; then
    echo "Request form test comment found"
    
    # Check for request form elements
    if echo "$RESPONSE" | grep -q "id=\"user-request-form\""; then
        echo "Request form found"
    else
        echo "Request form not found"
    fi
    
    # Check for required form fields
    if echo "$RESPONSE" | grep -q "name=\"username\"" && \
       echo "$RESPONSE" | grep -q "name=\"email\"" && \
       echo "$RESPONSE" | grep -q "name=\"displayName\""; then
        echo "Required form fields found"
    else
        echo "Required form fields not found"
    fi
    
    # Check for request.js
    if echo "$RESPONSE" | grep -q "src=\"/static/js/request.js\""; then
        echo "Request JavaScript found"
    else
        echo "Request JavaScript not found"
    fi
else
    echo "/app/request endpoint failed or comment not found"
fi
print_separator

echo "Tests completed." 