# Translations Types Refactoring Plan

## Current State Analysis

### Existing Types

The current translations feature types are located in `src/shared/types/translations/index.ts` and include:

- **Translation** - Direct extraction from Supabase `Tables<'translations'>`
- **TranslationInsert** - Direct extraction from Supabase `TablesInsert<'translations'>`
- **TranslationResponse** - Alias for `Translation` table type
- **TranslationUpdate** - Direct extraction from Supabase `TablesUpdate<'translations'>`
- **UpdateSourceType** - Direct extraction from Supabase `Enums<'update_source_type'>`
- **UpdateTranslationRequest** - Manual interface for update payload with all required fields

### API Usage Patterns

**Update Operations (useUpdateTranslation):**

- Takes `UpdateTranslationRequest` payload with all parameters (project_id, key_id, locale, value, etc.)
- Updates via direct table operation (not RPC) with selective field updates
- Returns `TranslationResponse` type
- Uses Zod schemas for runtime validation (`UPDATE_TRANSLATION_REQUEST_SCHEMA`, `TRANSLATION_RESPONSE_SCHEMA`)
- Implements optimistic locking with `updated_at` timestamp
- Runtime validation using `UPDATE_TRANSLATION_REQUEST_BODY_SCHEMA` for body fields only

### Problems Identified

1. **Type Proliferation and Export Bloat**
   - 6 types exported from main index, but only 2 are actually used by API operations
   - Base Supabase types (`Translation`, `TranslationInsert`, `TranslationUpdate`, `UpdateSourceType`) exported but never imported by API layer
   - Manual interface `UpdateTranslationRequest` could be derived from Supabase types

2. **Unnecessary Type Aliases**
   - `TranslationResponse` is just an alias to `Translation` with no added value
   - Creates unnecessary indirection without semantic benefit

3. **Inconsistent Type Derivation**
   - `UpdateTranslationRequest` manually defined instead of being strategically derived from `TablesUpdate<'translations'>`
   - Misses opportunity to leverage Supabase-generated types for consistency

4. **Violation of CRUD Naming Convention**
   - While names follow basic Request/Response pattern, doesn't align with established project-wide conventions
   - Lacks the minimal, focused approach used in other features

## Proposed Refactoring

### Type Inventory

Following the CRUD naming convention and type minimization strategy established in projects, keys, and translation-jobs features:

```typescript
// Response Types
export type TranslationResponse = Tables<'translations'>;

// Request Types
export type UpdateTranslationRequest = {
  is_machine_translated: boolean;
  key_id: string;
  locale: string;
  project_id: string;
  updated_at?: string;
  updated_by_user_id: string | null;
  updated_source: 'system' | 'user';
  value: string | null;
};
```

### Migration Strategy

#### Phase 1: Type Definition Updates

1. **Replace manual interface with derived type:**
   - Change `UpdateTranslationRequest` from manual interface to strategic derivation
   - Base on `TablesUpdate<'translations'>` with required fields made mandatory
   - Ensure all current API usage remains compatible

2. **Simplify response type:**
   - Keep `TranslationResponse` as direct `Tables<'translations'>` extraction
   - Remove unnecessary alias pattern

3. **Remove unused types:**
   - Delete `Translation`, `TranslationInsert`, `TranslationUpdate`, `UpdateSourceType`
   - These are internal Supabase types not used by API layer

#### Phase 2: Export Updates

1. **Update main exports:**
   - Remove exports for unused base types
   - Keep only `TranslationResponse` and `UpdateTranslationRequest`
   - Update `src/shared/types/index.ts` accordingly

#### Phase 3: Schema Updates

1. **Update Zod schemas:**
   - Ensure `UPDATE_TRANSLATION_REQUEST_SCHEMA` remains compatible
   - Verify `TRANSLATION_RESPONSE_SCHEMA` still validates correctly
   - No schema changes needed - types remain structurally identical

### Implementation Plan

1. **Update `src/shared/types/translations/index.ts`:**

   ```typescript
   import type { Tables } from '../database.types';

   // Response Types
   export type TranslationResponse = Tables<'translations'>;

   // Request Types
   export type UpdateTranslationRequest = {
     is_machine_translated: boolean;
     key_id: string;
     locale: string;
     project_id: string;
     updated_at?: string;
     updated_by_user_id: string | null;
     updated_source: 'system' | 'user';
     value: string | null;
   };
   ```

2. **Update `src/shared/types/index.ts`:**
   - Remove `Translation`, `TranslationInsert`, `TranslationUpdate`, `UpdateSourceType` from exports
   - Keep `TranslationResponse`, `UpdateTranslationRequest`

3. **Verify API compatibility:**
   - Run `npm run test` to ensure no breaking changes
   - Check that `useUpdateTranslation` hook works correctly
   - Verify Zod schemas still pass validation

### Validation Checklist

- [ ] `npm run test` passes all tests
- [ ] `useUpdateTranslation` hook functions correctly
- [ ] Zod schemas validate without type errors
- [ ] No breaking changes in API usage patterns
- [ ] TypeScript compilation succeeds
- [ ] Only 2 types exported (down from 6)
- [ ] Follows established CRUD naming convention
- [ ] Maintains type safety and API compatibility
