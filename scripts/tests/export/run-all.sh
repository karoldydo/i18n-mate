#!/bin/bash

# Run export test
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
echo -e "${BLUE}Running Export Test${NC}"
echo -e "${BLUE}PROJECT_ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test: Export translations
echo -e "\n${YELLOW}[1/1] Exporting translations as ZIP...${NC}"
bash "${SCRIPT_DIR}/test-export-translations.sh" "${PROJECT_ID}"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Export test completed successfully${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
