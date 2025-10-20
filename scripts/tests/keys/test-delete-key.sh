#!/bin/bash

# Test: Delete Translation Key
# Tests useDeleteKey hook via DELETE on keys table

set -e

# Load environment variables from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

if [ -f "${PROJECT_ROOT}/.env" ]; then
    export $(cat "${PROJECT_ROOT}/.env" | grep -v '^#' | xargs)
fi

# Configuration
SUPABASE_URL="${VITE_SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"
TEST_EMAIL="${TEST_EMAIL}"
TEST_PASSWORD="${TEST_PASSWORD}"

API_BASE="${SUPABASE_URL}/rest/v1"
AUTH_BASE="${SUPABASE_URL}/auth/v1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Helper functions
print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check for arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    print_error "PROJECT_ID and KEY_ID required as arguments"
    echo "Usage: $0 <PROJECT_ID> <KEY_ID>"
    exit 1
fi

PROJECT_ID="$1"
KEY_ID="$2"

# Authenticate
print_step "Authentication"

SIGNIN_RESPONSE=$(curl -s -X POST "${AUTH_BASE}/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "${SIGNIN_RESPONSE}" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    print_error "Authentication failed"
    exit 1
fi

print_success "Authenticated successfully"

# Delete key
print_step "Delete Translation Key"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "KEY_ID: ${KEY_ID}"
echo -e "${YELLOW}⚠ This will permanently delete the key and all its translations${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE "${API_BASE}/keys?project_id=eq.${PROJECT_ID}&id=eq.${KEY_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation")

echo -e "\nResponse:"
echo "${DELETE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${DELETE_RESPONSE}"

# Verify deletion
sleep 1
VERIFY_RESPONSE=$(curl -s -X GET "${API_BASE}/keys?project_id=eq.${PROJECT_ID}&id=eq.${KEY_ID}&select=*" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

if [ "$VERIFY_RESPONSE" = "[]" ]; then
    print_success "Key deleted successfully"
else
    print_error "Failed to delete key"
    exit 1
fi
