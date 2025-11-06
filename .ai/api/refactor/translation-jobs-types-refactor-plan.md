# Translation Jobs Types Refactoring Plan

## Current State Analysis

### Existing Types

The current translation-jobs feature types are located in `src/shared/types/translation-jobs/index.ts` and include:

- **CancelTranslationJobContext** - Optimistic update context for cancellation
- **CancelTranslationJobRequest** - Mutation variables for cancellation
- **CancelTranslationJobRpcArgs** - RPC arguments for cancellation
- **CheckActiveJobResponse** - Array response for active job queries
- **CreateTranslationJobRequest** - Manual interface for create input
- **CreateTranslationJobResponse** - Edge Function response type
- **GetJobItemsParams** - Query parameters for job items
- **ItemStatus** - Enum extraction from Supabase
- **JobStatus** - Enum extraction from Supabase
- **ListTranslationJobItemsResponse** - Paginated job items with key info
- **ListTranslationJobsParams** - Query parameters extending PaginationParams
- **ListTranslationJobsResponse** - Paginated job history
- **TranslationJob** - Direct extraction from Supabase Tables<'translation_jobs'>
- **TranslationJobId** - Branded type for job IDs
- **TranslationJobInsert** - Direct extraction from Supabase TablesInsert<'translation_jobs'>
- **TranslationJobItem** - Direct extraction from Supabase Tables<'translation_job_items'>
- **TranslationJobItemId** - Branded type for job item IDs
- **TranslationJobItemInsert** - Direct extraction from Supabase TablesInsert<'translation_job_items'>
- **TranslationJobItemResponse** - Job item with embedded key information
- **TranslationJobItemUpdate** - Direct extraction from Supabase TablesUpdate<'translation_job_items'>
- **TranslationJobParams** - Manual interface for LLM configuration
- **TranslationJobResponse** - Alias to TranslationJob table type
- **TranslationJobUpdate** - Direct extraction from Supabase TablesUpdate<'translation_jobs'>
- **TranslationMode** - Enum extraction from Supabase

### API Usage Patterns

**List Operations (useTranslationJobs):**

- Uses `ListTranslationJobsParams` for input validation
- Returns `ListTranslationJobsResponse` with `TranslationJobResponse[]` data
- Direct table query with select '\*' and runtime validation
- Runtime validation using `TRANSLATION_JOB_RESPONSE_SCHEMA`

**Single Item Operations (useActiveTranslationJob):**

- Takes `string` projectId parameter
- Returns `CheckActiveJobResponse` (array of TranslationJobResponse)
- Direct table query with status filter and runtime validation
- Runtime validation using `TRANSLATION_JOB_RESPONSE_SCHEMA`

**Create Operations (useCreateTranslationJob):**

- Takes `CreateTranslationJobRequest` input
- Returns `CreateTranslationJobResponse` type
- Calls Edge Function `/functions/v1/translate` with schema-transformed data
- Runtime validation using `CREATE_TRANSLATION_JOB_RESPONSE_SCHEMA`

**Cancel Operations (useCancelTranslationJob):**

- Takes `CancelTranslationJobRequest` input
- Returns `TranslationJobResponse` type
- Direct table update with status change and runtime validation
- No schema validation (direct table operation)

**Job Items Operations (useTranslationJobItems):**

- Uses `GetJobItemsParams` for input validation
- Returns `ListTranslationJobItemsResponse` with `TranslationJobItemResponse[]` data
- Table query with JOIN to keys table for full_key information
- Runtime validation using `TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA`

### Problems Identified

1. **Inconsistent Naming Convention**
   - Mix of specific names (`CheckActiveJobResponse`) and generic names (`TranslationJobResponse`)
   - No clear CRUD pattern - some use `Request`/`Response`, others don't follow convention
   - `TranslationJobResponse` as alias to `TranslationJob` vs `TranslationJobItemResponse` as extension
   - Array responses named differently (`CheckActiveJobResponse` vs `ListTranslationJobsResponse`)

2. **Type Duplication and Manual Definitions**
   - `CreateTranslationJobRequest` manually defined instead of derived from Edge Function interface
   - `TranslationJobParams` manually defined instead of using Supabase Json type
   - `TranslationJobResponse` as alias instead of direct table type usage
   - `TranslationJobItemResponse` extends base type unnecessarily

3. **Unnecessary Type Complexity**
   - Complex response types with manual extensions that could be simplified
   - Multiple layers of type indirection (e.g., `TranslationJobResponse` → `TranslationJob`)
   - Branded types (`TranslationJobId`, `TranslationJobItemId`) not consistently used

4. **Export Bloat**
   - Base table types (`TranslationJob`, `TranslationJobInsert`, `TranslationJobUpdate`, etc.) exported but not used by API layer
   - Internal mutation context types exported unnecessarily
   - All types exported from main index regardless of usage scope

## Proposed Refactoring

### New Type Definitions

Following the CRUD naming convention and type derivation strategy:

```typescript
// List Operations
export type TranslationJobsResponse = PaginatedResponse<TranslationJobResponse>;
export type TranslationJobsRequest = ListTranslationJobsParams;

// Single Item Operations
export type TranslationJobResponse = Tables<'translation_jobs'>;
export type TranslationJobRequest = string; // project_id for active job check

// Job Items Operations
export type TranslationJobItemsResponse = PaginatedResponse<TranslationJobItemResponse>;
export type TranslationJobItemsRequest = GetJobItemsParams;

// Create Operations
export type CreateTranslationJobRequest = {
  key_ids: string[];
  mode: TranslationMode;
  params?: null | TranslationJobParams;
  project_id: string;
  target_locale: string;
};
export type CreateTranslationJobResponse = {
  job_id: string;
  message: string;
  status: JobStatus;
};

// Cancel Operations
export type CancelTranslationJobRequest = {
  jobId: string;
};
export type CancelTranslationJobResponse = TranslationJobResponse;

// Supporting Types
export type TranslationJobItemResponse = Tables<'translation_job_items'> & {
  keys: {
    full_key: string;
  };
};

export type TranslationJobParams = {
  max_tokens?: number;
  model?: string;
  provider?: string;
  temperature?: number;
};

// Enums (keep as-is, directly from Supabase)
export type JobStatus = Enums<'job_status'>;
export type ItemStatus = Enums<'item_status'>;
export type TranslationMode = Enums<'translation_mode'>;
```

### Migration Strategy

1. **Phase 1: Type Definition Updates**
   - Replace manual type definitions with direct Supabase table type usage
   - Update `src/shared/types/translation-jobs/index.ts` with new structure
   - Remove legacy types entirely (no backward compatibility)

2. **Phase 2: API Layer Updates**
   - Update all API hooks to use new type names
   - Update Zod schemas to reference new types
   - Update import statements across all API files

3. **Phase 3: Component Layer Updates**
   - Update all component files to use new type names
   - Update component prop types and state types
   - Update test files to use new type imports

4. **Phase 4: Export Cleanup**
   - Update `src/shared/types/index.ts` to export only new types
   - Remove old type exports completely

### Impact Assessment

**Breaking Changes:**

- All type names change to follow new CRUD convention
- All import statements must be updated across the codebase
- Components using `CheckActiveJobResponse`, `ListTranslationJobsResponse`, etc. must be updated
- This is a comprehensive refactoring affecting UI components, not just API layer

**No Backward Compatibility:**

- Legacy types removed entirely
- All files importing old types must be updated simultaneously
- Requires coordinated changes across API, components, and tests

**Benefits:**

- Eliminated type duplication by using direct Supabase table types
- Consistent CRUD naming convention across all operations
- Direct type safety from Supabase schema instead of manual definitions
- Simplified type hierarchy (removed unnecessary aliases and extensions)
- Cleaner separation between API and UI type concerns
- Reduced export surface by removing unused base table types

**Testing Requirements:**

- Runtime validation tests must pass (Zod schemas unchanged)
- API hook integration tests must pass
- Component rendering tests must pass with new types
- TypeScript compilation must succeed across all updated files
- No behavioral changes in API responses or UI rendering

## Implementation Details

### Files to Modify

**1. `src/shared/types/translation-jobs/index.ts`**

- Replace all manual type definitions with direct Supabase table type usage
- Implement new CRUD naming convention
- Remove base table types not used by API layer
- Keep only enums and supporting types needed by API

**2. `src/shared/types/index.ts`**

- Update exports to only include API-used types
- Remove exports for internal types (`TranslationJob`, `TranslationJobInsert`, etc.)
- Reorganize exports by CRUD operation type

**3. `src/features/translation-jobs/api/translation-jobs.schemas.ts`**

- Rename schemas to match new type names (e.g., `LIST_TRANSLATION_JOBS_SCHEMA` → `TRANSLATION_JOBS_SCHEMA`)
- Update Zod schema type annotations to use new type names
- Ensure schema transformations remain compatible
- Update import statements

**4. API Hook Files**

- `useTranslationJobs.ts`: Update imports and type annotations (`ListTranslationJobsParams` → `TranslationJobsRequest`, `ListTranslationJobsResponse` → `TranslationJobsResponse`)
- `useActiveTranslationJob.ts`: Update imports and type annotations (`CheckActiveJobResponse` → `TranslationJobResponse[]`)
- `useCreateTranslationJob.ts`: Update imports and type annotations
- `useCancelTranslationJob.ts`: Update imports and type annotations (`CancelTranslationJobRequest` → `CancelTranslationJobRequest`, `TranslationJobResponse` → `CancelTranslationJobResponse`)
- `useTranslationJobItems.ts`: Update imports and type annotations (`ListTranslationJobItemsResponse` → `TranslationJobItemsResponse`)

**5. Component Files (UI Layer)**

- Update all component files to use new type names
- Update component prop types and state types
- Update test files to use new type imports

**6. Test Files**

- Update all test files importing old types to use new type names
- Update mock data generators to use new type structure

### Validation Updates

Schema compatibility maintained:

- `LIST_TRANSLATION_JOBS_SCHEMA` renamed to `TRANSLATION_JOBS_SCHEMA` for consistency
- `CREATE_TRANSLATION_JOB_SCHEMA` transforms `CreateTranslationJobRequest` to internal structure
- `TRANSLATION_JOB_RESPONSE_SCHEMA` validates table row types
- `TRANSLATION_JOB_ITEM_RESPONSE_SCHEMA` validates joined query results
- `CANCEL_TRANSLATION_JOB_SCHEMA` validates cancellation RPC args

### API Hook Updates

Minimal changes required:

- Import statement updates only
- Type annotation updates to match new naming
- Runtime behavior unchanged (same Zod validation, same queries/Edge Function calls)
- Query key structures unchanged

### Migration Timeline

**Week 1:** Type definition updates, API layer updates, and schema compatibility
**Week 2:** Component layer updates and testing
**Week 3:** Export cleanup and comprehensive integration testing
**Week 4:** Final validation and documentation updates
