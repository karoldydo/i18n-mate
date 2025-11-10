# Project Telemetry View Implementation Plan

## 1. Overview

The Project Telemetry view displays usage statistics and analytics for a specific i18n project. It provides insights into project activity through telemetry events and key performance indicators (KPIs) related to translation management effectiveness. The view shows historical event data and calculated metrics to help users understand their project's translation workflow and adoption patterns.

## 2. View Routing

The view should be accessible at `/projects/:id/telemetry` where `:id` is the project UUID parameter extracted from the URL.

## 3. Component Structure

```markdown
ProjectTelemetryPage (main page component)
├── ProjectTelemetryContent (content component)
│ ├── TelemetryKPIs (KPI visualization cards)
│ │ └── KPICard (individual KPI card component)
│ └── CardList (shared card list component with pagination)
│ └── TelemetryCard (individual event card component)
└── ErrorBoundary + Suspense (shared error handling and loading)
```

## 4. Component Details

### ProjectTelemetryPage

- **Component description**: Main page component that orchestrates the telemetry view, handles routing, and manages the overall layout
- **Main elements**: Wraps ProjectTelemetryContent in ErrorBoundary + Suspense with `Loading` overlay
- **Handled interactions**: Page load, navigation, error handling
- **Handled validation**: Project ID validation from URL parameters, user permissions check
- **Types**: ProjectTelemetryPageProps { projectId: string }
- **Props**: Accepts projectId from React Router params

### ProjectTelemetryContent

- **Component description**: Main content component that fetches and displays telemetry data
- **Main elements**: Page header with back button, KPI cards section, events card list section with pagination
- **Handled interactions**: Pagination navigation, data fetching via Suspense queries
- **Handled validation**: Project existence validation, pagination bounds checking
- **Types**: ProjectTelemetryContentProps { projectId: string }
- **Props**: Accepts projectId string

### TelemetryKPIs

- **Component description**: Displays key performance indicators calculated from telemetry events within a cohort window
- **Main elements**: Responsive grid of three KPI cards showing percentage metrics and averages
- **Handled interactions**: KPI calculations on data load, responsive card layout
- **Handled validation**: Validates KPI calculation inputs, handles edge cases (no events, division by zero)
- **Types**: Uses `useTelemetryKPIs` hook return type { multiLanguageProjectsPercentage: number, averageKeysPerLanguage: number, llmTranslationsPercentage: number }
- **Props**: Accepts telemetryEvents array (TelemetryEventResponse[]), project creation date (ISO string)

### KPICard

- **Component description**: Reusable card component for displaying individual key performance indicators
- **Main elements**: CardItem wrapper with title, value, and description in vertical layout
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**: KPICardProps { title: string, value: string, description: string }
- **Props**: Accepts title, value, and description strings

### TelemetryCard

- **Component description**: Card component displaying a single telemetry event in an inline format
- **Main elements**: CardItem wrapper with flex layout: badge + timestamp on left, JSON properties on right
- **Handled interactions**: None (display only)
- **Handled validation**: Properties JSON validation and formatting
- **Types**: TelemetryCardProps { event: TelemetryEventResponse }
- **Props**: Accepts single TelemetryEventResponse object
- **Layout**: Flex justify-between with badge + relative timestamp on left, formatted JSON in `<code>` block on right
- **Display format**: All data inline (single row), properties displayed as formatted JSON string (not human-readable text)

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

State management uses a combination of React hooks and TanStack Query. A custom `useTelemetryPageState` hook manages local UI state for pagination (page-based internally, converted to offset-based for API), while `useTelemetryEvents` handles server state for the events data with pagination metadata. KPI calculations are performed client-side using a `useTelemetryKPIs` hook that processes events within a cohort window (default: 7 days after project creation) and memoizes results to avoid recalculation on every render.

**Note**: Sorting is fixed to `created_at.desc` (newest first) - no user sorting controls are provided. The `useTelemetryPageState` hook still maintains sorting state internally for potential future use, but it's not exposed in the UI.

## 7. API Integration

The view integrates with the telemetry API through the existing `useTelemetryEvents` hook:

```typescript
const { data: telemetryData } = useTelemetryEvents(projectId, {
  limit: pageState.limit,
  offset: pageState.page * pageState.limit,
  order: 'created_at.desc' as const, // fixed sorting, newest first
});
```

**Request**: RPC call to `list_telemetry_events_with_count` function with parameters:

- `p_project_id`: UUID of the project
- `p_limit`: Items per page (1-100, default: 50)
- `p_offset`: Pagination offset (min: 0)
- `p_order_by`: Sort column (always 'created_at')
- `p_ascending`: Boolean (always false for desc order)

**Response**: `TelemetryEventsResponse` (PaginatedResponse) containing:

- `data`: Array of `TelemetryEventsResponseItem` (includes `total_count` field)
- `metadata`: `PaginationMetadata` with `start`, `end`, and `total` fields

**Note**: The API uses an RPC function that returns pagination metadata (total count) along with the data, enabling proper pagination controls in the CardList component.

Loading behaviour relies on a Suspense boundary that renders the shared `Loading` overlay, while the surrounding ErrorBoundary supplies retry and reload actions when a query fails.

## 8. User Interactions

- **View KPIs**: Users can view calculated metrics in card format at the top of the page (three KPI cards in responsive grid)
- **Paginate**: Use pagination controls in CardList to navigate through events (default limit from TELEMETRY_DEFAULT_LIMIT constant)
- **View event details**: Each event card displays inline JSON properties in a `<code>` block on the right side
- **Responsive design**: Card list adapts to different screen sizes, KPI cards stack on mobile (md:grid-cols-3)
- **Note**: Sorting is fixed to newest first (created_at.desc) - no user sorting controls are provided

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
5. Create `KPICard` component in `cards/` folder using `CardItem` wrapper
6. Create `TelemetryCard` component for individual event display with inline layout
7. Build `ProjectTelemetryContent` component using `CardList` instead of DataTable
   - **VERIFY**: Use existing event types directly
   - Integrate with pagination metadata from API
   - Fixed sorting to `created_at.desc` (newest first)
8. Add responsive design and accessibility features
9. Wrap the route in the shared ErrorBoundary and Suspense with the `Loading` overlay
10. Add comprehensive error handling for all API failure scenarios
11. Write unit tests for components and hooks
12. Add integration tests for the complete telemetry view
