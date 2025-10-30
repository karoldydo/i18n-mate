# Authentication Module - UI Components

This module contains UI components and pages for the authentication flow according to `.ai/auth-spec.md`.

## Structure

```
src/features/auth/
├── api/
│   └── auth.schemas.ts          # Zod validation schemas for auth forms
├── components/
│   ├── forms/
│   │   ├── LoginForm.tsx        # Login form with email/password
│   │   ├── RegisterForm.tsx     # Registration form with password confirmation
│   │   ├── ForgotPasswordForm.tsx  # Password reset request form
│   │   └── ResetPasswordForm.tsx   # New password form
│   ├── layouts/
│   │   └── AuthLayout.tsx       # Centered layout for auth pages
│   └── common/
│       └── EmailVerificationScreen.tsx  # Email verification UI with resend
├── routes/
│   ├── LoginPage.tsx            # /login route
│   ├── RegisterPage.tsx         # /register route (conditional)
│   ├── ForgotPasswordPage.tsx   # /forgot-password route
│   ├── ResetPasswordPage.tsx    # /reset-password route
│   └── VerifyEmailPage.tsx      # /verify-email route
└── index.ts                     # Public exports
```

## Components

### Forms

All forms are controlled components using `react-hook-form` with Zod validation:

- **LoginForm**: Email and password fields, links to forgot password and registration
- **RegisterForm**: Email, password, and confirm password with validation
- **ForgotPasswordForm**: Email input for password reset request
- **ResetPasswordForm**: New password and confirmation for password reset

### Layouts

- **AuthLayout**: Responsive container (max 400px) with app branding and neutral gradient background

### Common

- **EmailVerificationScreen**: Post-registration screen with resend functionality

## Pages

All pages use `AuthLayout` and are ready for integration with auth API:

- **LoginPage**: `/login` - Main login page
- **RegisterPage**: `/register` - Registration (conditional based on `VITE_REGISTRATION_ENABLED`)
- **ForgotPasswordPage**: `/forgot-password` - Password reset request
- **ResetPasswordPage**: `/reset-password` - Set new password (with token from email)
- **VerifyEmailPage**: `/verify-email` - Email verification instructions

## Validation

Validation schemas are defined in `api/auth.schemas.ts` using Zod:

- Email: RFC 5322 format, max 320 characters
- Password: 8-128 characters, at least one letter and one digit
- Password confirmation: Must match password field

All validation constants are centralized in `@/shared/constants/auth.constants.ts`.

## Environment Variables

- `VITE_REGISTRATION_ENABLED`: Controls access to registration (default: true)

## Integration Status

✅ **Completed:**

- All UI components and forms
- Page layouts and routing components
- Form validation schemas
- Constants and error messages

⏳ **Pending (not implemented):**

- Authentication state management (AuthContext, useAuth hook)
- API integration (TanStack Query hooks)
- Route guards (AuthGuard, ProtectedLayout)
- Error handling and error boundaries
- Integration with Supabase Auth
- Toast notifications for auth actions

## Usage

```tsx
import { LoginPage, RegisterPage, AuthLayout, LoginForm } from '@/features/auth';

// Use in routes configuration
const routes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  // ... other routes
];
```

## Next Steps

1. Implement auth state management (`AuthContext`, `AuthProvider`)
2. Create TanStack Query hooks for auth operations
3. Integrate with Supabase Auth
4. Add route guards and protected routes
5. Implement error handling with proper user feedback
6. Add unit tests for components and forms
