# Projects Types Refactoring Plan

## Current State Analysis

### Existing Types

The current projects feature types are located in `src/shared/types/projects/index.ts` and include:

- **CreateProjectRequest** - Manual interface for create input
- **CreateProjectRpcArgs** - Direct extraction from Supabase RPC args
- **ListProjectsParams** - Query parameters interface extending PaginationParams
- **Project** - Direct extraction from Supabase Tables<'projects'>
- **ProjectResponse** - Pick operation from Project table
- **ProjectListItem** - ProjectResponse extended with counts and total_count
- **ProjectListResponse** - PaginatedResponse<ProjectListItem>
- **ProjectUpdate** - Direct extraction from Supabase TablesUpdate<'projects'>
- **ProjectWithCounts** - ProjectResponse extended with key_count and locale_count
- **UpdateProjectRequest** - Pick from ProjectUpdate for mutable fields only

### API Usage Patterns

**List Operations (useProjects):**

- Uses `ListProjectsParams` for input validation
- Returns `ProjectListResponse` with `ProjectListItem[]` data
- Calls RPC `list_projects_with_counts` with transformed parameters
- Runtime validation using `PROJECT_LIST_ITEM_SCHEMA`

**Single Item Operations (useProject):**

- Takes `string` projectId parameter
- Returns `ProjectWithCounts` type
- Calls RPC `get_project_with_counts` with validated UUID
- Runtime validation using `PROJECT_WITH_COUNTS_SCHEMA`

**Create Operations (useCreateProject):**

- Takes `CreateProjectRequest` input
- Returns `ProjectResponse` type
- Calls RPC `create_project_with_default_locale` with schema-transformed data
- Runtime validation using `PROJECT_RESPONSE_SCHEMA`

**Update Operations (useUpdateProject):**

- Takes `string` projectId parameter and `UpdateProjectRequest` payload
- Returns `ProjectResponse` type
- Uses direct table update (not RPC) with select fields
- Runtime validation using `PROJECT_RESPONSE_SCHEMA`

### Problems Identified

1. **Inconsistent Naming Convention**
   - Mix of `Request`/`Response` suffixes with no suffix types
   - `CreateProjectRpcArgs` vs `CreateProjectRequest` for same concept
   - `ProjectWithCounts` vs `ProjectResponse` - unclear semantic difference

2. **Type Duplication and Manual Definitions**
   - `CreateProjectRequest` manually defined instead of derived from RPC args
   - `ProjectResponse` as Pick from table instead of direct RPC return type
   - `ProjectWithCounts` extends `ProjectResponse` but could be direct RPC extraction
   - `ProjectListItem` extends `ProjectWithCounts` with total_count - complex hierarchy

3. **Unnecessary Type Complexity**
   - Three-tier hierarchy: `ProjectResponse` → `ProjectWithCounts` → `ProjectListItem`
   - Complex intersections that could be simplified with direct RPC type extraction
   - Manual field selection instead of leveraging generated types

4. **Export Bloat**
   - All types exported from main index, including internal types not used by API layer
   - `Project`, `ProjectUpdate` exported but not directly used in API hooks

## Proposed Refactoring

### New Type Definitions

Following the CRUD naming convention and type derivation strategy:

```typescript
// List Operations
export type ProjectsResponse = PaginatedResponse<
  Database['public']['Functions']['list_projects_with_counts']['Returns'][0]
>;
export type ProjectsRequest = Database['public']['Functions']['list_projects_with_counts']['Args'];

// Single Item Operations
export type ProjectResponse = Database['public']['Functions']['get_project_with_counts']['Returns'][0];
export type ProjectRequest = Database['public']['Functions']['get_project_with_counts']['Args'];

// Create Operations
export type CreateProjectRequest = {
  default_locale: string;
  default_locale_label: string;
  description?: string;
  name: string;
  prefix: string;
};
export type CreateProjectRpcArgs = Database['public']['Functions']['create_project_with_default_locale']['Args'];
export type CreateProjectResponse = Database['public']['Functions']['create_project_with_default_locale']['Returns'][0];

// Update Operations
export type UpdateProjectRequest = {
  description?: string | null;
  name?: string;
};
export type UpdateProjectResponse = ProjectResponse;
```

### Migration Strategy

1. **Phase 1: Type Definition Updates**
   - Replace manual type definitions with RPC-derived types
   - Update `src/shared/types/projects/index.ts` with new structure
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
- Components using `ProjectWithCounts`, `ProjectListItem`, etc. must be updated
- This is a comprehensive refactoring affecting UI components, not just API layer

**No Backward Compatibility:**

- Legacy types removed entirely
- All files importing old types must be updated simultaneously
- Requires coordinated changes across API, components, and tests

**Benefits:**

- Eliminated type duplication by using direct RPC-derived types
- Consistent CRUD naming convention across all operations
- Direct type safety from Supabase schema instead of manual definitions
- Simplified type hierarchy (removed complex Pick/extends patterns)
- Cleaner separation between API and UI type concerns

**Testing Requirements:**

- Runtime validation tests must pass (Zod schemas unchanged)
- API hook integration tests must pass
- Component rendering tests must pass with new types
- TypeScript compilation must succeed across all updated files
- No behavioral changes in API responses or UI rendering

## Implementation Details

### Files to Modify

**1. `src/shared/types/projects/index.ts`**

- Replace all manual type definitions with RPC-derived types
- Implement new CRUD naming convention
- Add backward compatibility aliases with deprecation notices

**2. `src/shared/types/index.ts`**

- Update exports to only include API-used types
- Remove exports for internal types (`Project`, `ProjectUpdate`, etc.)
- Reorganize exports by CRUD operation type

**3. `src/features/projects/api/projects.schemas.ts`**

- Rename `LIST_PROJECTS_SCHEMA` to `PROJECTS_SCHEMA`
- Rename `PROJECT_WITH_COUNTS_SCHEMA` to `PROJECT_SCHEMA`
- Update Zod schema type annotations to use new type names
- Ensure schema transformations remain compatible
- Update import statements

**4. API Hook Files**

- `useProjects.ts`: Update imports and type annotations
- `useProject.ts`: Update imports and type annotations
- `useCreateProject.ts`: Update imports and type annotations
- `useUpdateProject.ts`: Update imports and type annotations

**5. Component Files (UI Layer)**

- `ProjectListPage.tsx`: Update `ProjectWithCounts` → `ProjectResponse`
- `ProjectList.tsx`: Update `ProjectWithCounts` → `ProjectResponse`
- `ProjectCard.tsx`: Update `ProjectWithCounts` → `ProjectResponse`
- `DeleteProjectDialog.tsx`: Update `ProjectWithCounts` → `ProjectResponse`
- `EditProjectDialog.tsx`: Update `ProjectWithCounts` → `ProjectResponse`
- `ProjectDetailsContent.tsx`: Update `ProjectWithCounts` → `ProjectResponse`

**6. Test Files**

- Update all test files importing old types to use new type names
- Update mock data generators to use new type structure

### Validation Updates

Schema compatibility maintained:

- `LIST_PROJECTS_SCHEMA` renamed to `PROJECTS_SCHEMA` for consistency
- `CREATE_PROJECT_SCHEMA` transforms `CreateProjectRequest` to `CreateProjectRpcArgs`
- `PROJECT_RESPONSE_SCHEMA` validates RPC return types
- `PROJECT_WITH_COUNTS_SCHEMA` renamed to `PROJECT_SCHEMA` for consistency

### API Hook Updates

Minimal changes required:

- Import statement updates only
- Type annotation updates to match new naming
- Runtime behavior unchanged (same Zod validation, same RPC calls)
- Query key structures unchanged

### Migration Timeline

**Week 1:** Type definition updates, API layer updates, and schema compatibility
**Week 2:** Component layer updates and testing
**Week 3:** Export cleanup and comprehensive integration testing
**Week 4:** Final validation and documentation updates
