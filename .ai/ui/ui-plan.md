# UI Architecture for i18n-mate

## 1. UI Structure Overview

The i18n-mate user interface architecture is based on a flat feature structure using React 19, TypeScript, Tailwind CSS, and Shadcn/ui components. The main goal is to provide seamless translation management for frontend applications through an intuitive interface supporting project creation, language and key management, and automatic LLM translations.

The UI structure consists of authentication views (registration, login, email verification), project management (project list, languages, keys, translations), and operational views (translation jobs, telemetry, export). All views use common navigation, toast notifications for feedback, and an AuthGuard wrapper for security.

Key design principles include responsiveness (Tailwind CSS breakpoints), WCAG 2.1 AA accessibility (ARIA, focus management), and security (Supabase Auth with email verification). Server state is managed by TanStack Query with caching and invalidation, and errors are handled globally through toast messages.

## 2. List of Views

### 2.1 Registration View

[Implementation View Details →](./views/1-registration-view.md)

### 2.2 Login View

[Implementation View Details →](./views/2-login-view.md)

### 2.3 Email Verification View

[Implementation View Details →](./views/3-email-verification-view.md)

### 2.4 Password Reset View

[Implementation View Details →](./views/4-password-reset-view.md)

### 2.5 Project List

[Implementation View Details →](./views/5-project-list.md)

### 2.6 Project Details

[Implementation View Details →](./views/6-project-details.md)

### 2.7 Project Languages List

[Implementation View Details →](./views/7-project-languages-list.md)

### 2.8 Keys List (Default Language View)

[Implementation View Details →](./views/8-keys-list-default-view.md)

### 2.9 Keys List (Per-Language View)

[Implementation View Details →](./views/9-keys-list-per-language-view.md)

### 2.10 Translation Jobs

[Implementation View Details →](./views/10-translation-jobs.md)

### 2.11 Project Telemetry

[Implementation View Details →](./views/11-project-telemetry.md)

## 3. User Journey Map

### 3.1 Main Journey: Registration and First Translation

1. **Registration** (`/register`) → User fills email/password form → Success toast → Redirect to `/verify-email`
2. **Email Verification** (`/verify-email`) → User clicks link in email → Success toast → Redirect to `/login`
3. **Login** (`/login`) → User enters credentials → Success toast → Redirect to `/projects`
4. **Project List** (`/projects`) → User clicks "Create Project" → FormDialog → Success toast → Redirect to `/projects/:id`
5. **Project Details** (`/projects/:id`) → User clicks "Languages" → Navigate to `/projects/:id/locales`
6. **Languages List** (`/projects/:id/locales`) → User adds language → FormDialog → Success toast → Return to list
7. **Keys List** (`/projects/:id/keys`) → User adds key → FormDialog → Success toast → Inline editing of default value
8. **Translation** → User clicks "Translate All" → ConfirmDialog → Progress modal → Success toast → View with translated values
9. **Export** → User clicks "Export" → Download ZIP with `{locale}.json` files

### 3.2 Additional Journeys

- **Password Reset**: `/login` → "Forgot password" → `/reset-password` → Email link → Set new password → `/login`
- **Project Management**: `/projects` → Edit/Delete actions → FormDialog/ConfirmDialog → Toast feedback
- **Translation Editing**: `/projects/:id/keys/:locale` → Inline editing → Debounced autosave → Conflict resolution if needed
- **Translation Monitoring**: `/projects/:id/translation-jobs` → View progress → Cancel if needed

## 4. Navigation Layout and Structure

### 4.1 Main Navigation

- **Public Routes**: `/register`, `/login`, `/verify-email`, `/reset-password` - available without authentication
- **Protected Routes**: All `/projects/*` - require AuthGuard with Supabase session + email verification
- **Navigation Tabs**: In project details for switching between Languages/Keys/Translation Jobs/Telemetry

### 4.2 Guards and Redirects

- **AuthGuard**: Wrapper component checking session and email_confirmed_at
- **Automatic Redirects**:
  - Not logged in → `/login`
  - Unverified email → `/verify-email`
  - After registration → `/verify-email`
  - After verification → `/login`
  - After login → `/projects`
  - After project creation → `/projects/:id`

### 4.3 Navigation Responsiveness

- **Mobile**: Collapsible navigation drawer
- **Tablet**: Side navigation with tabs
- **Desktop**: Full side navigation

## 5. Key Components

### 5.1 Layout Components

- **AuthGuard**: Wrapper HOC with loading spinner for protected routes
- **AppLayout**: Main layout with navigation
- **ProjectLayout**: Project-specific layout with tabs

### 5.2 Form Components

- **FormDialog**: Reusable dialog with react-hook-form, Zod validation, autofocus and trap focus
- **ConfirmDialog**: Confirmation modal with destructive actions
- **DataTable**: Table with pagination, search, filters, actions - used for all lists

### 5.3 UI Components

- **ToastProvider**: Global toast notifications for success/error feedback
- **ProgressModal**: Modal with progress bar for long-running operations (translations)
- **InlineEditor**: Component for inline editing with debounced autosave

### 5.4 Business-Specific Components

- **LocaleSelector**: Dropdown for language selection with BCP-47 validation
- **TranslationStatus**: Component displaying translation status (manual/machine translated, missing)
- **ExportButton**: Button with loading state for ZIP export
