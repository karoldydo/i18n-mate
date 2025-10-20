#!/bin/bash

# Test: Create LLM Translation Job
# Tests useCreateTranslationJob hook via /functions/v1/translate Edge Function

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

# Check for arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    print_error "PROJECT_ID and TARGET_LOCALE required as arguments"
    echo "Usage: $0 <PROJECT_ID> <TARGET_LOCALE> [MODE] [KEY_IDS]"
    echo "  MODE: 'all' (default) or 'selected'"
    echo "  KEY_IDS: Required if MODE is 'selected', comma-separated (e.g., 'key1,key2,key3')"
    exit 1
fi

PROJECT_ID="$1"
TARGET_LOCALE="$2"
MODE="${3:-all}"
KEY_IDS="${4:-}"

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

# Create translation job
print_step "Create LLM Translation Job"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "Target Locale: ${TARGET_LOCALE}"
print_info "Mode: ${MODE}"

# Build request body based on mode
if [ "$MODE" = "selected" ]; then
    if [ -z "$KEY_IDS" ]; then
        print_error "KEY_IDS required when MODE is 'selected'"
        exit 1
    fi
    # Convert comma-separated KEY_IDS to JSON array
    KEY_IDS_JSON=$(echo "$KEY_IDS" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')
    print_info "Key IDs: [${KEY_IDS_JSON}]"

    REQUEST_BODY="{
      \"project_id\": \"${PROJECT_ID}\",
      \"target_locale\": \"${TARGET_LOCALE}\",
      \"mode\": \"selected\",
      \"key_ids\": [${KEY_IDS_JSON}],
      \"params\": {
        \"temperature\": 0.3,
        \"max_tokens\": 1000
      }
    }"
else
    REQUEST_BODY="{
      \"project_id\": \"${PROJECT_ID}\",
      \"target_locale\": \"${TARGET_LOCALE}\",
      \"mode\": \"all\",
      \"params\": {
        \"temperature\": 0.3,
        \"max_tokens\": 1000
      }
    }"
fi

CREATE_RESPONSE=$(curl -s -X POST "${FUNCTIONS_BASE}/translate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}")

echo -e "\nResponse:"
echo "${CREATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_RESPONSE}"

JOB_ID=$(echo "${CREATE_RESPONSE}" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    print_error "Failed to create translation job"
    exit 1
fi

print_success "Translation job created successfully (202 Accepted)"
print_info "JOB_ID: ${JOB_ID}"
print_info "Job is processing asynchronously..."

# Export for other scripts
echo ""
echo "export JOB_ID=${JOB_ID}"
