-- =====================================================================
-- migration: standardize RPC parameter naming
-- description: update all RPC functions to use p_ prefix for parameters
-- functions updated: list_project_locales_with_default, create_project_locale_atomic
-- notes: ensures consistent parameter naming across all RPC functions
-- =====================================================================

-- ---------------------------------------------------------------------
-- update list_project_locales_with_default function
-- ---------------------------------------------------------------------

-- Drop existing function first to allow changing return type signature
DROP FUNCTION IF EXISTS list_project_locales_with_default(UUID);

-- Update function to use p_ prefix for consistency
CREATE FUNCTION list_project_locales_with_default(
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  locale locale_code,
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
  'Lists all locales for a project with is_default boolean flag. Uses consistent p_ prefix for parameters. SECURITY DEFINER with explicit auth validation.';

-- ---------------------------------------------------------------------
-- update create_project_locale_atomic function
-- ---------------------------------------------------------------------

-- Function already uses correct parameter naming (p_project_id, p_locale, p_label)
-- No changes needed, but add comment for consistency

COMMENT ON FUNCTION create_project_locale_atomic IS
  'Atomic locale creation with fan-out verification. Uses p_ prefix for all parameters: p_project_id, p_locale, p_label. Returns created locale with verification.';