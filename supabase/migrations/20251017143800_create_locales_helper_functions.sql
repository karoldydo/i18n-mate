-- =====================================================================
-- migration: create locales helper functions
-- description: stored procedures for locale management operations
-- functions created: list_project_locales_with_default
-- notes: uses security definer for rls bypass where needed
-- =====================================================================

-- ---------------------------------------------------------------------
-- list_project_locales_with_default
-- ---------------------------------------------------------------------

-- lists all locales for a project with is_default flag
-- returns all project locales with boolean indicating which is default
--
-- parameters:
--   project_id: UUID of the project (required)
--
-- returns:
--   project_locales with all fields plus is_default boolean
--
-- example:
--   select * from list_project_locales_with_default('550e8400-e29b-41d4-a716-446655440000');
--
-- rationale:
--   - efficient single query to get locales with default indicator
--   - avoids N+1 problem (no need to fetch project separately)
--   - provides is_default flag needed for UI
--
-- security:
--   - uses SECURITY DEFINER to bypass RLS during join with projects table
--   - RLS is enforced via owner_user_id = auth.uid() check in function body
--   - function validates authentication and returns empty result for unauthorized access
--   - consistent with other helper functions security model
create or replace function list_project_locales_with_default(
  p_project_id uuid
)
returns table (
  id uuid,
  project_id uuid,
  locale locale_code,
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
    pl.locale,
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
  'Lists all locales for a project with is_default boolean flag indicating the default locale. Uses SECURITY DEFINER with explicit auth.uid() validation for RLS bypass during join operations. Returns empty result for unauthorized access or invalid project_id. Orders results by is_default DESC, created_at ASC (default locale appears first). Essential for locale management UI to distinguish default from secondary languages.';
