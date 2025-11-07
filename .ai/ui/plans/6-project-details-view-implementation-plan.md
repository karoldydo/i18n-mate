# View Implementation Plan [Project Details]

## 1. Overview

The Project Details view serves as the central hub for managing individual translation projects in i18n-mate. It displays comprehensive project information including name, description, prefix, default language, and statistics (key count, locale count). The view provides navigation to subviews (keys, locales) and supports project management operations like editing name/description and deletion. The interface ensures secure access through RLS validation and follows accessibility best practices.

## 2. View Routing

`/projects/:id`

Route parameters:

- `id`: Project UUID (validated via UUID schema)

## 3. Component Structure

```markdown
ProjectDetailsPage (Page Component)
├── ProjectDetailsContent (Content wrapper with state management)
│ ├── ProjectDetailsLayout (Layout wrapper)
│ │ ├── BackButton (Navigation to projects list)
│ │ ├── ProjectHeader (Header section with title, description, and actions)
│ │ │ ├── ProjectTitle (Project name and description)
│ │ │ └── ProjectActions (Edit/Delete buttons)
│ │ └── ProjectMetadata (Card-based metadata display)
│ │ ├── ProjectPrefix (Display prefix with info tooltip)
│ │ ├── ProjectDefaultLocale (Display default language)
│ │ ├── ProjectStats (Languages count, Keys count)
│ │ └── ProjectTimestamps (Created/Updated dates)
│ ├── EditProjectDialog (Modal for editing project)
│ │ ├── EditProjectForm (Form with validation)
│ │ └── EditProjectActions (Save/Cancel buttons)
│ └── DeleteProjectDialog (Confirmation dialog)
│ ├── DeleteProjectWarning (Warning message)
│ └── DeleteProjectActions (Confirm/Cancel buttons)
```

## 4. Component Details

### ProjectDetailsPage

- **Component description:** Main page component that handles route parameter validation and error boundaries.
- **Main elements:** Error boundary wrapper, validation error display, content component.
- **Handled interactions:** Route parameter validation, error boundary handling.
- **Handled validation:** UUID format validation for route parameter.
- **Types:** Route params interface.
- **Props:** None (uses route params from React Router).

### ProjectDetailsContent

- **Component description:** Content component that orchestrates the project details view, handles data fetching, and manages dialog states.
- **Main elements:** Layout wrapper, header section, metadata display, and modal dialogs for editing/deleting.
- **Handled interactions:** Project data loading, modal state management, dialog open/close handlers.
- **Handled validation:** Project ownership verification through API (handled by useProject hook).
- **Types:** ProjectResponse (from API), ProjectId (string).
- **Props:** projectId: string.

### ProjectDetailsLayout

- **Component description:** Layout wrapper that provides consistent structure and responsive design for the project details view.
- **Main elements:** Container div with responsive padding, back button, header section, and metadata card.
- **Handled interactions:** Responsive layout adjustments, semantic HTML structure.
- **Handled validation:** None.
- **Types:** ProjectResponse (for passing to child components).
- **Props:** project (ProjectResponse), onEdit (function), onDelete (function).

### ProjectHeader

- **Component description:** Header section containing project title, description, and action buttons in a clean, organized layout.
- **Main elements:** Flex container with title/description section and action buttons section.
- **Handled interactions:** Edit button click (opens edit dialog), Delete button click (opens delete confirmation).
- **Handled validation:** None.
- **Types:** ProjectResponse (for display data).
- **Props:** project (ProjectResponse), onEdit (function), onDelete (function).

### ProjectMetadata

- **Component description:** Card-based display of immutable project properties (prefix, default locale, statistics, timestamps) with informational tooltips.
- **Main elements:** CardItem wrapper with horizontal flex layout containing prefix, default locale, languages count, keys count, created date, and updated date.
- **Handled interactions:** Tooltip display for prefix and default locale information.
- **Handled validation:** None.
- **Types:** ProjectResponse (includes prefix, default_locale, locale_count, key_count, created_at, updated_at).
- **Props:** project (ProjectResponse).

### EditProjectDialog

- **Component description:** Modal dialog for editing project name and description with form validation and submission.
- **Main elements:** Shadcn/ui Dialog with form, input fields, and action buttons.
- **Handled interactions:** Form submission, validation feedback, dialog open/close.
- **Handled validation:** Required name field, optional description field, length limits.
- **IMPORTANT - Types and Schemas:**
  - **VERIFY** existing `UPDATE_PROJECT_SCHEMA` in `projects.schemas.ts` and use it
  - Use `UpdateProjectRequest` type from `@/shared/types` (DO NOT create aliases)
  - DO NOT create duplicate schema in component file
- **Props:** project (ProjectResponse), isOpen (boolean), onClose (function), onSubmit (function), isPending (boolean).

### DeleteProjectDialog

- **Component description:** Confirmation dialog for project deletion with warning message and irreversible action notice.
- **Main elements:** Shadcn/ui AlertDialog with warning icon, confirmation message, and action buttons.
- **Handled interactions:** Confirmation button click, cancel action.
- **Handled validation:** None (confirmation-based action).
- **Types:** None.
- **Props:** projectName (string), isOpen (boolean), onClose (function), onConfirm (function), isPending (boolean).

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/projects/api/`**
   - Use `UpdateProjectRequest` directly from existing API types
   - Use `ProjectResponse` and `ProjectWithCounts` from `@/shared/types`
   - DO NOT create type aliases like `type EditProjectFormData = UpdateProjectRequest`
   - DO NOT create duplicate interfaces when existing types already satisfy requirements

2. **Use existing types directly in components:**
   - For EditProjectDialog: use `UpdateProjectRequest` type
   - For data display: use `ProjectResponse` or `ProjectWithCounts` type
   - For stats: check if existing types already provide needed data

### Existing Types Used

- `ProjectResponse`: From `@/shared/types` (use directly)
- `ProjectWithCounts`: From `@/shared/types` (includes key_count and locale_count)
- `UpdateProjectRequest`: From `@/shared/types` (use directly, DO NOT create aliases)
- `ApiErrorResponse`: From `@/shared/types`

## 6. State Management

The view uses TanStack Query for server state management with the existing `useProject` hook for data fetching. Local component state manages dialog visibility using `useState`. Optimistic updates are handled at the mutation level in the existing `useUpdateProject` and `useDeleteProject` hooks. No custom hook is required as the existing API layer provides all necessary functionality.

State variables:

- `editDialogOpen`: boolean - Controls edit dialog visibility
- `deleteDialogOpen`: boolean - Controls delete confirmation dialog visibility

## 7. API Integration

**Data Fetching:**

- Uses `useProject(projectId)` hook which queries `GET /rest/v1/projects?id=eq.{project_id}`
- Request: UUID validation, RLS-based filtering
- Response: `ProjectResponse` (name, description, prefix, default_locale, created_at, updated_at)

**Update Operation:**

- Uses `useUpdateProject()` mutation hook
- Request: `PATCH /rest/v1/projects?id=eq.{project_id}` with `UpdateProjectRequest` (name, description only)
- Response: Updated `ProjectResponse`
- Error handling: 400 (immutable fields), 404 (not found), 409 (name conflict)

**Delete Operation:**

- Uses `useDeleteProject()` mutation hook
- Request: `DELETE /rest/v1/projects?id=eq.{project_id}`
- Response: 204 No Content
- Error handling: 404 (not found)

## 8. User Interactions

1. **View Loading:** Automatic data fetch on route entry with loading state display (handled by Suspense boundary)
2. **Edit Project:** Click edit button → open dialog → fill form → submit → optimistic update → close dialog → show success toast
3. **Delete Project:** Click delete button → open confirmation → confirm → optimistic update → navigate to project list → show success toast
4. **Navigate to Subviews:** Navigation to keys, locales, translation jobs, and telemetry views is handled through sidebar navigation or direct links (not via tabs in this view)
5. **Error Recovery:** Failed operations show error toasts with retry options where applicable

## 9. Conditions and Validation

**API-Level Conditions:**

- Project ownership verified through RLS (automatic 404 if no access)
- Prefix and default_locale cannot be modified (API returns 400 error)
- Project name must be unique per user (409 conflict on update)
- Delete cascades to all related data (locales, keys, translations)

**Component-Level Validation:**

- Route parameter `id` validated as UUID format
- Edit form requires non-empty project name
- Delete confirmation requires explicit user confirmation
- Navigation only enabled when project data is successfully loaded

**UI State Conditions:**

- Edit/Delete buttons disabled during pending operations
- Navigation tabs disabled when project data is loading or error state
- Form submission disabled when validation fails

## 10. Error Handling

**Network Errors:**

- Project fetch failure: Display error message with retry button
- Update failure: Revert optimistic update, show error toast
- Delete failure: Show error toast, keep project in list

**Validation Errors:**

- Invalid route parameter: Redirect to project list with error message
- Form validation: Inline error messages with specific field feedback
- API validation: Map error codes to user-friendly messages

**Edge Cases:**

- Project not found (404): Redirect to project list with not found message
- Project deleted by another session: Show stale data warning, suggest refresh
- Concurrent edits: Last-write-wins with server timestamp validation

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check `src/features/projects/api/projects.schemas.ts` for existing Zod schemas
- Check `src/shared/types/` for existing TypeScript types
- Use existing schemas and types directly - DO NOT create duplicates or aliases

1. Create project details route in `src/app/routes.ts`
2. Implement `ProjectDetailsPage` page component with route parameter validation
3. Implement `ProjectDetailsContent` component with data fetching and dialog state management
4. Create `ProjectDetailsLayout` component for consistent structure
5. Implement `ProjectHeader` with title, description, and action buttons
6. Create `ProjectMetadata` component using CardItem for card-based immutable property display
7. **Implement `EditProjectDialog` with form validation and submission**
   - **VERIFY**: Import and use `UPDATE_PROJECT_SCHEMA` from API
   - **VERIFY**: Use `UpdateProjectRequest` type directly (DO NOT create aliases)
8. Build `DeleteProjectDialog` with confirmation and warning messages
9. Add loading states and error boundaries (Suspense for data fetching)
10. Implement responsive design and accessibility features
11. Test integration with existing API hooks
12. Add e2e tests for critical user flows
