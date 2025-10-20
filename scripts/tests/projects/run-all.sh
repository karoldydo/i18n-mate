#!/bin/bash

# Run all project tests in sequence
# Creates, lists, gets, updates, and deletes a test project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running All Project Tests${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test 1: Create project
echo -e "\n${YELLOW}[1/5] Creating project...${NC}"
CREATE_OUTPUT=$(bash "${SCRIPT_DIR}/test-create-project.sh")
echo "${CREATE_OUTPUT}"
PROJECT_ID=$(echo "${CREATE_OUTPUT}" | grep "export PROJECT_ID=" | cut -d'=' -f2)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ Failed to extract PROJECT_ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project created: ${PROJECT_ID}${NC}"

# Test 2: List projects
echo -e "\n${YELLOW}[2/5] Listing projects...${NC}"
bash "${SCRIPT_DIR}/test-list-projects.sh"

# Test 3: Get project
echo -e "\n${YELLOW}[3/5] Getting project details...${NC}"
bash "${SCRIPT_DIR}/test-get-project.sh" "${PROJECT_ID}"

# Test 4: Update project
echo -e "\n${YELLOW}[4/5] Updating project...${NC}"
bash "${SCRIPT_DIR}/test-update-project.sh" "${PROJECT_ID}"

# Test 5: Delete project
echo -e "\n${YELLOW}[5/5] Deleting project...${NC}"
bash "${SCRIPT_DIR}/test-delete-project.sh" "${PROJECT_ID}"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All project tests completed successfully${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
