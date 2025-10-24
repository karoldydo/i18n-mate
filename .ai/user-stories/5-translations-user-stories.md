ID: US-040\
Title: LLM translation — all keys\
Description: As a user, I want to translate all values from the default language into a selected language.\
Acceptance criteria:

- Overwrite warning for existing values and required acceptance.
- After confirmation, a modal opens with a progress bar and information about the ongoing translation.
- After completion, a success toast is displayed; results and metadata are saved: `is_machine_translated=true`, `updated_source=system`, `updated_by_user_id=null`.
- **The target language cannot be the project's default language.**
- **Reference:** 3.5

ID: US-041\
Title: LLM translation — selected keys\
Description: As a user, I want to translate selected keys into a chosen language.\
Acceptance criteria:

- Select any set of keys; rules as in US-040 (metadata and prohibition of the default language as the target).
- **Reference:** 3.5

ID: US-042\
Title: LLM translation — a single key\
Description: As a user, I want to translate a single key directly from the list/editing.\
Acceptance criteria:

- Rules as in US-040; the result overwrites the existing value in the target language; metadata as in US-040.
- **The target language cannot be the project's default language.**
- **Reference:** 3.5

ID: US-080\
Title: Resilience to OpenRouter errors\
Description: As a user, I want 429/5xx errors to be communicated with a readable toast so I know the translation failed.\
Acceptance criteria:

- Errors during translation return an error toast and do not save changes.
- **Reference:** 3.5, 3.7
