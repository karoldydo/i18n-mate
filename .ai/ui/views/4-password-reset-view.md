# Password Reset View

- **View Path**: `/reset-password`
- **Main Purpose**: Allow users to reset their forgotten password
- **Key Information to Display**: Email form to send reset link, instructions
- **Key View Components**: FormDialog with single email field
- **UX, Accessibility and Security Considerations**:
  - UX: Simple process with email sending confirmation
  - Accessibility: ARIA labels, focus management
  - Security: One-time reset tokens with short lifespan
