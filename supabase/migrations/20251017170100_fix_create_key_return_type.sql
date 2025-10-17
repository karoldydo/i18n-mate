-- =====================================================================
-- migration: fix create_key_with_value return type
-- description: Change return type from json to TABLE for consistency
--              with PostgREST conventions and type safety
-- =====================================================================

-- Drop the existing function
drop function if exists create_key_with_value(uuid, varchar, varchar);

-- Recreate function with TABLE return type instead of json
create function create_key_with_value(
  p_project_id uuid,
  p_full_key varchar(256),
  p_default_value varchar(250)
)
returns table(key_id uuid)  -- Changed from: returns json
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

  -- Insert key
  insert into keys (project_id, full_key)
  values (p_project_id, p_full_key)
  returning id into v_key_id;

  -- Insert default locale translation
  insert into translations (project_id, key_id, locale, value, updated_at, updated_source, updated_by_user_id)
  values (p_project_id, v_key_id, v_default_locale, p_default_value, now(), 'user', auth.uid());

  -- Return as table row (PostgREST will wrap in array)
  return query select v_key_id;
end;
$$;

comment on function create_key_with_value is
  'Creates key with default locale value. Returns TABLE with single row { key_id }. PostgREST wraps result in array; client hooks use .single() to extract single object.';
