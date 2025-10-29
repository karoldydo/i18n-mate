# Keys List (Default Language View) Implementation Plan

## 1. Overview

The keys list default view displays translation keys for a project showing values in the default language along with missing translation counts for other languages. It provides a comprehensive interface for managing keys including search, filtering, pagination, inline editing, adding new keys, and deletion. This view serves as the primary interface for key management in the i18n-mate application.

## 2. View Routing

- **Path**: `/projects/:projectId/keys`
- **Route Type**: Standard React Router route with lazy loading
- **Access**: Requires authenticated user with project ownership
- **Parameters**: `projectId` (UUID) extracted from URL params

## 3. Component Structure

```markdown
KeysListPage (main page component)
├── PageHeader
│ ├── PageTitle
│ └── AddKeyButton
├── SearchAndFilterBar
│ ├── SearchInput
│ └── MissingFilterToggle
├── KeysDataTable
│ ├── TableHeader
│ │ ├── ColumnHeader (Key)
│ │ ├── ColumnHeader (Default Value)
│ │ └── ColumnHeader (Missing Count)
│ ├── KeyTableRow[] (with inline editing)
│ │ ├── KeyCell (read-only)
│ │ ├── ValueCell (editable)
│ │ └── MissingCountCell
│ └── TablePagination
├── AddKeyDialog
│ ├── KeyForm
│ └── ValidationMessages
└── DeleteKeyDialog
├── ConfirmationMessage
└── DeleteButton
```

## 4. Component Details

### KeysListPage

- **Component description**: Main page component that orchestrates the keys list view, handles routing, manages dialog states, and coordinates data flow between child components
- **Main elements**: Page layout with header, search/filter bar, data table, and modal dialogs
- **Handled interactions**: Page initialization, dialog state management, navigation error handling
- **Handled validation**: Project ID validation from URL params
- **Types**: Project ID from route params, dialog state booleans
- **Props**: None (route component using useParams)

### PageHeader

- **Component description**: Header section with page title and primary action button
- **Main elements**: Title text and add key button
- **Handled interactions**: Add key button click opens dialog
- **Handled validation**: None
- **Types**: Project name string (optional)
- **Props**: projectName?: string, onAddKey: () => void

### SearchAndFilterBar

- **Component description**: Horizontal bar containing search input and missing filter toggle
- **Main elements**: Flex container with search input and toggle components
- **Handled interactions**: Search input changes, filter toggle changes
- **Handled validation**: Search input debouncing
- **Types**: Search value string, missing filter boolean
- **Props**: searchValue: string, onSearchChange: (value: string) => void, missingOnly: boolean, onMissingToggle: (enabled: boolean) => void

### SearchInput

- **Component description**: Debounced search input for filtering keys by name
- **Main elements**: Shadcn Input component with search icon
- **Handled interactions**: Input value changes with debouncing
- **Handled validation**: Input sanitization, length limits
- **Types**: Search string value
- **Props**: value: string, onChange: (value: string) => void, placeholder?: string

### MissingFilterToggle

- **Component description**: Toggle switch to filter keys with missing translations
- **Main elements**: Shadcn Switch component with label
- **Handled interactions**: Toggle state changes
- **Handled validation**: None
- **Types**: Boolean state
- **Props**: enabled: boolean, onToggle: (enabled: boolean) => void, label: string

### KeysDataTable

- **Component description**: Data table displaying keys with pagination and inline editing capabilities
- **Main elements**: Shadcn Table with custom columns, rows, and pagination
- **Handled interactions**: Row editing, pagination navigation, sort state changes
- **Handled validation**: None (handled by child components)
- **Types**: KeyDefaultViewResponse[], pagination metadata, editing state
- **Props**: keys: KeyDefaultViewResponse[], isLoading: boolean, pagination: PaginationMetadata, onPageChange: (page: number) => void, editingKeyId: string | null, onEditStart: (keyId: string) => void, onEditSave: (keyId: string, newValue: string) => void, onEditCancel: () => void, onDeleteKey: (key: KeyDefaultViewResponse) => void

### KeyTableRow

- **Component description**: Individual table row representing a single key with inline editing for values
- **Main elements**: Table row with cells for key, value, missing count, and actions
- **Handled interactions**: Value cell editing (double-click or focus), save/cancel actions, delete action
- **Handled validation**: Value format validation during editing
- **Types**: KeyDefaultViewResponse, editing state
- **Props**: key: KeyDefaultViewResponse, isEditing: boolean, onEditStart: () => void, onEditSave: (newValue: string) => void, onEditCancel: () => void, onDelete: () => void

### ValueCell

- **Component description**: Editable cell component for key values with inline editing
- **Main elements**: Display text or input field with save/cancel buttons
- **Handled interactions**: Double-click to edit, Enter/Escape keys, blur events
- **Handled validation**: Character limit (250), no newlines, required for default language
- **Types**: String value, editing state, validation errors
- **Props**: value: string, isEditing: boolean, onEditStart: () => void, onSave: (newValue: string) => void, onCancel: () => void, error?: string

### TablePagination

- **Component description**: Pagination controls for navigating through key pages
- **Main elements**: Shadcn Pagination component with page numbers and navigation buttons
- **Handled interactions**: Page number clicks, previous/next navigation
- **Handled validation**: Page bounds checking
- **Types**: Pagination metadata (total, current page, page size)
- **Props**: currentPage: number, totalPages: number, onPageChange: (page: number) => void

### AddKeyDialog

- **Component description**: Modal dialog for creating new translation keys
- **Main elements**: Shadcn Dialog with form fields for key name and default value
- **Handled interactions**: Form submission, validation feedback, success handling
- **Handled validation**: Key format validation, uniqueness checking, value requirements
- **IMPORTANT - Types and Schemas**:
  - **VERIFY** existing schema in keys API schemas file and use it
  - Use `CreateKeyRequest` type from API (DO NOT create aliases)
  - DO NOT create duplicate schema in component file
- **Props**: open: boolean, onOpenChange: (open: boolean) => void, projectId: string, projectPrefix: string

### KeyForm

- **Component description**: Form component within AddKeyDialog for key creation
- **Main elements**: Form fields for key suffix and default value with validation messages
- **Handled interactions**: Form input changes, submission
- **Handled validation**: Real-time validation with error display
- **Types**: Form data with validation schema
- **Props**: onSubmit: (data: CreateKeyFormData) => void, projectPrefix: string, isSubmitting: boolean

### DeleteKeyDialog

- **Component description**: Confirmation dialog for irreversible key deletion
- **Main elements**: Shadcn AlertDialog with key information and confirmation buttons
- **Handled interactions**: Confirm/cancel actions
- **Handled validation**: None (confirmation-based)
- **Types**: KeyDefaultViewResponse
- **Props**: key: KeyDefaultViewResponse | null, open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isDeleting: boolean

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/keys/api/` (or similar)**
   - Use `CreateKeyRequest` directly from existing API types
   - Use `KeyDefaultViewResponse` from API response types
   - DO NOT create type aliases or duplicate interfaces
   - DO NOT create unnecessary view model types when API types suffice

2. **Use existing types directly in components:**
   - For AddKeyDialog: use `CreateKeyRequest` type
   - For data display: use `KeyDefaultViewResponse` type
   - Only create minimal UI state types if absolutely necessary

### API Integration Types to Verify and Use

- **Request Types**: `CreateKeyRequest`, `ListKeysDefaultViewParams` (check if exist in API layer, use directly)
- **Response Types**: `KeyDefaultViewListResponse`, `CreateKeyResponse`, `KeyDefaultViewResponse` (use directly)
- **Error Types**: `ApiErrorResponse` from `@/shared/types`

## 6. State Management

State is managed using a combination of TanStack Query for server state and React local state for UI interactions:

- **useKeysDefaultView**: Fetches paginated key list with 3-minute stale time, 10-minute garbage collection
- **useCreateKey**: Creates keys with optimistic updates and cache invalidation
- **useDeleteKey**: Deletes keys with optimistic updates and cache cleanup

Local component state managed with useState:

- Dialog open/closed states
- Currently editing key ID
- Selected key for deletion
- Form data and validation states
- Search input value with debouncing

Custom hooks needed:

- **useKeysListFilters**: Manages filter state with URL synchronization for bookmarkable searches
- **useDebouncedValue**: Provides debounced search input to prevent excessive API calls

No additional custom hooks required beyond existing API hooks and basic state management utilities.

## 7. API Integration

### List Keys (Default View)

- **Hook**: useKeysDefaultView
- **Endpoint**: GET /rest/v1/rpc/list_keys_default_view
- **Request**: { project_id: string, search?: string, missing_only?: boolean, limit?: number, offset?: number }
- **Response**: { data: KeyDefaultViewResponse[], metadata: { start: number, end: number, total: number } }
- **Caching**: 3-minute stale time, invalidated on key creation/deletion

### Create Key

- **Hook**: useCreateKey
- **Endpoint**: POST /rest/v1/rpc/create_key_with_value
- **Request**: { p_project_id: string, p_full_key: string, p_default_value: string }
- **Response**: { key_id: string }
- **Side Effects**: Invalidates all key list caches for the project, navigates to show new key

### Delete Key

- **Hook**: useDeleteKey
- **Endpoint**: DELETE /rest/v1/keys?id=eq.{key_id}
- **Request**: Key ID in query parameter
- **Response**: void (success) or error
- **Side Effects**: Removes from cache, invalidates all project key lists

## 8. User Interactions

### Keys List View

- **Load**: Display paginated table (50 items/page) sorted by key ascending
- **Search**: Real-time search with 300ms debouncing, "contains" semantics
- **Filter**: Toggle shows only keys with missing translations in other languages
- **Pagination**: Navigate between pages maintaining search/filter state
- **Inline Edit**: Double-click value cell or Tab navigation to enter edit mode
- **Save Edit**: Enter key or blur saves changes, shows success indicator
- **Cancel Edit**: Escape key or click outside cancels changes
- **Add Key**: Opens creation dialog with pre-filled project prefix
- **Delete Key**: Opens confirmation dialog with key details

### Add Key Dialog

- **Open**: Pre-populate with project prefix, focus on key suffix input
- **Validation**: Real-time validation with error messages for format violations
- **Submit**: Create key, show success toast, close dialog, scroll to new key
- **Cancel**: Close dialog without changes, clear form state

### Edit Value (Inline)

- **Enter Edit**: Double-click or keyboard navigation activates input field
- **Character Counter**: Shows current/max characters (250 limit)
- **Validation**: Prevents newlines, enforces length limits
- **Save**: Autosave on Enter/blur with loading indicator
- **Cancel**: Escape key reverts to original value

### Delete Key Dialog

- **Open**: Display key name and impact summary (cascading delete)
- **Confirm**: Delete key permanently, show success toast, close dialog
- **Cancel**: Close dialog without deletion

## 9. Conditions and Validation

### API-Level Validation (Enforced Server-Side)

- **Key Format**:
  - Must match `[a-z0-9._-]+` pattern
  - Cannot contain consecutive dots (`..`)
  - Cannot end with dot
  - Maximum 256 characters total
  - Must start with project prefix + "."
  - Unique within project scope
- **Value Format**:
  - Required for default language (cannot be null/empty)
  - Maximum 250 characters
  - No newline characters
  - Empty strings auto-converted to null (but prevented for default language)
- **Project Access**: RLS policies ensure only project owners can modify keys
- **Uniqueness**: Full key (prefix.key) must be unique per project

### UI-Level Validation (Client-Side Feedback)

- **Real-time Validation**: Form fields validate on change with immediate feedback
- **Key Creation**: Validates format, prefix requirement, uniqueness before submission
- **Inline Editing**: Validates value constraints during editing
- **Submit Prevention**: Disabled submit buttons when validation fails
- **Error Display**: Field-specific error messages from API responses

### Business Logic Conditions

- **Default Language**: Values cannot be null/empty in default language
- **Missing Translations**: Represented as null values, counted in missing_count
- **Cascade Delete**: Key deletion removes all translations across languages
- **Auto-fanout**: New keys automatically create null entries for all project languages

## 10. Error Handling

### Network and API Errors

- **Connection Issues**: TanStack Query retry logic (3 attempts), user-friendly error toasts
- **429 Rate Limiting**: Exponential backoff, informative error messages
- **5xx Server Errors**: Generic error handling with retry suggestions
- **Timeout Errors**: Automatic retry with user notification

### Validation Errors (400 Status)

- **Key Format Errors**: Display specific validation messages (consecutive dots, trailing dot, invalid characters)
- **Uniqueness Conflict (409)**: Highlight duplicate key with suggestion to modify
- **Invalid Project ID**: Redirect to projects list with error message
- **Value Validation**: Show character limits, newline restrictions

### Permission Errors

- **401 Unauthorized**: Redirect to login page
- **403 Forbidden**: Show access denied message, suggest checking project ownership
- **404 Not Found**: Handle deleted keys gracefully, refresh data if necessary

### Business Logic Errors

- **Key Not Found**: Handle concurrent deletion by refreshing the list
- **Project Not Owned**: Clear local data, redirect to accessible projects
- **Stale Data**: Automatic cache invalidation prevents consistency issues

### UI Error States

- **Loading States**: Suspense fallback renders the shared full-screen `Loading` overlay during data fetch; pagination updates keep optimistic state.
- **Empty States**: "No keys found" message with prominent add key button
- **Error States**: Shared ErrorBoundary surfaces query failures with retry and reload actions.
- **Partial Failures**: Handle individual operation failures without breaking entire interface

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing Zod schemas in `src/features/keys/api/` or similar location
- Check `src/shared/types/` for existing TypeScript types
- Use existing schemas and types directly - DO NOT create duplicates or aliases

1. **Set up routing and basic page structure**
   - Add lazy-loaded route in routes.ts with projectId parameter
   - Create KeysListPage component with basic layout and loading states
   - Implement project ID validation from URL params

2. **Implement data fetching and table display**
   - Set up useKeysDefaultView hook integration
   - Create KeysDataTable component with Shadcn Table
   - Add table columns for key, value, and missing count
   - Implement pagination controls

3. **Add search and filter functionality**
   - Create SearchAndFilterBar component
   - Implement debounced search input with useDebouncedValue hook
   - Add missing filter toggle with state management
   - Connect filters to API query parameters

4. **Implement inline editing for values**
   - Create ValueCell component with edit/save/cancel states
   - Add keyboard navigation (Enter, Escape, Tab)
   - Implement autosave functionality with loading indicators
   - Add character counter and validation feedback

5. **Create add key functionality**
   - **VERIFY**: Check for existing schemas before implementing
   - Implement AddKeyDialog with Shadcn Dialog
   - **VERIFY**: Use existing schema and `CreateKeyRequest` type (DO NOT create aliases)
   - Create KeyForm component with validation
   - Integrate useCreateKey hook with error handling
   - Add success feedback and navigation to new key

6. **Implement delete key functionality**
   - Create DeleteKeyDialog with confirmation messaging
   - Integrate useDeleteKey hook with cascade warning
   - Add irreversible operation warnings and success feedback

7. **Add error handling and edge cases**
   - Implement error boundaries and fallback UI
   - Add loading skeletons and empty states
   - Handle network errors and retry logic
   - Add concurrent modification handling

8. **Polish UX and accessibility**
   - Implement ARIA labels and keyboard navigation
   - Add screen reader announcements for dynamic content
   - Ensure responsive design for mobile devices
   - Add focus management and tab order optimization

9. **Performance optimization and final polish**
   - Implement React.memo for expensive components
   - Add proper dependency arrays for useEffect/useMemo
   - Optimize re-renders with callback memoization
   - Final accessibility audit and cross-browser testing
