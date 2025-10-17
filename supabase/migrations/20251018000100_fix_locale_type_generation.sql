-- =====================================================================
-- migration: fix locale type generation
-- description: ensure locale_code domain is properly typed in generated TypeScript
-- tables affected: project_locales, projects, RPC functions
-- notes: fixes 'unknown' type generation to proper string type
-- =====================================================================

-- ---------------------------------------------------------------------
-- update locale_code domain comment for better type generation
-- ---------------------------------------------------------------------

-- Add detailed comment to help Supabase generate proper TypeScript types
-- The comment provides additional context for type generation
COMMENT ON DOMAIN locale_code IS
  'BCP-47 locale code: ll or ll-CC format (e.g., "en", "en-US", "pl", "pl-PL"). Automatically normalized via normalize_locale_trigger. TypeScript type should be string with BCP47 validation.';

-- ---------------------------------------------------------------------
-- update function parameter types for better generation
-- ---------------------------------------------------------------------

-- Recreate function with explicit parameter typing to ensure proper generation
-- Must DROP first because we're changing the return type from locale_code to TEXT
DROP FUNCTION IF EXISTS list_project_locales_with_default(uuid);

CREATE FUNCTION list_project_locales_with_default(
  p_project_id uuid
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  locale TEXT, -- Use TEXT explicitly instead of locale_code for type generation
  label varchar(64),
  created_at timestamptz,
  updated_at timestamptz,
  is_default boolean
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id uuid;
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
    pl.locale::TEXT, -- Explicit cast to TEXT for type generation
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
  'Lists all locales for a project with is_default flag indicating the default locale. Uses SECURITY DEFINER with explicit auth.uid() validation for RLS bypass. Returns TEXT type for locale field to ensure proper TypeScript generation.';

-- ---------------------------------------------------------------------
-- update other RPC functions if they exist and use locale_code
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- fix RPC parameter type consistency
-- ---------------------------------------------------------------------

-- The issue: database functions use p_locale parameter (with prefix)
-- but TypeScript types expect locale parameter (without prefix)
-- Solution: Add parameter aliases or wrapper functions

-- Check if list_keys_per_language_view function exists and update parameter type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'list_keys_per_language_view'
  ) THEN
    -- Update function to use TEXT parameter instead of locale_code
    -- This ensures proper TypeScript type generation
    EXECUTE '
    CREATE OR REPLACE FUNCTION list_keys_per_language_view(
      p_project_id uuid,
      p_locale TEXT, -- Changed from locale_code to TEXT
      p_search TEXT DEFAULT NULL,
      p_missing_only BOOLEAN DEFAULT FALSE,
      p_limit INT DEFAULT 50,
      p_offset INT DEFAULT 0
    )
    RETURNS SETOF key_per_language_view_type
    SECURITY DEFINER
    LANGUAGE plpgsql AS $_func_$
    DECLARE
      v_owner_user_id uuid;
      v_locale_exists boolean;
    BEGIN
      -- Standard authentication check
      v_owner_user_id := auth.uid();
      IF v_owner_user_id IS NULL THEN
        RAISE EXCEPTION ''Authentication required'';
      END IF;

      -- Verify project ownership and locale exists
      SELECT EXISTS (
        SELECT 1 FROM projects p
        JOIN project_locales pl ON p.id = pl.project_id
        WHERE p.id = p_project_id
          AND p.owner_user_id = v_owner_user_id
          AND pl.locale = p_locale::locale_code
      ) INTO v_locale_exists;

      IF NOT v_locale_exists THEN
        RAISE EXCEPTION ''Project not found, access denied, or locale does not exist in project'';
      END IF;

      RETURN QUERY
      SELECT
        k.id AS key_id,
        k.full_key,
        t.value,
        t.is_machine_translated,
        t.updated_at,
        t.updated_source,
        t.updated_by_user_id
      FROM keys k
      JOIN translations t
        ON t.key_id = k.id
       AND t.project_id = k.project_id
       AND t.locale = p_locale::locale_code
      WHERE k.project_id = p_project_id
        AND (p_search IS NULL OR k.full_key ILIKE (''%'' || p_search || ''%''))
        AND (NOT p_missing_only OR t.value IS NULL)
      ORDER BY k.full_key ASC
      LIMIT p_limit OFFSET p_offset;
    END;
    $_func_$';
  END IF;
END $$;

-- Update comment for list_keys_per_language_view if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'list_keys_per_language_view'
  ) THEN
    EXECUTE 'COMMENT ON FUNCTION list_keys_per_language_view(uuid, text, text, boolean, integer, integer) IS ' ||
            quote_literal('List keys with values for selected locale and metadata. Uses SECURITY DEFINER plpgsql for explicit authorization and locale validation. Ensures both project ownership and locale existence before executing query. Uses TEXT parameter type for proper TypeScript generation.');
  END IF;
END $$;