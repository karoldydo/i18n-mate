# Export API Tests

Tests for translation export endpoint corresponding to `src/features/export/api/` hooks.

## Overview

This script tests the export functionality that generates a ZIP archive containing i18next-compatible JSON files for all project locales.

## Test Scripts

| Script                        | Hook Tested             | Description                                                                                                                     |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `test-export-translations.sh` | `useExportTranslations` | Exports project translations as ZIP via `/functions/v1/export-translations` Edge Function; downloads file and verifies contents |

## Running Tests

### Individual Test

```bash
# Export translations (downloads ZIP file)
./test-export-translations.sh <PROJECT_ID>
```

### All Tests

```bash
./run-all.sh <PROJECT_ID>
```

The `run-all.sh` script executes the export test:

1. Calls the export Edge Function
2. Downloads the ZIP archive
3. Verifies file size and contents
4. Lists files in the archive

## Requirements

- Existing project with translations (use `../projects/test-create-project.sh`, `../keys/test-create-key.sh` first)
- Supabase instance running with Edge Functions deployed
- `.env` file with required variables
- Authenticated user with confirmed email
- `curl`, `python3`, and `unzip` installed
- Write permissions in current directory (for ZIP file)

## Notes

- Exports all locales for the project
- Each locale generates a `{locale}.json` file (e.g., `en.json`, `pl.json`)
- Files are formatted as i18next-compatible nested JSON objects
- ZIP filename: `export-{projectId}-{timestamp}.zip`
- Only non-NULL translation values are included in export
- Respects Content-Disposition header from server if present
- HTTP 200 indicates successful export
- Common errors: 400 (invalid project), 401 (auth required), 404 (not found), 500 (generation failed)
