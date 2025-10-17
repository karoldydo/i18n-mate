-- =====================================================================
-- migration: enhanced atomic function with proper error codes
-- description: update create_project_locale_atomic with structured error codes
-- functions updated: create_project_locale_atomic
-- notes: implements FANOUT_VERIFICATION_FAILED and FANOUT_INCOMPLETE error codes
-- =====================================================================

-- ---------------------------------------------------------------------
-- enhanced create_project_locale_atomic function
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_project_locale_atomic(
  p_project_id UUID,
  p_locale TEXT,
  p_label TEXT
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  locale TEXT,
  label TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_locale_id UUID;
  v_owner_user_id UUID;
  v_key_count INTEGER;
  v_expected_translations INTEGER;
  v_actual_translations INTEGER;
  v_normalized_locale locale_code;
BEGIN
  -- Authentication check
  v_owner_user_id := auth.uid();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
    USING ERRCODE = '42501',
          DETAIL = 'error_code:AUTHENTICATION_REQUIRED';
  END IF;

  -- Project ownership validation
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND owner_user_id = v_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied'
    USING ERRCODE = '42501',
          DETAIL = 'error_code:PROJECT_ACCESS_DENIED';
  END IF;

  -- Validate and normalize locale format
  BEGIN
    -- Normalize locale before domain conversion
    v_normalized_locale := CASE
      WHEN p_locale ~ '^[a-zA-Z]{2}-[a-zA-Z]{2}$' THEN
        lower(substring(p_locale from 1 for 2)) || '-' || upper(substring(p_locale from 4 for 2))
      WHEN p_locale ~ '^[a-zA-Z]{2}$' THEN
        lower(p_locale)
      ELSE
        p_locale::locale_code -- This will fail domain check if invalid
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid locale format: "%". Must be ll or ll-CC format (e.g., "en", "en-US")', p_locale
    USING ERRCODE = '23514',
          DETAIL = 'error_code:INVALID_LOCALE_FORMAT,field:p_locale,constraint:locale_format';
  END;

  -- Validate label length
  IF p_label IS NULL OR LENGTH(TRIM(p_label)) = 0 THEN
    RAISE EXCEPTION 'Label is required'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:FIELD_REQUIRED,field:p_label';
  END IF;

  IF LENGTH(p_label) > 64 THEN
    RAISE EXCEPTION 'Label must be at most 64 characters'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:MAX_LENGTH_EXCEEDED,field:p_label,constraint:max_length,max_length:64';
  END IF;

  -- Check for duplicate locale
  IF EXISTS (
    SELECT 1 FROM project_locales
    WHERE project_id = p_project_id AND locale = v_normalized_locale
  ) THEN
    RAISE EXCEPTION 'Locale already exists for this project'
    USING ERRCODE = '23505',
          DETAIL = 'error_code:DUPLICATE_LOCALE,field:p_locale';
  END IF;

  -- Get current key count for fan-out verification
  SELECT COUNT(*) INTO v_key_count
  FROM keys WHERE project_id = p_project_id;

  -- Insert the locale (triggers will handle fan-out)
  BEGIN
    INSERT INTO project_locales (project_id, locale, label)
    VALUES (p_project_id, v_normalized_locale, TRIM(p_label))
    RETURNING project_locales.id INTO v_locale_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Locale already exists for this project'
      USING ERRCODE = '23505',
            DETAIL = 'error_code:DUPLICATE_LOCALE,field:p_locale';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create locale: %', SQLERRM
      USING ERRCODE = '50000',
            DETAIL = 'error_code:LOCALE_CREATION_FAILED';
  END;

  -- Fan-out verification (only if there are existing keys)
  IF v_key_count > 0 THEN
    -- Wait a moment for triggers to complete
    PERFORM pg_sleep(0.1);

    -- Calculate expected translations (all keys × 1 locale)
    v_expected_translations := v_key_count;

    -- Count actual translations created
    SELECT COUNT(*) INTO v_actual_translations
    FROM translations
    WHERE project_id = p_project_id
      AND locale = v_normalized_locale;

    -- Verify fan-out completeness
    IF v_actual_translations = 0 THEN
      -- Rollback the locale creation
      DELETE FROM project_locales WHERE id = v_locale_id;

      RAISE EXCEPTION 'Failed to initialize translations for new locale'
      USING ERRCODE = '50000',
            DETAIL = 'error_code:FANOUT_VERIFICATION_FAILED,locale:' || v_normalized_locale || ',key_count:' || v_key_count;
    END IF;

    IF v_actual_translations < v_expected_translations THEN
      -- Rollback the locale creation
      DELETE FROM project_locales WHERE id = v_locale_id;

      RAISE EXCEPTION 'Incomplete translation initialization'
      USING ERRCODE = '50000',
            DETAIL = 'error_code:FANOUT_INCOMPLETE,expected:' || v_expected_translations || ',actual:' || v_actual_translations || ',locale:' || v_normalized_locale;
    END IF;
  END IF;

  -- Return the created locale
  RETURN QUERY
  SELECT
    pl.id,
    pl.project_id,
    pl.locale::TEXT,
    pl.label,
    pl.created_at,
    pl.updated_at
  FROM project_locales pl
  WHERE pl.id = v_locale_id;

EXCEPTION
  -- Re-raise our custom exceptions as-is
  WHEN SQLSTATE '42501' OR SQLSTATE '23514' OR SQLSTATE '23505' OR SQLSTATE '50000' THEN
    RAISE;
  -- Catch any other unexpected errors
  WHEN OTHERS THEN
    RAISE EXCEPTION 'An unexpected error occurred during locale creation: %', SQLERRM
    USING ERRCODE = '50000',
          DETAIL = 'error_code:UNEXPECTED_ERROR,original_error:' || SQLERRM;
END;
$$;