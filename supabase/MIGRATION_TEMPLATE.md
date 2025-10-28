# Migration Template

This template provides the standard structure for creating new database migrations with proper error handling.

## File Naming Convention

```markdown
YYYYMMDDHHMMSS_descriptive_name.sql
```

Example: `20251028120000_add_user_preferences.sql`

## Template Structure

```sql
-- =====================================================================
-- migration: [Short descriptive title]
-- description: [Detailed description of what this migration does]
-- tables affected: [List of tables/views/functions affected]
-- notes: [Any important notes about this migration]
-- =====================================================================

-- =====================================================================
-- PART 1: [Section name, e.g., CREATE TABLES]
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. [Specific change description]
-- ---------------------------------------------------------------------

[Your SQL code here]

-- ---------------------------------------------------------------------
-- 2. [Next specific change]
-- ---------------------------------------------------------------------

[Your SQL code here]

-- =====================================================================
-- PART 2: [Next section]
-- =====================================================================

-- [Continue with additional sections as needed]

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
```

## Error Handling Template

### Trigger Function with Structured Errors

```sql
CREATE OR REPLACE FUNCTION your_validation_function()
RETURNS TRIGGER AS $$
DECLARE
  v_variable_name TYPE;
BEGIN
  -- Your validation logic here

  -- Example: Check for required field
  IF NEW.field_name IS NULL OR LENGTH(TRIM(NEW.field_name)) = 0 THEN
    RAISE EXCEPTION 'Field is required'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:FIELD_REQUIRED,field:field_name',
          HINT = 'This field cannot be empty';
  END IF;

  -- Example: Check for max length
  IF LENGTH(NEW.field_name) > 64 THEN
    RAISE EXCEPTION 'Field exceeds maximum length'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:MAX_LENGTH_EXCEEDED,field:field_name,max_length:64,actual_length:' || LENGTH(NEW.field_name),
          HINT = 'Maximum length is 64 characters';
  END IF;

  -- Example: Check for duplicate
  IF EXISTS (SELECT 1 FROM table_name WHERE field = NEW.field AND id != NEW.id) THEN
    RAISE EXCEPTION 'Value already exists'
    USING ERRCODE = '23505',
          DETAIL = 'error_code:DUPLICATE_VALUE,field:field_name,value:' || NEW.field_name,
          HINT = 'This value is already in use';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER your_trigger_name
  BEFORE INSERT OR UPDATE OF field_name ON table_name
  FOR EACH ROW EXECUTE FUNCTION your_validation_function();
```

### RPC Function with Structured Errors

```sql
CREATE OR REPLACE FUNCTION your_rpc_function(
  p_param1 UUID,
  p_param2 TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id UUID;
  v_result_count INTEGER;
BEGIN
  -- Authentication check
  v_owner_user_id := auth.uid();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
    USING ERRCODE = '42501',
          DETAIL = 'error_code:AUTHENTICATION_REQUIRED',
          HINT = 'You must be logged in to perform this action';
  END IF;

  -- Authorization check
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_param1 AND owner_user_id = v_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied'
    USING ERRCODE = '42501',
          DETAIL = 'error_code:PROJECT_ACCESS_DENIED,project_id:' || p_param1,
          HINT = 'You do not have permission to access this project';
  END IF;

  -- Your business logic here
  RETURN QUERY
  SELECT t.id, t.name
  FROM table_name t
  WHERE t.project_id = p_param1;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Unexpected error occurred'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:UNEXPECTED_ERROR,original_error:' || SQLERRM,
          HINT = 'Please try again or contact support if the issue persists';
END;
$$;
```

### Atomic Transaction Function

```sql
CREATE OR REPLACE FUNCTION your_atomic_function(
  p_param1 UUID,
  p_param2 TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id UUID;
  v_result_id UUID;
  v_record_count INTEGER;
BEGIN
  -- All operations within this function are atomic (transaction)

  -- Step 1: Validate and authenticate
  v_owner_user_id := auth.uid();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
    USING ERRCODE = '42501',
          DETAIL = 'error_code:AUTHENTICATION_REQUIRED';
  END IF;

  -- Step 2: Create main record
  INSERT INTO table_name (owner_id, name)
  VALUES (v_owner_user_id, p_param2)
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create record'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:CREATION_FAILED,table:table_name',
          HINT = 'The system failed to create the record';
  END IF;

  -- Step 3: Create related records
  INSERT INTO related_table (parent_id, value)
  SELECT v_result_id, value
  FROM some_source;

  GET DIAGNOSTICS v_record_count = ROW_COUNT;

  -- Step 4: Verify related records were created
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'Failed to create related records'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:RELATED_CREATION_FAILED,parent_id:' || v_result_id,
          HINT = 'The system failed to create related records';
  END IF;

  -- Return the created ID
  RETURN v_result_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle specific PostgreSQL error codes
    RAISE EXCEPTION 'Duplicate value detected'
    USING ERRCODE = '23505',
          DETAIL = 'error_code:DUPLICATE_CONSTRAINT',
          HINT = 'A record with these values already exists';

  WHEN OTHERS THEN
    -- Generic catch-all
    RAISE EXCEPTION 'Unexpected error occurred'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:UNEXPECTED_ERROR,original_error:' || SQLERRM;
END;
$$;
```

## Error Code Reference

### PostgreSQL Error Codes (ERRCODE)

| Code  | Constant               | Usage                                |
| ----- | ---------------------- | ------------------------------------ |
| 23503 | FOREIGN_KEY_VIOLATION  | Referenced resource not found        |
| 23505 | UNIQUE_VIOLATION       | Duplicate value in unique constraint |
| 23514 | CHECK_VIOLATION        | Value violates check constraint      |
| 42501 | INSUFFICIENT_PRIVILEGE | Authorization/RLS policy failure     |
| 50000 | INTERNAL_ERROR         | Business logic errors                |
| P0001 | RAISE_EXCEPTION        | Generic exception (default)          |

### Error Code Naming Conventions

1. **Format**: SCREAMING_SNAKE_CASE
2. **Pattern**: `[SUBJECT]_[CONDITION]`
3. **Examples**:
   - `DUPLICATE_LOCALE`
   - `FIELD_REQUIRED`
   - `MAX_LENGTH_EXCEEDED`
   - `AUTHENTICATION_REQUIRED`
   - `PROJECT_ACCESS_DENIED`

### DETAIL Field Format

**Format**: `error_code:ERROR_NAME,field:value,additional:metadata`

**Required**:

- `error_code:ERROR_NAME` - Always first

**Common Optional Fields**:

- `field:field_name` - Which field caused the error
- `value:actual_value` - The problematic value
- `expected:expected_value` - What was expected
- `actual:actual_value` - What was received
- `constraint:constraint_name` - Which constraint was violated
- `max_length:64` - Limit that was exceeded
- `project_id:uuid` - Context identifier

**Examples**:

```sql
-- Simple validation error
DETAIL = 'error_code:FIELD_REQUIRED,field:name'

-- Length validation error
DETAIL = 'error_code:MAX_LENGTH_EXCEEDED,field:label,max_length:64,actual_length:' || LENGTH(NEW.label)

-- Duplicate error with value
DETAIL = 'error_code:DUPLICATE_LOCALE,field:locale,value:' || NEW.locale

-- Authorization error with context
DETAIL = 'error_code:PROJECT_ACCESS_DENIED,project_id:' || p_project_id || ',user_id:' || v_owner_user_id

-- Business logic error with details
DETAIL = 'error_code:FANOUT_INCOMPLETE,locale:' || NEW.locale || ',expected:' || v_expected || ',actual:' || v_actual
```

## Common Patterns

### 1. Immutability Check

```sql
CREATE OR REPLACE FUNCTION prevent_field_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.field_name IS DISTINCT FROM NEW.field_name THEN
    RAISE EXCEPTION 'Field is immutable'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:FIELD_IMMUTABLE,field:field_name',
          HINT = 'This field cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Format Validation

```sql
CREATE OR REPLACE FUNCTION validate_format()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (NEW.field_name ~ '^[a-z0-9_-]+$') THEN
    RAISE EXCEPTION 'Invalid format'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:INVALID_FORMAT,field:field_name,value:' || NEW.field_name,
          HINT = 'Only lowercase letters, numbers, underscores, and hyphens are allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Referential Integrity Check

```sql
CREATE OR REPLACE FUNCTION check_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM referenced_table WHERE id = NEW.foreign_key) THEN
    RAISE EXCEPTION 'Referenced resource not found'
    USING ERRCODE = '23503',
          DETAIL = 'error_code:REFERENCE_NOT_FOUND,field:foreign_key,value:' || NEW.foreign_key,
          HINT = 'The referenced resource does not exist';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. Fan-out Verification

```sql
DECLARE
  v_expected_count INTEGER;
  v_actual_count INTEGER;
BEGIN
  -- Calculate expected count
  SELECT COUNT(*) INTO v_expected_count FROM source_table WHERE ...;

  -- Perform fan-out insert
  INSERT INTO target_table (...) SELECT ... FROM source_table WHERE ...;

  GET DIAGNOSTICS v_actual_count = ROW_COUNT;

  -- Verify
  IF v_actual_count <> v_expected_count THEN
    RAISE EXCEPTION 'Fan-out incomplete'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:FANOUT_INCOMPLETE,expected:' || v_expected_count || ',actual:' || v_actual_count,
          HINT = 'Not all records were created successfully';
  END IF;
END;
```

## Checklist for New Migrations

- [ ] Use proper file naming: `YYYYMMDDHHMMSS_descriptive_name.sql`
- [ ] Include migration header with description and affected tables
- [ ] Use structured error format for all RAISE EXCEPTION statements
- [ ] Include ERRCODE for all errors
- [ ] Include DETAIL with `error_code:ERROR_NAME` for all errors
- [ ] Include HINT text for user-facing errors
- [ ] Follow SCREAMING_SNAKE_CASE for error code names
- [ ] Add error codes to appropriate frontend constants file
- [ ] Update ERRORS.md documentation
- [ ] Test error conditions manually
- [ ] Test rollback if migration is reversible
- [ ] Review SECURITY DEFINER usage (use sparingly)
- [ ] Verify RLS policies are not bypassed unintentionally
- [ ] Check for SQL injection vulnerabilities in dynamic SQL
- [ ] Ensure proper transaction handling in atomic functions

## Frontend Integration

After creating a migration with new error codes:

1. **Add to constants** (`src/shared/constants/[domain].constants.ts`):

   ```typescript
   export const DOMAIN_ERROR_MESSAGES = {
     // Database-raised errors (from migrations)
     YOUR_ERROR_CODE: 'User-friendly message',
     // ... existing errors
   } as const;
   ```

2. **Update error handler** (if needed):

   ```typescript
   function handleDatabaseError(error: PostgrestError): string {
     const detail = error.details || '';
     const parsed = parseErrorDetail(detail);
     const errorCode = parsed.error_code;

     if (errorCode && errorCode in DOMAIN_ERROR_MESSAGES) {
       return DOMAIN_ERROR_MESSAGES[errorCode];
     }

     return DOMAIN_ERROR_MESSAGES.DATABASE_ERROR;
   }
   ```

3. **Update ERRORS.md** with the new error code mapping

## Testing Migrations

### Apply Migration

```bash
npm run supabase:migration
```

### Test Error Conditions

```sql
-- Manual SQL test
BEGIN;
  -- Insert data that should trigger error
  INSERT INTO table_name (field) VALUES ('invalid_value');
  -- Should see structured error with DETAIL field
ROLLBACK;
```

### Rollback (if reversible)

Create a corresponding down migration if the change is reversible:

```sql
-- Example: 20251028120000_add_user_preferences.sql (up)
ALTER TABLE users ADD COLUMN preferences JSONB;

-- Example: 20251028120001_revert_add_user_preferences.sql (down)
ALTER TABLE users DROP COLUMN preferences;
```

## Best Practices

1. **Always use transactions** for complex multi-step operations
2. **Verify fan-out operations** with row count checks
3. **Include helpful HINT text** for all user-facing errors
4. **Use SECURITY DEFINER sparingly** (only when RLS bypass is truly needed)
5. **Set search_path explicitly** in SECURITY DEFINER functions
6. **Test both success and failure paths** before deploying
7. **Document breaking changes** clearly in migration header
8. **Keep migrations idempotent** when possible (use IF NOT EXISTS)
9. **Version control** all migrations (never modify existing migrations)
10. **Update documentation** (ERRORS.md) with new error codes

## Resources

- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [Project ERRORS.md](../ERRORS.md)
- [Project CLAUDE.md](../CLAUDE.md)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-28
