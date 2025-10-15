# 4. translations

Translation values for each (project, key, locale) combination.

```sql
CREATE TABLE translations (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_id UUID NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
  locale locale_code NOT NULL,
  value VARCHAR(250) CHECK (value !~ '\n'),
  is_machine_translated BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_source update_source_type NOT NULL DEFAULT 'user',
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  PRIMARY KEY (project_id, key_id, locale),
  FOREIGN KEY (project_id, locale) REFERENCES project_locales(project_id, locale) ON DELETE CASCADE
);

COMMENT ON TABLE translations IS 'Pre-materialized translation values; auto-created for each (key, locale) pair';
COMMENT ON COLUMN translations.value IS 'NULL = missing; for default_locale: NOT NULL AND <> empty; max 250 chars, no newline; auto-trimmed';
COMMENT ON COLUMN translations.is_machine_translated IS 'true = LLM-generated; false = manual edit';
COMMENT ON COLUMN translations.updated_source IS 'user = manual edit; system = LLM translation';
COMMENT ON COLUMN translations.updated_by_user_id IS 'NULL for system updates';
```
