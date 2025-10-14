#!/bin/bash

# API Versioning Test Script
# This script demonstrates the API versioning feature

echo "=========================================="
echo "API Versioning Feature Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/mock"

echo -e "${BLUE}Prerequisites:${NC}"
echo "1. Server must be running with versioning enabled"
echo "2. Sample data files (users-v1.json, users-v2.json) must be in data/"
echo ""
echo "To enable versioning, add to .env.local:"
echo "  VERSIONING_ENABLED=true"
echo "  VERSIONING_SUPPORTED_VERSIONS=v1,v2"
echo "  VERSIONING_DEFAULT_VERSION=v1"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 1: Header-based versioning
echo -e "${YELLOW}Test 1: Header-Based Versioning${NC}"
echo "----------------------------------------"

echo -e "${GREEN}Request v1 API (Header):${NC}"
echo "curl -H 'API-Version: v1' $BASE_URL/users"
curl -s -H "API-Version: v1" "$BASE_URL/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

echo -e "${GREEN}Request v2 API (Header):${NC}"
echo "curl -H 'API-Version: v2' $BASE_URL/users"
curl -s -H "API-Version: v2" "$BASE_URL/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

# Test 2: URL prefix versioning
echo -e "${YELLOW}Test 2: URL Prefix Versioning${NC}"
echo "----------------------------------------"

echo -e "${GREEN}Request v1 API (URL):${NC}"
echo "curl $BASE_URL/v1/users"
curl -s "$BASE_URL/v1/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

echo -e "${GREEN}Request v2 API (URL):${NC}"
echo "curl $BASE_URL/v2/users"
curl -s "$BASE_URL/v2/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

# Test 3: Default version
echo -e "${YELLOW}Test 3: Default Version${NC}"
echo "----------------------------------------"

echo -e "${GREEN}Request without version (should use default):${NC}"
echo "curl $BASE_URL/users"
curl -s "$BASE_URL/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

# Test 4: Unsupported version
echo -e "${YELLOW}Test 4: Unsupported Version Error${NC}"
echo "----------------------------------------"

echo -e "${GREEN}Request unsupported version v99:${NC}"
echo "curl -H 'API-Version: v99' $BASE_URL/users"
curl -s -H "API-Version: v99" "$BASE_URL/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

# Test 5: Version priority
echo -e "${YELLOW}Test 5: Version Priority (Header over URL)${NC}"
echo "----------------------------------------"

echo -e "${GREEN}Request with both header (v2) and URL (v1):${NC}"
echo "curl -H 'API-Version: v2' $BASE_URL/v1/users"
echo "(Should return v2 data, as header takes priority)"
curl -s -H "API-Version: v2" "$BASE_URL/v1/users" | jq '.' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

# Test 6: Compare versions
echo -e "${YELLOW}Test 6: Compare v1 and v2 Structures${NC}"
echo "----------------------------------------"

echo -e "${GREEN}V1 Structure (simple):${NC}"
curl -s -H "API-Version: v1" "$BASE_URL/users" | jq '.[0] | keys' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

echo -e "${GREEN}V2 Structure (enhanced):${NC}"
curl -s -H "API-Version: v2" "$BASE_URL/users" | jq '.[0] | keys' 2>/dev/null || echo "Error: Server not running or jq not installed"
echo ""

echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "For more examples, see:"
echo "  - examples/versioning-example.md"
echo "  - docs/VERSIONING_GUIDE.md"
