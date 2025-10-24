# Keys List (Per-Language View) Implementation Plan

## 1. Overview

The keys list per-language view provides an interface for editing translation values for a specific non-default language in a project. Users can view all keys for a selected locale, filter by missing translations, search by key name, and perform inline editing with autosave functionality. This view enables efficient translation management with clear metadata about translation provenance (manual vs machine-translated) and timestamps.

## 2. View Routing

- **Path**: `/projects/:projectId/keys/:locale`
- **Route Type**: Standard React Router route with lazy loading
- **Access**: Requires authenticated user with project ownership and valid locale in project
- **Parameters**:
  - `projectId` (UUID) - extracted from URL params
  - `locale` (string) - BCP-47 locale code extracted from URL params

## 3. Component Structure

```markdown
KeysPerLanguagePage (main page component)
├── PageHeader
│ ├── PageTitle (with locale info)
│ ├── BackToKeysButton
│ ├── LocaleInfoBadge
│ └── LocaleSelector (optional switcher for quick locale change; BCP-47 normalized)
├── SearchAndFilterBar
│ ├── SearchInput
│ └── MissingFilterToggle
├── KeysPerLanguageDataTable
│ ├── TableHeader
│ │ ├── ColumnHeader (Key)
│ │ ├── ColumnHeader (Translation Value)
│ │ └── ColumnHeader (Metadata)
│ ├── KeyTranslationRow[] (with inline editing)
│ │ ├── KeyCell (read-only)
│ │ ├── TranslationValueCell (editable)
│ │ └── MetadataCell
│ └── TablePagination
└── LoadingStates
├── TableSkeleton
└── EmptyState
```

## 4. Component Details

### KeysPerLanguagePage

- **Component description**: Main page component that orchestrates the per-language keys view, handles routing parameter validation, manages editing state, and coordinates data flow between child components
- **Main elements**: Page layout with header, search/filter bar, data table, and loading states
- **Handled interactions**: Page initialization with parameter validation, editing state management, navigation error handling
- **Handled validation**: Project ID UUID format, locale BCP-47 format validation
- **Types**: Route params (projectId, locale), editing state (keyId, value)
- **Props**: None (route component using useParams)

### PageHeader

- **Component description**: Header section displaying the page title with locale information and navigation controls
- **Main elements**: Title text with locale badge, back navigation button, locale info display, and optional LocaleSelector to switch between project locales (BCP-47 normalized)
- **Handled interactions**: Back button navigation to default keys view
- **Handled validation**: None
- **Types**: Locale string, project name string
- **Props**: locale: string, projectName?: string, onBack: () => void

### LocaleInfoBadge

- **Component description**: Displays locale information in a badge format with proper BCP-47 formatting
- **Main elements**: Shadcn Badge component with locale code
- **Handled interactions**: None
- **Handled validation**: None
- **Types**: Locale string
- **Props**: locale: string

### SearchAndFilterBar

- **Component description**: Horizontal bar containing search input and missing filter toggle for the selected language
- **Main elements**: Flex container with search input and toggle components
- **Handled interactions**: Search input changes with debouncing, filter toggle changes triggering query invalidation
- **Handled validation**: Search input sanitization
- **Types**: Search value string, missing filter boolean
- **Props**: searchValue: string, onSearchChange: (value: string) => void, missingOnly: boolean, onMissingToggle: (enabled: boolean) => void

### SearchInput

- **Component description**: Debounced search input for filtering keys by name in the selected language view
- **Main elements**: Shadcn Input component with search icon and clear button
- **Handled interactions**: Input value changes with 300ms debouncing, clear button click
- **Handled validation**: Input length limits (no maximum for search)
- **Types**: Search string value
- **Props**: value: string, onChange: (value: string) => void, placeholder?: string

### MissingFilterToggle

- **Component description**: Toggle switch to filter keys with missing (NULL) translations in the selected language
- **Main elements**: Shadcn Switch component with descriptive label
- **Handled interactions**: Toggle state changes triggering immediate query refetch
- **Handled validation**: None
- **Types**: Boolean state
- **Props**: enabled: boolean, onToggle: (enabled: boolean) => void, label: string

### KeysPerLanguageDataTable

- **Component description**: Data table displaying keys with their translation values and metadata for the selected language, supporting pagination and inline editing
- **Main elements**: Shadcn Table with custom columns, rows with inline editing, and pagination controls
- **Handled interactions**: Row editing start/cancel/save, pagination navigation
- **Handled validation**: Translation value validation on save (handled by child components)
- **Types**: KeyPerLanguageViewResponse[], pagination metadata, editing state
- **Props**: keys: KeyPerLanguageViewResponse[], isLoading: boolean, pagination: PaginationMetadata, onPageChange: (page: number) => void, editingKeyId: string | null, onEditStart: (keyId: string) => void, onEditSave: (keyId: string, value: string) => void, onEditCancel: () => void

### KeyTranslationRow

- **Component description**: Individual table row representing a single key with its translation value and metadata for inline editing
- **Main elements**: Table row with three cells (key, value, metadata)
- **Handled interactions**: Double-click or Enter to start editing, Escape to cancel, Enter to save
- **Handled validation**: Translation value constraints (250 chars, no newlines, non-empty for non-null)
- **Types**: KeyPerLanguageViewResponse, editing state
- **Props**: key: KeyPerLanguageViewResponse, isEditing: boolean, onEditStart: () => void, onEditSave: (value: string) => void, onEditCancel: () => void

### KeyCell

- **Component description**: Read-only cell displaying the full key name
- **Main elements**: Table cell with key text and optional tooltip for long keys
- **Handled interactions**: None (read-only)
- **Handled validation**: None
- **Types**: Key string
- **Props**: keyName: string

### TranslationValueCell

- **Component description**: Editable cell for translation values with inline editing capabilities and autosave
- **Main elements**: Text input in edit mode, formatted text display in read mode, save indicator
- **Handled interactions**: Click to edit, input changes with debounced autosave, keyboard shortcuts
- **Handled validation**: Real-time validation with error display (250 chars max, no newlines)
- **Types**: Translation value (string | null), editing state
- **Props**: value: string | null, isEditing: boolean, isSaving: boolean, error?: string, onValueChange: (value: string) => void, onEditStart: () => void, onSave: () => void

### MetadataCell

- **Component description**: Cell displaying translation metadata (machine/manual, timestamp, user) using the shared TranslationStatus component for consistent status rendering and ARIA labels
- **Main elements**: TranslationStatus badge/icon, formatted timestamp, user info tooltip
- **Handled interactions**: Hover for detailed tooltip
- **Handled validation**: None
- **Types**: Metadata object (is_machine_translated, updated_at, updated_by_user_id, updated_source)
- **Props**: metadata: KeyTranslationMetadata

### TablePagination

- **Component description**: Pagination controls for navigating through key pages
- **Main elements**: Shadcn Pagination component with page numbers and navigation buttons
- **Handled interactions**: Page number clicks, previous/next navigation
- **Handled validation**: Page bounds checking
- **Types**: Pagination metadata (start, end, total)
- **Props**: currentPage: number, totalItems: number, pageSize: number, onPageChange: (page: number) => void

### TableSkeleton

- **Component description**: Loading skeleton for the data table during initial load or refetch
- **Main elements**: Shadcn Skeleton components arranged in table layout
- **Handled interactions**: None
- **Handled validation**: None
- **Types**: None
- **Props**: rowCount?: number

### EmptyState

- **Component description**: Empty state display when no keys match current filters
- **Main elements**: Icon, message, and optional action button
- **Handled interactions**: Clear filters action
- **Handled validation**: None
- **Types**: Empty state type (no results, no keys, error)
- **Props**: type: EmptyStateType, onClearFilters?: () => void

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/keys/api/` (or similar)**
   - Use `KeyPerLanguageViewResponse` directly from existing API types
   - Use `ListKeysPerLanguageParams` from API if it exists
   - DO NOT create type aliases or duplicate interfaces
   - DO NOT create unnecessary view model types when API types suffice

2. **Use existing types directly in components:**
   - For data display: use `KeyPerLanguageViewResponse` type
   - For API queries: use existing params types
   - Only create minimal UI state types if absolutely necessary (e.g., editing state)

### API Types to Verify and Use

- `KeyPerLanguageViewResponse`: Database composite type for individual key data (use directly)
- `KeyPerLanguageViewListResponse`: Paginated response wrapper (use directly)
- `ListKeysPerLanguageParams`: Query parameters for the API call (verify existence, use directly)
- `ApiErrorResponse`: From `@/shared/types`

## 6. State Management

The view will use a custom hook `useKeysPerLanguageState` to manage complex state interactions:

- **Filter State**: Search query and missing-only toggle with debounced query invalidation
- **Editing State**: Single-key editing mode with optimistic updates and error handling
- **Pagination State**: Current page tracking with URL synchronization
- **Query Integration**: TanStack Query for server state with proper key invalidation

The hook will provide:

- Current state accessors
- State update functions with validation
- Query management and invalidation
- Error handling and recovery

## 7. API Integration

Integration with `useKeysPerLanguageView` hook:

**Request Parameters:**

```typescript
{
  project_id: string; // UUID from route params
  locale: string; // BCP-47 locale from route params
  search?: string; // Optional search term
  missing_only?: boolean; // Default: false
  limit?: number; // Default: 50, max: 100
  offset?: number; // Default: 0
}
```

**Response Structure:**

```typescript
{
  data: KeyPerLanguageViewResponse[];
  metadata: {
    start: number;
    end: number;
    total: number;
  };
}
```

**Error Handling:**

- 400: Invalid parameters (project_id, locale format)
- 401: Authentication required
- 403: Project not found or access denied
- 500: Database/server errors

## 8. User Interactions

### Primary Interactions

1. **Navigation**: Back button to return to default keys view
2. **Search**: Real-time debounced search with 300ms delay
3. **Filtering**: Missing translations toggle with immediate effect
4. **Inline Editing**: Double-click or Enter to edit, Escape to cancel, Enter to save
5. **Pagination**: Page navigation with maintained filters

### Autosave Behavior

- Debounced save (500ms after last change)
- Visual saving indicator during API call
- Error display on save failure with retry option
- Optimistic UI updates with rollback on error

### Keyboard Navigation

- Tab navigation through table cells
- Enter to start editing
- Escape to cancel editing
- Arrow keys for cell navigation

## 9. Conditions and Validation

### Parameter Validation

- **Project ID**: Must be valid UUID format, user must own project
- **Locale**: Must be BCP-47 compliant, must exist in project, cannot be default language

### Translation Value Validation

- **Maximum Length**: 250 characters
- **Content Rules**: No newline characters
- **Empty Handling**: Empty strings converted to NULL (missing)
- **Default Language Block**: Cannot edit default language translations in this view

### Filter Validation

- **Search**: No length limits, case-insensitive contains matching
- **Missing Filter**: Boolean toggle, defaults to false

### Pagination Validation

- **Page Size**: Fixed at 50 items per page
- **Page Bounds**: Cannot navigate beyond available pages
- **Offset Calculation**: Automatic calculation from page number

## 10. Error Handling

### Network Errors

- Query failures display error toast with retry option
- Automatic retry for transient failures (3 attempts)
- Fallback to cached data when available

### Validation Errors

- Inline validation with red error text below input
- Form cannot be saved with validation errors
- Clear error messages on correction

### Permission Errors

- Redirect to appropriate error page or login
- Clear error messaging for access denied

### Data Consistency

- Version conflict detection (if implemented)
- Stale data warnings for long-editing sessions
- Automatic refetch on window focus

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing types in `src/features/keys/api/` or similar location
- Check `src/shared/types/` for existing TypeScript types
- Use existing types directly - DO NOT create duplicates or aliases
- No schemas needed for this view (no create/update forms, only inline editing)

1. **Create page component structure** with routing and basic layout
2. **Implement state management hook** for filters, editing, and pagination
   - **VERIFY**: Use existing `KeyPerLanguageViewResponse` type (DO NOT create aliases)
3. **Build table components** starting with read-only display
   - **VERIFY**: Use existing response types directly
4. **Add search and filter functionality** with debounced queries
5. **Implement inline editing** with validation and autosave
6. **Add pagination controls** with proper state synchronization
7. **Create loading and empty states** for better UX
8. **Add error handling and recovery** mechanisms
9. **Implement keyboard navigation** and accessibility features
10. **Add comprehensive testing** for all components and interactions
11. **Performance optimization** with memoization and virtualization if needed
12. **Final integration testing** and user acceptance validation
