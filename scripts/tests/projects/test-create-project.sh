#!/bin/bash

# Test: Create Project with Default Locale
# Tests useCreateProject hook via create_project_with_default_locale RPC

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

# Create project
print_step "Create Project with Default Locale"

TIMESTAMP=$(date +%s)
PROJECT_NAME="Test Project ${TIMESTAMP}"
PROJECT_PREFIX="t$(echo ${TIMESTAMP} | tail -c 4)"  # Use last 3 digits of timestamp for unique 2-4 char prefix
PROJECT_DESCRIPTION="Test project for API validation"
DEFAULT_LOCALE="en"
DEFAULT_LOCALE_LABEL="English"

print_info "Project Data:"
echo "  Name: ${PROJECT_NAME}"
echo "  Prefix: ${PROJECT_PREFIX}"
echo "  Description: ${PROJECT_DESCRIPTION}"
echo "  Default Locale: ${DEFAULT_LOCALE} (${DEFAULT_LOCALE_LABEL})"

CREATE_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_project_with_default_locale" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"p_name\": \"${PROJECT_NAME}\",
    \"p_prefix\": \"${PROJECT_PREFIX}\",
    \"p_description\": \"${PROJECT_DESCRIPTION}\",
    \"p_default_locale\": \"${DEFAULT_LOCALE}\",
    \"p_default_locale_label\": \"${DEFAULT_LOCALE_LABEL}\"
  }")

echo -e "\nResponse:"
echo "${CREATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_RESPONSE}"

PROJECT_ID=$(echo "${CREATE_RESPONSE}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    print_error "Failed to create project"
    exit 1
fi

print_success "Project created successfully"
print_info "PROJECT_ID: ${PROJECT_ID}"

# Export for other scripts
echo ""
echo "export PROJECT_ID=${PROJECT_ID}"
