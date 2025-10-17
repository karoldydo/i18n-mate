-- =====================================================================
-- migration: create projects helper functions
-- description: stored procedures for project management operations
-- functions created: create_project_with_default_locale, list_projects_with_counts
-- notes: uses security definer for rls bypass where needed
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_project_with_default_locale
-- ---------------------------------------------------------------------

-- atomically creates a project with its default locale
-- ensures both project and initial locale are created in one transaction
-- 
-- parameters:
--   p_name: project name (required, unique per owner)
--   p_prefix: project prefix (required, 2-4 chars, unique per owner)
--   p_default_locale: locale code in BCP-47 format (required)
--   p_default_locale_label: human-readable locale label (required)
--   p_description: project description (optional)
--
-- returns:
--   project row with all fields
--
-- example:
--   select create_project_with_default_locale(
--     'My App',
--     'app',
--     'en',
--     'English',
--     'Main application translations'
--   );
--
-- rationale:
--   - ensures atomic creation of project + default locale
--   - prevents orphaned projects without default locale
--   - simplifies client code (single rpc call instead of multiple inserts)
--   - automatically sets owner_user_id from auth.uid()
--
-- security:
--   - uses security definer to bypass RLS during atomic transaction
--   - RLS is enforced via owner_user_id = auth.uid() check in function body
--   - this pattern is necessary to ensure transactional integrity across tables
--   - function validates authentication and rejects unauthenticated requests
create or replace function create_project_with_default_locale(
  p_name citext,
  p_prefix varchar(4),
  p_default_locale locale_code,
  p_default_locale_label varchar(64),
  p_description text default null
)
returns table (
  id uuid,
  name citext,
  prefix varchar(4),
  default_locale locale_code,
  description text,
  created_at timestamptz,
  updated_at timestamptz
)
security definer
language plpgsql as $$
declare
  v_project_id uuid;
  v_owner_user_id uuid;
begin
  -- get authenticated user id
  v_owner_user_id := auth.uid();
  
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- insert project
  insert into projects (owner_user_id, name, prefix, default_locale, description)
  values (v_owner_user_id, p_name, p_prefix, p_default_locale, p_description)
  returning projects.id into v_project_id;

  -- insert default locale into project_locales
  insert into project_locales (project_id, locale, label)
  values (v_project_id, p_default_locale, p_default_locale_label);

  -- emit telemetry event
  insert into telemetry_events (project_id, event_name, properties)
  values (
    v_project_id,
    'project_created',
    jsonb_build_object('locale_count', 1)
  );

  -- return created project (excluding owner_user_id for security)
  return query
  select 
    p.id,
    p.name,
    p.prefix,
    p.default_locale,
    p.description,
    p.created_at,
    p.updated_at
  from projects p
  where p.id = v_project_id;
end;
$$;

comment on function create_project_with_default_locale is 
  'Atomically creates project with default locale and emits telemetry event';

-- ---------------------------------------------------------------------
-- list_projects_with_counts
-- ---------------------------------------------------------------------

-- lists projects for authenticated user with aggregated counts
-- returns projects with locale_count and key_count
-- 
-- parameters:
--   p_limit: max number of results (optional, default 50)
--   p_offset: pagination offset (optional, default 0)
--
-- returns:
--   projects with id, name, description, prefix, default_locale,
--   created_at, updated_at, locale_count, key_count
--
-- example:
--   select * from list_projects_with_counts(50, 0);
--
-- rationale:
--   - efficient aggregation in single query (avoids N+1 problem)
--   - automatically filters by authenticated user
--   - provides counts needed for UI without additional queries
--
-- security:
--   - uses security definer to bypass RLS during aggregation queries
--   - RLS is enforced via WHERE owner_user_id = auth.uid() in function body
--   - this pattern allows efficient JOIN and COUNT operations across tables
--   - function validates authentication and returns empty result for unauthenticated users
create or replace function list_projects_with_counts(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  name citext,
  description text,
  prefix varchar(4),
  default_locale locale_code,
  created_at timestamptz,
  updated_at timestamptz,
  locale_count bigint,
  key_count bigint
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
    p.id,
    p.name,
    p.description,
    p.prefix,
    p.default_locale,
    p.created_at,
    p.updated_at,
    coalesce(count(distinct pl.id), 0) as locale_count,
    coalesce(count(distinct k.id), 0) as key_count
  from projects p
  left join project_locales pl on p.id = pl.project_id
  left join keys k on p.id = k.project_id
  where p.owner_user_id = v_owner_user_id
  group by p.id, p.name, p.description, p.prefix, p.default_locale, p.created_at, p.updated_at
  limit p_limit
  offset p_offset;
end;
$$;

comment on function list_projects_with_counts is 
  'Lists projects for authenticated user with locale and key counts';

