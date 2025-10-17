-- =====================================================================
-- migration: standardize trigger names
-- description: rename triggers to follow consistent naming convention
-- naming pattern: [action]_[entity]_[event]_trigger
-- tables affected: project_locales, projects, keys, translations, translation_jobs
-- =====================================================================

-- ---------------------------------------------------------------------
-- project_locales table triggers
-- ---------------------------------------------------------------------

-- Rename normalize_locale_trigger to normalize_project_locale_insert_trigger
ALTER TRIGGER normalize_locale_trigger ON project_locales
RENAME TO normalize_project_locale_insert_trigger;

-- Rename prevent_default_locale_delete_trigger to prevent_project_locale_default_delete_trigger
ALTER TRIGGER prevent_default_locale_delete_trigger ON project_locales
RENAME TO prevent_project_locale_default_delete_trigger;

-- Update trigger comments to reflect new names
COMMENT ON TRIGGER normalize_project_locale_insert_trigger ON project_locales IS
  'Normalizes locale codes to ll or ll-CC format before insert/update. Ensures consistent BCP-47 formatting: language lowercase, REGION uppercase.';

COMMENT ON TRIGGER prevent_project_locale_default_delete_trigger ON project_locales IS
  'Prevents deletion of project default locale. Ensures default_locale referenced by projects table always exists.';

-- ---------------------------------------------------------------------
-- projects table triggers
-- ---------------------------------------------------------------------

-- Rename prevent_default_locale_change_trigger to prevent_project_default_locale_update_trigger
ALTER TRIGGER prevent_default_locale_change_trigger ON projects
RENAME TO prevent_project_default_locale_update_trigger;

-- Rename prevent_prefix_change_trigger to prevent_project_prefix_update_trigger
ALTER TRIGGER prevent_prefix_change_trigger ON projects
RENAME TO prevent_project_prefix_update_trigger;

-- Update trigger comments
COMMENT ON TRIGGER prevent_project_default_locale_update_trigger ON projects IS
  'Prevents modification of projects.default_locale field after creation. Default locale is immutable to maintain data consistency.';

COMMENT ON TRIGGER prevent_project_prefix_update_trigger ON projects IS
  'Prevents modification of projects.prefix field after creation. Prefix is immutable to avoid invalidating existing key validation.';

-- ---------------------------------------------------------------------
-- keys table triggers
-- ---------------------------------------------------------------------

-- Rename validate_key_prefix_trigger to validate_key_prefix_insert_trigger
ALTER TRIGGER validate_key_prefix_trigger ON keys
RENAME TO validate_key_prefix_insert_trigger;

-- Update trigger comment
COMMENT ON TRIGGER validate_key_prefix_insert_trigger ON keys IS
  'Validates that key.full_key starts with project.prefix + ".". Ensures all keys follow project naming convention.';

-- ---------------------------------------------------------------------
-- translations table triggers
-- ---------------------------------------------------------------------

-- Rename trim_translation_value_trigger to trim_translation_value_insert_trigger
ALTER TRIGGER trim_translation_value_trigger ON translations
RENAME TO trim_translation_value_insert_trigger;

-- Rename validate_default_locale_value_trigger to validate_translation_default_locale_insert_trigger
ALTER TRIGGER validate_default_locale_value_trigger ON translations
RENAME TO validate_translation_default_locale_insert_trigger;

-- Update trigger comments
COMMENT ON TRIGGER trim_translation_value_insert_trigger ON translations IS
  'Trims whitespace from translation values and converts empty strings to NULL. Ensures consistent handling of missing/empty translations.';

COMMENT ON TRIGGER validate_translation_default_locale_insert_trigger ON translations IS
  'Validates that default locale translations cannot have NULL or empty values. Ensures default language always has complete translations.';

-- ---------------------------------------------------------------------
-- fan-out triggers (special handling)
-- ---------------------------------------------------------------------

-- Rename fan_out_translations_on_key_insert_trigger to fanout_translation_key_insert_trigger
ALTER TRIGGER fan_out_translations_on_key_insert_trigger ON keys
RENAME TO fanout_translation_key_insert_trigger;

-- Rename fan_out_translations_on_locale_insert_trigger to fanout_translation_locale_insert_trigger
ALTER TRIGGER fan_out_translations_on_locale_insert_trigger ON project_locales
RENAME TO fanout_translation_locale_insert_trigger;

-- Update fan-out trigger comments
COMMENT ON TRIGGER fanout_translation_key_insert_trigger ON keys IS
  'Creates NULL translation records for new key in all project locales. Uses SECURITY DEFINER to bypass RLS during bulk insert operation.';

COMMENT ON TRIGGER fanout_translation_locale_insert_trigger ON project_locales IS
  'Creates NULL translation records for new locale across all project keys. Uses SECURITY DEFINER to bypass RLS during bulk insert operation.';

-- ---------------------------------------------------------------------
-- update_updated_at triggers (standardize naming)
-- ---------------------------------------------------------------------

-- These triggers follow different pattern: update_[table]_updated_at
-- Keep existing names as they're already standardized and widely used

-- Just update comments for consistency
COMMENT ON TRIGGER update_projects_updated_at ON projects IS
  'Automatically updates updated_at timestamp on row modification.';

COMMENT ON TRIGGER update_project_locales_updated_at ON project_locales IS
  'Automatically updates updated_at timestamp on row modification.';

COMMENT ON TRIGGER update_translations_updated_at ON translations IS
  'Automatically updates updated_at timestamp on row modification.';

-- ---------------------------------------------------------------------
-- summary of trigger naming convention
-- ---------------------------------------------------------------------

/*
STANDARDIZED TRIGGER NAMING PATTERNS:

1. Validation triggers: validate_[entity]_[field]_[event]_trigger
   - validate_key_prefix_insert_trigger
   - validate_translation_default_locale_insert_trigger

2. Prevention triggers: prevent_[entity]_[field]_[event]_trigger
   - prevent_project_default_locale_update_trigger
   - prevent_project_prefix_update_trigger
   - prevent_project_locale_default_delete_trigger

3. Normalization triggers: normalize_[entity]_[field]_[event]_trigger
   - normalize_project_locale_insert_trigger

4. Processing triggers: [action]_[entity]_[field]_[event]_trigger
   - trim_translation_value_insert_trigger

5. Fan-out triggers: fanout_[target]_[source]_[event]_trigger
   - fanout_translation_key_insert_trigger
   - fanout_translation_locale_insert_trigger

6. Timestamp triggers: update_[table]_updated_at (legacy pattern, kept for consistency)
   - update_projects_updated_at
   - update_project_locales_updated_at
   - update_translations_updated_at

7. Telemetry triggers: emit_[event]_event_trigger
   - emit_language_added_event_trigger

BENEFITS:
- Consistent alphabetical ordering (PostgreSQL executes triggers alphabetically)
- Clear action + target + event pattern
- Easy to understand trigger purpose from name
- Grouped by functionality when listed
*/