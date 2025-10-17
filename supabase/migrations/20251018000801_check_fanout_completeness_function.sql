CREATE OR REPLACE FUNCTION check_fanout_completeness(p_project_id UUID)
RETURNS TABLE (
  locale_code TEXT,
  expected_translations INTEGER,
  actual_translations INTEGER,
  missing_translations INTEGER,
  is_complete BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_user_id UUID;
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

  RETURN QUERY
  SELECT
    pl.locale::TEXT,
    (SELECT COUNT(*)::INTEGER FROM keys WHERE project_id = p_project_id) AS expected,
    COUNT(t.key_id)::INTEGER AS actual,
    ((SELECT COUNT(*) FROM keys WHERE project_id = p_project_id) - COUNT(t.key_id))::INTEGER AS missing,
    (COUNT(t.key_id) = (SELECT COUNT(*) FROM keys WHERE project_id = p_project_id)) AS is_complete
  FROM project_locales pl
  LEFT JOIN translations t ON t.project_id = pl.project_id AND t.locale = pl.locale
  WHERE pl.project_id = p_project_id
  GROUP BY pl.locale, pl.created_at
  ORDER BY pl.created_at;
END;
$$;