-- =====================================================================
-- migration: create helper functions
-- description: stored procedures for complex transactional operations
-- functions created: create_key_with_value
-- notes: uses security definer for rls bypass where needed
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_key_with_value
-- ---------------------------------------------------------------------

-- atomically creates a translation key with default locale value
-- automatically triggers fan-out to other locales via trigger
-- 
-- parameters:
--   p_project_id: uuid of the project
--   p_full_key: full translation key (must start with project.prefix + ".")
--   p_default_value: translation value for default locale (required)
--
-- returns:
--   uuid of the created key
--
-- example:
--   select create_key_with_value(
--     'a1b2c3d4-...', 
--     'app.welcome', 
--     'Welcome to our app!'
--   );
--
-- rationale:
--   - ensures atomic creation of key + default translation
--   - prevents orphaned keys without default locale value
--   - simplifies client code (single rpc call instead of multiple inserts)
create or replace function create_key_with_value(
  p_project_id uuid,
  p_full_key varchar(256),
  p_default_value varchar(250)
)
returns uuid
security definer
language plpgsql as $$
declare
  v_key_id uuid;
  v_default_locale locale_code;
begin
  -- get project default locale
  select default_locale into v_default_locale
  from projects where id = p_project_id;

  if v_default_locale is null then
    raise exception 'Project not found';
  end if;

  -- insert key (triggers prefix validation)
  insert into keys (project_id, full_key)
  values (p_project_id, p_full_key)
  returning id into v_key_id;

  -- insert default locale translation
  -- (triggers will fan-out to other locales)
  insert into translations (project_id, key_id, locale, value, updated_at, updated_source, updated_by_user_id)
  values (p_project_id, v_key_id, v_default_locale, p_default_value, now(), 'user', auth.uid());

  return v_key_id;
end;
$$;

comment on function create_key_with_value is 'Atomically creates key with default locale value; fan-out to other locales via trigger';

