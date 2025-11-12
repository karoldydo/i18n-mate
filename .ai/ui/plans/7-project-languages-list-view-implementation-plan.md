# View Implementation Plan: Project Languages List

## 1. Overview

The Project Languages List view provides a comprehensive interface for managing languages assigned to a specific project. This view uses a modern card-based layout (migrated from table-based layout) for improved mobile experience and visual consistency. The view allows users to view all project locales, add new languages with BCP-47 validation, update language labels, and delete languages (except the default). The view emphasizes the default language through visual indicators (star icon) and prevents its deletion. Key features include real-time validation, optimistic updates, seamless navigation to per-language key views, and a business-focused page description that emphasizes value proposition.

## 2. View Routing

`/projects/:projectId/locales`

The view is accessible via a dynamic route where `projectId` is extracted from URL parameters and validated as a UUID.

## 3. Component Structure

```markdown
ProjectLocalesPage (Route Component)
├── ProjectLocalesContent (Content Component)
│ ├── BackButton (navigation to project details)
│ ├── PageHeader
│ │ ├── PageTitle ("Languages")
│ │ └── PageDescription (business-focused description)
│ ├── CardList (shared component)
│ │ ├── Actions ("Add Language" button - responsive text)
│ │ ├── LocaleCard[] (repeatable)
│ │ │ ├── CardContent
│ │ │ │ ├── LanguageLabel (h3 heading)
│ │ │ │ └── MetadataSection
│ │ │ │ ├── LocaleCode (BCP-47 code with label)
│ │ │ │ └── DefaultIndicator (star icon + "Default" text)
│ │ │ └── CardActions (DropdownMenu)
│ │ │ ├── EditMenuItem
│ │ │ └── DeleteMenuItem (disabled for default)
│ │ └── EmptyState (shared component from @/shared/components when no locales)
├── AddLocaleDialog (shadcn/ui Dialog)
│ ├── DialogHeader ("Add Language")
│ ├── LocaleForm
│ │ ├── LocaleSelector (dropdown with common primary language subtags per IETF; BCP-47 validation and normalization)
│ │ └── LabelInput (with length validation)
│ └── DialogFooter (Cancel/Submit buttons)
├── EditLocaleDialog (shadcn/ui Dialog)
│ ├── DialogHeader ("Edit Language")
│ ├── LabelForm (label input only)
│ └── DialogFooter (Cancel/Submit buttons)
└── DeleteLocaleDialog (shadcn/ui AlertDialog)
├── AlertTitle ("Delete Language")
├── AlertDescription (warning message)
└── AlertFooter (Cancel/Confirm buttons)
```

## 4. Component Details

### ProjectLocalesPage

- **Component description**: Main route component that validates route parameters and renders ProjectLocalesContent within an ErrorBoundary. Handles UUID validation and error display for invalid project IDs.
- **Main elements**: ValidationError component (for invalid UUIDs), ErrorBoundary wrapper, ProjectLocalesContent component.
- **Handled interactions**: Route parameter extraction and validation, error boundary error handling.
- **Handled validation**: Project ID UUID format validation using UUID_SCHEMA.
- **Types**:
  - DTO: None (route component)
  - ViewModel: None
- **Props**: None (route component gets projectId from useParams())

### ProjectLocalesContent

- **Component description**: Content component that orchestrates the project languages list view, managing data fetching, dialog states, and user interactions. Uses card-based layout for improved mobile experience.
- **Main elements**: BackButton, PageHeader, CardList with LocaleCard components, EmptyState, AddLocaleDialog, EditLocaleDialog, DeleteLocaleDialog.
- **Handled interactions**: Route parameter validation, dialog state management, navigation to key views, error handling.
- **Handled validation**: Project ID UUID format validation, user authentication checks.
- **Types**:
  - DTO: LocalesResponse (array of LocaleItem)
  - ViewModel: LocaleListViewModel { locales: LocaleItem[], hasLocales: boolean }
- **Props**: projectId: string

### PageHeader

- **Component description**: Shared header component from `@/shared/components` providing consistent page layouts with title and optional subheading or custom content. Used here with header "Languages" and subHeading with business-focused description.
- **Main elements**: Heading (h1), optional subheading text or custom children content.
- **Handled interactions**: None (presentational component).
- **Handled validation**: None.
- **Types**: None (presentational component)
- **Props**: header (string), subHeading (string | null), children (ReactNode, optional)

### CardList

- **Component description**: Generic shared component for displaying lists of cards with optional actions, search, and empty state support. Used across multiple features for consistent UI.
- **Main elements**: Optional search input, optional actions (buttons/filters), card items container, empty state support, pagination controls.
- **Handled interactions**: Action button click handling via content projection, search input handling, pagination navigation.
- **Handled validation**: None.
- **Types**: Generic component, accepts ReactNode for actions, search, children, and emptyState
- **Props**: actions?: ReactNode, search?: ReactNode, children: ReactNode, emptyState?: ReactNode, pagination?: { metadata, params, onPageChange }, data-testid?: string

### LocaleCard

- **Component description**: Card component displaying individual locale information with actions. Follows the same pattern as ProjectCard and KeyCard for consistency.
- **Main elements**: CardItem wrapper, language label (h3), locale code with label, default indicator (star icon), dropdown menu with Edit/Delete actions.
- **Handled interactions**: Card click for navigation, edit/delete button clicks via dropdown menu, keyboard navigation.
- **Handled validation**: Disable delete action for default locale.
- **Types**:
  - DTO: LocaleItem
  - ViewModel: None (uses LocaleItem directly)
- **Props**: locale: LocaleItem, onEdit: (locale: LocaleItem) => void, onDelete: (locale: LocaleItem) => void, onNavigate: (locale: LocaleItem) => void

### AddLocaleDialog

- **Component description**: Modal dialog for adding new locales with form validation and submission.
- **Main elements**: Shadcn Dialog with form inputs, validation messages, loading states. Uses a LocaleSelector dropdown populated from the common primary language subtags (IETF language tags; see Wikipedia "List of common primary language subtags"), providing normalized BCP-47 codes.
- **Handled interactions**: Form submission, input validation, dialog open/close.
- **Handled validation**: BCP-47 locale format, label length (1-64 chars), duplicate prevention.
- **IMPORTANT - Types and Schemas**:
  - **VERIFY** existing schema in locales API schemas file and use it
  - Use `CreateProjectLocaleRequest` type from API (DO NOT create aliases)
  - DO NOT create duplicate schema in component file
- **Props**: open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (data: CreateProjectLocaleRequest) => void

### EditLocaleDialog

- **Component description**: Modal dialog for editing locale labels with form validation.
- **Main elements**: Shadcn Dialog with single label input field, validation messages.
- **Handled interactions**: Form submission, input validation, dialog management.
- **Handled validation**: Label length validation (1-64 chars), required field.
- **IMPORTANT - Types and Schemas**:
  - **VERIFY** existing schema in locales API schemas file and use it
  - Use `UpdateProjectLocaleRequest` type from API (DO NOT create aliases)
  - DO NOT create duplicate schema in component file
- **Props**: open: boolean, onOpenChange: (open: boolean) => void, locale: ProjectLocaleWithDefault | null, onSubmit: (data: UpdateProjectLocaleRequest) => void

### DeleteLocaleDialog

- **Component description**: Confirmation dialog for irreversible locale deletion with safety warnings.
- **Main elements**: Shadcn AlertDialog with warning text, locale details, confirmation buttons.
- **Handled interactions**: Confirmation action, cancel action, dialog management.
- **Handled validation**: UI-level prevention of default locale deletion.
- **Types**:
  - DTO: None (just confirmation)
  - ViewModel: DeleteLocaleConfirmation { locale: ProjectLocaleWithDefault, isDeleting: boolean }
- **Props**: open: boolean, onOpenChange: (open: boolean) => void, locale: ProjectLocaleWithDefault | null, onConfirm: () => void

## 5. Types

### IMPORTANT: Verify Existing Types Before Creating New Ones

**Before implementing any component, MUST verify:**

1. **Check for existing types in `src/shared/types/` and `src/features/locales/api/` (or similar)**
   - Use `CreateProjectLocaleRequest` and `UpdateProjectLocaleRequest` directly from existing API types
   - Use `ProjectLocaleWithDefault` from `@/shared/types` if it exists
   - DO NOT create type aliases or duplicate interfaces
   - DO NOT create unnecessary view model types when API types suffice

2. **Use existing types directly in components:**
   - For AddLocaleDialog: use `CreateProjectLocaleRequest` type
   - For EditLocaleDialog: use `UpdateProjectLocaleRequest` type
   - For data display: use existing response types

### Existing Types to Verify and Use

- `ProjectLocaleWithDefault`: Check `@/shared/types` (use directly)
- `CreateProjectLocaleRequest`: Check API types (use directly, DO NOT create aliases)
- `UpdateProjectLocaleRequest`: Check API types (use directly, DO NOT create aliases)
- `ApiErrorResponse`: From `@/shared/types`

## 6. State Management

The view uses TanStack Query for server state management and local React state for UI interactions. No custom state management hook is required beyond the existing API hooks.

**Query Management**:

- `useProjectLocales(projectId)`: Fetches locale list with 10-minute stale time, 30-minute garbage collection
- Invalidated on successful mutations to maintain data consistency

**Mutation Management**:

- `useCreateProjectLocale(projectId)`: Handles optimistic updates and cache invalidation
- `useUpdateProjectLocale()`: Updates locale labels with proper error handling
- `useDeleteProjectLocale()`: Removes locales with confirmation and cache updates

**Local UI State**:

- Dialog states managed directly in component using useState
- Form states handled by react-hook-form with Zod validation schemas

## 7. API Integration

**GET /api/projects/{projectId}/locales** (useProjectLocales)

- **Request**: `projectId: string` (UUID)
- **Response**: `ProjectLocaleWithDefault[]`
- **Error codes**: 400 (invalid UUID), 404 (project not found), 403 (access denied)
- **Caching**: 10-minute stale time, invalidated on mutations

**POST /api/projects/{projectId}/locales** (useCreateProjectLocale)

- **Request**: `CreateProjectLocaleRequest` (locale normalized client-side)
- **Response**: `CreateProjectLocaleResponse`
- **Error codes**: 400 (validation), 409 (duplicate locale), 500 (fan-out failure)
- **Side effects**: Triggers fan-out creation of translation records for all keys

**PATCH /api/projects/{projectId}/locales/{localeId}** (useUpdateProjectLocale)

- **Request**: `UpdateProjectLocaleRequest` (label only)
- **Response**: `ProjectLocale`
- **Error codes**: 400 (validation), 404 (not found), 403 (access denied)

**DELETE /api/projects/{projectId}/locales/{localeId}** (useDeleteProjectLocale)

- **Request**: `localeId: string`
- **Response**: `void`
- **Error codes**: 400 (cannot delete default), 404 (not found), 403 (access denied)

## 8. User Interactions

1. **Adding a Language**:
   - User clicks "Add Language" button (located in CardList header, right-aligned)
   - Add dialog opens with empty form
   - User selects a locale from LocaleSelector (auto-normalized BCP-47 code) and enters a label
   - Real-time validation provides feedback
   - On submit: validation runs, API call made, success closes dialog and updates list

2. **Editing a Language Label**:
   - User clicks three-dot menu button on any locale card
   - Dropdown menu appears with Edit and Delete options
   - User clicks Edit option
   - Edit dialog opens pre-filled with current label
   - User modifies label with real-time validation
   - On submit: API updates label, dialog closes, list refreshes

3. **Deleting a Language**:
   - User clicks three-dot menu button on any locale card
   - Dropdown menu appears with Edit and Delete options
   - Delete option is disabled (grayed out) for default locale
   - User clicks Delete option (if not default)
   - Confirmation dialog shows warning and locale details
   - User confirms irreversible action
   - On confirm: API deletes locale, dialog closes, list updates

4. **Navigating to Key View**:
   - User clicks anywhere on locale card (except action buttons/dropdown menu)
   - Navigation occurs to `/projects/{projectId}/keys/{locale}`
   - BackButton available to return to languages list

5. **Handling Validation Errors**:
   - Invalid BCP-47 format: Field error "Locale must be in BCP-47 format (e.g., 'en' or 'en-US')"
   - Duplicate locale: Error toast "Locale already exists for this project"
   - Label too long: Field error "Locale label must be at most 64 characters"

## 9. Conditions and Validation

**Locale Format Validation**:

- Client-side: LOCALE_NORMALIZATION.isValidFormatClient() ensures BCP-47 subset compliance
- Server-side: Database domain constraint enforces format
- Display: Real-time validation feedback in form inputs

**Label Validation**:

- Required: Cannot be empty or whitespace-only
- Length: 1-64 characters (trimmed)
- Display: Field-level error messages and character counter

**Default Language Protection**:

- UI Level: Delete button disabled/hidden for default locale
- API Level: 400 error returned if deletion attempted
- Visual: Default locale highlighted with badge/star indicator

**Duplicate Prevention**:

- UI Level: No duplicate checking (handled server-side)
- API Level: 409 conflict error for duplicate locales within project
- Display: Error toast with clear message

**Project Ownership**:

- Route Level: projectId validated as UUID
- API Level: All endpoints verify user owns project
- Error Handling: 404 for not found, 403 for access denied

## 10. Error Handling

**Network and API Errors**:

- Connection issues: Error toast with retry option
- Server errors: Generic error message with support contact
- Authentication errors: Redirect to login page

**Validation Errors**:

- Field-level: Inline error messages below inputs
- Form-level: Prevent submission with invalid data
- API-level: Display specific error messages from server

**Optimistic Update Failures**:

- Mutations revert cache on error
- Error toasts inform user of failure
- Manual refresh option available

**Atomic Operation Failures**:

- Fan-out errors: Automatic retry logic (up to 2 attempts)
- Verification failures: Single retry then error display
- Clear error messages for operational issues

**Fatal Errors**:

- ErrorBoundary around the locales route surfaces query failures with retry and reload options.

**Loading States**:

- Route-level Suspense boundary renders the shared `Loading` overlay during data fetch
- Spinner buttons during form submissions
- Disabled states during async operations

## 11. Implementation Steps

**PREREQUISITE: Before starting implementation, verify existing code:**

- Check for existing Zod schemas in `src/features/locales/api/` or similar location
- Check `src/shared/types/` for existing TypeScript types
- Use existing schemas and types directly - DO NOT create duplicates or aliases

1. **Set up route and basic component structure**
   - Create ProjectLocalesPage component with route definition
   - Create ProjectLocalesContent component for content logic
   - Add TypeScript types and imports
   - Implement basic layout with header and placeholder for card list

2. **Implement data fetching and card-based display**
   - Integrate useProjectLocales hook with useSuspenseQuery
   - Create LocaleCard component following ProjectCard/KeyCard pattern
   - Use CardList shared component for container
   - Add actions prop to CardList with responsive text ("Add Language" / "Add")
   - Use shared EmptyState component from `@/shared/components` for empty state handling
   - Implement loading and error states via Suspense boundary

3. **Add locale management dialogs**
   - **VERIFY**: Check for existing schemas before creating forms
   - Create AddLocaleDialog with form validation
   - **VERIFY**: Use existing schema and `CreateProjectLocaleRequest` type (DO NOT create aliases)
   - Create EditLocaleDialog for label updates
   - **VERIFY**: Use existing schema and `UpdateProjectLocaleRequest` type (DO NOT create aliases)
   - Create DeleteLocaleDialog with confirmation
   - Implement dialog state management in main component

4. **Implement form validation and submission**
   - **VERIFY**: Use existing Zod schemas from API layer (DO NOT create new schemas)
   - Implement real-time validation feedback
   - Connect forms to API mutations with error handling
   - Add optimistic updates and cache invalidation

5. **Add navigation and user interactions**
   - Implement card click navigation to key views (via CardItem onClick)
   - Add keyboard navigation support (Enter/Space on cards)
   - Implement proper ARIA labels and roles for cards and actions
   - Ensure action buttons don't trigger card navigation (event.stopPropagation)

6. **Polish UX and accessibility**
   - Add loading states and skeleton components
   - Implement proper error boundaries
   - Add toast notifications for actions
   - Ensure keyboard navigation and screen reader support

7. **Performance optimization and final polish**
   - Implement React.memo for expensive components
   - Add proper memoization with useMemo/useCallback
   - Final accessibility audit and UX review
