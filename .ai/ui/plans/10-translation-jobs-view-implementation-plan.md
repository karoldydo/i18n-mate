# Translation Jobs View Implementation Plan

## 1. Overview

The translation jobs view provides comprehensive monitoring, management, and creation capabilities for LLM-powered translation jobs within a project. It displays a paginated history of translation jobs with real-time status updates, progress indicators, and job management actions (cancel running jobs). The view also enables users to create new translation jobs for translating keys from the default language to other project locales, with support for different translation modes (all keys, selected keys, or single key). Users can monitor active translation processes initiated from this view or other parts of the application, with detailed progress tracking and completion notifications.

## 2. View Routing

- **Path**: `/projects/:id/translation-jobs`
- **Route Type**: Standard React Router route with lazy loading and project ID parameter validation
- **Access**: Requires authenticated user with project ownership (enforced by API RLS policies)
- **Navigation Context**: Accessible from project navigation menu after project creation

## 3. Component Structure

```markdown
TranslationJobsPage (main page component)
├── BackButton (navigation to project details)
├── PageHeader (shared header component with title and description)
├── CardList (shared card container component)
│ ├── Actions (refresh button, create job button)
│ ├── TranslationJobCard[] (feature-specific cards)
│ │ ├── JobBasicInfo (mode, target locale, created time)
│ │ ├── JobProgressIndicator (progress bar, key counts)
│ │ ├── JobStatusBadge (status with color coding)
│ │ └── JobActions (cancel button for eligible jobs)
│ ├── EmptyState (shared component when no jobs)
│ └── CardListPagination (offset-based pagination controls)
├── CreateTranslationJobDialog (create new translation job)
│ ├── JobModeSelector (all/selected/single mode selection)
│ ├── TargetLocaleSelector (locale dropdown excluding default)
│ ├── KeySelector (for selected/single modes)
│ ├── OverwriteWarning (existing translations warning)
│ └── CreateJobActions (create/cancel buttons)
├── JobProgressModal (progress tracking for active jobs)
│ ├── ProgressHeader (job info, status)
│ ├── ProgressBar (visual progress indicator)
│ ├── ProgressStats (completed/failed/total counts)
│ └── ProgressActions (cancel button, close button)
└── CancelJobDialog (confirmation dialog for job cancellation)
```

## 4. Component Details

### TranslationJobsPage

- **Component description**: Main page component that orchestrates the translation jobs view, manages data fetching, handles modal states, coordinates real-time updates, and provides translation job creation capabilities
- **Main elements**: Page layout with header (including create job button), data table, create job dialog, progress modal, and cancellation dialog
- **Handled interactions**: Page load, create job button, refresh button, modal open/close, real-time polling coordination, job creation flow
- **Handled validation**: Project ID parameter validation, route access permissions
- **Types**: TranslationJobResponse[], JobProgressState, CancelJobState, CreateJobState
- **Props**: None (route component receiving projectId from URL params)

### PageHeader

- **Component description**: Shared header component from `@/shared/components` providing consistent page layouts with title and optional subheading or custom content. Used here with header "Translation Jobs" and custom children content with description.
- **Main elements**: Heading (h1), optional subheading text or custom children content
- **Handled interactions**: None (presentational component)
- **Handled validation**: None
- **Types**: None
- **Props**: header (string), subHeading (string | null), children (ReactNode, optional)

### CardList

- **Component description**: Generic shared component for displaying lists of cards with optional actions, pagination, and empty state support. Used here to display translation job cards.
- **Main elements**: Header with optional actions, card grid, pagination controls, empty state display
- **Handled interactions**: Action button clicks, pagination navigation
- **Handled validation**: None
- **Types**: PaginationParams, PaginationMetadata
- **Props**: actions?: ReactNode, pagination?: { metadata, params, onPageChange }, emptyState?: ReactNode, children: ReactNode, data-testid?: string

### EmptyState

- **Component description**: Shared empty state component from `@/shared/components` for consistent empty state handling. Displays icon, header text, description, and optional action buttons. Used here with header "No translation jobs yet" and description about creating first job.
- **Main elements**: Icon (default Inbox), header text, description text, optional actions
- **Handled interactions**: None (presentational component)
- **Handled validation**: None
- **Types**: None
- **Props**: header (string), description (string), icon?: ReactNode, actions?: ReactElement

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

### CreateTranslationJobDialog

- **Component description**: Modal dialog for creating new translation jobs with mode selection, target locale choice, key selection, and overwrite warnings
- **Main elements**: Shadcn Dialog with form fields for job configuration, mode selector, locale dropdown, key selector, overwrite warning, and action buttons
- **Handled interactions**: Mode selection changes UI state, locale selection validation, key selection for applicable modes, overwrite confirmation, job creation submission
- **Handled validation**: Target locale cannot be default locale, mode-specific key requirements, project ownership validation, active job conflict prevention
- **Types**: CreateTranslationJobRequest, TranslationMode, ProjectLocales, KeySelectionState
- **Props**: projectId: string, projectLocales: LocaleResponse[], defaultLocale: string, isOpen: boolean, onOpenChange: (open) => void, onCreateJob: (request) => void, isLoading: boolean

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

- **useTranslationJobs**: Fetches paginated job history with 2-minute stale time, invalidated on job completion/creation
- **useActiveTranslationJob**: Polls for active jobs with custom polling intervals
- **useCancelTranslationJob**: Handles job cancellation with optimistic updates
- **useCreateTranslationJob**: Handles job creation with immediate progress modal opening
- **useProjectLocales**: Fetches project locales for target locale selection (exclude default locale)
- **useProjectKeys**: Fetches project keys for key selection in selected/single modes

Local component state managed with useState:

- Modal open/close states (create dialog, progress modal, cancel dialog)
- Table sorting and pagination state
- Create job form state (mode, target locale, selected keys)
- Polling state for active job monitoring
- Overwrite confirmation state
- Loading states (handled by TanStack Query)

Custom hooks required:

- **useJobPolling**: Manages polling logic with exponential backoff (2000, 2000, 3000, 5000, 5000ms intervals)
- **useJobProgress**: Coordinates progress modal state and polling lifecycle
- **useCreateJobForm**: Manages create job dialog state and validation logic

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

### Create Translation Job

- **Endpoint**: POST /functions/v1/translate
- **Request**: CreateTranslationJobRequest ({ key_ids: string[], mode: TranslationMode, project_id: string, target_locale: string, params?: TranslationJobParams })
- **Response**: CreateTranslationJobResponse ({ job_id: string, message: string, status: 'pending' })
- **Validation**: Target locale must exist in project and not be default locale, mode-specific key validation, no active jobs allowed
- **Side Effects**: Creates translation job record, job items, starts async LLM processing, invalidates active job queries
- **Error Handling**: 400 for validation errors, 409 for active job conflicts, 429 for rate limits

## 8. User Interactions

### Job List View

- **Load**: Display paginated table sorted by creation date descending (most recent first)
- **Create Job**: "Create Translation Job" button opens create dialog
- **Refresh**: Manual refresh button to invalidate cache and refetch job list
- **Sorting**: Click column headers to sort by created_at, status, mode, or target_locale
- **Pagination**: Navigate between pages (20 items per page default)
- **Row Actions**: Cancel button for jobs with status 'pending' or 'running'

### Create Translation Job Dialog

- **Mode Selection**: Choose between 'all' (translate all keys), 'selected' (choose specific keys), or 'single' (translate one key)
- **Target Locale**: Select target language from project locales (excluding default locale)
- **Key Selection**: For 'selected'/'single' modes, select keys from searchable/filterable list
- **Overwrite Warning**: Show count of existing translations that will be overwritten, require confirmation
- **Create**: Submit job creation, show loading state, close dialog on success, open progress modal
- **Cancel**: Close dialog without action

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
- **Action Availability**: Cancel buttons only shown for cancellable jobs (pending/running status), create button disabled when active job exists
- **Modal State**: Progress modal only opens for jobs with active status, create dialog closes after successful job creation
- **Create Job Form**: Target locale dropdown excludes default locale, key selection required for selected/single modes
- **Overwrite Confirmation**: Checkbox required when existing translations will be overwritten
- **Polling Safety**: Polling automatically stops for completed/failed/cancelled jobs
- **Progress Bounds**: Progress percentage clamped to 0-100 range for UI safety

### Business Logic Validation

- **One Active Job**: UI prevents creating new jobs when active job exists, prevents showing multiple progress modals
- **Target Locale Restriction**: Cannot select default locale as target (enforced by API and UI)
- **Mode-Specific Requirements**: 'selected' and 'single' modes require key_ids array, 'all' mode uses empty array
- **Job Lifecycle**: Status badges and actions reflect current job state accurately
- **Progress Accuracy**: Progress calculation handles edge cases (zero total keys, failed jobs)
- **Key Existence**: Selected keys must exist in project (validated by API)

## 10. Error Handling

### Network Errors

- **Connection Issues**: TanStack Query retry logic with exponential backoff
- **Timeout Errors**: Polling automatically stops after extended failures
- **Rate Limiting**: 429 responses handled with user-friendly error messages

### API Errors

- **401 Unauthorized**: Global auth handling redirects to login
- **403 Forbidden**: Project access denied, show permission error message
- **404 Not Found**: Job not found or access denied, refresh job list
- **409 Conflict**: Multiple active jobs prevented by UI/API constraints, show active job exists message
- **400 Bad Request**: Invalid cancellation state or invalid create job parameters (target locale is default, missing keys), show validation errors
- **429 Rate Limited**: Show rate limit message with retry suggestion

### Business Logic Errors

- **Polling Failures**: Graceful degradation, continue with cached data
- **Job State Inconsistency**: Refresh job list when local state conflicts with server
- **Progress Calculation Errors**: Fallback to indeterminate progress indicators

### UI Error States

- **Loading States**: Route-level Suspense fallback shows the shared full-screen `Loading` overlay; card list updates once data resolves, dialogs keep local spinners.
- **Empty States**: Uses shared `EmptyState` component from `@/shared/components` with header "No translation jobs yet" and description about creating first translation job
- **Error Boundaries**: Shared ErrorBoundary around the route surfaces query failures with retry/reload actions.
- **Toast Notifications**: Success/error feedback for all user actions

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing types in `src/features/translation-jobs/api/` and `src/shared/types/`
- Use existing `TranslationJobResponse`, `CreateTranslationJobRequest` types directly
- Verify `useCreateTranslationJob` hook exists and is functional
- Check project locales and keys API hooks for integration

1. **Set up routing and basic page structure**
   - Add lazy-loaded route in routes.ts with project ID parameter
   - Create TranslationJobsPage component with basic layout and header
   - Implement project ID validation and error handling
   - **VERIFY**: Use existing `TranslationJobResponse` type (DO NOT create aliases)

2. **Implement job list with card-based display**
   - Set up CardList shared component for job display
   - Create TranslationJobCard component following ProjectCard/KeyCard pattern
   - Integrate useTranslationJobs hook with pagination
   - **VERIFY**: Use existing response types directly
   - Add pagination controls via CardList
   - Use shared EmptyState component for empty state handling

3. **Add create translation job dialog**
   - Create CreateTranslationJobDialog component with mode selection
   - Integrate useProjectLocales for target locale dropdown (exclude default)
   - Add form validation for target locale restrictions
   - Implement mode-specific key selection for selected/single modes

4. **Implement key selection functionality**
   - Create KeySelector component with searchable/filterable key list
   - Integrate useProjectKeys hook for key fetching
   - Add multi-select for 'selected' mode, single-select for 'single' mode
   - Implement overwrite warning with existing translation counts

5. **Add job status and progress indicators**
   - Create JobStatusBadge component with color-coded status display
   - Implement JobProgressIndicator with progress bar and statistics
   - Add status-specific styling and accessibility attributes

6. **Implement real-time job monitoring**
   - Create useJobPolling custom hook with exponential backoff logic
   - Implement JobProgressModal with live progress updates
   - Add automatic modal opening for active jobs and after job creation

7. **Add job cancellation functionality**
   - Create CancelJobDialog with confirmation flow
   - Integrate useCancelTranslationJob hook with optimistic updates
   - Add cancel button to eligible job rows with proper state management

8. **Integrate create job functionality**
   - Add "Create Translation Job" button to CardList actions prop
   - Add refresh button to CardList actions prop (shown only when jobs exist)
   - Implement create job mutation with useCreateTranslationJob hook
   - Handle successful creation: close dialog, open progress modal, show success toast
   - Add error handling for validation failures and active job conflicts

9. **Implement error handling and edge cases**
   - Add comprehensive error handling for API failures
   - Implement loading states and skeleton loaders
   - Handle empty states and permission errors gracefully
   - Add validation for active job existence during creation

10. **Add accessibility and responsive design**
    - Implement ARIA live regions for status updates
    - Add keyboard navigation support for all interactive elements
    - Ensure mobile-responsive layout and touch-friendly interactions
    - Add screen reader support for overwrite warnings and progress updates

11. **Add advanced features and polish**
    - Implement manual refresh functionality
    - Add progress modal auto-management based on job lifecycle
    - Optimize polling performance and error recovery
    - Add comprehensive testing and documentation
    - Implement form state persistence and recovery
