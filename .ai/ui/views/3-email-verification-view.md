# Email Verification View

- **View Path**: `/verify-email`
- **Main Purpose**: Confirm email address before gaining access to the application
- **Key Information to Display**: Verification instructions, resend email button, verification status
- **Key View Components**: Information dialog with action buttons, loading states, EmailVerificationScreen component
- **UX, Accessibility and Security Considerations**:
  - UX: Clear instructions, ability to resend email, automatic redirect after verification
  - Accessibility: Screen reader announcements, keyboard navigation
  - Security: One-time verification tokens, no application access without verification
- **Resend Functionality**:
  - Button shows loading state ("Sending...") during resend operation
  - Success/error alerts displayed after resend attempt
  - Accepts optional email parameter for flexibility

## Email Verified Success View

- **View Path**: `/email-verified`
- **Main Purpose**: Display success confirmation after email verification
- **Key Information to Display**: Success message, checkmark icon, redirect countdown
- **Key View Components**: EmailVerifiedPage component with success UI
- **UX Considerations**:
  - Shows success confirmation with visual checkmark icon
  - Automatically redirects to login page after 3 seconds
  - Clear messaging: "Your email address has been successfully verified"
