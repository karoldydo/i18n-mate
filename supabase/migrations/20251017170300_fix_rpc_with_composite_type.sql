-- =====================================================================
-- migration: fix RPC nullable user_id using composite type
-- description: Create composite type with explicit nullable fields and update
--              list_keys_per_language_view to use it. This approach allows
--              Supabase's type generator to properly recognize nullable fields.
-- =====================================================================

-- Create composite type with explicit nullable updated_by_user_id
CREATE TYPE key_per_language_view_type AS (
  key_id UUID,
  full_key VARCHAR(256),
  value VARCHAR(250),
  is_machine_translated BOOLEAN,
  updated_at TIMESTAMPTZ,
  updated_source update_source_type,
  updated_by_user_id UUID  -- Will be nullable in practice via the query
);

-- Drop the existing function
DROP FUNCTION IF EXISTS list_keys_per_language_view(uuid, locale_code, text, boolean, int, int);

-- Recreate function using composite type return
CREATE OR REPLACE FUNCTION list_keys_per_language_view(
  p_project_id UUID,
  p_locale locale_code,
  p_search TEXT DEFAULT NULL,
  p_missing_only BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS SETOF key_per_language_view_type
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id uuid;
BEGIN
  -- Check authentication
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Verify project ownership and locale exists
  if not exists (
    select 1 from projects p
    join project_locales pl on p.id = pl.project_id
    where p.id = p_project_id
      and p.owner_user_id = v_owner_user_id
      and pl.locale = p_locale
  ) then
    raise exception 'Project not found, access denied, or locale does not exist in project';
  end if;

  return query
  SELECT
    k.id AS key_id,
    k.full_key,
    t.value,
    t.is_machine_translated,
    t.updated_at,
    t.updated_source,
    t.updated_by_user_id  -- This preserves null values from translations table
  FROM keys k
  JOIN translations t
    ON t.key_id = k.id
   AND t.project_id = k.project_id
   AND t.locale = p_locale
  WHERE k.project_id = p_project_id
    AND (p_search IS NULL OR k.full_key ILIKE ('%' || p_search || '%'))
    AND (NOT p_missing_only OR t.value IS NULL)
  ORDER BY k.full_key ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON TYPE key_per_language_view_type IS
  'Composite type for list_keys_per_language_view function return values with proper nullable handling.';

COMMENT ON FUNCTION list_keys_per_language_view IS
  'List keys with values for selected locale and metadata. Uses composite type return to properly handle nullable updated_by_user_id from translations table. Uses SECURITY DEFINER plpgsql for explicit authorization and locale validation.';