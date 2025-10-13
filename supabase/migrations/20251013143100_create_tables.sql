-- =====================================================================
-- migration: create core tables
-- description: main schema for i18n-mate translation management
-- tables created: projects, project_locales, keys, translations,
--                 translation_jobs, translation_job_items, telemetry_events
-- notes: tables created in dependency order; rls enabled but policies
--        defined in separate migration
-- =====================================================================

-- ---------------------------------------------------------------------
-- projects table
-- ---------------------------------------------------------------------

-- main entity for translation projects, owned by authenticated users
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name citext not null,
  description text,
  
  -- 2-4 character key prefix (immutable via trigger)
  -- examples: app, web, ui
  -- validates: lowercase alphanumeric with dots, dashes, underscores
  -- cannot end with dot
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
  constraint projects_prefix_unique_per_owner unique (owner_user_id, prefix)
);

comment on table projects is 'Translation projects owned by users';
comment on column projects.prefix is '2-4 char key prefix, unique per owner, immutable, [a-z0-9._-], no trailing dot';
comment on column projects.default_locale is 'Immutable default language, must exist in project_locales, cannot be deleted';

-- enable rls (policies defined in separate migration)
alter table projects enable row level security;

-- ---------------------------------------------------------------------
-- project_locales table
-- ---------------------------------------------------------------------

-- languages assigned to projects
-- default_locale cannot be deleted (enforced via trigger)
create table project_locales (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  
  -- normalized locale code (ll or ll-CC)
  locale locale_code not null,
  
  -- human-readable language name (editable)
  -- examples: "English (US)", "Polski", "Español"
  label varchar(64) not null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- each locale can appear only once per project
  constraint project_locales_unique_per_project unique (project_id, locale)
);

comment on table project_locales is 'Languages assigned to projects; default_locale cannot be deleted';
comment on column project_locales.locale is 'Normalized BCP-47 code: ll or ll-CC';
comment on column project_locales.label is 'Human-readable language name (editable)';

-- enable rls (policies defined in separate migration)
alter table project_locales enable row level security;

-- ---------------------------------------------------------------------
-- keys table
-- ---------------------------------------------------------------------

-- translation keys, created only in default language
-- automatically mirrored to all project locales via trigger
create table keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  
  -- full translation key (must start with project.prefix + ".")
  -- examples: app.welcome, app.auth.login
  -- validates: lowercase, no consecutive dots, no trailing dot
  full_key varchar(256) not null check (
    full_key ~ '^[a-z0-9._-]+$'
    and full_key not like '%..'
    and full_key not like '%.'
  ),
  
  created_at timestamptz not null default now(),

  -- each key must be unique within project
  constraint keys_unique_per_project unique (project_id, full_key)
);

comment on table keys is 'Translation keys; created only in default language; must start with project.prefix + "."';
comment on column keys.full_key is 'Lowercase, [a-z0-9._-], no ".." or trailing dot, unique per project';

-- enable rls (policies defined in separate migration)
alter table keys enable row level security;

-- ---------------------------------------------------------------------
-- translations table
-- ---------------------------------------------------------------------

-- translation values for each (project, key, locale) combination
-- pre-materialized: all combinations created automatically via triggers
-- null value = missing translation
-- default locale values cannot be null (enforced via trigger)
create table translations (
  project_id uuid not null references projects(id) on delete cascade,
  key_id uuid not null references keys(id) on delete cascade,
  locale locale_code not null,
  
  -- translation value (max 250 chars, no newlines)
  -- null = missing translation
  -- empty strings converted to null via trigger
  -- for default_locale: must be not null and not empty
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

comment on table translations is 'Pre-materialized translation values; auto-created for each (key, locale) pair';
comment on column translations.value is 'NULL = missing; for default_locale: NOT NULL AND <> empty; max 250 chars, no newline; auto-trimmed';
comment on column translations.is_machine_translated is 'true = LLM-generated; false = manual edit';
comment on column translations.updated_source is 'user = manual edit; system = LLM translation';
comment on column translations.updated_by_user_id is 'NULL for system updates';

-- enable rls (policies defined in separate migration)
alter table translations enable row level security;

-- ---------------------------------------------------------------------
-- translation_jobs table
-- ---------------------------------------------------------------------

-- llm translation job tracking
-- only one active (pending/running) job allowed per project (enforced via trigger)
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
  completed_keys integer default 0,
  failed_keys integer default 0,
  
  -- cost tracking
  estimated_cost_usd numeric(10,4),
  actual_cost_usd numeric(10,4),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

  -- note: source_locale validation (must equal project's default_locale)
  -- enforced via trigger, not check constraint (cannot use subquery in check)
);

comment on table translation_jobs is 'LLM translation jobs; only one active (pending/running) per project';
comment on column translation_jobs.mode is 'all = all keys; selected = specific keys; single = one key';
comment on column translation_jobs.params is 'LLM parameters: temperature, max_tokens, etc.';
comment on column translation_jobs.estimated_cost_usd is 'Estimated cost before execution';
comment on column translation_jobs.actual_cost_usd is 'Actual cost after completion';

-- enable rls (policies defined in separate migration)
alter table translation_jobs enable row level security;

-- ---------------------------------------------------------------------
-- translation_job_items table
-- ---------------------------------------------------------------------

-- individual keys within a translation job
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

comment on table translation_job_items is 'Individual translation tasks within a job';
comment on column translation_job_items.error_code is 'OpenRouter error code (e.g., rate_limit, model_error)';

-- enable rls (policies defined in separate migration)
alter table translation_job_items enable row level security;

-- ---------------------------------------------------------------------
-- telemetry_events table (partitioned)
-- ---------------------------------------------------------------------

-- application telemetry for analytics and kpis
-- partitioned by created_at (monthly partitions)
create table telemetry_events (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  event_name event_type not null,
  created_at timestamptz not null default now(),
  
  -- event-specific metadata (key_count, locale, mode, etc.)
  properties jsonb,

  primary key (id, created_at)
) partition by range (created_at);

comment on table telemetry_events is 'Application events for KPI tracking; partitioned monthly; RLS for owner or service_role';
comment on column telemetry_events.properties is 'Event-specific metadata (key_count, locale, mode, etc.)';

-- enable rls (policies defined in separate migration)
alter table telemetry_events enable row level security;

-- ---------------------------------------------------------------------
-- telemetry_events partitions
-- ---------------------------------------------------------------------

-- create initial partitions for 2025
-- additional partitions should be created via automation (pg_cron or external scheduler)

-- january 2025
create table telemetry_events_2025_01 partition of telemetry_events
  for values from ('2025-01-01') to ('2025-02-01');

-- february 2025
create table telemetry_events_2025_02 partition of telemetry_events
  for values from ('2025-02-01') to ('2025-03-01');

-- march 2025
create table telemetry_events_2025_03 partition of telemetry_events
  for values from ('2025-03-01') to ('2025-04-01');

-- april 2025
create table telemetry_events_2025_04 partition of telemetry_events
  for values from ('2025-04-01') to ('2025-05-01');

-- may 2025
create table telemetry_events_2025_05 partition of telemetry_events
  for values from ('2025-05-01') to ('2025-06-01');

-- june 2025
create table telemetry_events_2025_06 partition of telemetry_events
  for values from ('2025-06-01') to ('2025-07-01');

-- july 2025
create table telemetry_events_2025_07 partition of telemetry_events
  for values from ('2025-07-01') to ('2025-08-01');

-- august 2025
create table telemetry_events_2025_08 partition of telemetry_events
  for values from ('2025-08-01') to ('2025-09-01');

-- september 2025
create table telemetry_events_2025_09 partition of telemetry_events
  for values from ('2025-09-01') to ('2025-10-01');

-- october 2025
create table telemetry_events_2025_10 partition of telemetry_events
  for values from ('2025-10-01') to ('2025-11-01');

-- november 2025
create table telemetry_events_2025_11 partition of telemetry_events
  for values from ('2025-11-01') to ('2025-12-01');

-- december 2025
create table telemetry_events_2025_12 partition of telemetry_events
  for values from ('2025-12-01') to ('2026-01-01');

