# Authentication Module Architecture Specification - i18n-mate

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Routing Structure and Pages

#### Unauthenticated Mode (Public Routes)

- `/login` - login page
- `/register` - registration page (conditionally available based on `VITE_REGISTRATION_ENABLED` environment variable)
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
- Link: "Don't have an account? Sign up" (conditionally displayed based on `VITE_REGISTRATION_ENABLED`)
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

#### Authentication Endpoints

**Implementation:** TanStack Query mutation hooks wrapping `AuthProvider` methods:

- **`useSignUp`** - Registration with automatic signOut (enforces email verification)
  - Calls Edge Function `/functions/v1/signup` (validates `app_config.registration_enabled`)
  - Returns 403 if registration disabled
  - Creates user via `supabase.auth.admin.createUser()` with `email_confirm: false`

- **`useSignIn`** - Login
  - Calls `supabase.auth.signInWithPassword()`
  - AuthGuard validates `email_confirmed_at` after successful login

- **`useSignOut`** - Logout
  - Calls `supabase.auth.signOut()`
  - Clears session and redirects to `/login`

- **`useResetPassword`** - Request password reset email
  - Calls `supabase.auth.resetPasswordForEmail()` with redirect URL

- **`useUpdatePassword`** - Update password (after clicking reset link)
  - Calls `supabase.auth.updateUser({ password: newPassword })`
  - Token validation handled by Supabase

- **`useResendVerification`** - Resend verification email
  - Calls `supabase.auth.resend({ type: 'signup', email })`

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

#### App Config Model (Database)

Configuration table for runtime feature flags (added in migration `02_tables.sql`):

```sql
CREATE TABLE app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Default configuration
INSERT INTO app_config (key, value, description) VALUES
  ('registration_enabled', 'true', 'Controls whether new user registration is allowed'),
  ('email_verification_required', 'true', 'Controls whether email verification is required before granting session access');

-- RLS policy: only service_role can read/modify
CREATE POLICY "Service role can manage app_config"
  ON app_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

Configuration keys:

- `registration_enabled`: `'true'` | `'false'` - checked by Edge Function before user creation
- `email_verification_required`: `'true'` | `'false'` - enforced by AuthGuard on frontend

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

- URL and anon key from environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Registration control:
  - **Backend:** `app_config.registration_enabled` database setting (default: `'true'`) validated by Edge Function (`supabase/functions/signup`)
  - **Frontend:** `VITE_REGISTRATION_ENABLED` environment variable controls UI visibility (default: `'true'`)
- Email verification control: `app_config.email_verification_required` database setting (default: `'true'`)
- Session persistence: localStorage via Supabase client
- Auto-refresh tokens: enabled via client configuration
- Event listeners for session changes: `supabase.auth.onAuthStateChange()`

#### Auth State Management

- React Context (`AuthProvider`) for global authentication state
- User state synchronized with `supabase.auth.onAuthStateChange()`
- TanStack Query mutations for authentication actions (no Query cache for user state)
- Auth methods: `signUp`, `signIn`, `signOut`, `resetPassword`, `updatePassword`, `resendVerification`

### 3.2 Authentication Flows

#### Registration Flow

1. User fills RegisterForm
2. Client-side validation (Zod schema)
3. Call `useSignUp` mutation → `AuthProvider.signUp()`
4. Edge Function (`/signup`) checks `app_config.registration_enabled`
5. If enabled: create user via `supabase.auth.admin.createUser()` with `email_confirm: false`
6. Send verification email (handled by Supabase)
7. Auto-signOut after registration (enforce "no session before verification")
8. Redirect to `/verify-email` with email in state
9. User clicks verification link in email
10. Token verification by Supabase → `email_confirmed_at` set
11. User redirected to login page (must login again after verification)

#### Login Flow

1. User fills LoginForm
2. Client-side validation (Zod schema)
3. Call `useSignIn` mutation → `AuthProvider.signIn()`
4. Call `supabase.auth.signInWithPassword()`
5. Supabase creates session (if credentials valid)
6. `onAuthStateChange` updates `AuthProvider` user state
7. AuthGuard checks `user.email_confirmed_at`:
   - If null: redirect to `/verify-email`
   - If set: allow access to protected routes
8. Successful login: redirect to intended page or `/projects`

#### Password Reset Flow

1. User fills ForgotPasswordForm
2. Call `useResetPassword` mutation → `AuthProvider.resetPassword()`
3. Call `supabase.auth.resetPasswordForEmail()` with redirect URL
4. Supabase sends email with reset link
5. User clicks link → redirected to `/reset-password` with token in URL
6. User fills ResetPasswordForm with new password
7. Call `useUpdatePassword` mutation → `AuthProvider.updatePassword()`
8. Call `supabase.auth.updateUser({ password: newPassword })`
9. Token verification and password update by Supabase
10. Success: redirect to `/login` with success toast

### 3.3 Security Measures

#### Session Security

- Session tokens managed by Supabase Auth (stored in localStorage)
- Auto-refresh tokens enabled via client configuration
- Automatic logout on session expiration via `onAuthStateChange`
- No session created until email verification (enforced by auto-signOut in `AuthProvider.signUp()`)
- AuthGuard validates `email_confirmed_at` before allowing access

#### Registration Control

- **Database-level:** `app_config` table stores `registration_enabled` setting
  - Default value: `'true'`
  - Editable only by `service_role` (via RLS policy)
- **Edge Function:** `supabase/functions/signup/index.ts` validates setting before user creation
  - Returns 403 if registration disabled
  - Uses `supabase.auth.admin.createUser()` for server-side user creation
- **Frontend-level:** `VITE_REGISTRATION_ENABLED` controls UI visibility
  - Hides registration links and routes when `'false'`
  - Independent from backend setting (UI optimization only)

#### Email Verification Control

- **Database-level:** `app_config.email_verification_required` setting (default: `'true'`)
- **Enforcement:** AuthGuard checks `user.email_confirmed_at` before granting access
- Auto-signOut after registration ensures no session exists until verification

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
│ ├── auth.errors.ts # Error mapping: AuthError → ApiErrorResponse
│ ├── auth.schemas.ts # Zod validation schemas
│ ├── index.ts # Barrel exports
│ ├── useSignUp/
│ │ ├── useSignUp.ts # Registration mutation
│ │ └── index.ts
│ ├── useSignIn/
│ │ ├── useSignIn.ts # Login mutation
│ │ └── index.ts
│ ├── useSignOut/
│ │ ├── useSignOut.ts # Logout mutation
│ │ └── index.ts
│ ├── useResetPassword/
│ │ ├── useResetPassword.ts # Request reset email mutation
│ │ └── index.ts
│ ├── useUpdatePassword/
│ │ ├── useUpdatePassword.ts # Update password mutation (after reset link)
│ │ └── index.ts
│ └── useResendVerification/
│ ├── useResendVerification.ts # Resend verification email mutation
│ └── index.ts
├── components/
│ ├── forms/
│ │ ├── LoginForm.tsx
│ │ ├── RegisterForm.tsx
│ │ ├── ForgotPasswordForm.tsx
│ │ └── ResetPasswordForm.tsx
│ ├── layouts/
│ │ └── AuthLayout.tsx # Public auth pages layout
│ ├── guards/
│ │ └── AuthGuard.tsx # Route protection with email verification check
│ └── common/
│ └── EmailVerificationScreen.tsx
├── routes/
│ ├── LoginPage.tsx
│ ├── RegisterPage.tsx
│ ├── VerifyEmailPage.tsx
│ ├── ForgotPasswordPage.tsx
│ └── ResetPasswordPage.tsx
└── index.ts # Public exports

src/app/providers/
└── AuthProvider.tsx # Global auth state via React Context

src/app/components/
└── ProtectedRoute.tsx # Wrapper combining AuthGuard + Suspense

supabase/functions/signup/
└── index.ts # Edge Function for registration control

supabase/migrations/
└── 20251028100001_02_tables.sql # app_config table for feature flags
```

Authentication constants stored in `src/shared/constants/auth.constants.ts`:

- `AUTH_PASSWORD_MIN_LENGTH`, `AUTH_PASSWORD_MAX_LENGTH`, `AUTH_EMAIL_MAX_LENGTH`
- `AUTH_PASSWORD_PATTERN` (at least one letter and one digit)
- `AUTH_ERROR_MESSAGES` (17 error messages for auth flows)
- `AUTH_SUCCESS_MESSAGES` (4 success messages)

### 4.2 Routing Integration

**Implemented in `src/app/routes.tsx`:**

- Public auth routes (lazy-loaded):
  - `/login` → `LoginPage`
  - `/register` → `RegisterPage`
  - `/verify-email` → `VerifyEmailPage`
  - `/forgot-password` → `ForgotPasswordPage`
  - `/reset-password` → `ResetPasswordPage`

- Protected routes wrapped with `ProtectedRoute` component:
  - All existing routes (`/projects/*`, etc.)
  - `ProtectedRoute` combines `AuthGuard` + `Suspense`

### 4.3 State Management Integration

**Provider hierarchy in `src/app/main.tsx`:**

```tsx
<SupabaseProvider>
  <AuthProvider>
    {' '}
    {/* Global auth state */}
    <QueryClientProvider>
      <RouterProvider />
    </QueryClientProvider>
  </AuthProvider>
</SupabaseProvider>
```

- `AuthProvider` wraps entire app (below `SupabaseProvider`)
- `useAuth()` hook available in all components
- TanStack Query mutations for auth actions
- No Query cache for user state (managed via Context + `onAuthStateChange`)

### 4.4 UI/UX Consistency

- Use existing Shadcn/ui components
- Maintain application design system
- Accessibility compliance matching existing standards

## 5. IMPLEMENTATION ASSUMPTIONS

### 5.1 Technical Requirements

- React 19 with hooks and concurrent features
- TypeScript 5 with strict mode
- Supabase Auth v2 with Edge Functions (Deno runtime)
- TanStack Query v5 (mutations for auth actions)
- Zod for validation (both frontend and Edge Function)
- Environment variables:
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase anon key
  - `VITE_REGISTRATION_ENABLED` (optional, default: `'true'`) - frontend UI visibility only
- Database configuration:
  - `app_config.registration_enabled` - backend validation (Edge Function)
  - `app_config.email_verification_required` - frontend enforcement (AuthGuard)

### 5.2 Performance Considerations

- Lazy loading for all authentication components
- Minimal bundle size impact
- Efficient re-renders with useMemo/useCallback

### 5.3 Testing Strategy

- Unit tests for all hooks and utilities
- E2E tests for critical flows (login, register, reset password)
- Supabase Auth mocking for tests
