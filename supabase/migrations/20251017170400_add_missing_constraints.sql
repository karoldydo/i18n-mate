-- =====================================================================
-- migration: add missing database constraints for keys and projects
-- description: Add CHECK constraints for consecutive dots in keys,
--              prefix length validation, and trailing dot prevention
-- =====================================================================

-- 1. Add CHECK constraint for consecutive dots in keys.full_key
-- This ensures no ".." sequences are allowed anywhere in the key
ALTER TABLE keys ADD CONSTRAINT keys_no_consecutive_dots
CHECK (full_key !~ '\.\.');

-- 2. Add CHECK constraint for prefix length (2-4 characters) in projects
ALTER TABLE projects ADD CONSTRAINT projects_prefix_length
CHECK (length(prefix) BETWEEN 2 AND 4);

-- 3. Add CHECK constraint to prevent trailing dot in prefix
ALTER TABLE projects ADD CONSTRAINT projects_prefix_no_trailing_dot
CHECK (prefix !~ '\.$');

-- 4. Update table comments to reflect new constraints
COMMENT ON TABLE keys IS 'Translation keys; created only in default language; must start with project.prefix + "."; no consecutive dots (..) allowed';
COMMENT ON COLUMN keys.full_key IS 'Lowercase, [a-z0-9._-], no ".." or trailing dot, unique per project, starts with prefix + "."';

COMMENT ON TABLE projects IS 'User projects with immutable prefix (2-4 chars, no trailing dot) and default_locale';
COMMENT ON COLUMN projects.prefix IS '2-4 chars, [a-z0-9._-], no trailing dot, unique per owner, immutable';