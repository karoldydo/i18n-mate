# Registration View

- **View Path**: `/register`
- **Main Purpose**: Allow new users to create an account in the system
- **Key Information to Display**: Registration form with email and password fields, login link, validation error messages
- **Key View Components**: FormDialog with react-hook-form and Zod, action buttons, navigation links
- **UX, Accessibility and Security Considerations**:
  - UX: Simple form with immediate validation, redirect to email verification on success
  - Accessibility: ARIA labels, aria-invalid for errors, focus management, keyboard support
  - Security: Client and server-side email/password validation, no access to other views without verification
