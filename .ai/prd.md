# Product Requirements Document (PRD) - i18n-mate

## 1. Product Overview

Goal: i18n-mate is a web application for centralized management of i18n translations for frontend projects. The MVP provides a unified process for creating and maintaining translation keys, separation of translations from code, fast translation using an LLM, and export in a ready-to-use format.

MVP scope:

- Authorization and authentication: registration, login, logout, email verification, password reset.
- Projects: create, edit/update, delete; immutable default project language; immutable 2–4 character key prefix.
- Languages: adding to a project, **deleting**; **editing the label only**; BCP-47 validation and normalization.
- Keys and values: adding keys only in the default language, inline editing with autosave, 250-character limit, no multiline, empty values mean missing **(does not apply to the default language — there the value cannot be empty)**.
- LLM translations (OpenRouter): translate all/selected/single key; confirmation warning and a modal with progress information; **the target language cannot be the project's default language**.
- Export: ZIP with {lang}.json files (dotted keys, i18next-friendly), stable sorting, UTF-8/LF.

Definitions:

- **Project:** a logical container for translations. Each project has an immutable default language and a **2–4 character prefix unique within the user scope**.
- **Language (locale):** an identifier compliant with the BCP-47 standard (e.g., en, en-US, pl). **The MVP applies normalization only for the language/region pair**: language lowercase and REGION UPPERCASE. **Other sub-tags (script/variant/extension) are rejected.**
- **Key:** `full key = prefix + "." + name`; the prefix cannot end with a dot, and the name cannot start with a dot; format `[a-z0-9._-]`, no spaces, **no consecutive dots ("..")**, no trailing dot, maximum 256 characters. **The full key is unique within the project.** **A dot is allowed inside the prefix** (not at the end).
  - **Prefix Examples:** `app`, `ui`, `web`, `api` (recommended); `app.v2` (allowed but may cause ambiguity - use sparingly)
  - **Rationale for dots in prefix:** Allows versioned or namespaced prefixes (e.g., `v2.home.title`), but developers should prefer simple prefixes to avoid confusion with dotted key notation.
- **Translation value:** text up to 250 characters, with no newline characters. Lack of a value means missing **(with the exception of the default language — there the value cannot be empty)**.
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
- **Email verification is required before obtaining a session.** Until verification, the user **does not have an active session** and sees **public screens** informing about the need for verification and allowing **resending the email**.
- Password reset via email.
- **Application features** are available only to **logged-in and verified** users.

### 3.2 Projects

- Create a project with a name, description, **an immutable 2–4 character prefix (unique within the user scope)** and an immutable default language.
- Edit/update the project's name/description (without changing the prefix or the default language).
- Delete a project (irreversible).
- **After creating a project, navigate to the project's key list.**
- Project list: **columns: name, default language, number of languages, number of keys**; rows sorted ascending by name, pagination 50/page.

### 3.3 Languages

- **Add/delete languages assigned to the project; edit the label only.**
- **BCP-47 validation for the language/region pair and normalization to language lowercase / REGION UPPERCASE. Other sub-tags (script/variant/extension) are rejected.**
- Keys **are created only in the default language and are mirrored 1:1 — see 3.4.**
- Language list: normalized locale and label in the row, default language mark, and edit/delete actions consistent with the constraints (cannot delete the default language).
- **Navigation:** clicking a language navigates to the **key view for the selected language** (details in 3.4).

### 3.4 Keys and Translation Values

- Add keys only in the default language; one at a time; no import and no rename.
- Key format and validation: `[a-z0-9._-]`, no spaces, **no double dots (".."), no trailing dot**, maximum 256 characters; the key includes the project's prefix.
- **Uniqueness:** the full key (prefix + "." + name) is unique within the project.
- Delete a key only in the default language; cascades to delete values in all languages; the operation is irreversible; it is possible to immediately reuse the same name.
- Values: limit of 250 characters, no newline, empty = missing **(in the default language the value cannot be empty)**; inline editing with autosave; character counter.
- **Key list view modes:**
  - **Default view (default language):** the list shows keys with the prefix and **values in the default language**; each row shows the **missing** status for other languages.
  - **Per-language view:** after selecting a language in 3.3, the list shows keys with the prefix and **values in the selected language**; the **"missing" filter applies to the selected language**; search and sorting work the same as in the default view; inline editing and metadata as in 3.5.
- Key list: rows sorted ascending by key, pagination 50/page, missing filter and a search over the key (**contains, case-insensitive in the MVP — in practice no effect, because keys are lowercase**).

### 3.5 Translations Using an LLM

- Actions: translate all/selected/single into **a specified project language (other than the default language)**.
- Overwrite existing values after a warning and acceptance.
- After confirmation, a modal opens with a progress bar and information about the ongoing translation.
- Completion of the translation is confirmed by a success toast; errors result in an error toast.
- **Metadata for each value (after save):**
  - **LLM:** `isMachineTranslated=true`, `updatedAt` auto-updated by database trigger, `updatedBy=system`.
  - **Manual edit (any language, including default):** `isMachineTranslated=false`, `updatedAt` auto-updated by database trigger, `updatedBy=<user>`.
  - **Note:** The `updatedAt` field is automatically set by the database trigger `update_translations_updated_at` on any UPDATE operation, ensuring accurate timestamps without application-level logic.

### 3.6 Translation Export

- ZIP contains {lang}.json files (flat, dotted keys), stably sorted, UTF-8/LF.
- Export from the UI for the selected project; no external API.
- **Languages removed from the project are not included in the ZIP (no corresponding `{lang}.json` file).**

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
- Keys are created only in the default language and are mirrored 1:1 in all project languages (no local per-language keys).
- Value semantics: “missing” = empty string; in the default language the value cannot be empty.
- Locale normalization limited to the language/region pair: language lowercase, REGION UPPERCASE; other sub-tags (script/variant/extension) are rejected.
- The target language for LLM translation cannot be the project's default language.
- Export available only from the UI; no external API; removed languages do not appear in the ZIP.
- Save metadata is a global rule: LLM → isMachineTranslated=true, updatedBy=system, updatedAt set; manual edit → `isMachineTranslated=false`, `updatedBy=<user>`, `updatedAt` set.
- Access condition: a session is created only after email verification (no session before verification).

## 5. User Stories

**Section 5 convention:** full logic description in 3.X, and **US** contain concise acceptance criteria with references to the relevant paragraphs.

ID: US-001  
Title: Account registration  
Description: As a new user, I want to create an account to gain access to the application.  
Acceptance criteria:

- Providing a valid email and password creates an account and sends a verification email.
- An existing email returns a readable error without creating an account.
- Invalid email/password return validation messages.
- **Reference:** 3.1

ID: US-002  
Title: Email verification  
Description: As a user, I want to confirm my email so I can log in.  
Acceptance criteria:

- Clicking a valid link verifies the account and enables login.
- An expired/invalid link returns a message and allows resending the email.
- **No user session is created until verification.**
- **Reference:** 3.1

ID: US-003  
Title: Login  
Description: As a user, I want to log in to use the application.  
Acceptance criteria:

- Correct credentials **and a verified email** provide a session and access to the application.
- Incorrect credentials do not log in and return a message.
- **Reference:** 3.1

ID: US-004  
Title: Logout  
Description: As a user, I want to log out to end the session.  
Acceptance criteria:

- Logging out invalidates the session and redirects to the login screen.
- **Reference:** 3.1

ID: US-005  
Title: Password reset  
Description: As a user, I want to reset my password if I lose it.  
Acceptance criteria:

- Send a reset link to the provided email (if the account exists).
- The link allows setting a new password; an expired/invalid link returns an error.
- **Reference:** 3.1

ID: US-010  
Title: Create a project  
Description: As a user, I want to create a project with a name, a 2–4 character prefix, and a default language.  
Acceptance criteria:

- Prefix `[a-z0-9._-]`, 2–4 characters; **unique within the user scope**; **does not end with a dot**.
- Default language is set on creation and is immutable thereafter.
- **After creation, navigate to the project's key list.**
- **Reference:** 3.2

ID: US-011  
Title: Edit a project  
Description: As a user, I want to change the project's name/description.  
Acceptance criteria:

- You can update the name/description; you cannot change the prefix or the default language.
- **Reference:** 3.2

ID: US-012  
Title: Delete a project  
Description: As a user, I want to delete a project along with its translations.  
Acceptance criteria:

- The operation is irreversible and requires confirmation.
- **Reference:** 3.2

ID: US-013  
Title: Project list  
Description: As a user, I want to see a list of projects with basic information.  
Acceptance criteria:

- **Columns and behavior as per 3.2.**
- **Pagination 50/page, sorting ascending by name.**
- **Reference:** 3.2

ID: US-020  
Title: Add a language to a project  
Description: As a user, I want to add a language compliant with BCP-47.  
Acceptance criteria:

- **Validation only for the language/region pair and normalization: language lowercase / REGION UPPERCASE; other sub-tags (script/variant/extension) are rejected.**
- Duplicates within the project are blocked with a message.
- After adding, all keys appear as missing.
- **Reference:** 3.3

ID: US-021  
Title: Update a language  
Description: As a user, I want to update the language **label**.  
Acceptance criteria:

- Changing the label does not affect translation values.
- **Reference:** 3.3

ID: US-022  
Title: Delete a language  
Description: As a user, I want to remove a language from the project.  
Acceptance criteria:

- The default language cannot be removed.
- The operation requires confirmation and is irreversible.
- **Reference:** 3.3, 3.6

ID: US-023  
Title: Language list  
Description: As a user, I want to see a list of languages assigned to the project.  
Acceptance criteria:

- The row shows the normalized BCP-47 identifier and the language label.
- The default language is marked and has no delete action available.
- Edit and delete actions are available for other languages.
- **Reference:** 3.3

ID: US-024  
Title: Enter the key view for a selected language  
Description: As a user, I want to select a language from the language list and navigate to the key list for that language.  
Acceptance criteria:

- Clicking a language in the list (3.3) opens the **per-language key view** (3.4).
- Navigation back to the language list is available (e.g., breadcrumb/"Back" — according to the app's UX).
- **Reference:** 3.3, 3.4

ID: US-025  
Title: Per-language key view — editing and filtering  
Description: As a user, I want to browse and edit translation values in the selected language with a "missing" filter.  
Acceptance criteria:

- The list shows the full key and **the value in the selected language**.
- **The "missing" filter applies to the selected language**; search "contains, case-insensitive"; ascending sort by key; pagination 50/page.
- Inline editing works like in US-033; save metadata as per 3.5.
- **Reference:** 3.4, 3.5

ID: US-029  
Title: Key list  
Description: As a user, I want to browse the list of keys in the project.  
Acceptance criteria:

- The list shows keys with the project prefix and values in the default language.
- Each row shows the status of missing values in other languages (missing = empty string).
- Pagination 50/page, ascending sort by key, missing filter and a search by key.
- **Reference:** 3.4

ID: US-030  
Title: Add a key in the default language  
Description: As a user, I want to add a new key and value in the default language.  
Acceptance criteria:

- Validation of key format and uniqueness; **the full key is unique within the project**; it includes the project prefix.
- **Disallow `..` and a trailing dot in the key name.**
- **Maximum key length: 256 characters.**
- Value up to 250 characters, no newline; **empty not allowed in the default language**.
- After adding, the key exists in all languages (missing outside the default).
- **Reference:** 3.4

ID: US-031  
Title: Edit a value in the default language  
Description: As a user, I want to edit a key's value in the default language with autosave.  
Acceptance criteria:

- Autosave; visible "saved" indicator.
- Saving updates the metadata `updatedAt` and `updatedBy=<user>` and sets `isMachineTranslated=false`.
- **Reference:** 3.4, 3.5

ID: US-032  
Title: Delete a key (cascading)  
Description: As a user, I want to delete a key in the default language, which cascades to delete values in other languages.  
Acceptance criteria:

- Type-to-confirm modal with a summary of the effects.
- After deletion, it is possible to immediately reuse the same key name.
- **Reference:** 3.4

ID: US-033  
Title: Edit a value in a non-default language  
Description: As a user, I want to edit translation values for added languages.  
Acceptance criteria:

- Limit of 250 characters, no newline, empty = missing.
- Autosave and metadata update; **set `isMachineTranslated=false`, `updatedBy=<user>`.**
- **Reference:** 3.4, 3.5

ID: US-034  
Title: Missing filter  
Description: As a user, I want to filter the list by missing values in the selected language.  
Acceptance criteria:

- Enabling the filter shows only keys with an empty value.
- **Reference:** 3.4

ID: US-035  
Title: Search by key  
Description: As a user, I want to search for keys by a fragment of the name.  
Acceptance criteria:

- Semantics of contains, case-insensitive in the MVP **(in practice no effect, because keys are lowercase)**.
- Search works together with the missing filter.
- **Reference:** 3.4

ID: US-036  
Title: Pagination and sorting  
Description: As a user, I want to browse the key list paginated by 50 and sorted ascending by key.  
Acceptance criteria:

- Fixed number of 50 items per page; stable sorting.
- **Reference:** 3.4

ID: US-040  
Title: LLM translation — all keys  
Description: As a user, I want to translate all values from the default language into a selected language.  
Acceptance criteria:

- Overwrite warning for existing values and required acceptance.
- After confirmation, a modal opens with a progress bar and information about the ongoing translation.
- After completion, a success toast is displayed; results and metadata are saved: `isMachineTranslated=true`, `updatedBy=system`.
- **The target language cannot be the project's default language.**
- **Reference:** 3.5

ID: US-041  
Title: LLM translation — selected keys  
Description: As a user, I want to translate selected keys into a chosen language.  
Acceptance criteria:

- Select any set of keys; rules as in US-040 (metadata and prohibition of the default language as the target).
- **Reference:** 3.5

ID: US-042  
Title: LLM translation — a single key  
Description: As a user, I want to translate a single key directly from the list/editing.  
Acceptance criteria:

- Rules as in US-040; the result overwrites the existing value in the target language; metadata as in US-040.
- **The target language cannot be the project's default language.**
- **Reference:** 3.5

ID: US-050  
Title: ZIP export of all translations  
Description: As a user, I want to download a ZIP with {lang}.json for the selected project.  
Acceptance criteria:

- {lang}.json files contain dotted keys, stably sorted, UTF-8/LF.
- **Reference:** 3.6

ID: US-051  
Title: Export with missing values  
Description: As a user, I want missing values to be included as empty strings.  
Acceptance criteria:

- Missing in {lang}.json files represented as "".
- **Reference:** 3.6

ID: US-060  
Title: Login requirement and email verification  
Description: As a user, I want to have access to the application only after logging in and confirming my email.  
Acceptance criteria:

- A non-logged-in user sees the login screen.
- An unverified account does not obtain a session; a screen/message is visible with the action to resend the email.
- **Reference:** 3.1

ID: US-080  
Title: Resilience to OpenRouter errors  
Description: As a user, I want 429/5xx errors to be communicated with a readable toast so I know the translation failed.  
Acceptance criteria:

- Errors during translation return an error toast and do not save changes.
- **Reference:** 3.5, 3.7

ID: US-090  
Title: Locale normalization (global rule)  
Description: As a user, I want consistent language identifiers.  
Acceptance criteria:

- **Across the entire application** normalization applies: language lowercase / REGION UPPERCASE; **only language/region sub-tags (script/variant/extension) are allowed**; other attempts are rejected according to validation.
- **Reference:** 3.3

## 6. Success Metrics

- KPI: percentage of projects with at least 2 languages after 7 days from project creation **(events: project_created, language_added, key_created, translation_completed; cohorting by project date)**.
- KPI: number of keys per language after 7 days from project creation **(events: project_created, language_added, key_created, translation_completed; cohorting by project date)**.
- KPI: percentage of translations using the LLM after 7 days from project creation **(events: project_created, language_added, key_created, translation_completed; cohorting by project date)**.
- Operational: LLM translation effectiveness (success rate, average time), number of keys/exports, API errors (429/5xx), average autosave time.
- **Finding:** the `translation_completed` event is logged for all modes: "all", "selected", "single key".
- **Data source:** events are stored in the **application's internal telemetry**; no external analytics API.
- **Event Collection:** Telemetry events are emitted via database triggers immediately after entity creation/modification (e.g., `emit_key_created_event_trigger` on keys insert). This ensures atomic event capture and eliminates the need for application-level event tracking.
