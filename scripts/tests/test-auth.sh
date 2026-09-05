#!/bin/bash

echo "=========================================="
echo "🧪 Authentication System Test Suite"
echo "=========================================="
echo ""

# Generate test JWT token
echo "1️⃣  Generating test JWT token..."
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); const token = jwt.sign({userId: '123', email: 'test@versoair.com', name: 'Test User', role: 'user'}, 'dev_secret_key_change_in_production', {expiresIn: '7d'}); console.log(token);" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to generate token"
  exit 1
fi

echo "✅ Token generated: ${TOKEN:0:30}..."
echo ""

# Test 1: /api/user without token
echo "2️⃣  Test: GET /api/user (without token)"
echo "Expected: 401 - No token provided"
RESPONSE=$(curl -s http://localhost:5003/api/user)
echo "Response: $RESPONSE"
echo ""

# Test 2: /api/user with invalid token
echo "3️⃣  Test: GET /api/user (with invalid token)"
echo "Expected: 401 - Invalid or expired token"
RESPONSE=$(curl -s http://localhost:5003/api/user -H "Authorization: Bearer invalid_token_xyz")
echo "Response: $RESPONSE"
echo ""

# Test 3: /api/user with valid token
echo "4️⃣  Test: GET /api/user (with valid token)"
echo "Expected: 200 - User data returned"
RESPONSE=$(curl -s http://localhost:5003/api/user -H "Authorization: Bearer $TOKEN")
echo "Response: $RESPONSE"
echo ""

# Extract user from response
USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Authenticated user ID: $USER_ID"
echo ""

# Test 4: Health check
echo "5️⃣  Test: GET /api/health"
RESPONSE=$(curl -s http://localhost:5003/api/health)
echo "Response: $RESPONSE"
echo ""

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
