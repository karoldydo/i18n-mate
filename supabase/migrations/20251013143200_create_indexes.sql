-- =====================================================================
-- migration: create performance indexes
-- description: indexes for query optimization across all tables
-- tables affected: projects, project_locales, keys, translations,
--                  translation_jobs, translation_job_items, telemetry_events
-- notes: indexes ordered by table, created after table data to optimize
--        initial load performance
-- =====================================================================

-- ---------------------------------------------------------------------
-- projects indexes
-- ---------------------------------------------------------------------

-- list projects by owner, sorted by creation date (most recent first)
create index idx_projects_owner 
  on projects(owner_user_id, created_at desc);

-- ---------------------------------------------------------------------
-- project_locales indexes
-- ---------------------------------------------------------------------

-- lookup locales for a specific project
create index idx_project_locales_project 
  on project_locales(project_id);

-- ---------------------------------------------------------------------
-- keys indexes
-- ---------------------------------------------------------------------

-- trigram similarity search for "contains" filtering
-- enables fast ilike queries on full_key
create index idx_keys_full_key_trgm 
  on keys using gin (full_key gin_trgm_ops);

-- lookup keys for a specific project, sorted by full_key
create index idx_keys_project 
  on keys(project_id, full_key);

-- ---------------------------------------------------------------------
-- translations indexes
-- ---------------------------------------------------------------------

-- list translations by project and locale
-- optimized for per-language view queries
create index idx_translations_project_locale 
  on translations(project_id, locale, key_id);

-- partial index for missing translations (value is null)
-- optimized for "show only missing" filter
create index idx_translations_missing 
  on translations(project_id, locale, key_id) 
  where value is null;

-- lookup translations by key (for translation job processing)
create index idx_translations_key 
  on translations(key_id);

-- ---------------------------------------------------------------------
-- translation_jobs indexes
-- ---------------------------------------------------------------------

-- partial index for active job check (only pending/running jobs)
-- enforces "only one active job per project" business rule
create index idx_translation_jobs_project_status 
  on translation_jobs(project_id, status, created_at desc)
  where status in ('pending', 'running');

-- list all jobs for a project, sorted by creation date (most recent first)
create index idx_translation_jobs_project 
  on translation_jobs(project_id, created_at desc);

-- ---------------------------------------------------------------------
-- translation_job_items indexes
-- ---------------------------------------------------------------------

-- lookup items by job and status (for job progress tracking)
create index idx_translation_job_items_job 
  on translation_job_items(job_id, status);

-- ---------------------------------------------------------------------
-- telemetry_events indexes
-- ---------------------------------------------------------------------

-- time-series queries by project (for kpi dashboards)
create index idx_telemetry_events_project_time 
  on telemetry_events(project_id, created_at desc);

-- time-series queries by event name (for global analytics)
create index idx_telemetry_events_name 
  on telemetry_events(event_name, created_at desc);

