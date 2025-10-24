ID: US-020\
Title: Add a language to a project\
Description: As a user, I want to add a language compliant with BCP-47.\
Acceptance criteria:

- **Validation only for the locale/region pair and normalization: locale lowercase / REGION UPPERCASE; other sub-tags (script/variant/extension) are rejected.**
- Duplicates within the project are blocked with a message.
- After adding, all keys appear as missing (automatically created via database triggers with NULL values).
- **Reference:** 3.3

ID: US-021\
Title: Update a language\
Description: As a user, I want to update the language **label**.\
Acceptance criteria:

- Changing the label does not affect translation values.
- **Reference:** 3.3

ID: US-022\
Title: Delete a language\
Description: As a user, I want to remove a language from the project.\
Acceptance criteria:

- The default language cannot be removed.
- The operation requires confirmation and is irreversible.
- **Reference:** 3.3, 3.6

ID: US-023\
Title: Language list\
Description: As a user, I want to see a list of languages assigned to the project.\
Acceptance criteria:

- The row shows the normalized BCP-47 identifier and the language label.
- The default language is marked and has no delete action available.
- Edit and delete actions are available for other languages.
- **Reference:** 3.3

ID: US-024\
Title: Enter the key view for a selected language\
Description: As a user, I want to select a language from the language list and navigate to the key list for that language.\
Acceptance criteria:

- Clicking a language in the list (3.3) opens the **per-language key view** (3.4).
- Navigation back to the language list is available (e.g., breadcrumb/"Back" — according to the app's UX).
- **Reference:** 3.3, 3.4

ID: US-025\
Title: Per-language key view — editing and filtering\
Description: As a user, I want to browse and edit translation values in the selected language with a "missing" filter.\
Acceptance criteria:

- The list shows the full key and **the value in the selected language**.
- **The "missing" filter applies to the selected language**; search "contains, case-insensitive"; ascending sort by key; pagination 50/page.
- Inline editing works like in US-033; save metadata as per 3.5.
- **Reference:** 3.4, 3.5

ID: US-090\
Title: Locale normalization (global rule)\
Description: As a user, I want consistent language identifiers.\
Acceptance criteria:

- **Across the entire application** normalization applies: locale lowercase / REGION UPPERCASE; **only locale/region sub-tags (script/variant/extension) are allowed**; other attempts are rejected according to validation.
- **Reference:** 3.3
