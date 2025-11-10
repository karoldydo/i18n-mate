-- =====================================================================
-- migration: 12_rpc_list_telemetry_events_with_count
-- description: Add RPC function to list telemetry events with total count
-- =====================================================================

-- Create function to list telemetry events with total count for pagination
create function list_telemetry_events_with_count(
  p_project_id uuid,
  p_limit int default 50,
  p_offset int default 0,
  p_order_by text default 'created_at',
  p_ascending boolean default false
)
returns table (
  id uuid,
  project_id uuid,
  event_name event_type,
  properties jsonb,
  created_at timestamptz,
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

  -- verify project ownership
  if not exists (
    select 1 from projects p
    where p.id = p_project_id
    and p.owner_user_id = v_owner_user_id
  ) then
    raise exception 'Project not found or access denied'
    using errcode = 'P0001',
          detail = 'error_code:PROJECT_NOT_FOUND,field:project_id',
          hint = 'The specified project does not exist or you do not have access to it.';
  end if;

  -- get total count of telemetry events for the project
  select count(*)
  into v_total_count
  from telemetry_events te
  where te.project_id = p_project_id;

  -- return paginated results with total count
  return query execute format(
    'select
      te.id,
      te.project_id,
      te.event_name,
      te.properties,
      te.created_at,
      %L::bigint as total_count
    from telemetry_events te
    where te.project_id = %L
    order by %I %s
    limit %L offset %L',
    v_total_count,
    p_project_id,
    p_order_by,
    case when p_ascending then 'asc' else 'desc' end,
    p_limit,
    p_offset
  );
end;
$$;

comment on function list_telemetry_events_with_count is
  'List telemetry events for a project with total count for pagination. Returns events ordered by specified column with total count included in each row.';
