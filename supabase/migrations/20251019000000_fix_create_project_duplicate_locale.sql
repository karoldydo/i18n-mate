-- =====================================================================
-- migration: fix create_project_with_default_locale duplicate locale insertion
-- description: Remove manual locale insertion from function since trigger handles it
-- problem: Function tries to insert default locale, but trigger already does it
-- solution: Let ensure_default_locale_exists trigger handle locale creation
-- =====================================================================

-- Drop existing versions to avoid function overloading ambiguity
DROP FUNCTION IF EXISTS create_project_with_default_locale(citext, varchar, locale_code, varchar, text);
DROP FUNCTION IF EXISTS create_project_with_default_locale(text, text, locale_code, text, text);
DROP FUNCTION IF EXISTS create_project_with_default_locale(text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_project_with_default_locale(
  p_name TEXT,
  p_prefix TEXT,
  p_default_locale locale_code,
  p_default_locale_label TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name CITEXT,
  prefix VARCHAR(4),
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
    -- NOTE: ensure_default_locale_exists_trigger will automatically create
    -- the default locale in project_locales, so we don't do it manually here
    INSERT INTO projects (owner_user_id, name, prefix, default_locale, description)
    VALUES (v_owner_user_id, TRIM(p_name), TRIM(p_prefix), p_default_locale, p_description)
    RETURNING projects.id INTO v_project_id;

    -- 2. Update the auto-created default locale label if custom label provided
    -- The trigger creates it with auto-generated label, we update it here
    IF p_default_locale_label IS NOT NULL AND TRIM(p_default_locale_label) <> '' THEN
      UPDATE project_locales
      SET label = TRIM(p_default_locale_label)
      WHERE project_id = v_project_id AND locale = p_default_locale;
    END IF;

    -- 3. Emit project_created telemetry event
    INSERT INTO telemetry_events (event_name, project_id, properties)
    VALUES ('project_created', v_project_id, jsonb_build_object(
      'locale_count', 1,
      'default_locale', p_default_locale
    ));

    -- NOTE: language_added telemetry is emitted by emit_language_added_event_trigger
    -- which fires on INSERT to project_locales, so we don't emit it here

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
  'Atomically creates project with default locale. '
  'The ensure_default_locale_exists trigger automatically creates the locale record. '
  'This function updates the auto-generated label with custom label if provided. '
  'Emits project_created event; language_added event is emitted by trigger. '
  'Includes proper error handling with structured error codes.';
