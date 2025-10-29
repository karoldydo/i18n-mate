# Error Handling Architecture

This document describes the comprehensive error handling system in i18n-mate, including database error codes, frontend constants, and the mapping between them.

## Overview

i18n-mate uses a **structured error format** for all database-raised errors, enabling reliable parsing and user-friendly error messages in the frontend. All errors follow a consistent pattern introduced in migration `20251028000000_standardize_error_handling.sql`.

## Structured Error Format

All database errors use the following format:

```sql
RAISE EXCEPTION 'Human-readable message'
USING ERRCODE = 'PostgreSQL_error_code',
      DETAIL = 'error_code:ERROR_NAME,field:field_name,additional:metadata',
      HINT = 'Helpful suggestion for the user';
```

### Components

1. **Exception Message**: Human-readable description (for logs)
2. **ERRCODE**: PostgreSQL standard error code
3. **DETAIL**: Structured metadata in `key:value,key:value` format
   - Always starts with `error_code:ERROR_NAME`
   - Additional fields provide context (field names, values, constraints)
4. **HINT**: Optional user-facing suggestion for resolution

### Example

```sql
RAISE EXCEPTION 'Locale already exists for this project'
USING ERRCODE = '23505',
      DETAIL = 'error_code:DUPLICATE_LOCALE,field:locale,value:en-US',
      HINT = 'Each locale can only be added once per project';
```

## PostgreSQL Error Codes

| Code  | Category               | Description                                |
| ----- | ---------------------- | ------------------------------------------ |
| 23503 | FOREIGN_KEY_VIOLATION  | Referenced resource does not exist         |
| 23505 | UNIQUE_VIOLATION       | Duplicate value violates unique constraint |
| 23514 | CHECK_VIOLATION        | Value violates check constraint            |
| 42501 | INSUFFICIENT_PRIVILEGE | Insufficient permissions (RLS policy)      |
| 50000 | INTERNAL_ERROR         | Application-defined business logic error   |
| P0001 | RAISE_EXCEPTION        | Generic raise exception (default)          |

## Error Catalog

### Authentication & Authorization Errors

| Error Code              | PG Code | Source                         | Frontend Constant         | Description                   |
| ----------------------- | ------- | ------------------------------ | ------------------------- | ----------------------------- |
| AUTHENTICATION_REQUIRED | 42501   | RLS policies, RPC functions    | `AUTHENTICATION_REQUIRED` | User must be authenticated    |
| PROJECT_ACCESS_DENIED   | 42501   | RLS policies, atomic functions | `PROJECT_ACCESS_DENIED`   | User does not own the project |
| INSUFFICIENT_PRIVILEGE  | 42501   | RLS policies                   | `INSUFFICIENT_PRIVILEGE`  | Generic permission denied     |

### Project Errors

| Error Code                   | PG Code | Source                             | Frontend Constant              | Description                          |
| ---------------------------- | ------- | ---------------------------------- | ------------------------------ | ------------------------------------ |
| PROJECT_CREATION_FAILED      | 50000   | create_project_with_default_locale | `PROJECT_CREATION_FAILED`      | Failed to create project             |
| DUPLICATE_PROJECT_NAME       | 23505   | UNIQUE constraint                  | `PROJECT_NAME_EXISTS`          | Project name already exists for user |
| DUPLICATE_PROJECT_PREFIX     | 23505   | UNIQUE constraint                  | `PREFIX_ALREADY_IN_USE`        | Prefix already in use by user        |
| DUPLICATE_CONSTRAINT         | 23505   | create_project_with_default_locale | `DUPLICATE_CONSTRAINT`         | Generic duplicate violation          |
| DEFAULT_LOCALE_IMMUTABLE     | 23514   | prevent_default_locale_change()    | `DEFAULT_LOCALE_IMMUTABLE`     | Cannot change default locale         |
| PREFIX_IMMUTABLE             | 23514   | prevent_prefix_change()            | `PREFIX_IMMUTABLE`             | Cannot change prefix after creation  |
| DEFAULT_LOCALE_CANNOT_DELETE | 23514   | prevent_default_locale_delete()    | `DEFAULT_LOCALE_CANNOT_DELETE` | Cannot delete default locale         |

### Locale Errors

| Error Code               | PG Code | Source                                    | Frontend Constant          | Description                         |
| ------------------------ | ------- | ----------------------------------------- | -------------------------- | ----------------------------------- |
| DUPLICATE_LOCALE         | 23505   | UNIQUE constraint                         | `DUPLICATE_LOCALE`         | Locale already exists in project    |
| INVALID_FORMAT           | 23514   | validate_locale_format_strict()           | `INVALID_FORMAT`           | Locale not in BCP-47 format         |
| INVALID_LOCALE_FORMAT    | 23514   | create_project_locale_atomic()            | `INVALID_FORMAT`           | Locale not in BCP-47 format         |
| TOO_LONG                 | 23514   | validate_locale_format_strict()           | `TOO_LONG`                 | Locale code exceeds 8 characters    |
| INVALID_CHARACTERS       | 23514   | validate_locale_format_strict()           | `INVALID_CHARACTERS`       | Non-alphabetic characters in locale |
| TOO_MANY_DASHES          | 23514   | validate_locale_format_strict()           | `TOO_MANY_DASHES`          | More than one dash in locale code   |
| LOCALE_IS_LANGUAGE_NAME  | 23514   | validate_locale_format_strict()           | `LOCALE_IS_LANGUAGE_NAME`  | Used language name instead of code  |
| FIELD_REQUIRED           | 23514   | create_project_locale_atomic              | `FIELD_REQUIRED`           | Required field is missing           |
| MAX_LENGTH_EXCEEDED      | 23514   | create_project_locale_atomic              | `MAX_LENGTH_EXCEEDED`      | Field exceeds maximum length        |
| LOCALE_NOT_FOUND         | 23514   | ensure_default_locale_exists()            | `LOCALE_NOT_FOUND`         | Locale does not exist in project    |
| DEFAULT_LOCALE_DUPLICATE | 23505   | prevent_default_locale_duplicate_insert() | `DEFAULT_LOCALE_DUPLICATE` | Attempted to re-add default locale  |

### Key Errors

| Error Code         | PG Code | Source                | Frontend Constant    | Description                           |
| ------------------ | ------- | --------------------- | -------------------- | ------------------------------------- |
| KEY_INVALID_PREFIX | 23514   | validate_key_prefix() | `KEY_INVALID_PREFIX` | Key doesn't start with project prefix |

### Translation Errors

| Error Code                 | PG Code | Source                                  | Frontend Constant            | Description                           |
| -------------------------- | ------- | --------------------------------------- | ---------------------------- | ------------------------------------- |
| DEFAULT_VALUE_EMPTY        | 23514   | validate_default_locale_value()         | `DEFAULT_VALUE_EMPTY`        | Default locale value cannot be empty  |
| FANOUT_FAILED              | 50000   | fan_out_translations_on_key_insert()    | `FANOUT_FAILED`              | Failed to create translations for key |
| FANOUT_INCOMPLETE          | 50000   | fan_out_translations_on_locale_insert() | `FANOUT_INCOMPLETE`          | Translation initialization incomplete |
| FANOUT_VERIFICATION_FAILED | 50000   | create_project_locale_atomic            | `FANOUT_VERIFICATION_FAILED` | Fan-out verification failed           |

### Translation Job Errors

| Error Code               | PG Code | Source                              | Frontend Constant          | Description                        |
| ------------------------ | ------- | ----------------------------------- | -------------------------- | ---------------------------------- |
| ACTIVE_JOB_EXISTS        | 23505   | prevent_multiple_active_jobs()      | `ACTIVE_JOB_EXISTS`        | Another job is already active      |
| TARGET_LOCALE_IS_DEFAULT | 23514   | validate_source_locale_is_default() | `TARGET_LOCALE_IS_DEFAULT` | Cannot translate to default locale |

### Generic Errors

| Error Code       | PG Code | Source             | Frontend Constant  | Description                         |
| ---------------- | ------- | ------------------ | ------------------ | ----------------------------------- |
| DATABASE_ERROR   | N/A     | Generic catch-all  | `DATABASE_ERROR`   | Unhandled database error            |
| UNEXPECTED_ERROR | 50000   | Exception handlers | `UNEXPECTED_ERROR` | Unexpected error in atomic function |

## Frontend Error Constants

Frontend error constants are organized by domain in `src/shared/constants/`:

- **projects.constants.ts** - `PROJECTS_ERROR_MESSAGES`
- **locales.constants.ts** - `LOCALE_ERROR_MESSAGES`
- **keys.constants.ts** - `KEYS_ERROR_MESSAGES`
- **translations.constants.ts** - `TRANSLATIONS_ERROR_MESSAGES`
- **translation-jobs.constants.ts** - `TRANSLATION_JOBS_ERROR_MESSAGES`

### Database vs API-Layer Errors

Frontend constants are categorized into two types:

1. **Database-raised errors**: Map directly to structured error codes from migrations
2. **API-layer errors**: Client-side validation only (marked with `// API-layer` comment)

#### Example: projects.constants.ts

```typescript
export const PROJECTS_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  PREFIX_IMMUTABLE: 'Cannot modify prefix after creation',
  INVALID_PROJECT_ID: 'Invalid project ID format', // API-layer
  PREFIX_REQUIRED: 'Project prefix is required',
} as const;
```

## Parsing Errors in Frontend

### Error Detail Format

The DETAIL field uses a comma-separated `key:value` format:

```markdown
error_code:DUPLICATE_LOCALE,field:locale,value:en-US
```

### Parsing Algorithm

```typescript
function parseErrorDetail(detail: string): Record<string, string> {
  const pairs = detail.split(',');
  return Object.fromEntries(
    pairs.map((pair) => {
      const [key, ...values] = pair.split(':');
      return [key, values.join(':')]; // Handle values with colons
    })
  );
}

// Usage
const parsed = parseErrorDetail('error_code:DUPLICATE_LOCALE,field:locale,value:en-US');
// { error_code: 'DUPLICATE_LOCALE', field: 'locale', value: 'en-US' }
```

## Migration Template

When creating new migrations with custom errors, follow this template:

```sql
-- =====================================================================
-- migration: [description]
-- description: [what this migration does]
-- affected: [tables/functions affected]
-- =====================================================================

CREATE OR REPLACE FUNCTION your_function_name()
RETURNS TRIGGER AS $$
DECLARE
  v_variable_name TYPE;
BEGIN
  -- Your logic here

  -- Error condition
  IF [condition] THEN
    RAISE EXCEPTION 'Human-readable message'
    USING ERRCODE = '[PostgreSQL error code]',
          DETAIL = 'error_code:[ERROR_CODE],field:[field_name],additional:[metadata]',
          HINT = 'User-facing suggestion for resolution';
  END IF;

  RETURN NEW; -- or OLD for BEFORE DELETE triggers
END;
$$ LANGUAGE plpgsql;
```

### Error Code Guidelines

1. **Error code names**: SCREAMING_SNAKE_CASE
2. **ERRCODE values**:
   - `23505` for duplicates (UNIQUE violations)
   - `23514` for validation (CHECK violations)
   - `23503` for missing references (FK violations)
   - `42501` for authorization (RLS policy)
   - `50000` for business logic errors
3. **DETAIL format**: Always start with `error_code:ERROR_NAME`
4. **Additional metadata**: Include field names, values, and context
5. **HINT text**: Provide actionable guidance for users

### Frontend Constant Checklist

When adding a new database error:

1. Add error code to appropriate `*_ERROR_MESSAGES` constant
2. Place it in the "Database-raised errors" section
3. Add comment with structured error code name if different
4. Update this ERRORS.md document with the mapping
5. Test error handling in the UI

## Constraint Naming Conventions

Database constraints follow consistent naming patterns:

- **UNIQUE**: `[table]_[columns]_unique_per_[scope]`
  - Example: `projects_name_unique_per_owner`
- **CHECK**: `[table]_[constraint_purpose]`
  - Example: `keys_no_consecutive_dots`
- **FOREIGN KEY**: `[table]_[column]_fkey`
  - Example: `translations_key_id_fkey`
- **INDEX**: `idx_[table]_[columns]_[type]`
  - Example: `idx_projects_owner_name_unique`

## Best Practices

1. **Always use structured DETAIL format** for database errors
2. **Include HINT text** for user-facing validation errors
3. **Use appropriate PostgreSQL error codes** (23505, 23514, etc.)
4. **Map database errors to frontend constants** for consistent UX
5. **Mark API-layer constants** with `// API-layer` comment
6. **Test error conditions** in both database and frontend
7. **Update this documentation** when adding new error codes
8. **Use consistent error code naming** (SCREAMING_SNAKE_CASE)
