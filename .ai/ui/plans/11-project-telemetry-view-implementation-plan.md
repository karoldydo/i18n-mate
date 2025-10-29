# Project Telemetry View Implementation Plan

## 1. Overview

The Project Telemetry view displays usage statistics and analytics for a specific i18n project. It provides insights into project activity through telemetry events and key performance indicators (KPIs) related to translation management effectiveness. The view shows historical event data and calculated metrics to help users understand their project's translation workflow and adoption patterns.

## 2. View Routing

The view should be accessible at `/projects/:id/telemetry` where `:id` is the project UUID parameter extracted from the URL.

## 3. Component Structure

```markdown
ProjectTelemetryPage (main page component)
├── TelemetryKPIs (KPI visualization cards)
├── TelemetryDataTable (events table with pagination)
├── DataTable (Shadcn/ui component)
│ ├── TableHeader (sortable columns)
│ └── TableBody
│ └── TelemetryEventRow (individual event rows)
└── PaginationControls (pagination UI)
```

## 4. Component Details

### ProjectTelemetryPage

- **Component description**: Main page component that orchestrates the telemetry view, handles routing, and manages the overall layout
- **Main elements**: Page header with breadcrumbs, KPI cards section, events table section, shared ErrorBoundary + Suspense wrapper with `Loading` overlay
- **Handled interactions**: Page load, navigation, error handling, responsive layout adjustments
- **Handled validation**: Project ID validation from URL parameters, user permissions check
- **Types**: ProjectTelemetryPageProps { projectId: string }
- **Props**: Accepts projectId from React Router params

### TelemetryKPIs

- **Component description**: Displays key performance indicators calculated from telemetry events within a cohort window
- **Main elements**: Three KPI cards showing percentage metrics and averages, with icons and trend indicators
- **Handled interactions**: KPI calculations on data load, responsive card layout
- **Handled validation**: Validates KPI calculation inputs, handles edge cases (no events, division by zero)
- **Types**: TelemetryKPIsViewModel { multiLanguageProjectsPercentage: number, averageKeysPerLanguage: number, llmTranslationsPercentage: number }
- **Props**: Accepts telemetryEvents array, project creation date, and optional cohortDays (default: 7)

### TelemetryDataTable

- **Component description**: Data table component displaying telemetry events with sorting and pagination
- **Main elements**: Shadcn/ui DataTable with columns for timestamp, event type, and formatted properties
- **Handled interactions**: Column sorting, pagination navigation, row expansion for detailed properties
- **Handled validation**: Event data validation, pagination bounds checking
- **Types**: TelemetryEventViewModel { id: string, created_at: string, event_name: EventType, formatted_properties: string }
- **Props**: Accepts events array, pagination state, and sorting parameters

### TelemetryEventRow

- **Component description**: Individual table row component for displaying formatted telemetry events
- **Main elements**: Table cells with timestamp, event type badge, and human-readable properties
- **Handled interactions**: Row hover states, click to expand details
- **Handled validation**: Properties object validation and formatting
- **Types**: TelemetryEventViewModel (same as parent)
- **Props**: Accepts single TelemetryEventResponse object

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/telemetry/api/` (or similar)**
   - Use `TelemetryEventResponse` or similar directly from existing API types
   - DO NOT create type aliases or duplicate interfaces
   - DO NOT create unnecessary view model types when API types suffice

2. **Use existing types directly in components:**
   - For data display: use existing telemetry event response types
   - For API queries: use existing params types
   - Only create minimal UI state types if absolutely necessary (e.g., table state, KPI calculations)

### API Types to Verify and Use

- `TelemetryEventResponse`: Check API types (use directly)
- `ListTelemetryEventsParams`: Check API types (use directly)
- `ApiErrorResponse`: From `@/shared/types`

## 6. State Management

State management will use a combination of React hooks and TanStack Query. A custom `useTelemetryPageState` hook will manage local UI state for pagination and sorting, while `useTelemetryEvents` handles server state for the events data. KPI calculations will be performed client-side using a `useTelemetryKPIs` hook that processes events within a cohort window (default: 7 days after project creation) and memoizes results to avoid recalculation on every render.

## 7. API Integration

The view integrates with the telemetry API through the existing `useTelemetryEvents` hook:

```typescript
const { data: events } = useTelemetryEvents(projectId, {
  limit: state.limit,
  offset: state.page * state.limit,
  order: `${state.sortBy}.${state.sortOrder}` as 'created_at.asc' | 'created_at.desc',
});
```

**Request**: GET /rest/v1/telemetry_events with query parameters
**Response**: TelemetryEventResponse[] array of telemetry events

Loading behaviour relies on a Suspense boundary that renders the shared `Loading` overlay, while the surrounding ErrorBoundary supplies retry and reload actions when a query fails.

## 8. User Interactions

- **View KPIs**: Users can view calculated metrics in card format at the top of the page
- **Sort events**: Click column headers to sort events by timestamp or event type
- **Paginate**: Use pagination controls to navigate through events (default 100 per page)
- **View event details**: Hover or click rows to see detailed event properties
- **Responsive design**: Table adapts to different screen sizes with horizontal scrolling on mobile

## 9. Conditions and Validation

- **Project ownership**: Only project owners can access the view (enforced by RLS policy)
- **Project ID validation**: UUID format validation for URL parameter
- **Event data validation**: Zod schema validation for telemetry events response
- **KPI calculation conditions**: Filters events to cohort window (default: 7 days after project creation) for meaningful metrics
- **Empty state handling**: Display appropriate messages when no events exist
- **Pagination bounds**: Prevent invalid page numbers and ensure offset doesn't exceed total events

## 10. Error Handling

- **401 Unauthorized**: Redirect to login page or show authentication required message
- **403 Forbidden**: Display access denied message with contact support option
- **404 Not Found**: Show project not found error with navigation back to projects list
- **Network errors**: Display retry button with exponential backoff for API failures
- **Data processing errors**: Fallback to basic event display if KPI calculations fail
- **Invalid project ID**: Show validation error and redirect to projects list

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing types in `src/features/telemetry/api/` or similar location
- Check `src/shared/types/` for existing TypeScript types
- Use existing types directly - DO NOT create duplicates or aliases
- No schemas needed for this view (read-only display)

1. Create the main `ProjectTelemetryPage` component with routing setup
   - **VERIFY**: Use existing `TelemetryEventResponse` type (DO NOT create aliases)
2. Implement `useTelemetryPageState` hook for local UI state management
3. Create `TelemetryKPIs` component with KPI calculation logic
4. Implement `useTelemetryKPIs` hook for client-side metric calculations with cohort window filtering
5. Build `TelemetryDataTable` component using Shadcn/ui DataTable
   - **VERIFY**: Use existing event types directly
6. Create `TelemetryEventRow` component for individual event display
7. Add responsive design and accessibility features
8. Wrap the route in the shared ErrorBoundary and Suspense with the `Loading` overlay
9. Add comprehensive error handling for all API failure scenarios
10. Write unit tests for components and hooks
11. Add integration tests for the complete telemetry view
