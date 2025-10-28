-- =====================================================================
-- migration: 06a_rpc_create_project
-- description: RPC function for project creation
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_project_with_default_locale
-- ---------------------------------------------------------------------
create function create_project_with_default_locale(
  p_name text,
  p_prefix text,
  p_default_locale locale_code,
  p_default_locale_label text,
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
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Project name is required';
  end if;

  if p_prefix is null or length(trim(p_prefix)) = 0 then
    raise exception 'Project prefix is required';
  end if;

  if p_default_locale is null then
    raise exception 'Default locale is required';
  end if;

  if p_default_locale_label is null or length(trim(p_default_locale_label)) = 0 then
    raise exception 'Default locale label is required';
  end if;

  begin
    insert into projects (owner_user_id, name, prefix, default_locale, description)
    values (v_owner_user_id, trim(p_name), trim(p_prefix), p_default_locale, p_description)
    returning projects.id into v_project_id;

    if p_default_locale_label is not null and trim(p_default_locale_label) <> '' then
      update project_locales
      set label = trim(p_default_locale_label)
      where project_id = v_project_id and locale = p_default_locale;
    end if;

    insert into telemetry_events (event_name, project_id, properties)
    values ('project_created', v_project_id, jsonb_build_object(
      'locale_count', 1,
      'default_locale', p_default_locale
    ));

  exception when others then
    raise;
  end;

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

exception
  when unique_violation then
    if sqlerrm like '%projects_name_unique_per_owner%' then
      raise exception 'Project name already exists'
      using errcode = '23505',
            detail = 'error_code:DUPLICATE_PROJECT_NAME,field:name';
    elsif sqlerrm like '%projects_prefix_unique_per_owner%' then
      raise exception 'Project prefix already exists'
      using errcode = '23505',
            detail = 'error_code:DUPLICATE_PROJECT_PREFIX,field:prefix';
    else
      raise exception 'Duplicate constraint violation: %', sqlerrm
      using errcode = '23505',
            detail = 'error_code:DUPLICATE_CONSTRAINT';
    end if;
  when others then
    raise exception 'Failed to create project: %', sqlerrm
    using errcode = '50000',
          detail = 'error_code:PROJECT_CREATION_FAILED';
end;
$$;
