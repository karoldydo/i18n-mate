-- =====================================================================
-- migration: 02_tables
-- description: core database tables with constraints and comments
-- tables created: app_config, projects, project_locales, keys, translations,
--                 translation_jobs, translation_job_items, telemetry_events
-- notes: tables created in dependency order; rls enabled
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_config table
-- ---------------------------------------------------------------------

create table app_config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

comment on table app_config is
  'Application-wide configuration settings. Used by Edge Functions and database triggers for feature flags and runtime configuration.';

comment on column app_config.key is
  'Unique configuration key identifier. Examples: "registration_enabled", "max_projects_per_user".';

comment on column app_config.value is
  'Configuration value as text. Boolean values should be "true" or "false" strings.';

comment on column app_config.description is
  'Optional human-readable description of the configuration setting and its purpose.';

-- insert default configuration values
insert into app_config (key, value, description) values
  ('registration_enabled', 'true', 'Controls whether new user registration is allowed. Set to "false" to disable signups.'),
  ('email_verification_required', 'true', 'Controls whether email verification is required before granting session access.');

alter table app_config enable row level security;

-- rls policy: only service_role can read/modify app_config
create policy "Service role can manage app_config"
  on app_config
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- projects table
-- ---------------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name citext not null,
  description text,

  -- 2-4 character key prefix (immutable via trigger)
  prefix varchar(4) not null check (
    length(prefix) between 2 and 4
    and prefix ~ '^[a-z0-9._-]+$'
    and prefix not like '%.'
  ),

  -- immutable default language (must exist in project_locales)
  default_locale locale_code not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- project name must be unique per owner
  constraint projects_name_unique_per_owner unique (owner_user_id, name),

  -- prefix must be unique per owner
  constraint projects_prefix_unique_per_owner unique (owner_user_id, prefix),

  -- prefix length validation
  constraint projects_prefix_length check (length(prefix) between 2 and 4),

  -- prefix no trailing dot
  constraint projects_prefix_no_trailing_dot check (prefix !~ '\.$')
);

comment on table projects is
  'Translation projects owned by authenticated users. Each project contains locales, keys, and translations with immutable prefix and default_locale for data consistency.';

comment on column projects.prefix is
  '2-4 character key prefix, unique per owner, immutable after creation. Must match [a-z0-9._-] pattern and cannot end with dot. Examples: "app", "ui", "web".';

comment on column projects.default_locale is
  'Immutable default language for the project. Must exist in project_locales and cannot be deleted. Used as source language for translations and key validation.';

comment on column projects.name is
  'Human-readable project name, unique per owner. Case-insensitive (CITEXT) to prevent duplicate names like "My App" and "my app".';

comment on column projects.description is
  'Optional project description for user reference. No business logic constraints.';

comment on column projects.owner_user_id is
  'Foreign key to auth.users. Defines project ownership for RLS policy enforcement. CASCADE DELETE removes projects when user is deleted.';

alter table projects enable row level security;

-- ---------------------------------------------------------------------
-- project_locales table
-- ---------------------------------------------------------------------

create table project_locales (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  -- normalized locale code (ll or ll-CC)
  locale locale_code not null,

  -- human-readable language name (editable)
  label varchar(64) not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- each locale can appear only once per project
  constraint project_locales_unique_per_project unique (project_id, locale)
);

comment on table project_locales is
  'Languages assigned to translation projects. Default locale cannot be deleted (enforced by trigger). New locales trigger automatic translation fan-out to all existing keys.';

comment on column project_locales.locale is
  'BCP-47 normalized locale code (ll or ll-CC format). Automatically normalized via normalize_project_locale_insert_trigger. Examples: "en", "en-US", "pl", "pl-PL".';

comment on column project_locales.label is
  'Human-readable language name for UI display. Editable field (only mutable field in this table). Examples: "English (US)", "Polski", "Español".';

comment on column project_locales.project_id is
  'Foreign key to projects table. CASCADE DELETE removes all locales when project is deleted. Used in RLS policies for ownership validation.';

comment on constraint project_locales_unique_per_project on project_locales is
  'Ensures each locale appears only once per project. Prevents duplicate language assignments and maintains data integrity.';

alter table project_locales enable row level security;

-- ---------------------------------------------------------------------
-- keys table
-- ---------------------------------------------------------------------

create table keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  -- full translation key (must start with project.prefix + ".")
  full_key varchar(256) not null check (
    full_key ~ '^[a-z0-9._-]+$'
    and full_key not like '%..'
    and full_key not like '%.'
  ),

  created_at timestamptz not null default now(),

  -- each key must be unique within project
  constraint keys_unique_per_project unique (project_id, full_key),

  -- no consecutive dots
  constraint keys_no_consecutive_dots check (full_key !~ '\.\.')
);

comment on table keys is
  'Translation keys created in project default language. Automatically creates NULL translations in all project locales via fan-out trigger. Full key must start with project.prefix.';

comment on column keys.full_key is
  'Complete translation key including project prefix (e.g., "app.welcome", "ui.button.save"). Must start with project.prefix + ".". Unique within project. Lowercase alphanumeric with dots, dashes, underscores allowed.';

comment on column keys.project_id is
  'Foreign key to projects table. CASCADE DELETE removes all keys when project is deleted. Used for RLS policy enforcement and prefix validation.';

alter table keys enable row level security;

-- ---------------------------------------------------------------------
-- translations table
-- ---------------------------------------------------------------------

create table translations (
  project_id uuid not null references projects(id) on delete cascade,
  key_id uuid not null references keys(id) on delete cascade,
  locale locale_code not null,

  -- translation value (max 250 chars, no newlines)
  value varchar(250) check (value !~ '\n'),

  -- true if generated by llm, false if manually edited
  is_machine_translated boolean not null default false,

  updated_at timestamptz not null default now(),

  -- 'user' for manual edits, 'system' for llm translations
  updated_source update_source_type not null default 'user',

  -- null for system updates
  updated_by_user_id uuid references auth.users(id) on delete set null,

  primary key (project_id, key_id, locale),

  -- ensure locale exists in project
  foreign key (project_id, locale)
    references project_locales(project_id, locale)
    on delete cascade
);

comment on table translations is
  'Translation values for each (project, key, locale) combination. NULL values indicate missing translations. Default locale cannot have NULL values (enforced by trigger).';

comment on column translations.value is
  'Translation text up to 250 characters, no newlines allowed. NULL indicates missing translation (except for default locale). Empty strings automatically converted to NULL by trigger.';

comment on column translations.locale is
  'BCP-47 locale code matching project_locales.locale. Composite foreign key with project_id ensures locale exists in project before translation creation.';

comment on column translations.is_machine_translated is
  'Boolean flag indicating translation source: true for LLM-generated, false for user-entered. Updated automatically by triggers and application logic.';

comment on column translations.updated_source is
  'Enum tracking update source: "user" for manual edits, "system" for LLM translations. Used for telemetry and translation quality tracking.';

comment on column translations.updated_by_user_id is
  'Foreign key to auth.users for user-generated translations, NULL for system translations. Enables translation attribution and quality analysis.';

alter table translations enable row level security;

-- ---------------------------------------------------------------------
-- translation_jobs table
-- ---------------------------------------------------------------------

create table translation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  -- source must be project's default_locale (enforced via check)
  source_locale locale_code not null,

  -- target must be different from source
  target_locale locale_code not null check (target_locale <> source_locale),

  -- 'all' = all keys, 'selected' = specific keys, 'single' = one key
  mode translation_mode not null,

  -- job lifecycle status
  status job_status not null default 'pending',

  -- llm provider (e.g., 'openai', 'anthropic')
  provider varchar(64),

  -- llm model (e.g., 'gpt-4', 'claude-3-opus')
  model varchar(128),

  -- llm parameters (temperature, max_tokens, etc.)
  params jsonb,

  started_at timestamptz,
  finished_at timestamptz,

  total_keys integer,
  completed_keys integer not null default 0,
  failed_keys integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table translation_jobs is
  'LLM translation jobs; only one active (pending/running) per project';

comment on column translation_jobs.mode is
  'all = all keys; selected = specific keys; single = one key';

comment on column translation_jobs.params is
  'LLM parameters: temperature, max_tokens, etc.';

alter table translation_jobs enable row level security;

-- ---------------------------------------------------------------------
-- translation_job_items table
-- ---------------------------------------------------------------------

create table translation_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references translation_jobs(id) on delete cascade,
  key_id uuid not null references keys(id) on delete cascade,

  -- item lifecycle status
  status item_status not null default 'pending',

  -- openrouter error code (e.g., 'rate_limit', 'model_error')
  error_code varchar(32),
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- each key can appear only once per job
  constraint translation_job_items_unique_per_job unique (job_id, key_id)
);

comment on table translation_job_items is
  'Individual translation tasks within a job';

comment on column translation_job_items.error_code is
  'OpenRouter error code (e.g., rate_limit, model_error)';

alter table translation_job_items enable row level security;

-- ---------------------------------------------------------------------
-- telemetry_events table (partitioned)
-- ---------------------------------------------------------------------

create table telemetry_events (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  event_name event_type not null,
  created_at timestamptz not null default now(),

  -- event-specific metadata (key_count, locale, mode, etc.)
  properties jsonb,

  primary key (id, created_at)
) partition by range (created_at);

comment on table telemetry_events is
  'Application events for KPI tracking; partitioned monthly; RLS for owner or service_role';

comment on column telemetry_events.properties is
  'Event-specific metadata (key_count, locale, mode, etc.)';

alter table telemetry_events enable row level security;

-- ---------------------------------------------------------------------
-- telemetry_events partitions for 2025
-- ---------------------------------------------------------------------

create table telemetry_events_2025_01 partition of telemetry_events
  for values from ('2025-01-01') to ('2025-02-01');

create table telemetry_events_2025_02 partition of telemetry_events
  for values from ('2025-02-01') to ('2025-03-01');

create table telemetry_events_2025_03 partition of telemetry_events
  for values from ('2025-03-01') to ('2025-04-01');

create table telemetry_events_2025_04 partition of telemetry_events
  for values from ('2025-04-01') to ('2025-05-01');

create table telemetry_events_2025_05 partition of telemetry_events
  for values from ('2025-05-01') to ('2025-06-01');

create table telemetry_events_2025_06 partition of telemetry_events
  for values from ('2025-06-01') to ('2025-07-01');

create table telemetry_events_2025_07 partition of telemetry_events
  for values from ('2025-07-01') to ('2025-08-01');

create table telemetry_events_2025_08 partition of telemetry_events
  for values from ('2025-08-01') to ('2025-09-01');

create table telemetry_events_2025_09 partition of telemetry_events
  for values from ('2025-09-01') to ('2025-10-01');

create table telemetry_events_2025_10 partition of telemetry_events
  for values from ('2025-10-01') to ('2025-11-01');

create table telemetry_events_2025_11 partition of telemetry_events
  for values from ('2025-11-01') to ('2025-12-01');

create table telemetry_events_2025_12 partition of telemetry_events
  for values from ('2025-12-01') to ('2026-01-01');
