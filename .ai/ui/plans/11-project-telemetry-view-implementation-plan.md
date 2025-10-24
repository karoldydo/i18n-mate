# View Implementation Plan - Project Telemetry

## 1. Overview

The Project Telemetry view displays analytics and usage statistics for a specific i18n project. The view shows key performance indicators (KPIs) and charts based on telemetry events (project_created, language_added, key_created, translation_completed) to help project owners understand their translation project's progress and usage patterns. The view includes date filtering capabilities and focuses on metrics like multilingual project adoption and LLM translation usage.

## 2. View Routing

`/projects/:id/telemetry`

The route will be added to the main router configuration in `src/app/routes.ts` with lazy loading for optimal performance.

## 3. Component Structure

```markdown
ProjectTelemetryPage
├── TelemetryHeader
│ ├── Breadcrumb navigation
│ └── Project title display
├── TelemetryFilters
│ ├── DateRangePicker
│ └── Clear filters button
├── TelemetryKPIs
│ ├── KPICard (multilingual projects %)
│ ├── KPICard (avg keys per language)
│ └── KPICard (LLM translation usage %)
├── TelemetryCharts
│ ├── EventsTimelineChart
│ ├── EventTypeDistributionChart
│ └── LanguageProgressChart
└── TelemetryEventsTable
├── EventsTableHeader
├── EventsTableRow
└── EventsTablePagination
```

## 4. Component Details

### ProjectTelemetryPage

- **Component description**: Main container component that orchestrates the telemetry view, handles data fetching and provides context to child components
- **Main elements**: Header section, filters section, KPIs grid, charts grid, and events table
- **Handled events**: Date range changes, filter resets
- **Handled validation**: Project ID validation from URL params, date range validation
- **Types**: ProjectTelemetryPageProps (projectId: string)
- **Props**: projectId (string) - extracted from URL params

### TelemetryHeader

- **Component description**: Displays breadcrumb navigation and project information at the top of the telemetry view
- **Main elements**: Breadcrumb component, project name display, back navigation link
- **Handled events**: Back navigation click
- **Handled validation**: None
- **Types**: TelemetryHeaderProps (projectName: string, projectId: string)
- **Props**: projectName, projectId

### TelemetryFilters

- **Component description**: Contains date filtering controls and filter management
- **Main elements**: DateRangePicker component, clear filters button
- **Handled events**: Date range selection, clear filters
- **Handled validation**: Date range logical validation (start date before end date)
- **Types**: TelemetryFiltersProps (onDateRangeChange: function, onClearFilters: function)
- **Props**: onDateRangeChange, onClearFilters, currentDateRange

### TelemetryKPIs

- **Component description**: Displays key performance indicators in a responsive grid layout
- **Main elements**: Three KPICard components showing percentage metrics
- **Handled events**: None (static display)
- **Handled validation**: None
- **Types**: TelemetryKPIsProps (kpiData: KPIMetrics)
- **Props**: kpiData (calculated metrics object)

### TelemetryCharts

- **Component description**: Container for various chart components displaying telemetry data visualizations
- **Main elements**: Timeline chart, distribution pie chart, and progress bar chart
- **Handled events**: Chart interactions (tooltips, legends)
- **Handled validation**: Data availability checks
- **Types**: TelemetryChartsProps (events: TelemetryEventResponse[], dateRange?: DateRange)
- **Props**: events array, optional dateRange for filtering

### TelemetryEventsTable

- **Component description**: Displays raw telemetry events in a paginated table format
- **Main elements**: Table header, event rows, pagination controls
- **Handled events**: Sort changes, pagination, row expansion for details
- **Handled validation**: None
- **Types**: TelemetryEventsTableProps (events: TelemetryEventResponse[], loading: boolean)
- **Props**: events, loading, pagination state

### DateRangePicker

- **Component description**: Custom date range picker component for filtering telemetry data
- **Main elements**: Start date input, end date input, preset buttons
- **Handled events**: Date selection, preset selection
- **Handled validation**: Date range validation, maximum range limits
- **Types**: DateRangePickerProps (value: DateRange, onChange: function)
- **Props**: value, onChange, maxRangeInDays

### KPICard

- **Component description**: Reusable card component for displaying individual KPI metrics
- **Main elements**: Metric value, label, optional trend indicator
- **Handled events**: None
- **Handled validation**: None
- **Types**: KPICardProps (value: number, label: string, format: 'percentage' | 'number')
- **Props**: value, label, format, trend

### EventsTimelineChart

- **Component description**: Line chart showing event frequency over time
- **Main elements**: Chart canvas, tooltips, legend
- **Handled events**: Tooltip display, legend filtering
- **Handled validation**: Data points validation
- **Types**: EventsTimelineChartProps (events: TelemetryEventResponse[])
- **Props**: events, dateRange

### EventTypeDistributionChart

- **Component description**: Pie/donut chart showing distribution of event types
- **Main elements**: Chart segments, labels, legend
- **Handled events**: Segment hover, legend interaction
- **Handled validation**: Non-zero data validation
- **Types**: EventTypeDistributionChartProps (events: TelemetryEventResponse[])
- **Props**: events

### LanguageProgressChart

- **Component description**: Bar chart showing translation progress per language
- **Main elements**: Bars for each language, value labels
- **Handled events**: Bar hover for details
- **Handled validation**: Language data availability
- **Types**: LanguageProgressChartProps (events: TelemetryEventResponse[])
- **Props**: events

## 5. Types

### New ViewModel Types

```typescript
// Date range for filtering
interface DateRange {
  startDate: Date;
  endDate: Date;
}

// KPI metrics calculated from telemetry data
interface KPIMetrics {
  multilingualProjectsPercentage: number; // Projects with >=2 languages after 7 days
  averageKeysPerLanguage: number; // Average keys per language after 7 days
  llmTranslationUsagePercentage: number; // Percentage of translations using LLM
}

// Chart data structures
interface TimelineDataPoint {
  date: string;
  eventCount: number;
  eventType: string;
}

interface DistributionDataPoint {
  eventType: string;
  count: number;
  percentage: number;
}

interface LanguageProgressDataPoint {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  completionPercentage: number;
}

// Component props interfaces
interface ProjectTelemetryPageProps {
  projectId: string;
}

interface TelemetryHeaderProps {
  projectName: string;
  projectId: string;
}

interface TelemetryFiltersProps {
  currentDateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
}

interface TelemetryKPIsProps {
  kpiData: KPIMetrics;
  loading: boolean;
}

interface TelemetryChartsProps {
  events: TelemetryEventResponse[];
  dateRange?: DateRange;
  loading: boolean;
}

interface TelemetryEventsTableProps {
  events: TelemetryEventResponse[];
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}
```

## 6. State Management

The view will use a custom hook `useProjectTelemetry` for state management. This hook will:

- Manage date range filtering state
- Coordinate data fetching using `useTelemetryEvents`
- Calculate KPI metrics from raw telemetry data
- Handle loading states and error states
- Provide filtered data to chart components

Key state variables:

- `dateRange`: Optional DateRange for filtering
- `events`: Array of TelemetryEventResponse
- `kpiMetrics`: Calculated KPIMetrics object
- `loading`: Boolean for overall loading state
- `error`: Error state for API failures

## 7. API Integration

The view integrates with the existing `useTelemetryEvents` hook:

**Request**: `useTelemetryEvents(projectId, { limit: 1000, order: 'created_at.desc' })`
**Response**: `TelemetryEventResponse[]`

The hook handles:

- Authentication (owner/service_role only)
- Validation (UUID format, pagination limits)
- Error handling (401/403/404/500 responses)
- Caching (5 minute stale time, 10 minute gc time)

Data is fetched once on mount and cached for performance. Date filtering is handled client-side on the fetched data.

## 8. User Interactions

1. **Date Range Selection**: User selects start/end dates or uses presets (Last 7 days, Last 30 days, Last 90 days)
2. **Clear Filters**: Resets date range to show all data
3. **Chart Interactions**: Hover tooltips, legend filtering, data point details
4. **Table Sorting**: Click column headers to sort events by date or event type
5. **Table Pagination**: Navigate through event pages
6. **Back Navigation**: Return to project details view

## 9. Conditions and Validation

### API Conditions

- **Project Ownership**: Only project owner can access telemetry (enforced by RLS)
- **Authentication**: User must be authenticated (401 if not)
- **Project Existence**: Returns 404 if project doesn't exist or user lacks access

### Component-Level Validation

- **Project ID**: Must be valid UUID format (from URL params)
- **Date Range**: Start date must be before end date, maximum range of 1 year
- **Data Availability**: Charts handle empty states gracefully
- **KPI Calculations**: Handle division by zero and missing data scenarios

### Interface State Conditions

- **Loading States**: Show skeletons during data fetch
- **Empty States**: Display appropriate messages when no telemetry data exists
- **Error States**: Show error messages with retry options
- **Filter States**: Disable inappropriate controls when data is loading

## 10. Error Handling

### Network Errors

- API failures display toast error messages
- Retry mechanisms for transient failures
- Graceful degradation (show cached data if available)

### Data Errors

- Invalid telemetry data formats are filtered out
- KPI calculations handle missing or malformed event properties
- Charts display error states for corrupted data

### User Errors

- Invalid date ranges show inline validation messages
- Missing project access shows appropriate error page
- Network timeouts display retry options

### Accessibility Errors

- Chart alternatives provided for screen readers
- Keyboard navigation maintained in error states
- Color contrast preserved in error displays

## 11. Implementation Steps

1. **Add Chart Dependencies**: Install recharts library for data visualization components
2. **Create Chart Components**: Implement reusable chart components (TimelineChart, DistributionChart, ProgressChart)
3. **Create KPI Components**: Build KPICard and TelemetryKPIs components
4. **Create Filter Components**: Implement DateRangePicker and TelemetryFilters
5. **Create Table Components**: Build TelemetryEventsTable with sorting and pagination
6. **Create Main Page Component**: Implement ProjectTelemetryPage with layout
7. **Add State Management Hook**: Create useProjectTelemetry hook for data coordination
8. **Add Routing**: Update routes.ts with new telemetry route
9. **Add Navigation**: Update project details view to include telemetry link
10. **Implement KPI Calculations**: Add utility functions for metric calculations
11. **Add Error Boundaries**: Implement error handling for chart rendering failures
12. **Add Loading States**: Implement skeleton components for better UX
13. **Add Accessibility Features**: Ensure charts have proper ARIA labels and keyboard navigation
14. **Add Tests**: Create unit tests for components and integration tests for the view
15. **Performance Optimization**: Implement memoization for expensive calculations and chart rendering
