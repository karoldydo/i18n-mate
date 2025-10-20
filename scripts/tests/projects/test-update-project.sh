#!/bin/bash

# Test: Update Project Name and Description
# Tests useUpdateProject hook via PATCH on projects table

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

# Update project
print_step "Update Project"

UPDATED_NAME="Updated Project $(date +%s)"
UPDATED_DESCRIPTION="This project was updated via API test"

print_info "PROJECT_ID: ${PROJECT_ID}"
print_info "New Name: ${UPDATED_NAME}"
print_info "New Description: ${UPDATED_DESCRIPTION}"

UPDATE_RESPONSE=$(curl -s -X PATCH "${API_BASE}/projects?id=eq.${PROJECT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"name\": \"${UPDATED_NAME}\",
    \"description\": \"${UPDATED_DESCRIPTION}\"
  }")

echo -e "\nResponse:"
echo "${UPDATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${UPDATE_RESPONSE}"

# Check if update succeeded
RETURNED_NAME=$(echo "${UPDATE_RESPONSE}" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RETURNED_NAME" ]; then
    print_error "Failed to update project"
    exit 1
fi

print_success "Project updated successfully"
print_info "Updated Name: ${RETURNED_NAME}"
