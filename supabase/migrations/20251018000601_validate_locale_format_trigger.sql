CREATE TRIGGER a_validate_locale_format_before_normalize_trigger
  BEFORE INSERT OR UPDATE OF locale ON project_locales
  FOR EACH ROW EXECUTE FUNCTION validate_locale_format_strict();