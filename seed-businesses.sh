#!/bin/bash

# Seed businesses via API
echo "Getting admin token..."

# Try to get a valid token - in development with default credentials
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiJ9.mock-token"

echo "Seeding businesses..."
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5003/api/v1/admin/businesses/seed/data

echo ""
echo "Checking businesses count..."
curl http://localhost:5003/api/status | jq .

echo ""
echo "Done!"
