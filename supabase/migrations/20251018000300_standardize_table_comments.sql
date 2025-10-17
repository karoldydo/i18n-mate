-- =====================================================================
-- migration: standardize table and column comments
-- description: consistent, detailed comments for all locale-related tables
-- tables affected: projects, project_locales, keys, translations
-- notes: matches documentation standards and provides clear business context
-- =====================================================================

-- ---------------------------------------------------------------------
-- projects table comments
-- ---------------------------------------------------------------------

COMMENT ON TABLE projects IS
  'Translation projects owned by authenticated users. Each project contains locales, keys, and translations with immutable prefix and default_locale for data consistency.';

COMMENT ON COLUMN projects.prefix IS
  '2-4 character key prefix, unique per owner, immutable after creation. Must match [a-z0-9._-] pattern and cannot end with dot. Examples: "app", "ui", "web".';

COMMENT ON COLUMN projects.default_locale IS
  'Immutable default language for the project. Must exist in project_locales and cannot be deleted. Used as source language for translations and key validation.';

COMMENT ON COLUMN projects.name IS
  'Human-readable project name, unique per owner. Case-insensitive (CITEXT) to prevent duplicate names like "My App" and "my app".';

COMMENT ON COLUMN projects.description IS
  'Optional project description for user reference. No business logic constraints.';

COMMENT ON COLUMN projects.owner_user_id IS
  'Foreign key to auth.users. Defines project ownership for RLS policy enforcement. CASCADE DELETE removes projects when user is deleted.';

-- ---------------------------------------------------------------------
-- project_locales table comments
-- ---------------------------------------------------------------------

COMMENT ON TABLE project_locales IS
  'Languages assigned to translation projects. Default locale cannot be deleted (enforced by trigger). New locales trigger automatic translation fan-out to all existing keys.';

COMMENT ON COLUMN project_locales.locale IS
  'BCP-47 normalized locale code (ll or ll-CC format). Automatically normalized via normalize_project_locale_insert_trigger. Examples: "en", "en-US", "pl", "pl-PL".';

COMMENT ON COLUMN project_locales.label IS
  'Human-readable language name for UI display. Editable field (only mutable field in this table). Examples: "English (US)", "Polski", "Español".';

COMMENT ON COLUMN project_locales.project_id IS
  'Foreign key to projects table. CASCADE DELETE removes all locales when project is deleted. Used in RLS policies for ownership validation.';

-- ---------------------------------------------------------------------
-- keys table comments (for completeness)
-- ---------------------------------------------------------------------

COMMENT ON TABLE keys IS
  'Translation keys created in project default language. Automatically creates NULL translations in all project locales via fan-out trigger. Full key must start with project.prefix.';

COMMENT ON COLUMN keys.full_key IS
  'Complete translation key including project prefix (e.g., "app.welcome", "ui.button.save"). Must start with project.prefix + ".". Unique within project. Lowercase alphanumeric with dots, dashes, underscores allowed.';

COMMENT ON COLUMN keys.project_id IS
  'Foreign key to projects table. CASCADE DELETE removes all keys when project is deleted. Used for RLS policy enforcement and prefix validation.';

-- ---------------------------------------------------------------------
-- translations table comments (for completeness)
-- ---------------------------------------------------------------------

COMMENT ON TABLE translations IS
  'Translation values for each (project, key, locale) combination. NULL values indicate missing translations. Default locale cannot have NULL values (enforced by trigger).';

COMMENT ON COLUMN translations.value IS
  'Translation text up to 250 characters, no newlines allowed. NULL indicates missing translation (except for default locale). Empty strings automatically converted to NULL by trigger.';

COMMENT ON COLUMN translations.locale IS
  'BCP-47 locale code matching project_locales.locale. Composite foreign key with project_id ensures locale exists in project before translation creation.';

COMMENT ON COLUMN translations.is_machine_translated IS
  'Boolean flag indicating translation source: true for LLM-generated, false for user-entered. Updated automatically by triggers and application logic.';

COMMENT ON COLUMN translations.updated_source IS
  'Enum tracking update source: "user" for manual edits, "system" for LLM translations. Used for telemetry and translation quality tracking.';

COMMENT ON COLUMN translations.updated_by_user_id IS
  'Foreign key to auth.users for user-generated translations, NULL for system translations. Enables translation attribution and quality analysis.';

-- ---------------------------------------------------------------------
-- constraints comments
-- ---------------------------------------------------------------------

COMMENT ON CONSTRAINT project_locales_unique_per_project ON project_locales IS
  'Ensures each locale appears only once per project. Prevents duplicate language assignments and maintains data integrity.';

COMMENT ON CONSTRAINT projects_name_unique_per_owner ON projects IS
  'Prevents duplicate project names within user scope. Case-insensitive due to CITEXT column type.';

COMMENT ON CONSTRAINT projects_prefix_unique_per_owner ON projects IS
  'Ensures unique prefixes per user to avoid key naming conflicts across projects. Critical for key validation logic.';