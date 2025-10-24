ID: US-010\
Title: Create a project\
Description: As a user, I want to create a project with a name, a 2–4 character prefix, and a default language.\
Acceptance criteria:

- Prefix `[a-z0-9._-]`, 2–4 characters; **unique within the user scope**; **does not end with a dot**.
- Default language is set on creation and is immutable thereafter.
- **After creation, navigate to the project's key list.**
- **Reference:** 3.2

ID: US-011\
Title: Edit a project\
Description: As a user, I want to change the project's name/description.\
Acceptance criteria:

- You can update the name/description; you cannot change the prefix or the default language.
- **Reference:** 3.2

ID: US-012\
Title: Delete a project\
Description: As a user, I want to delete a project along with its translations.\
Acceptance criteria:

- The operation is irreversible and requires confirmation.
- **Reference:** 3.2

ID: US-013\
Title: Project list\
Description: As a user, I want to see a list of projects with basic information.\
Acceptance criteria:

- **Columns and behavior as per 3.2.**
- **Pagination 50/page, sorting ascending by name.**
- **Reference:** 3.2
