# Table Relationships

Relationships between tables in the i18n-mate database schema.

1. Relationship Overview:

   ```sql
   -- projects (1) → project_locales (N)
   -- projects (1) → keys (N)
   -- projects (1) → translation_jobs (N)
   -- projects (1) → telemetry_events (N)
   -- keys (1) → translations (N)
   -- project_locales (1) → translations (N)
   -- translation_jobs (1) → translation_job_items (N)
   -- keys (1) → translation_job_items (N)
   ```

2. Foreign Key Relationships:

   ```sql
   -- project_locales.project_id → projects.id ON DELETE CASCADE
   -- keys.project_id → projects.id ON DELETE CASCADE
   -- translations.project_id → projects.id ON DELETE CASCADE
   -- translations.key_id → keys.id ON DELETE CASCADE
   -- translations(project_id, locale) → project_locales(project_id, locale) ON DELETE CASCADE
   -- translation_jobs.project_id → projects.id ON DELETE CASCADE
   -- translation_job_items.job_id → translation_jobs.id ON DELETE CASCADE
   -- translation_job_items.key_id → keys.id ON DELETE CASCADE
   -- telemetry_events.project_id → projects.id ON DELETE CASCADE
   -- translations.updated_by_user_id → auth.users.id ON DELETE SET NULL
   -- projects.owner_user_id → auth.users.id ON DELETE CASCADE
   ```

3. Composite Primary Keys:

   ```sql
   -- translations: (project_id, key_id, locale)
   -- telemetry_events: (id, created_at) - partitioned
   ```

4. Unique Constraints:

   ```sql
   -- projects: (owner_user_id, name), (owner_user_id, prefix)
   -- project_locales: (project_id, locale)
   -- keys: (project_id, full_key)
   -- translation_job_items: (job_id, key_id)
   ```
