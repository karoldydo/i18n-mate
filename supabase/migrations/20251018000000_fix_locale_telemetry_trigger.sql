-- =====================================================================
-- migration: fix locale telemetry trigger
-- description: add missing language_added telemetry event trigger
-- tables affected: project_locales, telemetry_events
-- notes: ensures proper event tracking for KPI analysis
-- =====================================================================

-- ---------------------------------------------------------------------
-- emit_language_added_event function
-- ---------------------------------------------------------------------

-- emits telemetry event when locale is added to project
-- tracks locale additions for kpi analysis and user behavior insights
--
-- event properties:
--   - locale: the locale code that was added (e.g., "en", "pl-PL")
--   - locale_count: total number of locales in project after addition
--
-- rationale:
--   - provides data for kpi: "percentage of projects with at least 2 languages"
--   - tracks user engagement with multi-language features
--   - enables cohort analysis by project creation date vs language adoption
--
-- security:
--   - runs with DEFINER privileges to insert into telemetry_events
--   - bypasses RLS as telemetry is system-level data
--   - consistent with other trigger functions security model
CREATE OR REPLACE FUNCTION emit_language_added_event()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_locale_count INTEGER;
  v_is_default BOOLEAN;
BEGIN
  -- Ensure partition exists before insert
  PERFORM ensure_telemetry_partition_exists();

  -- Count total locales for this project
  SELECT COUNT(*) INTO v_locale_count
  FROM project_locales
  WHERE project_id = NEW.project_id;

  -- Check if this is the default locale
  SELECT (NEW.locale = p.default_locale) INTO v_is_default
  FROM projects p
  WHERE p.id = NEW.project_id;

  -- Insert telemetry event with enhanced metadata
  INSERT INTO telemetry_events (event_name, project_id, properties)
  VALUES ('language_added', NEW.project_id, jsonb_build_object(
    'locale', NEW.locale,
    'locale_count', v_locale_count,
    'is_default', COALESCE(v_is_default, false)
  ));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the locale insertion
  RAISE WARNING 'Failed to emit language_added event for project %: %',
    NEW.project_id, SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION emit_language_added_event IS
  'Emits language_added telemetry event when locale is added to project. Tracks locale code and total locale_count for comprehensive KPI analysis. Uses SECURITY DEFINER to bypass RLS during telemetry_events insertion. Provides data for critical KPIs: projects with 2+ languages after 7 days, locale adoption rates, and user engagement with internationalization features. Gracefully handles errors without failing the primary locale insertion operation.';

-- ---------------------------------------------------------------------
-- trigger: emit_language_added_event_trigger
-- ---------------------------------------------------------------------

-- Fires after successful locale insertion to track language additions
CREATE TRIGGER emit_language_added_event_trigger
  AFTER INSERT ON project_locales
  FOR EACH ROW EXECUTE FUNCTION emit_language_added_event();

COMMENT ON TRIGGER emit_language_added_event_trigger ON project_locales IS
  'Triggers language_added telemetry event after locale insertion. Enables KPI tracking: projects with 2+ languages, locale adoption rates.';