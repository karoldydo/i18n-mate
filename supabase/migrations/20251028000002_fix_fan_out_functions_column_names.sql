-- =====================================================================
-- migration: fix fan-out functions column names
-- description: correct column names in fan-out functions (updated_by_user_id)
-- problem: migration 20251028000000 used wrong column name "updated_by"
--          instead of "updated_by_user_id", causing project creation to fail
-- solution: restore original column list while keeping structured errors
-- =====================================================================

-- ---------------------------------------------------------------------
-- 10. fix fan out translations on key insert
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
  v_project_default_locale locale_code;
BEGIN
  -- get project default locale
  SELECT default_locale INTO v_project_default_locale
  FROM projects WHERE id = NEW.project_id;

  -- count non-default locales for this project
  SELECT COUNT(*) INTO v_locale_count
  FROM project_locales
  WHERE project_id = NEW.project_id
    AND locale != v_project_default_locale;

  -- create translation rows for all non-default locales
  INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source)
  SELECT
    NEW.project_id,
    NEW.id,
    pl.locale,
    NULL,  -- NULL for non-default locales (will be translated later)
    NOW(),
    'user'
  FROM project_locales pl
  WHERE pl.project_id = NEW.project_id
    AND pl.locale != v_project_default_locale;

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

COMMENT ON FUNCTION fan_out_translations_on_key_insert IS
  'Automatically creates translation rows for all non-default locales when a new key is inserted. Uses structured error format for frontend parsing. Only inserts columns that have defaults or can be NULL.';

-- ---------------------------------------------------------------------
-- 11. fix fan out translations on locale insert
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
  INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source)
  SELECT
    NEW.project_id,
    k.id,
    NEW.locale,
    NULL,  -- NULL initially (will be translated later)
    NOW(),
    'user'
  FROM keys k
  WHERE k.project_id = NEW.project_id;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- verify fan-out succeeded
  IF v_inserted_count <> v_key_count THEN
    RAISE EXCEPTION 'Failed to create translations for new locale'
    USING ERRCODE = '50000',
          DETAIL = 'error_code:FANOUT_INCOMPLETE,locale:' || NEW.locale || ',expected:' || v_key_count || ',inserted:' || v_inserted_count,
          HINT = 'The system failed to create translation entries for all keys';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fan_out_translations_on_locale_insert IS
  'Automatically creates translation rows for all keys when a new locale is inserted. Uses structured error format for frontend parsing. Only inserts columns that have defaults or can be NULL.';
