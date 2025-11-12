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
│ └── BackToKeysButton
├── CardList (generic card container)
│ ├── CardListHeader
│ │ ├── SearchInput (search prop)
│ │ └── MissingFilterToggle (actions prop)
│ ├── KeyTranslationCard[] (feature-specific cards)
│ │ ├── CardContent
│ │ │ ├── TranslationValueCell (editable)
│ │ │ ├── KeyName (read-only, monospace)
│ │ │ └── TranslationStatus (metadata badge)
│ │ └── (no actions - per-language view doesn't support delete)
│ └── CardListPagination (offset-based)
├── EmptyState
└── SuspenseFallback (shared Loading overlay)
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

- **Component description**: Shared header component from `@/shared/components` providing consistent page layouts with title and optional subheading or custom content. Used here with header "Translations - {LOCALE}" and custom children content showing project context.
- **Main elements**: Heading (h1), optional subheading text or custom children content
- **Handled interactions**: None (presentational component)
- **Handled validation**: None
- **Types**: None
- **Props**: header (string), subHeading (string | null), children (ReactNode, optional)

### LocaleInfoBadge

- **Component description**: Displays locale information in a badge format with proper BCP-47 formatting
- **Main elements**: Shadcn Badge component with locale code
- **Handled interactions**: None
- **Handled validation**: None
- **Types**: Locale string
- **Props**: locale: string

### CardList

- **Component description**: Generic shared component for displaying lists of cards with optional search, actions, pagination, and empty state support. Provides consistent card layout across features.
- **Main elements**: Header with optional search and actions, card grid, pagination controls, empty state display
- **Handled interactions**: Search input changes, filter toggle changes, pagination navigation
- **Handled validation**: Search input debouncing handled by SearchInput component
- **Types**: PaginationParams, PaginationMetadata
- **Props**: search?: ReactNode, actions?: ReactNode, pagination?: { metadata, params, onPageChange }, emptyState?: ReactNode, children: ReactNode, data-testid?: string

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

### KeyTranslationCard

- **Component description**: Individual card component representing a single key with its translation value and metadata for inline editing
- **Main elements**: Card with editable value cell, key name display, translation status badge
- **Handled interactions**: Value editing (click to edit), autosave on change
- **Handled validation**: Translation value constraints (250 chars, no newlines) handled by TranslationValueCell
- **Types**: KeyTranslationItem, editing state
- **Props**: keyData: KeyTranslationItem, isEditing: boolean, isSaving: boolean, editError?: string, onEditStart: () => void, onEditEnd: () => void, onValueChange: (value: string) => void

### TranslationValueCell

- **Component description**: Editable cell for translation values with inline editing capabilities and autosave
- **Main elements**: Text input in edit mode, formatted text display in read mode, save indicator
- **Handled interactions**: Click to edit, input changes with debounced autosave, keyboard shortcuts
- **Handled validation**: Real-time validation with error display (250 chars max, no newlines)
- **Types**: Translation value (string | null), editing state
- **Props**: value: string | null, isEditing: boolean, isSaving: boolean, error?: string, onValueChange: (value: string) => void, onEditStart: () => void, onEditEnd: () => void

### TranslationStatus

- **Component description**: Component displaying translation metadata (machine/manual, timestamp) with consistent status rendering and ARIA labels
- **Main elements**: Badge/icon for translation source, formatted timestamp
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**: Metadata (is_machine_translated, updated_at)
- **Props**: isMachineTranslated: boolean | null, updatedAt?: string | null

### SuspenseFallback

- **Component description**: Route-level Suspense fallback that shows the shared full-screen `Loading` overlay while queries resolve.
- **Main elements**: Loading spinner with blurred backdrop (shared component)
- **Handled interactions**: Retry button provided by ErrorBoundary when an error occurs
- **Handled validation**: None
- **Types**: None
- **Props**: Inherited from shared `Loading` component

### EmptyState

- **Component description**: Shared empty state component from `@/shared/components` for consistent empty state handling. Displays icon, header text, description, and optional action buttons. Used here with different messages for missing-only filter (shows "All translations complete" with CheckCircle2 icon) vs. no keys (shows "No translation keys yet" with Inbox icon).
- **Main elements**: Icon (default Inbox or custom), header text, description text, optional actions
- **Handled interactions**: None (presentational component, actions handled by parent)
- **Handled validation**: None
- **Types**: None
- **Props**: header (string), description (string), icon?: ReactNode, actions?: ReactElement

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
4. **Inline Editing**: Click TranslationValueCell to edit, Escape to cancel, autosave on change
5. **Pagination**: Page navigation with maintained filters (offset-based)

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
- ErrorBoundary wrapping the view surfaces unhandled query errors with retry and reload actions.

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
   - **VERIFY**: Use existing `KeyTranslationItem` type (DO NOT create aliases)
3. **Build card components** starting with read-only display
   - **VERIFY**: Use existing response types directly
   - Create KeyTranslationCard component using CardItem wrapper
4. **Add search and filter functionality** with debounced queries
   - Integrate SearchInput into CardList search prop
   - Integrate MissingFilterToggle into CardList actions prop
5. **Implement inline editing** with validation and autosave
   - Use TranslationValueCell component with autosave
6. **Add pagination controls** with proper state synchronization (offset-based)
   - Integrate with CardList pagination
7. **Create loading and empty states** for better UX
   - Use shared EmptyState component from `@/shared/components` with appropriate messages for different filter states
8. **Add error handling and recovery** mechanisms
9. **Implement keyboard navigation** and accessibility features
10. **Add comprehensive testing** for all components and interactions
11. **Performance optimization** with memoization and virtualization if needed
12. **Final integration testing** and user acceptance validation
