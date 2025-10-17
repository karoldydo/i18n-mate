# 3. keys

Translation keys, created only in default language, mirrored to all locales.

```sql
CREATE TABLE keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  full_key VARCHAR(256) NOT NULL CHECK (
    full_key ~ '^[a-z0-9._-]+$'
    AND full_key !~ '\.\.'
    AND full_key !~ '\.$'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT keys_unique_per_project UNIQUE (project_id, full_key)
);

COMMENT ON TABLE keys IS 'Translation keys; created only in default language; must start with project.prefix + "."; no consecutive dots (..) allowed';
COMMENT ON COLUMN keys.full_key IS 'Lowercase, [a-z0-9._-], no ".." or trailing dot, unique per project, starts with prefix + "."';
```
