-- =====================================================================
-- migration: 01_foundation
-- description: foundational database setup - extensions, domains, enums
-- tables affected: none (prerequisite for all tables)
-- notes: must run before any table creation
-- =====================================================================

-- ---------------------------------------------------------------------
-- extensions
-- ---------------------------------------------------------------------

-- uuid generation for primary keys
create extension if not exists "pgcrypto";

-- trigram similarity search for translation key filtering
create extension if not exists "pg_trgm";

-- case-insensitive text for project names
create extension if not exists "citext";

-- scheduled job execution for partition automation
create extension if not exists "pg_cron";

-- grant necessary permissions for cron job execution
grant usage on schema cron to postgres;

-- ---------------------------------------------------------------------
-- database configuration
-- ---------------------------------------------------------------------

-- enforce utc timezone for all timestamps
alter database postgres set timezone to 'UTC';

-- ---------------------------------------------------------------------
-- custom domains
-- ---------------------------------------------------------------------

-- bcp-47 locale codes restricted to ll or ll-cc format
-- examples: en, en-US, pl, pl-PL
-- normalized via trigger: language lowercase, region uppercase
create domain locale_code as varchar(8)
  check (value ~ '^[a-z]{2}(-[A-Z]{2})?$');

comment on domain locale_code is
  'BCP-47 locale code: ll or ll-CC format only. '
  'Pattern: ^[a-z]{2}(-[A-Z]{2})?$ '
  'Synchronized with LOCALE_CODE_DOMAIN_PATTERN in TypeScript constants. '
  'Examples: en, en-US, pl, pl-PL. '
  'Normalization handled by normalize_locale_trigger.';

-- ---------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------

-- tracks whether translation update came from user or llm
create type update_source_type as enum ('user', 'system');

-- translation job mode: all keys, selected keys, or single key
create type translation_mode as enum ('all', 'selected', 'single');

-- translation job lifecycle status
create type job_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled');

-- individual job item status
create type item_status as enum ('pending', 'completed', 'failed', 'skipped');

-- telemetry event types for kpi tracking
create type event_type as enum (
  'project_created',
  'language_added',
  'key_created',
  'translation_completed'
);

-- ---------------------------------------------------------------------
-- composite types
-- ---------------------------------------------------------------------

-- composite type for list_keys_per_language_view function
create type key_per_language_view_type as (
  key_id uuid,
  full_key varchar(256),
  value varchar(250),
  is_machine_translated boolean,
  updated_at timestamptz,
  updated_source update_source_type,
  updated_by_user_id uuid
);

comment on type key_per_language_view_type is
  'Composite type for list_keys_per_language_view function return values with proper nullable handling.';
