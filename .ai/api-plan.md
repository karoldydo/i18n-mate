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

**Endpoint:** `POST /auth/v1/signup`  
**Description:** Register new user account. Sends verification email. **No session created until email verified.**  
**Authentication:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**

```json
{
  "session": null,
  "user": {
    "created_at": "2025-01-15T10:00:00Z",
    "email": "user@example.com",
    "email_confirmed_at": null,
    "id": "uuid"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid email or weak password
- `422 Unprocessable Entity` - Email already registered

**Validation:**

- Email: valid format
- Password: minimum 8 characters

---

### 2.2 Resend Verification Email

**Endpoint:** `POST /auth/v1/resend`  
**Description:** Resend verification email for unverified accounts  
**Authentication:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "type": "signup"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Verification email sent"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid email
- `404 Not Found` - Email not registered
- `422 Unprocessable Entity` - Email already verified

---

### 2.3 Verify Email

**Endpoint:** `GET /auth/v1/verify?token={token}&type=signup`  
**Description:** Verify email using token from verification email  
**Authentication:** Public

**Success Response (200 OK):**

```json
{
  "user": {
    "email": "user@example.com",
    "email_confirmed_at": "2025-01-15T10:05:00Z",
    "id": "uuid"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid or expired token
- `404 Not Found` - Token not found

---

### 2.4 Sign In

**Endpoint:** `POST /auth/v1/token?grant_type=password`  
**Description:** Login with email and password. **Requires verified email.**  
**Authentication:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**

```json
{
  "access_token": "jwt-token",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "token_type": "bearer",
  "user": {
    "email": "user@example.com",
    "email_confirmed_at": "2025-01-15T10:05:00Z",
    "id": "uuid"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid credentials
- `403 Forbidden` - Email not verified

---

### 2.5 Sign Out

**Endpoint:** `POST /auth/v1/logout`  
**Description:** Invalidate current session  
**Authentication:** Required (Bearer token)

**Success Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or expired token

---

### 2.6 Request Password Reset

**Endpoint:** `POST /auth/v1/recover`  
**Description:** Send password reset link to user email  
**Authentication:** Public

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Password reset email sent"
}
```

**Note:** Returns success even if email not found (security best practice)

---

### 2.7 Reset Password

**Endpoint:** `PUT /auth/v1/user`  
**Description:** Set new password using reset token  
**Authentication:** Required (reset token from email)

**Request Body:**

```json
{
  "password": "newSecurePassword123"
}
```

**Success Response (200 OK):**

```json
{
  "user": {
    "email": "user@example.com",
    "id": "uuid"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Weak password
- `401 Unauthorized` - Invalid or expired token

---

## 3. Projects Endpoints

### 3.1 List Projects

**Endpoint:** `GET /rest/v1/projects`  
**Description:** Get paginated list of user's projects sorted by name (ascending)  
**Authentication:** Required

**Query Parameters:**

- `select` - Columns to return (default: `id,name,description,prefix,default_locale,created_at,updated_at`)
- `limit` - Items per page (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)
- `order` - Sort order (default: `name.asc`)

**Example Request:**

```
GET /rest/v1/projects?select=id,name,default_locale,created_at&limit=50&offset=0&order=name.asc
```

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "default_locale": "en",
    "description": "Main application translations",
    "id": "uuid",
    "name": "My App",
    "prefix": "app",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

**Headers:**

- `Content-Range: 0-49/120` - Pagination info

**Error Responses:**

- `401 Unauthorized` - Missing or invalid auth token
- `400 Bad Request` - Invalid query parameters

**Business Logic:**

- RLS policy filters by `owner_user_id = auth.uid()`
- Use helper query to include counts:

```sql
GET /rest/v1/rpc/list_projects_with_counts?limit=50&offset=0
```

Returns projects with `locale_count` and `key_count` fields.

---

### 3.2 Get Project Details

**Endpoint:** `GET /rest/v1/projects?id=eq.{project_id}&select=*`  
**Description:** Get single project by ID  
**Authentication:** Required

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "default_locale": "en",
    "description": "Main application translations",
    "id": "uuid",
    "name": "My App",
    "owner_user_id": "uuid",
    "prefix": "app",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid auth token
- `404 Not Found` - Project not found or access denied (RLS)

---

### 3.3 Create Project

**Endpoint:** `POST /rest/v1/projects`  
**Description:** Create new project with default locale. Auto-creates default locale in `project_locales`.  
**Authentication:** Required

**Request Body:**

```json
{
  "default_locale": "en",
  "description": "Main application translations",
  "name": "My App",
  "prefix": "app"
}
```

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:00:00Z",
  "default_locale": "en",
  "description": "Main application translations",
  "id": "uuid",
  "name": "My App",
  "owner_user_id": "uuid",
  "prefix": "app",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (see validation rules)
- `409 Conflict` - Project name or prefix already exists for user

**Validation:**

- `name`: required, CITEXT, unique per owner
- `prefix`: required, 2-4 chars, `[a-z0-9._-]`, no trailing dot, unique per owner
- `default_locale`: required, BCP-47 format (ll or ll-CC)
- `description`: optional, max length as per schema

**Post-Creation Logic:**

- Use RPC function `create_project_with_default_locale()` to atomically:
  1. Create project
  2. Insert default locale into `project_locales`
  3. Emit `project_created` telemetry event

---

### 3.4 Update Project

**Endpoint:** `PATCH /rest/v1/projects?id=eq.{project_id}`  
**Description:** Update project name and/or description. **Cannot change prefix or default_locale (immutable).**  
**Authentication:** Required

**Request Body:**

```json
{
  "description": "Updated description",
  "name": "Updated App Name"
}
```

**Success Response (200 OK):**

```json
{
  "default_locale": "en",
  "description": "Updated description",
  "id": "uuid",
  "name": "Updated App Name",
  "prefix": "app",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Attempted to change `prefix` or `default_locale` (trigger prevents)
- `404 Not Found` - Project not found or access denied
- `409 Conflict` - New name conflicts with existing project

**Validation:**

- Only `name` and `description` can be updated
- Trigger `prevent_default_locale_change_trigger` enforces immutability
- Trigger `prevent_prefix_change_trigger` enforces immutability

---

### 3.5 Delete Project

**Endpoint:** `DELETE /rest/v1/projects?id=eq.{project_id}`  
**Description:** Delete project and all related data (cascading delete)  
**Authentication:** Required

**Success Response (204 No Content)**

**Error Responses:**

- `404 Not Found` - Project not found or access denied
- `401 Unauthorized` - Missing or invalid auth token

**Business Logic:**

- Cascade deletes all related records:
  - `project_locales`
  - `keys`
  - `translations`
  - `translation_jobs`
  - `translation_job_items`
  - `telemetry_events`

---

## 4. Project Locales Endpoints

### 4.1 List Project Locales

**Endpoint:** `GET /rest/v1/project_locales?project_id=eq.{project_id}&select=*`  
**Description:** Get all locales for a project  
**Authentication:** Required

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "id": "uuid",
    "label": "English",
    "locale": "en",
    "project_id": "uuid",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  {
    "created_at": "2025-01-15T10:05:00Z",
    "id": "uuid",
    "label": "Polski",
    "locale": "pl",
    "project_id": "uuid",
    "updated_at": "2025-01-15T10:05:00Z"
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid auth token
- `403 Forbidden` - Project not owned by user (RLS)

**Business Logic:**

- Include flag for default locale: join with `projects` table
- Use helper query:

```sql
GET /rest/v1/rpc/list_project_locales_with_default?project_id={uuid}
```

Returns locales with `is_default` boolean field.

---

### 4.2 Add Locale to Project

**Endpoint:** `POST /rest/v1/project_locales`  
**Description:** Add new locale to project. **Triggers fan-out: creates NULL translations for all existing keys.**  
**Authentication:** Required

**Request Body:**

```json
{
  "label": "Polski",
  "locale": "pl",
  "project_id": "uuid"
}
```

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:05:00Z",
  "id": "uuid",
  "label": "Polski",
  "locale": "pl",
  "project_id": "uuid",
  "updated_at": "2025-01-15T10:05:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid locale format (must be ll or ll-CC)
- `409 Conflict` - Locale already exists for project
- `403 Forbidden` - Project not owned by user

**Validation:**

- `locale`: BCP-47 format (ll or ll-CC only), normalized via trigger
- `label`: required, max 64 chars
- Trigger `normalize_locale_trigger` normalizes to lowercase-language / UPPERCASE-REGION

**Business Logic:**

- Trigger `fan_out_translations_on_locale_insert_trigger` creates translation records:
  - For all existing keys in project
  - With `value = NULL` (missing)
  - With `updated_source = 'user'`
- Emit `language_added` telemetry event with `locale_count` in properties

---

### 4.3 Update Locale Label

**Endpoint:** `PATCH /rest/v1/project_locales?id=eq.{locale_id}`  
**Description:** Update locale label only. **Cannot change locale code.**  
**Authentication:** Required

**Request Body:**

```json
{
  "label": "Polish (Poland)"
}
```

**Success Response (200 OK):**

```json
{
  "id": "uuid",
  "label": "Polish (Poland)",
  "locale": "pl",
  "project_id": "uuid",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

**Error Responses:**

- `404 Not Found` - Locale not found or access denied
- `400 Bad Request` - Attempted to change `locale` field

**Validation:**

- Only `label` field can be updated

---

### 4.4 Delete Locale

**Endpoint:** `DELETE /rest/v1/project_locales?id=eq.{locale_id}`  
**Description:** Remove locale from project. **Cannot delete default locale.**  
**Authentication:** Required

**Success Response (204 No Content)**

**Error Responses:**

- `400 Bad Request` - Attempted to delete default locale (trigger prevents)
- `404 Not Found` - Locale not found or access denied

**Business Logic:**

- Trigger `prevent_default_locale_delete_trigger` blocks deletion if locale is project's default
- Cascade deletes all translations for this locale

---

## 5. Keys Endpoints

### 5.1 List Keys (Default Language View)

**Endpoint:** `GET /rest/v1/rpc/list_keys_default_view`  
**Description:** List keys with default locale values and missing counts. Supports search and missing filter.  
**Authentication:** Required

**Query Parameters:**

- `project_id` - Project UUID (required)
- `search` - Search term for key name (optional, case-insensitive contains)
- `missing_only` - Filter keys with missing translations (optional, boolean)
- `limit` - Items per page (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)

**Example Request:**

```
GET /rest/v1/rpc/list_keys_default_view?project_id={uuid}&search=button&missing_only=false&limit=50&offset=0
```

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:00:00Z",
    "full_key": "app.home.title",
    "id": "uuid",
    "missing_count": 2,
    "value": "Welcome Home"
  },
  {
    "created_at": "2025-01-15T10:01:00Z",
    "full_key": "app.home.subtitle",
    "id": "uuid",
    "missing_count": 0,
    "value": "Get started now"
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid auth token
- `403 Forbidden` - Project not owned by user

**Business Logic:**

- Query uses trigram index `idx_keys_full_key_trgm` for search performance
- `missing_count` is computed via subquery counting NULL translations
- Default sort: `full_key ASC`

---

### 5.2 List Keys (Per-Language View)

**Endpoint:** `GET /rest/v1/rpc/list_keys_per_language_view`  
**Description:** List keys with values for selected locale. Supports search and missing filter.  
**Authentication:** Required

**Query Parameters:**

- `project_id` - Project UUID (required)
- `locale` - Target locale code (required)
- `search` - Search term for key name (optional)
- `missing_only` - Filter keys with NULL values in selected locale (optional, boolean)
- `limit` - Items per page (default: 50)
- `offset` - Pagination offset (default: 0)

**Example Request:**

```
GET /rest/v1/rpc/list_keys_per_language_view?project_id={uuid}&locale=pl&missing_only=true&limit=50&offset=0
```

**Success Response (200 OK):**

```json
[
  {
    "full_key": "app.home.title",
    "id": "uuid",
    "is_machine_translated": false,
    "key_id": "uuid",
    "updated_at": "2025-01-15T10:05:00Z",
    "updated_by_user_id": null,
    "updated_source": "user",
    "value": null
  },
  {
    "full_key": "app.home.cta",
    "id": "uuid",
    "is_machine_translated": true,
    "key_id": "uuid",
    "updated_at": "2025-01-15T10:20:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Rozpocznij teraz"
  }
]
```

**Error Responses:**

- `400 Bad Request` - Missing required parameters or invalid locale
- `403 Forbidden` - Project not owned by user

**Business Logic:**

- Uses `idx_translations_missing` for efficient missing filter
- Metadata fields show translation provenance (manual vs LLM)

---

### 5.3 Create Key with Default Value

**Endpoint:** `POST /rest/v1/rpc/create_key_with_value`  
**Description:** Create key in default language with initial value. **Triggers fan-out to all locales.**  
**Authentication:** Required

**Request Body:**

```json
{
  "p_default_value": "Welcome Home",
  "p_full_key": "app.home.title",
  "p_project_id": "uuid"
}
```

**Success Response (201 Created):**

```json
{
  "key_id": "uuid"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (see validation rules)
- `409 Conflict` - Key already exists in project

**Validation:**

- `full_key`: required, max 256 chars, `[a-z0-9._-]`, no spaces, no `..`, no trailing dot
- Must start with project's `prefix` + `.`
- `default_value`: required (not empty), max 250 chars, no newline
- Trigger `validate_key_prefix_trigger` enforces prefix requirement
- Trigger `trim_translation_value_trigger` auto-trims and converts empty to NULL
- Trigger `validate_default_locale_value_trigger` prevents NULL/empty for default locale

**Business Logic:**

- Function `create_key_with_value()` atomically:
  1. Inserts into `keys` table
  2. Inserts default locale translation with `updated_by_user_id = auth.uid()`
  3. Trigger `fan_out_translations_on_key_insert_trigger` creates NULL translations for all other locales
- Emit `key_created` telemetry event

---

### 5.4 Delete Key

**Endpoint:** `DELETE /rest/v1/keys?id=eq.{key_id}`  
**Description:** Delete key and all translations (cascading). **Irreversible.**  
**Authentication:** Required

**Success Response (204 No Content)**

**Error Responses:**

- `404 Not Found` - Key not found or access denied
- `403 Forbidden` - Project not owned by user

**Business Logic:**

- Cascade deletes all translations for this key
- Key name can be immediately reused after deletion

---

## 6. Translations Endpoints

### 6.1 Get Translation

**Endpoint:** `GET /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`  
**Description:** Get single translation record  
**Authentication:** Required

**Success Response (200 OK):**

```json
[
  {
    "is_machine_translated": true,
    "key_id": "uuid",
    "locale": "pl",
    "project_id": "uuid",
    "updated_at": "2025-01-15T10:20:00Z",
    "updated_by_user_id": null,
    "updated_source": "system",
    "value": "Witaj w domu"
  }
]
```

**Error Responses:**

- `404 Not Found` - Translation not found
- `403 Forbidden` - Project not owned by user

---

### 6.2 Update Translation (Inline Edit)

**Endpoint:** `PATCH /rest/v1/translations?project_id=eq.{project_id}&key_id=eq.{key_id}&locale=eq.{locale}`  
**Description:** Update translation value (autosave). **Updates metadata.**  
**Authentication:** Required

**Request Body:**

```json
{
  "is_machine_translated": false,
  "updated_by_user_id": "uuid",
  "updated_source": "user",
  "value": "Witaj w domu"
}
```

**Success Response (200 OK):**

```json
{
  "is_machine_translated": false,
  "key_id": "uuid",
  "locale": "pl",
  "project_id": "uuid",
  "updated_at": "2025-01-15T11:00:00Z",
  "updated_by_user_id": "uuid",
  "updated_source": "user",
  "value": "Witaj w domu"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (empty value for default locale, newline character)
- `404 Not Found` - Translation not found
- `409 Conflict` - Optimistic lock failure (use optimistic locking pattern)

**Validation:**

- `value`: max 250 chars, no newline, empty converted to NULL (except default locale)
- For default locale: value cannot be NULL or empty (trigger enforces)
- Trigger `trim_translation_value_trigger` auto-trims whitespace
- Trigger `validate_default_locale_value_trigger` prevents NULL for default locale

**Optimistic Locking (Recommended):**
Include `updated_at` in WHERE clause to prevent lost updates:

```sql
PATCH /rest/v1/translations?project_id=eq.{uuid}&key_id=eq.{uuid}&locale=eq.pl&updated_at=eq.2025-01-15T10:20:00Z
```

If no rows affected, return 409 Conflict and client must refetch.

---

### 6.3 Bulk Update Translations

**Endpoint:** `PATCH /rest/v1/translations?project_id=eq.{project_id}&locale=eq.{locale}&key_id=in.({key_ids})`  
**Description:** Update multiple translations at once (batch operation)  
**Authentication:** Required

**Request Body:**

```json
{
  "is_machine_translated": true,
  "updated_by_user_id": null,
  "updated_source": "system",
  "value": "Translated text"
}
```

**Success Response (200 OK):**
Returns array of updated records.

**Error Responses:**

- `400 Bad Request` - Validation error
- `403 Forbidden` - Project not owned by user

**Note:** Used internally by translation jobs. Not recommended for manual client calls.

---

## 7. Translation Jobs Endpoints

### 7.1 Check Active Job

**Endpoint:** `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&status=in.(pending,running)&limit=1`  
**Description:** Check if project has active translation job  
**Authentication:** Required

**Success Response (200 OK):**

```json
[
  {
    "completed_keys": 45,
    "created_at": "2025-01-15T10:15:00Z",
    "failed_keys": 2,
    "id": "uuid",
    "mode": "all",
    "project_id": "uuid",
    "source_locale": "en",
    "started_at": "2025-01-15T10:15:00Z",
    "status": "running",
    "target_locale": "pl",
    "total_keys": 100
  }
]
```

**Returns empty array if no active job.**

**Error Responses:**

- `403 Forbidden` - Project not owned by user

**Business Logic:**

- Use `idx_translation_jobs_project_status` for fast lookup
- Frontend polls this endpoint during translation progress

---

### 7.2 List Translation Jobs

**Endpoint:** `GET /rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=20`  
**Description:** Get translation job history for project  
**Authentication:** Required

**Success Response (200 OK):**

```json
[
  {
    "actual_cost_usd": "0.1150",
    "completed_keys": 98,
    "created_at": "2025-01-15T10:00:00Z",
    "estimated_cost_usd": "0.1200",
    "failed_keys": 2,
    "finished_at": "2025-01-15T10:05:00Z",
    "id": "uuid",
    "mode": "all",
    "model": "anthropic/claude-3.5-sonnet",
    "project_id": "uuid",
    "provider": "openrouter",
    "source_locale": "en",
    "started_at": "2025-01-15T10:00:00Z",
    "status": "completed",
    "target_locale": "pl",
    "total_keys": 100
  }
]
```

**Error Responses:**

- `403 Forbidden` - Project not owned by user

---

### 7.3 Create Translation Job

**Endpoint:** `POST /functions/v1/translate`  
**Description:** Create and execute LLM translation job (Supabase Edge Function)  
**Authentication:** Required

**Request Body:**

```json
{
  "key_ids": [],
  "mode": "all",
  "params": {
    "max_tokens": 256,
    "temperature": 0.3
  },
  "project_id": "uuid",
  "target_locale": "pl"
}
```

**Mode Options:**

- `"all"` - Translate all keys (empty `key_ids` array)
- `"selected"` - Translate specific keys (`key_ids` array populated)
- `"single"` - Translate single key (`key_ids` array with one element)

**Success Response (202 Accepted):**

```json
{
  "job_id": "uuid",
  "message": "Translation job created",
  "status": "pending"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (see validation rules)
- `409 Conflict` - Another job already active for this project
- `403 Forbidden` - Project not owned by user

**Validation:**

- `target_locale`: required, must exist in project's locales, **cannot be default locale**
- `mode`: required, one of `all`, `selected`, `single`
- `key_ids`: required for `selected` and `single` modes
- Trigger `validate_source_locale_is_default_trigger` enforces source = default locale
- Trigger `prevent_multiple_active_jobs_trigger` enforces one active job per project

**Business Logic (Edge Function):**

1. Validate request and check for active jobs
2. Create `translation_jobs` record with `status = 'pending'`
3. Create `translation_job_items` records for each key
4. Fetch source (default locale) values for selected keys
5. For each key:
   - Call OpenRouter API with context and LLM params
   - Parse response and validate (max 250 chars, no newline)
   - Update corresponding `translations` record with:
     - `value = <translated_text>`
     - `is_machine_translated = true`
     - `updated_source = 'system'`
     - `updated_by_user_id = NULL`
   - Update `translation_job_items` status (completed/failed)
   - Update job counters: `completed_keys`, `failed_keys`
6. Update job status to `completed` or `failed`
7. Emit `translation_completed` telemetry event
8. Return job summary

**Frontend Polling:**
After receiving 202 response, client polls `GET /rest/v1/translation_jobs?id=eq.{job_id}` every 2 seconds until `status IN ('completed', 'failed', 'cancelled')`.

---

### 7.4 Cancel Translation Job

**Endpoint:** `PATCH /rest/v1/translation_jobs?id=eq.{job_id}`  
**Description:** Cancel running translation job  
**Authentication:** Required

**Request Body:**

```json
{
  "status": "cancelled"
}
```

**Success Response (200 OK):**

```json
{
  "finished_at": "2025-01-15T10:18:00Z",
  "id": "uuid",
  "status": "cancelled"
}
```

**Error Responses:**

- `400 Bad Request` - Job not in cancellable state
- `404 Not Found` - Job not found or access denied

**Business Logic:**

- Can only cancel jobs with `status IN ('pending', 'running')`
- Edge Function checks cancellation flag between API calls
- Partially completed translations are kept

---

### 7.5 Get Job Items

**Endpoint:** `GET /rest/v1/translation_job_items?job_id=eq.{job_id}&select=*,keys(full_key)`  
**Description:** Get detailed item-level status for translation job  
**Authentication:** Required

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:15:00Z",
    "error_code": null,
    "error_message": null,
    "id": "uuid",
    "job_id": "uuid",
    "key_id": "uuid",
    "keys": {
      "full_key": "app.home.title"
    },
    "status": "completed",
    "updated_at": "2025-01-15T10:16:00Z"
  },
  {
    "created_at": "2025-01-15T10:15:00Z",
    "error_code": "rate_limit",
    "error_message": "Rate limit exceeded",
    "id": "uuid",
    "job_id": "uuid",
    "key_id": "uuid",
    "keys": {
      "full_key": "app.home.subtitle"
    },
    "status": "failed",
    "updated_at": "2025-01-15T10:17:00Z"
  }
]
```

**Error Responses:**

- `403 Forbidden` - Job's project not owned by user

**Business Logic:**

- Used for debugging failed translations
- Error codes align with OpenRouter error responses

---

## 8. Export Endpoint

### 8.1 Export Project Translations

**Endpoint:** `GET /functions/v1/export-translations?project_id={project_id}`  
**Description:** Export all translations as ZIP with `{locale}.json` files (Supabase Edge Function)  
**Authentication:** Required

**Success Response (200 OK):**

**Headers:**

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="project-{name}-{timestamp}.zip"`

**ZIP Contents:**

```
en.json
pl.json
de.json
```

**File Format (`en.json` example):**

```json
{
  "app.home.subtitle": "Get started now",
  "app.home.title": "Welcome Home",
  "app.settings.label": "Settings"
}
```

**Error Responses:**

- `404 Not Found` - Project not found or access denied
- `500 Internal Server Error` - Export generation failed

**Business Logic (Edge Function):**

1. Validate project ownership via RLS
2. Fetch all project locales (exclude deleted locales)
3. For each locale:
   - Query all translations: `SELECT full_key, value FROM keys JOIN translations WHERE project_id = ? AND locale = ?`
   - Build flat JSON object with dotted keys
   - Sort keys alphabetically (stable sort)
   - Convert empty/NULL values to `""`
4. Create in-memory ZIP archive
5. Add {locale}.json files with UTF-8 encoding, LF line endings
6. Stream ZIP to response

**Performance:**

- Use streaming for large projects (>10k keys)
- Consider server-side caching (5 min TTL) keyed by `project_id` + `max(updated_at)`

---

## 9. Telemetry Endpoints

### 9.1 Get Project Telemetry

**Endpoint:** `GET /rest/v1/telemetry_events?project_id=eq.{project_id}&order=created_at.desc&limit=100`  
**Description:** Get telemetry events for project (owner or service_role only)  
**Authentication:** Required (owner or service_role)

**Success Response (200 OK):**

```json
[
  {
    "created_at": "2025-01-15T10:20:00Z",
    "event_name": "translation_completed",
    "id": "uuid",
    "project_id": "uuid",
    "properties": {
      "completed_keys": 98,
      "failed_keys": 2,
      "mode": "all",
      "target_locale": "pl"
    }
  }
]
```

**Error Responses:**

- `403 Forbidden` - Not owner or service_role

**Business Logic:**

- RLS policy allows SELECT for owner or service_role
- Used for analytics dashboard (future feature)

---

### 9.2 Create Telemetry Event

**Endpoint:** `POST /rest/v1/telemetry_events`  
**Description:** Create telemetry event (internal use, called by Edge Functions)  
**Authentication:** Required (service_role preferred)

**Request Body:**

```json
{
  "event_name": "translation_completed",
  "project_id": "uuid",
  "properties": {
    "completed_keys": 98,
    "mode": "all",
    "target_locale": "pl"
  }
}
```

**Success Response (201 Created):**

```json
{
  "created_at": "2025-01-15T10:20:00Z",
  "id": "uuid"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid event_name (not in enum)
- `403 Forbidden` - Not owner or service_role

**Event Types:**

- `project_created` - Properties: `{ locale_count: 1 }`
- `language_added` - Properties: `{ locale: "pl", locale_count: 2 }`
- `key_created` - Properties: `{ full_key: "app.home.title", key_count: 50 }`
- `translation_completed` - Properties: `{ mode: "all", target_locale: "pl", completed_keys: 98, failed_keys: 2 }`

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

| Table                   | Policy                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `projects`              | User can only access own projects                                      |
| `project_locales`       | User can access locales for own projects                               |
| `keys`                  | User can access keys for own projects                                  |
| `translations`          | User can access translations for own projects                          |
| `translation_jobs`      | User can access jobs for own projects                                  |
| `translation_job_items` | User can access items for jobs in own projects                         |
| `telemetry_events`      | User can SELECT own project events; service_role can INSERT all events |

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
  "model": "anthropic/claude-3.5-sonnet",
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
  "model": "anthropic/claude-3.5-sonnet",
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

**Cost Tracking:**

- Extract token counts from `usage` field
- Calculate cost using OpenRouter pricing API
- Store in `translation_jobs.actual_cost_usd`

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
