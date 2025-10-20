#!/bin/bash

# Test: Update Translation with Optimistic Locking
# Tests useUpdateTranslation hook via PATCH on translations table

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
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    print_error "PROJECT_ID, KEY_ID, and LOCALE required as arguments"
    echo "Usage: $0 <PROJECT_ID> <KEY_ID> <LOCALE> [NEW_VALUE]"
    exit 1
fi

PROJECT_ID="$1"
KEY_ID="$2"
LOCALE="$3"
NEW_VALUE="${4:-Updated translation value $(date +%s)}"

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

# Update translation
print_step "Update Translation"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "KEY_ID: ${KEY_ID}"
print_info "Locale: ${LOCALE}"
print_info "New Value: ${NEW_VALUE}"

UPDATE_RESPONSE=$(curl -s -X PATCH "${API_BASE}/translations?project_id=eq.${PROJECT_ID}&key_id=eq.${KEY_ID}&locale=eq.${LOCALE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"value\": \"${NEW_VALUE}\",
    \"is_machine_translated\": false,
    \"updated_source\": \"user\"
  }")

echo -e "\nResponse:"
echo "${UPDATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${UPDATE_RESPONSE}"

# Check if update succeeded
RETURNED_VALUE=$(echo "${UPDATE_RESPONSE}" | grep -o '"value":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RETURNED_VALUE" ]; then
    print_error "Failed to update translation"
    exit 1
fi

print_success "Translation updated successfully"
print_info "Updated Value: ${RETURNED_VALUE}"
