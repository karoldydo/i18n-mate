#!/bin/bash

# Run all key tests in sequence
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
echo -e "${BLUE}Running All Key Tests${NC}"
echo -e "${BLUE}PROJECT_ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test 1: List keys in default view
echo -e "\n${YELLOW}[1/4] Listing keys in default language view...${NC}"
bash "${SCRIPT_DIR}/test-list-keys-default.sh" "${PROJECT_ID}"

# Test 2: Create key
echo -e "\n${YELLOW}[2/4] Creating key...${NC}"
CREATE_OUTPUT=$(bash "${SCRIPT_DIR}/test-create-key.sh" "${PROJECT_ID}")
echo "${CREATE_OUTPUT}"
KEY_ID=$(echo "${CREATE_OUTPUT}" | grep "export KEY_ID=" | cut -d'=' -f2)

if [ -z "$KEY_ID" ]; then
    echo -e "${RED}✗ Failed to extract KEY_ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Key created: ${KEY_ID}${NC}"

# Test 3: List keys per language (use default locale 'en')
echo -e "\n${YELLOW}[3/4] Listing keys per language view...${NC}"
bash "${SCRIPT_DIR}/test-list-keys-per-language.sh" "${PROJECT_ID}" "en"

# Test 4: Delete key
echo -e "\n${YELLOW}[4/4] Deleting key...${NC}"
bash "${SCRIPT_DIR}/test-delete-key.sh" "${PROJECT_ID}" "${KEY_ID}"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All key tests completed successfully${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
