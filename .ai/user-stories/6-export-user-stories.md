ID: US-050\
Title: ZIP export of all translations\
Description: As a user, I want to download a ZIP with {locale}.json for the selected project.\
Acceptance criteria:

- {locale}.json files contain dotted keys, stably sorted, UTF-8/LF.
- **Reference:** 3.6

ID: US-051\
Title: Export with missing values\
Description: As a user, I want missing values to be included as empty strings.\
Acceptance criteria:

- Missing in {locale}.json files represented as "".
- **Reference:** 3.6
