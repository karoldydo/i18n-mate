# Database Schema Plan - i18n-mate

## Overview

PostgreSQL schema for i18n-mate MVP, designed for Supabase with Row-Level Security (RLS), optimized for multi-language translation management with LLM integration.

## Extensions and Configuration

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram search for keys
CREATE EXTENSION IF NOT EXISTS "citext";        -- Case-insensitive text

-- Database configuration
ALTER DATABASE postgres SET timezone TO 'UTC';
```

## Domains and Types

### Locale Code Domain

```sql
-- Domain for BCP-47 locale codes (ll or ll-CC format only)
CREATE DOMAIN locale_code AS VARCHAR(8)
  CHECK (VALUE ~ '^[a-z]{2}(-[A-Z]{2})?$');

COMMENT ON DOMAIN locale_code IS 'BCP-47 locale: ll or ll-CC format, normalized via trigger';
```

### Enums

```sql
-- Source of translation update
CREATE TYPE update_source_type AS ENUM ('user', 'system');

-- Translation job mode
CREATE TYPE translation_mode AS ENUM ('all', 'selected', 'single');

-- Job status
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Job item status
CREATE TYPE item_status AS ENUM ('pending', 'completed', 'failed', 'skipped');

-- Telemetry event types
CREATE TYPE event_type AS ENUM (
  'project_created',
  'language_added',
  'key_created',
  'translation_completed'
);
```

## Tables

### 1. projects

[See details →](./tables/1-projects.md)

Main entity for translation projects, owned by users.

### 2. project_locales

[See details →](./tables/2-project_locales.md)

Languages assigned to projects.

### 3. keys

[See details →](./tables/3-keys.md)

Translation keys, created only in default language, mirrored to all locales.

### 4. translations

[See details →](./tables/4-translations.md)

Translation values for each (project, key, locale) combination.

### 5. translation_jobs

[See details →](./tables/5-translation_jobs.md)

LLM translation job tracking.

### 6. translation_job_items

[See details →](./tables/6-translation_job_items.md)

Individual keys within a translation job.

### 7. telemetry_events (Partitioned)

[See details →](./tables/7-telemetry_events.md)

Application telemetry for analytics and KPIs.

## Indexes

### Performance Indexes

```sql
-- Projects
CREATE INDEX idx_projects_owner ON projects(owner_user_id, created_at DESC);

-- Project Locales
CREATE INDEX idx_project_locales_project ON project_locales(project_id);

-- Keys: Trigram search for "contains" filter
CREATE INDEX idx_keys_full_key_trgm ON keys USING GIN (full_key gin_trgm_ops);
CREATE INDEX idx_keys_project ON keys(project_id, full_key);

-- Translations: List views and "missing" filter
CREATE INDEX idx_translations_project_locale ON translations(project_id, locale, key_id);
CREATE INDEX idx_translations_missing ON translations(project_id, locale, key_id) WHERE value IS NULL;
CREATE INDEX idx_translations_key ON translations(key_id);

-- Translation Jobs: Active job check and listing
CREATE INDEX idx_translation_jobs_project_status ON translation_jobs(project_id, status, created_at DESC)
  WHERE status IN ('pending', 'running');
CREATE INDEX idx_translation_jobs_project ON translation_jobs(project_id, created_at DESC);

-- Translation Job Items
CREATE INDEX idx_translation_job_items_job ON translation_job_items(job_id, status);

-- Telemetry Events: Time-series queries
CREATE INDEX idx_telemetry_events_project_time ON telemetry_events(project_id, created_at DESC);
CREATE INDEX idx_telemetry_events_name ON telemetry_events(event_name, created_at DESC);
```

## Triggers and Functions

### 1. Locale Normalization

```sql
CREATE OR REPLACE FUNCTION normalize_locale()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize to ll or ll-CC (language lowercase, REGION uppercase)
  NEW.locale := CASE
    WHEN NEW.locale ~ '^[a-zA-Z]{2}-[a-zA-Z]{2}$' THEN
      lower(substring(NEW.locale from 1 for 2)) || '-' || upper(substring(NEW.locale from 4 for 2))
    WHEN NEW.locale ~ '^[a-zA-Z]{2}$' THEN
      lower(NEW.locale)
    ELSE
      NEW.locale -- Will fail domain check
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_locale_trigger
  BEFORE INSERT OR UPDATE OF locale ON project_locales
  FOR EACH ROW EXECUTE FUNCTION normalize_locale();
```

### 2. Prevent Default Locale Changes

```sql
CREATE OR REPLACE FUNCTION prevent_default_locale_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.default_locale IS DISTINCT FROM NEW.default_locale THEN
    RAISE EXCEPTION 'default_locale is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_default_locale_change_trigger
  BEFORE UPDATE OF default_locale ON projects
  FOR EACH ROW EXECUTE FUNCTION prevent_default_locale_change();
```

### 3. Prevent Default Locale Deletion

```sql
CREATE OR REPLACE FUNCTION prevent_default_locale_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locale = (SELECT default_locale FROM projects WHERE id = OLD.project_id) THEN
    RAISE EXCEPTION 'Cannot delete default_locale';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_default_locale_delete_trigger
  BEFORE DELETE ON project_locales
  FOR EACH ROW EXECUTE FUNCTION prevent_default_locale_delete();
```

### 4. Prevent Prefix Change

```sql
CREATE OR REPLACE FUNCTION prevent_prefix_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.prefix IS DISTINCT FROM NEW.prefix THEN
    RAISE EXCEPTION 'prefix is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_prefix_change_trigger
  BEFORE UPDATE OF prefix ON projects
  FOR EACH ROW EXECUTE FUNCTION prevent_prefix_change();
```

### 5. Validate Key Prefix

```sql
CREATE OR REPLACE FUNCTION validate_key_prefix()
RETURNS TRIGGER AS $$
DECLARE
  project_prefix VARCHAR(4);
BEGIN
  SELECT prefix INTO project_prefix FROM projects WHERE id = NEW.project_id;

  IF NOT (NEW.full_key LIKE project_prefix || '.%') THEN
    RAISE EXCEPTION 'full_key must start with project prefix "%" followed by "."', project_prefix;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_key_prefix_trigger
  BEFORE INSERT OR UPDATE OF full_key ON keys
  FOR EACH ROW EXECUTE FUNCTION validate_key_prefix();
```

### 6. Auto-Trim Translation Values

```sql
CREATE OR REPLACE FUNCTION trim_translation_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.value IS NOT NULL THEN
    NEW.value := btrim(NEW.value);
    IF NEW.value = '' THEN
      NEW.value := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trim_translation_value_trigger
  BEFORE INSERT OR UPDATE OF value ON translations
  FOR EACH ROW EXECUTE FUNCTION trim_translation_value();
```

### 7. Validate Default Locale Value

```sql
CREATE OR REPLACE FUNCTION validate_default_locale_value()
RETURNS TRIGGER AS $$
DECLARE
  project_default_locale locale_code;
BEGIN
  SELECT default_locale INTO project_default_locale
  FROM projects WHERE id = NEW.project_id;

  IF NEW.locale = project_default_locale AND (NEW.value IS NULL OR NEW.value = '') THEN
    RAISE EXCEPTION 'Value cannot be NULL or empty for default_locale';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_default_locale_value_trigger
  BEFORE INSERT OR UPDATE OF value ON translations
  FOR EACH ROW EXECUTE FUNCTION validate_default_locale_value();
```

### 8. Fan-Out Translations on Key Insert

```sql
CREATE OR REPLACE FUNCTION fan_out_translations_on_key_insert()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source)
  SELECT NEW.project_id, NEW.id, pl.locale, NULL, now(), 'user'
  FROM project_locales pl
  WHERE pl.project_id = NEW.project_id
    AND pl.locale <> (SELECT default_locale FROM projects WHERE id = NEW.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fan_out_translations_on_key_insert_trigger
  AFTER INSERT ON keys
  FOR EACH ROW EXECUTE FUNCTION fan_out_translations_on_key_insert();
```

### 9. Fan-Out Translations on Locale Insert

```sql
CREATE OR REPLACE FUNCTION fan_out_translations_on_locale_insert()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source)
  SELECT NEW.project_id, k.id, NEW.locale, NULL, now(), 'user'
  FROM keys k
  WHERE k.project_id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fan_out_translations_on_locale_insert_trigger
  AFTER INSERT ON project_locales
  FOR EACH ROW EXECUTE FUNCTION fan_out_translations_on_locale_insert();
```

### 10. Auto-Update updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_project_locales_updated_at
  BEFORE UPDATE ON project_locales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_translation_jobs_updated_at
  BEFORE UPDATE ON translation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_translation_job_items_updated_at
  BEFORE UPDATE ON translation_job_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 11. Validate Source Locale is Default Locale

```sql
CREATE OR REPLACE FUNCTION validate_source_locale_is_default()
RETURNS TRIGGER AS $$
DECLARE
  project_default_locale locale_code;
BEGIN
  SELECT default_locale INTO project_default_locale
  FROM projects WHERE id = NEW.project_id;

  IF NEW.source_locale <> project_default_locale THEN
    RAISE EXCEPTION 'source_locale must equal project default_locale (%)', project_default_locale;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_source_locale_is_default_trigger
  BEFORE INSERT OR UPDATE OF source_locale ON translation_jobs
  FOR EACH ROW EXECUTE FUNCTION validate_source_locale_is_default();
```

### 12. Prevent Multiple Active Jobs

```sql
CREATE OR REPLACE FUNCTION prevent_multiple_active_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('pending', 'running') THEN
    IF EXISTS (
      SELECT 1 FROM translation_jobs
      WHERE project_id = NEW.project_id
        AND id <> NEW.id
        AND status IN ('pending', 'running')
    ) THEN
      RAISE EXCEPTION 'Only one active translation job allowed per project';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_multiple_active_jobs_trigger
  BEFORE INSERT OR UPDATE OF status ON translation_jobs
  FOR EACH ROW EXECUTE FUNCTION prevent_multiple_active_jobs();
```

## Row-Level Security (RLS)

### Enable RLS on All Tables

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- Projects: Owner isolation
CREATE POLICY projects_owner_policy ON projects
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Project Locales: Via project ownership
CREATE POLICY project_locales_owner_policy ON project_locales
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  );

-- Keys: Via project ownership
CREATE POLICY keys_owner_policy ON keys
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  );

-- Translations: Via project ownership
CREATE POLICY translations_owner_policy ON translations
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  );

-- Translation Jobs: Via project ownership
CREATE POLICY translation_jobs_owner_policy ON translation_jobs
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  );

-- Translation Job Items: Via job ownership
CREATE POLICY translation_job_items_owner_policy ON translation_job_items
  FOR ALL
  USING (
    job_id IN (
      SELECT id FROM translation_jobs
      WHERE project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT id FROM translation_jobs
      WHERE project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
    )
  );

-- Telemetry Events: Owner or service_role
CREATE POLICY telemetry_events_owner_policy ON telemetry_events
  FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
  );

CREATE POLICY telemetry_events_insert_policy ON telemetry_events
  FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_user_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'service_role'
  );
```

## Helper Functions

### Create Key with Default Value (Transactional)

```sql
CREATE OR REPLACE FUNCTION create_key_with_value(
  p_project_id UUID,
  p_full_key VARCHAR(256),
  p_default_value VARCHAR(250)
)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_key_id UUID;
  v_default_locale locale_code;
BEGIN
  -- Get project default locale
  SELECT default_locale INTO v_default_locale
  FROM projects WHERE id = p_project_id;

  IF v_default_locale IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Insert key
  INSERT INTO keys (project_id, full_key)
  VALUES (p_project_id, p_full_key)
  RETURNING id INTO v_key_id;

  -- Insert default locale translation
  INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source, updated_by_user_id)
  VALUES (p_project_id, v_key_id, v_default_locale, p_default_value, now(), 'user', auth.uid());

  RETURN json_build_object('key_id', v_key_id);
END;
$$;

COMMENT ON FUNCTION create_key_with_value IS 'Creates key with default locale value and returns single object { key_id }';
```

### List Keys (Default Language View)

```sql
CREATE OR REPLACE FUNCTION list_keys_default_view(
  p_project_id UUID,
  p_search TEXT DEFAULT NULL,
  p_missing_only BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_key VARCHAR(256),
  created_at TIMESTAMPTZ,
  value VARCHAR(250),
  missing_count INT
)
LANGUAGE SQL
STABLE
AS $$
  WITH default_locale AS (
    SELECT default_locale FROM projects WHERE id = p_project_id
  )
  SELECT
    k.id,
    k.full_key,
    k.created_at,
    t.value,
    (
      SELECT COUNT(*) FROM translations t2
      WHERE t2.key_id = k.id AND t2.value IS NULL
    ) AS missing_count
  FROM keys k
  JOIN translations t
    ON t.key_id = k.id
   AND t.project_id = k.project_id
   AND t.locale = (SELECT default_locale FROM default_locale)
  WHERE k.project_id = p_project_id
    AND (p_search IS NULL OR k.full_key ILIKE ('%' || p_search || '%'))
    AND (NOT p_missing_only OR (
      (
        SELECT COUNT(*) FROM translations t3
        WHERE t3.key_id = k.id AND t3.value IS NULL
      ) > 0
    ))
  ORDER BY k.full_key ASC
  LIMIT p_limit OFFSET p_offset
$$;

COMMENT ON FUNCTION list_keys_default_view IS
  'List keys with default-locale values and missing counts. ' ||
  'Authorization: RLS policies on projects table enforce ownership via JOIN. ' ||
  'Locale validation not needed: default_locale is guaranteed to exist (foreign key constraint).';
```

### List Keys (Per-Language View)

```sql
CREATE OR REPLACE FUNCTION list_keys_per_language_view(
  p_project_id UUID,
  p_locale locale_code,
  p_search TEXT DEFAULT NULL,
  p_missing_only BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  key_id UUID,
  full_key VARCHAR(256),
  value VARCHAR(250),
  is_machine_translated BOOLEAN,
  updated_at TIMESTAMPTZ,
  updated_source update_source_type,
  updated_by_user_id UUID
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    k.id AS key_id,
    k.full_key,
    t.value,
    t.is_machine_translated,
    t.updated_at,
    t.updated_source,
    t.updated_by_user_id
  FROM keys k
  JOIN translations t
    ON t.key_id = k.id
   AND t.project_id = k.project_id
   AND t.locale = p_locale
  WHERE k.project_id = p_project_id
    AND (p_search IS NULL OR k.full_key ILIKE ('%' || p_search || '%'))
    AND (NOT p_missing_only OR t.value IS NULL)
  ORDER BY k.full_key ASC
  LIMIT p_limit OFFSET p_offset
$$;

COMMENT ON FUNCTION list_keys_per_language_view IS 'List keys with values for selected locale and metadata';
```

## Data Constraints Summary

| Table                | Constraint       | Rule                                                                                                                                                                 |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **projects**         | `prefix`         | 2-4 chars, `[a-z0-9._-]`, no trailing dot, unique per owner, immutable<br>**Examples:** `app`, `ui`, `web` (recommended); `v2` (allowed but discouraged - see notes) |
| **projects**         | `default_locale` | Immutable, must exist in `project_locales`, cannot be deleted                                                                                                        |
| **projects**         | `name`           | CITEXT, unique per owner                                                                                                                                             |
| **project_locales**  | `locale`         | BCP-47 `ll` or `ll-CC`, normalized via trigger                                                                                                                       |
| **project_locales**  | uniqueness       | `(project_id, locale)`                                                                                                                                               |
| **keys**             | `full_key`       | Lowercase, `[a-z0-9._-]`, **no `..`** or trailing dot, must start with `prefix + '.'`                                                                                |
| **keys**             | uniqueness       | `(project_id, full_key)`                                                                                                                                             |
| **translations**     | `value`          | Max 250 chars, no newline, NULL = missing, NOT NULL for default_locale                                                                                               |
| **translations**     | metadata         | `is_machine_translated`, `updated_source`, `updated_by_user_id`<br>`updated_at` auto-set by trigger                                                                  |
| **translation_jobs** | active limit     | Only one `pending` or `running` job per project (enforced via trigger)                                                                                               |
| **translation_jobs** | `source_locale`  | Must equal project's `default_locale` (enforced via trigger)                                                                                                         |
| **translation_jobs** | `target_locale`  | Cannot equal `source_locale` (CHECK constraint)                                                                                                                      |

**Prefix Guidance:**

- **Recommended:** Use simple alphanumeric prefixes without dots (e.g., `app`, `ui`, `web`, `api`)
- **Allowed but discouraged:** Dots inside prefix (e.g., `app.v2`) may cause ambiguity with dotted key notation
- **Rationale for allowing dots:** Supports versioned namespaces (e.g., `v2.home.title`), but simple prefixes are clearer
- **Example ambiguity:** With prefix `app.v2`, key `app.v2.home.title` has ambiguous namespace (`app` or `app.v2`?)

## Query Patterns and Optimizations

### 1. List Projects (Paginated)

```sql
-- Sorted by name ASC, 50 per page
SELECT id, name, default_locale,
  (SELECT COUNT(*) FROM project_locales WHERE project_id = p.id) AS locale_count,
  (SELECT COUNT(*) FROM keys WHERE project_id = p.id) AS key_count
FROM projects p
WHERE owner_user_id = auth.uid()
ORDER BY name ASC
LIMIT 50 OFFSET :page_offset;
```

**Indexes used:** `idx_projects_owner`, `projects_name_unique_per_owner`

### 2. List Keys in Default Language with Missing Status

```sql
-- Default view: keys + default locale values + missing count
SELECT k.id, k.full_key, t.value,
  (SELECT COUNT(*) FROM translations t2
   WHERE t2.key_id = k.id AND t2.value IS NULL) AS missing_count
FROM keys k
JOIN translations t ON k.id = t.key_id
WHERE k.project_id = :project_id
  AND t.locale = (SELECT default_locale FROM projects WHERE id = :project_id)
  AND (:search IS NULL OR k.full_key ILIKE '%' || :search || '%')
  AND (:missing_only IS FALSE OR missing_count > 0)
ORDER BY k.full_key ASC
LIMIT 50 OFFSET :page_offset;
```

**Indexes used:** `idx_keys_full_key_trgm`, `idx_translations_project_locale`

### 3. List Keys in Selected Language (Per-Language View)

```sql
-- Per-language view: keys + values in selected locale
SELECT k.id, k.full_key, t.value, t.is_machine_translated, t.updated_at
FROM keys k
JOIN translations t ON k.id = t.key_id
WHERE k.project_id = :project_id
  AND t.locale = :selected_locale
  AND (:search IS NULL OR k.full_key ILIKE '%' || :search || '%')
  AND (:missing_only IS FALSE OR t.value IS NULL)
ORDER BY k.full_key ASC
LIMIT 50 OFFSET :page_offset;
```

**Indexes used:** `idx_keys_full_key_trgm`, `idx_translations_project_locale`, `idx_translations_missing`

### 4. Check Active Translation Job

```sql
-- Prevent multiple active jobs
SELECT id, status, created_at
FROM translation_jobs
WHERE project_id = :project_id
  AND status IN ('pending', 'running')
LIMIT 1;
```

**Indexes used:** `idx_translation_jobs_project_status`

### 5. Export All Translations

```sql
-- Fetch all translations for export (flat structure)
SELECT k.full_key, pl.locale, t.value
FROM keys k
CROSS JOIN project_locales pl
LEFT JOIN translations t ON k.id = t.key_id AND pl.locale = t.locale
WHERE k.project_id = :project_id
ORDER BY pl.locale, k.full_key;
```

**Indexes used:** `idx_keys_project`, `idx_translations_project_locale`

### 6. Telemetry for KPIs

```sql
-- Example: Projects with 2+ languages after 7 days
SELECT te.project_id, te.properties->>'locale_count' AS locale_count
FROM telemetry_events te
WHERE te.event_name = 'language_added'
  AND te.created_at >= (
    SELECT created_at + INTERVAL '7 days'
    FROM telemetry_events
    WHERE event_name = 'project_created' AND project_id = te.project_id
    LIMIT 1
  )
  AND (te.properties->>'locale_count')::int >= 2;
```

**Indexes used:** `idx_telemetry_events_project_time`, `idx_telemetry_events_name`

## Optimistic Locking Example

```sql
-- Update translation with optimistic lock
UPDATE translations
SET value = :new_value,
    is_machine_translated = false,
    updated_source = 'user',
    updated_by_user_id = auth.uid()
WHERE project_id = :project_id
  AND key_id = :key_id
  AND locale = :locale
  AND updated_at = :client_updated_at; -- Optimistic lock check

-- If ROWCOUNT = 0, conflict occurred (client must refetch)
```

## Migration Strategy

1. **Phase 1:** Create extensions, domains, enums
2. **Phase 2:** Create tables in dependency order (includes telemetry_events partitions)
3. **Phase 3:** Create indexes
4. **Phase 4:** Create triggers and functions (in order)
5. **Phase 5:** Enable RLS and create policies
6. **Phase 6:** Create helper functions
7. **Phase 7:** Setup pg_cron automation for future partition creation (see Maintenance and Operations section)

## Maintenance and Operations

### Partition Management

#### Manual Partition Creation

```sql
-- Create next month's partition manually
CREATE TABLE IF NOT EXISTS telemetry_events_2025_04 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
```

#### Automated Partition Creation (pg_cron)

Enable pg_cron extension and create automatic partition management:

```sql
-- Enable pg_cron extension (requires superuser or Supabase dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions to execute cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create function to automatically create next month's partition
CREATE OR REPLACE FUNCTION create_next_telemetry_partition()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  -- Calculate next month (2 months ahead to ensure partition exists before needed)
  next_month := date_trunc('month', NOW() + INTERVAL '2 months');

  -- Generate partition name: telemetry_events_YYYY_MM
  partition_name := 'telemetry_events_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + INTERVAL '1 month', 'YYYY-MM-DD');

  -- Create partition if it doesn't exist
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF telemetry_events FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );

  RAISE NOTICE 'Partition % created or already exists (range: % to %)',
    partition_name, start_date, end_date;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create partition %: %', partition_name, SQLERRM;
END;
$$;

COMMENT ON FUNCTION create_next_telemetry_partition IS
  'Automatically creates telemetry_events partition for 2 months ahead; runs monthly via pg_cron';

-- Schedule automatic partition creation (runs 1st day of each month at 3:00 AM UTC)
SELECT cron.schedule(
  'create-telemetry-partitions',     -- job name
  '0 3 1 * *',                       -- cron expression: minute hour day month weekday
  'SELECT create_next_telemetry_partition();'
);

-- Verify scheduled jobs
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'create-telemetry-partitions';
```

**Cron expression breakdown:**

- `0` - minute (0)
- `3` - hour (3 AM)
- `1` - day of month (1st)
- `*` - any month
- `*` - any day of week

**Note:** The function creates partitions 2 months ahead, ensuring sufficient buffer time. For example, on January 1st, it creates the partition for March.

### Data Retention

```sql
-- Archive/delete old telemetry partitions (example: 12-month retention)
DROP TABLE IF EXISTS telemetry_events_2024_01; -- Older than 12 months
```

### Cleanup Old Jobs

```sql
-- Archive completed/failed jobs older than 90 days
DELETE FROM translation_jobs
WHERE status IN ('completed', 'failed', 'cancelled')
  AND finished_at < now() - INTERVAL '90 days';
```

## Design Notes

1. **Immutability:** `prefix` and `default_locale` are immutable via triggers to prevent data inconsistency.

2. **Pre-Materialization:** All `(key, locale)` pairs are pre-created in `translations` via `SECURITY DEFINER` triggers to bypass RLS during fan-out.

3. **NULL Semantics:** `translations.value = NULL` means "missing translation"; empty strings are converted to NULL via trim trigger; default locale cannot have NULL values.

4. **Locale Normalization:** Applied automatically via trigger to ensure consistency (`en-us` → `en-US`).

5. **Cascading Deletes:**
   - Delete project → delete all related data
   - Delete key → delete all translations
   - Delete locale → delete all translations (blocked if default locale)

6. **RLS Isolation:** All data isolated by `projects.owner_user_id`; `SECURITY DEFINER` functions handle cross-user operations (e.g., fan-out).

7. **Telemetry Partitioning:** Monthly partitions for scalability; automated via pg_cron (creates partitions 2 months ahead) or manual creation.

8. **Job Concurrency:** Only one active job per project enforced via trigger; prevents resource contention and data races.

9. **Search Performance:** GIN trigram index on `full_key` enables fast "contains" search; case-insensitive via ILIKE (keys are lowercase).

10. **Optimistic Locking:** `updated_at` comparison in UPDATE WHERE clause prevents lost updates in concurrent scenarios.

## Unresolved Items for Future Refinement

1. **Max Length for `full_key`:** Currently 256 chars (conservative); verify against real-world usage patterns.

2. **Description/Label Lengths:** `projects.description` (TEXT) and `project_locales.label` (64) may need adjustment based on UX requirements.

3. **Event Type Expansion:** `event_type` enum limited to MVP events; future events require ALTER TYPE migration.

4. **TTL Enforcement:** Define operational procedure for cleaning old jobs and telemetry data (e.g., cron job, Supabase scheduled function).

5. **Cost Tracking Precision:** `NUMERIC(10,4)` for USD costs; verify scale matches OpenRouter billing precision.
