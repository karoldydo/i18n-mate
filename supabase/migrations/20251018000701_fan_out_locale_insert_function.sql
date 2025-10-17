CREATE OR REPLACE FUNCTION fan_out_translations_on_locale_insert()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_key_count INTEGER;
  v_rows_inserted INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_key_count
  FROM keys
  WHERE project_id = NEW.project_id;

  BEGIN
    WITH inserted_translations AS (
      INSERT INTO translations (project_id, key_id, locale, value, updated_at, updated_source)
      SELECT
        NEW.project_id,
        k.id,
        NEW.locale,
        NULL,
        NOW(),
        'user'
      FROM keys k
      WHERE k.project_id = NEW.project_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_rows_inserted FROM inserted_translations;

    IF v_rows_inserted != v_key_count THEN
      RAISE EXCEPTION 'Fan-out incomplete: expected % rows, inserted %',
        v_key_count, v_rows_inserted;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create translations for new locale: %', SQLERRM
      USING HINT = 'Locale insertion failed due to translation fan-out error';
  END;

  RETURN NEW;
END;
$$;