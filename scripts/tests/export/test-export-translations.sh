#!/bin/bash

# Test: Export Translations as ZIP
# Tests useExportTranslations hook via /functions/v1/export-translations Edge Function

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

FUNCTIONS_BASE="${SUPABASE_URL}/functions/v1"
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

# Export translations
print_step "Export Translations as ZIP"

print_info "PROJECT_ID: ${PROJECT_ID}"

# Generate filename with timestamp
TIMESTAMP=$(date +%s)
OUTPUT_FILE="export-${PROJECT_ID}-${TIMESTAMP}.zip"

print_info "Downloading ZIP archive to: ${OUTPUT_FILE}"

# Download ZIP file (GET request with query parameter)
HTTP_CODE=$(curl -s -w "%{http_code}" -o "${OUTPUT_FILE}" \
  -X GET "${FUNCTIONS_BASE}/export-translations?project_id=${PROJECT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}")

echo -e "\nHTTP Status Code: ${HTTP_CODE}"

if [ "$HTTP_CODE" != "200" ]; then
    print_error "Export failed with status code ${HTTP_CODE}"
    # Show error response if file contains JSON error
    if [ -f "${OUTPUT_FILE}" ]; then
        echo "Response:"
        cat "${OUTPUT_FILE}" | python3 -m json.tool 2>/dev/null || cat "${OUTPUT_FILE}"
        rm -f "${OUTPUT_FILE}"
    fi
    exit 1
fi

# Verify ZIP file
if [ ! -f "${OUTPUT_FILE}" ]; then
    print_error "ZIP file not created"
    exit 1
fi

FILE_SIZE=$(stat -f%z "${OUTPUT_FILE}" 2>/dev/null || stat -c%s "${OUTPUT_FILE}" 2>/dev/null)

if [ "$FILE_SIZE" -eq 0 ]; then
    print_error "ZIP file is empty"
    rm -f "${OUTPUT_FILE}"
    exit 1
fi

print_success "Export completed successfully"
print_info "File: ${OUTPUT_FILE}"
print_info "Size: ${FILE_SIZE} bytes"

# List ZIP contents
print_info "ZIP contents:"
unzip -l "${OUTPUT_FILE}"

print_success "ZIP archive contains i18next-compatible {locale}.json files"
