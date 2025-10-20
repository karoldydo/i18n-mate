#!/bin/bash

# Test: List Project Locales with Default Flag
# Tests useProjectLocales hook via list_project_locales_with_default RPC

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
    echo "Usage: $0 <PROJECT_ID>"
    exit 1
fi

PROJECT_ID="$1"

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

# List locales
print_step "List Project Locales with Default Flag"

print_info "PROJECT_ID: ${PROJECT_ID}"

LIST_RESPONSE=$(curl -s -X POST "${RPC_BASE}/list_project_locales_with_default" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_project_id\": \"${PROJECT_ID}\"}")

echo -e "\nResponse:"
echo "${LIST_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${LIST_RESPONSE}"

# Count locales
LOCALE_COUNT=$(echo "${LIST_RESPONSE}" | grep -o '"id"' | wc -l)

print_success "Retrieved ${LOCALE_COUNT} locale(s)"
