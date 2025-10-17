-- =====================================================================
-- migration: standardize index names
-- description: rename indexes to follow consistent idx_table_columns pattern
-- naming pattern: idx_[table]_[column1]_[column2]_[purpose]
-- tables affected: projects, project_locales, keys, translations
-- =====================================================================

-- ---------------------------------------------------------------------
-- project_locales indexes
-- ---------------------------------------------------------------------

-- Rename unique constraint to follow idx pattern
ALTER INDEX project_locales_unique_per_project
RENAME TO idx_project_locales_project_locale_unique;

-- Verify and rename foreign key index if needed
-- (Usually auto-created by PostgreSQL with default name)
DO $$
BEGIN
  -- Check if the default FK index exists and rename it
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'project_locales'
    AND indexname LIKE '%project_id%'
    AND indexname != 'idx_project_locales_project_id'
  ) THEN
    -- Find the actual index name and rename it
    EXECUTE (
      SELECT 'ALTER INDEX ' || indexname || ' RENAME TO idx_project_locales_project_id'
      FROM pg_indexes
      WHERE tablename = 'project_locales'
      AND indexname LIKE '%project_id%'
      AND indexname != 'idx_project_locales_project_id'
      LIMIT 1
    );
  END IF;
END $$;

-- Add missing indexes with proper naming
CREATE INDEX IF NOT EXISTS idx_project_locales_project_id
  ON project_locales(project_id);

CREATE INDEX IF NOT EXISTS idx_project_locales_locale
  ON project_locales(locale);

-- ---------------------------------------------------------------------
-- projects indexes
-- ---------------------------------------------------------------------

-- Rename unique constraints to follow idx pattern
ALTER INDEX projects_name_unique_per_owner
RENAME TO idx_projects_owner_name_unique;

ALTER INDEX projects_prefix_unique_per_owner
RENAME TO idx_projects_owner_prefix_unique;

-- Add performance indexes with proper naming
CREATE INDEX IF NOT EXISTS idx_projects_owner_created
  ON projects(owner_user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- keys indexes (if they exist)
-- ---------------------------------------------------------------------

-- Add indexes for keys table with proper naming
CREATE INDEX IF NOT EXISTS idx_keys_project_id
  ON keys(project_id);

CREATE INDEX IF NOT EXISTS idx_keys_full_key_trgm
  ON keys USING GIN (full_key gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_keys_project_full_key_unique
  ON keys(project_id, full_key);

-- ---------------------------------------------------------------------
-- translations indexes (if they exist)
-- ---------------------------------------------------------------------

-- Add comprehensive indexes for translations table
CREATE INDEX IF NOT EXISTS idx_translations_project_locale
  ON translations(project_id, locale, key_id);

CREATE INDEX IF NOT EXISTS idx_translations_key_id
  ON translations(key_id);

CREATE INDEX IF NOT EXISTS idx_translations_missing
  ON translations(project_id, locale, key_id)
  WHERE value IS NULL;

-- ---------------------------------------------------------------------
-- index naming documentation
-- ---------------------------------------------------------------------

/*
STANDARDIZED INDEX NAMING PATTERNS:

1. Unique constraints: idx_[table]_[columns]_unique
   - idx_project_locales_project_locale_unique
   - idx_projects_owner_name_unique
   - idx_projects_owner_prefix_unique

2. Foreign key indexes: idx_[table]_[fk_column]
   - idx_project_locales_project_id
   - idx_translations_key_id

3. Performance indexes: idx_[table]_[columns]_[purpose]
   - idx_projects_owner_created (for user project listing)
   - idx_translations_project_locale (for locale queries)
   - idx_translations_missing (for missing translation filters)

4. Full-text/trigram indexes: idx_[table]_[column]_[index_type]
   - idx_keys_full_key_trgm (trigram search)

5. Composite indexes: idx_[table]_[col1]_[col2]_[col3]
   - idx_translations_project_locale (project_id, locale, key_id)
   - idx_keys_project_full_key_unique (project_id, full_key)

BENEFITS:
- Consistent alphabetical ordering in pg_indexes view
- Clear purpose identification from name
- Easy to understand index coverage
- Follows PostgreSQL community conventions
- Makes index maintenance and monitoring easier
*/

-- ---------------------------------------------------------------------
-- update comments for renamed indexes
-- ---------------------------------------------------------------------

COMMENT ON INDEX idx_project_locales_project_locale_unique IS
  'Ensures each locale appears only once per project. Critical for data integrity and preventing duplicate language assignments.';

COMMENT ON INDEX idx_projects_owner_name_unique IS
  'Prevents duplicate project names within user scope. Case-insensitive due to CITEXT column type.';

COMMENT ON INDEX idx_projects_owner_prefix_unique IS
  'Ensures unique prefixes per user to avoid key naming conflicts. Essential for key validation logic.';

COMMENT ON INDEX idx_project_locales_project_id IS
  'Foreign key index for efficient project-to-locales joins and RLS policy enforcement.';

COMMENT ON INDEX idx_keys_full_key_trgm IS
  'Trigram index enabling fast "contains" search on translation keys. Used by key search functionality.';

COMMENT ON INDEX idx_translations_project_locale IS
  'Composite index optimizing locale-specific translation queries. Primary index for per-language views.';

COMMENT ON INDEX idx_translations_missing IS
  'Partial index for missing translation queries (WHERE value IS NULL). Optimizes "missing translations" filters.';