-- =====================================================================
-- migration: fix default locale creation flow
-- description: ensures default locale always exists in project_locales
-- problem: projects.default_locale may reference non-existent locale
-- solution: automatic default locale creation and validation
-- =====================================================================

-- ---------------------------------------------------------------------
-- function: ensure_default_locale_exists
-- ---------------------------------------------------------------------

-- Ensures default locale record exists in project_locales when project is created
-- This fixes the architectural issue where default_locale is set but no
-- corresponding project_locales record exists
CREATE OR REPLACE FUNCTION ensure_default_locale_exists()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- For INSERT: automatically create default locale if it doesn't exist
  IF TG_OP = 'INSERT' THEN
    -- Insert default locale record if it doesn't already exist
    INSERT INTO project_locales (project_id, locale, label, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.default_locale,
      -- Generate user-friendly label from locale code
      CASE
        WHEN NEW.default_locale = 'af' THEN 'Afrikaans'
        WHEN NEW.default_locale = 'am' THEN 'Amharic'
        WHEN NEW.default_locale = 'ar' THEN 'Arabic'
        WHEN NEW.default_locale = 'arn' THEN 'Mapudungun'
        WHEN NEW.default_locale = 'ary' THEN 'Moroccan Arabic'
        WHEN NEW.default_locale = 'as' THEN 'Assamese'
        WHEN NEW.default_locale = 'az' THEN 'Azerbaijani'
        WHEN NEW.default_locale = 'ba' THEN 'Bashkir'
        WHEN NEW.default_locale = 'be' THEN 'Belarusian'
        WHEN NEW.default_locale = 'bg' THEN 'Bulgarian'
        WHEN NEW.default_locale = 'bn' THEN 'Bengali'
        WHEN NEW.default_locale = 'bo' THEN 'Tibetan'
        WHEN NEW.default_locale = 'br' THEN 'Breton'
        WHEN NEW.default_locale = 'bs' THEN 'Bosnian'
        WHEN NEW.default_locale = 'ca' THEN 'Catalan'
        WHEN NEW.default_locale = 'ckb' THEN 'Central Kurdish'
        WHEN NEW.default_locale = 'co' THEN 'Corsican'
        WHEN NEW.default_locale = 'cs' THEN 'Czech'
        WHEN NEW.default_locale = 'cy' THEN 'Welsh'
        WHEN NEW.default_locale = 'da' THEN 'Danish'
        WHEN NEW.default_locale = 'de' THEN 'German'
        WHEN NEW.default_locale = 'de-DE' THEN 'German (Germany)'
        WHEN NEW.default_locale = 'de-AT' THEN 'German (Austria)'
        WHEN NEW.default_locale = 'de-CH' THEN 'German (Switzerland)'
        WHEN NEW.default_locale = 'dsb' THEN 'Lower Sorbian'
        WHEN NEW.default_locale = 'dv' THEN 'Divehi'
        WHEN NEW.default_locale = 'el' THEN 'Greek'
        WHEN NEW.default_locale = 'en' THEN 'English'
        WHEN NEW.default_locale = 'en-US' THEN 'English (US)'
        WHEN NEW.default_locale = 'en-GB' THEN 'English (UK)'
        WHEN NEW.default_locale = 'en-AU' THEN 'English (Australia)'
        WHEN NEW.default_locale = 'en-CA' THEN 'English (Canada)'
        WHEN NEW.default_locale = 'es' THEN 'Spanish'
        WHEN NEW.default_locale = 'es-ES' THEN 'Spanish (Spain)'
        WHEN NEW.default_locale = 'es-MX' THEN 'Spanish (Mexico)'
        WHEN NEW.default_locale = 'es-AR' THEN 'Spanish (Argentina)'
        WHEN NEW.default_locale = 'et' THEN 'Estonian'
        WHEN NEW.default_locale = 'eu' THEN 'Basque'
        WHEN NEW.default_locale = 'fa' THEN 'Persian'
        WHEN NEW.default_locale = 'fi' THEN 'Finnish'
        WHEN NEW.default_locale = 'fil' THEN 'Filipino'
        WHEN NEW.default_locale = 'fo' THEN 'Faroese'
        WHEN NEW.default_locale = 'fr' THEN 'French'
        WHEN NEW.default_locale = 'fr-FR' THEN 'French (France)'
        WHEN NEW.default_locale = 'fr-CA' THEN 'French (Canada)'
        WHEN NEW.default_locale = 'fr-CH' THEN 'French (Switzerland)'
        WHEN NEW.default_locale = 'fy' THEN 'Frisian'
        WHEN NEW.default_locale = 'ga' THEN 'Irish'
        WHEN NEW.default_locale = 'gd' THEN 'Scottish Gaelic'
        WHEN NEW.default_locale = 'gil' THEN 'Gilbertese'
        WHEN NEW.default_locale = 'gl' THEN 'Galician'
        WHEN NEW.default_locale = 'gsw' THEN 'Swiss German'
        WHEN NEW.default_locale = 'gu' THEN 'Gujarati'
        WHEN NEW.default_locale = 'ha' THEN 'Hausa'
        WHEN NEW.default_locale = 'he' THEN 'Hebrew'
        WHEN NEW.default_locale = 'hi' THEN 'Hindi'
        WHEN NEW.default_locale = 'hr' THEN 'Croatian'
        WHEN NEW.default_locale = 'hsb' THEN 'Upper Sorbian'
        WHEN NEW.default_locale = 'hu' THEN 'Hungarian'
        WHEN NEW.default_locale = 'hy' THEN 'Armenian'
        WHEN NEW.default_locale = 'id' THEN 'Indonesian'
        WHEN NEW.default_locale = 'ig' THEN 'Igbo'
        WHEN NEW.default_locale = 'ii' THEN 'Yi'
        WHEN NEW.default_locale = 'is' THEN 'Icelandic'
        WHEN NEW.default_locale = 'it' THEN 'Italian'
        WHEN NEW.default_locale = 'it-IT' THEN 'Italian (Italy)'
        WHEN NEW.default_locale = 'it-CH' THEN 'Italian (Switzerland)'
        WHEN NEW.default_locale = 'iu' THEN 'Inuktitut'
        WHEN NEW.default_locale = 'ja' THEN 'Japanese'
        WHEN NEW.default_locale = 'ka' THEN 'Georgian'
        WHEN NEW.default_locale = 'kk' THEN 'Kazakh'
        WHEN NEW.default_locale = 'kl' THEN 'Greenlandic'
        WHEN NEW.default_locale = 'km' THEN 'Khmer'
        WHEN NEW.default_locale = 'kn' THEN 'Kannada'
        WHEN NEW.default_locale = 'ko' THEN 'Korean'
        WHEN NEW.default_locale = 'kok' THEN 'Konkani'
        WHEN NEW.default_locale = 'ku' THEN 'Kurdish'
        WHEN NEW.default_locale = 'ky' THEN 'Kyrgyz'
        WHEN NEW.default_locale = 'lb' THEN 'Luxembourgish'
        WHEN NEW.default_locale = 'lo' THEN 'Lao'
        WHEN NEW.default_locale = 'lt' THEN 'Lithuanian'
        WHEN NEW.default_locale = 'lv' THEN 'Latvian'
        WHEN NEW.default_locale = 'mi' THEN 'Maori'
        WHEN NEW.default_locale = 'mk' THEN 'Macedonian'
        WHEN NEW.default_locale = 'ml' THEN 'Malayalam'
        WHEN NEW.default_locale = 'mn' THEN 'Mongolian'
        WHEN NEW.default_locale = 'moh' THEN 'Mohawk'
        WHEN NEW.default_locale = 'mr' THEN 'Marathi'
        WHEN NEW.default_locale = 'ms' THEN 'Malay'
        WHEN NEW.default_locale = 'mt' THEN 'Maltese'
        WHEN NEW.default_locale = 'my' THEN 'Burmese'
        WHEN NEW.default_locale = 'nb' THEN 'Norwegian (Bokmål)'
        WHEN NEW.default_locale = 'ne' THEN 'Nepali'
        WHEN NEW.default_locale = 'nl' THEN 'Dutch'
        WHEN NEW.default_locale = 'nl-NL' THEN 'Dutch (Netherlands)'
        WHEN NEW.default_locale = 'nl-BE' THEN 'Dutch (Belgium)'
        WHEN NEW.default_locale = 'nn' THEN 'Norwegian (Nynorsk)'
        WHEN NEW.default_locale = 'no' THEN 'Norwegian'
        WHEN NEW.default_locale = 'oc' THEN 'Occitan'
        WHEN NEW.default_locale = 'or' THEN 'Odia'
        WHEN NEW.default_locale = 'pa' THEN 'Punjabi'
        WHEN NEW.default_locale = 'pap' THEN 'Papiamento'
        WHEN NEW.default_locale = 'pl' THEN 'Polish'
        WHEN NEW.default_locale = 'pl-PL' THEN 'Polish (Poland)'
        WHEN NEW.default_locale = 'prs' THEN 'Dari'
        WHEN NEW.default_locale = 'ps' THEN 'Pashto'
        WHEN NEW.default_locale = 'pt' THEN 'Portuguese'
        WHEN NEW.default_locale = 'pt-PT' THEN 'Portuguese (Portugal)'
        WHEN NEW.default_locale = 'pt-BR' THEN 'Portuguese (Brazil)'
        WHEN NEW.default_locale = 'qu' THEN 'Quechua'
        WHEN NEW.default_locale = 'quc' THEN 'K''iche'
        WHEN NEW.default_locale = 'rm' THEN 'Romansh'
        WHEN NEW.default_locale = 'ro' THEN 'Romanian'
        WHEN NEW.default_locale = 'ru' THEN 'Russian'
        WHEN NEW.default_locale = 'rw' THEN 'Kinyarwanda'
        WHEN NEW.default_locale = 'sa' THEN 'Sanskrit'
        WHEN NEW.default_locale = 'sah' THEN 'Yakut'
        WHEN NEW.default_locale = 'se' THEN 'Sami (Northern)'
        WHEN NEW.default_locale = 'si' THEN 'Sinhala'
        WHEN NEW.default_locale = 'sk' THEN 'Slovak'
        WHEN NEW.default_locale = 'sl' THEN 'Slovenian'
        WHEN NEW.default_locale = 'sma' THEN 'Sami (Southern)'
        WHEN NEW.default_locale = 'smj' THEN 'Sami (Lule)'
        WHEN NEW.default_locale = 'smn' THEN 'Sami (Inari)'
        WHEN NEW.default_locale = 'sms' THEN 'Sami (Skolt)'
        WHEN NEW.default_locale = 'sq' THEN 'Albanian'
        WHEN NEW.default_locale = 'sr' THEN 'Serbian'
        WHEN NEW.default_locale = 'st' THEN 'Sesotho'
        WHEN NEW.default_locale = 'sv' THEN 'Swedish'
        WHEN NEW.default_locale = 'sw' THEN 'Kiswahili'
        WHEN NEW.default_locale = 'syc' THEN 'Syriac'
        WHEN NEW.default_locale = 'ta' THEN 'Tamil'
        WHEN NEW.default_locale = 'te' THEN 'Telugu'
        WHEN NEW.default_locale = 'tg' THEN 'Tajik'
        WHEN NEW.default_locale = 'th' THEN 'Thai'
        WHEN NEW.default_locale = 'tk' THEN 'Turkmen'
        WHEN NEW.default_locale = 'tn' THEN 'Tswana'
        WHEN NEW.default_locale = 'tr' THEN 'Turkish'
        WHEN NEW.default_locale = 'tt' THEN 'Tatar'
        WHEN NEW.default_locale = 'tzm' THEN 'Tamazight'
        WHEN NEW.default_locale = 'ug' THEN 'Uyghur'
        WHEN NEW.default_locale = 'uk' THEN 'Ukrainian'
        WHEN NEW.default_locale = 'ur' THEN 'Urdu'
        WHEN NEW.default_locale = 'uz' THEN 'Uzbek'
        WHEN NEW.default_locale = 'vi' THEN 'Vietnamese'
        WHEN NEW.default_locale = 'wo' THEN 'Wolof'
        WHEN NEW.default_locale = 'xh' THEN 'Xhosa'
        WHEN NEW.default_locale = 'yo' THEN 'Yoruba'
        WHEN NEW.default_locale = 'zh' THEN 'Chinese'
        WHEN NEW.default_locale = 'zh-CN' THEN 'Chinese (China)'
        WHEN NEW.default_locale = 'zh-TW' THEN 'Chinese (Taiwan)'
        WHEN NEW.default_locale = 'zh-HK' THEN 'Chinese (Hong Kong)'
        WHEN NEW.default_locale = 'zu' THEN 'Zulu'
        ELSE UPPER(SUBSTRING(NEW.default_locale FROM 1 FOR 1)) || LOWER(SUBSTRING(NEW.default_locale FROM 2))
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (project_id, locale) DO NOTHING; -- Don't fail if already exists

    RETURN NEW;
  END IF;

  -- For UPDATE: validate that new default_locale exists in project_locales
  IF TG_OP = 'UPDATE' AND OLD.default_locale IS DISTINCT FROM NEW.default_locale THEN
    -- Check if new default locale exists
    IF NOT EXISTS (
      SELECT 1 FROM project_locales
      WHERE project_id = NEW.id AND locale = NEW.default_locale
    ) THEN
      RAISE EXCEPTION 'Cannot set default_locale to "%". Locale must exist in project_locales first.', NEW.default_locale;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ensure_default_locale_exists IS
  'Automatically creates default locale record in project_locales when project is created. Prevents orphaned default_locale references by ensuring corresponding locale always exists. For updates, validates that new default_locale exists before allowing change.';

-- ---------------------------------------------------------------------
-- trigger: ensure_default_locale_exists_trigger
-- ---------------------------------------------------------------------

-- Apply trigger to projects table
CREATE TRIGGER ensure_default_locale_exists_trigger
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION ensure_default_locale_exists();

-- Also add validation trigger for updates (even though default_locale is immutable)
CREATE TRIGGER validate_default_locale_exists_trigger
  BEFORE UPDATE OF default_locale ON projects
  FOR EACH ROW EXECUTE FUNCTION ensure_default_locale_exists();

COMMENT ON TRIGGER ensure_default_locale_exists_trigger ON projects IS
  'Automatically creates default locale in project_locales after project creation. Prevents architectural issue where default_locale references non-existent locale.';

COMMENT ON TRIGGER validate_default_locale_exists_trigger ON projects IS
  'Validates that default_locale exists in project_locales before update. Provides safety check even though default_locale is immutable.';

-- ---------------------------------------------------------------------
-- function: prevent_default_locale_duplicate_insert
-- ---------------------------------------------------------------------

-- Prevents user from manually adding default locale again
-- This addresses user concern about duplicate default locale prevention
CREATE OR REPLACE FUNCTION prevent_default_locale_duplicate_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_default_locale TEXT;
BEGIN
  -- Get project's default locale
  SELECT default_locale INTO v_default_locale
  FROM projects
  WHERE id = NEW.project_id;

  -- If user tries to insert default locale manually, provide helpful error
  IF NEW.locale = v_default_locale AND EXISTS (
    SELECT 1 FROM project_locales
    WHERE project_id = NEW.project_id AND locale = NEW.locale
  ) THEN
    RAISE EXCEPTION 'Cannot add default locale "%" - it already exists for this project', NEW.locale
    USING HINT = 'Default locale is automatically created when project is created';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION prevent_default_locale_duplicate_insert IS
  'Prevents duplicate insertion of project default locale with helpful error message. Addresses user concern about preventing default locale duplication.';

-- Apply trigger to project_locales
CREATE TRIGGER prevent_default_locale_duplicate_insert_trigger
  BEFORE INSERT ON project_locales
  FOR EACH ROW EXECUTE FUNCTION prevent_default_locale_duplicate_insert();

COMMENT ON TRIGGER prevent_default_locale_duplicate_insert_trigger ON project_locales IS
  'Prevents manual insertion of default locale with helpful error message. Ensures users understand default locale is automatically managed.';

-- ---------------------------------------------------------------------
-- data migration: fix existing projects
-- ---------------------------------------------------------------------

-- Insert missing default locale records for existing projects
-- This fixes any existing projects that may have orphaned default_locale references
INSERT INTO project_locales (project_id, locale, label, created_at, updated_at)
SELECT
  p.id,
  p.default_locale,
  -- Generate label from locale code
  CASE
    WHEN p.default_locale = 'af' THEN 'Afrikaans'
    WHEN p.default_locale = 'am' THEN 'Amharic'
    WHEN p.default_locale = 'ar' THEN 'Arabic'
    WHEN p.default_locale = 'arn' THEN 'Mapudungun'
    WHEN p.default_locale = 'ary' THEN 'Moroccan Arabic'
    WHEN p.default_locale = 'as' THEN 'Assamese'
    WHEN p.default_locale = 'az' THEN 'Azerbaijani'
    WHEN p.default_locale = 'ba' THEN 'Bashkir'
    WHEN p.default_locale = 'be' THEN 'Belarusian'
    WHEN p.default_locale = 'bg' THEN 'Bulgarian'
    WHEN p.default_locale = 'bn' THEN 'Bengali'
    WHEN p.default_locale = 'bo' THEN 'Tibetan'
    WHEN p.default_locale = 'br' THEN 'Breton'
    WHEN p.default_locale = 'bs' THEN 'Bosnian'
    WHEN p.default_locale = 'ca' THEN 'Catalan'
    WHEN p.default_locale = 'ckb' THEN 'Central Kurdish'
    WHEN p.default_locale = 'co' THEN 'Corsican'
    WHEN p.default_locale = 'cs' THEN 'Czech'
    WHEN p.default_locale = 'cy' THEN 'Welsh'
    WHEN p.default_locale = 'da' THEN 'Danish'
    WHEN p.default_locale = 'de' THEN 'German'
    WHEN p.default_locale = 'de-DE' THEN 'German (Germany)'
    WHEN p.default_locale = 'de-AT' THEN 'German (Austria)'
    WHEN p.default_locale = 'de-CH' THEN 'German (Switzerland)'
    WHEN p.default_locale = 'dsb' THEN 'Lower Sorbian'
    WHEN p.default_locale = 'dv' THEN 'Divehi'
    WHEN p.default_locale = 'el' THEN 'Greek'
    WHEN p.default_locale = 'en' THEN 'English'
    WHEN p.default_locale = 'en-US' THEN 'English (US)'
    WHEN p.default_locale = 'en-GB' THEN 'English (UK)'
    WHEN p.default_locale = 'en-AU' THEN 'English (Australia)'
    WHEN p.default_locale = 'en-CA' THEN 'English (Canada)'
    WHEN p.default_locale = 'es' THEN 'Spanish'
    WHEN p.default_locale = 'es-ES' THEN 'Spanish (Spain)'
    WHEN p.default_locale = 'es-MX' THEN 'Spanish (Mexico)'
    WHEN p.default_locale = 'es-AR' THEN 'Spanish (Argentina)'
    WHEN p.default_locale = 'et' THEN 'Estonian'
    WHEN p.default_locale = 'eu' THEN 'Basque'
    WHEN p.default_locale = 'fa' THEN 'Persian'
    WHEN p.default_locale = 'fi' THEN 'Finnish'
    WHEN p.default_locale = 'fil' THEN 'Filipino'
    WHEN p.default_locale = 'fo' THEN 'Faroese'
    WHEN p.default_locale = 'fr' THEN 'French'
    WHEN p.default_locale = 'fr-FR' THEN 'French (France)'
    WHEN p.default_locale = 'fr-CA' THEN 'French (Canada)'
    WHEN p.default_locale = 'fr-CH' THEN 'French (Switzerland)'
    WHEN p.default_locale = 'fy' THEN 'Frisian'
    WHEN p.default_locale = 'ga' THEN 'Irish'
    WHEN p.default_locale = 'gd' THEN 'Scottish Gaelic'
    WHEN p.default_locale = 'gil' THEN 'Gilbertese'
    WHEN p.default_locale = 'gl' THEN 'Galician'
    WHEN p.default_locale = 'gsw' THEN 'Swiss German'
    WHEN p.default_locale = 'gu' THEN 'Gujarati'
    WHEN p.default_locale = 'ha' THEN 'Hausa'
    WHEN p.default_locale = 'he' THEN 'Hebrew'
    WHEN p.default_locale = 'hi' THEN 'Hindi'
    WHEN p.default_locale = 'hr' THEN 'Croatian'
    WHEN p.default_locale = 'hsb' THEN 'Upper Sorbian'
    WHEN p.default_locale = 'hu' THEN 'Hungarian'
    WHEN p.default_locale = 'hy' THEN 'Armenian'
    WHEN p.default_locale = 'id' THEN 'Indonesian'
    WHEN p.default_locale = 'ig' THEN 'Igbo'
    WHEN p.default_locale = 'ii' THEN 'Yi'
    WHEN p.default_locale = 'is' THEN 'Icelandic'
    WHEN p.default_locale = 'it' THEN 'Italian'
    WHEN p.default_locale = 'it-IT' THEN 'Italian (Italy)'
    WHEN p.default_locale = 'it-CH' THEN 'Italian (Switzerland)'
    WHEN p.default_locale = 'iu' THEN 'Inuktitut'
    WHEN p.default_locale = 'ja' THEN 'Japanese'
    WHEN p.default_locale = 'ka' THEN 'Georgian'
    WHEN p.default_locale = 'kk' THEN 'Kazakh'
    WHEN p.default_locale = 'kl' THEN 'Greenlandic'
    WHEN p.default_locale = 'km' THEN 'Khmer'
    WHEN p.default_locale = 'kn' THEN 'Kannada'
    WHEN p.default_locale = 'ko' THEN 'Korean'
    WHEN p.default_locale = 'kok' THEN 'Konkani'
    WHEN p.default_locale = 'ku' THEN 'Kurdish'
    WHEN p.default_locale = 'ky' THEN 'Kyrgyz'
    WHEN p.default_locale = 'lb' THEN 'Luxembourgish'
    WHEN p.default_locale = 'lo' THEN 'Lao'
    WHEN p.default_locale = 'lt' THEN 'Lithuanian'
    WHEN p.default_locale = 'lv' THEN 'Latvian'
    WHEN p.default_locale = 'mi' THEN 'Maori'
    WHEN p.default_locale = 'mk' THEN 'Macedonian'
    WHEN p.default_locale = 'ml' THEN 'Malayalam'
    WHEN p.default_locale = 'mn' THEN 'Mongolian'
    WHEN p.default_locale = 'moh' THEN 'Mohawk'
    WHEN p.default_locale = 'mr' THEN 'Marathi'
    WHEN p.default_locale = 'ms' THEN 'Malay'
    WHEN p.default_locale = 'mt' THEN 'Maltese'
    WHEN p.default_locale = 'my' THEN 'Burmese'
    WHEN p.default_locale = 'nb' THEN 'Norwegian (Bokmål)'
    WHEN p.default_locale = 'ne' THEN 'Nepali'
    WHEN p.default_locale = 'nl' THEN 'Dutch'
    WHEN p.default_locale = 'nl-NL' THEN 'Dutch (Netherlands)'
    WHEN p.default_locale = 'nl-BE' THEN 'Dutch (Belgium)'
    WHEN p.default_locale = 'nn' THEN 'Norwegian (Nynorsk)'
    WHEN p.default_locale = 'no' THEN 'Norwegian'
    WHEN p.default_locale = 'oc' THEN 'Occitan'
    WHEN p.default_locale = 'or' THEN 'Odia'
    WHEN p.default_locale = 'pa' THEN 'Punjabi'
    WHEN p.default_locale = 'pap' THEN 'Papiamento'
    WHEN p.default_locale = 'pl' THEN 'Polish'
    WHEN p.default_locale = 'pl-PL' THEN 'Polish (Poland)'
    WHEN p.default_locale = 'prs' THEN 'Dari'
    WHEN p.default_locale = 'ps' THEN 'Pashto'
    WHEN p.default_locale = 'pt' THEN 'Portuguese'
    WHEN p.default_locale = 'pt-PT' THEN 'Portuguese (Portugal)'
    WHEN p.default_locale = 'pt-BR' THEN 'Portuguese (Brazil)'
    WHEN p.default_locale = 'qu' THEN 'Quechua'
    WHEN p.default_locale = 'quc' THEN 'K''iche'
    WHEN p.default_locale = 'rm' THEN 'Romansh'
    WHEN p.default_locale = 'ro' THEN 'Romanian'
    WHEN p.default_locale = 'ru' THEN 'Russian'
    WHEN p.default_locale = 'rw' THEN 'Kinyarwanda'
    WHEN p.default_locale = 'sa' THEN 'Sanskrit'
    WHEN p.default_locale = 'sah' THEN 'Yakut'
    WHEN p.default_locale = 'se' THEN 'Sami (Northern)'
    WHEN p.default_locale = 'si' THEN 'Sinhala'
    WHEN p.default_locale = 'sk' THEN 'Slovak'
    WHEN p.default_locale = 'sl' THEN 'Slovenian'
    WHEN p.default_locale = 'sma' THEN 'Sami (Southern)'
    WHEN p.default_locale = 'smj' THEN 'Sami (Lule)'
    WHEN p.default_locale = 'smn' THEN 'Sami (Inari)'
    WHEN p.default_locale = 'sms' THEN 'Sami (Skolt)'
    WHEN p.default_locale = 'sq' THEN 'Albanian'
    WHEN p.default_locale = 'sr' THEN 'Serbian'
    WHEN p.default_locale = 'st' THEN 'Sesotho'
    WHEN p.default_locale = 'sv' THEN 'Swedish'
    WHEN p.default_locale = 'sw' THEN 'Kiswahili'
    WHEN p.default_locale = 'syc' THEN 'Syriac'
    WHEN p.default_locale = 'ta' THEN 'Tamil'
    WHEN p.default_locale = 'te' THEN 'Telugu'
    WHEN p.default_locale = 'tg' THEN 'Tajik'
    WHEN p.default_locale = 'th' THEN 'Thai'
    WHEN p.default_locale = 'tk' THEN 'Turkmen'
    WHEN p.default_locale = 'tn' THEN 'Tswana'
    WHEN p.default_locale = 'tr' THEN 'Turkish'
    WHEN p.default_locale = 'tt' THEN 'Tatar'
    WHEN p.default_locale = 'tzm' THEN 'Tamazight'
    WHEN p.default_locale = 'ug' THEN 'Uyghur'
    WHEN p.default_locale = 'uk' THEN 'Ukrainian'
    WHEN p.default_locale = 'ur' THEN 'Urdu'
    WHEN p.default_locale = 'uz' THEN 'Uzbek'
    WHEN p.default_locale = 'vi' THEN 'Vietnamese'
    WHEN p.default_locale = 'wo' THEN 'Wolof'
    WHEN p.default_locale = 'xh' THEN 'Xhosa'
    WHEN p.default_locale = 'yo' THEN 'Yoruba'
    WHEN p.default_locale = 'zh' THEN 'Chinese'
    WHEN p.default_locale = 'zh-CN' THEN 'Chinese (China)'
    WHEN p.default_locale = 'zh-TW' THEN 'Chinese (Taiwan)'
    WHEN p.default_locale = 'zh-HK' THEN 'Chinese (Hong Kong)'
    WHEN p.default_locale = 'zu' THEN 'Zulu'
    ELSE UPPER(SUBSTRING(p.default_locale FROM 1 FOR 1)) || LOWER(SUBSTRING(p.default_locale FROM 2))
  END,
  p.created_at,
  p.updated_at
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_locales pl
  WHERE pl.project_id = p.id AND pl.locale = p.default_locale
)
ON CONFLICT (project_id, locale) DO NOTHING;

-- ---------------------------------------------------------------------
-- summary of the solution
-- ---------------------------------------------------------------------

/*
Original Issue:
- projects.default_locale could reference non-existent locale in project_locales
- Time window between project creation and locale creation
- Architectural inconsistency causing potential orphaned references

User Concern:
- User shouldn't be able to add default locale manually
- System should prevent duplicate default locale insertion

SOLUTION IMPLEMENTED:

1. ensure_default_locale_exists_trigger:
   - Automatically creates default locale record when project is created
   - Eliminates time window where default_locale is orphaned
   - Uses generated labels for common locales

2. prevent_default_locale_duplicate_insert_trigger:
   - Prevents manual insertion of default locale
   - Provides helpful error message explaining automatic management
   - Addresses user concern about duplicate prevention

3. Data Migration:
   - Fixes any existing projects with missing default locale records
   - Ensures database consistency for existing data

4. Validation:
   - Additional safety checks for default_locale updates
   - Comprehensive error handling with helpful messages

BENEFITS:
- Eliminates architectural inconsistency
- Provides clear user feedback
- Maintains data integrity
- Backward compatible with existing data
- Clear separation of system-managed vs user-managed locales
*/