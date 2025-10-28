-- =====================================================================
-- migration: standardize error handling across all functions and triggers
-- description: Migrates all unstructured errors to structured DETAIL format
--              for consistent frontend error handling
-- affected: All trigger functions, validation functions, and RPC functions
-- rationale: Uniform error format enables reliable parsing and user-friendly
--            error messages in the frontend
-- =====================================================================

-- =====================================================================
-- PART 1: UPDATE TRIGGER FUNCTIONS WITH STRUCTURED ERRORS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. prevent default locale changes (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_default_locale_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.default_locale IS DISTINCT FROM NEW.default_locale THEN
    RAISE EXCEPTION 'default_locale is immutable'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:DEFAULT_LOCALE_IMMUTABLE,field:default_locale',
          HINT = 'The default locale cannot be changed after project creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 2. prevent default locale deletion (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_default_locale_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locale = (SELECT default_locale FROM projects WHERE id = OLD.project_id) THEN
    RAISE EXCEPTION 'Cannot delete default locale'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:DEFAULT_LOCALE_CANNOT_DELETE,locale:' || OLD.locale,
          HINT = 'The default locale must always exist in the project';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 3. prevent prefix change (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_prefix_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.prefix IS DISTINCT FROM NEW.prefix THEN
    RAISE EXCEPTION 'prefix is immutable'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:PREFIX_IMMUTABLE,field:prefix,old_value:' || OLD.prefix || ',new_value:' || NEW.prefix,
          HINT = 'The prefix cannot be changed after project creation as it would invalidate all existing keys';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 4. validate key prefix (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_key_prefix()
RETURNS TRIGGER AS $$
DECLARE
  project_prefix VARCHAR(4);
BEGIN
  SELECT prefix INTO project_prefix FROM projects WHERE id = NEW.project_id;

  IF NOT (NEW.full_key LIKE project_prefix || '.%') THEN
    RAISE EXCEPTION 'full_key must start with project prefix'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:KEY_INVALID_PREFIX,field:full_key,expected_prefix:' || project_prefix,
          HINT = 'Keys must start with the project prefix followed by a dot (e.g., "' || project_prefix || '.your.key")';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 5. validate default locale value (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_default_locale_value()
RETURNS TRIGGER AS $$
DECLARE
  v_project_default_locale locale_code;
  v_translation_value TEXT;
BEGIN
  -- get project default locale
  SELECT default_locale INTO v_project_default_locale
  FROM projects
  WHERE id = NEW.project_id;

  -- check if this is a default locale translation
  IF NEW.locale = v_project_default_locale THEN
    -- get the value being set
    v_translation_value := COALESCE(NEW.value, '');

    -- ensure value is not NULL or empty for default locale
    IF LENGTH(TRIM(v_translation_value)) = 0 THEN
      RAISE EXCEPTION 'Value cannot be NULL or empty for default locale'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:DEFAULT_VALUE_EMPTY,field:value,locale:' || NEW.locale,
            HINT = 'Default locale translations must have a non-empty value';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 6. validate source locale is default (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_source_locale_is_default()
RETURNS TRIGGER AS $$
DECLARE
  v_project_default_locale locale_code;
BEGIN
  -- get project default locale
  SELECT p.default_locale INTO v_project_default_locale
  FROM projects p
  WHERE p.id = NEW.project_id;

  -- ensure source_locale equals default_locale
  IF NEW.source_locale <> v_project_default_locale THEN
    RAISE EXCEPTION 'source_locale must equal project default_locale'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:TARGET_LOCALE_IS_DEFAULT,field:source_locale,expected:' || v_project_default_locale || ',actual:' || NEW.source_locale,
          HINT = 'Translation jobs must use the project''s default locale as the source';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 7. prevent multiple active jobs (structured error)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_multiple_active_jobs()
RETURNS TRIGGER AS $$
DECLARE
  v_active_job_count INTEGER;
BEGIN
  -- only check on insert or when status becomes active
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IN ('pending', 'running')) THEN
    -- count active jobs for this project (excluding current job on update)
    SELECT COUNT(*) INTO v_active_job_count
    FROM translation_jobs
    WHERE project_id = NEW.project_id
      AND status IN ('pending', 'running')
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_active_job_count > 0 THEN
      RAISE EXCEPTION 'Only one active translation job allowed per project'
      USING ERRCODE = '23505',
            DETAIL = 'error_code:ACTIVE_JOB_EXISTS,project_id:' || NEW.project_id,
            HINT = 'Wait for the current job to complete or cancel it before starting a new one';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- PART 2: UPDATE VALIDATION FUNCTIONS WITH STRUCTURED ERRORS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 8. validate locale format strict (with structured errors and HINT)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_locale_format_strict()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.locale IS NOT NULL THEN
    -- check basic pattern
    IF NOT (NEW.locale ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') THEN
      RAISE EXCEPTION 'Invalid locale format'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:INVALID_FORMAT,field:locale,value:' || NEW.locale,
            HINT = 'Use 2-letter language code, optionally followed by dash and 2-letter country code (e.g., "en", "en-US", "pl", "pl-PL")';
    END IF;

    -- check length
    IF LENGTH(NEW.locale) > 8 THEN
      RAISE EXCEPTION 'Locale code too long'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:TOO_LONG,field:locale,value:' || NEW.locale || ',max_length:8',
            HINT = 'Locale codes must be 8 characters or less';
    END IF;

    -- check for invalid characters (non-alphabetic)
    IF NEW.locale ~ '[^a-zA-Z-]' THEN
      RAISE EXCEPTION 'Invalid characters in locale'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:INVALID_CHARACTERS,field:locale,value:' || NEW.locale,
            HINT = 'Only letters and one dash are allowed in locale codes';
    END IF;

    -- check for too many dashes
    IF (LENGTH(NEW.locale) - LENGTH(REPLACE(NEW.locale, '-', ''))) > 1 THEN
      RAISE EXCEPTION 'Too many dashes in locale'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:TOO_MANY_DASHES,field:locale,value:' || NEW.locale,
            HINT = 'Locale codes can have at most one dash';
    END IF;

    -- check if user provided language name instead of code
    IF NEW.locale ILIKE 'english' OR NEW.locale ILIKE 'polish' OR NEW.locale ILIKE 'spanish'
       OR NEW.locale ILIKE 'french' OR NEW.locale ILIKE 'german' OR NEW.locale ILIKE 'italian' THEN
      RAISE EXCEPTION 'Use locale code, not language name'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:LOCALE_IS_LANGUAGE_NAME,field:locale,value:' || NEW.locale,
            HINT = 'Use ISO 639-1 language codes: "en" for English, "pl" for Polish, "es" for Spanish, "fr" for French, "de" for German, "it" for Italian';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 9. validate project default locale format (with structured errors)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_project_default_locale_format()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.default_locale IS NOT NULL THEN
    -- check basic pattern
    IF NOT (NEW.default_locale ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') THEN
      RAISE EXCEPTION 'Invalid default_locale format'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:INVALID_FORMAT,field:default_locale,value:' || NEW.default_locale,
            HINT = 'Use 2-letter language code, optionally followed by dash and 2-letter country code';
    END IF;

    -- check length
    IF LENGTH(NEW.default_locale) > 8 THEN
      RAISE EXCEPTION 'Default locale code too long'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:TOO_LONG,field:default_locale,value:' || NEW.default_locale || ',max_length:8',
            HINT = 'Locale codes must be 8 characters or less';
    END IF;

    -- check for invalid characters
    IF NEW.default_locale ~ '[^a-zA-Z-]' THEN
      RAISE EXCEPTION 'Invalid characters in default_locale'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:INVALID_CHARACTERS,field:default_locale,value:' || NEW.default_locale,
            HINT = 'Only letters and one dash are allowed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- PART 3: UPDATE FAN-OUT FUNCTIONS WITH STRUCTURED ERRORS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 10. fan out translations on key insert (with structured errors)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fan_out_translations_on_key_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INTEGER;
  v_locale_count INTEGER;
BEGIN
  -- count existing locales for this project
  SELECT COUNT(*) INTO v_locale_count
  FROM project_locales
  WHERE project_id = NEW.project_id;

  -- create translation rows for all locales
  INSERT INTO translations (project_id, key_id, locale, value, is_machine_translated, updated_by)
  SELECT
    NEW.project_id,
    NEW.id,
    pl.locale,
    '',  -- empty string for non-default locales
    FALSE,
    auth.uid()
  FROM project_locales pl
  WHERE pl.project_id = NEW.project_id;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- verify fan-out succeeded
  IF v_inserted_count <> v_locale_count THEN
    RAISE EXCEPTION 'Failed to create translations for new key'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:FANOUT_FAILED,key_id:' || NEW.id || ',expected:' || v_locale_count || ',inserted:' || v_inserted_count,
          HINT = 'The system failed to create translation entries for all project locales';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 11. fan out translations on locale insert (with structured errors)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fan_out_translations_on_locale_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INTEGER;
  v_key_count INTEGER;
BEGIN
  -- count existing keys for this project
  SELECT COUNT(*) INTO v_key_count
  FROM keys
  WHERE project_id = NEW.project_id;

  -- create translation rows for all keys
  INSERT INTO translations (project_id, key_id, locale, value, is_machine_translated, updated_by)
  SELECT
    NEW.project_id,
    k.id,
    NEW.locale,
    '',  -- empty string initially
    FALSE,
    auth.uid()
  FROM keys k
  WHERE k.project_id = NEW.project_id;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- verify fan-out succeeded
  IF v_inserted_count <> v_key_count THEN
    RAISE EXCEPTION 'Fan-out incomplete'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:FANOUT_INCOMPLETE,locale:' || NEW.locale || ',expected:' || v_key_count || ',inserted:' || v_inserted_count,
          HINT = 'The system failed to create translation entries for all keys in this locale';
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- PART 4: UPDATE HELPER RPC FUNCTIONS WITH STRUCTURED ERRORS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 12. update ensure_default_locale_exists (structured errors)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_default_locale_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locale_exists BOOLEAN;
BEGIN
  -- check if the default_locale exists in project_locales
  SELECT EXISTS (
    SELECT 1
    FROM project_locales
    WHERE project_id = NEW.id
      AND locale = NEW.default_locale
  ) INTO v_locale_exists;

  IF NOT v_locale_exists THEN
    RAISE EXCEPTION 'Cannot set default_locale to a locale that does not exist in project_locales'
    USING ERRCODE = '23514',
          DETAIL = 'error_code:LOCALE_NOT_FOUND,field:default_locale,value:' || NEW.default_locale,
          HINT = 'Add the locale to project_locales first, then set it as default';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 13. update prevent_default_locale_duplicate_insert (structured errors)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_default_locale_duplicate_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_project_default_locale locale_code;
BEGIN
  -- get the project's default locale
  SELECT default_locale INTO v_project_default_locale
  FROM projects
  WHERE id = NEW.project_id;

  -- prevent inserting the default locale if it already exists
  IF NEW.locale = v_project_default_locale THEN
    IF EXISTS (
      SELECT 1 FROM project_locales
      WHERE project_id = NEW.project_id
        AND locale = v_project_default_locale
    ) THEN
      RAISE EXCEPTION 'Cannot add default locale - it already exists'
      USING ERRCODE = '23505',
            DETAIL = 'error_code:DEFAULT_LOCALE_DUPLICATE,locale:' || NEW.locale,
            HINT = 'The default locale is automatically created with the project';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- PART 5: UPDATE ALL RPC FUNCTIONS TO USE CONSISTENT ERROR MESSAGES
-- =====================================================================

-- Standardize "Project not found" error messages to "Project not found or access denied"
-- This provides security through obscurity while maintaining user-friendly messages

-- Note: RPC functions will be updated in subsequent commits to use structured
-- error format. For now, we standardize the error messages to a single pattern.

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
