# UI Implementation Plan Template

## 1. Overview

[Provide a comprehensive description of the feature, its purpose, user value, and key functionality. Include routing path, access requirements, and navigation context.]

## 2. View Routing

- **Path**: `/route/:parameters`
- **Route Type**: [Standard React Router route with lazy loading | Protected route | etc.]
- **Access**: [Authentication and authorization requirements]
- **Navigation Context**: [How users access this view]

## 3. Component Structure

```markdown
MainPageComponent (main route component)
├── HeaderSection (title, actions, breadcrumbs)
├── PrimaryContent (main data display/table)
│ ├── DataTable (Shadcn DataTable with sorting/pagination)
│ │ ├── TableRow (individual data rows)
│ │ │ ├── DataCell (display/edit components)
│ │ │ └── ActionCell (buttons/menus)
│ │ └── TablePagination (pagination controls)
├── SecondaryContent (additional information/stats)
├── ActionDialogs (create/edit/delete modals)
│ ├── CreateDialog (form with validation)
│ ├── EditDialog (form with validation)
│ └── DeleteDialog (confirmation dialog)
└── StatusComponents (loading/error states)
```

## 4. Component Details

### MainPageComponent

- **Component description**: Main page component that orchestrates the view, handles routing, manages state, and coordinates child components
- **Main elements**: Layout wrapper, header, primary content area, dialogs, and status components
- **Handled interactions**: Page load, route parameter validation, dialog state management, navigation
- **Handled validation**: URL parameter validation, user permissions, data integrity checks
- **Types**: [Main data types, error types, state types from shared types]
- **Props**: None (route component using useParams/useSearchParams)

### HeaderSection

- **Component description**: Header with page title, description, primary actions, and navigation elements
- **Main elements**: Title text, action buttons, breadcrumbs/status indicators
- **Handled interactions**: Primary action clicks, navigation, status updates
- **Handled validation**: Action availability based on data state/permissions
- **Types**: [Component-specific props, data types]
- **Props**: [Required props with types]

### PrimaryContent

- **Component description**: Main content area displaying primary data with table/list format and pagination
- **Main elements**: DataTable component with columns, rows, and pagination controls
- **Handled interactions**: Data display, sorting, pagination, row selection/actions
- **Handled validation**: Data display validation, action availability
- **Types**: [Data array types, pagination metadata]
- **Props**: data (DataType[]), isLoading (boolean), pagination (PaginationMetadata), onAction (callbacks)

### ActionDialogs

- **Component description**: Modal dialogs for data manipulation (create, edit, delete) with form validation
- **Main elements**: Shadcn Dialog components with forms, validation messages, action buttons
- **Handled interactions**: Form submission, validation feedback, success/error handling
- **Handled validation**: Real-time form validation, API response validation, business rules
- **Types**: [Form data types, validation schemas from API]
- **Props**: open (boolean), onOpenChange (callback), [entity data for edit/delete]

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/[feature]/api/`**
   - Use existing API response types directly (e.g., `EntityResponse`, `EntityListResponse`)
   - Use existing request types directly (e.g., `CreateEntityRequest`, `UpdateEntityRequest`)
   - DO NOT create type aliases like `type CreateEntityFormData = CreateEntityRequest`
   - DO NOT create duplicate interfaces when existing types already satisfy requirements

2. **Use existing types directly in components:**
   - For data display: use `EntityResponse` type from `@/shared/types`
   - For forms: use `CreateEntityRequest`/`UpdateEntityRequest` types directly
   - Only create minimal UI state types if absolutely necessary (e.g., dialog states, loading states)

### API Types to Verify and Use

- **Response Types**: `EntityResponse`, `EntityListResponse` (use from `@/shared/types`)
- **Request Types**: `CreateEntityRequest`, `UpdateEntityRequest` (use from `@/shared/types`)
- **Error Types**: `ApiErrorResponse` from `@/shared/types`
- **Validation Schemas**: Import from `../api/[feature].schemas.ts` (DO NOT duplicate)

## 6. State Management

State is managed using TanStack Query for server state and React local state for UI interactions:

- **useEntities**: Fetches paginated data with caching and background refetch
- **useCreateEntity**: Mutation with optimistic updates and cache invalidation
- **useUpdateEntity**: Mutation with optimistic updates
- **useDeleteEntity**: Mutation with cache cleanup

Local component state managed with useState/useReducer:

- Dialog open/closed states
- Form data and validation states
- Selected items for bulk operations
- UI interaction states (sorting, filtering)

Custom hooks needed:

- **useEntityFilters**: Manages filter state with URL synchronization for bookmarkable views
- **useDebouncedValue**: Provides debounced search input to prevent excessive API calls

## 7. API Integration

### List Entities

- **Hook**: useEntities
- **Endpoint**: [GET/POST endpoint path]
- **Request**: { pagination, filters, search params }
- **Response**: { data: Entity[], metadata: { total, page, pageSize } }
- **Caching**: [Stale time, garbage collection settings]

### Create Entity

- **Hook**: useCreateEntity
- **Endpoint**: [POST endpoint]
- **Request**: CreateEntityRequest
- **Response**: EntityResponse
- **Side Effects**: Cache invalidation, navigation, success feedback

### Update Entity

- **Hook**: useUpdateEntity
- **Endpoint**: [PATCH/PUT endpoint]
- **Request**: UpdateEntityRequest
- **Response**: EntityResponse
- **Side Effects**: Cache updates, success feedback

### Delete Entity

- **Hook**: useDeleteEntity
- **Endpoint**: [DELETE endpoint]
- **Request**: Entity ID
- **Response**: Success confirmation
- **Side Effects**: Cache cleanup, optimistic updates

## 8. User Interactions

### Primary View

- **Load**: Display paginated data with loading states and empty states
- **Search/Filter**: Real-time filtering with debouncing, URL state persistence
- **Pagination**: Navigate between pages maintaining filter state
- **Sorting**: Click column headers to sort data
- **Actions**: Primary actions (create, edit, delete) with appropriate dialogs

### Create/Edit Dialogs

- **Open**: Pre-populate forms with existing data (edit) or defaults (create)
- **Validation**: Real-time validation with field-specific error messages
- **Submit**: Create/update with loading states, success feedback, navigation
- **Cancel**: Close dialog without changes, clear form state

### Delete Confirmation

- **Open**: Display entity details and impact warnings
- **Confirm**: Delete with irreversible operation warnings
- **Cancel**: Close without deletion

## 9. Conditions and Validation

### API-Level Validation (Server-Side)

- **[Field Name]**: [Validation rules, constraints, uniqueness requirements]
- **[Business Rules]**: [Cross-field validation, state-dependent rules]
- **[Permissions]**: [Ownership verification, RLS enforcement]

### UI-Level Validation (Client-Side)

- **Form Validation**: Real-time validation using existing Zod schemas
- **Submit Prevention**: Disabled buttons when validation fails
- **Error Display**: Field-specific error messages from API responses
- **Business Logic**: Client-side checks before API calls

## 10. Error Handling

### Network and API Errors

- **Connection Issues**: TanStack Query retry logic, user-friendly error toasts
- **Rate Limiting (429)**: Exponential backoff, informative messages
- **Server Errors (5xx)**: Generic handling with retry options

### Validation Errors (400)

- **Field Errors**: Display specific validation messages from API
- **Business Rule Violations**: Highlight conflicting data with suggestions
- **Format Errors**: Show format requirements and examples

### Permission Errors

- **401 Unauthorized**: Redirect to login with return URL
- **403 Forbidden**: Show access denied with contact options
- **404 Not Found**: Handle missing entities gracefully

### Business Logic Errors

- **Entity Not Found**: Refresh data or redirect appropriately
- **Concurrent Modification**: Handle conflicts with merge options
- **State Conflicts**: Validate entity state before operations

### UI Error States

- **Loading States**: Suspense boundaries with shared Loading overlay
- **Empty States**: Contextual messages with action prompts
- **Error Boundaries**: Fallback UI with retry/reload options

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check `src/features/[feature]/api/` for existing schemas and types
- Check `src/shared/types/` for existing shared types
- Use existing schemas and types directly - DO NOT create duplicates or aliases
- Verify existing API hooks before creating new ones

1. **Set up routing and basic page structure**
   - Add lazy-loaded route in routes.ts with parameter validation
   - Create main page component with basic layout and error boundaries
   - Implement route parameter extraction and validation

2. **Implement data fetching and display**
   - Set up TanStack Query hooks for data fetching
   - Create data table component with Shadcn Table
   - Add pagination and basic column display
   - Implement loading states and error handling

3. **Add search, filter, and sorting functionality**
   - Create filter components with debounced search
   - Implement sorting controls and state management
   - Connect filters to API query parameters
   - Add URL state synchronization for bookmarkable filters

4. **Implement CRUD operations**
   - **VERIFY**: Use existing schemas from API layer (DO NOT create new schemas)
   - Create dialog components for create/edit/delete operations
   - **VERIFY**: Use existing request/response types directly (DO NOT create aliases)
   - Integrate mutation hooks with optimistic updates
   - Add success feedback and navigation logic

5. **Add comprehensive error handling and edge cases**
   - Implement error boundaries and fallback UI
   - Add loading skeletons and empty states
   - Handle network errors and retry logic
   - Add validation error display and user feedback

6. **Polish UX and accessibility**
   - Implement ARIA labels and keyboard navigation
   - Add screen reader support for dynamic content
   - Ensure responsive design across breakpoints
   - Add focus management and logical tab order

7. **Performance optimization and final testing**
   - Implement React.memo for expensive components
   - Optimize re-renders with proper dependency arrays
   - Add comprehensive unit and integration tests
   - Final accessibility audit and cross-browser testing

## 12. Testing Strategy

### Unit Tests

- **Component Tests**: Individual component rendering, props handling, user interactions
- **Hook Tests**: Custom hooks behavior, state management, side effects
- **Utility Tests**: Helper functions, data transformations, validation logic

### Integration Tests

- **Page Tests**: Full page rendering with data fetching and routing
- **Form Tests**: Complete form workflows including validation and submission
- **API Integration**: Mock API responses, error handling, loading states

### End-to-End Tests

- **User Journeys**: Complete workflows from navigation to completion
- **Error Scenarios**: Network failures, validation errors, permission issues
- **Responsive Testing**: Mobile and desktop interaction patterns

### Accessibility Testing

- **Screen Reader**: Navigation announcements, form labels, error messages
- **Keyboard Navigation**: Tab order, shortcuts, focus management
- **ARIA Compliance**: Proper roles, states, and properties

## 13. Accessibility

### ARIA Labels and Roles

- `role="main"` for primary content areas
- `aria-label` for icon-only buttons and complex components
- `aria-describedby` for form fields with help text
- `aria-live` for dynamic status updates

### Keyboard Navigation

- **Tab Order**: Logical navigation through interactive elements
- **Enter/Space**: Activate buttons and form submissions
- **Escape**: Close modals and cancel operations
- **Arrow Keys**: Navigate data tables and custom controls

### Screen Reader Support

- Semantic HTML structure with proper headings
- Descriptive button and link text
- Form field labels and error associations
- Status announcements for async operations

### Focus Management

- Visible focus indicators following design system
- Focus trapping in modal dialogs
- Focus restoration after dialog closures
- Skip links for main navigation

## 14. Performance Considerations

### Data Fetching

- Appropriate cache times for different data types
- Background refetch for stale data
- Prefetching for likely user actions
- Request deduplication and cancellation

### Component Optimization

- React.memo for expensive re-renders
- useMemo/useCallback for stable references
- Virtual scrolling for large datasets
- Lazy loading for off-screen content

### Bundle Optimization

- Route-based code splitting
- Dynamic imports for heavy components
- Image optimization and lazy loading
- Minimal bundle size impact

## 15. Migration and Cleanup

After successful implementation and testing:

### Files Created

- `src/features/[feature]/routes/[Feature]Page.tsx` - Main page component
- `src/features/[feature]/components/[Feature]Table.tsx` - Data table component
- `src/features/[feature]/components/[Feature]Dialog.tsx` - Action dialogs
- Additional component files as needed

### Files Modified

- `src/app/routes.tsx` - Added new route
- `src/shared/components/index.ts` - Export new components
- Existing API files if hooks/schemas were added

### Files Removed (if applicable)

- Legacy components replaced by new implementation
- Deprecated utility files
- Unused import statements

### Code Cleanup

- Remove unused imports and dependencies
- Update component exports and barrel files
- Clean up temporary code and TODO comments
- Update documentation and comments
