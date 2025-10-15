# API Endpoint Implementation Plan: Projects Management

## 1. Endpoint Overview

The Projects API provides comprehensive CRUD operations for translation projects owned by authenticated users. It supports listing projects with pagination, retrieving individual project details, creating new projects with default locales, updating project metadata, and deleting projects with cascading cleanup. The API enforces strict data validation, immutability constraints, and user isolation through Row Level Security (RLS) policies.

## 2. Request Details

### 2.1 List Projects

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/projects`
- **Parameters:**
  - Required: None
  - Optional: `select` (default: `id,name,description,prefix,default_locale,created_at,updated_at`), `limit` (default: 50, max: 100), `offset` (default: 0), `order` (default: `name.asc`)

### 2.2 Get Project Details

- **HTTP Method:** GET
- **URL Structure:** `/rest/v1/projects?id=eq.{project_id}&select=*`
- **Parameters:**
  - Required: `id` (project UUID)
  - Optional: `select` (default: `*`)

### 2.3 Create Project

- **HTTP Method:** POST
- **URL Structure:** `/rest/v1/projects`
- **Request Body:**

```json
{
  "default_locale": "string (required, BCP-47 format)",
  "description": "string (optional)",
  "name": "string (required, CITEXT, unique per owner)",
  "prefix": "string (required, 2-4 chars, [a-z0-9._-], no trailing dot, unique per owner)"
}
```

### 2.4 Update Project

- **HTTP Method:** PATCH
- **URL Structure:** `/rest/v1/projects?id=eq.{project_id}`
- **Request Body:**

```json
{
  "description": "string (optional)",
  "name": "string (optional, CITEXT, unique per owner)"
}
```

### 2.5 Delete Project

- **HTTP Method:** DELETE
- **URL Structure:** `/rest/v1/projects?id=eq.{project_id}`
- **Parameters:**
  - Required: `id` (project UUID)

## 3. Used Types

### 3.1 Request DTOs

- `CreateProjectRequest` - Project creation payload
- `UpdateProjectRequest` - Project update payload (only name/description)
- `ListProjectsParams` - Query parameters for list endpoint
- `PaginationParams` - Base pagination parameters

### 3.2 Response DTOs

- `ProjectResponse` - Standard project representation
- `ProjectWithCounts` - Enhanced project with locale_count and key_count
- `ApiResponse<T>` - Generic success response wrapper
- `ApiError` - Generic error response wrapper

### 3.3 Database Types

- `Project` - Database entity type
- `ProjectInsert` - Database insert type
- `ProjectUpdate` - Database update type
- `ProjectCreatedProperties` - Telemetry event properties

## 4. Response Details

### 4.1 List Projects (200 OK)

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

**Headers:** `Content-Range: 0-49/120`

### 4.2 Get Project Details (200 OK)

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

### 4.3 Create Project (201 Created)

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

### 4.4 Update Project (200 OK)

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

### 4.5 Delete Project (204 No Content)

Empty response body.

## 5. Data Flow

### 5.1 List Projects

1. Validate query parameters (limit, offset, order)
2. Apply RLS filter: `owner_user_id = auth.uid()`
3. Execute paginated query with sorting
4. Return results with Content-Range header

### 5.2 Get Project Details

1. Validate project ID format
2. Apply RLS filter: `owner_user_id = auth.uid()`
3. Execute single record query
4. Return project data or 404 if not found

### 5.3 Create Project

1. Validate request body using Zod schema
2. Check uniqueness constraints (name, prefix per owner)
3. Execute RPC function `create_project_with_default_locale()`:
   - Insert project record
   - Insert default locale in `project_locales`
   - Emit `project_created` telemetry event
4. Return created project data

### 5.4 Update Project

1. Validate request body (only name/description allowed)
2. Apply RLS filter: `owner_user_id = auth.uid()`
3. Check name uniqueness if name is being updated
4. Execute update query (triggers prevent immutable field changes)
5. Return updated project data

### 5.5 Delete Project

1. Validate project ID format
2. Apply RLS filter: `owner_user_id = auth.uid()`
3. Execute delete query (cascade deletes all related records)
4. Return 204 No Content

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid JWT token in Authorization header
- Token validation handled by Supabase Auth middleware
- User identity extracted from `auth.uid()`

### 6.2 Authorization

- Row Level Security (RLS) policies enforce user isolation
- All queries filtered by `owner_user_id = auth.uid()`
- Users can only access their own projects

### 6.3 Data Validation

- Zod schemas validate all input data
- Database constraints enforce business rules
- Triggers prevent modification of immutable fields
- SQL injection protection via Supabase client

### 6.4 Input Sanitization

- Prefix validation: 2-4 chars, `[a-z0-9._-]`, no trailing dot
- Locale validation: BCP-47 format (ll or ll-CC)
- Name validation: CITEXT with uniqueness per owner
- Description validation: optional text field

## 7. Error Handling

### 7.1 Validation Errors (400 Bad Request)

- Invalid request body format
- Missing required fields
- Invalid field values (prefix format, locale format)
- Attempted modification of immutable fields (prefix, default_locale)

### 7.2 Authentication Errors (401 Unauthorized)

- Missing Authorization header
- Invalid or expired JWT token
- Malformed token format

### 7.3 Authorization Errors (404 Not Found)

- Project not found
- Project exists but user lacks access (RLS filter)
- Invalid project ID format

### 7.4 Conflict Errors (409 Conflict)

- Project name already exists for user
- Project prefix already exists for user

### 7.5 Server Errors (500 Internal Server Error)

- Database connection failures
- RPC function execution errors
- Unexpected system errors

### 7.6 Error Response Format

```json
{
  "data": null,
  "error": {
    "code": "validation_error",
    "details": {
      "constraint": "2-4 characters, [a-z0-9._-], no trailing dot",
      "field": "prefix"
    },
    "message": "Invalid prefix format"
  }
}
```

## 8. Performance Considerations

### 8.1 Database Optimization

- Indexes on `owner_user_id` for RLS filtering
- Composite indexes on `(owner_user_id, name)` and `(owner_user_id, prefix)` for uniqueness
- Pagination limits to prevent large result sets (max 100 items)

### 8.2 Query Optimization

- Use RPC functions for complex operations (create with default locale)
- Leverage Supabase's built-in query optimization
- Implement proper pagination with offset/limit

### 8.3 Caching Strategy

- TanStack Query for client-side caching
- Cache invalidation on mutations
- Optimistic updates for better UX

### 8.4 Potential Bottlenecks

- Large project lists (mitigated by pagination)
- Concurrent project creation with same name/prefix (handled by database constraints)
- Cascade delete operations (acceptable for user-owned data)

## 9. Implementation Steps

### 9.1 Database Setup

1. Create missing RPC functions:
   - `create_project_with_default_locale(project_data, default_locale_label)`
   - `list_projects_with_counts(limit, offset)`
2. Verify RLS policies are properly configured
3. Test database constraints and triggers

### 9.2 Type Definitions

1. Verify all DTO types are properly defined in `types.ts`
2. Add Zod validation schemas for request validation
3. Create type guards for runtime type checking

### 9.3 API Client Implementation

1. Create Supabase client methods for each endpoint
2. Implement proper error handling and type safety
3. Add request/response transformation logic

### 9.4 TanStack Query Hooks

1. Create query hooks for list and get operations
2. Create mutation hooks for create, update, delete operations
3. Implement proper cache invalidation strategies
4. Add optimistic updates where appropriate

### 9.5 Validation Layer

1. Implement Zod schemas for all request types
2. Add custom validation for business rules
3. Create validation error formatters

### 9.6 Error Handling

1. Implement centralized error handling
2. Create error response formatters
3. Add proper HTTP status code mapping
4. Implement telemetry error logging

### 9.7 Testing

1. Unit tests for validation schemas
2. Integration tests for API endpoints
3. E2E tests for complete user workflows
4. Performance tests for pagination and large datasets

### 9.8 Documentation

1. Update API documentation with examples
2. Create integration guides for frontend
3. Document error codes and troubleshooting
4. Add performance benchmarks and limits
