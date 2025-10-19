-- =====================================================================
-- migration: fix list_keys_per_language_view type mismatch in column 3
-- description: Fix "Returned type character varying does not match expected type character varying(250)" error
-- problem: The composite type expects VARCHAR(250) but function returns different type
-- solution: Update function to properly cast value column to match composite type
-- =====================================================================

CREATE OR REPLACE FUNCTION list_keys_per_language_view(
  p_project_id UUID,
  p_locale TEXT,
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
    k.id AS key_id,
    k.full_key::VARCHAR(256),  -- Explicit cast to match composite type
    COALESCE(t.value, '')::VARCHAR(250) AS value,  -- Explicit cast to VARCHAR(250)
    COALESCE(t.is_machine_translated, false) AS is_machine_translated,
    COALESCE(t.updated_at, k.created_at) AS updated_at,
    COALESCE(t.updated_source, 'user'::update_source_type) AS updated_source,  -- Cast to enum type
    t.updated_by_user_id  -- This can be NULL
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
  'List keys with values for selected locale and metadata. Uses composite type return to properly handle nullable updated_by_user_id from translations table. Uses SECURITY DEFINER plpgsql for explicit authorization and locale validation. Fixed type casting to match composite type exactly.';