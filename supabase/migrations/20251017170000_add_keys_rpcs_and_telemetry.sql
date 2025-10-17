-- =====================================================================
-- migration: add keys RPCs and telemetry trigger; adjust create_key_with_value return
-- description: adds list_keys_default_view, list_keys_per_language_view RPCs;
--              emits key_created telemetry on key insert; aligns RPC return
--              shape of create_key_with_value to { key_id }
-- =====================================================================

-- Drop the existing function to allow changing the return type
drop function if exists create_key_with_value(uuid, varchar, varchar);

-- 1) Adjust create_key_with_value return shape to single object { key_id }
create function create_key_with_value(
  p_project_id uuid,
  p_full_key varchar(256),
  p_default_value varchar(250)
)
returns json
security definer
language plpgsql as $$
declare
  v_key_id uuid;
  v_default_locale locale_code;
  v_owner_user_id uuid;
begin
  -- Check authentication
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Get project default locale and verify ownership
  select default_locale into v_default_locale
  from projects where id = p_project_id and owner_user_id = v_owner_user_id;
  if v_default_locale is null then
    raise exception 'Project not found or access denied';
  end if;

  insert into keys (project_id, full_key)
  values (p_project_id, p_full_key)
  returning id into v_key_id;

  insert into translations (project_id, key_id, locale, value, updated_at, updated_source, updated_by_user_id)
  values (p_project_id, v_key_id, v_default_locale, p_default_value, now(), 'user', auth.uid());

  return json_build_object('key_id', v_key_id);
end;
$$;

comment on function create_key_with_value is 'Creates key with default locale value and returns single object { key_id }';

-- 2) RPC: list_keys_default_view
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
    select 1 from projects where id = p_project_id and owner_user_id = v_owner_user_id
  ) then
    raise exception 'Project not found or access denied';
  end if;

  return query
  with default_locale as (
    select default_locale from projects where id = p_project_id
  )
  select
    k.id,
    k.full_key,
    k.created_at,
    t.value,
    (
      select count(*) from translations t2
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

comment on function list_keys_default_view is 'List keys with default-locale values and missing counts';

-- 3) RPC: list_keys_per_language_view
create or replace function list_keys_per_language_view(
  p_project_id uuid,
  p_locale locale_code,
  p_search text default null,
  p_missing_only boolean default false,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  key_id uuid,
  full_key varchar(256),
  value varchar(250),
  is_machine_translated boolean,
  updated_at timestamptz,
  updated_source update_source_type,
  updated_by_user_id uuid
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
  select
    k.id as key_id,
    k.full_key,
    t.value,
    t.is_machine_translated,
    t.updated_at,
    t.updated_source,
    t.updated_by_user_id
  from keys k
  join translations t
    on t.key_id = k.id
   and t.project_id = k.project_id
   and t.locale = p_locale
  where k.project_id = p_project_id
    and (p_search is null or k.full_key ilike ('%' || p_search || '%'))
    and (not p_missing_only or t.value is null)
  order by k.full_key asc
  limit p_limit offset p_offset;
end;
$$;

comment on function list_keys_per_language_view is 'List keys with values for selected locale and metadata';

-- 4) Telemetry: emit key_created on keys insert
create or replace function emit_key_created_event()
returns trigger
security definer
language plpgsql as $$
declare
  v_key_count int;
begin
  select count(*) into v_key_count from keys where project_id = new.project_id;
  insert into telemetry_events (project_id, event_name, properties)
  values (
    new.project_id,
    'key_created',
    jsonb_build_object('full_key', new.full_key, 'key_count', v_key_count)
  );
  return new;
end;
$$;

drop trigger if exists emit_key_created_event_trigger on keys;
create trigger emit_key_created_event_trigger
  after insert on keys
  for each row execute function emit_key_created_event();


