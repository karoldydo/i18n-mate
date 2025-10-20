# Keys API Tests

Tests for translation key management endpoints corresponding to `src/features/keys/api/` hooks.

## Overview

These scripts test translation key management including creation with automatic NULL translation fan-out, listing in different views (default language and per-language), and deletion.

## Test Scripts

| Script                           | Hook Tested              | Description                                                                                                                         |
| -------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `test-list-keys-default.sh`      | `useKeysDefaultView`     | Lists keys in default language with missing translation counts via `list_keys_default_view` RPC; supports search and missing filter |
| `test-list-keys-per-language.sh` | `useKeysPerLanguageView` | Lists keys for specific locale with translation values and metadata via `list_keys_per_language_view` RPC                           |
| `test-create-key.sh`             | `useCreateKey`           | Creates key in default language via `create_key_with_value` RPC; auto-creates NULL translations for other locales                   |
| `test-delete-key.sh`             | `useDeleteKey`           | Deletes key and all its translations (cascading delete)                                                                             |

## Running Tests

### Individual Tests

```bash
# List keys in default view (requires PROJECT_ID)
./test-list-keys-default.sh <PROJECT_ID> [SEARCH_QUERY] [MISSING_ONLY]

# List keys per language (requires PROJECT_ID and LOCALE)
./test-list-keys-per-language.sh <PROJECT_ID> <LOCALE> [SEARCH_QUERY] [MISSING_ONLY]

# Create key (outputs KEY_ID)
./test-create-key.sh <PROJECT_ID> [FULL_KEY] [DEFAULT_VALUE]

# Delete key (requires PROJECT_ID and KEY_ID)
./test-delete-key.sh <PROJECT_ID> <KEY_ID>
```

### All Tests in Sequence

```bash
./run-all.sh <PROJECT_ID>
```

The `run-all.sh` script executes all tests in the proper order:

1. Lists keys in default language view
2. Creates a new key with default value
3. Lists keys per language view (English)
4. Deletes the key

## Requirements

- Existing project with default locale (use `../projects/test-create-project.sh` first)
- Supabase instance running (local or remote)
- `.env` file with required variables
- Authenticated user with confirmed email
- `curl` and `python3` installed

## Notes

- Key format: `[a-z0-9._-]`, max 256 chars, no consecutive dots, no trailing dot
- Keys must be unique per project and include project prefix
- Creating a key triggers fan-out: NULL translations created for all non-default locales
- Default language value cannot be NULL or empty
- Deleting a key cascades to all translations
- List views support pagination (limit 1-100, offset-based)
- Search is case-insensitive and matches against full_key
- Missing filter shows only keys with incomplete translations
