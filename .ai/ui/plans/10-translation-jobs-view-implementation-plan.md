# Translation Jobs View Implementation Plan

## 1. Overview

The translation jobs view provides monitoring and management capabilities for LLM-powered translation jobs within a project. It displays a paginated history of translation jobs with real-time status updates, progress indicators, and the ability to cancel running jobs. The view supports monitoring active translation processes initiated from other parts of the application and provides detailed information about job execution including success/failure counts and timing.

## 2. View Routing

- **Path**: `/projects/:id/translation-jobs`
- **Route Type**: Standard React Router route with lazy loading and project ID parameter validation
- **Access**: Requires authenticated user with project ownership (enforced by API RLS policies)
- **Navigation Context**: Accessible from project navigation menu after project creation

## 3. Component Structure

```markdown
TranslationJobsPage (main page component)
├── PageHeader (title, refresh button)
├── TranslationJobsTable (data table component)
│ ├── TableHeader (column headers with sorting)
│ ├── JobTableRow (individual job rows)
│ │ ├── JobBasicInfo (mode, target locale, created time)
│ │ ├── JobProgressIndicator (progress bar, key counts)
│ │ ├── JobStatusBadge (status with color coding)
│ │ └── JobActions (cancel button for eligible jobs)
│ └── TablePagination (pagination controls)
├── JobProgressModal (progress tracking for active jobs)
│ ├── ProgressHeader (job info, status)
│ ├── ProgressBar (visual progress indicator)
│ ├── ProgressStats (completed/failed/total counts)
│ └── ProgressActions (cancel button, close button)
└── CancelJobDialog (confirmation dialog for job cancellation)
```

## 4. Component Details

### TranslationJobsPage

- **Component description**: Main page component that orchestrates the translation jobs view, manages data fetching, handles modal states, and coordinates real-time updates
- **Main elements**: Page layout with header, data table, progress modal, and cancellation dialog
- **Handled interactions**: Page load, refresh button, modal open/close, real-time polling coordination
- **Handled validation**: Project ID parameter validation, route access permissions
- **Types**: TranslationJobResponse[], JobProgressState, CancelJobState
- **Props**: None (route component receiving projectId from URL params)

### TranslationJobsTable

- **Component description**: Data table displaying translation jobs with sorting, pagination, and inline actions
- **Main elements**: Shadcn DataTable with custom columns, sorting indicators, and pagination controls
- **Handled interactions**: Column sorting, pagination navigation, row action clicks
- **Handled validation**: None (data validation handled by API and parent component)
- **Types**: TranslationJobResponse[], Table sorting and pagination state
- **Props**: jobs: TranslationJobResponse[], isLoading: boolean, pagination: PaginationState, onSort: (column, direction) => void, onCancelJob: (job) => void

### JobProgressIndicator

- **Component description**: Visual progress component showing translation completion status with progress bar and statistics
- **Main elements**: Shadcn Progress component, status text, completion counters
- **Handled interactions**: None (display-only component)
- **Handled validation**: Progress percentage calculation (0-100 range)
- **Types**: JobDisplayInfo (subset of TranslationJobResponse)
- **Props**: job: JobDisplayInfo, showDetails: boolean

### JobStatusBadge

- **Component description**: Status indicator component with color-coded badges and appropriate ARIA labels for accessibility
- **Main elements**: Shadcn Badge component with status-specific styling and icons
- **Handled interactions**: None (display-only component)
- **Handled validation**: Status enum validation
- **Types**: JobStatus enum
- **Props**: status: JobStatus, size?: 'sm' | 'md'

### JobProgressModal

- **Component description**: Modal dialog for monitoring active translation job progress with real-time updates
- **Main elements**: Shadcn Dialog with progress visualization, statistics, and action buttons
- **Handled interactions**: Modal open/close, cancel job action, periodic data refresh
- **Handled validation**: Job status validation (only show for active jobs), progress bounds checking
- **Types**: JobProgressState, TranslationJobResponse
- **Props**: job: TranslationJobResponse, isOpen: boolean, onOpenChange: (open) => void, onCancelJob: (job) => void

### CancelJobDialog

- **Component description**: Confirmation dialog for cancelling translation jobs with warning about irreversible operation
- **Main elements**: Shadcn AlertDialog with job details and confirmation buttons
- **Handled interactions**: Cancel confirmation, dialog dismissal
- **Handled validation**: Job cancellability validation (only pending/running jobs)
- **Types**: TranslationJobResponse
- **Props**: job: TranslationJobResponse, isOpen: boolean, onOpenChange: (open) => void, onConfirmCancel: () => void, isLoading: boolean

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/translation-jobs/api/` (or similar)**
   - Use `TranslationJobResponse` directly from existing API types
   - Use `ListTranslationJobsParams` and other request types from API
   - DO NOT create type aliases or duplicate interfaces
   - DO NOT create unnecessary view model types when API types suffice

2. **Use existing types directly in components:**
   - For data display: use `TranslationJobResponse` type
   - For API queries: use existing params types
   - Only create minimal UI state types if absolutely necessary (e.g., polling state)

### API Integration Types to Verify and Use

- **Request Types**: `ListTranslationJobsParams`, `CancelTranslationJobRequest` (verify existence, use directly)
- **Response Types**: `ListTranslationJobsResponse`, `CheckActiveJobResponse`, `TranslationJobResponse` (use directly)
- **Error Types**: `ApiErrorResponse` from `@/shared/types`

## 6. State Management

State is managed using TanStack Query hooks for server state and React useState for local UI state:

- **useTranslationJobs**: Fetches paginated job history with 2-minute stale time, invalidated on job completion
- **useActiveTranslationJob**: Polls for active jobs with custom polling intervals
- **useCancelTranslationJob**: Handles job cancellation with optimistic updates

Local component state managed with useState:

- Modal open/close states (progress modal, cancel dialog)
- Table sorting and pagination state
- Polling state for active job monitoring
- Loading states (handled by TanStack Query)

Custom hooks required:

- **useJobPolling**: Manages polling logic with exponential backoff (2000, 2000, 3000, 5000, 5000ms intervals)
- **useJobProgress**: Coordinates progress modal state and polling lifecycle

## 7. API Integration

### List Translation Jobs

- **Endpoint**: GET /rest/v1/translation_jobs?project_id=eq.{project_id}&order=created_at.desc&limit=20
- **Query Params**: project_id (required), limit (optional, default 20), offset (optional, default 0)
- **Request**: ListTranslationJobsParams
- **Response**: ListTranslationJobsResponse (paginated array of TranslationJobResponse)
- **Caching**: 2-minute stale time, invalidated after job creation/cancellation/completion

### Check Active Job

- **Endpoint**: GET /rest/v1/translation_jobs?project_id=eq.{project_id}&status=in.(pending,running)&limit=1
- **Request**: CheckActiveJobParams ({ project_id: string })
- **Response**: CheckActiveJobResponse (array with 0-1 active jobs)
- **Polling**: Exponential backoff intervals during translation progress monitoring

### Cancel Translation Job

- **Endpoint**: PATCH /rest/v1/translation_jobs?id=eq.{job_id}
- **Request**: CancelTranslationJobRpcArgs ({ job_id: string, status: 'cancelled' })
- **Response**: TranslationJobResponse with updated status and finished_at timestamp
- **Side Effects**: Job status change, progress polling termination

## 8. User Interactions

### Job List View

- **Load**: Display paginated table sorted by creation date descending (most recent first)
- **Refresh**: Manual refresh button to invalidate cache and refetch job list
- **Sorting**: Click column headers to sort by created_at, status, mode, or target_locale
- **Pagination**: Navigate between pages (20 items per page default)
- **Row Actions**: Cancel button for jobs with status 'pending' or 'running'

### Progress Modal

- **Auto-open**: Opens automatically when active job detected on page load or after job creation
- **Real-time Updates**: Progress bar and statistics update via polling
- **Cancel Action**: Cancel button allows stopping translation mid-process
- **Close**: Close button available, modal reopens if job remains active
- **Status Changes**: Modal closes automatically when job reaches terminal state (completed/failed/cancelled)

### Cancel Job Dialog

- **Trigger**: Cancel button click on eligible job rows
- **Confirmation**: Displays job details and irreversible operation warning
- **Submit**: Confirms cancellation, shows loading state, closes on success
- **Cancel**: Dismisses dialog without action

### Real-time Monitoring

- **Active Job Detection**: Automatic polling when page loads if active jobs exist
- **Progress Updates**: Live progress bar updates during translation execution
- **Completion Handling**: Success/error toasts when jobs finish
- **Error Recovery**: Automatic retry with exponential backoff for transient failures

## 9. Conditions and Validation

### API-Level Validation

- **Project Access**: RLS policies ensure only project owners can view/manage jobs (403 Forbidden)
- **Job Ownership**: Jobs automatically scoped to project via foreign key relationships
- **Active Job Limit**: Database triggers prevent multiple concurrent active jobs per project (409 Conflict)
- **Cancel Eligibility**: Only jobs with status 'pending' or 'running' can be cancelled (400 Bad Request)
- **Status Transitions**: Valid state machine transitions enforced by database constraints

### UI-Level Validation

- **Route Parameters**: Project ID validated as UUID format in route definition
- **Action Availability**: Cancel buttons only shown for cancellable jobs (pending/running status)
- **Modal State**: Progress modal only opens for jobs with active status
- **Polling Safety**: Polling automatically stops for completed/failed/cancelled jobs
- **Progress Bounds**: Progress percentage clamped to 0-100 range for UI safety

### Business Logic Validation

- **One Active Job**: UI prevents showing multiple progress modals simultaneously
- **Job Lifecycle**: Status badges and actions reflect current job state accurately
- **Progress Accuracy**: Progress calculation handles edge cases (zero total keys, failed jobs)

## 10. Error Handling

### Network Errors

- **Connection Issues**: TanStack Query retry logic with exponential backoff
- **Timeout Errors**: Polling automatically stops after extended failures
- **Rate Limiting**: 429 responses handled with user-friendly error messages

### API Errors

- **401 Unauthorized**: Global auth handling redirects to login
- **403 Forbidden**: Project access denied, show permission error message
- **404 Not Found**: Job not found or access denied, refresh job list
- **409 Conflict**: Multiple active jobs prevented by UI/API constraints
- **400 Bad Request**: Invalid cancellation state, update UI to reflect current state

### Business Logic Errors

- **Polling Failures**: Graceful degradation, continue with cached data
- **Job State Inconsistency**: Refresh job list when local state conflicts with server
- **Progress Calculation Errors**: Fallback to indeterminate progress indicators

### UI Error States

- **Loading States**: Skeleton loaders for table rows and progress indicators
- **Empty States**: "No translation jobs found" message with helpful guidance
- **Error Boundaries**: Component-level error boundaries prevent full page crashes
- **Toast Notifications**: Success/error feedback for all user actions

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing types in `src/features/translation-jobs/api/` or similar location
- Check `src/shared/types/` for existing TypeScript types
- Use existing types directly - DO NOT create duplicates or aliases
- No schemas needed for this view (no create forms, only cancel action)

1. **Set up routing and basic page structure**
   - Add lazy-loaded route in routes.ts with project ID parameter
   - Create TranslationJobsPage component with basic layout and header
   - Implement project ID validation and error handling
   - **VERIFY**: Use existing `TranslationJobResponse` type (DO NOT create aliases)

2. **Implement job list table with basic display**
   - Set up Shadcn DataTable with job columns (mode, target_locale, status, created_at)
   - Integrate useTranslationJobs hook with pagination
   - **VERIFY**: Use existing response types directly
   - Add basic table sorting and pagination controls

3. **Add job status and progress indicators**
   - Create JobStatusBadge component with color-coded status display
   - Implement JobProgressIndicator with progress bar and statistics
   - Add status-specific styling and accessibility attributes

4. **Implement real-time job monitoring**
   - Create useJobPolling custom hook with exponential backoff logic
   - Implement JobProgressModal with live progress updates
   - Add automatic modal opening for active jobs

5. **Add job cancellation functionality**
   - Create CancelJobDialog with confirmation flow
   - Integrate useCancelTranslationJob hook with optimistic updates
   - Add cancel button to eligible job rows with proper state management

6. **Implement error handling and edge cases**
   - Add comprehensive error handling for API failures
   - Implement loading states and skeleton loaders
   - Handle empty states and permission errors gracefully

7. **Add accessibility and responsive design**
   - Implement ARIA live regions for status updates
   - Add keyboard navigation support for all interactive elements
   - Ensure mobile-responsive layout and touch-friendly interactions

8. **Add advanced features and polish**
   - Implement manual refresh functionality
   - Add progress modal auto-management based on job lifecycle
   - Optimize polling performance and error recovery
   - Add comprehensive testing and documentation
