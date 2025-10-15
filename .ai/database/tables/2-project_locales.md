# 2. project_locales

Languages assigned to projects.

```sql
CREATE TABLE project_locales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  locale locale_code NOT NULL,
  label VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT project_locales_unique_per_project UNIQUE (project_id, locale)
);

COMMENT ON TABLE project_locales IS 'Languages assigned to projects; default_locale cannot be deleted';
COMMENT ON COLUMN project_locales.locale IS 'Normalized BCP-47 code: ll or ll-CC';
COMMENT ON COLUMN project_locales.label IS 'Human-readable language name (editable)';
```
