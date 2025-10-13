-- =====================================================================
-- migration: create triggers and functions
-- description: business logic enforcement via database triggers
-- tables affected: projects, project_locales, keys, translations,
--                  translation_jobs, translation_job_items
-- notes: triggers execute in order; some use security definer for rls bypass
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. locale normalization
-- ---------------------------------------------------------------------

-- normalizes locale codes to ll or ll-CC format
-- language part: lowercase (en, pl)
-- region part: uppercase (US, PL)
-- examples: en-us → en-US, PL → pl, EN-gb → en-GB
create or replace function normalize_locale()
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

-- apply normalization before insert or update
create trigger normalize_locale_trigger
  before insert or update of locale on project_locales
  for each row execute function normalize_locale();

-- ---------------------------------------------------------------------
-- 2. prevent default locale changes
-- ---------------------------------------------------------------------

-- prevents modification of projects.default_locale
-- default_locale is immutable once set during project creation
-- rationale: changing default locale would invalidate key prefix validation
--            and require complex data migration
create or replace function prevent_default_locale_change()
returns trigger as $$
begin
  if old.default_locale is distinct from new.default_locale then
    raise exception 'default_locale is immutable';
  end if;
  return new;
end;
$$ language plpgsql;

-- block updates to default_locale column
create trigger prevent_default_locale_change_trigger
  before update of default_locale on projects
  for each row execute function prevent_default_locale_change();

-- ---------------------------------------------------------------------
-- 3. prevent default locale deletion
-- ---------------------------------------------------------------------

-- prevents deletion of project's default_locale from project_locales
-- rationale: default_locale must always exist for key creation and validation
create or replace function prevent_default_locale_delete()
returns trigger as $$
begin
  if old.locale = (select default_locale from projects where id = old.project_id) then
    raise exception 'Cannot delete default_locale';
  end if;
  return old;
end;
$$ language plpgsql;

-- block deletion of default_locale
create trigger prevent_default_locale_delete_trigger
  before delete on project_locales
  for each row execute function prevent_default_locale_delete();

-- ---------------------------------------------------------------------
-- 4. prevent prefix change
-- ---------------------------------------------------------------------

-- prevents modification of projects.prefix
-- prefix is immutable once set during project creation
-- rationale: changing prefix would invalidate all existing keys
create or replace function prevent_prefix_change()
returns trigger as $$
begin
  if old.prefix is distinct from new.prefix then
    raise exception 'prefix is immutable';
  end if;
  return new;
end;
$$ language plpgsql;

-- block updates to prefix column
create trigger prevent_prefix_change_trigger
  before update of prefix on projects
  for each row execute function prevent_prefix_change();

-- ---------------------------------------------------------------------
-- 5. validate key prefix
-- ---------------------------------------------------------------------

-- validates that keys.full_key starts with project.prefix + "."
-- examples:
--   project prefix "app" → keys must start with "app."
--   valid: app.welcome, app.auth.login
--   invalid: welcome, appwelcome, other.key
create or replace function validate_key_prefix()
returns trigger as $$
declare
  project_prefix varchar(4);
begin
  select prefix into project_prefix from projects where id = new.project_id;

  if not (new.full_key like project_prefix || '.%') then
    raise exception 'full_key must start with project prefix "%" followed by "."', project_prefix;
  end if;

  return new;
end;
$$ language plpgsql;

-- validate prefix on key insert or update
create trigger validate_key_prefix_trigger
  before insert or update of full_key on keys
  for each row execute function validate_key_prefix();

-- ---------------------------------------------------------------------
-- 6. auto-trim translation values
-- ---------------------------------------------------------------------

-- automatically trims whitespace from translation values
-- converts empty strings to null (null = missing translation)
-- rationale: consistent handling of empty/missing translations
create or replace function trim_translation_value()
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

-- trim values before insert or update
create trigger trim_translation_value_trigger
  before insert or update of value on translations
  for each row execute function trim_translation_value();

-- ---------------------------------------------------------------------
-- 7. validate default locale value
-- ---------------------------------------------------------------------

-- ensures default_locale translations are never null or empty
-- rationale: default locale is the source of truth for all translations
--            and must always have a value
create or replace function validate_default_locale_value()
returns trigger as $$
declare
  project_default_locale locale_code;
begin
  select default_locale into project_default_locale
  from projects where id = new.project_id;

  if new.locale = project_default_locale and (new.value is null or new.value = '') then
    raise exception 'Value cannot be NULL or empty for default_locale';
  end if;

  return new;
end;
$$ language plpgsql;

-- validate default locale value before insert or update
create trigger validate_default_locale_value_trigger
  before insert or update of value on translations
  for each row execute function validate_default_locale_value();

-- ---------------------------------------------------------------------
-- 8. fan-out translations on key insert
-- ---------------------------------------------------------------------

-- automatically creates translation rows for all project locales
-- when a new key is created
-- skips default_locale (handled by create_key_with_value helper)
-- uses security definer to bypass rls during fan-out
-- rationale: pre-materializes all (key, locale) combinations for fast queries
create or replace function fan_out_translations_on_key_insert()
returns trigger security definer as $$
begin
  insert into translations (project_id, key_id, locale, value, updated_at, updated_source)
  select new.project_id, new.id, pl.locale, null, now(), 'user'
  from project_locales pl
  where pl.project_id = new.project_id
    and pl.locale <> (select default_locale from projects where id = new.project_id);

  return new;
end;
$$ language plpgsql;

-- fan-out after key insert
create trigger fan_out_translations_on_key_insert_trigger
  after insert on keys
  for each row execute function fan_out_translations_on_key_insert();

-- ---------------------------------------------------------------------
-- 9. fan-out translations on locale insert
-- ---------------------------------------------------------------------

-- automatically creates translation rows for all existing keys
-- when a new locale is added to a project
-- uses security definer to bypass rls during fan-out
-- rationale: pre-materializes all (key, locale) combinations for fast queries
create or replace function fan_out_translations_on_locale_insert()
returns trigger security definer as $$
begin
  insert into translations (project_id, key_id, locale, value, updated_at, updated_source)
  select new.project_id, k.id, new.locale, null, now(), 'user'
  from keys k
  where k.project_id = new.project_id;

  return new;
end;
$$ language plpgsql;

-- fan-out after locale insert
create trigger fan_out_translations_on_locale_insert_trigger
  after insert on project_locales
  for each row execute function fan_out_translations_on_locale_insert();

-- ---------------------------------------------------------------------
-- 10. auto-update updated_at
-- ---------------------------------------------------------------------

-- automatically updates updated_at timestamp on row modification
-- applies to all tables with updated_at column
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- apply to projects table
create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- apply to project_locales table
create trigger update_project_locales_updated_at
  before update on project_locales
  for each row execute function update_updated_at();

-- apply to translations table
create trigger update_translations_updated_at
  before update on translations
  for each row execute function update_updated_at();

-- apply to translation_jobs table
create trigger update_translation_jobs_updated_at
  before update on translation_jobs
  for each row execute function update_updated_at();

-- apply to translation_job_items table
create trigger update_translation_job_items_updated_at
  before update on translation_job_items
  for each row execute function update_updated_at();

-- ---------------------------------------------------------------------
-- 11. validate source locale is default locale
-- ---------------------------------------------------------------------

-- ensures translation job source_locale matches project's default_locale
-- rationale: only default locale can be used as translation source
--            (source of truth for all translations)
create or replace function validate_source_locale_is_default()
returns trigger as $$
declare
  project_default_locale locale_code;
begin
  select default_locale into project_default_locale
  from projects where id = new.project_id;

  if new.source_locale <> project_default_locale then
    raise exception 'source_locale must equal project default_locale (%)' , project_default_locale;
  end if;

  return new;
end;
$$ language plpgsql;

-- validate source locale before insert or update
create trigger validate_source_locale_is_default_trigger
  before insert or update of source_locale on translation_jobs
  for each row execute function validate_source_locale_is_default();

-- ---------------------------------------------------------------------
-- 12. prevent multiple active jobs
-- ---------------------------------------------------------------------

-- ensures only one active (pending/running) translation job per project
-- rationale: prevents resource contention and data races during llm translation
create or replace function prevent_multiple_active_jobs()
returns trigger as $$
begin
  if new.status in ('pending', 'running') then
    if exists (
      select 1 from translation_jobs
      where project_id = new.project_id
        and id <> new.id
        and status in ('pending', 'running')
    ) then
      raise exception 'Only one active translation job allowed per project';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- check before insert or status update
create trigger prevent_multiple_active_jobs_trigger
  before insert or update of status on translation_jobs
  for each row execute function prevent_multiple_active_jobs();

