-- =====================================================================
-- migration: 04_triggers_and_functions
-- description: business logic enforcement via database triggers and functions
-- tables affected: projects, project_locales, keys, translations, translation_jobs
-- notes: all errors use structured DETAIL format for frontend parsing
-- =====================================================================

-- =====================================================================
-- VALIDATION HELPER FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- is_valid_locale_format (for normalized locales)
-- ---------------------------------------------------------------------
create function is_valid_locale_format(locale_input text)
returns boolean
language plpgsql
immutable as $$
begin
  if locale_input is null then
    return false;
  end if;

  if length(locale_input) > 5 then
    return false;
  end if;

  -- must match normalized pattern exactly
  if not (locale_input ~ '^[a-z]{2}(-[A-Z]{2})?$') then
    return false;
  end if;

  return true;
end;
$$;

comment on function is_valid_locale_format is
  'Validates locale format against exact domain pattern: ^[a-z]{2}(-[A-Z]{2})?$ '
  'Expects normalized input (language lowercase, country uppercase). '
  'Synchronized with LOCALE_CODE_PATTERN in TypeScript constants.';

-- ---------------------------------------------------------------------
-- is_valid_locale_input (for pre-normalization input)
-- ---------------------------------------------------------------------
create function is_valid_locale_input(locale_input text)
returns boolean
language plpgsql
immutable as $$
begin
  if locale_input is null then
    return false;
  end if;

  if length(locale_input) > 5 then
    return false;
  end if;

  -- allow mixed case input (will be normalized by triggers)
  if not (locale_input ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') then
    return false;
  end if;

  if locale_input ~ '.*-.*-.*' then
    return false;
  end if;

  if locale_input ~ '[^a-zA-Z-]' then
    return false;
  end if;

  return true;
end;
$$;

comment on function is_valid_locale_input is
  'Validates raw locale input before normalization. Pattern: ^[a-zA-Z]{2}(-[a-zA-Z]{2})?$ '
  'Accepts mixed case (En-Us, en-us, EN-GB) that will be normalized by triggers. '
  'Synchronized with LOCALE_CODE_INPUT_PATTERN in TypeScript constants.';

-- =====================================================================
-- NORMALIZATION FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- normalize_locale
-- ---------------------------------------------------------------------
create function normalize_locale()
returns trigger as $$
begin
  -- normalize to ll or ll-CC (language lowercase, REGION uppercase)
  new.locale := case
    when new.locale ~ '^[a-zA-Z]{2}-[a-zA-Z]{2}$' then
      lower(substring(new.locale from 1 for 2)) || '-' || upper(substring(new.locale from 4 for 2))
    when new.locale ~ '^[a-zA-Z]{2}$' then
      lower(new.locale)
    else
      new.locale -- will fail domain check
  end;
  return new;
end;
$$ language plpgsql;

comment on function normalize_locale is
  'Normalizes locale codes to ll or ll-CC format. Language lowercase, REGION uppercase. '
  'Examples: en-us → en-US, PL → pl, EN-gb → en-GB';

-- ---------------------------------------------------------------------
-- trim_translation_value
-- ---------------------------------------------------------------------
create function trim_translation_value()
returns trigger as $$
begin
  if new.value is not null then
    new.value := btrim(new.value);
    if new.value = '' then
      new.value := null;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

comment on function trim_translation_value is
  'Automatically trims whitespace from translation values and converts empty strings to NULL';

-- ---------------------------------------------------------------------
-- update_updated_at
-- ---------------------------------------------------------------------
create function update_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

comment on function update_updated_at is
  'Automatically updates updated_at timestamp on row modification';

-- =====================================================================
-- VALIDATION TRIGGER FUNCTIONS (with structured errors)
-- =====================================================================

-- ---------------------------------------------------------------------
-- validate_locale_format_strict
-- ---------------------------------------------------------------------
create function validate_locale_format_strict()
returns trigger
language plpgsql as $$
begin
  if new.locale is not null then
    -- check basic pattern
    if not (new.locale ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') then
      raise exception 'Invalid locale format'
      using errcode = '23514',
            detail = 'error_code:INVALID_FORMAT,field:locale,value:' || new.locale,
            hint = 'Use 2-letter language code, optionally followed by dash and 2-letter country code (e.g., "en", "en-US", "pl", "pl-PL")';
    end if;

    -- check length
    if length(new.locale) > 8 then
      raise exception 'Locale code too long'
      using errcode = '23514',
            detail = 'error_code:TOO_LONG,field:locale,value:' || new.locale || ',max_length:8',
            hint = 'Locale codes must be 8 characters or less';
    end if;

    -- check for invalid characters
    if new.locale ~ '[^a-zA-Z-]' then
      raise exception 'Invalid characters in locale'
      using errcode = '23514',
            detail = 'error_code:INVALID_CHARACTERS,field:locale,value:' || new.locale,
            hint = 'Only letters and one dash are allowed in locale codes';
    end if;

    -- check for too many dashes
    if (length(new.locale) - length(replace(new.locale, '-', ''))) > 1 then
      raise exception 'Too many dashes in locale'
      using errcode = '23514',
            detail = 'error_code:TOO_MANY_DASHES,field:locale,value:' || new.locale,
            hint = 'Locale codes can have at most one dash';
    end if;

    -- check if user provided language name instead of code
    if new.locale ilike 'english' or new.locale ilike 'polish' or new.locale ilike 'spanish'
       or new.locale ilike 'french' or new.locale ilike 'german' or new.locale ilike 'italian' then
      raise exception 'Use locale code, not language name'
      using errcode = '23514',
            detail = 'error_code:LOCALE_IS_LANGUAGE_NAME,field:locale,value:' || new.locale,
            hint = 'Use ISO 639-1 language codes: "en" for English, "pl" for Polish, "es" for Spanish, "fr" for French, "de" for German, "it" for Italian';
    end if;
  end if;

  return new;
end;
$$;

comment on function validate_locale_format_strict is
  'Validates locale format with detailed structured error messages for frontend parsing';

-- ---------------------------------------------------------------------
-- validate_project_default_locale_format
-- ---------------------------------------------------------------------
create function validate_project_default_locale_format()
returns trigger
language plpgsql as $$
begin
  if new.default_locale is not null then
    -- check basic pattern
    if not (new.default_locale ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') then
      raise exception 'Invalid default_locale format'
      using errcode = '23514',
            detail = 'error_code:INVALID_FORMAT,field:default_locale,value:' || new.default_locale,
            hint = 'Use 2-letter language code, optionally followed by dash and 2-letter country code';
    end if;

    -- check length
    if length(new.default_locale) > 8 then
      raise exception 'Default locale code too long'
      using errcode = '23514',
            detail = 'error_code:TOO_LONG,field:default_locale,value:' || new.default_locale || ',max_length:8',
            hint = 'Locale codes must be 8 characters or less';
    end if;

    -- check for invalid characters
    if new.default_locale ~ '[^a-zA-Z-]' then
      raise exception 'Invalid characters in default_locale'
      using errcode = '23514',
            detail = 'error_code:INVALID_CHARACTERS,field:default_locale,value:' || new.default_locale,
            hint = 'Only letters and one dash are allowed';
    end if;
  end if;

  return new;
end;
$$;

comment on function validate_project_default_locale_format is
  'Validates project default_locale format with structured error messages';

-- ---------------------------------------------------------------------
-- validate_key_prefix
-- ---------------------------------------------------------------------
create function validate_key_prefix()
returns trigger as $$
declare
  project_prefix varchar(4);
begin
  select prefix into project_prefix from projects where id = new.project_id;

  if not (new.full_key like project_prefix || '.%') then
    raise exception 'full_key must start with project prefix'
    using errcode = '23514',
          detail = 'error_code:KEY_INVALID_PREFIX,field:full_key,expected_prefix:' || project_prefix,
          hint = 'Keys must start with the project prefix followed by a dot (e.g., "' || project_prefix || '.your.key")';
  end if;

  return new;
end;
$$ language plpgsql;

comment on function validate_key_prefix is
  'Validates that keys.full_key starts with project.prefix + "."';

-- ---------------------------------------------------------------------
-- validate_default_locale_value
-- ---------------------------------------------------------------------
create function validate_default_locale_value()
returns trigger as $$
declare
  v_project_default_locale locale_code;
  v_translation_value text;
begin
  -- get project default locale
  select default_locale into v_project_default_locale
  from projects
  where id = new.project_id;

  -- check if this is a default locale translation
  if new.locale = v_project_default_locale then
    v_translation_value := coalesce(new.value, '');

    -- ensure value is not NULL or empty for default locale
    if length(trim(v_translation_value)) = 0 then
      raise exception 'Value cannot be NULL or empty for default locale'
      using errcode = '23514',
            detail = 'error_code:DEFAULT_VALUE_EMPTY,field:value,locale:' || new.locale,
            hint = 'Default locale translations must have a non-empty value';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

comment on function validate_default_locale_value is
  'Ensures default_locale translations are never null or empty';

-- ---------------------------------------------------------------------
-- validate_source_locale_is_default
-- ---------------------------------------------------------------------
create function validate_source_locale_is_default()
returns trigger as $$
declare
  v_project_default_locale locale_code;
begin
  select p.default_locale into v_project_default_locale
  from projects p
  where p.id = new.project_id;

  if new.source_locale <> v_project_default_locale then
    raise exception 'source_locale must equal project default_locale'
    using errcode = '23514',
          detail = 'error_code:TARGET_LOCALE_IS_DEFAULT,field:source_locale,expected:' || v_project_default_locale || ',actual:' || new.source_locale,
          hint = 'Translation jobs must use the project''s default locale as the source';
  end if;

  return new;
end;
$$ language plpgsql;

comment on function validate_source_locale_is_default is
  'Ensures translation job source_locale matches project default_locale';

-- =====================================================================
-- IMMUTABILITY PROTECTION FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- prevent_default_locale_change
-- ---------------------------------------------------------------------
create function prevent_default_locale_change()
returns trigger as $$
begin
  if old.default_locale is distinct from new.default_locale then
    raise exception 'default_locale is immutable'
    using errcode = '23514',
          detail = 'error_code:DEFAULT_LOCALE_IMMUTABLE,field:default_locale',
          hint = 'The default locale cannot be changed after project creation';
  end if;
  return new;
end;
$$ language plpgsql;

comment on function prevent_default_locale_change is
  'Prevents modification of projects.default_locale after creation';

-- ---------------------------------------------------------------------
-- prevent_prefix_change
-- ---------------------------------------------------------------------
create function prevent_prefix_change()
returns trigger as $$
begin
  if old.prefix is distinct from new.prefix then
    raise exception 'prefix is immutable'
    using errcode = '23514',
          detail = 'error_code:PREFIX_IMMUTABLE,field:prefix,old_value:' || old.prefix || ',new_value:' || new.prefix,
          hint = 'The prefix cannot be changed after project creation as it would invalidate all existing keys';
  end if;
  return new;
end;
$$ language plpgsql;

comment on function prevent_prefix_change is
  'Prevents modification of projects.prefix after creation';

-- ---------------------------------------------------------------------
-- prevent_default_locale_delete
-- ---------------------------------------------------------------------
create function prevent_default_locale_delete()
returns trigger as $$
begin
  if old.locale = (select default_locale from projects where id = old.project_id) then
    raise exception 'Cannot delete default locale'
    using errcode = '23514',
          detail = 'error_code:DEFAULT_LOCALE_CANNOT_DELETE,locale:' || old.locale,
          hint = 'The default locale must always exist in the project';
  end if;
  return old;
end;
$$ language plpgsql;

comment on function prevent_default_locale_delete is
  'Prevents deletion of project default_locale from project_locales';

-- ---------------------------------------------------------------------
-- prevent_default_locale_duplicate_insert
-- ---------------------------------------------------------------------
create function prevent_default_locale_duplicate_insert()
returns trigger
language plpgsql as $$
declare
  v_project_default_locale locale_code;
begin
  select default_locale into v_project_default_locale
  from projects
  where id = new.project_id;

  if new.locale = v_project_default_locale then
    if exists (
      select 1 from project_locales
      where project_id = new.project_id
        and locale = v_project_default_locale
    ) then
      raise exception 'Cannot add default locale - it already exists'
      using errcode = '23505',
            detail = 'error_code:DEFAULT_LOCALE_DUPLICATE,locale:' || new.locale,
            hint = 'The default locale is automatically created with the project';
    end if;
  end if;

  return new;
end;
$$;

comment on function prevent_default_locale_duplicate_insert is
  'Prevents duplicate insertion of project default locale';

-- ---------------------------------------------------------------------
-- prevent_multiple_active_jobs
-- ---------------------------------------------------------------------
create function prevent_multiple_active_jobs()
returns trigger as $$
declare
  v_active_job_count integer;
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status in ('pending', 'running')) then
    select count(*) into v_active_job_count
    from translation_jobs
    where project_id = new.project_id
      and status in ('pending', 'running')
      and (tg_op = 'INSERT' or id <> new.id);

    if v_active_job_count > 0 then
      raise exception 'Only one active translation job allowed per project'
      using errcode = '23505',
            detail = 'error_code:ACTIVE_JOB_EXISTS,project_id:' || new.project_id,
            hint = 'Wait for the current job to complete or cancel it before starting a new one';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

comment on function prevent_multiple_active_jobs is
  'Ensures only one active (pending/running) translation job per project';

-- =====================================================================
-- DEFAULT LOCALE MANAGEMENT
-- =====================================================================

-- ---------------------------------------------------------------------
-- ensure_default_locale_exists
-- ---------------------------------------------------------------------
create function ensure_default_locale_exists()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- For INSERT: automatically create default locale if it doesn't exist
  if tg_op = 'INSERT' then
    insert into project_locales (project_id, locale, label, created_at, updated_at)
    values (
      new.id,
      new.default_locale,
      -- Generate user-friendly label from locale code
      case
        when new.default_locale = 'af' then 'Afrikaans'
        when new.default_locale = 'ar' then 'Arabic'
        when new.default_locale = 'bg' then 'Bulgarian'
        when new.default_locale = 'bn' then 'Bengali'
        when new.default_locale = 'ca' then 'Catalan'
        when new.default_locale = 'cs' then 'Czech'
        when new.default_locale = 'da' then 'Danish'
        when new.default_locale = 'de' then 'German'
        when new.default_locale = 'de-DE' then 'German (Germany)'
        when new.default_locale = 'de-AT' then 'German (Austria)'
        when new.default_locale = 'de-CH' then 'German (Switzerland)'
        when new.default_locale = 'el' then 'Greek'
        when new.default_locale = 'en' then 'English'
        when new.default_locale = 'en-US' then 'English (US)'
        when new.default_locale = 'en-GB' then 'English (UK)'
        when new.default_locale = 'en-AU' then 'English (Australia)'
        when new.default_locale = 'en-CA' then 'English (Canada)'
        when new.default_locale = 'es' then 'Spanish'
        when new.default_locale = 'es-ES' then 'Spanish (Spain)'
        when new.default_locale = 'es-MX' then 'Spanish (Mexico)'
        when new.default_locale = 'es-AR' then 'Spanish (Argentina)'
        when new.default_locale = 'et' then 'Estonian'
        when new.default_locale = 'eu' then 'Basque'
        when new.default_locale = 'fa' then 'Persian'
        when new.default_locale = 'fi' then 'Finnish'
        when new.default_locale = 'fr' then 'French'
        when new.default_locale = 'fr-FR' then 'French (France)'
        when new.default_locale = 'fr-CA' then 'French (Canada)'
        when new.default_locale = 'fr-CH' then 'French (Switzerland)'
        when new.default_locale = 'he' then 'Hebrew'
        when new.default_locale = 'hi' then 'Hindi'
        when new.default_locale = 'hr' then 'Croatian'
        when new.default_locale = 'hu' then 'Hungarian'
        when new.default_locale = 'id' then 'Indonesian'
        when new.default_locale = 'is' then 'Icelandic'
        when new.default_locale = 'it' then 'Italian'
        when new.default_locale = 'it-IT' then 'Italian (Italy)'
        when new.default_locale = 'it-CH' then 'Italian (Switzerland)'
        when new.default_locale = 'ja' then 'Japanese'
        when new.default_locale = 'ko' then 'Korean'
        when new.default_locale = 'lt' then 'Lithuanian'
        when new.default_locale = 'lv' then 'Latvian'
        when new.default_locale = 'nl' then 'Dutch'
        when new.default_locale = 'nl-NL' then 'Dutch (Netherlands)'
        when new.default_locale = 'nl-BE' then 'Dutch (Belgium)'
        when new.default_locale = 'no' then 'Norwegian'
        when new.default_locale = 'pl' then 'Polish'
        when new.default_locale = 'pl-PL' then 'Polish (Poland)'
        when new.default_locale = 'pt' then 'Portuguese'
        when new.default_locale = 'pt-PT' then 'Portuguese (Portugal)'
        when new.default_locale = 'pt-BR' then 'Portuguese (Brazil)'
        when new.default_locale = 'ro' then 'Romanian'
        when new.default_locale = 'ru' then 'Russian'
        when new.default_locale = 'sk' then 'Slovak'
        when new.default_locale = 'sl' then 'Slovenian'
        when new.default_locale = 'sr' then 'Serbian'
        when new.default_locale = 'sv' then 'Swedish'
        when new.default_locale = 'th' then 'Thai'
        when new.default_locale = 'tr' then 'Turkish'
        when new.default_locale = 'uk' then 'Ukrainian'
        when new.default_locale = 'vi' then 'Vietnamese'
        when new.default_locale = 'zh' then 'Chinese'
        when new.default_locale = 'zh-CN' then 'Chinese (China)'
        when new.default_locale = 'zh-TW' then 'Chinese (Taiwan)'
        when new.default_locale = 'zh-HK' then 'Chinese (Hong Kong)'
        else upper(substring(new.default_locale from 1 for 1)) || lower(substring(new.default_locale from 2))
      end,
      now(),
      now()
    )
    on conflict (project_id, locale) do nothing;

    return new;
  end if;

  -- For UPDATE: validate that new default_locale exists in project_locales
  if tg_op = 'UPDATE' and old.default_locale is distinct from new.default_locale then
    if not exists (
      select 1 from project_locales
      where project_id = new.id and locale = new.default_locale
    ) then
      raise exception 'Cannot set default_locale to a locale that does not exist in project_locales'
      using errcode = '23514',
            detail = 'error_code:LOCALE_NOT_FOUND,field:default_locale,value:' || new.default_locale,
            hint = 'Add the locale to project_locales first, then set it as default';
    end if;
  end if;

  return new;
end;
$$;

comment on function ensure_default_locale_exists is
  'Automatically creates default locale record in project_locales when project is created. Validates default_locale exists on update.';

-- =====================================================================
-- FAN-OUT FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- fan_out_translations_on_key_insert
-- ---------------------------------------------------------------------
create function fan_out_translations_on_key_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count integer;
  v_locale_count integer;
  v_project_default_locale locale_code;
begin
  select default_locale into v_project_default_locale
  from projects where id = new.project_id;

  select count(*) into v_locale_count
  from project_locales
  where project_id = new.project_id
    and locale != v_project_default_locale;

  insert into translations (project_id, key_id, locale, value, updated_at, updated_source)
  select
    new.project_id,
    new.id,
    pl.locale,
    null,
    now(),
    'user'
  from project_locales pl
  where pl.project_id = new.project_id
    and pl.locale != v_project_default_locale;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count <> v_locale_count then
    raise exception 'Failed to create translations for new key'
    using errcode = '50000',
          detail = 'error_code:FANOUT_FAILED,key_id:' || new.id || ',expected:' || v_locale_count || ',inserted:' || v_inserted_count,
          hint = 'The system failed to create translation entries for all project locales';
  end if;

  return new;
end;
$$;

comment on function fan_out_translations_on_key_insert is
  'Automatically creates translation rows for all non-default locales when a new key is inserted';

-- ---------------------------------------------------------------------
-- fan_out_translations_on_locale_insert
-- ---------------------------------------------------------------------
create function fan_out_translations_on_locale_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count integer;
  v_key_count integer;
begin
  select count(*) into v_key_count
  from keys
  where project_id = new.project_id;

  insert into translations (project_id, key_id, locale, value, updated_at, updated_source)
  select
    new.project_id,
    k.id,
    new.locale,
    null,
    now(),
    'user'
  from keys k
  where k.project_id = new.project_id;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count <> v_key_count then
    raise exception 'Failed to create translations for new locale'
    using errcode = '50000',
          detail = 'error_code:FANOUT_INCOMPLETE,locale:' || new.locale || ',expected:' || v_key_count || ',inserted:' || v_inserted_count,
          hint = 'The system failed to create translation entries for all keys';
  end if;

  return new;
end;
$$;

comment on function fan_out_translations_on_locale_insert is
  'Automatically creates translation rows for all keys when a new locale is inserted';

-- =====================================================================
-- APPLY TRIGGERS
-- =====================================================================

-- project_locales triggers
create trigger a_validate_locale_format_before_normalize_trigger
  before insert or update of locale on project_locales
  for each row execute function validate_locale_format_strict();

create trigger normalize_project_locale_insert_trigger
  before insert or update of locale on project_locales
  for each row execute function normalize_locale();

create trigger prevent_default_locale_duplicate_insert_trigger
  before insert on project_locales
  for each row execute function prevent_default_locale_duplicate_insert();

create trigger prevent_project_locale_default_delete_trigger
  before delete on project_locales
  for each row execute function prevent_default_locale_delete();

create trigger fanout_translation_locale_insert_trigger
  after insert on project_locales
  for each row execute function fan_out_translations_on_locale_insert();

create trigger update_project_locales_updated_at
  before update on project_locales
  for each row execute function update_updated_at();

-- projects triggers
create trigger a_validate_project_default_locale_format_trigger
  before insert or update of default_locale on projects
  for each row execute function validate_project_default_locale_format();

create trigger ensure_default_locale_exists_trigger
  after insert on projects
  for each row execute function ensure_default_locale_exists();

create trigger validate_default_locale_exists_trigger
  before update of default_locale on projects
  for each row execute function ensure_default_locale_exists();

create trigger prevent_project_default_locale_update_trigger
  before update of default_locale on projects
  for each row execute function prevent_default_locale_change();

create trigger prevent_project_prefix_update_trigger
  before update of prefix on projects
  for each row execute function prevent_prefix_change();

create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- keys triggers
create trigger validate_key_prefix_insert_trigger
  before insert or update of full_key on keys
  for each row execute function validate_key_prefix();

create trigger fanout_translation_key_insert_trigger
  after insert on keys
  for each row execute function fan_out_translations_on_key_insert();

-- translations triggers
create trigger trim_translation_value_insert_trigger
  before insert or update of value on translations
  for each row execute function trim_translation_value();

create trigger validate_translation_default_locale_insert_trigger
  before insert or update of value on translations
  for each row execute function validate_default_locale_value();

create trigger update_translations_updated_at
  before update on translations
  for each row execute function update_updated_at();

-- translation_jobs triggers
create trigger validate_source_locale_is_default_trigger
  before insert or update of source_locale on translation_jobs
  for each row execute function validate_source_locale_is_default();

create trigger prevent_multiple_active_jobs_trigger
  before insert or update of status on translation_jobs
  for each row execute function prevent_multiple_active_jobs();

create trigger update_translation_jobs_updated_at
  before update on translation_jobs
  for each row execute function update_updated_at();

-- translation_job_items triggers
create trigger update_translation_job_items_updated_at
  before update on translation_job_items
  for each row execute function update_updated_at();
