#!/bin/bash

# Run all translation job tests in sequence
# Requires existing PROJECT_ID and TARGET_LOCALE as arguments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}✗ PROJECT_ID and TARGET_LOCALE required as arguments${NC}"
    echo "Usage: $0 <PROJECT_ID> <TARGET_LOCALE>"
    exit 1
fi

PROJECT_ID="$1"
TARGET_LOCALE="$2"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running All Translation Job Tests${NC}"
echo -e "${BLUE}PROJECT_ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}TARGET_LOCALE: ${TARGET_LOCALE}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test 1: Check for active job (before creating new one)
echo -e "\n${YELLOW}[1/5] Checking for active translation job...${NC}"
bash "${SCRIPT_DIR}/test-get-active-job.sh" "${PROJECT_ID}"

# Test 2: Create translation job
echo -e "\n${YELLOW}[2/5] Creating translation job...${NC}"
CREATE_OUTPUT=$(bash "${SCRIPT_DIR}/test-create-translation-job.sh" "${PROJECT_ID}" "${TARGET_LOCALE}")
echo "${CREATE_OUTPUT}"
JOB_ID=$(echo "${CREATE_OUTPUT}" | grep "export JOB_ID=" | cut -d'=' -f2)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}✗ Failed to extract JOB_ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Job created: ${JOB_ID}${NC}"

# Test 3: List translation jobs
echo -e "\n${YELLOW}[3/5] Listing translation jobs...${NC}"
bash "${SCRIPT_DIR}/test-list-translation-jobs.sh" "${PROJECT_ID}"

# Test 4: List job items
echo -e "\n${YELLOW}[4/5] Listing job items...${NC}"
bash "${SCRIPT_DIR}/test-list-job-items.sh" "${JOB_ID}"

# Test 5: Check active job again (should show our new job)
echo -e "\n${YELLOW}[5/5] Checking for active job again...${NC}"
bash "${SCRIPT_DIR}/test-get-active-job.sh" "${PROJECT_ID}"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All translation job tests completed successfully${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Note: To cancel the job, run:${NC}"
echo -e "${YELLOW}./test-cancel-job.sh ${PROJECT_ID} ${JOB_ID}${NC}"
echo -e "\n${YELLOW}The job will process asynchronously. Monitor progress with:${NC}"
echo -e "${YELLOW}./test-list-job-items.sh ${JOB_ID}${NC}"
