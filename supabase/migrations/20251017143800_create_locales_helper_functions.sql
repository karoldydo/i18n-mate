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
--   - uses security definer to bypass RLS during join with projects table
--   - RLS is enforced via owner_user_id = auth.uid() check in function body
--   - function validates authentication and returns empty result for unauthorized access
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
security definer
language plpgsql as $$
declare
  v_owner_user_id uuid;
begin
  -- get authenticated user id
  v_owner_user_id := auth.uid();

  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    pl.id,
    pl.project_id,
    pl.locale,
    pl.label,
    pl.created_at,
    pl.updated_at,
    (pl.locale = p.default_locale) as is_default
  from project_locales pl
  inner join projects p on pl.project_id = p.id
  where pl.project_id = p_project_id
    and p.owner_user_id = v_owner_user_id
  order by is_default desc, pl.created_at asc;
end;
$$;

comment on function list_project_locales_with_default is
  'Lists all locales for a project with is_default flag indicating the default locale';
