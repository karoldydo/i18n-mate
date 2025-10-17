CREATE OR REPLACE FUNCTION is_valid_locale_format(locale_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE AS $$
BEGIN
  IF locale_input IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT (locale_input ~ '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') THEN
    RETURN FALSE;
  END IF;

  IF LENGTH(locale_input) > 5 THEN
    RETURN FALSE;
  END IF;

  IF locale_input ~ '[^a-zA-Z-]' THEN
    RETURN FALSE;
  END IF;

  IF locale_input ~ '.*-.*-.*' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;