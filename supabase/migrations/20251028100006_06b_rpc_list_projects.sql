-- =====================================================================
-- migration: 06b_rpc_list_projects
-- description: RPC functions for listing projects and locales
-- =====================================================================

-- ---------------------------------------------------------------------
-- list_projects_with_counts
-- ---------------------------------------------------------------------
create function list_projects_with_counts(
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

-- ---------------------------------------------------------------------
-- list_project_locales_with_default
-- ---------------------------------------------------------------------
create function list_project_locales_with_default(
  p_project_id uuid
)
returns table (
  id uuid,
  project_id uuid,
  locale text,
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
  v_owner_user_id := auth.uid();

  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    pl.id,
    pl.project_id,
    pl.locale::text,
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
