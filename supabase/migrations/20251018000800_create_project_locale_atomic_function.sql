CREATE OR REPLACE FUNCTION create_project_locale_atomic(
  p_project_id UUID,
  p_locale TEXT,
  p_label TEXT
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  locale TEXT,
  label TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_locale_id UUID;
  v_owner_user_id UUID;
  v_key_count INTEGER;
BEGIN
  v_owner_user_id := auth.uid();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND owner_user_id = v_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  INSERT INTO project_locales (project_id, locale, label)
  VALUES (p_project_id, p_locale, p_label)
  RETURNING project_locales.id INTO v_locale_id;

  SELECT COUNT(*) INTO v_key_count
  FROM keys WHERE project_id = p_project_id;

  IF v_key_count > 0 AND NOT EXISTS (
    SELECT 1 FROM translations
    WHERE project_id = p_project_id AND locale = p_locale::locale_code
  ) THEN
    RAISE EXCEPTION 'Fan-out verification failed: no translations created for locale %', p_locale;
  END IF;

  RETURN QUERY
  SELECT
    pl.id,
    pl.project_id,
    pl.locale::TEXT,
    pl.label,
    pl.created_at,
    pl.updated_at
  FROM project_locales pl
  WHERE pl.id = v_locale_id;
END;
$$;