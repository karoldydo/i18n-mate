# Test Plan for i18n-mate Application

## 1. Introduction and Testing Objectives

### 1.1. Introduction

This document defines the strategy, scope, approach, and resources allocated for testing the **i18n-mate** application – a tool for centralized management of i18n translations for frontend projects. This plan forms the foundation for all quality assurance (QA) activities throughout the project lifecycle.

### 1.2. Testing Objectives

The main goal of the testing process is to ensure that the i18n-mate application in MVP (Minimum Viable Product) version meets all defined functional and non-functional requirements, is stable, secure, and intuitive for the target user – a frontend developer.

**Detailed objectives:**

- **Functionality verification:** Confirmation that all MVP features, such as authentication, project management, languages, keys, LLM translations, and export, work according to specifications.
- **Data integrity assurance:** Checking the correctness of input data validation, normalization (e.g., BCP-47), and data consistency in PostgreSQL database.
- **Security validation:** Verification that RLS (Row Level Security) policies in Supabase effectively isolate data between users.
- **Usability and UX assessment:** Ensuring that the user interface is intuitive, responsive, and user-friendly, with key workflows (e.g., adding a key, translation) being smooth.
- **Defect detection and reporting:** Identification, documentation, and tracking of bugs for their effective elimination before production deployment.
- **Building confidence in product quality:** Achievement of defined acceptance criteria to minimize deployment-related risks.

## 2. Test Scope

### 2.1. In-Scope Features

Tests will cover all features defined in `prd.md` as part of MVP:

1. **Authentication and authorization:**
   - User registration and email verification requirement.
   - Login and logout.
   - Password reset.
   - Session management.
   - Protection of protected routes.
2. **Project management:**
   - Creating, editing, and deleting projects.
   - Field validation (name, description, prefix, default language).
   - Immutability of prefix and default language.
   - Project list pagination.
3. **Language management (Locales):**
   - Adding, editing, and deleting languages in a project.
   - Validation and normalization of BCP-47 tags.
   - Blocking deletion of the default language.
4. **Key and translation management:**
   - Adding keys (only in default language) and format validation.
   - Uniqueness of full keys (prefix + name).
   - Deleting keys and cascading deletion of translations.
   - Inline editing with autosave functionality.
   - Filtering (missing translations) and key search.
   - Key list pagination.
5. **LLM translations:**
   - Initiating translation for single, selected, or all keys.
   - Handling states (in progress, success, error) and notifications (toast).
   - Resilience to API errors (429/5xx).
   - Correct tracking of metadata (`isMachineTranslated`, `updatedBy`).
6. **Export:**
   - Generating and downloading ZIP archive.
   - Correctness of format and structure of `{lang}.json` files (i18next compatibility).
   - UTF-8 encoding and proper key sorting.
7. **Error handling:**
   - Verification that errors (both client-side and server-side) are handled in a user-understandable way, according to `ERRORS.md`.

### 2.2. Out-of-Scope Features

The following areas will not be tested in the MVP phase, according to documentation:

- Roles and permissions (beyond basic owner/no access division).
- Multi-user collaboration within a single project.
- Import of translation files.
- Performance, load, and stress tests (may be added in the future).
- Custom export formats.

## 3. Test Types

To ensure comprehensive coverage, the following types of tests will be applied:

1. **Static analysis:**
   - **Description:** Automatic analysis of source code to find potential bugs, standard non-compliance, and security vulnerabilities.
   - **Tools:** TypeScript, ESLint 9, Prettier.
   - **Responsibility:** Fully automated process, run pre-commit (Husky) and as part of CI/CD.

2. **Unit Tests:**
   - **Description:** Testing individual components (React), functions (utils), hooks, and validation schemas (Zod) in isolation.
   - **Goal:** Verification of business logic correctness at the lowest level.
   - **Tools:** Vitest, Testing Library, `@vitest/coverage-v8`.
   - **Responsibility:** Developers (following the test colocation principle `*.test.tsx`).

3. **End-to-End (E2E) Tests:**
   - **Description:** Automation of key user paths from the browser level, including complete workflows from UI through API to database.
   - **Goal:** Ensuring the entire application works correctly from the end user's perspective, including frontend-backend integration verification, RPC function operation correctness, RLS policies, and Supabase Edge Functions.
   - **Tools:** Playwright.
   - **Responsibility:** QA.

4. **Security tests:**
   - **Description:** Focused on RLS policy verification. Tests will involve attempts to access another user's resources using a valid authentication token.
   - **Goal:** Confirmation that data isolation works flawlessly.
   - **Tools:** Playwright (for full security tests with UI) or `curl` scripts (for initial API verification).
   - **Responsibility:** QA.

5. **Manual and exploratory tests:**
   - **Description:** Manual testing of the application to assess UX, accessibility (a11y), and discovery of unforeseen scenarios and bugs.
   - **Goal:** Verification of quality from a human perspective and finding bugs difficult to detect by automation.
   - **Responsibility:** QA.

6. **Compatibility tests:**
   - **Description:** Checking correct operation and appearance of the application across different browsers.
   - **Goal:** Ensuring consistent experience for a wide range of users.
   - **Scope:** Two latest versions of browsers: Google Chrome, Mozilla Firefox, Safari.
   - **Responsibility:** QA.

## 4. Test Scenarios (High-Level Examples)

Below are example scenarios for key modules. Each scenario will be expanded into detailed test cases (positive and negative).

| Module                  | Positive Scenario (Happy Path)                                                                                                         | Negative Scenario                                                                                                           |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**      | User successfully registers, verifies email, logs in, and logs out.                                                                    | User tries to log in without email verification. Registration with an existing email is impossible.                         |
| **Project Management**  | User creates a project with a unique prefix, edits its name, and then deletes it.                                                      | Attempt to create a project with an existing prefix fails. Attempt to edit the prefix is impossible.                        |
| **Language Management** | User adds a new language (e.g., "pl-PL"), which creates empty translations for all keys.                                               | Attempt to add an incorrect BCP-47 code (e.g., "polish") is blocked. Attempt to delete the default language is impossible.  |
| **Key Management**      | User adds a new key with value in the default language. The key appears on the list.                                                   | Attempt to add a key with invalid format (e.g., `key..with..dots`) fails validation.                                        |
| **LLM Translations**    | User initiates translation for all missing keys to Polish. Progress modal shows status, and completed translations appear in the view. | System correctly handles `429 Too Many Requests` error from LLM API, showing appropriate message to the user.               |
| **Export**              | User clicks the export button and downloads a ZIP archive containing `en.json` and `pl.json` files with correct structure.             | Attempt to export a project without languages (beyond default) is possible, but generates ZIP with only one JSON file.      |
| **Security (RLS)**      | User A, after logging in, sees only their own projects.                                                                                | User A, knowing User B's project ID, tries to access it via API and receives `403 Forbidden / PROJECT_ACCESS_DENIED` error. |

## 5. Test Environment

- **Local:** Each developer runs a local Supabase instance (via `npm run supabase:start`) for conducting unit and integration tests.
- **CI/CD (GitHub Actions):** On each Pull Request, the following are automatically run:
  - Static analysis (linting, type checking).
  - Unit and integration tests (`npm run test`).
  - E2E tests (Playwright).
- **Staging (Cloudflare Pages):** Each Pull Request can be automatically deployed to a unique preview URL, enabling manual and exploratory testing before merging.
- **Pre-production (Docker + DigitalOcean):** Environment reflecting production configuration, used for final regression testing before deploying a new version.

## 6. Testing Tools

- **Test framework:** Vitest
- **Helper libraries:** Testing Library
- **Code coverage reporting:** `@vitest/coverage-v8`
- **E2E tests:** Playwright (Chromium only)
- **Static analysis:** ESLint, TypeScript
- **CI/CD:** GitHub Actions

## 7. Test Implementation Guide

### 7.1. Unit Tests (Vitest + Testing Library)

**Configuration:**

- **Framework:** Vitest 3.2.4 with jsdom environment
- **Coverage:** V8 provider with 90% thresholds (enabled)
- **Setup:** `src/test/setup.ts` - mocks environment variables and suppresses console output
- **Location:** Co-located with source files (`Component.test.tsx` next to `Component.tsx`)

**Test Utilities:**
Available in `src/test/utils/`:

- `createTestWrapper()` - Reusable QueryClient wrapper for testing hooks
- `renderWithProviders()` - Custom render function with all providers
- `createMockSupabaseClient()` - Mock Supabase client factory
- `wait()` - Promise-based delay utility
- Mock data generators and fixtures

**Commands:**

```bash
npm run test              # Run all unit tests
npm run test:watch        # Run tests in watch mode
npm run test:ui           # Open Vitest UI
npm run test:coverage     # Run tests with coverage report
```

**Best Practices:**

- Use `screen` from Testing Library (don't destructure from render)
- Follow query priority: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last resort)
- Use `findBy*` for async elements, `getBy*` for immediate elements, `queryBy*` only for non-existence assertions
- Use `@testing-library/user-event` instead of `fireEvent`
- Use jest-dom matchers: `toBeDisabled()`, `toBeInTheDocument()`, `toHaveTextContent()`
- Test user-visible behavior, not implementation details

**Example:**

```typescript
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { MyComponent } from './MyComponent';

test('should display welcome message', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
});
```

### 7.2. E2E Tests (Playwright)

**Configuration:**

- **Browser:** Chromium/Desktop Chrome only (per guidelines)
- **Config file:** `playwright.config.ts`
- **Test directory:** `tests/e2e/`
- **Base URL:** http://localhost:5173
- **Traces:** On first retry
- **Screenshots/Videos:** On failure

**Test Structure:**

```
tests/e2e/
├── [feature]/
│   ├── [feature].spec.ts          # Feature-specific test suites
│   └── [additional-tests].spec.ts # Additional test files as needed
├── pages/
│   ├── [feature]/
│   │   ├── PageObject.ts          # Page Object Model classes
│   │   └── ComponentObject.ts     # Component-specific page objects
│   └── index.ts                   # Central export of all page objects
└── fixtures/
    └── test-data.ts               # Test data, constants, and utilities
```

**Commands:**

```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Open Playwright UI
npm run test:e2e:debug    # Run E2E tests in debug mode
```

**Best Practices:**

- Use browser contexts for test isolation
- Implement Page Object Model for maintainable tests
- Use locators for resilient element selection (prefer `getByRole`, `getByLabel`)
- Leverage API testing for backend validation
- Use `expect(page).toHaveScreenshot()` for visual comparison
- Use codegen tool for test recording: `npx playwright codegen http://localhost:5173`
- Use trace viewer for debugging: `npx playwright show-trace`
- Implement test hooks (beforeEach, afterEach) for setup and teardown

**Fixtures:**
Test data and credentials are defined in `tests/e2e/fixtures/test-data.ts`:

- `TEST_USERS.validUser` - Valid user credentials (from .env)
- `TEST_USERS.invalidUser` - Invalid credentials for error testing
- `TEST_DATA.sampleProject` - Sample project data
- Additional test constants and utilities

**Example:**

```typescript
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill(TEST_USERS.validUser.email);
    await page.getByLabel(/password/i).fill(TEST_USERS.validUser.password);
    await page.getByRole('button', { name: /log in/i }).click();

    await page.waitForURL('/projects');
    await expect(page).toHaveURL('/projects');
  });
});
```

### 7.3. Test Coverage Requirements

**Coverage Thresholds (90%):**

- Branches: 90%
- Functions: 90%
- Lines: 90%
- Statements: 90%

**Excluded from Coverage:**

- Configuration files (eslint, prettier, vite, vitest)
- Environment definitions
- Database type definitions (database.types.ts)
- Index files (barrel exports)
- Node modules and dist folder

**Coverage Reports:**

- Format: text-summary, html, lcov
- Location: `coverage/` directory (gitignored)
- CI/CD: Coverage report uploaded as artifact

### 7.4. CI/CD Integration

**GitHub Actions Workflow:**

1. Static analysis (ESLint, TypeScript)
2. Unit tests with coverage (`npm run test:coverage`)
3. E2E tests (`npm run test:e2e`)
4. Build verification (`npm run build`)

**Pull Request Requirements:**

- All tests must pass
- Coverage thresholds must be met
- No ESLint errors
- Type checking must pass

### 7.5. Test Data Management

**Unit Tests:**

- Use mock data from `src/test/utils/test-data.ts`
- Mock Supabase client using `createMockSupabaseClient()`
- Environment variables mocked in `src/test/setup.ts`

**E2E Tests:**

- Use test credentials from `.env` (E2E_USERNAME, E2E_PASSWORD)
- Test fixtures in `tests/e2e/fixtures/test-data.ts`
- Database state managed by Supabase local instance
- Consider using `beforeAll` hooks to seed test data

### 7.6. Debugging Tests

**Unit Tests:**

```bash
# Run specific test file
npm run test -- MyComponent.test.tsx

# Run tests matching pattern
npm run test -- -t "should display welcome message"

# Open Vitest UI for visual debugging
npm run test:ui

# Run with debug output
DEBUG=* npm run test
```

**E2E Tests:**

```bash
# Run specific test file
npm run test:e2e -- login.spec.ts

# Run with UI mode for visual debugging
npm run test:e2e:ui

# Run with debug mode (pause execution)
npm run test:e2e:debug

# View trace for failed test
npx playwright show-trace trace.zip
```
