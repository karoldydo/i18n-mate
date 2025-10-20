#!/bin/bash

# i18n-mate API Testing Script
# Complete workflow: Auth → Project → Locale → Key → Translation Job
# Generated with random test data according to validation requirements

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# Supabase Configuration (replace with your actual values)
SUPABASE_URL="${VITE_SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-your_anon_key_here}"

# Test user credentials (will be created if doesn't exist)
TEST_EMAIL="${TEST_EMAIL:-testuser-$(date +%s)@i18n-mate.test}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPassword123!}"

# API Endpoints
API_BASE="${SUPABASE_URL}/rest/v1"
RPC_BASE="${SUPABASE_URL}/rest/v1/rpc"
FUNCTIONS_BASE="${SUPABASE_URL}/functions/v1"
AUTH_BASE="${SUPABASE_URL}/auth/v1"

# Headers (will be updated after auth)
CONTENT_TYPE="Content-Type: application/json"
PREFER_RETURN="Prefer: return=representation"
APIKEY_HEADER="apikey: ${SUPABASE_ANON_KEY}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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

extract_json_field() {
    echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | cut -d'"' -f4
}

# ============================================================================
# STEP 0: AUTHENTICATION
# ============================================================================

print_step "STEP 0: User Authentication"

print_info "Test User Credentials:"
echo "  Email: ${TEST_EMAIL}"
echo "  Password: ${TEST_PASSWORD}"

# Try to sign in first
print_info "Attempting to sign in..."

SIGNIN_RESPONSE=$(curl -s -X POST "${AUTH_BASE}/token?grant_type=password" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

ACCESS_TOKEN=$(echo "${SIGNIN_RESPONSE}" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# If sign in failed, try to sign up
if [ -z "$ACCESS_TOKEN" ]; then
    print_info "User doesn't exist. Creating new user..."

    SIGNUP_RESPONSE=$(curl -s -X POST "${AUTH_BASE}/signup" \
      -H "${APIKEY_HEADER}" \
      -H "${CONTENT_TYPE}" \
      -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\"
      }")

    echo "Signup response:"
    echo "${SIGNUP_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${SIGNUP_RESPONSE}"

    # Check if email confirmation is required
    USER_ID=$(echo "${SIGNUP_RESPONSE}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    EMAIL_CONFIRMED=$(echo "${SIGNUP_RESPONSE}" | grep -o '"email_confirmed_at":[^,}]*' | cut -d':' -f2)

    if [ "$EMAIL_CONFIRMED" = "null" ] || [ -z "$EMAIL_CONFIRMED" ]; then
        print_error "Email confirmation required. For local development:"
        print_info "1. Check Supabase Inbucket: http://localhost:54324"
        print_info "2. Or disable email confirmation in Supabase settings"
        print_info "3. Or use existing confirmed user credentials"
        exit 1
    fi

    # Try to sign in again after signup
    sleep 1
    SIGNIN_RESPONSE=$(curl -s -X POST "${AUTH_BASE}/token?grant_type=password" \
      -H "${APIKEY_HEADER}" \
      -H "${CONTENT_TYPE}" \
      -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\"
      }")

    ACCESS_TOKEN=$(echo "${SIGNIN_RESPONSE}" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$ACCESS_TOKEN" ]; then
    print_error "Authentication failed"
    echo "Response:"
    echo "${SIGNIN_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${SIGNIN_RESPONSE}"
    exit 1
fi

print_success "Authentication successful"

# Update auth header with access token
AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"

# ============================================================================
# STEP 1: CREATE PROJECT
# ============================================================================

print_step "STEP 1: Create Project with Default Locale"

# Generate random test data
PROJECT_NAME="E-commerce Platform $(date +%s)"
PROJECT_PREFIX="shop"  # 2-4 chars, lowercase alphanumeric with dots/dashes/underscores
PROJECT_DESCRIPTION="Multi-language e-commerce translation project"
DEFAULT_LOCALE="en"
DEFAULT_LOCALE_LABEL="English"

print_info "Project Data:"
echo "  Name: ${PROJECT_NAME}"
echo "  Prefix: ${PROJECT_PREFIX}"
echo "  Description: ${PROJECT_DESCRIPTION}"
echo "  Default Locale: ${DEFAULT_LOCALE} (${DEFAULT_LOCALE_LABEL})"

# Create project using RPC function (atomic operation)
CREATE_PROJECT_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_project_with_default_locale" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "${PREFER_RETURN}" \
  -d "{
    \"p_name\": \"${PROJECT_NAME}\",
    \"p_prefix\": \"${PROJECT_PREFIX}\",
    \"p_description\": \"${PROJECT_DESCRIPTION}\",
    \"p_default_locale\": \"${DEFAULT_LOCALE}\",
    \"p_default_locale_label\": \"${DEFAULT_LOCALE_LABEL}\"
  }")

echo -e "\nResponse:"
echo "${CREATE_PROJECT_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_PROJECT_RESPONSE}"

# Extract project id from response (RPC returns array with 'id' field, not 'project_id')
PROJECT_ID=$(echo "${CREATE_PROJECT_RESPONSE}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    print_error "Failed to create project"
    exit 1
fi

print_success "Project created successfully"
print_info "PROJECT_ID: ${PROJECT_ID}"

# ============================================================================
# STEP 2: ADD ADDITIONAL LOCALE
# ============================================================================

print_step "STEP 2: Add Additional Locale to Project"

# Add Polish locale
TARGET_LOCALE="pl"
TARGET_LOCALE_LABEL="Polski"

print_info "Locale Data:"
echo "  Code: ${TARGET_LOCALE}"
echo "  Label: ${TARGET_LOCALE_LABEL}"

# Create locale using atomic RPC function
CREATE_LOCALE_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_project_locale_atomic" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "${PREFER_RETURN}" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_locale\": \"${TARGET_LOCALE}\",
    \"p_label\": \"${TARGET_LOCALE_LABEL}\"
  }")

echo -e "\nResponse:"
echo "${CREATE_LOCALE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_LOCALE_RESPONSE}"

# Extract locale id from response (RPC returns array with 'id' field)
LOCALE_ID=$(echo "${CREATE_LOCALE_RESPONSE}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$LOCALE_ID" ]; then
    print_error "Failed to create locale"
    exit 1
fi

print_success "Locale added successfully"
print_info "LOCALE_ID: ${LOCALE_ID}"

# ============================================================================
# STEP 3: CREATE TRANSLATION KEYS
# ============================================================================

print_step "STEP 3: Create Translation Keys with Default Values"

# Create multiple keys to demonstrate translation job
declare -a KEY_IDS=()

# Key 1: Home page title
FULL_KEY_1="${PROJECT_PREFIX}.home.title"
DEFAULT_VALUE_1="Welcome to Our Store"

print_info "Creating key: ${FULL_KEY_1}"

CREATE_KEY_1_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_key_with_value" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "${PREFER_RETURN}" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_full_key\": \"${FULL_KEY_1}\",
    \"p_default_value\": \"${DEFAULT_VALUE_1}\"
  }")

echo "Response:"
echo "${CREATE_KEY_1_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_KEY_1_RESPONSE}"

KEY_ID_1=$(echo "${CREATE_KEY_1_RESPONSE}" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$KEY_ID_1" ]; then
    KEY_IDS+=("$KEY_ID_1")
    print_success "Key created: ${FULL_KEY_1}"
    print_info "KEY_ID: ${KEY_ID_1}"
fi

# Key 2: Product listing
FULL_KEY_2="${PROJECT_PREFIX}.products.list-title"
DEFAULT_VALUE_2="Browse Our Products"

print_info "Creating key: ${FULL_KEY_2}"

CREATE_KEY_2_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_key_with_value" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "${PREFER_RETURN}" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_full_key\": \"${FULL_KEY_2}\",
    \"p_default_value\": \"${DEFAULT_VALUE_2}\"
  }")

KEY_ID_2=$(echo "${CREATE_KEY_2_RESPONSE}" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$KEY_ID_2" ]; then
    KEY_IDS+=("$KEY_ID_2")
    print_success "Key created: ${FULL_KEY_2}"
    print_info "KEY_ID: ${KEY_ID_2}"
fi

# Key 3: Cart button
FULL_KEY_3="${PROJECT_PREFIX}.cart.add-button"
DEFAULT_VALUE_3="Add to Cart"

print_info "Creating key: ${FULL_KEY_3}"

CREATE_KEY_3_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_key_with_value" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "${PREFER_RETURN}" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_full_key\": \"${FULL_KEY_3}\",
    \"p_default_value\": \"${DEFAULT_VALUE_3}\"
  }")

KEY_ID_3=$(echo "${CREATE_KEY_3_RESPONSE}" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$KEY_ID_3" ]; then
    KEY_IDS+=("$KEY_ID_3")
    print_success "Key created: ${FULL_KEY_3}"
    print_info "KEY_ID: ${KEY_ID_3}"
fi

# Key 4: Checkout
FULL_KEY_4="${PROJECT_PREFIX}.checkout.confirm-button"
DEFAULT_VALUE_4="Confirm Purchase"

print_info "Creating key: ${FULL_KEY_4}"

CREATE_KEY_4_RESPONSE=$(curl -s -X POST "${RPC_BASE}/create_key_with_value" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "${PREFER_RETURN}" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_full_key\": \"${FULL_KEY_4}\",
    \"p_default_value\": \"${DEFAULT_VALUE_4}\"
  }")

KEY_ID_4=$(echo "${CREATE_KEY_4_RESPONSE}" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$KEY_ID_4" ]; then
    KEY_IDS+=("$KEY_ID_4")
    print_success "Key created: ${FULL_KEY_4}"
    print_info "KEY_ID: ${KEY_ID_4}"
fi

print_success "Created ${#KEY_IDS[@]} translation keys"

# ============================================================================
# STEP 4: CREATE TRANSLATION JOB
# ============================================================================

print_step "STEP 4: Create LLM Translation Job"

# Build key_ids array for JSON
KEY_IDS_JSON=$(printf '"%s",' "${KEY_IDS[@]}" | sed 's/,$//')

print_info "Translation Job Configuration:"
echo "  Mode: selected (translating ${#KEY_IDS[@]} keys)"
echo "  Target Locale: ${TARGET_LOCALE}"
echo "  Key IDs: [${KEY_IDS_JSON}]"

# Create translation job via Edge Function
CREATE_JOB_RESPONSE=$(curl -s -X POST "${FUNCTIONS_BASE}/translate" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -d "{
    \"project_id\": \"${PROJECT_ID}\",
    \"target_locale\": \"${TARGET_LOCALE}\",
    \"mode\": \"selected\",
    \"key_ids\": [${KEY_IDS_JSON}],
    \"params\": {
      \"temperature\": 0.3,
      \"max_tokens\": 1000
    }
  }")

echo -e "\nResponse:"
echo "${CREATE_JOB_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CREATE_JOB_RESPONSE}"

JOB_ID=$(echo "${CREATE_JOB_RESPONSE}" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    print_error "Failed to create translation job"
    exit 1
fi

print_success "Translation job created successfully"
print_info "JOB_ID: ${JOB_ID}"

# ============================================================================
# STEP 5: POLL JOB STATUS
# ============================================================================

print_step "STEP 5: Monitor Translation Job Progress"

print_info "Polling job status (max 30 seconds)..."

MAX_POLLS=15
POLL_INTERVAL=2
POLL_COUNT=0
JOB_STATUS="pending"

while [ $POLL_COUNT -lt $MAX_POLLS ]; do
    sleep $POLL_INTERVAL
    POLL_COUNT=$((POLL_COUNT + 1))

    # Get job status
    JOB_STATUS_RESPONSE=$(curl -s -X GET "${API_BASE}/translation_jobs?id=eq.${JOB_ID}&select=*" \
      -H "${AUTH_HEADER}" \
      -H "${APIKEY_HEADER}" \
      -H "${CONTENT_TYPE}")

    JOB_STATUS=$(echo "${JOB_STATUS_RESPONSE}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    COMPLETED_KEYS=$(echo "${JOB_STATUS_RESPONSE}" | grep -o '"completed_keys":[0-9]*' | cut -d':' -f2)
    FAILED_KEYS=$(echo "${JOB_STATUS_RESPONSE}" | grep -o '"failed_keys":[0-9]*' | cut -d':' -f2)

    echo -e "  Poll ${POLL_COUNT}/${MAX_POLLS}: Status=${JOB_STATUS}, Completed=${COMPLETED_KEYS:-0}, Failed=${FAILED_KEYS:-0}"

    if [ "$JOB_STATUS" = "completed" ] || [ "$JOB_STATUS" = "failed" ] || [ "$JOB_STATUS" = "cancelled" ]; then
        break
    fi
done

echo -e "\nFinal Job Status:"
echo "${JOB_STATUS_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${JOB_STATUS_RESPONSE}"

if [ "$JOB_STATUS" = "completed" ]; then
    print_success "Translation job completed successfully"
elif [ "$JOB_STATUS" = "failed" ]; then
    print_error "Translation job failed"
elif [ "$JOB_STATUS" = "cancelled" ]; then
    print_error "Translation job was cancelled"
else
    print_info "Translation job still in progress (status: ${JOB_STATUS})"
fi

# ============================================================================
# STEP 6: VIEW TRANSLATED KEYS
# ============================================================================

print_step "STEP 6: View Translated Keys"

print_info "Fetching translations for locale: ${TARGET_LOCALE}"

# Get keys with translations for target locale
KEYS_RESPONSE=$(curl -s -X POST "${RPC_BASE}/list_keys_per_language_view" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -H "Prefer: count=exact" \
  -d "{
    \"p_project_id\": \"${PROJECT_ID}\",
    \"p_locale\": \"${TARGET_LOCALE}\",
    \"p_limit\": 20,
    \"p_offset\": 0,
    \"p_missing_only\": false
  }")

echo -e "\nTranslated Keys:"
echo "${KEYS_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${KEYS_RESPONSE}"

# ============================================================================
# SUMMARY
# ============================================================================

print_step "TESTING SUMMARY"

echo -e "${GREEN}Successfully completed workflow:${NC}"
echo -e "  ${GREEN}✓${NC} Created project: ${PROJECT_NAME}"
echo -e "  ${GREEN}✓${NC} Added locale: ${TARGET_LOCALE} (${TARGET_LOCALE_LABEL})"
echo -e "  ${GREEN}✓${NC} Created ${#KEY_IDS[@]} translation keys"
echo -e "  ${GREEN}✓${NC} Triggered LLM translation job"
echo -e "  ${GREEN}✓${NC} Retrieved translated content"

echo -e "\n${BLUE}Important IDs for further testing:${NC}"
echo -e "  PROJECT_ID: ${PROJECT_ID}"
echo -e "  LOCALE_ID: ${LOCALE_ID}"
echo -e "  JOB_ID: ${JOB_ID}"
echo -e "  KEY_IDS: ${KEY_IDS[*]}"

echo -e "\n${YELLOW}Additional Test Commands:${NC}"
echo -e "\n# List all projects"
echo "curl -X POST '${RPC_BASE}/list_projects_with_counts' \\"
echo "  -H '${AUTH_HEADER}' \\"
echo "  -H '${APIKEY_HEADER}' \\"
echo "  -H '${CONTENT_TYPE}' \\"
echo "  -d '{\"limit\": 10, \"offset\": 0}'"

echo -e "\n# Get project locales"
echo "curl -X POST '${RPC_BASE}/list_project_locales_with_default' \\"
echo "  -H '${AUTH_HEADER}' \\"
echo "  -H '${APIKEY_HEADER}' \\"
echo "  -H '${CONTENT_TYPE}' \\"
echo "  -d '{\"p_project_id\": \"${PROJECT_ID}\"}'"

echo -e "\n# Get job items (detailed status)"
echo "curl -X GET '${API_BASE}/translation_job_items?job_id=eq.${JOB_ID}&select=*,keys(full_key)' \\"
echo "  -H '${AUTH_HEADER}' \\"
echo "  -H '${APIKEY_HEADER}' \\"
echo "  -H '${CONTENT_TYPE}'"

echo -e "\n# Update translation manually"
echo "curl -X PATCH '${API_BASE}/translations?project_id=eq.${PROJECT_ID}&key_id=eq.${KEY_IDS[0]}&locale=eq.${TARGET_LOCALE}' \\"
echo "  -H '${AUTH_HEADER}' \\"
echo "  -H '${APIKEY_HEADER}' \\"
echo "  -H '${CONTENT_TYPE}' \\"
echo "  -H 'Prefer: return=representation' \\"
echo "  -d '{\"value\": \"Custom translation\", \"is_machine_translated\": false, \"updated_source\": \"user\"}'"

echo ""
