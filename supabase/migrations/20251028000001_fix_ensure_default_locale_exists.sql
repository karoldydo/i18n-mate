-- =====================================================================
-- migration: fix ensure_default_locale_exists function
-- description: restore INSERT auto-creation logic while keeping structured errors
-- problem: migration 20251028000000 broke project creation by removing
--          auto-creation of default locale in project_locales
-- solution: restore original INSERT logic with structured error format
-- =====================================================================

-- ---------------------------------------------------------------------
-- restore ensure_default_locale_exists with both INSERT and UPDATE logic
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_default_locale_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        WHEN NEW.default_locale = 'mni' THEN 'Manipuri'
        WHEN NEW.default_locale = 'moh' THEN 'Mohawk'
        WHEN NEW.default_locale = 'mr' THEN 'Marathi'
        WHEN NEW.default_locale = 'ms' THEN 'Malay'
        WHEN NEW.default_locale = 'mt' THEN 'Maltese'
        WHEN NEW.default_locale = 'my' THEN 'Burmese'
        WHEN NEW.default_locale = 'nb' THEN 'Norwegian (Bokmål)'
        WHEN NEW.default_locale = 'ne' THEN 'Nepali'
        WHEN NEW.default_locale = 'nl' THEN 'Dutch'
        WHEN NEW.default_locale = 'nl-BE' THEN 'Dutch (Belgium)'
        WHEN NEW.default_locale = 'nn' THEN 'Norwegian (Nynorsk)'
        WHEN NEW.default_locale = 'no' THEN 'Norwegian'
        WHEN NEW.default_locale = 'nso' THEN 'Sesotho sa Leboa'
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
      RAISE EXCEPTION 'Cannot set default_locale to a locale that does not exist in project_locales'
      USING ERRCODE = '23514',
            DETAIL = 'error_code:LOCALE_NOT_FOUND,field:default_locale,value:' || NEW.default_locale,
            HINT = 'Add the locale to project_locales first, then set it as default';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ensure_default_locale_exists IS
  'Automatically creates default locale record in project_locales when project is created (INSERT). For updates (UPDATE), validates that new default_locale exists in project_locales. Uses structured error format for frontend parsing.';
