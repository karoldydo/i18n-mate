# Locales API Tests

Tests for locale management endpoints corresponding to `src/features/locales/api/` hooks.

## Overview

These scripts test locale management including listing, creation with automatic translation fan-out, updates, and deletion. All locales are BCP-47 compliant and normalized.

## Test Scripts

| Script                  | Hook Tested              | Description                                                                                                                 |
| ----------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `test-list-locales.sh`  | `useProjectLocales`      | Lists all project locales with `is_default` flag via `list_project_locales_with_default` RPC                                |
| `test-create-locale.sh` | `useCreateProjectLocale` | Creates new locale and automatically creates NULL translations for all existing keys via `create_project_locale_atomic` RPC |
| `test-update-locale.sh` | `useUpdateProjectLocale` | Updates locale label (locale code is immutable)                                                                             |
| `test-delete-locale.sh` | `useDeleteProjectLocale` | Deletes locale and all its translations (cannot delete default locale)                                                      |

## Running Tests

### Individual Tests

```bash
# List locales (requires PROJECT_ID)
./test-list-locales.sh <PROJECT_ID>

# Create locale (outputs LOCALE_ID)
./test-create-locale.sh <PROJECT_ID>

# Update locale (requires PROJECT_ID and LOCALE_ID)
./test-update-locale.sh <PROJECT_ID> <LOCALE_ID>

# Delete locale (requires PROJECT_ID and LOCALE_ID)
./test-delete-locale.sh <PROJECT_ID> <LOCALE_ID>
```

### All Tests in Sequence

```bash
./run-all.sh <PROJECT_ID>
```

The `run-all.sh` script executes all tests in the proper order:

1. Lists project locales (showing default locale)
2. Creates a new locale (Polish)
3. Updates the locale label
4. Deletes the locale

## Requirements

- Existing project (use `../projects/test-create-project.sh` first)
- Supabase instance running (local or remote)
- `.env` file with required variables
- Authenticated user with confirmed email
- `curl` and `python3` installed

## Notes

- Locale codes are BCP-47 compliant and normalized (language lowercase, region uppercase)
- Creating a locale triggers fan-out: NULL translations created for all existing keys
- Default locale cannot be deleted (422 error)
- Locale codes are immutable after creation (only label can be updated)
- Deleting a locale cascades to all translations for that locale
