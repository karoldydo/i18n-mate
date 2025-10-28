-- =====================================================================
-- migration: 05_rls_policies
-- description: row level security policies for multi-tenant data isolation
-- tables affected: projects, project_locales, keys, translations,
--                  translation_jobs, translation_job_items, telemetry_events
-- notes: all access is isolated by project ownership via auth.uid()
-- =====================================================================

-- ---------------------------------------------------------------------
-- projects table policies
-- ---------------------------------------------------------------------

create policy projects_select_policy on projects
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy projects_insert_policy on projects
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy projects_update_policy on projects
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy projects_delete_policy on projects
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- project_locales table policies
-- ---------------------------------------------------------------------

create policy project_locales_select_policy on project_locales
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy project_locales_insert_policy on project_locales
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy project_locales_update_policy on project_locales
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy project_locales_delete_policy on project_locales
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- keys table policies
-- ---------------------------------------------------------------------

create policy keys_select_policy on keys
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy keys_insert_policy on keys
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy keys_update_policy on keys
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy keys_delete_policy on keys
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- translations table policies
-- ---------------------------------------------------------------------

create policy translations_select_policy on translations
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy translations_insert_policy on translations
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy translations_update_policy on translations
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy translations_delete_policy on translations
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- translation_jobs table policies
-- ---------------------------------------------------------------------

create policy translation_jobs_select_policy on translation_jobs
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy translation_jobs_insert_policy on translation_jobs
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy translation_jobs_update_policy on translation_jobs
  for update
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy translation_jobs_delete_policy on translation_jobs
  for delete
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- translation_job_items table policies
-- ---------------------------------------------------------------------

create policy translation_job_items_select_policy on translation_job_items
  for select
  to authenticated
  using (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  );

create policy translation_job_items_insert_policy on translation_job_items
  for insert
  to authenticated
  with check (
    job_id in (
      select id from translation_jobs
      where project_id in (select id from projects where owner_user_id = auth.uid())
    )
  );

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

create policy telemetry_events_select_policy on telemetry_events
  for select
  to authenticated
  using (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy telemetry_events_insert_authenticated_policy on telemetry_events
  for insert
  to authenticated
  with check (
    project_id in (select id from projects where owner_user_id = auth.uid())
  );

create policy telemetry_events_insert_service_policy on telemetry_events
  for insert
  to service_role
  with check (true);
