-- =====================================================================
-- migration: 06d_rpc_check_fanout
-- description: RPC function for checking fan-out completeness
-- =====================================================================

create function check_fanout_completeness(p_project_id uuid)
returns table (
  locale_code text,
  expected_translations integer,
  actual_translations integer,
  missing_translations integer,
  is_complete boolean
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

  if not exists (
    select 1 from projects
    where id = p_project_id and owner_user_id = v_owner_user_id
  ) then
    raise exception 'Project not found or access denied';
  end if;

  return query
  select
    pl.locale::text,
    (select count(*)::integer from keys where project_id = p_project_id) as expected,
    count(t.key_id)::integer as actual,
    ((select count(*) from keys where project_id = p_project_id) - count(t.key_id))::integer as missing,
    (count(t.key_id) = (select count(*) from keys where project_id = p_project_id)) as is_complete
  from project_locales pl
  left join translations t on t.project_id = pl.project_id and t.locale = pl.locale
  where pl.project_id = p_project_id
  group by pl.locale, pl.created_at
  order by pl.created_at;
end;
$$;
