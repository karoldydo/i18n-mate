CREATE OR REPLACE FUNCTION validate_locale_format_strict()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.locale IS NOT NULL THEN
    IF NOT (NEW.locale ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') THEN
      RAISE EXCEPTION 'Invalid locale format: "%". Must be ll or ll-CC format (e.g., "en", "en-US", "pl", "pl-PL")', NEW.locale
      USING ERRCODE = '23514',
            HINT = 'Use 2-letter language code, optionally followed by dash and 2-letter country code';
    END IF;

    IF LENGTH(NEW.locale) > 5 THEN
      RAISE EXCEPTION 'Locale code too long: "%". Maximum length is 5 characters (ll-CC format)', NEW.locale
      USING ERRCODE = '23514',
            HINT = 'Use format like "en", "en-US", not full language names';
    END IF;

    IF NEW.locale ~ '[^a-zA-Z-]' THEN
      RAISE EXCEPTION 'Invalid characters in locale: "%". Only letters and dash allowed', NEW.locale
      USING ERRCODE = '23514',
            HINT = 'Use only letters and dash, like "en-US" not "en_US" or "en.US"';
    END IF;

    IF NEW.locale ~ '.*-.*-.*' THEN
      RAISE EXCEPTION 'Too many dashes in locale: "%". Use format ll-CC, not ll-CC-XX', NEW.locale
      USING ERRCODE = '23514',
            HINT = 'This system supports only language-country pairs, not extended BCP-47 tags';
    END IF;

    IF NEW.locale ILIKE 'english' OR NEW.locale ILIKE 'polish' OR NEW.locale ILIKE 'spanish' THEN
      RAISE EXCEPTION 'Use locale code, not language name: "%". Try "en" for English, "pl" for Polish, "es" for Spanish', NEW.locale
      USING ERRCODE = '23514',
            HINT = 'Use ISO 639-1 language codes, not full language names';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;