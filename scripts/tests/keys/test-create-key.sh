#!/bin/bash

# Test: Create Translation Key with Default Value
# Tests useCreateKey hook via create_key_with_value RPC

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

RPC_BASE="${SUPABASE_URL}/rest/v1/rpc"
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

# Check for PROJECT_ID argument
if [ -z "$1" ]; then
    print_error "PROJECT_ID required as argument"
    echo "Usage: $0 <PROJECT_ID> [FULL_KEY] [DEFAULT_VALUE]"
    exit 1
fi

PROJECT_ID="$1"
FULL_KEY="${2:-test.example.key-$(date +%s)}"
DEFAULT_VALUE="${3:-Test translation value}"

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

# Create key
print_step "Create Translation Key with Default Value"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "Full Key: ${FULL_KEY}"
print_info "Default Value: ${DEFAULT_VALUE}"

CREATE_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_key_with_value" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_full_key\": \"${FULL_KEY}\",
    \"p_default_value\": \"${DEFAULT_VALUE}\"
  }")

echo -e "\nResponse:"
echo "${CREATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_RESPONSE}"

KEY_ID=$(echo "${CREATE_RESPONSE}" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$KEY_ID" ]; then
    print_error "Failed to create key"
    exit 1
fi

print_success "Key created successfully"
print_info "KEY_ID: ${KEY_ID}"

# Export for other scripts
echo ""
echo "export KEY_ID=${KEY_ID}"
echo "export FULL_KEY=${FULL_KEY}"
