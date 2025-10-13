-- =====================================================================
-- migration: create row level security policies
-- description: granular rls policies for multi-tenant data isolation
-- tables affected: projects, project_locales, keys, translations,
--                  translation_jobs, translation_job_items, telemetry_events
-- notes: policies are granular (one per operation per role)
--        all access is isolated by project ownership via auth.uid()
-- =====================================================================

-- ---------------------------------------------------------------------
-- projects table policies
-- ---------------------------------------------------------------------

-- anon role: no access to projects
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select own projects
-- rationale: users can view their own projects
create policy projects_select_policy on projects
  for select
  to authenticated
  using (owner_user_id = auth.uid());

-- authenticated role: insert own projects
-- rationale: users can create new projects owned by themselves
create policy projects_insert_policy on projects
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

-- authenticated role: update own projects
-- rationale: users can modify their own projects
create policy projects_update_policy on projects
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- authenticated role: delete own projects
-- rationale: users can delete their own projects
-- warning: destructive operation, cascades to all related data
create policy projects_delete_policy on projects
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- project_locales table policies
-- ---------------------------------------------------------------------

-- anon role: no access to project_locales
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select locales for owned projects
-- rationale: users can view locales for their own projects
create policy project_locales_select_policy on project_locales
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: insert locales for owned projects
-- rationale: users can add languages to their own projects
create policy project_locales_insert_policy on project_locales
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: update locales for owned projects
-- rationale: users can modify language labels in their own projects
create policy project_locales_update_policy on project_locales
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: delete locales for owned projects
-- rationale: users can remove languages from their own projects
-- note: deletion of default_locale is prevented by trigger
create policy project_locales_delete_policy on project_locales
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- keys table policies
-- ---------------------------------------------------------------------

-- anon role: no access to keys
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select keys for owned projects
-- rationale: users can view translation keys in their own projects
create policy keys_select_policy on keys
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: insert keys for owned projects
-- rationale: users can create new translation keys in their own projects
create policy keys_insert_policy on keys
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: update keys for owned projects
-- rationale: users can modify translation keys in their own projects
-- note: full_key modification requires prefix validation via trigger
create policy keys_update_policy on keys
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: delete keys for owned projects
-- rationale: users can delete translation keys from their own projects
-- warning: destructive operation, cascades to all translations
create policy keys_delete_policy on keys
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- translations table policies
-- ---------------------------------------------------------------------

-- anon role: no access to translations
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select translations for owned projects
-- rationale: users can view translations in their own projects
create policy translations_select_policy on translations
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: insert translations for owned projects
-- rationale: allows manual translation row creation (rare, usually via triggers)
create policy translations_insert_policy on translations
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: update translations for owned projects
-- rationale: users can edit translation values in their own projects
-- note: default_locale value validation enforced via trigger
create policy translations_update_policy on translations
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: delete translations for owned projects
-- rationale: allows manual translation row deletion (rare, usually via cascades)
create policy translations_delete_policy on translations
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- translation_jobs table policies
-- ---------------------------------------------------------------------

-- anon role: no access to translation jobs
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select jobs for owned projects
-- rationale: users can view translation job history in their own projects
create policy translation_jobs_select_policy on translation_jobs
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: insert jobs for owned projects
-- rationale: users can create llm translation jobs for their own projects
-- note: only one active job per project enforced via trigger
create policy translation_jobs_insert_policy on translation_jobs
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: update jobs for owned projects
-- rationale: users can modify job status and metadata in their own projects
create policy translation_jobs_update_policy on translation_jobs
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: delete jobs for owned projects
-- rationale: users can delete old translation jobs from their own projects
-- warning: destructive operation, cascades to job items
create policy translation_jobs_delete_policy on translation_jobs
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- translation_job_items table policies
-- ---------------------------------------------------------------------

-- anon role: no access to job items
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select job items for owned projects
-- rationale: users can view job item details in their own projects
create policy translation_job_items_select_policy on translation_job_items
  for select
  to authenticated
  using (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  );

-- authenticated role: insert job items for owned projects
-- rationale: users can create job items (rare, usually automated)
create policy translation_job_items_insert_policy on translation_job_items
  for insert
  to authenticated
  with check (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  );

-- authenticated role: update job items for owned projects
-- rationale: users can modify job item status in their own projects
create policy translation_job_items_update_policy on translation_job_items
  for update
  to authenticated
  using (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  )
  with check (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  );

-- authenticated role: delete job items for owned projects
-- rationale: users can delete job items from their own projects
create policy translation_job_items_delete_policy on translation_job_items
  for delete
  to authenticated
  using (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- telemetry_events table policies
-- ---------------------------------------------------------------------

-- anon role: no access to telemetry events
-- rationale: unauthenticated users cannot access any project data

-- authenticated role: select telemetry for owned projects
-- rationale: users can view analytics and kpis for their own projects
create policy telemetry_events_select_policy on telemetry_events
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- authenticated role: insert telemetry for owned projects
-- rationale: users can log events for their own projects
create policy telemetry_events_insert_authenticated_policy on telemetry_events
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- service_role: insert telemetry for any project
-- rationale: backend services can log events for any project
-- note: service_role bypasses rls by default, but this policy
--       makes the intent explicit and allows future restrictions
create policy telemetry_events_insert_service_policy on telemetry_events
  for insert
  to service_role
  with check (true);

-- note: no update or delete policies for telemetry_events
-- rationale: telemetry is append-only for audit trail integrity

