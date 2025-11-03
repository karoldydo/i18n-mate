-- =====================================================================
-- migration: 09_rpc_get_app_config
-- description: RPC function to expose public app_config values to authenticated users
-- functions created: get_public_app_config
-- notes: uses SECURITY DEFINER to allow authenticated users to read
--        specific public config keys without direct table access
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_public_app_config function
-- ---------------------------------------------------------------------

create or replace function get_public_app_config()
returns table (key text, value text)
language plpgsql
security definer  -- runs as creator (service_role) to bypass RLS
set search_path = public
stable  -- function result doesn't change within a transaction
as $$
begin
  return query
  select ac.key, ac.value
  from app_config ac
  where ac.key in ('registration_enabled', 'email_verification_required')
  order by ac.key;
end;
$$;

comment on function get_public_app_config() is
  'Returns public configuration values that authenticated users can read. Only exposes specific keys: registration_enabled, email_verification_required. Uses SECURITY DEFINER to bypass RLS policies on app_config table.';

-- grant execute to authenticated users
grant execute on function get_public_app_config() to authenticated, anon;
