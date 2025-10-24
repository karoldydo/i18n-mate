ID: US-029\
Title: Key list\
Description: As a user, I want to browse the list of keys in the project.\
Acceptance criteria:

- The list shows keys with the project prefix and values in the default language.
- Each row shows the status of missing values in other languages (missing = empty string).
- Pagination 50/page, ascending sort by key, missing filter and a search by key.
- **Reference:** 3.4

ID: US-030\
Title: Add a key in the default language\
Description: As a user, I want to add a new key and value in the default language.\
Acceptance criteria:

- Validation of key format and uniqueness; **the full key is unique within the project**; it includes the project prefix.
- **Disallow consecutive dots (`..`) anywhere in the key and trailing dots.**
- **Maximum key length: 256 characters.**
- Value up to 250 characters, no newline; **NULL not allowed in the default language** (empty strings are auto-converted to NULL).
- After adding, the key exists in all languages (missing outside the default) - database triggers automatically create NULL translations for all locales.
- **Reference:** 3.4

ID: US-031\
Title: Edit a value in the default language\
Description: As a user, I want to edit a key's value in the default language with autosave.\
Acceptance criteria:

- Autosave; visible "saved" indicator.
- Saving updates the metadata `updated_at` and `updated_source=user`, `updated_by_user_id=<user_id>` and sets `is_machine_translated=false`.
- **Reference:** 3.4, 3.5

ID: US-032\
Title: Delete a key (cascading)\
Description: As a user, I want to delete a key in the default language, which cascades to delete values in other languages.\
Acceptance criteria:

- Type-to-confirm modal with a summary of the effects.
- After deletion, it is possible to immediately reuse the same key name.
- **Reference:** 3.4

ID: US-033\
Title: Edit a value in a non-default language\
Description: As a user, I want to edit translation values for added languages.\
Acceptance criteria:

- Limit of 250 characters, no newline, NULL = missing (empty strings are auto-converted to NULL).
- Autosave and metadata update; **set `is_machine_translated=false`, `updated_source=user`, `updated_by_user_id=<user_id>`.**
- **Reference:** 3.4, 3.5

ID: US-034\
Title: Missing filter\
Description: As a user, I want to filter the list by missing values in the selected language.\
Acceptance criteria:

- Enabling the filter shows only keys with a NULL value.
- **Reference:** 3.4

ID: US-035\
Title: Search by key\
Description: As a user, I want to search for keys by a fragment of the name.\
Acceptance criteria:

- Semantics of contains, case-insensitive in the MVP **(in practice no effect, because keys are lowercase)**.
- Search works together with the missing filter.
- **Reference:** 3.4

ID: US-036\
Title: Pagination and sorting\
Description: As a user, I want to browse the key list paginated by 50 and sorted ascending by key.\
Acceptance criteria:

- Fixed number of 50 items per page; stable sorting.
- **Reference:** 3.4
