-- =====================================================================
-- migration: create extensions, domains, and enums
-- description: foundational database types for i18n-mate schema
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

comment on domain locale_code is 'BCP-47 locale: ll or ll-CC format, normalized via trigger';

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

