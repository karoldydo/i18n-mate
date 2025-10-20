#!/bin/bash

# Run all translation tests in sequence
# Requires existing PROJECT_ID, KEY_ID, and LOCALE as arguments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for arguments
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo -e "${RED}✗ PROJECT_ID, KEY_ID, and LOCALE required as arguments${NC}"
    echo "Usage: $0 <PROJECT_ID> <KEY_ID> <LOCALE>"
    exit 1
fi

PROJECT_ID="$1"
KEY_ID="$2"
LOCALE="$3"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running All Translation Tests${NC}"
echo -e "${BLUE}PROJECT_ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}KEY_ID: ${KEY_ID}${NC}"
echo -e "${BLUE}LOCALE: ${LOCALE}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test 1: Get translation
echo -e "\n${YELLOW}[1/2] Getting translation...${NC}"
bash "${SCRIPT_DIR}/test-get-translation.sh" "${PROJECT_ID}" "${KEY_ID}" "${LOCALE}"

# Test 2: Update translation
echo -e "\n${YELLOW}[2/2] Updating translation...${NC}"
bash "${SCRIPT_DIR}/test-update-translation.sh" "${PROJECT_ID}" "${KEY_ID}" "${LOCALE}"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All translation tests completed successfully${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Note: Bulk update test requires multiple KEY_IDs and is typically${NC}"
echo -e "${YELLOW}used by translation job Edge Functions. Run manually if needed:${NC}"
echo -e "${YELLOW}./test-bulk-update-translations.sh <PROJECT_ID> <KEY_ID1> <KEY_ID2> <LOCALE>${NC}"
