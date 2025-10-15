# 1. projects

Main entity for translation projects, owned by users.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name CITEXT NOT NULL,
  description TEXT,
  prefix VARCHAR(4) NOT NULL CHECK (
    length(prefix) BETWEEN 2 AND 4
    AND prefix ~ '^[a-z0-9._-]+$'
    AND prefix NOT LIKE '%.'
  ),
  default_locale locale_code NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT projects_name_unique_per_owner UNIQUE (owner_user_id, name),
  CONSTRAINT projects_prefix_unique_per_owner UNIQUE (owner_user_id, prefix)
);

COMMENT ON TABLE projects IS 'Translation projects owned by users';
COMMENT ON COLUMN projects.prefix IS '2-4 char key prefix, unique per owner, immutable, [a-z0-9._-], no trailing dot';
COMMENT ON COLUMN projects.default_locale IS 'Immutable default language, must exist in project_locales, cannot be deleted';
```
