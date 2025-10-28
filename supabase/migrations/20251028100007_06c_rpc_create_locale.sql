-- =====================================================================
-- migration: 06c_rpc_create_locale
-- description: RPC function for atomic locale creation with fan-out
-- =====================================================================

create function create_project_locale_atomic(
  p_project_id uuid,
  p_locale text,
  p_label text
)
returns table (
  id uuid,
  project_id uuid,
  locale text,
  label text,
  created_at timestamptz,
  updated_at timestamptz
)
security definer
language plpgsql as $$
declare
  v_locale_id uuid;
  v_owner_user_id uuid;
  v_key_count integer;
  v_expected_translations integer;
  v_actual_translations integer;
  v_normalized_locale locale_code;
begin
  v_owner_user_id := auth.uid();
  if v_owner_user_id is null then
    raise exception 'Authentication required'
    using errcode = '42501',
          detail = 'error_code:AUTHENTICATION_REQUIRED';
  end if;

  if not exists (
    select 1 from projects p
    where p.id = p_project_id and p.owner_user_id = v_owner_user_id
  ) then
    raise exception 'Project not found or access denied'
    using errcode = '42501',
          detail = 'error_code:PROJECT_ACCESS_DENIED';
  end if;

  begin
    v_normalized_locale := case
      when p_locale ~ '^[a-zA-Z]{2}-[a-zA-Z]{2}$' then
        lower(substring(p_locale from 1 for 2)) || '-' || upper(substring(p_locale from 4 for 2))
      when p_locale ~ '^[a-zA-Z]{2}$' then
        lower(p_locale)
      else
        p_locale::locale_code
    end;
  exception when others then
    raise exception 'Invalid locale format: "%". Must be ll or ll-CC format (e.g., "en", "en-US")', p_locale
    using errcode = '23514',
          detail = 'error_code:INVALID_LOCALE_FORMAT,field:p_locale,constraint:locale_format';
  end;

  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'Label is required'
    using errcode = '23514',
          detail = 'error_code:FIELD_REQUIRED,field:p_label';
  end if;

  if length(p_label) > 64 then
    raise exception 'Label must be at most 64 characters'
    using errcode = '23514',
          detail = 'error_code:MAX_LENGTH_EXCEEDED,field:p_label,constraint:max_length,max_length:64';
  end if;

  if exists (
    select 1 from project_locales pl
    where pl.project_id = p_project_id and pl.locale = v_normalized_locale
  ) then
    raise exception 'Locale already exists for this project'
    using errcode = '23505',
          detail = 'error_code:DUPLICATE_LOCALE,field:p_locale';
  end if;

  select count(*) into v_key_count
  from keys k where k.project_id = p_project_id;

  begin
    insert into project_locales (project_id, locale, label)
    values (p_project_id, v_normalized_locale, trim(p_label))
    returning project_locales.id into v_locale_id;
  exception
    when unique_violation then
      raise exception 'Locale already exists for this project'
      using errcode = '23505',
            detail = 'error_code:DUPLICATE_LOCALE,field:p_locale';
    when others then
      raise exception 'An unexpected error occurred during locale creation: %', sqlerrm
      using errcode = '50000',
            detail = 'error_code:UNEXPECTED_ERROR,original_error:' || sqlerrm;
  end;

  if v_key_count > 0 then
    perform pg_sleep(0.1);

    v_expected_translations := v_key_count;

    select count(*) into v_actual_translations
    from translations t
    where t.project_id = p_project_id
      and t.locale = v_normalized_locale;

    if v_actual_translations = 0 then
      delete from project_locales pl where pl.id = v_locale_id;

      raise exception 'Failed to initialize translations for new locale'
      using errcode = '50000',
            detail = 'error_code:FANOUT_VERIFICATION_FAILED,locale:' || v_normalized_locale || ',key_count:' || v_key_count;
    end if;

    if v_actual_translations < v_expected_translations then
      delete from project_locales pl where pl.id = v_locale_id;

      raise exception 'Incomplete translation initialization'
      using errcode = '50000',
            detail = 'error_code:FANOUT_INCOMPLETE,expected:' || v_expected_translations || ',actual:' || v_actual_translations || ',locale:' || v_normalized_locale;
    end if;
  end if;

  return query
  select
    pl.id,
    pl.project_id,
    pl.locale::text,
    pl.label::text,
    pl.created_at,
    pl.updated_at
  from project_locales pl
  where pl.id = v_locale_id;

exception
  when sqlstate '42501' then
    raise;
  when sqlstate '23505' then
    raise;
  when sqlstate '23514' then
    raise;
  when sqlstate '50000' then
    raise;
  when others then
    raise exception 'An unexpected error occurred during locale creation: %', sqlerrm
    using errcode = '50000',
          detail = 'error_code:UNEXPECTED_ERROR,original_error:' || sqlerrm;
end;
$$;
