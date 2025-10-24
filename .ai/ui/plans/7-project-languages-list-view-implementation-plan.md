# View Implementation Plan: Project Languages List

## 1. Overview

The Project Languages List view provides a comprehensive interface for managing languages assigned to a specific project. This view allows users to view all project locales, add new languages with BCP-47 validation, update language labels, and delete languages (except the default). The view emphasizes the default language through visual indicators and prevents its deletion. Key features include real-time validation, optimistic updates, and seamless navigation to per-language key views.

## 2. View Routing

`/projects/:projectId/locales`

The view is accessible via a dynamic route where `projectId` is extracted from URL parameters and validated as a UUID.

## 3. Component Structure

```markdown
ProjectLocalesPage (Route Component)
├── PageHeader
│ ├── PageTitle ("Languages")
│ └── AddLocaleButton
├── LocalesDataTable
│ ├── DataTable (shadcn/ui)
│ │ ├── TableHeader
│ │ │ ├── LocaleColumn ("Locale")
│ │ │ ├── LabelColumn ("Language")
│ │ │ ├── DefaultColumn ("Default")
│ │ │ └── ActionsColumn ("Actions")
│ │ └── TableBody
│ │ └── LocaleRow (repeatable)
│ │ ├── LocaleCell (normalized BCP-47 code)
│ │ ├── LabelCell (human-readable label)
│ │ ├── DefaultIndicator (badge/star icon)
│ │ └── ActionsCell
│ │ ├── EditButton
│ │ └── DeleteButton (disabled for default)
│ └── EmptyState (when no locales)
├── AddLocaleDialog (shadcn/ui Dialog)
│ ├── DialogHeader ("Add Language")
│ ├── LocaleForm
│ │ ├── LocaleInput (with BCP-47 validation)
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

- **Component description**: Main route component that orchestrates the project languages list view, managing data fetching, dialog states, and user interactions.
- **Main elements**: PageHeader, LocalesDataTable, AddLocaleDialog, EditLocaleDialog, DeleteLocaleDialog, LoadingState, ErrorState.
- **Handled interactions**: Route parameter validation, dialog state management, navigation to key views, error handling.
- **Handled validation**: Project ID UUID format validation, user authentication checks.
- **Types**:
  - DTO: ProjectLocaleWithDefault[]
  - ViewModel: LocaleListViewModel { locales: ProjectLocaleWithDefault[], isLoading: boolean, error: ApiErrorResponse | null }
- **Props**: None (route component gets projectId from useParams())

### PageHeader

- **Component description**: Header section with page title and primary action button for adding new locales.
- **Main elements**: Typography for title, Button component for "Add Language" action.
- **Handled interactions**: Add language dialog trigger.
- **Handled validation**: None.
- **Types**:
  - DTO: None
  - ViewModel: PageHeaderViewModel { title: string, onAddClick: () => void }
- **Props**: onAddClick: () => void

### LocalesDataTable

- **Component description**: Data table displaying project locales with sorting, actions, and navigation capabilities.
- **Main elements**: Shadcn DataTable with custom columns, action buttons, empty state.
- **Handled interactions**: Row clicks for navigation, edit/delete button clicks, keyboard navigation.
- **Handled validation**: Disable delete action for default locale.
- **Types**:
  - DTO: ProjectLocaleWithDefault[]
  - ViewModel: LocaleTableRow { id: string, locale: string, label: string, isDefault: boolean, canEdit: boolean, canDelete: boolean }
- **Props**: locales: ProjectLocaleWithDefault[], onEdit: (locale: ProjectLocaleWithDefault) => void, onDelete: (locale: ProjectLocaleWithDefault) => void, onRowClick: (locale: ProjectLocaleWithDefault) => void

### AddLocaleDialog

- **Component description**: Modal dialog for adding new locales with form validation and submission.
- **Main elements**: Shadcn Dialog with form inputs, validation messages, loading states.
- **Handled interactions**: Form submission, input validation, dialog open/close.
- **Handled validation**: BCP-47 locale format, label length (1-64 chars), duplicate prevention.
- **Types**:
  - DTO: CreateProjectLocaleRequest
  - ViewModel: AddLocaleForm { locale: string, label: string, errors: FormErrors, isSubmitting: boolean }
- **Props**: open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (data: CreateProjectLocaleRequest) => void

### EditLocaleDialog

- **Component description**: Modal dialog for editing locale labels with form validation.
- **Main elements**: Shadcn Dialog with single label input field, validation messages.
- **Handled interactions**: Form submission, input validation, dialog management.
- **Handled validation**: Label length validation (1-64 chars), required field.
- **Types**:
  - DTO: UpdateProjectLocaleRequest
  - ViewModel: EditLocaleForm { id: string, label: string, errors: FormErrors, isSubmitting: boolean }
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

### Database Types (from Supabase)

```typescript
export type ProjectLocaleWithDefault = {
  id: string; // UUID
  project_id: string; // UUID
  locale: string; // Normalized BCP-47 code (ll or ll-CC)
  label: string; // Human-readable language name (max 64 chars)
  is_default: boolean; // Marks project's default language
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
};
```

### Request/Response Types

```typescript
export type CreateProjectLocaleRequest = {
  p_locale: string; // BCP-47 code (normalized client-side)
  p_label: string; // Language label (1-64 chars)
  p_project_id: string; // Project UUID (added automatically)
};

export type UpdateProjectLocaleRequest = {
  label: string; // Updated language label (1-64 chars)
};

export type CreateProjectLocaleResponse = ProjectLocale;
```

### View Model Types

```typescript
export type LocaleListViewModel = {
  locales: ProjectLocaleWithDefault[];
  isLoading: boolean;
  error: ApiErrorResponse | null;
  projectId: string;
};

export type LocaleTableRowViewModel = {
  id: string;
  locale: string;
  label: string;
  isDefault: boolean;
  canEdit: boolean;
  canDelete: boolean;
  actionHandlers: {
    onEdit: () => void;
    onDelete: () => void;
    onNavigate: () => void;
  };
};

export type AddLocaleFormViewModel = {
  formData: {
    locale: string;
    label: string;
  };
  validation: {
    locale: { isValid: boolean; error?: string };
    label: { isValid: boolean; error?: string };
  };
  isSubmitting: boolean;
};

export type EditLocaleFormViewModel = {
  locale: ProjectLocaleWithDefault;
  formData: {
    label: string;
  };
  validation: {
    label: { isValid: boolean; error?: string };
  };
  isSubmitting: boolean;
};
```

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
   - User clicks "Add Language" button
   - Add dialog opens with empty form
   - User enters locale code (auto-normalized) and label
   - Real-time validation provides feedback
   - On submit: validation runs, API call made, success closes dialog and updates list

2. **Editing a Language Label**:
   - User clicks edit button on any locale row
   - Edit dialog opens pre-filled with current label
   - User modifies label with real-time validation
   - On submit: API updates label, dialog closes, list refreshes

3. **Deleting a Language**:
   - User clicks delete button (disabled for default locale)
   - Confirmation dialog shows warning and locale details
   - User confirms irreversible action
   - On confirm: API deletes locale, dialog closes, list updates

4. **Navigating to Key View**:
   - User clicks anywhere on locale row (except action buttons)
   - Navigation occurs to `/projects/{projectId}/locales/{localeId}/keys`
   - Breadcrumb navigation available to return to languages list

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

**Loading States**:

- Skeleton loading for initial data fetch
- Spinner buttons during form submissions
- Disabled states during async operations

## 11. Implementation Steps

1. **Set up route and basic component structure**
   - Create ProjectLocalesPage component with route definition
   - Add TypeScript types and imports
   - Implement basic layout with header and placeholder for table

2. **Implement data fetching and table display**
   - Integrate useProjectLocales hook
   - Create LocalesDataTable component using shadcn DataTable
   - Add columns for locale, label, default indicator, and actions
   - Implement loading and error states

3. **Add locale management dialogs**
   - Create AddLocaleDialog with form validation
   - Create EditLocaleDialog for label updates
   - Create DeleteLocaleDialog with confirmation
   - Implement dialog state management in main component

4. **Implement form validation and submission**
   - Add Zod schemas for form validation
   - Implement real-time validation feedback
   - Connect forms to API mutations with error handling
   - Add optimistic updates and cache invalidation

5. **Add navigation and user interactions**
   - Implement row click navigation to key views
   - Add keyboard navigation support
   - Implement proper ARIA labels and roles

6. **Polish UX and accessibility**
   - Add loading states and skeleton components
   - Implement proper error boundaries
   - Add toast notifications for actions
   - Ensure keyboard navigation and screen reader support

7. **Performance optimization and final polish**
   - Implement React.memo for expensive components
   - Add proper memoization with useMemo/useCallback
   - Final accessibility audit and UX review
