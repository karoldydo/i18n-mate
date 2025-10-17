-- =====================================================================
-- migration: add telemetry for default locale creation
-- description: ensure language_added event is emitted for default locale
-- functions updated: create_project_with_default_locale
-- notes: fixes KPI tracking by ensuring all locale additions are tracked
-- =====================================================================

-- ---------------------------------------------------------------------
-- update create_project_with_default_locale to emit telemetry
-- ---------------------------------------------------------------------

-- Enhanced function that properly tracks default locale creation
CREATE OR REPLACE FUNCTION create_project_with_default_locale(
  p_name TEXT,
  p_prefix TEXT,
  p_default_locale locale_code,
  p_default_locale_label TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  prefix TEXT,
  default_locale locale_code,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_project_id UUID;
  v_owner_user_id UUID;
  v_locale_id UUID;
BEGIN
  -- Authentication check
  v_owner_user_id := auth.uid();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RAISE EXCEPTION 'Project name is required';
  END IF;

  IF p_prefix IS NULL OR LENGTH(TRIM(p_prefix)) = 0 THEN
    RAISE EXCEPTION 'Project prefix is required';
  END IF;

  IF p_default_locale IS NULL THEN
    RAISE EXCEPTION 'Default locale is required';
  END IF;

  IF p_default_locale_label IS NULL OR LENGTH(TRIM(p_default_locale_label)) = 0 THEN
    RAISE EXCEPTION 'Default locale label is required';
  END IF;

  -- Start atomic transaction
  BEGIN
    -- 1. Create project
    INSERT INTO projects (owner_user_id, name, prefix, default_locale, description)
    VALUES (v_owner_user_id, TRIM(p_name), TRIM(p_prefix), p_default_locale, p_description)
    RETURNING projects.id INTO v_project_id;

    -- 2. Create default locale in project_locales
    INSERT INTO project_locales (project_id, locale, label)
    VALUES (v_project_id, p_default_locale, TRIM(p_default_locale_label))
    RETURNING project_locales.id INTO v_locale_id;

    -- 3. Emit project_created telemetry event
    INSERT INTO telemetry_events (event_name, project_id, properties)
    VALUES ('project_created', v_project_id, jsonb_build_object(
      'locale_count', 1,
      'default_locale', p_default_locale
    ));

    -- 4. Emit language_added telemetry event for default locale
    -- This ensures consistent KPI tracking for all locale additions
    INSERT INTO telemetry_events (event_name, project_id, properties)
    VALUES ('language_added', v_project_id, jsonb_build_object(
      'locale', p_default_locale,
      'locale_count', 1,
      'is_default', true
    ));

  EXCEPTION WHEN OTHERS THEN
    -- Rollback and re-raise error
    RAISE;
  END;

  -- Return created project
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.prefix,
    p.default_locale,
    p.description,
    p.created_at,
    p.updated_at
  FROM projects p
  WHERE p.id = v_project_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle constraint violations gracefully
    IF SQLERRM LIKE '%projects_name_unique_per_owner%' THEN
      RAISE EXCEPTION 'Project name already exists'
      USING ERRCODE = '23505',
            DETAIL = 'error_code:DUPLICATE_PROJECT_NAME,field:name';
    ELSIF SQLERRM LIKE '%projects_prefix_unique_per_owner%' THEN
      RAISE EXCEPTION 'Project prefix already exists'
      USING ERRCODE = '23505',
            DETAIL = 'error_code:DUPLICATE_PROJECT_PREFIX,field:prefix';
    ELSE
      RAISE EXCEPTION 'Duplicate constraint violation: %', SQLERRM
      USING ERRCODE = '23505',
            DETAIL = 'error_code:DUPLICATE_CONSTRAINT';
    END IF;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create project: %', SQLERRM
    USING ERRCODE = '50000',
          DETAIL = 'error_code:PROJECT_CREATION_FAILED';
END;
$$;

COMMENT ON FUNCTION create_project_with_default_locale(TEXT, TEXT, locale_code, TEXT, TEXT) IS
  'Atomically creates project with default locale and emits proper telemetry events. '
  'Emits both project_created and language_added events to ensure accurate KPI tracking. '
  'Default locale gets language_added event with is_default:true for distinction. '
  'Includes proper error handling with structured error codes.';

-- ---------------------------------------------------------------------
-- update emit_language_added_event to handle default locale distinction
-- ---------------------------------------------------------------------

-- Enhanced version that recognizes default locale creation
CREATE OR REPLACE FUNCTION emit_language_added_event()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_locale_count INTEGER;
  v_is_default BOOLEAN;
BEGIN
  -- Count total locales for this project
  SELECT COUNT(*) INTO v_locale_count
  FROM project_locales
  WHERE project_id = NEW.project_id;

  -- Check if this is the default locale
  SELECT (NEW.locale = p.default_locale) INTO v_is_default
  FROM projects p
  WHERE p.id = NEW.project_id;

  -- Insert telemetry event with enhanced metadata
  INSERT INTO telemetry_events (event_name, project_id, properties)
  VALUES ('language_added', NEW.project_id, jsonb_build_object(
    'locale', NEW.locale,
    'locale_count', v_locale_count,
    'is_default', COALESCE(v_is_default, false)
  ));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the locale insertion
  RAISE WARNING 'Failed to emit language_added event for project %: %',
    NEW.project_id, SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION emit_language_added_event IS
  'Enhanced version that tracks whether added locale is default locale. '
  'Provides is_default flag in telemetry for better KPI analysis. '
  'Handles both default locale creation (during project setup) and additional locale additions.';