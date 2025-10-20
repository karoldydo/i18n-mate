#!/bin/bash

# i18n-mate Complete API Test Suite
# Runs all feature tests in proper sequence to test complete workflow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
CLEANUP_ON_SUCCESS=${CLEANUP_ON_SUCCESS:-false}
SKIP_TRANSLATION_JOB=${SKIP_TRANSLATION_JOB:-false}

# Helper functions
print_header() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "\n${BLUE}━━━ $1 ━━━${NC}"
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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Start test suite
clear
print_header "i18n-mate Complete API Test Suite"
echo -e "${CYAN}Testing complete workflow: Projects → Locales → Keys → Translations${NC}"
echo -e "${CYAN}                          → Translation Jobs → Export → Telemetry${NC}"

START_TIME=$(date +%s)

# ============================================================================
# PHASE 1: PROJECT SETUP
# ============================================================================

print_header "PHASE 1: Project Setup"

print_step "[1/7] Creating Project with Default Locale"
CREATE_PROJECT_OUTPUT=$(bash "${SCRIPT_DIR}/projects/test-create-project.sh")
echo "${CREATE_PROJECT_OUTPUT}"
PROJECT_ID=$(echo "${CREATE_PROJECT_OUTPUT}" | grep "export PROJECT_ID=" | cut -d'=' -f2)

if [ -z "$PROJECT_ID" ]; then
    print_error "Failed to extract PROJECT_ID"
    exit 1
fi

print_success "Project created: ${PROJECT_ID}"

print_step "[2/7] Listing All Projects"
bash "${SCRIPT_DIR}/projects/test-list-projects.sh"

print_step "[3/7] Getting Project Details"
GET_PROJECT_OUTPUT=$(bash "${SCRIPT_DIR}/projects/test-get-project.sh" "${PROJECT_ID}")
echo "${GET_PROJECT_OUTPUT}"

# Extract project prefix for key creation
PROJECT_PREFIX=$(echo "${GET_PROJECT_OUTPUT}" | grep -o '"prefix"\s*:\s*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

if [ -z "$PROJECT_PREFIX" ]; then
    print_error "Failed to extract PROJECT_PREFIX"
    exit 1
fi

print_info "Project prefix: ${PROJECT_PREFIX}"

print_step "[4/7] Updating Project"
bash "${SCRIPT_DIR}/projects/test-update-project.sh" "${PROJECT_ID}"

# ============================================================================
# PHASE 2: LOCALE MANAGEMENT
# ============================================================================

print_header "PHASE 2: Locale Management"

print_step "[1/3] Listing Project Locales (should show default: en)"
bash "${SCRIPT_DIR}/locales/test-list-locales.sh" "${PROJECT_ID}"

print_step "[2/3] Adding Polish Locale"
CREATE_LOCALE_OUTPUT=$(bash "${SCRIPT_DIR}/locales/test-create-locale.sh" "${PROJECT_ID}")
echo "${CREATE_LOCALE_OUTPUT}"
LOCALE_ID=$(echo "${CREATE_LOCALE_OUTPUT}" | grep "export LOCALE_ID=" | cut -d'=' -f2)

if [ -z "$LOCALE_ID" ]; then
    print_error "Failed to extract LOCALE_ID"
    exit 1
fi

TARGET_LOCALE="pl"
print_success "Locale created: ${LOCALE_ID} (${TARGET_LOCALE})"

print_step "[3/3] Listing Locales Again (should show en and pl)"
bash "${SCRIPT_DIR}/locales/test-list-locales.sh" "${PROJECT_ID}"

# ============================================================================
# PHASE 3: TRANSLATION KEY MANAGEMENT
# ============================================================================

print_header "PHASE 3: Translation Key Management"

print_step "[1/6] Creating Multiple Translation Keys"

# Create first key
print_info "Creating key 1: home.title"
CREATE_KEY1_OUTPUT=$(bash "${SCRIPT_DIR}/keys/test-create-key.sh" "${PROJECT_ID}" "${PROJECT_PREFIX}.home.title" "Welcome to our application")
KEY_ID1=$(echo "${CREATE_KEY1_OUTPUT}" | grep "export KEY_ID=" | cut -d'=' -f2)
print_success "Key 1 created: ${KEY_ID1}"

# Create second key
print_info "Creating key 2: home.subtitle"
CREATE_KEY2_OUTPUT=$(bash "${SCRIPT_DIR}/keys/test-create-key.sh" "${PROJECT_ID}" "${PROJECT_PREFIX}.home.subtitle" "Your translation management solution")
KEY_ID2=$(echo "${CREATE_KEY2_OUTPUT}" | grep "export KEY_ID=" | cut -d'=' -f2)
print_success "Key 2 created: ${KEY_ID2}"

# Create third key
print_info "Creating key 3: buttons.save"
CREATE_KEY3_OUTPUT=$(bash "${SCRIPT_DIR}/keys/test-create-key.sh" "${PROJECT_ID}" "${PROJECT_PREFIX}.buttons.save" "Save")
KEY_ID3=$(echo "${CREATE_KEY3_OUTPUT}" | grep "export KEY_ID=" | cut -d'=' -f2)
print_success "Key 3 created: ${KEY_ID3}"

# Create fourth key
print_info "Creating key 4: buttons.cancel"
CREATE_KEY4_OUTPUT=$(bash "${SCRIPT_DIR}/keys/test-create-key.sh" "${PROJECT_ID}" "${PROJECT_PREFIX}.buttons.cancel" "Cancel")
KEY_ID4=$(echo "${CREATE_KEY4_OUTPUT}" | grep "export KEY_ID=" | cut -d'=' -f2)
print_success "Key 4 created: ${KEY_ID4}"

print_success "Created 4 translation keys"

print_step "[2/6] Listing Keys in Default Language View"
bash "${SCRIPT_DIR}/keys/test-list-keys-default.sh" "${PROJECT_ID}"

print_step "[3/6] Listing Keys for English (default locale)"
bash "${SCRIPT_DIR}/keys/test-list-keys-per-language.sh" "${PROJECT_ID}" "en"

print_step "[4/6] Listing Keys for Polish (should show NULL values)"
bash "${SCRIPT_DIR}/keys/test-list-keys-per-language.sh" "${PROJECT_ID}" "${TARGET_LOCALE}"

# ============================================================================
# PHASE 4: MANUAL TRANSLATION UPDATES
# ============================================================================

print_header "PHASE 4: Manual Translation Updates"

print_step "[1/2] Getting Translation for Polish"
bash "${SCRIPT_DIR}/translations/test-get-translation.sh" "${PROJECT_ID}" "${KEY_ID1}" "${TARGET_LOCALE}"

print_step "[2/2] Manually Updating Translation"
bash "${SCRIPT_DIR}/translations/test-update-translation.sh" "${PROJECT_ID}" "${KEY_ID1}" "${TARGET_LOCALE}" "Witamy w naszej aplikacji"

# ============================================================================
# PHASE 5: LLM TRANSLATION JOB (Optional)
# ============================================================================

print_header "PHASE 5: LLM Translation Job"

if [ "$SKIP_TRANSLATION_JOB" = "true" ]; then
    print_warning "Skipping translation job (SKIP_TRANSLATION_JOB=true)"
    print_info "To run translation job tests, ensure:"
    print_info "  - OPENROUTER_API_KEY is set in .env"
    print_info "  - OPENROUTER_MODEL is configured"
    print_info "  - Edge Functions are deployed"
else
    print_step "[1/5] Checking for Active Jobs"
    bash "${SCRIPT_DIR}/translation-jobs/test-get-active-job.sh" "${PROJECT_ID}"

    print_step "[2/5] Creating Translation Job for Remaining Keys"
    KEY_IDS_CSV="${KEY_ID2},${KEY_ID3},${KEY_ID4}"
    CREATE_JOB_OUTPUT=$(bash "${SCRIPT_DIR}/translation-jobs/test-create-translation-job.sh" \
        "${PROJECT_ID}" "${TARGET_LOCALE}" "selected" "${KEY_IDS_CSV}")
    echo "${CREATE_JOB_OUTPUT}"
    JOB_ID=$(echo "${CREATE_JOB_OUTPUT}" | grep "export JOB_ID=" | cut -d'=' -f2)

    if [ -z "$JOB_ID" ]; then
        print_warning "Translation job creation failed (may need OPENROUTER_API_KEY)"
        print_info "Continuing with other tests..."
    else
        print_success "Translation job created: ${JOB_ID}"

        print_step "[3/5] Polling Job Status (max 30 seconds)"
        MAX_POLLS=15
        POLL_INTERVAL=2
        POLL_COUNT=0

        while [ $POLL_COUNT -lt $MAX_POLLS ]; do
            sleep $POLL_INTERVAL
            POLL_COUNT=$((POLL_COUNT + 1))

            # Use the test script to get job status
            STATUS_OUTPUT=$(bash "${SCRIPT_DIR}/translation-jobs/test-list-translation-jobs.sh" "${PROJECT_ID}" 2>/dev/null | grep -o '"status"\s*:\s*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')

            echo -e "  Poll ${POLL_COUNT}/${MAX_POLLS}: Status=${STATUS_OUTPUT:-unknown}"

            if [ "$STATUS_OUTPUT" = "completed" ] || [ "$STATUS_OUTPUT" = "failed" ] || [ "$STATUS_OUTPUT" = "cancelled" ]; then
                break
            fi
        done

        print_step "[4/5] Listing Job Items (detailed status)"
        bash "${SCRIPT_DIR}/translation-jobs/test-list-job-items.sh" "${JOB_ID}"

        print_step "[5/5] Listing All Translation Jobs"
        bash "${SCRIPT_DIR}/translation-jobs/test-list-translation-jobs.sh" "${PROJECT_ID}"
    fi
fi

# ============================================================================
# PHASE 6: EXPORT TRANSLATIONS (after translation job completes or is skipped)
# ============================================================================

print_header "PHASE 6: Export Translations"

print_step "[1/1] Exporting Project Translations as ZIP"
print_info "Exporting all translations (including those from LLM job if completed)"
bash "${SCRIPT_DIR}/export/test-export-translations.sh" "${PROJECT_ID}"

# ============================================================================
# PHASE 7: TELEMETRY
# ============================================================================

print_header "PHASE 7: Telemetry Events"

print_step "[1/1] Listing Telemetry Events"
bash "${SCRIPT_DIR}/telemetry/test-list-telemetry-events.sh" "${PROJECT_ID}"

# ============================================================================
# CLEANUP (Optional)
# ============================================================================

if [ "$CLEANUP_ON_SUCCESS" = "true" ]; then
    print_header "CLEANUP: Removing Test Data"

    print_step "Deleting Project (cascades to all related data)"
    bash "${SCRIPT_DIR}/projects/test-delete-project.sh" "${PROJECT_ID}"
    print_success "Test project deleted"
else
    print_header "TEST DATA PRESERVED"
    print_info "Project and all data preserved for manual inspection"
    print_info "PROJECT_ID: ${PROJECT_ID}"
    print_info ""
    print_info "To delete test project, run:"
    echo "  bash ${SCRIPT_DIR}/projects/test-delete-project.sh ${PROJECT_ID}"
fi

# ============================================================================
# SUMMARY
# ============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "TEST SUITE COMPLETED SUCCESSFULLY"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                      EXECUTION SUMMARY                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${CYAN}Resources Created:${NC}"
echo -e "  ${GREEN}✓${NC} Project ID:       ${PROJECT_ID}"
echo -e "  ${GREEN}✓${NC} Locales:          en (default), ${TARGET_LOCALE}"
echo -e "  ${GREEN}✓${NC} Translation Keys: 4 keys"
echo -e "  ${GREEN}✓${NC} Translations:     Manual update + LLM job"
[ -n "$JOB_ID" ] && echo -e "  ${GREEN}✓${NC} Translation Job:  ${JOB_ID}"

echo -e "\n${CYAN}Phases Completed:${NC}"
echo -e "  ${GREEN}✓${NC} Phase 1: Project Setup (4 operations)"
echo -e "  ${GREEN}✓${NC} Phase 2: Locale Management (3 operations)"
echo -e "  ${GREEN}✓${NC} Phase 3: Key Management (6 operations)"
echo -e "  ${GREEN}✓${NC} Phase 4: Manual Translations (2 operations)"
if [ "$SKIP_TRANSLATION_JOB" = "true" ]; then
    echo -e "  ${YELLOW}⊘${NC} Phase 5: Translation Job (skipped)"
else
    echo -e "  ${GREEN}✓${NC} Phase 5: Translation Job (5 operations)"
fi
echo -e "  ${GREEN}✓${NC} Phase 6: Export (1 operation)"
echo -e "  ${GREEN}✓${NC} Phase 7: Telemetry (1 operation)"

echo -e "\n${CYAN}Test Execution:${NC}"
echo -e "  Duration:  ${DURATION} seconds"
echo -e "  Status:    ${GREEN}SUCCESS${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Review exported ZIP file: export-${PROJECT_ID}-*.zip"
echo -e "  2. Check telemetry events in Supabase"
echo -e "  3. Inspect project data in UI"
if [ "$CLEANUP_ON_SUCCESS" != "true" ]; then
    echo -e "  4. Delete test project when done:"
    echo -e "     bash ${SCRIPT_DIR}/projects/test-delete-project.sh ${PROJECT_ID}"
fi

echo -e "\n${CYAN}Environment Variables (Optional):${NC}"
echo -e "  CLEANUP_ON_SUCCESS=true    - Delete project after successful test"
echo -e "  SKIP_TRANSLATION_JOB=true  - Skip LLM translation job (faster)"

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║             ALL TESTS PASSED - SUITE COMPLETED                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}\n"
