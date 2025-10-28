-- =====================================================================
-- migration: 03_indexes
-- description: performance indexes for query optimization
-- tables affected: projects, project_locales, keys, translations,
--                  translation_jobs, translation_job_items, telemetry_events
-- notes: indexes ordered by table
-- =====================================================================

-- ---------------------------------------------------------------------
-- projects indexes
-- ---------------------------------------------------------------------

-- list projects by owner, sorted by creation date (most recent first)
create index idx_projects_owner_created
  on projects(owner_user_id, created_at desc);

comment on index idx_projects_owner_created is
  'Optimizes project listing queries for authenticated users, ordered by creation date descending';

-- ---------------------------------------------------------------------
-- project_locales indexes
-- ---------------------------------------------------------------------

-- lookup locales for a specific project
create index idx_project_locales_project_id
  on project_locales(project_id);

comment on index idx_project_locales_project_id is
  'Foreign key index for efficient project-to-locales joins and RLS policy enforcement';

-- locale lookup across projects
create index idx_project_locales_locale
  on project_locales(locale);

comment on index idx_project_locales_locale is
  'Enables efficient locale-based queries across all projects';

-- ---------------------------------------------------------------------
-- keys indexes
-- ---------------------------------------------------------------------

-- trigram similarity search for "contains" filtering
create index idx_keys_full_key_trgm
  on keys using gin (full_key gin_trgm_ops);

comment on index idx_keys_full_key_trgm is
  'Trigram index enabling fast "contains" search on translation keys. Used by key search functionality';

-- lookup keys for a specific project, sorted by full_key
create index idx_keys_project_full_key
  on keys(project_id, full_key);

comment on index idx_keys_project_full_key is
  'Composite index for project-scoped key queries with alphabetical ordering';

-- ---------------------------------------------------------------------
-- translations indexes
-- ---------------------------------------------------------------------

-- list translations by project and locale
create index idx_translations_project_locale
  on translations(project_id, locale, key_id);

comment on index idx_translations_project_locale is
  'Composite index optimizing locale-specific translation queries. Primary index for per-language views';

-- partial index for missing translations (value is null)
create index idx_translations_missing
  on translations(project_id, locale, key_id)
  where value is null;

comment on index idx_translations_missing is
  'Partial index for missing translation queries (WHERE value IS NULL). Optimizes "missing translations" filters';

-- lookup translations by key (for translation job processing)
create index idx_translations_key_id
  on translations(key_id);

comment on index idx_translations_key_id is
  'Foreign key index for efficient key-to-translations joins';

-- ---------------------------------------------------------------------
-- translation_jobs indexes
-- ---------------------------------------------------------------------

-- partial index for active job check (only pending/running jobs)
create index idx_translation_jobs_project_status
  on translation_jobs(project_id, status, created_at desc)
  where status in ('pending', 'running');

comment on index idx_translation_jobs_project_status is
  'Partial index for active job detection. Enforces "only one active job per project" business rule efficiently';

-- list all jobs for a project, sorted by creation date (most recent first)
create index idx_translation_jobs_project
  on translation_jobs(project_id, created_at desc);

comment on index idx_translation_jobs_project is
  'Optimizes job history queries for project-scoped views';

-- ---------------------------------------------------------------------
-- translation_job_items indexes
-- ---------------------------------------------------------------------

-- lookup items by job and status (for job progress tracking)
create index idx_translation_job_items_job
  on translation_job_items(job_id, status);

comment on index idx_translation_job_items_job is
  'Composite index for job progress tracking and status-based filtering';

-- ---------------------------------------------------------------------
-- telemetry_events indexes
-- ---------------------------------------------------------------------

-- time-series queries by project (for kpi dashboards)
create index idx_telemetry_events_project_time
  on telemetry_events(project_id, created_at desc);

comment on index idx_telemetry_events_project_time is
  'Time-series index for project-specific KPI dashboard queries';

-- time-series queries by event name (for global analytics)
create index idx_telemetry_events_name
  on telemetry_events(event_name, created_at desc);

comment on index idx_telemetry_events_name is
  'Time-series index for global analytics and event-type aggregations';
