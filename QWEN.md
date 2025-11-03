# i18n-mate Project Context

## Project Overview

i18n-mate is a web application for centralized management of i18n (internationalization) translations for frontend projects. It provides a unified process for creating and maintaining translation keys, separation of translations from code, fast translation using LLMs, and export in a ready-to-use format compatible with i18next.

The project is currently in early development/MVP phase and targets frontend developers who need to manage i18n in their applications. It addresses common challenges like data fragmentation, lack of standardization, and code separation for translations.

## Tech Stack

### Frontend

- **Vite** - Fast build tool with HMR for optimal development experience
- **React 19** - UI library for building interactive components and managing application state
- **TypeScript 5** - Static typing for better code quality and IDE support
- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **Shadcn/ui** - Accessible React component library built on Radix UI
- **React Router v7** - Client-side routing for SPA navigation
- **TanStack Query** - Server state management with caching and synchronization
- **Zod** - Data validation

### Backend

- **Supabase** - PostgreSQL database with built-in authentication, RLS policies, and realtime subscriptions
- **Supabase Edge Functions** - Serverless functions for custom API logic when needed

### AI

- **OpenRouter.ai** - Gateway to multiple LLM providers (OpenAI, Anthropic, Google) with unified API and cost controls

### CI/CD and Hosting

- **GitHub Actions** - CI/CD pipeline automation for testing and deployment
- **Cloudflare Pages** - Production hosting with global CDN, manual deployments, and edge computing capabilities
- **Docker + DigitalOcean** - Pre-production environment for testing deployment scripts and production-ready pipelines

### Testing & Quality

- **Vitest** - Unit testing framework for JavaScript and TypeScript with Vite-native DX
- **Testing Library** - User-focused testing utilities for exercising React components
- **@vitest/coverage-v8** - Coverage reporting powered by the V8 engine

### Developer Experience

- **ESLint 9 + TypeScript ESLint** - Comprehensive linting with React, accessibility, and unused-import rules
- **Prettier (Tailwind & JSON plugins)** - Consistent formatting with Tailwind-aware sorting
- **Husky + lint-staged** - Git hooks that enforce linting and formatting on staged files

## Building and Running

### Prerequisites

- **Node.js**: v22.20.0 (as specified in `.nvmrc`)
- **npm**: v9.x or later
- **Supabase Account**: For database and authentication

If you use `nvm`, you can run:

```bash
nvm use
```

### Setup and Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables in a `.env` file:

   ```env
   # Supabase
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # OpenRouter.ai
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=model_name

   # Testing (optional)
   TEST_EMAIL=your_test_email
   TEST_PASSWORD=your_test_password

   # E2E Testing (required for E2E tests)
   E2E_USERNAME=your_e2e_test_email
   E2E_PASSWORD=your_e2e_test_password
   ```

### Available Scripts

- `npm run dev` - Runs the app in development mode with hot module replacement (HMR)
- `npm run build` - Builds the app for production to the `dist` folder
- `npm run test` - Executes unit tests with Vitest
- `npm run test:e2e` - Runs E2E tests with Playwright
- `npm run test:e2e:ui` - Opens Playwright UI for visual test debugging
- `npm run test:e2e:debug` - Runs E2E tests in debug mode
- `npm run preview` - Locally preview the production build before deploying
- `npm run lint` - Runs ESLint to check code quality and catch potential errors
- `npm run lint:fix` - Runs ESLint with auto-fix
- `npm run pre-commit` - Runs lint-staged to check staged files before committing
- `npm run prepare` - Sets up Husky git hooks

### Supabase Scripts

- `npm run supabase:start` - Starts local Supabase services
- `npm run supabase:stop` - Stops local Supabase services
- `npm run supabase:reset` - Resets local Supabase database
- `npm run supabase:migration` - Runs database migrations
- `npm run supabase:types` - Generates TypeScript types from local database schema
- `npm run supabase:functions:serve` - Serves Supabase edge functions locally

## Project Structure

The project follows a modern React + TypeScript + Vite setup with the following key directories:

- `src/` - Main source code
  - `app/main.tsx` - Application entry point
  - `shared/types/` - TypeScript type definitions
  - `test/setup.ts` - Test setup file

## Development Conventions

### Code Standards

- TypeScript strict mode enabled
- ESLint with React 19 best practices, accessibility checks, and import organization
- Prettier with a 120 character print width, single quotes, and trailing commas
- Component file names use PascalCase with `.tsx` extension
- Utility files use camelCase with `.ts` extension
- Test files end with `.test.tsx` or `.test.ts`

### Testing Practices

- Testing Library for component testing
- Vitest for unit testing with JS DOM environment
- Goal of 90%+ code coverage (currently configured in vitest.config.ts)
- Setup file for test environment configuration

### Import/Export Style

- Path aliases configured (`@/*` maps to `./src/*`)
- ES modules for imports/exports
- Verbatim module syntax enabled in TypeScript

### Git Workflow

- Husky pre-commit hooks run lint-staged to ensure code quality before commits
- Linting and formatting enforced on staged files
- Commit messages follow conventional patterns (implied by repository structure)

## Key Features (MVP)

### Authentication & Authorization

- User registration with email verification (required before login)
- Login/logout functionality
- Password reset via email
- Session management (only after email verification)

### Project Management

- Create projects with name, description, immutable 2-4 character prefix, and immutable default language
- Edit project name and description
- Delete projects (with confirmation)
- Project list with pagination (50 items/page)

### Language Management

- Add languages to projects (BCP-47 compliant with normalization)
- Edit language labels
- Delete languages (cannot delete default language)
- Automatic normalization: language lowercase / REGION UPPERCASE
- Support for language/region pairs only (script/variant/extension sub-tags are rejected)

### Translation Keys & Values

- Add keys in default language only
- Key format: `[a-z0-9._-]`, no double dots (`..`), no trailing dot
- Unique full keys per project (prefix + "." + name)
- Delete keys in default language (cascades to all languages)
- Inline editing with autosave (< 1s average)
- 250 character limit per value, no newlines
- Empty values = missing (except in default language)
- Per-language view with filtering and search
- Missing filter and key search (case-insensitive contains)
- Pagination (50 keys/page) with stable sorting

### LLM Translation

- Translate all/selected/single keys using OpenRouter.ai
- Target language cannot be the project's default language
- Progress modal with status information
- Success/error toast notifications
- Automatic metadata tracking:
  - LLM: `isMachineTranslated=true`, `updatedBy=system`
  - Manual: `isMachineTranslated=false`, `updatedBy=<user>`
- Resilient handling of 429/5xx errors

### Export

- ZIP download containing `{lang}.json` files
- Dotted key format (i18next-compatible)
- Stable sorting, UTF-8 encoding, LF line endings
- Missing values represented as empty strings
- Removed languages excluded from export

## Out of Scope (MVP)

- Roles and permissions (single user can do everything)
- External API for accessing translations (UI-only ZIP export)
- Import of translation files
- Cost counting or token validation
- Organization entity
- Multi-user collaboration
- Key renaming
- Bulk import/export operations
- Translation memory
- Custom export formats

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

## Project Status

The project is in early development/MVP phase, version 0.0.0, currently being built according to specifications in the Product Requirements Document.

### Success Metrics

- Percentage of projects with at least 2 languages after 7 days
- Number of keys per language after 7 days from project creation
- Percentage of translations using LLM after 7 days
- LLM translation effectiveness (success rate, average time)
- Average autosave time
