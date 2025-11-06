# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

i18n-mate is a web application for centralized management of i18n translations for frontend projects. It provides a unified process for creating and maintaining translation keys, separation of translations from code, fast translation using LLM, and export in a ready-to-use format compatible with i18next.

**Current Status**: MVP Phase (v0.0.0) - Database schema and migrations are in place, frontend development is ongoing.

## Tech Stack

**Frontend**: React 19 + TypeScript 5 + Vite + Tailwind CSS 4 + Shadcn/ui + React Router v7 + TanStack Query + Zod

**Backend**: Supabase (PostgreSQL with RLS policies, authentication, and Edge Functions)

**AI**: OpenRouter.ai for LLM-powered translations

**Testing**: Vitest + Testing Library + @vitest/coverage-v8

## Essential Commands

### Development

```bash
npm run dev              # Start development server at http://localhost:5173
npm run build            # Type-check and build for production
npm run preview          # Preview production build locally
npm run lint             # Run ESLint with React, TypeScript, and accessibility checks
npm run test             # Run Vitest tests with coverage (90% thresholds)
npm run pre-commit       # Run lint-staged (auto-runs via Husky)
```

### Supabase

```bash
npm run supabase:start     # Start local Supabase (Docker required)
npm run supabase:stop      # Stop local Supabase
npm run supabase:migration # Apply migrations to local instance
```

### Testing

```bash
npm run test -- --watch    # Run tests in watch mode
npm run test -- --ui       # Open Vitest UI
npm run test:e2e           # Run E2E tests with Playwright
npm run test:e2e:ui        # Open Playwright UI for visual test debugging
npm run test:e2e:debug     # Run E2E tests in debug mode
```

## Architecture

### Feature-First Structure

The codebase follows a feature-first architecture where domain modules live in `src/features/` and shared code lives in `src/shared/`:

- **`src/app/`**: Application shell, bootstrap, providers (e.g., `SupabaseProvider`), and routing
- **`src/app/routes/`**: React Router v7 route definitions (lazy-loaded)
- **`src/app/errors/`**: Global and per-route error boundaries
- **`src/shared/`**: Domain-agnostic, reusable code
  - `api/`: Supabase client, TanStack Query keys, API utilities
  - `components/`: General shared components
  - `ui/`: Shadcn/ui components (installed via `npx shadcn@latest add`)
  - `lib/`: Library functions (format-date, generate-id, etc.)
  - `utils/`: Utility functions (cn, clsx helpers)
  - `hooks/`: Generic hooks (useDebounce, etc.)
  - `types/`: Generated types (database.types.ts from Supabase)
  - `config/`: Environment mapping, theme, feature flags
  - `constants/`: Centralized constants, validation patterns, and error messages
  - `styles/`: Global styles
- **`src/features/`**: Domain modules (feature-first organization)
  - `feature/components/`: Feature UI components with co-located `.test.tsx` and `.css`
  - `feature/api/`: TanStack Query hooks (queries/mutations) with co-located `.test.ts`
  - `feature/routes/`: Feature pages/guards with co-located `.test.tsx`
  - `feature/hooks/`: Feature-specific logic and local state with co-located `.test.ts`
- **`src/test/`**: Vitest setup only (setup.ts)
- **`supabase/migrations/`**: SQL migrations for database schema
- **`public/`**: Static files served 1:1 (favicon, manifest, robots.txt)

### Import Aliases

TypeScript path aliases are configured in `tsconfig.json`:

- `@/*` → `src/*` (use for all shared code imports)

Shadcn/ui components install to `src/shared/ui/` via `npx shadcn@latest add [component]`.

### Supabase Integration

- Use the shared `SupabaseProvider` context (`src/app/providers/SupabaseProvider.tsx`) to access the Supabase client
- Access the client via the `useSupabase` hook in components, loaders, actions, and TanStack Query hooks
- **Never** import `@supabase/supabase-js` directly; always use `SupabaseClient` type from `src/shared/api/supabase.client.ts`
- API layer should be in `src/features/**/api/` using TanStack Query for server state management
- Database schema is defined in Supabase migrations (`supabase/migrations/`)

### Database Schema

The database includes the following key tables:

- `projects`: User projects with name, description, prefix (2-4 chars), and default language
- `locales`: Languages per project (BCP-47 compliant, normalized)
- `keys`: Translation keys in default language with unique full keys (prefix + "." + name)
- `translations`: Key-value pairs per language with metadata (isMachineTranslated, updatedBy)
- `translation_jobs`: LLM translation job tracking
- `job_items`: Individual translation job items with status tracking
- `telemetry`: Event tracking with partitioning by month

Migrations are versioned and follow a strict order (extensions → tables → indexes → triggers → RLS policies → helpers → automation).

## Development Guidelines

### React Patterns

- Use functional components with hooks (no class components)
- Implement React.memo() for expensive components
- Use React.lazy() and Suspense for code-splitting
- Leverage useCallback for event handlers to prevent re-renders
- Use useMemo for expensive calculations
- Use useTransition for non-urgent state updates

### React Router v7

- Use createBrowserRouter instead of BrowserRouter
- Implement lazy loading for route components
- Use loader and action functions for data fetching/mutations at the route level
- Implement error boundaries with errorElement
- Use relative paths with dot notation for route hierarchy

### TanStack Query

- Set appropriate staleTime and gcTime based on data freshness
- Use optimistic updates for mutations
- Structure Query Keys as `[entity, params]`
- Implement retry logic with custom backoff for network issues
- Use query invalidation after mutations

### Tailwind CSS

- Use JIT mode (enabled by default in v4)
- Use arbitrary values with square brackets for one-off designs: `w-[123px]`
- Implement dark mode with `dark:` variant
- Use responsive variants (sm:, md:, lg:) and state variants (hover:, focus:)

### TypeScript

- Use strict typing; avoid `any` (use `as unknown as ...` if necessary)
- Prefer interfaces over types
- File structure: imports → types → main component → sub-components → helpers → static content

### Form Validation

- Use Zod for all form validation
- Validate data exchanged with backend using Zod schemas
- Use centralized constants from `src/shared/constants/` for validation patterns, error messages, and constraints
- This ensures consistency between TypeScript validation and PostgreSQL domain constraints

### Testing

- Co-locate tests with source files (`Component.test.tsx` next to `Component.tsx`)
- Use `screen` from Testing Library (don't destructure from render)
- Follow query priority: getByRole → getByLabelText → getByText → getByTestId (last resort)
- Use `findBy*` for async elements, `getBy*` for immediate elements, `queryBy*` only for non-existence assertions
- Use `@testing-library/user-event` instead of fireEvent
- Use jest-dom matchers: `toBeDisabled()`, `toBeInTheDocument()`, `toHaveTextContent()`
- Coverage thresholds: 90% (branches, functions, lines, statements)

### Accessibility

- Use ARIA landmarks and appropriate roles
- Set aria-expanded, aria-controls for expandable content
- Use aria-live regions for dynamic updates
- Apply aria-label/aria-labelledby for elements without visible labels
- Avoid redundant ARIA on semantic HTML
- Use aria-invalid for form validation errors

### Commit Conventions

- Follow Conventional Commits v1.0.0 strictly
- Format: `<type>[optional scope][!]: <description>`
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Description: imperative, present tense, lowercase after colon, no trailing period
- Header ≤ 72 characters
- Scope: optional, kebab-case noun in parentheses (e.g., `(auth)`, `(api)`)
- Breaking changes: use `!` in header or `BREAKING CHANGE:` footer

## Environment Variables

Required in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=model_name

E2E_USERNAME=your_e2e_test_email (required for E2E tests)
E2E_PASSWORD=your_e2e_test_password (required for E2E tests)
```

## MVP Features

### In Scope

- Authentication (email verification required, password reset)
- Project management (CRUD with immutable prefix and default language)
- Language management (BCP-47 compliant, normalized, cannot delete default)
- Translation keys (add in default language, unique full keys, 250 char limit)
- LLM translation (via OpenRouter.ai, resilient error handling, metadata tracking)
- Export (ZIP with `{lang}.json` files, i18next-compatible)

### Out of Scope

- Roles/permissions (single user can do everything)
- External API for translations (UI-only ZIP export)
- Import of translation files
- Multi-user collaboration
- Key renaming
- Translation memory

## Error Handling Architecture

The project uses a comprehensive error handling system documented in `ERRORS.md`. This document describes the structured error format used for database-raised errors, enabling reliable parsing and user-friendly error messages in the frontend. Key aspects include:

- **Structured Error Format**: All database errors follow a consistent pattern with exception message, PostgreSQL error code, structured DETAIL field, and helpful HINT
- **Error Code Catalog**: Comprehensive list of error codes organized by domain (authentication, project, locale, key, translation, job errors)
- **Frontend Integration**: Mapping between database error codes and frontend constants for consistent UX
- **Error Parsing**: Algorithm for parsing structured error details in the frontend
- **Migration Template**: Standard template for implementing new errors in database migrations

All database errors follow the format:

```sql
RAISE EXCEPTION 'Human-readable message'
USING ERRCODE = 'PostgreSQL_error_code',
      DETAIL = 'error_code:ERROR_NAME,field:field_name,additional:metadata',
      HINT = 'Helpful suggestion for the user';
```
