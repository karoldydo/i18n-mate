# Product Requirements Document (PRD) - i18n-mate

## 1. Product Overview

Goal: i18n-mate is a web application for centralized management of i18n translations for frontend projects. The MVP provides a unified process for creating and maintaining translation keys, separation of translations from code, fast translation using an LLM, and export in a ready-to-use format.

MVP scope:

- Authorization and authentication: registration, login, logout, email verification, password reset.
- Projects: create, edit/update, delete; immutable default project language; immutable 2–4 character key prefix.
- Languages: adding to a project, **deleting**; **editing the label only**; BCP-47 validation and normalization.
- Keys and values: adding keys only in the default language, inline editing with autosave, 250-character limit, no multiline, empty values mean missing **(does not apply to the default language — there the value cannot be empty)**.
- LLM translations (OpenRouter): translate all/selected/single key; confirmation warning and a modal with progress information; **the target language cannot be the project's default language**.
- Export: ZIP with {locale}.json files (dotted keys, i18next-friendly), stable sorting, UTF-8/LF.

Definitions:

- **Project:** a logical container for translations. Each project has an immutable default language and a **2–4 character prefix unique within the user scope**.
- **Locale:** an identifier compliant with the BCP-47 standard (e.g., en, en-US, pl). **The MVP applies normalization only for the locale/region pair**: locale lowercase and REGION UPPERCASE. **Other sub-tags (script/variant/extension) are rejected.**
- **Key:** `full key = prefix + "." + name`; the prefix cannot end with a dot, and the name cannot start with a dot; format `[a-z0-9._-]`, no spaces, **no consecutive dots ("..")**, no trailing dot, maximum 256 characters. **The full key is unique within the project.** **A dot is allowed inside the prefix** (not at the end).
  - **Prefix Examples:** `app`, `ui`, `web`, `api` (recommended); `app.v2` (allowed but may cause ambiguity - use sparingly)
  - **Rationale for dots in prefix:** Allows versioned or namespaced prefixes (e.g., `v2.home.title`), but developers should prefer simple prefixes to avoid confusion with dotted key notation.
  - **Consecutive Dots Examples:**
    - ✅ Valid: `app.home.title`, `app.v2.home`, `ui.button.label`
    - ❌ Invalid: `app..home`, `app.home..title`, `app...home`, `ui.button..label`
    - ❌ Invalid: `app.home.` (trailing dot), `app.` (prefix ending with dot)
- **Translation value:** text up to 250 characters, with no newline characters. NULL value means missing **(with the exception of the default language — there the value cannot be NULL)**. Empty strings are automatically converted to NULL by database trigger.
- **LLM translation process:** select the scope (a single key, selected keys, all keys), confirm the overwrite warning, and a modal presenting the translation progress, after which a toast with the result appears. **The target language cannot be the project's default language.**

Dependencies and integrations:

- OpenRouter.ai as the LLM provider; model and parameters in .env.
- Email mechanism for verification and password reset.
- No external API for fetching translations (only ZIP export from the UI).

User assumptions: no roles in the MVP; the target user is a frontend developer managing i18n in applications.

## 2. User Problem

- Lack of standardization in translation management in frontend teams leads to data fragmentation and errors.
- Translations in code hinder iteration, work sharing, and consistency maintenance.
- The need for fast translation of existing keys into multiple languages without leaving the tool and without complex integrations.
- A simple export to a format compatible with i18next is required, which can be immediately plugged into the application pipeline.

## 3. Functional Requirements

### 3.1 Authorization and Authentication

- Account registration, login, logout.
- **Registration control:** Access to registration functionality is controlled by the `VITE_REGISTRATION_ENABLED` environment variable. When set to `false`, registration is disabled, the registration page is inaccessible, and related UI elements (registration links, buttons) are hidden.
- **Email verification is required before obtaining a session.** Until verification, the user **does not have an active session** and sees **public screens** informing about the need for verification and allowing **resending the email**.
- Password reset via email.
- **Application features** are available only to **logged-in and verified** users.

### 3.2 Projects

- Create a project with a name, description, **an immutable 2–4 character prefix (unique within the user scope)** and an immutable default language.
- Edit/update the project's name/description (without changing the prefix or the default language).
- Delete a project (irreversible).
- **After creating a project, navigate to the project's key list.**
- Project list: **columns: name, default language, number of languages, number of keys**; rows sorted ascending by name, pagination 50/page.

**[Implementation Details →](./api/plans/1-projects-implementation-plan.md)**

### 3.3 Languages

- **Add/delete languages assigned to the project; edit the label only.**
- **BCP-47 validation for locale codes using subset format (ll or ll-CC) with normalization to locale lowercase / REGION UPPERCASE. Other sub-tags (script/variant/extension) are rejected.**
- Keys **are created only in the default language and are automatically mirrored 1:1 to all locales via database triggers (fan-out mechanism) — see 3.4.**
- Language list: normalized locale and label in the row, default language mark, and edit/delete actions consistent with the constraints (cannot delete the default language).
- **Navigation:** clicking a language navigates to the **key view for the selected language** (details in 3.4).

**[Implementation Details →](./api/plans/2-locales-implementation-plan.md)**

### 3.4 Keys and Translation Values

- Add keys only in the default language; one at a time; no import and no rename.
- Key format and validation: `[a-z0-9._-]`, no spaces, **no consecutive dots ("..") anywhere in the key**, no trailing dot, maximum 256 characters; the key includes the project's prefix.
- **Uniqueness:** the full key (prefix + "." + name) is unique within the project.
- Delete a key only in the default language; cascades to delete values in all languages; the operation is irreversible; it is possible to immediately reuse the same name.
- Values: limit of 250 characters, no newline, NULL = missing **(in the default language the value cannot be NULL)**; empty strings are automatically converted to NULL by database trigger; inline editing with autosave; character counter.
- **Key list view modes:**
  - **Default view (default language):** the list shows keys with the prefix and **values in the default language**; each row shows the **missing** status for other languages.
  - **Per-language view:** after selecting a language in 3.3, the list shows keys with the prefix and **values in the selected language**; the **"missing" filter applies to the selected language**; search and sorting work the same as in the default view; inline editing and metadata as in 3.5.
- Key list: rows sorted ascending by key, pagination 50/page, missing filter and a search over the key (**contains, case-insensitive in the MVP — in practice no effect, because keys are lowercase**).

**[Implementation Details →](./api/plans/3-keys-implementation-plan.md)**

### 3.5 Translations Using an LLM

- Actions: translate all/selected/single into **a specified project language (other than the default language)**.
- Overwrite existing values after a warning and acceptance.
- After confirmation, a modal opens with a progress bar and information about the ongoing translation.
- Completion of the translation is confirmed by a success toast; errors result in an error toast.
- **Metadata for each value (after save):**
  - **LLM:** `is_machine_translated=true`, `updated_at` auto-updated by database trigger, `updated_source=system`, `updated_by_user_id=null`.
  - **Manual edit (any language, including default):** `is_machine_translated=false`, `updated_at` auto-updated by database trigger, `updated_source=user`, `updated_by_user_id=<user_id>`.

**[Implementation Details →](./api/plans/4-translations-implementation-plan.md)**

- **Note:** The `updated_at` field is automatically set by the database trigger `update_translations_updated_at` on any UPDATE operation, ensuring accurate timestamps without application-level logic.

### 3.6 Translation Export

- ZIP contains {locale}.json files (flat, dotted keys), stably sorted, UTF-8/LF.
- Export from the UI for the selected project; no external API.
- **Languages removed from the project are not included in the ZIP (no corresponding `{locale}.json` file).**

**[Implementation Details →](./api/plans/6-export-translations-implementation-plan.md)**

### 3.7 Non-functional Requirements

- Performance: average autosave time below 1 s.
- Security: **session only after email verification**; no roles in the MVP.
- Resilience: proper handling of 429/5xx errors from OpenRouter, toast messages for success or error.

## 4. Product Boundaries

In the MVP scope:

- Auth (registration, login, logout, email verification, password reset).
- CRUD for project, languages, keys (with the given constraints) plus LLM translate and ZIP export.

Out of MVP scope:

- No roles and permissions (a single user can do everything).
- No external API for accessing translations (UI-only ZIP export).
- No import of translation files.
- No cost counting or token number validation.
- **There is no "organization" entity in the MVP.**

Assumptions:

- The key prefix (2–4 characters) is unique within the user scope and immutable.
- Each project has one, immutable default language.
- Keys are created only in the default language and are automatically mirrored 1:1 in all project languages via database triggers (fan-out mechanism) - no local per-language keys.
- Value semantics: "missing" = NULL value; in the default language the value cannot be NULL (empty strings are auto-converted to NULL).
- Locale normalization limited to the locale/region pair: locale lowercase, REGION UPPERCASE; other sub-tags (script/variant/extension) are rejected.
- The target language for LLM translation cannot be the project's default language.
- Export available only from the UI; no external API; removed languages do not appear in the ZIP.
- Save metadata is a global rule: LLM → is_machine_translated=true, updated_source=system, updated_by_user_id=null, updated_at set; manual edit → `is_machine_translated=false`, `updated_source=user`, `updated_by_user_id=<user_id>`, `updated_at` set.
- Access condition: a session is created only after email verification (no session before verification).
- Registration access control: Registration functionality can be disabled via `VITE_REGISTRATION_ENABLED=false`, making the registration page inaccessible and hiding related UI elements.

## 5. Functional Requirements (User Stories)

### Feature: Authorization and Authentication

**Description:** User account management including registration, login, email verification, and password reset functionality.

**[User Stories Details →](./user-stories/1-auth-user-stories.md)**

### Feature: Projects

**Description:** CRUD operations for managing translation projects with unique prefixes and default languages.

**[User Stories Details →](./user-stories/2-projects-user-stories.md)**

### Feature: Languages/Locales

**Description:** BCP-47 compliant language management with normalization and per-language key views.

**[User Stories Details →](./user-stories/3-locales-user-stories.md)**

### Feature: Keys and Translation Values

**Description:** Key management in default language with automatic fan-out, inline editing with autosave, and value constraints.

**[User Stories Details →](./user-stories/4-keys-user-stories.md)**

### Feature: LLM Translations

**Description:** AI-powered translation using OpenRouter with progress tracking and error handling.

**[User Stories Details →](./user-stories/5-translations-user-stories.md)**

### Feature: Translation Export

**Description:** ZIP export functionality for i18next-compatible JSON files with missing value handling.

**[User Stories Details →](./user-stories/6-export-user-stories.md)**

## 6. Success Metrics

- KPI: percentage of projects with at least 2 languages after 7 days from project creation **(events: project_created, language_added, key_created, translation_completed; cohorting by project date)**.
- KPI: number of keys per language after 7 days from project creation **(events: project_created, language_added, key_created, translation_completed; cohorting by project date)**.
- KPI: percentage of translations using the LLM after 7 days from project creation **(events: project_created, language_added, key_created, translation_completed; cohorting by project date)**.
- Operational: LLM translation effectiveness (success rate, average time), number of keys/exports, API errors (429/5xx), average autosave time.
- **Finding:** the `translation_completed` event is logged for all modes: "all", "selected", "single key".
- **Data source:** events are stored in the **application's internal telemetry**; no external analytics API.
- **Event Collection:** Telemetry events are emitted via database triggers immediately after entity creation/modification (e.g., `emit_key_created_event_trigger` on keys insert). This ensures atomic event capture and eliminates the need for application-level event tracking.

**[Implementation Details →](./api/plans/7-telemetry-implementation-plan.md)**
