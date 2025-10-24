# Login View

- **View Path**: `/login`
- **Main Purpose**: Authenticate existing users with verified email
- **Key Information to Display**: Login form, registration link, password reset link, error messages
- **Key View Components**: FormDialog with react-hook-form, action buttons, navigation links
- **UX, Accessibility and Security Considerations**:
  - UX: Smooth transition to application after login, success toast after success
  - Accessibility: ARIA labels, aria-describedby for errors, focus trap in dialog
  - Security: Verified email requirement, JWT token management, redirect to verification for unverified accounts
