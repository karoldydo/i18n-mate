-- =====================================================================
-- migration: 11_rpc_get_project_with_counts
-- description: Add RPC function to fetch a single project with counts
-- =====================================================================

-- Create function to get a single project with locale and key counts
create function get_project_with_counts(
  p_project_id uuid
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

  -- Return single project with counts
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
    where project_id = p_project_id
    group by project_id
  ) locale_counts on locale_counts.project_id = p.id
  left join (
    select project_id, count(*) as count
    from keys
    where project_id = p_project_id
    group by project_id
  ) key_counts on key_counts.project_id = p.id
  where p.id = p_project_id
    and p.owner_user_id = v_owner_user_id;
end;
$$;
