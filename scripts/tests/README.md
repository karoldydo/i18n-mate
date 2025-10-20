# i18n-mate API Test Scripts

Comprehensive bash test scripts for all API endpoints using curl. These scripts test the complete functionality of the i18n-mate application corresponding to `src/features/*/api/` hooks.

## Overview

This test suite provides systematic testing of all API features including:

- Project management (CRUD operations)
- Locale management (BCP-47 compliant)
- Translation key management
- Translation CRUD with optimistic locking
- LLM translation jobs via Edge Functions
- Export translations as ZIP
- Telemetry event tracking

## Directory Structure

```
scripts/tests/
├── README.md                          # This file
├── run-all.sh                         # Complete test suite runner (all features)
├── projects/                          # Project management tests
│   ├── test-create-project.sh
│   ├── test-list-projects.sh
│   ├── test-get-project.sh
│   ├── test-update-project.sh
│   ├── test-delete-project.sh
│   ├── run-all.sh
│   └── README.md
├── locales/                           # Locale management tests
│   ├── test-list-locales.sh
│   ├── test-create-locale.sh
│   ├── test-update-locale.sh
│   ├── test-delete-locale.sh
│   ├── run-all.sh
│   └── README.md
├── keys/                              # Key management tests
│   ├── test-list-keys-default.sh
│   ├── test-list-keys-per-language.sh
│   ├── test-create-key.sh
│   ├── test-delete-key.sh
│   ├── run-all.sh
│   └── README.md
├── translations/                      # Translation CRUD tests
│   ├── test-get-translation.sh
│   ├── test-update-translation.sh
│   ├── test-bulk-update-translations.sh
│   ├── run-all.sh
│   └── README.md
├── translation-jobs/                  # LLM translation job tests
│   ├── test-create-translation-job.sh
│   ├── test-list-translation-jobs.sh
│   ├── test-get-active-job.sh
│   ├── test-list-job-items.sh
│   ├── test-cancel-job.sh
│   ├── run-all.sh
│   └── README.md
├── export/                            # Export functionality tests
│   ├── test-export-translations.sh
│   ├── run-all.sh
│   └── README.md
└── telemetry/                         # Telemetry event tests
    ├── test-list-telemetry-events.sh
    ├── run-all.sh
    └── README.md
```

## Prerequisites

### Environment Setup

Create a `.env` file in the project root with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321  # Or your remote Supabase URL
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Test User Credentials (must have confirmed email)
TEST_EMAIL=testuser@example.com
TEST_PASSWORD=YourSecurePassword123!

# OpenRouter Configuration (for translation jobs)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
```

### Required Tools

- `curl` - HTTP client
- `python3` - JSON formatting
- `unzip` - ZIP file extraction (for export tests)
- `bash` - Shell interpreter

### Supabase Setup

1. **Local Development**:

   ```bash
   npm run supabase:start
   npm run supabase:migration
   ```

2. **User Authentication**:
   - Create a test user via signup
   - Confirm email (check Inbucket at http://localhost:54324)
   - Or disable email confirmation in Supabase settings

3. **Edge Functions** (required for translation-jobs and export):
   ```bash
   # Deploy Edge Functions
   supabase functions deploy translate
   supabase functions deploy export-translations
   ```

## Running Tests

### Quick Start - Complete Test Suite

Run the complete test suite that tests all features in proper sequence:

```bash
cd scripts/tests
./run-all.sh
```

This comprehensive script executes all phases:

1. **Project Setup** - Create, list, get, and update project
2. **Locale Management** - List default locale, add Polish, verify both locales
3. **Key Management** - Create 4 translation keys, list in different views
4. **Manual Translations** - Get and update translation manually
5. **LLM Translation Job** - Create job, poll status, view results (optional)
6. **Export** - Generate and download ZIP with all translations
7. **Telemetry** - View auto-tracked events

### Environment Variables for `run-all.sh`

The main `run-all.sh` script accepts optional environment variables to customize test execution:

#### `SKIP_TRANSLATION_JOB`

**Description:** Skip LLM translation job testing (Phase 5)
**Default:** `false`
**Values:** `true` | `false`
**Use case:** Run tests faster without requiring OpenRouter API key

```bash
# Skip translation job - faster execution, no OpenRouter needed
SKIP_TRANSLATION_JOB=true ./run-all.sh
```

**Benefits:**

- Reduces test execution time by ~30-60 seconds
- No OpenRouter API key required
- No Edge Function deployment needed for translate function
- Still tests all other features completely

#### `CLEANUP_ON_SUCCESS`

**Description:** Automatically delete test project and all related data after successful test completion
**Default:** `false`
**Values:** `true` | `false`
**Use case:** Clean test runs without leaving test data in database

```bash
# Clean up test data after successful run
CLEANUP_ON_SUCCESS=true ./run-all.sh
```

**Benefits:**

- Keeps database clean during repeated test runs
- Prevents accumulation of test projects
- Only cleans up on success - preserves data if tests fail for debugging

**Note:** If `false`, script provides cleanup command at the end:

```bash
bash scripts/tests/projects/test-delete-project.sh <PROJECT_ID>
```

#### Combined Usage

You can combine both environment variables for optimal test execution:

```bash
# Fast, clean test run - ideal for CI/CD or repeated local testing
SKIP_TRANSLATION_JOB=true CLEANUP_ON_SUCCESS=true ./run-all.sh
```

**Recommended combinations:**

| Scenario                   | Command                                                          | Description                                |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| **Full test with cleanup** | `CLEANUP_ON_SUCCESS=true ./run-all.sh`                           | Complete workflow, auto-delete             |
| **Fast test with cleanup** | `SKIP_TRANSLATION_JOB=true CLEANUP_ON_SUCCESS=true ./run-all.sh` | Skip LLM job, auto-delete                  |
| **Full test, keep data**   | `./run-all.sh`                                                   | Complete workflow, preserve for inspection |
| **Fast test, keep data**   | `SKIP_TRANSLATION_JOB=true ./run-all.sh`                         | Skip LLM job, preserve for inspection      |

### Script Output

The `run-all.sh` script provides:

- Color-coded output (green = success, blue = info, yellow = warning, red = error)
- Phase headers with progress indicators
- Detailed JSON responses from API calls
- Execution time summary
- Resource IDs for manual inspection
- Next steps and cleanup instructions

### Running from Different Locations

All test scripts automatically locate the project root and load the `.env` file correctly, regardless of where you run them from:

```bash
# From project root
bash scripts/tests/run-all.sh

# From scripts/tests directory
cd scripts/tests
./run-all.sh

# From anywhere in the project
cd ~/some/path/in/project
bash ../../scripts/tests/run-all.sh

# With environment variables from any location
cd ~/path/to/i18n-mate
SKIP_TRANSLATION_JOB=true bash scripts/tests/run-all.sh
```

Each script includes automatic path resolution:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
```

This ensures `.env` is always loaded from the project root, no matter where you execute the script.

### Alternative - Original Workflow Test

The original `test-api.sh` in the project root also demonstrates a complete workflow:

```bash
./test-api.sh
```

This script executes:

1. User authentication
2. Project creation with default locale
3. Adding additional locale
4. Creating translation keys
5. Creating LLM translation job
6. Polling job status
7. Viewing translated results

### Feature-Specific Tests

Each feature has its own test suite. Navigate to the feature directory and run:

```bash
# Run all tests for a feature
cd scripts/tests/<feature>
./run-all.sh [REQUIRED_ARGS]

# Run individual test
./test-<specific-test>.sh [REQUIRED_ARGS]
```

### Example Workflow

#### 1. Project Management

```bash
cd scripts/tests/projects

# Create a project (outputs PROJECT_ID)
./test-create-project.sh

# List all projects
./test-list-projects.sh

# Get project details
./test-get-project.sh <PROJECT_ID>

# Update project
./test-update-project.sh <PROJECT_ID>

# Run all project tests
./run-all.sh
```

#### 2. Locale Management

```bash
cd scripts/tests/locales

# List locales (shows default locale)
./test-list-locales.sh <PROJECT_ID>

# Create new locale (outputs LOCALE_ID)
./test-create-locale.sh <PROJECT_ID>

# Update locale label
./test-update-locale.sh <PROJECT_ID> <LOCALE_ID>

# Delete locale
./test-delete-locale.sh <PROJECT_ID> <LOCALE_ID>

# Run all locale tests
./run-all.sh <PROJECT_ID>
```

#### 3. Translation Keys

```bash
cd scripts/tests/keys

# Create key (outputs KEY_ID)
./test-create-key.sh <PROJECT_ID>

# List keys in default language
./test-list-keys-default.sh <PROJECT_ID>

# List keys per language
./test-list-keys-per-language.sh <PROJECT_ID> <LOCALE>

# Delete key
./test-delete-key.sh <PROJECT_ID> <KEY_ID>

# Run all key tests
./run-all.sh <PROJECT_ID>
```

#### 4. Translations

```bash
cd scripts/tests/translations

# Get translation
./test-get-translation.sh <PROJECT_ID> <KEY_ID> <LOCALE>

# Update translation
./test-update-translation.sh <PROJECT_ID> <KEY_ID> <LOCALE>

# Bulk update (used by translation jobs)
./test-bulk-update-translations.sh <PROJECT_ID> <KEY_ID1> <KEY_ID2> <LOCALE>

# Run all translation tests
./run-all.sh <PROJECT_ID> <KEY_ID> <LOCALE>
```

#### 5. Translation Jobs

```bash
cd scripts/tests/translation-jobs

# Create translation job (outputs JOB_ID)
./test-create-translation-job.sh <PROJECT_ID> <TARGET_LOCALE>

# With specific keys
./test-create-translation-job.sh <PROJECT_ID> <TARGET_LOCALE> selected "key1,key2,key3"

# List translation jobs
./test-list-translation-jobs.sh <PROJECT_ID>

# Check for active job
./test-get-active-job.sh <PROJECT_ID>

# List job items (detailed status)
./test-list-job-items.sh <JOB_ID>

# Cancel job
./test-cancel-job.sh <PROJECT_ID> <JOB_ID>

# Run all translation job tests
./run-all.sh <PROJECT_ID> <TARGET_LOCALE>
```

#### 6. Export

```bash
cd scripts/tests/export

# Export translations as ZIP
./test-export-translations.sh <PROJECT_ID>

# Run export test
./run-all.sh <PROJECT_ID>
```

#### 7. Telemetry

```bash
cd scripts/tests/telemetry

# List telemetry events
./test-list-telemetry-events.sh <PROJECT_ID>

# Run telemetry test
./run-all.sh <PROJECT_ID>
```

## Script Conventions

### Style Guide

All scripts follow a consistent format:

- Shebang: `#!/bin/bash`
- Error handling: `set -e` (exit on error)
- Environment variable loading from `.env`
- Color-coded output (green = success, blue = info, yellow = warning, red = error)
- Helper functions: `print_step()`, `print_success()`, `print_info()`, `print_error()`
- Authentication step included in each script
- JSON response formatting with `python3 -m json.tool`

### Output Format

Scripts provide:

1. Clear step headers with visual separators
2. Input parameter echoing
3. Formatted JSON responses
4. Success/failure indicators
5. Extracted IDs for use in dependent scripts
6. Export statements for ID reuse (e.g., `export PROJECT_ID=...`)

### Error Handling

- All scripts use `set -e` to exit on first error
- Authentication failures halt execution
- Missing required arguments show usage instructions
- Non-zero exit codes indicate failure

## Testing Strategy

### What These Tests Cover

- **Happy paths**: Successful operations with valid data
- **CRUD operations**: Create, Read, Update, Delete for all entities
- **Atomic operations**: RPC functions for multi-step operations
- **Edge Functions**: Asynchronous jobs and file generation
- **Authentication**: All requests include auth token
- **Validation**: Automatic via Zod schemas and database constraints

### What These Tests Don't Cover

- **Error cases**: Invalid data, permission errors, conflicts
- **Concurrent operations**: Race conditions, optimistic locking failures
- **Performance**: Load testing, stress testing
- **Edge cases**: Boundary values, malformed input

### Future Enhancements

Consider adding:

- Error case tests (400, 401, 403, 404, 409, 422 responses)
- Load testing with concurrent requests
- Automated test runner with pass/fail reporting
- CI/CD integration
- Test data cleanup scripts

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure `.env` file exists with correct credentials
   - Verify user email is confirmed
   - Check Supabase is running (`npm run supabase:start`)

2. **Edge Function Errors**
   - Deploy functions: `supabase functions deploy <function-name>`
   - Check function logs: `supabase functions logs <function-name>`
   - Verify `OPENROUTER_API_KEY` is set

3. **Permission Denied**
   - Scripts not executable: `chmod +x scripts/tests/**/*.sh`
   - RLS policies: Verify user owns resources

4. **Empty Responses**
   - Check resource IDs are correct
   - Verify project ownership
   - Ensure resources exist

### Debug Mode

Enable verbose curl output:

```bash
# Add -v flag to curl commands in scripts
curl -v -X POST ...
```

## API Endpoint Reference

### PostgREST Endpoints

- `GET /rest/v1/projects` - List projects
- `POST /rest/v1/rpc/create_project_with_default_locale` - Create project
- `PATCH /rest/v1/projects` - Update project
- `DELETE /rest/v1/projects` - Delete project

### Edge Functions

- `POST /functions/v1/translate` - Create translation job
- `POST /functions/v1/export-translations` - Export translations

### Authentication

- `POST /auth/v1/signup` - Create user
- `POST /auth/v1/token?grant_type=password` - Sign in

## Contributing

When adding new tests:

1. Follow the established naming convention: `test-<action>-<entity>.sh`
2. Include all helper functions and color output
3. Add proper error handling and validation
4. Update feature README.md with script description
5. Update `run-all.sh` to include new test
6. Make script executable: `chmod +x <script>.sh`

## License

This test suite is part of the i18n-mate project.
