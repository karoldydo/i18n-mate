-- =====================================================================
-- migration: 07_rpc_functions_keys_translations
-- description: RPC functions for key and translation management
-- functions: create_key_with_value, list_keys_default_view,
--            list_keys_per_language_view, emit_key_created_event
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_key_with_value
-- ---------------------------------------------------------------------
create function create_key_with_value(
  p_project_id uuid,
  p_full_key varchar(256),
  p_default_value varchar(250)
)
returns table(key_id uuid)
security definer
language plpgsql as $$
declare
  v_key_id uuid;
  v_default_locale locale_code;
  v_owner_user_id uuid;
begin
  -- check authentication
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- get project default locale and verify ownership
  select default_locale into v_default_locale
  from projects where id = p_project_id and owner_user_id = v_owner_user_id;
  if v_default_locale is null then
    raise exception 'Project not found or access denied';
  end if;

  -- insert key
  insert into keys (project_id, full_key)
  values (p_project_id, p_full_key)
  returning id into v_key_id;

  -- insert default locale translation
  insert into translations (project_id, key_id, locale, value, updated_at, updated_source, updated_by_user_id)
  values (p_project_id, v_key_id, v_default_locale, p_default_value, now(), 'user', auth.uid());

  -- return as table row
  return query select v_key_id;
end;
$$;

comment on function create_key_with_value is
  'Creates key with default locale value. Returns TABLE with single row { key_id }. Client hooks use .single() to extract object.';

-- ---------------------------------------------------------------------
-- list_keys_default_view
-- ---------------------------------------------------------------------
create function list_keys_default_view(
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
  -- check authentication
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- verify project ownership
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

comment on function list_keys_default_view is
  'List keys with default-locale values and missing counts. Fixed: qualified column references.';

-- ---------------------------------------------------------------------
-- list_keys_per_language_view
-- ---------------------------------------------------------------------
create function list_keys_per_language_view(
  p_project_id uuid,
  p_locale text,
  p_search text default null,
  p_missing_only boolean default false,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof key_per_language_view_type
security definer
language plpgsql as $$
declare
  v_owner_user_id uuid;
begin
  -- standard authentication check
  v_owner_user_id := auth.uid();

  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- validate locale format
  if not is_valid_locale_format(p_locale) then
    raise exception 'Invalid locale format. Use BCP-47 format (e.g., "en", "en-US")'
      using errcode = '22023';
  end if;

  -- check project ownership and locale existence
  if not exists (
    select 1 from projects p
    where p.id = p_project_id and p.owner_user_id = v_owner_user_id
  ) then
    raise exception 'Project not found or access denied';
  end if;

  if not exists (
    select 1 from project_locales pl
    where pl.project_id = p_project_id and pl.locale = p_locale
  ) then
    raise exception 'Locale not found in project';
  end if;

  return query
  select
    k.id as key_id,
    k.full_key::varchar(256),
    coalesce(t.value, '')::varchar(250) as value,
    coalesce(t.is_machine_translated, false) as is_machine_translated,
    coalesce(t.updated_at, k.created_at) as updated_at,
    coalesce(t.updated_source, 'user'::update_source_type) as updated_source,
    t.updated_by_user_id
  from keys k
  left join translations t on k.id = t.key_id and t.locale = p_locale
  where k.project_id = p_project_id
    and (p_search is null or k.full_key ilike '%' || p_search || '%')
    and (not p_missing_only or t.value is null or t.value = '')
  order by k.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

comment on function list_keys_per_language_view is
  'List keys with values for selected locale and metadata. Uses composite type return. Fixed type casting.';

-- ---------------------------------------------------------------------
-- emit_key_created_event
-- ---------------------------------------------------------------------
create function emit_key_created_event()
returns trigger
security definer
language plpgsql as $$
declare
  v_key_count int;
begin
  -- ensure partition exists before insert
  perform ensure_telemetry_partition_exists();

  select count(*) into v_key_count from keys where project_id = new.project_id;
  insert into telemetry_events (project_id, event_name, properties)
  values (
    new.project_id,
    'key_created',
    jsonb_build_object('full_key', new.full_key, 'key_count', v_key_count)
  );
  return new;
exception
  when others then
    raise warning 'Failed to emit key_created event for project %: %',
      new.project_id, sqlerrm;
    return new;
end;
$$;

comment on function emit_key_created_event is
  'Emits key_created telemetry event when a new key is inserted';

-- apply trigger for telemetry
create trigger emit_key_created_event_trigger
  after insert on keys
  for each row execute function emit_key_created_event();
