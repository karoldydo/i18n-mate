-- =====================================================================
-- Migration: Fix list_project_locales_with_default return type
-- Description: Correct return type for locale column to ensure proper TypeScript generation
-- Problem: Function returns locale: unknown instead of locale_code in generated types
-- Solution: Recreate function with explicit locale_code return type
-- =====================================================================

-- Drop and recreate the function with proper return type
DROP FUNCTION IF EXISTS list_project_locales_with_default(UUID);

-- Recreate with explicit locale_code return type
CREATE OR REPLACE FUNCTION list_project_locales_with_default(
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  locale TEXT, -- Using TEXT for better TypeScript compatibility
  label VARCHAR(64),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_default BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id UUID;
BEGIN
  -- Standard authentication check pattern
  v_owner_user_id := auth.uid();

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    pl.id,
    pl.project_id,
    pl.locale::TEXT, -- Explicit cast to TEXT for TypeScript
    pl.label,
    pl.created_at,
    pl.updated_at,
    (pl.locale = p.default_locale) AS is_default
  FROM project_locales pl
  INNER JOIN projects p ON pl.project_id = p.id
  WHERE pl.project_id = p_project_id
    AND p.owner_user_id = v_owner_user_id
  ORDER BY is_default DESC, pl.created_at ASC;
END;
$$;

COMMENT ON FUNCTION list_project_locales_with_default IS
  'Lists all locales for a project with is_default boolean flag indicating the default locale. Uses SECURITY DEFINER with explicit auth.uid() validation for RLS bypass during join operations. Returns empty result for unauthorized access or invalid project_id. Orders results by is_default DESC, created_at ASC (default locale appears first). Fixed return type to TEXT for proper TypeScript generation.';

-- =====================================================================
-- Fix other functions with unknown locale types
-- =====================================================================

-- Fix create_project_with_default_locale function
-- Drop all possible overloads of this function
DROP FUNCTION IF EXISTS create_project_with_default_locale(TEXT, TEXT, locale_code, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_project_with_default_locale(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_project_with_default_locale(citext, varchar(4), locale_code, varchar(64), text);
DROP FUNCTION IF EXISTS create_project_with_default_locale(TEXT, varchar(4), locale_code, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_project_with_default_locale(
  p_name TEXT,
  p_prefix TEXT,
  p_default_locale TEXT, -- Changed from locale_code domain to TEXT
  p_default_locale_label TEXT,
  p_description TEXT DEFAULT NULL -- Moved to end to match original signature
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(128),
  description TEXT,
  prefix VARCHAR(4),
  default_locale TEXT, -- Changed from locale_code domain to TEXT
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id UUID;
  v_project_id UUID;
  v_project_row projects%ROWTYPE;
  v_locale_row project_locales%ROWTYPE;
BEGIN
  -- Standard authentication check pattern
  v_owner_user_id := auth.uid();

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate locale format
  IF NOT is_valid_locale_format(p_default_locale) THEN
    RAISE EXCEPTION 'Invalid locale format. Use BCP-47 format (e.g., "en", "en-US")'
      USING ERRCODE = '22023';
  END IF;

  -- Validate prefix format (2-4 characters, letters only)
  IF NOT (p_prefix ~ '^[a-zA-Z]{2,4}$') THEN
    RAISE EXCEPTION 'Invalid prefix format. Use 2-4 letters only'
      USING ERRCODE = '22023';
  END IF;

  -- Create the project
  INSERT INTO projects (name, description, prefix, default_locale, owner_user_id)
  VALUES (p_name, p_description, LOWER(p_prefix), p_default_locale, v_owner_user_id)
  RETURNING * INTO v_project_row;

  v_project_id := v_project_row.id;

  -- Create the default locale entry
  INSERT INTO project_locales (project_id, locale, label)
  VALUES (v_project_id, p_default_locale, p_default_locale_label)
  RETURNING * INTO v_locale_row;

  -- Return the created project
  RETURN QUERY
  SELECT
    v_project_row.id,
    v_project_row.name,
    v_project_row.description,
    v_project_row.prefix::VARCHAR(4),
    v_project_row.default_locale::TEXT, -- Explicit cast to TEXT
    v_project_row.created_at,
    v_project_row.updated_at;
END;
$$;

COMMENT ON FUNCTION create_project_with_default_locale(TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Creates a new project with its default locale atomically. Uses SECURITY DEFINER with explicit auth.uid() validation. Validates locale format using is_valid_locale_format(). Validates prefix format (2-4 letters). Returns the created project with TEXT types for proper TypeScript generation.';

-- Fix list_projects_with_counts function
DROP FUNCTION IF EXISTS list_projects_with_counts(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION list_projects_with_counts(
  p_limit INTEGER DEFAULT NULL,
  p_offset INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(128),
  description TEXT,
  prefix VARCHAR(4),
  default_locale TEXT, -- Changed from locale_code domain to TEXT
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  key_count BIGINT,
  locale_count BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id UUID;
BEGIN
  -- Standard authentication check pattern
  v_owner_user_id := auth.uid();

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.prefix,
    p.default_locale::TEXT, -- Explicit cast to TEXT
    p.created_at,
    p.updated_at,
    COALESCE(key_counts.key_count, 0) AS key_count,
    COALESCE(locale_counts.locale_count, 0) AS locale_count
  FROM projects p
  LEFT JOIN (
    SELECT
      project_id,
      COUNT(*) AS key_count
    FROM keys
    GROUP BY project_id
  ) key_counts ON p.id = key_counts.project_id
  LEFT JOIN (
    SELECT
      project_id,
      COUNT(*) AS locale_count
    FROM project_locales
    GROUP BY project_id
  ) locale_counts ON p.id = locale_counts.project_id
  WHERE p.owner_user_id = v_owner_user_id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION list_projects_with_counts(INTEGER, INTEGER) IS
  'Lists projects with aggregated key and locale counts. Uses SECURITY DEFINER with explicit auth.uid() validation for RLS bypass during join operations. Returns empty result for unauthorized access. Orders by created_at DESC. Fixed return type to TEXT for proper TypeScript generation.';

-- =====================================================================
-- Ensure list_keys_per_language_view uses TEXT parameter
-- (This might already be fixed, but let's make sure)
-- =====================================================================

-- Drop all overloads of list_keys_per_language_view
DROP FUNCTION IF EXISTS list_keys_per_language_view(UUID, TEXT, TEXT, BOOLEAN, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS list_keys_per_language_view(UUID, locale_code, TEXT, BOOLEAN, INTEGER, INTEGER);

-- Recreate with TEXT parameter for p_locale
CREATE OR REPLACE FUNCTION list_keys_per_language_view(
  p_project_id UUID,
  p_locale TEXT, -- Changed from locale_code to TEXT
  p_search TEXT DEFAULT NULL,
  p_missing_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF key_per_language_view_type
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id UUID;
BEGIN
  -- Standard authentication check pattern
  v_owner_user_id := auth.uid();

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate locale format
  IF NOT is_valid_locale_format(p_locale) THEN
    RAISE EXCEPTION 'Invalid locale format. Use BCP-47 format (e.g., "en", "en-US")'
      USING ERRCODE = '22023';
  END IF;

  -- Check project ownership and locale existence
  IF NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id AND p.owner_user_id = v_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM project_locales pl
    WHERE pl.project_id = p_project_id AND pl.locale = p_locale
  ) THEN
    RAISE EXCEPTION 'Locale not found in project';
  END IF;

  RETURN QUERY
  SELECT
    k.id AS key_id,  -- Return as UUID to match composite type
    k.full_key,
    COALESCE(t.value, '') AS value,
    COALESCE(t.is_machine_translated, false) AS is_machine_translated,
    COALESCE(t.updated_at, k.created_at) AS updated_at,
    t.updated_source,
    t.updated_by_user_id  -- Return as UUID to match composite type
  FROM keys k
  LEFT JOIN translations t ON k.id = t.key_id AND t.locale = p_locale
  WHERE k.project_id = p_project_id
    AND (p_search IS NULL OR k.full_key ILIKE '%' || p_search || '%')
    AND (NOT p_missing_only OR t.value IS NULL OR t.value = '')
  ORDER BY k.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION list_keys_per_language_view(UUID, TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) IS
  'List keys with values for selected locale and metadata. Uses composite type return to properly handle nullable updated_by_user_id from translations table. Uses SECURITY DEFINER plpgsql for explicit authorization and locale validation. Fixed parameter type to TEXT for proper TypeScript generation.';