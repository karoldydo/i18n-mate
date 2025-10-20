# i18n-mate

A web application for centralized management of i18n translations for frontend projects. i18n-mate provides a unified process for creating and maintaining translation keys, separation of translations from code, fast translation using LLM, and export in a ready-to-use format compatible with i18next.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [AI](#ai)
  - [CI/CD and Hosting](#cicd-and-hosting)
  - [Testing & Quality](#testing--quality)
  - [Developer Experience](#developer-experience)
- [Getting Started Locally](#getting-started-locally)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
  - [MVP Features](#mvp-features)
  - [Out of Scope](#out-of-scope)
- [Project Status](#project-status)
- [Repository Guidelines](#repository-guidelines)
- [License](#license)

## Project Description

i18n-mate solves the common challenges of managing translations in frontend teams:

- **Standardization**: Eliminates data fragmentation and errors caused by lack of standardization in translation management
- **Code Separation**: Removes translations from code to enable better iteration, work sharing, and consistency
- **AI-Powered Translation**: Fast translation of keys into multiple languages using LLM without leaving the tool
- **Simple Export**: Export to i18next-compatible format that can be immediately plugged into your application pipeline

### Target Users

Frontend developers managing i18n in their applications.

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
- **Vercel** - Development and staging environment with zero-config deployment and automatic preview URLs
- **Docker + DigitalOcean** - Pre-production environment for testing deployment scripts and production-ready pipelines

### Testing & Quality

- **Vitest** - Unit testing framework for JavaScript and TypeScript with Vite-native DX
- **Testing Library** - User-focused testing utilities for exercising React components
- **@vitest/coverage-v8** - Coverage reporting powered by the V8 engine

### Developer Experience

- **ESLint 9 + TypeScript ESLint** - Comprehensive linting with React, accessibility, and unused-import rules
- **Prettier (Tailwind & JSON plugins)** - Consistent formatting with Tailwind-aware sorting
- **Husky + lint-staged** - Git hooks that enforce linting and formatting on staged files

## Getting Started Locally

### Prerequisites

- **Node.js**: v22.20.0 (specified in `.nvmrc`)
- **npm**: v9.x or later (comes with Node.js)
- **Supabase Account**: For database and authentication

If you use `nvm`, you can run:

```bash
nvm use
```

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/karoldydo/i18n-mate.git
   cd i18n-mate
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

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
```

**Note**: Refer to [Supabase documentation](https://supabase.com/docs) and [OpenRouter documentation](https://openrouter.ai/docs) for obtaining the required credentials.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode with hot module replacement (HMR).
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### `npm run test`

Executes unit tests with Vitest.

### `npm run build`

Builds the app for production to the `dist` folder.
It compiles TypeScript and optimizes the build for best performance.

### `npm run preview`

Locally preview the production build before deploying.

### `npm run lint`

Runs ESLint to check code quality and catch potential errors.
The project is configured with strict linting rules including:

- React 19 best practices
- TypeScript type safety
- Accessibility checks (jsx-a11y)
- Import organization
- Prettier integration

### `npm run pre-commit`

Runs lint-staged to check staged files before committing.
This is automatically executed by Husky pre-commit hooks.

## Project Scope

### MVP Features

#### Authentication & Authorization

- User registration with email verification (required before login)
- Login/logout functionality
- Password reset via email
- Session management (only after email verification)

#### Project Management

- Create projects with name, description, immutable 2-4 character prefix, and immutable default language
- Edit project name and description
- Delete projects (with confirmation)
- Project list with pagination (50 items/page)

#### Language Management

- Add languages to projects (BCP-47 compliant with normalization)
- Edit language labels
- Delete languages (cannot delete default language)
- Automatic normalization: language lowercase / REGION UPPERCASE
- Support for language/region pairs only (script/variant/extension sub-tags are rejected)

#### Translation Keys & Values

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

#### LLM Translation

- Translate all/selected/single keys using OpenRouter.ai
- Target language cannot be the project's default language
- Progress modal with status information
- Success/error toast notifications
- Automatic metadata tracking:
  - LLM: `isMachineTranslated=true`, `updatedBy=system`
  - Manual: `isMachineTranslated=false`, `updatedBy=<user>`
- Resilient handling of 429/5xx errors

#### Export

- ZIP download containing `{lang}.json` files
- Dotted key format (i18next-compatible)
- Stable sorting, UTF-8 encoding, LF line endings
- Missing values represented as empty strings
- Removed languages excluded from export

### Out of Scope

The following features are **not** included in the MVP:

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

## Project Status

🚧 **Early Development / MVP Phase** - Version 0.0.0

This project is currently in active development. The MVP is being built according to the specifications outlined in the [Product Requirements Document](.ai/prd.md).

### Success Metrics

The project tracks the following KPIs:

- Percentage of projects with at least 2 languages after 7 days
- Number of keys per language after 7 days from project creation
- Percentage of translations using LLM after 7 days
- LLM translation effectiveness (success rate, average time)
- Average autosave time

## Repository Guidelines

Contributors should review the concise contributor guide in [AGENTS.md](AGENTS.md) before opening pull requests or feature branches.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Karol Dydo

---

**Built with ❤️ for frontend developers managing i18n translations**
