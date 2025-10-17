CREATE TRIGGER a_validate_project_default_locale_format_trigger
  BEFORE INSERT OR UPDATE OF default_locale ON projects
  FOR EACH ROW EXECUTE FUNCTION validate_project_default_locale_format();