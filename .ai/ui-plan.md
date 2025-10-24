# UI Architecture for i18n-mate

## 1. UI Structure Overview

The i18n-mate user interface architecture is based on a flat feature structure using React 19, TypeScript, Tailwind CSS, and Shadcn/ui components. The main goal is to provide seamless translation management for frontend applications through an intuitive interface supporting project creation, language and key management, and automatic LLM translations.

The UI structure consists of authentication views (registration, login, email verification), project management (project list, languages, keys, translations), and operational views (translation jobs, telemetry, export). All views use common navigation, toast notifications for feedback, and an AuthGuard wrapper for security.

Key design principles include responsiveness (Tailwind CSS breakpoints), WCAG 2.1 AA accessibility (ARIA, focus management), and security (Supabase Auth with email verification). Server state is managed by TanStack Query with caching and invalidation, and errors are handled globally through toast messages.

## 2. List of Views

### 2.1 Registration View

- **View Path**: `/register`
- **Main Purpose**: Allow new users to create an account in the system
- **Key Information to Display**: Registration form with email and password fields, login link, validation error messages
- **Key View Components**: FormDialog with react-hook-form and Zod, action buttons, navigation links
- **UX, Accessibility and Security Considerations**:
  - UX: Simple form with immediate validation, redirect to email verification on success
  - Accessibility: ARIA labels, aria-invalid for errors, focus management, keyboard support
  - Security: Client and server-side email/password validation, no access to other views without verification

### 2.2 Login View

- **View Path**: `/login`
- **Main Purpose**: Authenticate existing users with verified email
- **Key Information to Display**: Login form, registration link, password reset link, error messages
- **Key View Components**: FormDialog with react-hook-form, action buttons, navigation links
- **UX, Accessibility and Security Considerations**:
  - UX: Smooth transition to application after login, success toast after success
  - Accessibility: ARIA labels, aria-describedby for errors, focus trap in dialog
  - Security: Verified email requirement, JWT token management, redirect to verification for unverified accounts

### 2.3 Email Verification View

- **View Path**: `/verify-email`
- **Main Purpose**: Confirm email address before gaining access to the application
- **Key Information to Display**: Verification instructions, resend email button, verification status
- **Key View Components**: Information dialog with action buttons, loading states
- **UX, Accessibility and Security Considerations**:
  - UX: Clear instructions, ability to resend email, automatic redirect after verification
  - Accessibility: Screen reader announcements, keyboard navigation
  - Security: One-time verification tokens, no application access without verification

### 2.4 Password Reset View

- **View Path**: `/reset-password`
- **Main Purpose**: Allow users to reset their forgotten password
- **Key Information to Display**: Email form to send reset link, instructions
- **Key View Components**: FormDialog with single email field
- **UX, Accessibility and Security Considerations**:
  - UX: Simple process with email sending confirmation
  - Accessibility: ARIA labels, focus management
  - Security: One-time reset tokens with short lifespan

### 2.5 Project List

- **View Path**: `/projects`
- **Main Purpose**: Display all user projects with management capabilities
- **Key Information to Display**: Table with columns: name, default language, number of languages, number of keys, actions (edit, delete)
- **Key View Components**: DataTable with pagination, create project button, search/filter
- **UX, Accessibility and Security Considerations**:
  - UX: Sort by name, 50 items pagination, quick inline actions
  - Accessibility: Table with ARIA labels, keyboard navigation, screen reader support
  - Security: RLS policies - only own projects, deletion confirmation

### 2.6 Project Details

- **View Path**: `/projects/:id`
- **Main Purpose**: Display project details and navigation to subviews
- **Key Information to Display**: Project name, description, prefix, default language, statistics, buttons to subviews
- **Key View Components**: Project header with actions, navigation tabs
- **UX, Accessibility and Security Considerations**:
  - UX: Central hub for project management, quick navigation to languages and keys
  - Accessibility: Semantic HTML, ARIA navigation, keyboard shortcuts
  - Security: Ownership validation through RLS

### 2.7 Project Languages List

- **View Path**: `/projects/:id/locales`
- **Main Purpose**: Manage languages assigned to the project
- **Key Information to Display**: Table with columns: locale (normalized), label, default indicator, actions (edit, delete)
- **Key View Components**: DataTable, add language button, confirm dialogs
- **UX, Accessibility and Security Considerations**:
  - UX: Highlight default language, inability to delete default, BCP-47 validation
  - Accessibility: Table with proper ARIA, keyboard navigation for actions
  - Security: Block deletion of default language, ownership validation

### 2.8 Keys List (Default Language View)

- **View Path**: `/projects/:id/keys`
- **Main Purpose**: Display keys with values in default language and translation status
- **Key Information to Display**: Table with full key (prefix.key), default value, missing translation status for other languages
- **Key View Components**: DataTable with search, missing filter, pagination, inline editing for default values
- **UX, Accessibility and Security Considerations**:
  - UX: "Contains" search by key, "missing" filter, 50 pagination, autosave on edit
  - Accessibility: Table with ARIA labels, keyboard navigation, screen reader announcements
  - Security: Key format validation, ownership through RLS

### 2.9 Keys List (Per-Language View)

- **View Path**: `/projects/:id/keys/:locale`
- **Main Purpose**: Edit translations for selected language
- **Key Information to Display**: Table with full key, value in selected language, translation metadata
- **Key View Components**: DataTable with search, missing filter, inline editing to change language
- **UX, Accessibility and Security Considerations**:
  - UX: "Missing" filter for selected language, debounced autosave, conflict resolution
  - Accessibility: ARIA labels for translation statuses, keyboard navigation
  - Security: Block translation to default language, ownership validation

### 2.10 Translation Jobs

- **View Path**: `/projects/:id/translation-jobs`
- **Main Purpose**: Monitor and manage LLM translation jobs
- **Key Information to Display**: Job list with status, progress, actions (cancel), error details
- **Key View Components**: DataTable, progress indicators, confirm dialogs for cancel
- **UX, Accessibility and Security Considerations**:
  - UX: Real-time status updates, progress bars, toast notifications
  - Accessibility: ARIA live regions for status updates, keyboard navigation
  - Security: One active job per project, ownership validation

### 2.11 Project Telemetry

- **View Path**: `/projects/:id/telemetry`
- **Main Purpose**: Display project usage statistics for analytics
- **Key Information to Display**: Charts/metrics for events (project_created, language_added, key_created, translation_completed)
- **Key View Components**: Charts/metrics components, date filters
- **UX, Accessibility and Security Considerations**:
  - UX: KPI visualization (percentage of projects with multiple languages, average number of keys)
  - Accessibility: Alternative text for charts, keyboard navigation
  - Security: Only project owner can view telemetry

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
