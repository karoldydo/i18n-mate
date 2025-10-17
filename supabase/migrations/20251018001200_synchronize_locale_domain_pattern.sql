-- =====================================================================
-- migration: synchronize locale domain pattern with TypeScript constants
-- description: update locale_code domain to match LOCALE_CODE_DOMAIN_PATTERN
-- notes: ensures exact synchronization between database and TypeScript validation
-- =====================================================================

-- ---------------------------------------------------------------------
-- update locale_code domain constraint
-- ---------------------------------------------------------------------

-- The current domain constraint should match exactly with
-- LOCALE_CODE_DOMAIN_PATTERN = '^[a-z]{2}(-[A-Z]{2})?$'
-- from src/shared/constants/locale.constants.ts

-- Verify current domain constraint (for reference)
-- Current: CHECK (VALUE ~ '^[a-z]{2}(-[A-Z]{2})?$')

-- The pattern is already correct, but add comment for clarity
COMMENT ON DOMAIN locale_code IS
  'BCP-47 locale code: ll or ll-CC format only. '
  'Pattern: ^[a-z]{2}(-[A-Z]{2})?$ '
  'Synchronized with LOCALE_CODE_DOMAIN_PATTERN in TypeScript constants. '
  'Examples: en, en-US, pl, pl-PL. '
  'Normalization handled by normalize_locale_trigger.';

-- ---------------------------------------------------------------------
-- update validation functions to use consistent pattern
-- ---------------------------------------------------------------------

-- Update is_valid_locale_format to match domain exactly
CREATE OR REPLACE FUNCTION is_valid_locale_format(locale_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE AS $$
BEGIN
  -- Input validation
  IF locale_input IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Length check (BCP-47 ll-CC max is 5 characters)
  IF LENGTH(locale_input) > 5 THEN
    RETURN FALSE;
  END IF;

  -- Must match normalized pattern exactly (after potential normalization)
  -- This function expects normalized input
  IF NOT (locale_input ~ '^[a-z]{2}(-[A-Z]{2})?$') THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION is_valid_locale_format IS
  'Validates locale format against exact domain pattern: ^[a-z]{2}(-[A-Z]{2})?$ '
  'Expects normalized input (language lowercase, country uppercase). '
  'Synchronized with LOCALE_CODE_PATTERN in TypeScript constants.';

-- ---------------------------------------------------------------------
-- add validation function for pre-normalization input
-- ---------------------------------------------------------------------

-- Function to validate input before normalization (allows mixed case)
CREATE OR REPLACE FUNCTION is_valid_locale_input(locale_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE AS $$
BEGIN
  -- Input validation
  IF locale_input IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Length check
  IF LENGTH(locale_input) > 5 THEN
    RETURN FALSE;
  END IF;

  -- Allow mixed case input (will be normalized by triggers)
  -- This matches LOCALE_CODE_INPUT_PATTERN from TypeScript constants
  IF NOT (locale_input ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') THEN
    RETURN FALSE;
  END IF;

  -- Reject patterns with multiple dashes or invalid characters
  IF locale_input ~ '.*-.*-.*' THEN
    RETURN FALSE;
  END IF;

  IF locale_input ~ '[^a-zA-Z-]' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION is_valid_locale_input IS
  'Validates raw locale input before normalization. Pattern: ^[a-zA-Z]{2}(-[a-zA-Z]{2})?$ '
  'Accepts mixed case (En-Us, en-us, EN-GB) that will be normalized by triggers. '
  'Synchronized with LOCALE_CODE_INPUT_PATTERN in TypeScript constants.';