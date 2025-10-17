CREATE OR REPLACE FUNCTION fan_out_translations_on_key_insert()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_locale_count INTEGER;
  v_project_default_locale TEXT;
BEGIN
  SELECT default_locale INTO v_project_default_locale
  FROM projects WHERE id = NEW.project_id;

  SELECT COUNT(*) INTO v_locale_count
  FROM project_locales
  WHERE project_id = NEW.project_id
    AND locale != v_project_default_locale;

  BEGIN
    INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source)
    SELECT
      NEW.project_id,
      NEW.id,
      pl.locale,
      NULL,
      NOW(),
      'user'
    FROM project_locales pl
    WHERE pl.project_id = NEW.project_id
      AND pl.locale != v_project_default_locale;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create translations for new key: %', SQLERRM
      USING HINT = 'Key insertion failed due to translation fan-out error';
  END;

  RETURN NEW;
END;
$$;