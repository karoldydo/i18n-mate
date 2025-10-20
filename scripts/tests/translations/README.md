# Translations API Tests

Tests for translation management endpoints corresponding to `src/features/translations/api/` hooks.

## Overview

These scripts test translation CRUD operations including retrieval, updates with optimistic locking, and bulk updates used by translation jobs.

## Test Scripts

| Script                             | Hook Tested                 | Description                                                                    |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| `test-get-translation.sh`          | `useTranslation`            | Retrieves single translation record for key-locale combination                 |
| `test-update-translation.sh`       | `useUpdateTranslation`      | Updates translation value with optimistic locking and metadata tracking        |
| `test-bulk-update-translations.sh` | `useBulkUpdateTranslations` | Updates multiple translations atomically (used internally by translation jobs) |

## Running Tests

### Individual Tests

```bash
# Get translation (requires PROJECT_ID, KEY_ID, and LOCALE)
./test-get-translation.sh <PROJECT_ID> <KEY_ID> <LOCALE>

# Update translation (requires PROJECT_ID, KEY_ID, and LOCALE)
./test-update-translation.sh <PROJECT_ID> <KEY_ID> <LOCALE> [NEW_VALUE]

# Bulk update translations (requires PROJECT_ID, two KEY_IDs, and LOCALE)
./test-bulk-update-translations.sh <PROJECT_ID> <KEY_ID1> <KEY_ID2> <LOCALE>
```

### All Tests in Sequence

```bash
./run-all.sh <PROJECT_ID> <KEY_ID> <LOCALE>
```

The `run-all.sh` script executes basic translation tests:

1. Gets a translation record
2. Updates the translation value

Note: Bulk update test is separate as it requires multiple KEY_IDs and is typically used by translation job Edge Functions.

## Requirements

- Existing project with keys and locales (use `../projects/test-create-project.sh` and `../keys/test-create-key.sh` first)
- Supabase instance running (local or remote)
- `.env` file with required variables
- Authenticated user with confirmed email
- `curl` and `python3` installed

## Notes

- Translation values are limited to 250 characters, no newlines
- Empty strings are auto-converted to NULL (except default locale)
- Default locale values cannot be NULL or empty (enforced by trigger)
- Updates include optimistic locking via `updated_at` timestamp to prevent concurrent edit conflicts
- Metadata tracked: `is_machine_translated`, `updated_source`, `updated_by`
- Bulk updates are atomic operations used by translation job Edge Functions
- Updates trigger `updated_at` timestamp automatically
