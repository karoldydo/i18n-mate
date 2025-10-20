#!/bin/bash

# Test: Update Project Locale Label
# Tests useUpdateProjectLocale hook via PATCH on project_locales table

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
    print_error "PROJECT_ID and LOCALE_ID required as arguments"
    echo "Usage: $0 <PROJECT_ID> <LOCALE_ID>"
    exit 1
fi

PROJECT_ID="$1"
LOCALE_ID="$2"

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

# Update locale
print_step "Update Locale Label"

UPDATED_LABEL="Polish (Updated)"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "LOCALE_ID: ${LOCALE_ID}"
print_info "New Label: ${UPDATED_LABEL}"

UPDATE_RESPONSE=$(curl -s -X PATCH "${API_BASE}/project_locales?project_id=eq.${PROJECT_ID}&id=eq.${LOCALE_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"label\": \"${UPDATED_LABEL}\"}")

echo -e "\nResponse:"
echo "${UPDATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${UPDATE_RESPONSE}"

# Check if update succeeded
RETURNED_LABEL=$(echo "${UPDATE_RESPONSE}" | grep -o '"label":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RETURNED_LABEL" ]; then
    print_error "Failed to update locale"
    exit 1
fi

print_success "Locale updated successfully"
print_info "Updated Label: ${RETURNED_LABEL}"
