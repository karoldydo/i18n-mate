# View Implementation Plan [Project Details]

## 1. Overview

The Project Details view serves as the central hub for managing individual translation projects in i18n-mate. It displays comprehensive project information including name, description, prefix, default language, and statistics (key count, locale count). The view provides navigation to subviews (keys, locales) and supports project management operations like editing name/description and deletion. The interface ensures secure access through RLS validation and follows accessibility best practices.

## 2. View Routing

`/projects/:id`

Route parameters:

- `id`: Project UUID (validated via UUID schema)

## 3. Component Structure

```markdown
ProjectDetailsView (Page Component)
├── ProjectDetailsLayout (Layout wrapper)
│ ├── ProjectHeader (Header section with title and actions)
│ │ ├── ProjectTitle (Project name and description)
│ │ ├── ProjectActions (Edit/Delete buttons)
│ │ └── ProjectStats (Key count, Locale count display)
│ ├── ProjectNavigation (Tab navigation to subviews)
│ │ ├── KeysTab (Navigation to keys view)
│ │ ├── LocalesTab (Navigation to locales view)
│ │ ├── JobsTab (Navigation to translation jobs)
│ │ └── TelemetryTab (Navigation to project telemetry)
│ └── ProjectMetadata (Immutable details display)
│ ├── ProjectPrefix (Display prefix with info tooltip)
│ ├── ProjectDefaultLocale (Display default language)
│ └── ProjectTimestamps (Created/Updated dates)
├── EditProjectDialog (Modal for editing project)
│ ├── EditProjectForm (Form with validation)
│ └── EditProjectActions (Save/Cancel buttons)
└── DeleteProjectDialog (Confirmation dialog)
├── DeleteProjectWarning (Warning message)
└── DeleteProjectActions (Confirm/Cancel buttons)
```

## 4. Component Details

### ProjectDetailsView

- **Component description:** Main page component that orchestrates the project details view, handles routing, data fetching, and error boundaries.
- **Main elements:** Layout wrapper, header section, navigation tabs, metadata display, and modal dialogs for editing/deleting.
- **Handled interactions:** Route parameter validation, project data loading, navigation to subviews, modal state management.
- **Handled validation:** UUID format validation for route parameter, project ownership verification through API.
- **Types:** ProjectResponse (from API), ProjectId (branded type), Route params interface.
- **Props:** None (uses route params from React Router).

### ProjectDetailsLayout

- **Component description:** Layout wrapper that provides consistent structure and responsive design for the project details view.
- **Main elements:** Container div with responsive padding, header section, main content area with navigation and metadata.
- **Handled interactions:** Responsive layout adjustments, semantic HTML structure.
- **Handled validation:** None.
- **Types:** React.ComponentProps for layout customization.
- **Props:** children (ReactNode), className (optional string).

### ProjectHeader

- **Component description:** Header section containing project title, description, actions, and statistics in a clean, organized layout.
- **Main elements:** Flex container with title/metadata section and actions/stats section.
- **Handled interactions:** None (stateless presentation component).
- **Handled validation:** None.
- **Types:** ProjectResponse (for display data), ProjectStats interface.
- **Props:** project (ProjectResponse), stats (ProjectStats), onEdit (function), onDelete (function).

### ProjectTitle

- **Component description:** Displays project name and optional description with proper typography hierarchy.
- **Main elements:** Heading elements (h1/h2) with description paragraph.
- **Handled interactions:** None.
- **Handled validation:** None.
- **Types:** Pick<ProjectResponse, 'name' | 'description'>.
- **Props:** name (string), description (string | null).

### ProjectActions

- **Component description:** Action buttons for editing and deleting the project with consistent styling.
- **Main elements:** Button group with Edit and Delete buttons using Shadcn/ui Button component.
- **Handled interactions:** Edit button click (opens edit dialog), Delete button click (opens delete confirmation).
- **Handled validation:** None.
- **Types:** None.
- **Props:** onEdit (function), onDelete (function), isPending (boolean for loading states).

### ProjectStats

- **Component description:** Displays project statistics (key count, locale count) with icons and labels.
- **Main elements:** Stats grid with icon + label + value for each metric.
- **Handled interactions:** None.
- **Handled validation:** None.
- **Types:** ProjectStats interface { keyCount: number; localeCount: number; }.
- **Props:** keyCount (number), localeCount (number).

### ProjectNavigation

- **Component description:** Tab-based navigation to project subviews (keys, locales, translation jobs, telemetry) with active state management.
- **Main elements:** Shadcn/ui Tabs component with Keys, Locales, Jobs, and Telemetry tabs.
- **Handled interactions:** Tab switching, navigation to subview routes.
- **Handled validation:** None.
- **Types:** None.
- **Props:** projectId (ProjectId), activeTab (optional string).

### ProjectMetadata

- **Component description:** Display of immutable project properties (prefix, default locale, timestamps) with informational tooltips.
- **Main elements:** Definition list (dl/dt/dd) with labeled metadata fields.
- **Handled interactions:** Tooltip display for prefix information.
- **Handled validation:** None.
- **Types:** Pick<ProjectResponse, 'prefix' | 'default_locale' | 'created_at' | 'updated_at'>.
- **Props:** prefix (string), defaultLocale (string), createdAt (string), updatedAt (string).

### EditProjectDialog

- **Component description:** Modal dialog for editing project name and description with form validation and submission.
- **Main elements:** Shadcn/ui Dialog with form, input fields, and action buttons.
- **Handled interactions:** Form submission, validation feedback, dialog open/close.
- **Handled validation:** Required name field, optional description field, length limits.
- **Types:** UpdateProjectRequest, form state interfaces.
- **Props:** project (ProjectResponse), isOpen (boolean), onClose (function), onSubmit (function), isPending (boolean).

### DeleteProjectDialog

- **Component description:** Confirmation dialog for project deletion with warning message and irreversible action notice.
- **Main elements:** Shadcn/ui AlertDialog with warning icon, confirmation message, and action buttons.
- **Handled interactions:** Confirmation button click, cancel action.
- **Handled validation:** None (confirmation-based action).
- **Types:** None.
- **Props:** projectName (string), isOpen (boolean), onClose (function), onConfirm (function), isPending (boolean).

## 5. Types

### View-Specific Types

```typescript
// Route parameters interface
interface ProjectDetailsRouteParams {
  id: string;
}

// Statistics interface for project metrics
interface ProjectStats {
  keyCount: number;
  localeCount: number;
}

// Navigation tab identifiers
type ProjectTab = 'keys' | 'locales' | 'jobs' | 'telemetry';

// Form state for edit dialog
interface EditProjectFormData {
  name: string;
  description: string | null;
}

// Dialog state management
interface ProjectDialogsState {
  edit: boolean;
  delete: boolean;
}

// View model combining API data with computed properties
interface ProjectDetailsViewModel extends ProjectResponse {
  stats: ProjectStats;
  canEdit: boolean; // Always true for owners due to RLS
  canDelete: boolean; // Always true for owners due to RLS
}
```

### Existing Types Used

- `ProjectResponse`: From `@/shared/types/projects`
- `ProjectId`: Branded type from `@/shared/types/projects`
- `UpdateProjectRequest`: From `@/shared/types/projects`
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

1. **View Loading:** Automatic data fetch on route entry with loading state display
2. **Edit Project:** Click edit button → open dialog → fill form → submit → optimistic update → close dialog → show success toast
3. **Delete Project:** Click delete button → open confirmation → confirm → optimistic update → navigate to project list → show success toast
4. **Navigate to Keys:** Click Keys tab → navigate to `/projects/:id/keys`
5. **Navigate to Locales:** Click Locales tab → navigate to `/projects/:id/locales`
6. **Navigate to Jobs:** Click Jobs tab → navigate to `/projects/:id/translation-jobs`
7. **Navigate to Telemetry:** Click Telemetry tab → navigate to `/projects/:id/telemetry`
8. **Error Recovery:** Failed operations show error toasts with retry options where applicable

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

1. Create project details route in `src/app/routes.ts`
2. Implement `ProjectDetailsView` page component with data fetching
3. Create `ProjectDetailsLayout` component for consistent structure
4. Implement `ProjectHeader` with title, actions, and stats sections
5. Build `ProjectNavigation` with tab-based routing to subviews
6. Create `ProjectMetadata` component for immutable property display
7. Implement `EditProjectDialog` with form validation and submission
8. Build `DeleteProjectDialog` with confirmation and warning messages
9. Add loading states and error boundaries
10. Implement responsive design and accessibility features
11. Test integration with existing API hooks
12. Add e2e tests for critical user flows
