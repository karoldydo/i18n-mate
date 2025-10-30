# Authentication Module Architecture Specification - i18n-mate

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Routing Structure and Pages

#### Unauthenticated Mode (Public Routes)

- `/login` - login page
- `/register` - registration page
- `/verify-email` - email verification page with confirmation link
- `/resend-verification` - resend verification page
- `/forgot-password` - password reset page
- `/reset-password` - set new password page with token

#### Authenticated Mode (Protected Routes)

- All existing application routes (`/projects/*`, `/projects/:id/*`, etc.) - available only for verified users

#### Layouts and Components

##### AuthLayout

- Component wrapping all authentication pages
- Responsive layout with maximum width of 400px centered on screen
- Application logo at the top
- Neutral background with subtle gradient
- No navigation in auth mode

##### ProtectedLayout

- Component wrapping all protected application pages
- Contains main navigation, sidebar and content area
- Header with user information and logout button
- Automatic redirect to `/login` for unauthenticated users

### 1.2 Form Components

#### LoginForm

- Fields: email, password
- Button: "Log in"
- Link: "Forgot password?"
- Link: "Don't have an account? Sign up"
- Validation: email format, password required
- Error handling: invalid credentials, unverified email

#### RegisterForm

- Fields: email, password, confirm password
- Button: "Sign up"
- Link: "Already have an account? Log in"
- Validation: email format, password min. 8 characters, passwords match
- Error handling: email already exists, invalid data

#### EmailVerificationScreen

- Component displayed after registration
- Message about sent verification email
- Button: "Send again"
- Link to return to login
- State handling: sending, success, error

#### ForgotPasswordForm

- Field: email
- Button: "Send reset link"
- Link to return to login
- Validation: email format
- Error handling: email doesn't exist (without revealing)

#### ResetPasswordForm

- Fields: new password, confirm password
- Button: "Set new password"
- Validation: password min. 8 characters, passwords match
- Error handling: invalid/expired token

### 1.3 Common Components

#### AuthGuard

- HOC component checking authentication state
- Redirects to `/login` if user is not logged in
- Redirects to `/verify-email` if email is unverified
- Loading state during session check

#### UserMenu

- Dropdown in header for authenticated users
- Displays user email
- Button: "Log out"

#### AuthErrorBoundary

- Component extending existing ErrorBoundary from shared/components
- Combines rendering error handling with TanStack Query error reset (according to app pattern)
- Displays friendly authentication error messages
- Retry button with option to return to login

### 1.4 Application State and Navigation

#### Auth State Management

- React Context (`AuthContext`) with provider (`AuthProvider`) for global authentication state
- Custom hook `useAuth` exposing necessary data and authentication methods
- Integration with Supabase Auth session listener
- Automatic redirects based on verification state
- Session persistence between page refreshes

#### Navigation Guards

- Route-level guards checking access
- Automatic redirects after actions (login → dashboard, logout → login)
- Preservation of intended route during redirects

### 1.5 Validation and Error Messages

#### Form Validation

- Zod schemas for all forms
- Real-time validation with error messages
- Accessibility: aria-invalid, aria-describedby
- Visual cues: colors, icons

#### Error Messages

- Localized error messages
- Error categorization: validation (form field errors), network (connection issues, timeouts, server errors), authentication (login, verification errors)
- Toast notifications for asynchronous actions
- Inline errors for form fields

## 2. BACKEND LOGIC

### 2.1 API Endpoints

#### Authentication Endpoints (Supabase Auth + TanStack Query)

- `POST /auth/signup` - user registration
- `POST /auth/signin` - user login
- `POST /auth/signout` - user logout
- `POST /auth/resend-verification` - resend verification
- `POST /auth/reset-password` - password reset
- `POST /auth/verify-email` - email verification (link handling)

### 2.2 Data Models

#### User Model (Supabase Auth)

```typescript
interface User {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

#### Auth Session Model

```typescript
interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}
```

#### Auth Error Model

Uses existing `ApiErrorResponse` type from `src/shared/types/types.ts`:

```typescript
interface ApiErrorResponse {
  data: null;
  error: {
    code: number;
    details?: Record<string, unknown>;
    message: string;
  };
}
```

During implementation, authentication-specific types will be added in `src/shared/types/auth/` according to the application pattern.

### 2.3 Input Data Validation

#### Email Validation

- RFC 5322 format
- Maximum length: 320 characters
- Case-insensitive comparisons
- Normalization: trim, lowercase

#### Password Validation

- Minimum length: 8 characters
- Required: at least one letter, one digit
- Maximum length: 128 characters
- Dictionary password blocking

### 2.4 Exception Handling

#### Authentication Errors

Error handling according to application pattern (see `src/features/projects/api/projects.errors.ts`):

- **InvalidCredentials**: invalid login credentials (mapped to code 401)
- **EmailNotConfirmed**: email unverified (mapped to code 403)
- **UserAlreadyExists**: user already exists (mapped to code 409)
- **TokenExpired**: token expired (mapped to code 401)
- **RateLimitExceeded**: too many attempts (mapped to code 429)

#### Network Errors

- **ConnectionError**: no connection (network issues)
- **TimeoutError**: timeout exceeded
- **ServerError**: server error (5xx)

#### Error Handling Strategy

According to application pattern:

- `createDatabaseErrorResponse()` function parsing structured PostgreSQL errors
- Mapping Supabase errors to standard `ApiErrorResponse`
- Error handling based on error code from DETAIL field (format: `error_code:ERROR_NAME,field:field_name`)
- Centralized error handler in `auth.errors.ts`
- Retry logic for network errors using TanStack Query
- User-friendly error messages from `auth.constants.ts`

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Integration

#### Supabase Client Configuration

- URL and anon key from environment variables
- Session persistence: localStorage
- Auto-refresh tokens
- Event listeners for session changes

#### Auth State Management

- React Context for global authentication state
- TanStack Query for user data caching
- Optimistic updates for authentication actions

### 3.2 Authentication Flows

#### Registration Flow

1. User fills RegisterForm
2. Client-side validation
3. Call `supabase.auth.signUp()`
4. Send verification email
5. Redirect to EmailVerificationScreen
6. User clicks email link
7. Token verification by Supabase
8. Redirect to login with success message

#### Login Flow

1. User fills LoginForm
2. Client-side validation
3. Call `supabase.auth.signInWithPassword()`
4. Check if email is verified
5. Create session and redirect to application
6. Or redirect to verification if email unverified

#### Password Reset Flow

1. User fills ForgotPasswordForm
2. Send email with reset link
3. User clicks link and gets redirected to ResetPasswordForm
4. User sets new password
5. Token verification and password update
6. Redirect to login with success message

### 3.3 Security Measures

#### Session Security

- HTTP-only cookies for sensitive data
- Token rotation on each request
- Automatic logout on session expiration
- CSRF protection

### 3.4 Email Templates

#### Verification Email

- Subject: "Confirm your email address - i18n-mate"
- Content: verification link, instructions, branding
- HTML + plain text version

#### Password Reset Email

- Subject: "Password reset - i18n-mate"
- Content: reset link, security instructions
- HTML + plain text version
- Link valid for 1 hour

## 4. INTEGRATION WITH EXISTING APPLICATION

### 4.1 Feature Structure

```markdown
src/features/auth/
├── api/
│ ├── auth.errors.ts
│ ├── auth.schemas.ts
│ ├── useLogin/
│ ├── useRegister/
│ ├── useLogout/
│ ├── useResetPassword/
│ └── useVerifyEmail/
├── components/
│ ├── forms/
│ │ ├── LoginForm.tsx
│ │ ├── RegisterForm.tsx
│ │ ├── ForgotPasswordForm.tsx
│ │ └── ResetPasswordForm.tsx
│ ├── layouts/
│ │ ├── AuthLayout.tsx
│ │ └── ProtectedLayout.tsx
│ ├── guards/
│ │ └── AuthGuard.tsx
│ └── common/
│ ├── UserMenu.tsx
│ └── AuthErrorBoundary.tsx
├── hooks/
│ ├── useAuth.ts
│ └── useAuthState.ts
├── routes/
│ ├── LoginPage.tsx
│ ├── RegisterPage.tsx
│ ├── VerifyEmailPage.tsx
│ ├── ForgotPasswordPage.tsx
│ └── ResetPasswordPage.tsx
```

Authentication constants will be added to `src/shared/constants/auth.constants.ts` according to application pattern (see `src/shared/constants/index.ts`).

### 4.2 Routing Integration

- Update `src/app/routes.ts` with new authentication routes
- Add AuthGuard to existing protected routes
- Lazy loading for all authentication pages

### 4.3 State Management Integration

- Add AuthProvider to App.tsx
- Integration with existing QueryClient
- Make auth context available to all components

### 4.4 UI/UX Consistency

- Use existing Shadcn/ui components
- Maintain application design system
- Accessibility compliance matching existing standards

## 5. IMPLEMENTATION ASSUMPTIONS

### 5.1 Technical Requirements

- React 19 with hooks and concurrent features
- TypeScript 5 with strict mode
- Supabase Auth v2
- TanStack Query v5
- Zod for validation

### 5.2 Performance Considerations

- Lazy loading for all authentication components
- Minimal bundle size impact
- Efficient re-renders with useMemo/useCallback

### 5.3 Testing Strategy

- Unit tests for all hooks and utilities
- E2E tests for critical flows (login, register, reset password)
- Supabase Auth mocking for tests
