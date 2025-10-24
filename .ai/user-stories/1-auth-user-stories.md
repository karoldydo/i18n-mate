ID: US-001\
Title: Account registration\
Description: As a new user, I want to create an account to gain access to the application.\
Acceptance criteria:

- Providing a valid email and password creates an account and sends a verification email.
- An existing email returns a readable error without creating an account.
- Invalid email/password return validation messages.
- **Reference:** 3.1

ID: US-002\
Title: Email verification\
Description: As a user, I want to confirm my email so I can log in.\
Acceptance criteria:

- Clicking a valid link verifies the account and enables login.
- An expired/invalid link returns a message and allows resending the email.
- **No user session is created until verification.**
- **Reference:** 3.1

ID: US-003\
Title: Login\
Description: As a user, I want to log in to use the application.\
Acceptance criteria:

- Correct credentials **and a verified email** provide a session and access to the application.
- Incorrect credentials do not log in and return a message.
- **Reference:** 3.1

ID: US-004\
Title: Logout\
Description: As a user, I want to log out to end the session.\
Acceptance criteria:

- Logging out invalidates the session and redirects to the login screen.
- **Reference:** 3.1

ID: US-005
Title: Password reset\
Description: As a user, I want to reset my password if I lose it.\
Acceptance criteria:

- Send a reset link to the provided email (if the account exists).
- The link allows setting a new password; an expired/invalid link returns an error.
- **Reference:** 3.1

ID: US-060\
Title: Login requirement and email verification\
Description: As a user, I want to have access to the application only after logging in and confirming my email.\
Acceptance criteria:

- A non-logged-in user sees the login screen.
- An unverified account does not obtain a session; a screen/message is visible with the action to resend the email.
- **Reference:** 3.1
