#!/bin/bash

# Run all locale tests in sequence
# Requires existing PROJECT_ID as argument

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for PROJECT_ID argument
if [ -z "$1" ]; then
    echo -e "${RED}✗ PROJECT_ID required as argument${NC}"
    echo "Usage: $0 <PROJECT_ID>"
    exit 1
fi

PROJECT_ID="$1"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running All Locale Tests${NC}"
echo -e "${BLUE}PROJECT_ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test 1: List locales (should show default locale)
echo -e "\n${YELLOW}[1/4] Listing project locales...${NC}"
bash "${SCRIPT_DIR}/test-list-locales.sh" "${PROJECT_ID}"

# Test 2: Create locale
echo -e "\n${YELLOW}[2/4] Creating locale...${NC}"
CREATE_OUTPUT=$(bash "${SCRIPT_DIR}/test-create-locale.sh" "${PROJECT_ID}")
echo "${CREATE_OUTPUT}"
LOCALE_ID=$(echo "${CREATE_OUTPUT}" | grep "export LOCALE_ID=" | cut -d'=' -f2)

if [ -z "$LOCALE_ID" ]; then
    echo -e "${RED}✗ Failed to extract LOCALE_ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Locale created: ${LOCALE_ID}${NC}"

# Test 3: Update locale
echo -e "\n${YELLOW}[3/4] Updating locale...${NC}"
bash "${SCRIPT_DIR}/test-update-locale.sh" "${PROJECT_ID}" "${LOCALE_ID}"

# Test 4: Delete locale
echo -e "\n${YELLOW}[4/4] Deleting locale...${NC}"
bash "${SCRIPT_DIR}/test-delete-locale.sh" "${PROJECT_ID}" "${LOCALE_ID}"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All locale tests completed successfully${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
