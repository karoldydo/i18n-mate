-- =====================================================================
-- migration: 10_fix_list_projects_total_count
-- description: Fix total count in list_projects_with_counts RPC function
-- =====================================================================

-- Drop existing function
drop function if exists list_projects_with_counts(int, int);

-- Recreate function with total_count column
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
  key_count bigint,
  total_count bigint
)
security definer
language plpgsql as $$
declare
  v_owner_user_id uuid;
  v_total_count bigint;
begin
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Get total count of projects for current user
  select count(*)
  into v_total_count
  from projects p
  where p.owner_user_id = v_owner_user_id;

  -- Return paginated results with total count
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
    coalesce(key_counts.count, 0) as key_count,
    v_total_count as total_count
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
