# Locales Types Refactoring Plan

## Current State Analysis

### Existing Types

- `CreateProjectLocaleRequest` - Manual interface with p\_ prefixes
- `CreateProjectLocaleResponse` - Direct RPC extraction from `create_project_locale_atomic`
- `LanguageAddedEvent` & `LanguageAddedProperties` - Telemetry events (keep unchanged)
- `ListProjectLocalesWithDefaultArgs` - Manual args interface
- `LocaleCode` - Branded type for BCP-47 codes
- `ProjectLocale` - Direct table extraction from `project_locales`
- `ProjectLocaleInsert/Update` - Direct table operations (not used by API)
- `ProjectLocaleResponse` - Simple alias for `ProjectLocale`
- `ProjectLocaleWithDefault` - `ProjectLocaleResponse` extended with `is_default` boolean
- `UpdateProjectLocaleRequest` - Pick operation for mutable fields only

### API Usage Patterns

1. **List Operations** (`useProjectLocales`):
   - Input: `string` projectId
   - Calls RPC: `list_project_locales_with_default` with `{ p_project_id }`
   - Returns: `ProjectLocaleWithDefault[]` (array with is_default flag)

2. **Create Operations** (`useCreateProjectLocale`):
   - Input: `Omit<CreateProjectLocaleRequest, 'p_project_id'>` (label + locale)
   - Calls RPC: `create_project_locale_atomic` with normalized locale
   - Returns: Single `ProjectLocale` record

3. **Update Operations** (`useUpdateProjectLocale`):
   - Input: `UpdateProjectLocaleRequest` (only label field)
   - Uses direct table update on `project_locales`
   - Returns: Single `ProjectLocale` record

4. **Delete Operations** (`useDeleteProjectLocale`):
   - Input: `string` localeId (UUID)
   - Uses direct table delete with CASCADE
   - Returns: `unknown` (mutation result)

### Problems Identified

1. **Inconsistent naming**: Mix of `ProjectLocale*` and direct RPC extraction without clear CRUD convention
2. **Type duplication**: Multiple aliases (`ProjectLocaleResponse`, `ProjectLocale`) for same concept
3. **Manual interfaces**: `CreateProjectLocaleRequest` uses p\_ prefixes instead of direct RPC extraction
4. **Unused types**: `ProjectLocaleInsert/Update` exported but not used by API hooks
5. **Inconsistent patterns**: Some types use RPC extraction, others use manual definitions

## Proposed Refactoring

### New Type Definitions

```typescript
// src/shared/types/locales/index.ts

import type { Database, Tables } from '../database.types';

// List operations
export type LocalesResponse = Database['public']['Functions']['list_project_locales_with_default']['Returns'];

// Single locale operations
export type LocaleResponse = Tables<'project_locales'>;

// Create operations
export interface CreateLocaleRequest {
  label: string;
  locale: string;
}

export type CreateLocaleResponse = Database['public']['Functions']['create_project_locale_atomic']['Returns'][0];

// Update operations
export interface UpdateLocaleRequest {
  label?: string;
}

export type UpdateLocaleResponse = Tables<'project_locales'>;

// Telemetry types (unchanged)
export interface LanguageAddedEvent {
  created_at: string;
  event_name: 'language_added';
  project_id: string;
  properties: LanguageAddedProperties;
}

export interface LanguageAddedProperties {
  locale: string;
  locale_count: number;
}

// Utility types (preserved)
export type LocaleCode = string & { readonly __brand: 'LocaleCode' };
```

### Migration Strategy

#### Phase 1: Type Definition Updates

- Replace all existing type definitions with new CRUD-based types
- Update all import statements in API hooks and components
- Remove unused types (`ProjectLocaleInsert/Update`, `ProjectLocaleResponse`, etc.)
- Preserve telemetry types unchanged

#### Phase 2: Schema Updates

- Update Zod schemas to reference new type names
- Ensure all validation logic remains intact
- Update schema imports in API hooks

#### Phase 3: API Hook Updates

- Update type imports and usage in all locale API hooks
- Ensure runtime behavior remains unchanged
- Update JSDoc comments to reference new types

#### Phase 4: Component Updates

- Update all component imports and type usage
- Ensure no breaking changes in component interfaces
- Update test files to use new types

### Impact Assessment

**Breaking Changes:**

- All locale-related types renamed to follow CRUD convention
- `ProjectLocale*` types removed entirely - no backward compatibility
- Import paths updated throughout the codebase

**No Backward Compatibility:**

- Old type names completely removed
- Direct migration required for all consumers

**Benefits:**

- Consistent CRUD naming convention across all features
- Reduced type duplication through RPC extraction
- Simplified type hierarchy with clear separation of concerns
- Better alignment with established patterns from projects/keys refactoring

**Testing Requirements:**

- Full integration test suite for all locale operations
- Type checking validation across entire codebase
- Runtime behavior verification (no functional changes)

## Implementation Details

### Files to Modify

**Core Type Definitions:**

- `src/shared/types/locales/index.ts` - Complete rewrite with new CRUD types

**API Layer:**

- `src/features/locales/api/locales.schemas.ts` - Update Zod schemas and imports
- `src/features/locales/api/useProjectLocales/useProjectLocales.ts` - Update imports and types
- `src/features/locales/api/useCreateProjectLocale/useCreateProjectLocale.ts` - Update imports and types
- `src/features/locales/api/useUpdateProjectLocale/useUpdateProjectLocale.ts` - Update imports and types
- `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.ts` - Update imports and types

**Component Layer:**

- All files in `src/features/locales/components/` - Update type imports
- All files in `src/features/locales/routes/` - Update type imports
- `src/features/locales/index.ts` - Update exports if needed

**Test Files:**

- `src/features/locales/api/useProjectLocales/useProjectLocales.test.ts` - Update test types
- `src/features/locales/api/useDeleteProjectLocale/useDeleteProjectLocale.test.ts` - Update test types
- All component test files - Update type imports

### Validation Updates

**Zod Schema Changes:**

```typescript
// New schemas following CRUD convention
export const CREATE_LOCALE_SCHEMA = z.object({
  label: LOCALE_LABEL_SCHEMA,
  locale: LOCALE_CODE_SCHEMA,
});

export const UPDATE_LOCALE_SCHEMA = z
  .object({
    label: LOCALE_LABEL_SCHEMA.optional(),
  })
  .strict();

export const LOCALES_RESPONSE_SCHEMA = z.array(PROJECT_LOCALE_WITH_DEFAULT_SCHEMA);
export const LOCALE_RESPONSE_SCHEMA = PROJECT_LOCALE_RESPONSE_SCHEMA;
```

**Schema Compatibility:**

- All existing validation rules preserved
- Locale normalization logic maintained
- Error messages unchanged

### API Hook Updates

**Minimal Changes Required:**

- Type import updates only
- No runtime behavior changes
- JSDoc updated to reference new types
- Query key structures unchanged

### Migration Timeline

**Week 1: Core Types & API Layer**

- Update `src/shared/types/locales/index.ts` with new type definitions
- Update all API hook files with new imports
- Update `locales.schemas.ts` with new schema names
- Run type checking to identify all import errors

**Week 2: Component Updates**

- Update all component files with new type imports
- Update all route files with new type imports
- Update test files with new type imports
- Run full test suite to ensure no runtime issues

**Week 3: Validation & Testing**

- Run comprehensive type checking across entire codebase
- Execute full integration test suite
- Verify all locale operations work correctly
- Update documentation if needed

**Week 4: Final Cleanup**

- Remove any unused imports or dead code
- Final verification of all locale functionality
- Code review and approval
