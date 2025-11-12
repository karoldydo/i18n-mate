# Export View Implementation Plan

## 1. Overview

The Export View provides users with the ability to download all translations for a project as a ZIP archive containing individual JSON files for each locale. The view displays project information, available locales, and key statistics before allowing users to initiate the export process. The export generates UTF-8 encoded JSON files with dotted keys (stably sorted alphabetically), where missing translations are represented as empty strings.

## 2. View Routing

`/projects/:projectId/export`

## 3. Component Structure

```markdown
ExportPage (main route component)
├── ProjectExportContent (content component)
│ ├── BackButton (navigation to project details)
│ ├── PageHeader (shared header component with title and description)
│ └── ExportLayout (layout wrapper)
│ ├── ExportSummary (project info and statistics)
│ └── ExportActions (export button and status)
│ ├── ExportButton (action button with loading state)
│ └── ExportStatus (progress/error feedback)
```

## 4. Component Details

### ExportPage

- Component description: Main page component that orchestrates the export view, handling route parameters, data fetching, and state management for the export functionality.
- Main elements: ErrorBoundary + Suspense with the shared `Loading` overlay, followed by the ExportLayout wrapper
- Handled interactions: Route parameter validation, navigation on errors
- Handled validation: UUID validation for projectId parameter
- Types: ExportViewModel (internal), ApiErrorResponse, ProjectResponse
- Props: None (uses useParams for projectId)

### ExportLayout

- Component description: Layout wrapper that provides consistent structure and spacing for the export view components.
- Main elements: Container div with flex layout, header, summary, and actions sections
- Handled interactions: None
- Handled validation: None
- Types: React.ComponentProps<'div'>
- Props: children (ReactNode)

### ProjectExportContent

- Component description: Suspense-enabled content component for the export translations feature. Handles retrieval of all necessary project data and presents project export summary and available export actions when data is ready.
- Main elements: BackButton, PageHeader, ExportLayout with ExportActions
- Handled interactions: Data fetching, export action triggering
- Handled validation: Disables export actions if there are no locales available
- Types: ProjectResponse, ProjectStats
- Props: projectId (string)

### PageHeader

- Component description: Shared header component from `@/shared/components` providing consistent page layouts with title and optional subheading or custom content.
- Main elements: Heading (h1), optional subheading text or custom children content
- Handled interactions: None (presentational component)
- Handled validation: None
- Types: None
- Props: header (string), subHeading (string | null), children (ReactNode, optional)

### ExportSummary

- Component description: Displays project information including name, description, locale count, and key count.
- Main elements: Project name/description cards, statistics badges showing locale and key counts
- Handled interactions: None
- Handled validation: None
- Types: ProjectResponse, ProjectStats (localeCount, keyCount)
- Props: project (ProjectResponse), stats (ProjectStats)

### ExportActions

- Component description: Contains the export button and handles the export mutation with loading states.
- Main elements: ExportButton component with loading state, disabled when no locales/keys available
- Handled interactions: Trigger export on button click, handle success/error states
- Handled validation: Check if project has locales and keys before enabling export
- Types: ExportStatus ('idle' | 'exporting' | 'success' | 'error')
- Props: projectId (string), isDisabled (boolean), onExport (function)

### ExportStatus

- Component description: Shows export progress, success confirmation, or error messages with appropriate styling.
- Main elements: Status message with icon, error details if applicable
- Handled interactions: None
- Handled validation: None
- Types: ExportStatus, ApiErrorResponse
- Props: status (ExportStatus), error (ApiErrorResponse | null)

### ExportButton

- Component description: Action button for exporting translations with loading and disabled states. Renders a large primary button to trigger the project export process. While loading, displays a spinning loader icon and updates the label to "Exporting...". Otherwise, shows the standard download icon and "Export translations" label (lowercase).
- Main elements: Button with download icon, loading spinner during export, accessible labels
- Handled interactions: Click to trigger export, disabled during export process
- Handled validation: None
- Types: None
- Props: isLoading (boolean), onClick (function), disabled (boolean)

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/export/api/` (or similar)**
   - Use `ProjectResponse`, `LocaleResponse` or similar directly from existing API types
   - DO NOT create type aliases or duplicate interfaces
   - DO NOT create unnecessary view model types when API types suffice

2. **Use existing types directly in components:**
   - For data display: use existing project and locale response types
   - For API queries: use existing params types
   - Only create minimal UI state types if absolutely necessary (e.g., export status, error handling)

### API Types to Verify and Use

- `ProjectResponse`: Check shared types (use directly)
- `ApiErrorResponse`: From `@/shared/types`
- `UUID_SCHEMA`: From project API schemas for validation

## 6. State Management

The view uses TanStack Query for server state management and local state for UI-specific concerns:

- **useProject**: Fetches project details by ID
- **useProjectLocales**: Fetches available locales for the project
- **useExportTranslations**: Mutation hook for triggering ZIP export
- **Local state**: Export status tracking ('idle' | 'exporting' | 'success' | 'error')

No custom hook is required as the existing API hooks provide sufficient functionality.

## 7. API Integration

The view integrates with the export translations endpoint:

- **Request**: GET `/functions/v1/export-translations?project_id={projectId}`
- **Headers**: Authorization with Bearer token, apikey
- **Response**: Binary ZIP blob with Content-Type: application/zip
- **Success handling**: Automatic browser download with filename from Content-Disposition header
- **Error handling**: JSON error responses with code/message for 401, 404, 500 status codes

## 8. User Interactions

1. **Page Load**: User navigates to export view, sees project summary and export button
2. **Export Trigger**: User clicks export button, sees loading state and progress feedback
3. **Export Success**: Browser download dialog appears, success message shown
4. **Export Error**: Error message displayed with details and retry option
5. **Navigation**: Back button returns to project details view

## 9. Conditions and Validation

### API Conditions

- **Project ID**: Must be valid UUID format (validated on route level)
- **Authentication**: User must be logged in with valid session
- **Authorization**: User must own the project (enforced by RLS)
- **Project State**: Project must exist and not be deleted
- **Content Availability**: Project must have at least one locale to export

### Frontend Validation

- **Route Parameter**: UUID validation for projectId
- **Export Eligibility**: Button disabled if no locales available
- **Loading States**: Prevent multiple concurrent exports
- **Error Boundaries**: Graceful handling of unexpected errors

## 10. Error Handling

### Authentication Errors (401)

- Display "Authentication required" message
- Redirect to login page after user acknowledgment

### Authorization Errors (404)

- Display "Project not found or access denied" message
- Provide back navigation to project list

### Server Errors (500)

- Display "Export generation failed" with technical details
- Offer retry option for transient failures

### Network Errors

- Display generic network error message
- Allow retry attempts

### Client-side Errors

- Invalid project ID: Redirect with error message
- Component errors: Fallback UI with reload option

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing types in `src/features/export/api/` and `src/shared/types/`
- Check `src/shared/types/` for existing TypeScript types
- Use existing types directly - DO NOT create duplicates or aliases
- Verify existing API hooks and schemas before creating new ones

1. Create export route in `src/app/routes.ts`
   - **VERIFY**: Use existing route patterns and ensure consistent with project navigation
2. Implement `ExportPage` component with route parameter validation
   - **VERIFY**: Use existing `ProjectResponse` and `ApiErrorResponse` types directly
3. Create `ProjectExportContent` component with data fetching and suspense support
4. Implement `BackButton` and `PageHeader` usage (PageHeader with header "Export translations" and subHeading)
5. Create `ExportLayout` component for consistent structure
6. Create `ExportSummary` component for project information display
   - **VERIFY**: Use existing project types directly, avoid creating view models
7. Implement `ExportActions` with export button and state management
8. Create `ExportButton` component with loading states (label: "Export translations" in lowercase)
9. Implement `ExportStatus` for feedback and error display
10. Add export route to project navigation tabs
11. Test export functionality with various project states
12. Add comprehensive error handling and edge case testing
13. Implement responsive design and accessibility features
