CREATE OR REPLACE FUNCTION validate_project_default_locale_format()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.default_locale IS NOT NULL THEN
    IF NOT (NEW.default_locale ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') THEN
      RAISE EXCEPTION 'Invalid default_locale format: "%". Must be ll or ll-CC format', NEW.default_locale
      USING ERRCODE = '23514',
            HINT = 'Use 2-letter language code like "en" or "en-US"';
    END IF;

    IF LENGTH(NEW.default_locale) > 5 THEN
      RAISE EXCEPTION 'Default locale code too long: "%". Maximum 5 characters', NEW.default_locale
      USING ERRCODE = '23514';
    END IF;

    IF NEW.default_locale ~ '[^a-zA-Z-]' THEN
      RAISE EXCEPTION 'Invalid characters in default_locale: "%". Only letters and dash allowed', NEW.default_locale
      USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;