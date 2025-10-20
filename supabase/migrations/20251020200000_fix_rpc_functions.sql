-- Migration: Fix RPC functions with SQL errors
-- timestamp: 20251020200000
-- description: Fixes list_keys_default_view (ambiguous id column) and list_projects_with_counts (citext vs varchar type mismatch)

-- ============================================================================
-- 1) Fix list_keys_default_view - ambiguous column "id" error
-- ============================================================================

-- Drop and recreate to fix ambiguous column reference
drop function if exists list_keys_default_view(uuid, text, boolean, int, int);

create or replace function list_keys_default_view(
  p_project_id uuid,
  p_search text default null,
  p_missing_only boolean default false,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  full_key varchar(256),
  created_at timestamptz,
  value varchar(250),
  missing_count int
)
security definer
language plpgsql as $$
declare
  v_owner_user_id uuid;
begin
  -- Check authentication
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Verify project ownership
  if not exists (
    select 1 from projects proj where proj.id = p_project_id and proj.owner_user_id = v_owner_user_id
  ) then
    raise exception 'Project not found or access denied';
  end if;

  return query
  with default_locale as (
    select proj.default_locale from projects proj where proj.id = p_project_id
  )
  select
    k.id as id,
    k.full_key as full_key,
    k.created_at as created_at,
    t.value as value,
    (
      select count(*)::int from translations t2
      where t2.key_id = k.id and t2.value is null
    ) as missing_count
  from keys k
  join translations t
    on t.key_id = k.id
   and t.project_id = k.project_id
   and t.locale = (select default_locale from default_locale)
  where k.project_id = p_project_id
    and (p_search is null or k.full_key ilike ('%' || p_search || '%'))
    and (not p_missing_only or (
      (
        select count(*) from translations t3
        where t3.key_id = k.id and t3.value is null
      ) > 0
    ))
  order by k.full_key asc
  limit p_limit offset p_offset;
end;
$$;

comment on function list_keys_default_view is 'List keys with default-locale values and missing counts. Fixed: qualified column references to avoid ambiguity.';

-- ============================================================================
-- 2) Fix list_projects_with_counts - citext vs varchar type mismatch
-- ============================================================================

-- Drop and recreate to fix return type mismatch (citext vs varchar)
drop function if exists list_projects_with_counts(int, int);

create or replace function list_projects_with_counts(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  name varchar(100),
  description text,
  prefix varchar(4),
  default_locale varchar(10),
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
  -- Check authentication
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    p.id,
    p.name::varchar(100),
    p.description,
    p.prefix::varchar(4),
    p.default_locale::varchar(10),
    p.created_at,
    p.updated_at,
    coalesce(locale_counts.count, 0) as locale_count,
    coalesce(key_counts.count, 0) as key_count
  from projects p
  left join (
    select project_id, count(*) as count
    from project_locales
    group by project_id
  ) locale_counts on locale_counts.project_id = p.id
  left join (
    select project_id, count(*) as count
    from keys
    group by project_id
  ) key_counts on key_counts.project_id = p.id
  where p.owner_user_id = v_owner_user_id
  order by p.updated_at desc
  limit p_limit offset p_offset;
end;
$$;

comment on function list_projects_with_counts is 'List projects with locale and key counts. Fixed: explicit type casts from citext to varchar.';
