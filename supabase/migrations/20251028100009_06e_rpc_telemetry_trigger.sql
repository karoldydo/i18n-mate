-- =====================================================================
-- migration: 06e_rpc_telemetry_trigger
-- description: Telemetry trigger for language_added event
-- =====================================================================

create function emit_language_added_event()
returns trigger
security definer
language plpgsql as $$
declare
  v_locale_count integer;
  v_is_default boolean;
begin
  perform ensure_telemetry_partition_exists();

  select count(*) into v_locale_count
  from project_locales
  where project_id = new.project_id;

  select (new.locale = p.default_locale) into v_is_default
  from projects p
  where p.id = new.project_id;

  insert into telemetry_events (event_name, project_id, properties)
  values ('language_added', new.project_id, jsonb_build_object(
    'locale', new.locale,
    'locale_count', v_locale_count,
    'is_default', coalesce(v_is_default, false)
  ));

  return new;
exception when others then
  raise warning 'Failed to emit language_added event for project %: %',
    new.project_id, sqlerrm;
  return new;
end;
$$;

create trigger emit_language_added_event_trigger
  after insert on project_locales
  for each row execute function emit_language_added_event();
