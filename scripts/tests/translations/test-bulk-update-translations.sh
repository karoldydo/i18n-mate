#!/bin/bash

# Test: Bulk Update Translations
# Tests useBulkUpdateTranslations hook (used internally by translation jobs)

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

# Check for arguments
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    print_error "PROJECT_ID, KEY_ID1, and KEY_ID2 required as arguments"
    echo "Usage: $0 <PROJECT_ID> <KEY_ID1> <KEY_ID2> <LOCALE>"
    exit 1
fi

PROJECT_ID="$1"
KEY_ID1="$2"
KEY_ID2="$3"
LOCALE="${4:-pl}"

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

# Bulk update translations
print_step "Bulk Update Translations"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "Locale: ${LOCALE}"
print_info "Updating 2 translations"

# Note: This uses RPC function for atomic bulk updates
# In real implementation, this would be called by translation job Edge Function
BULK_UPDATE_RESPONSE=$(curl -s -X POST "${RPC_BASE}/bulk_update_translations" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_locale\": \"${LOCALE}\",
    \"p_updates\": [
      {
        \"key_id\": \"${KEY_ID1}\",
        \"value\": \"Bulk updated value 1 - $(date +%s)\",
        \"is_machine_translated\": true,
        \"updated_source\": \"llm\"
      },
      {
        \"key_id\": \"${KEY_ID2}\",
        \"value\": \"Bulk updated value 2 - $(date +%s)\",
        \"is_machine_translated\": true,
        \"updated_source\": \"llm\"
      }
    ]
  }")

echo -e "\nResponse:"
echo "${BULK_UPDATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${BULK_UPDATE_RESPONSE}"

print_success "Bulk translations update completed"
print_info "This operation is typically used by translation job Edge Functions"
