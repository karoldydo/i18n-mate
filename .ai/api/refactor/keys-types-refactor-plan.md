# Keys Types Refactoring Plan

## Current State Analysis

### Existing Types

The current keys feature types are located in `src/shared/types/keys/index.ts` and include:

- **CreateKeyRequest** - Manual interface for create input (no p\_ prefixes)
- **CreateKeyRpcArgs** - Direct extraction from Supabase RPC args (with p\_ prefixes)
- **CreateKeyResponse** - Direct extraction from `create_key_with_value` RPC return
- **DeleteKeyArgs** - Manual interface for delete operation
- **Key** - Direct extraction from Supabase Tables<'keys'>
- **KeyDefaultViewListResponse** - Paginated response for default view
- **KeyDefaultViewResponse** - Direct extraction from `list_keys_default_view` RPC return
- **KeyId** - Branded type for key IDs
- **KeyInsert** - Direct extraction from Supabase TablesInsert<'keys'>
- **KeyPerLanguageViewListResponse** - Paginated response for per-language view
- **KeyPerLanguageViewResponse** - Direct extraction from composite type `key_per_language_view_type`
- **KeyResponse** - Alias for Key table type
- **KeyUpdate** - Direct extraction from Supabase TablesUpdate<'keys'>
- **ListKeysDefaultViewArgs** - Manual interface with nullable params
- **ListKeysDefaultViewParams** - Params extending PaginationParams
- **ListKeysDefaultViewRpcArgs** - RPC args with p\_ prefixes
- **ListKeysPerLanguageParams** - Params extending ListKeysDefaultViewParams with locale
- **ListKeysPerLanguageViewArgs** - Manual interface with nullable params
- **ListKeysPerLanguageViewRpcArgs** - RPC args with p\_ prefixes
- **KeyCreatedEvent** - Telemetry event interface
- **KeyCreatedProperties** - Telemetry event properties

### API Usage Patterns

**List Default View Operations (useKeysDefaultView):**

- Uses `ListKeysDefaultViewParams` for input validation
- Returns `KeyDefaultViewListResponse` with `KeyDefaultViewResponse[]` data
- Calls RPC `list_keys_default_view` with transformed parameters (p\_ prefixes)
- Runtime validation using `KEY_DEFAULT_VIEW_RESPONSE_SCHEMA`

**List Per-Language View Operations (useKeysPerLanguageView):**

- Uses `ListKeysPerLanguageParams` for input validation
- Returns `KeyPerLanguageViewListResponse` with `KeyPerLanguageViewResponse[]` data
- Calls RPC `list_keys_per_language_view` with transformed parameters (p\_ prefixes)
- Runtime validation using `KEY_PER_LANGUAGE_VIEW_RESPONSE_SCHEMA`

**Create Operations (useCreateKey):**

- Takes `CreateKeyRequest` input (no p\_ prefixes)
- Returns `CreateKeyResponse` type
- Calls RPC `create_key_with_value` with schema-transformed data (adds p\_ prefixes)
- Runtime validation using `CREATE_KEY_RESPONSE_SCHEMA`

**Delete Operations (useDeleteKey):**

- Takes `string` UUID parameter
- Uses direct table delete (not RPC) with validated UUID
- No specific return type (mutation returns unknown)

**Count Operations (useProjectKeyCount):**

- Takes `string` projectId parameter
- Returns `number` count
- Calls RPC `list_keys_default_view` with limit 1 and exact count
- Uses same validation as list operations

### Problems Identified

1. **Inconsistent Naming Convention**
   - Mix of `Request`/`Response` suffixes with no suffix types (`Key`, `KeyUpdate`)
   - Manual interfaces alongside RPC-derived types for same concepts
   - `KeyResponse` as alias vs `KeyDefaultViewResponse`/`KeyPerLanguageViewResponse` as RPC extractions
   - Multiple parameter interfaces (`Args` vs `Params` vs `RpcArgs`)

2. **Type Duplication and Manual Definitions**
   - `CreateKeyRequest` manually defined instead of derived from RPC args without prefixes
   - `KeyResponse` as simple alias instead of direct RPC extraction
   - Separate `ListKeysDefaultViewArgs`/`ListKeysPerLanguageViewArgs` vs `ListKeysDefaultViewParams`/`ListKeysPerLanguageParams`
   - Complex parameter transformation logic in hooks

3. **Unnecessary Type Complexity**
   - Three-tier parameter hierarchy: `Params` → `Args` → `RpcArgs`
   - Manual response wrappers (`*ListResponse`) instead of direct `PaginatedResponse<T>`
   - Branded types (`KeyId`) not consistently used
   - Telemetry types mixed with API types

4. **Export Bloat**
   - All types exported from main index, including internal types not used by API layer
   - `Key`, `KeyUpdate`, `KeyInsert` exported but not directly used in API hooks
   - Parameter transformation types exposed unnecessarily

## Proposed Refactoring

### New Type Definitions

Following the CRUD naming convention and type derivation strategy:

```typescript
// List Operations - Default View
export type KeysResponse = PaginatedResponse<Database['public']['Functions']['list_keys_default_view']['Returns'][0]>;
export type KeysRequest = Database['public']['Functions']['list_keys_default_view']['Args'];

// List Operations - Per Language View
export type KeyTranslationsResponse = PaginatedResponse<
  Database['public']['CompositeTypes']['key_per_language_view_type']
>;
export type KeyTranslationsRequest = Database['public']['Functions']['list_keys_per_language_view']['Args'];

// Create Operations
export type CreateKeyRequest = {
  default_value: string;
  full_key: string;
  project_id: string;
};
export type CreateKeyRpcArgs = Database['public']['Functions']['create_key_with_value']['Args'];
export type CreateKeyResponse = Database['public']['Functions']['create_key_with_value']['Returns'][0];

// Delete Operations - uses direct table access, no RPC types needed

// Count Operations - reuses KeysRequest but returns count
export type KeyCountResponse = number;
```

### Migration Strategy

1. **Phase 1: Type Definition Updates**
   - Replace manual type definitions with RPC-derived types
   - Update `src/shared/types/keys/index.ts` with new structure
   - Remove legacy types entirely (no backward compatibility)
   - Keep telemetry types unchanged as they're used by external systems

2. **Phase 2: API Layer Updates**
   - Update all API hooks to use new type names
   - Update Zod schemas to reference new types
   - Update import statements across all API files
   - Simplify parameter transformation logic

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
- Components using `KeyDefaultViewListResponse`, `KeyPerLanguageViewListResponse`, etc. must be updated
- This is a comprehensive refactoring affecting UI components, not just API layer

**No Backward Compatibility:**

- Legacy types removed entirely
- All files importing old types must be updated simultaneously
- Requires coordinated changes across API, components, and tests

**Benefits:**

- Eliminated type duplication by using direct RPC-derived types
- Consistent CRUD naming convention across all operations
- Direct type safety from Supabase schema instead of manual definitions
- Simplified parameter handling (removed `Args`/`Params`/`RpcArgs` complexity)
- Cleaner separation between API and UI type concerns
- Reduced export surface by removing unused internal types

**Testing Requirements:**

- Runtime validation tests must pass (Zod schemas unchanged)
- API hook integration tests must pass
- Component rendering tests must pass with new types
- TypeScript compilation must succeed across all updated files
- No behavioral changes in API responses or UI rendering

## Implementation Details

### Files to Modify

**1. `src/shared/types/keys/index.ts`**

- Replace all manual type definitions with RPC-derived types
- Implement new CRUD naming convention
- Remove all unused types (`Key`, `KeyUpdate`, `KeyInsert`, `KeyId`, parameter transformation types)
- Keep telemetry types (`KeyCreatedEvent`, `KeyCreatedProperties`) unchanged

**2. `src/shared/types/index.ts`**

- Update exports to only include API-used types
- Remove exports for internal types
- Reorganize exports by CRUD operation type

**3. `src/features/keys/api/keys.schemas.ts`**

- Rename `LIST_KEYS_DEFAULT_VIEW_SCHEMA` to `KEYS_SCHEMA`
- Rename `LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA` to `KEY_TRANSLATIONS_SCHEMA`
- Update Zod schema type annotations to use new type names
- Ensure schema transformations remain compatible
- Update import statements

**4. API Hook Files**

- `useKeysDefaultView.ts`: Update imports and type annotations
- `useKeysPerLanguageView.ts`: Update imports and type annotations
- `useCreateKey.ts`: Update imports and type annotations
- `useDeleteKey.ts`: Update imports (no type changes needed)
- `useProjectKeyCount.ts`: Update imports and type annotations

**5. Component Files (UI Layer)**

- Update all component files importing old type names
- Update component prop types and state types
- Update test files to use new type imports

### Validation Updates

Schema compatibility maintained:

- `KEYS_SCHEMA` renamed from `LIST_KEYS_DEFAULT_VIEW_SCHEMA` for consistency
- `KEY_TRANSLATIONS_SCHEMA` renamed from `LIST_KEYS_PER_LANGUAGE_VIEW_SCHEMA` for consistency
- `CREATE_KEY_SCHEMA` transforms `CreateKeyRequest` to `CreateKeyRpcArgs`
- Response schemas remain compatible with direct RPC extraction
- Runtime validation behavior unchanged

### API Hook Updates

Minimal changes required:

- Import statement updates only
- Type annotation updates to match new naming
- Runtime behavior unchanged (same Zod validation, same RPC calls)
- Query key structures unchanged
- Parameter transformation logic simplified (direct schema use)

### Migration Timeline

**Week 1:** Type definition updates, API layer updates, and schema compatibility
**Week 2:** Component layer updates and testing
**Week 3:** Export cleanup and comprehensive integration testing
**Week 4:** Final validation and documentation updates
