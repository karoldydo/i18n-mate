# REST API Plan - i18n-mate

## Overview

This API plan leverages Supabase's built-in PostgREST API for standard CRUD operations and Supabase Edge Functions for complex business logic. Authentication is handled by Supabase Auth with email verification required before session creation.

**Base URL:** `https://<project-ref>.supabase.co`

**API Conventions:**

- All endpoints require authentication unless explicitly marked as public
- Timestamps in ISO 8601 format (UTC)
- Pagination: cursor-based or offset-based with `limit` and `offset` params
- Case-insensitive search via `ilike` operator
- RLS policies enforce owner-based access control

---

## 1. Resources

| Resource              | Database Table          | Description                                          |
| --------------------- | ----------------------- | ---------------------------------------------------- |
| Projects              | `projects`              | Translation projects owned by users                  |
| Project Locales       | `project_locales`       | Languages assigned to projects                       |
| Keys                  | `keys`                  | Translation keys (created in default language only)  |
| Translations          | `translations`          | Translation values for (project, key, locale) tuples |
| Translation Jobs      | `translation_jobs`      | LLM translation job tracking                         |
| Translation Job Items | `translation_job_items` | Individual keys within a translation job             |
| Telemetry Events      | `telemetry_events`      | Application telemetry for analytics                  |

---

## 2. Authentication Endpoints

### 2.1 Sign Up

[See details →](./specifications/authentication/2.1-authentication-signup.md)

Register new user account. Sends verification email. No session created until email verified.

### 2.2 Resend Verification Email

[See details →](./specifications/authentication/2.2-authentication-resend-verification.md)

Resend verification email for unverified accounts.

### 2.3 Verify Email

[See details →](./specifications/authentication/2.3-authentication-verify-email.md)

Verify email using token from verification email.

### 2.4 Sign In

[See details →](./specifications/authentication/2.4-authentication-signin.md)

Login with email and password. Requires verified email.

### 2.5 Sign Out

[See details →](./specifications/authentication/2.5-authentication-signout.md)

Invalidate current session.

### 2.6 Request Password Reset

[See details →](./specifications/authentication/2.6-authentication-request-password-reset.md)

Send password reset link to user email.

### 2.7 Reset Password

[See details →](./specifications/authentication/2.7-authentication-reset-password.md)

Set new password using reset token.

---

## 3. Projects Endpoints

### 3.1 List Projects

[See details →](./specifications/projects/3.1-projects-list.md)

Get paginated list of user's projects sorted by name (ascending).

### 3.2 Get Project Details

[See details →](./specifications/projects/3.2-projects-get-details.md)

Get single project by ID.

### 3.3 Create Project

[See details →](./specifications/projects/3.3-projects-create.md)

Create new project with default locale. Auto-creates default locale in project_locales.

### 3.4 Update Project

[See details →](./specifications/projects/3.4-projects-update.md)

Update project name and/or description. Cannot change prefix or default_locale (immutable).

### 3.5 Delete Project

[See details →](./specifications/projects/3.5-projects-delete.md)

Delete project and all related data (cascading delete).

---

## 4. Project Locales Endpoints

### 4.1 List Project Locales

[See details →](./specifications/locales/4.1-locales-list.md)

Get all locales for a project.

### 4.2 Add Locale to Project

[See details →](./specifications/locales/4.2-locales-add-atomic.md)

Add new locale to project. Triggers fan-out: creates NULL translations for all existing keys.

### 4.3 Update Locale Label

[See details →](./specifications/locales/4.3-locales-update-label.md)

Update locale label only. Cannot change locale code.

### 4.4 Delete Locale

[See details →](./specifications/locales/4.4-locales-delete.md)

Remove locale from project. Cannot delete default locale.

---

## 5. Keys Endpoints

### 5.1 List Keys (Default Language View)

[See details →](./specifications/keys/5.1-keys-list-default-view.md)

List keys with default locale values and missing counts. Supports search and missing filter.

### 5.2 List Keys (Per-Language View)

[See details →](./specifications/keys/5.2-keys-list-per-language-view.md)

List keys with values for selected locale. Supports search and missing filter.

### 5.3 Create Key with Default Value

[See details →](./specifications/keys/5.3-keys-create.md)

Create key in default language with initial value. Triggers fan-out to all locales.

### 5.4 Delete Key

[See details →](./specifications/keys/5.4-keys-delete.md)

Delete key and all translations (cascading). Irreversible.

---

## 6. Translations Endpoints

### 6.1 Update Translation (Inline Edit)

[See details →](./specifications/translations/6.1-translations-update.md)

Update translation value (autosave). Updates metadata.

### 6.2 Bulk Update Translations

[See details →](./specifications/translations/6.2-translations-bulk-update.md)

Update multiple translations at once (batch operation). Used internally by translation jobs.

---

## 7. Translation Jobs Endpoints

### 7.1 Check Active Job

[See details →](./specifications/translation-jobs/7.1-translation-jobs-check-active.md)

Check if project has active translation job.

### 7.2 List Translation Jobs

[See details →](./specifications/translation-jobs/7.2-translation-jobs-list.md)

Get translation job history for project.

### 7.3 Create Translation Job

[See details →](./specifications/translation-jobs/7.3-translation-jobs-create.md)

Create and execute LLM translation job (Supabase Edge Function).

### 7.4 Cancel Translation Job

[See details →](./specifications/translation-jobs/7.4-translation-jobs-cancel.md)

Cancel running translation job.

### 7.5 Get Job Items

[See details →](./specifications/translation-jobs/7.5-translation-jobs-get-items.md)

Get detailed item-level status for translation job.

---

## 8. Export Endpoint

### 8.1 Export Project Translations

[See details →](./specifications/export/8.1-export-translations.md)

Export all translations as ZIP with `{locale}.json` files (Supabase Edge Function).

---

## 9. Telemetry Endpoints

### 9.1 Get Project Telemetry

[See details →](./specifications/telemetry/9.1-telemetry-get.md)

Get telemetry events for project (owner or service_role only).

**Note:** Telemetry events are created **automatically** by database triggers and RPC functions. There is no manual POST endpoint. Events are emitted when:

- Projects are created (via `create_project_with_default_locale` RPC)
- Locales are added (via `emit_language_added_event_trigger` trigger)
- Keys are created (via `emit_key_created_event_trigger` trigger)
- Translations are completed (via Edge Function during LLM translation)

---

## 10. Helper RPC Functions

The following PostgreSQL functions are exposed via PostgREST for complex queries:

### 10.1 `list_projects_with_counts(limit, offset)`

Returns projects with `locale_count` and `key_count` aggregated fields.

### 10.2 `list_project_locales_with_default(project_id)`

Returns locales with `is_default` boolean field.

### 10.3 `list_keys_default_view(project_id, search, missing_only, limit, offset)`

Returns keys with default locale values and missing counts.

### 10.4 `list_keys_per_language_view(project_id, locale, search, missing_only, limit, offset)`

Returns keys with values for specified locale and metadata.

### 10.5 `create_key_with_value(project_id, full_key, default_value)`

Atomically creates key with default locale value and fans out to other locales.

---

## 11. Authentication and Authorization

### 11.1 Authentication Method

**Supabase Auth JWT**

- All endpoints (except public auth endpoints) require `Authorization: Bearer <jwt-token>` header
- Tokens expire after 1 hour; use refresh token to obtain new access token
- Email verification required before session creation (`email_confirmed_at` must be non-null)

### 11.2 Authorization Model

**Row-Level Security (RLS)**

- All tables have RLS enabled
- Policies enforce owner-based access: `owner_user_id = auth.uid()`
- Nested resources (locales, keys, translations) authorized via project ownership
- Service role bypasses RLS (used by Edge Functions for system operations)

### 11.3 RLS Policy Summary

| Table                   | Policy                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `projects`              | User can only access own projects                                  |
| `project_locales`       | User can access locales for own projects                           |
| `keys`                  | User can access keys for own projects                              |
| `translations`          | User can access translations for own projects                      |
| `translation_jobs`      | User can access jobs for own projects                              |
| `translation_job_items` | User can access items for jobs in own projects                     |
| `telemetry_events`      | User can SELECT own project events; INSERT handled by triggers/RPC |

---

## 12. Validation and Business Logic

### 12.1 Global Validation Rules

**Locale Codes:**

- Format: BCP-47 subset (`ll` or `ll-CC`)
- Regex: `^[a-z]{2}(-[A-Z]{2})?$`
- Normalization: language lowercase, REGION uppercase (via trigger)
- Reject: script, variant, extension sub-tags

**Key Names:**

- Format: `[a-z0-9._-]` (lowercase, alphanumeric, dot, underscore, hyphen)
- Max length: 256 chars
- Must start with project's `prefix + "."`
- No double dots (`..`)
- No trailing dot
- Unique per project

**Translation Values:**

- Max length: 250 chars
- No newline characters
- Empty strings converted to NULL (except default locale)
- Auto-trimmed whitespace
- Default locale: value cannot be NULL or empty

**Project Prefix:**

- Length: 2-4 chars
- Format: `[a-z0-9._-]`
- No trailing dot
- Unique per owner
- Immutable after creation

### 12.2 Business Logic Rules

**Immutability:**

- Project `prefix` - cannot be changed (trigger enforces)
- Project `default_locale` - cannot be changed (trigger enforces)
- Locale `locale` field - cannot be changed after creation

**Cascading Rules:**

- Delete project → delete all related data
- Delete key → delete all translations for that key
- Delete locale → delete all translations for that locale (blocked if default)

**Fan-Out Logic:**

- Create key → auto-create NULL translations for all non-default locales
- Add locale → auto-create NULL translations for all existing keys

**Translation Job Constraints:**

- Only one active (`pending` or `running`) job per project (trigger enforces)
- Source locale must equal project's default locale (trigger enforces)
- Target locale cannot equal source locale (CHECK constraint)
- Target locale must exist in project's locales

**Default Locale Protection:**

- Cannot delete default locale from project (trigger prevents)
- Cannot change project's default locale (trigger prevents)
- Default locale translations cannot have NULL or empty values (trigger enforces)

### 12.3 Error Handling

**Client Errors (4xx):**

- `400 Bad Request` - Validation failure, malformed request
- `401 Unauthorized` - Missing, invalid, or expired auth token
- `403 Forbidden` - RLS policy denial, email not verified
- `404 Not Found` - Resource not found or no access
- `409 Conflict` - Unique constraint violation, optimistic lock failure, active job exists
- `422 Unprocessable Entity` - Semantic validation failure (e.g., cannot delete default locale)

**Server Errors (5xx):**

- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - OpenRouter API unavailable, rate limit exceeded

**Error Response Format:**

```json
{
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "length",
      "field": "prefix"
    },
    "message": "Prefix must be 2-4 characters"
  }
}
```

### 12.4 Rate Limiting

**Supabase PostgREST:**

- Default: None (managed by Supabase tier limits)
- Recommendation: Implement application-level rate limiting in Edge Functions

**OpenRouter API:**

- Rate limits per provider/model
- Edge Function handles 429 responses:
  - Mark job item as `failed` with `error_code = 'rate_limit'`
  - Implement exponential backoff (optional)
  - Continue with next items

### 12.5 Optimistic Locking

**Pattern for Concurrent Edits:**

When updating translations, include `updated_at` timestamp in WHERE clause:

```http
PATCH /rest/v1/translations?project_id=eq.{uuid}&key_id=eq.{uuid}&locale=eq.pl&updated_at=eq.2025-01-15T10:20:00Z
Content-Type: application/json

{
  "value": "New value"
}
```

If no rows affected (0 rows updated), return `409 Conflict`:

```json
{
  "error": {
    "code": "conflict",
    "message": "Translation was modified by another user. Please refresh and try again."
  }
}
```

Client must refetch and retry.

---

## 13. Performance Considerations

### 13.1 Indexing Strategy

All queries leverage indexes defined in schema:

- Trigram index for key search (`idx_keys_full_key_trgm`)
- Composite indexes for list views (`idx_translations_project_locale`)
- Partial index for missing translations (`idx_translations_missing`)
- Partial index for active jobs (`idx_translation_jobs_project_status`)

### 13.2 Pagination Best Practices

**Offset Pagination:**

- Default: `limit=50`, `offset=0`
- Max limit: 100 items per page
- Use `Content-Range` header to communicate total count

**Cursor Pagination (Recommended for large datasets):**

- Use `created_at` or `id` as cursor
- More efficient than offset for deep pagination
- Example: `GET /rest/v1/keys?project_id=eq.{uuid}&created_at=gt.2025-01-15T10:00:00Z&limit=50`

### 13.3 Query Optimization

**Batch Operations:**

- Use bulk update for translation jobs (in operator)
- Limit batch size to 100-500 items per request

**Caching:**

- Cache project metadata (locales, key counts) client-side (TTL: 5 min)
- Cache export ZIP server-side (TTL: 5 min, invalidate on translation update)
- Use TanStack Query's built-in caching for list views

**Realtime (Optional):**

- Subscribe to translation job updates via Supabase Realtime
- Channel: `translation_jobs:project_id=eq.{uuid}`
- Events: `UPDATE` when status changes

---

## 14. Security Considerations

### 14.1 Input Validation

All inputs validated at multiple layers:

1. Client-side (React form validation)
2. API layer (Zod schemas in Edge Functions)
3. Database layer (CHECK constraints, triggers)

### 14.2 SQL Injection Prevention

- Supabase PostgREST uses parameterized queries (no SQL injection risk)
- Edge Functions use Supabase client with prepared statements

### 14.3 XSS Prevention

- All user-generated content (project names, descriptions, translation values) sanitized
- Frontend escapes output in JSX (React default behavior)

### 14.4 Authentication Security

- JWT tokens in `Authorization` header only (not in URL params or cookies)
- Email verification required before session creation
- Password reset tokens expire after 1 hour
- Refresh tokens stored securely (httpOnly cookies recommended)

### 14.5 Rate Limiting (Recommendations)

Implement in Edge Functions:

- Auth endpoints: 5 req/min per IP
- Mutation endpoints: 100 req/min per user
- Translation jobs: 1 active job per project
- Export: 10 req/hour per project

---

## 15. Edge Function Endpoints Summary

Custom Supabase Edge Functions for complex operations:

| Endpoint                            | Method | Description                            |
| ----------------------------------- | ------ | -------------------------------------- |
| `/functions/v1/translate`           | POST   | Create and execute LLM translation job |
| `/functions/v1/export-translations` | GET    | Export project translations as ZIP     |

**Note:** Standard CRUD operations use Supabase PostgREST (`/rest/v1/*`). Edge Functions are reserved for:

- LLM integration (OpenRouter API calls)
- Complex file generation (ZIP export)
- Multi-step transactional operations
- Operations requiring service_role privileges

---

## 16. API Versioning

**Current Version:** v1

**Versioning Strategy:**

- Supabase PostgREST: `/rest/v1/*`
- Supabase Auth: `/auth/v1/*`
- Edge Functions: `/functions/v1/*`

**Breaking Changes:**

- Introduce new version path (`/rest/v2/*`)
- Maintain backward compatibility for 6 months
- Deprecation warnings in response headers

---

## 17. Testing Recommendations

### 17.1 Unit Tests

Test database functions and triggers:

- Locale normalization
- Fan-out logic
- Validation triggers
- Immutability enforcement

### 17.2 Integration Tests

Test API endpoints:

- Auth flows (signup, verify, login, password reset)
- CRUD operations with RLS
- Translation job lifecycle
- Export generation

### 17.3 E2E Tests (Optional)

Test complete workflows:

- Create project → add locales → add keys → translate → export
- Concurrent editing with optimistic locking
- Error handling (429 from OpenRouter, invalid inputs)

---

## 18. Monitoring and Observability

### 18.1 Metrics to Track

- API response times (p50, p95, p99)
- Translation job success rate
- OpenRouter API errors (429, 5xx)
- Average autosave time
- Export generation time

### 18.2 Logging

- Edge Function logs (Deno Deploy / Supabase Logs)
- Database query logs (slow queries >1s)
- OpenRouter API requests/responses
- Authentication failures

### 18.3 Alerts

- Translation job failure rate >5%
- OpenRouter API error rate >1%
- Database query time >2s
- Export generation time >30s

---

## Appendix A: Sample API Workflow

**Complete User Journey: Create Project and Translate**

```http
# 1. Sign Up
POST /auth/v1/signup
{
  "email": "user@example.com",
  "password": "securePassword123"
}
# Response: 200 OK, session=null

# 2. Verify Email (click link in email)
GET /auth/v1/verify?token={token}&type=signup
# Response: 200 OK, email verified

# 3. Sign In
POST /auth/v1/token?grant_type=password
{
  "email": "user@example.com",
  "password": "securePassword123"
}
# Response: 200 OK, returns access_token

# 4. Create Project (with Authorization header)
POST /rest/v1/rpc/create_project_with_default_locale
{
  "name": "My App",
  "prefix": "app",
  "default_locale": "en",
  "default_locale_label": "English"
}
# Response: 201 Created, returns project_id

# 5. Add Locale
POST /rest/v1/project_locales
{
  "project_id": "{uuid}",
  "locale": "pl",
  "label": "Polski"
}
# Response: 201 Created

# 6. Create Key
POST /rest/v1/rpc/create_key_with_value
{
  "p_project_id": "{uuid}",
  "p_full_key": "app.home.title",
  "p_default_value": "Welcome Home"
}
# Response: 201 Created, returns key_id

# 7. Translate to Polish
POST /functions/v1/translate
{
  "project_id": "{uuid}",
  "target_locale": "pl",
  "mode": "all"
}
# Response: 202 Accepted, returns job_id

# 8. Poll Job Status
GET /rest/v1/translation_jobs?id=eq.{job_id}
# Response: 200 OK, status=running → status=completed

# 9. Export Translations
GET /functions/v1/export-translations?project_id={uuid}
# Response: 200 OK, returns ZIP file
```

---

## Appendix B: OpenRouter Integration Details

**OpenRouter API Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Authentication:** `Authorization: Bearer {OPENROUTER_API_KEY}`

**Request Format:**

```json
{
  "max_tokens": 256,
  "messages": [
    {
      "content": "You are a professional translator. Translate the following text from English to Polish. Return ONLY the translated text, no explanations.",
      "role": "system"
    },
    {
      "content": "Welcome Home",
      "role": "user"
    }
  ],
  "model": "google/gemini-2.5-flash-lite",
  "temperature": 0.3
}
```

**Response Format:**

```json
{
  "choices": [
    {
      "finish_reason": "stop",
      "message": {
        "content": "Witaj w domu",
        "role": "assistant"
      }
    }
  ],
  "id": "gen-xxx",
  "model": "google/gemini-2.5-flash-lite",
  "usage": {
    "completion_tokens": 8,
    "prompt_tokens": 45,
    "total_tokens": 53
  }
}
```

**Error Handling:**

- `429 Too Many Requests` - Rate limit, retry with exponential backoff
- `503 Service Unavailable` - Provider unavailable, fail job
- `400 Bad Request` - Invalid params, log and skip item

---

## Appendix C: Database Migration Order

1. Extensions and domains (`20251013143000_create_extensions_domains_enums.sql`)
2. Tables (`20251013143100_create_tables.sql`)
3. Indexes (`20251013143200_create_indexes.sql`)
4. Triggers and functions (`20251013143300_create_triggers_and_functions.sql`)
5. RLS policies (`20251013143400_create_rls_policies.sql`)
6. Helper functions (`20251013143500_create_helper_functions.sql`)
7. Telemetry partition automation (`20251013143600_setup_telemetry_partition_automation.sql`)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Author:** API Architecture Team
