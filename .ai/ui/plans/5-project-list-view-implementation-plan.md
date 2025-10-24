# Project List View Implementation Plan

## 1. Overview

The project list view displays all user projects with management capabilities including create, edit, and delete operations. It provides a paginated table showing project information (name, default language, language count, key count) with inline actions for project management. After creating a project, users are automatically navigated to the project's details view.

## 2. View Routing

- **Path**: `/projects`
- **Route Type**: Standard React Router route with lazy loading
- **Access**: Requires authenticated user

## 3. Component Structure

```markdown
ProjectListPage (main page component)
├── ProjectListTable (data table component)
│ ├── TableHeader (with create button)
│ ├── ProjectTableRow (individual project rows)
│ │ ├── ProjectInfo (name, description display)
│ │ ├── ProjectStats (counts display)
│ │ └── ProjectActions (edit/delete buttons)
│ └── TablePagination (pagination controls)
├── CreateProjectDialog (modal for project creation)
├── EditProjectDialog (modal for project editing)
└── DeleteProjectDialog (confirmation dialog for deletion)
```

## 4. Component Details

### ProjectListPage

- **Component description**: Main page component that orchestrates the project list view, handles routing, and manages dialog states
- **Main elements**: Page layout with header, data table, and modal dialogs
- **Handled interactions**: Page load, dialog open/close, navigation after project creation
- **Handled validation**: None (handled by child components and API)
- **Types**: Uses ProjectWithCounts from API responses
- **Props**: None (route component)

### ProjectListTable

- **Component description**: Data table displaying projects with pagination and sorting capabilities
- **Main elements**: Shadcn DataTable component with custom columns and pagination
- **Handled interactions**: Row selection, pagination, sorting (delegated to API)
- **Handled validation**: None
- **Types**: ProjectWithCounts[], Table column definitions
- **Props**: projects: ProjectWithCounts[], isLoading: boolean, pagination metadata

### CreateProjectDialog

- **Component description**: Modal dialog for creating new projects with form validation
- **Main elements**: Shadcn Dialog with form fields (name, description, prefix, default locale, locale label). Uses a LocaleSelector dropdown populated from the common primary language subtags (IETF language tags) to choose the default locale with BCP‑47 normalization.
- **Handled interactions**: Form submission, validation, success navigation
- **Handled validation**:
  - Name: required, unique per user
  - Prefix: 2-4 characters, [a-z0-9._-], no trailing dot, unique per user
  - Default locale: BCP-47 format (ll or ll-CC)
  - Locale label: required, max 64 characters
- **IMPORTANT - Types and Schemas**:
  - **VERIFY** existing `CREATE_PROJECT_REQUEST_SCHEMA` in `projects.schemas.ts` and use it
  - Use `CreateProjectRequest` type from `@/shared/types` (DO NOT create aliases)
  - DO NOT create duplicate schema in component file
- **Props**: open: boolean, onOpenChange: (open: boolean) => void

### EditProjectDialog

- **Component description**: Modal dialog for editing existing projects (name and description only)
- **Main elements**: Shadcn Dialog with form fields (name, description)
- **Handled interactions**: Form submission, validation, success feedback
- **Handled validation**:
  - Name: required, unique per user (excluding current project)
  - Description: optional
- **IMPORTANT - Types and Schemas**:
  - **VERIFY** existing `UPDATE_PROJECT_SCHEMA` in `projects.schemas.ts` and use it
  - Use `UpdateProjectRequest` type from `@/shared/types` (DO NOT create aliases)
  - DO NOT create duplicate schema in component file
- **Props**: project: ProjectWithCounts, open: boolean, onOpenChange: (open: boolean) => void

### DeleteProjectDialog

- **Component description**: Confirmation dialog for irreversible project deletion
- **Main elements**: Shadcn AlertDialog with project name display and confirmation buttons
- **Handled interactions**: Delete confirmation, cancellation
- **Handled validation**: None (confirmation-based action)
- **Types**: ProjectWithCounts
- **Props**: project: ProjectWithCounts, open: boolean, onOpenChange: (open: boolean) => void

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/projects/api/`**
   - Use `CreateProjectRequest` and `UpdateProjectRequest` directly from existing API types
   - DO NOT create type aliases like `type CreateProjectFormData = CreateProjectRequest`
   - DO NOT create duplicate interfaces when existing types already satisfy requirements

2. **Use existing types directly in components:**
   - For CreateProjectDialog: use `CreateProjectRequest` type
   - For EditProjectDialog: use `UpdateProjectRequest` type
   - For data display: use `ProjectWithCounts` type

### API Integration Types

- **Request Types**: CreateProjectRequest, UpdateProjectRequest (use from `@/shared/types`)
- **Response Types**: ProjectListResponse, ProjectResponse (use from `@/shared/types`)
- **Error Types**: ApiErrorResponse with specific error codes (400, 401, 404, 409)

## 6. State Management

State is managed using TanStack Query hooks with optimistic updates:

- **useProjects**: Fetches paginated project list with 5-minute stale time
- **useCreateProject**: Creates project with optimistic updates and navigation on success
- **useUpdateProject**: Updates project with optimistic updates
- **useDeleteProject**: Deletes project with optimistic updates

Local component state managed with useState:

- Dialog open/close states
- Form data and validation states
- Loading states (handled by TanStack Query)

No custom hooks required beyond the existing API hooks.

## 7. API Integration

### List Projects

- **Endpoint**: POST /rest/v1/rpc/list_projects_with_counts
- **Request**: { p_limit: number, p_offset: number }
- **Query Params**: order=name.asc, count=exact
- **Response**: ProjectWithCounts[]

### Create Project

- **Endpoint**: POST /rest/v1/rpc/create_project_with_default_locale
- **Request**: CreateProjectRequest
- **Response**: ProjectResponse
- **Side Effects**: Navigation to `/projects/{id}`

### Update Project

- **Endpoint**: PATCH /rest/v1/projects?id=eq.{project_id}
- **Request**: UpdateProjectRequest (name and description only)
- **Response**: ProjectResponse

### Delete Project

- **Endpoint**: DELETE /rest/v1/projects?id=eq.{project_id}
- **Response**: 204 No Content
- **Side Effects**: Cascading delete of all related data

## 8. User Interactions

### Project List View

- **Load**: Display paginated table sorted by name ascending
- **Pagination**: Navigate between pages (50 items per page)
- **Create Button**: Open create project dialog
- **Edit Action**: Open edit dialog for selected project
- **Delete Action**: Open delete confirmation dialog

### Create Project Dialog

- **Open**: Pre-fill form with empty values
- **Form Validation**: Real-time validation with error messages
- **Submit**: Create project, show success toast, navigate to project details view
- **Cancel**: Close dialog without changes

### Edit Project Dialog

- **Open**: Pre-fill form with current project data
- **Form Validation**: Real-time validation with error messages
- **Submit**: Update project, show success toast, close dialog
- **Cancel**: Close dialog without changes

### Delete Project Dialog

- **Open**: Display project name and warning message
- **Confirm**: Delete project, show success toast, close dialog
- **Cancel**: Close dialog without deletion

## 9. Conditions and Validation

### API-Level Validation

- **Create Project**:
  - Name uniqueness per user (409 conflict)
  - Prefix format: 2-4 chars, [a-z0-9._-], no trailing dot (400)
  - Prefix uniqueness per user (409 conflict)
  - Default locale BCP-47 format (400)
- **Update Project**:
  - Only name/description mutable (400 for prefix/default_locale changes)
  - Name uniqueness per user (409 conflict)
- **Delete Project**: Owner verification via RLS (404 if not found/owned)

### UI-Level Validation

**IMPORTANT: Verify Existing Schemas Before Creating New Ones**

1. **Check for existing Zod schemas in `src/features/projects/api/projects.schemas.ts`**
   - Use `CREATE_PROJECT_REQUEST_SCHEMA` for CreateProjectDialog
   - Use `UPDATE_PROJECT_SCHEMA` for EditProjectDialog
   - DO NOT duplicate schema definitions in component files
   - DO NOT create custom schemas when API schemas already exist

2. **Implementation:**
   - Import schemas from `../api/projects.schemas`
   - Use with `zodResolver` in react-hook-form
   - Real-time feedback with error messages displayed immediately
   - Submit prevention via disabled submit button when validation fails
   - Confirmation dialog required for destructive delete action

## 10. Error Handling

### Network Errors

- **Connection Issues**: Retry logic via TanStack Query, user-friendly error toasts
- **429 Rate Limiting**: Exponential backoff, informative error messages
- **5xx Server Errors**: Generic error handling with retry options

### Validation Errors

- **400 Bad Request**: Display field-specific error messages from API
- **409 Conflict**: Highlight conflicting fields (name/prefix uniqueness)
- **401 Unauthorized**: Redirect to login (handled globally)

### Business Logic Errors

- **404 Not Found**: Project not found or access denied (RLS)
- **Delete Cascade**: Inform user about irreversible operation
- **Create Navigation**: Handle navigation failures gracefully

### UI Error States

- **Loading States**: Skeleton loaders for table and dialogs
- **Empty States**: "No projects found" message with create prompt
- **Error Boundaries**: Graceful degradation for unexpected errors

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check `src/features/projects/api/projects.schemas.ts` for existing Zod schemas
- Check `src/shared/types/` for existing TypeScript types
- Use existing schemas and types directly - DO NOT create duplicates or aliases

1. **Set up routing and basic page structure**
   - Add lazy-loaded route in routes.ts
   - Create ProjectListPage component with basic layout

2. **Implement project list table**
   - Set up Shadcn DataTable with project columns
   - Integrate useProjects hook
   - Add pagination controls

3. **Add table actions and dialogs**
   - Create action buttons in table rows
   - Implement dialog state management
   - **VERIFY**: Use existing schemas from `projects.schemas.ts` (DO NOT create new schemas)

4. **Implement create project functionality**
   - Create CreateProjectDialog with form
   - **VERIFY**: Import and use `CREATE_PROJECT_REQUEST_SCHEMA` from API
   - **VERIFY**: Use `CreateProjectRequest` type directly (DO NOT create aliases)
   - Integrate useCreateProject hook
   - Add navigation logic after creation

5. **Implement edit project functionality**
   - Create EditProjectDialog with form
   - **VERIFY**: Import and use `UPDATE_PROJECT_SCHEMA` from API
   - **VERIFY**: Use `UpdateProjectRequest` type directly (DO NOT create aliases)
   - Integrate useUpdateProject hook
   - Add success feedback

6. **Implement delete project functionality**
   - Create DeleteProjectDialog with confirmation
   - Integrate useDeleteProject hook
   - Add irreversible operation warnings

7. **Add error handling and loading states**
   - Implement error toasts and boundaries
   - Add skeleton loaders
   - Handle edge cases (empty states, network errors)

8. **Add accessibility and responsive design**
   - Implement ARIA labels and keyboard navigation
   - Ensure mobile-responsive layout
   - Add screen reader support
