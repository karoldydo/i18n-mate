# Telemetry Types Refactoring Plan

## Current State Analysis

### Existing Types

The current telemetry feature types are located in `src/shared/types/telemetry/index.ts` and include:

- **TelemetryEvent** - Direct extraction from Supabase Tables<'telemetry_events'>
- **TelemetryEventInsert** - Direct extraction from Supabase TablesInsert<'telemetry_events'>
- **TelemetryEventUpdate** - Direct extraction from Supabase TablesUpdate<'telemetry_events'>
- **TelemetryEventResponse** - Redundant alias for TelemetryEvent (simple type alias)
- **CreateTelemetryEventRequest** - Manual Pick operation from TelemetryEventInsert
- **ListTelemetryEventsParams** - Query parameters interface extending PaginationParams
- **TelemetryEventsParams** - Duplicate interface with different naming (no semantic difference)
- **EventType** - Alias for Enums<'event_type'> from database types
- **KeyCreatedEvent** - Manual interface for key creation events
- **LanguageAddedEvent** - Manual interface for language addition events
- **ProjectCreatedEvent** - Manual interface for project creation events
- **TranslationCompletedEvent** - Manual interface for translation completion events
- **KeyCreatedProperties** - Event-specific properties interface
- **LanguageAddedProperties** - Event-specific properties interface
- **ProjectCreatedProperties** - Event-specific properties interface
- **TranslationCompletedProperties** - Event-specific properties interface
- **TelemetryEventProperties** - Union type of all property interfaces
- **TelemetryEventUnion** - Union type of all complete event interfaces

### API Usage Patterns

**List Operations (useTelemetryEvents):**

- Uses `ListTelemetryEventsParams` for input validation via `LIST_TELEMETRY_EVENTS_SCHEMA`
- Returns `TelemetryEventResponse[]` (array of telemetry events)
- Calls direct table query: `.from('telemetry_events').select('*').eq('project_id', projectId)`
- Runtime validation using `TELEMETRY_EVENT_RESPONSE_SCHEMA.array()`
- Used by `ProjectTelemetryContent` component for displaying event timeline

**Create/Update Operations:**

- **Not exposed via API layer** - telemetry events are created automatically by database triggers and RPC functions
- No mutation hooks exist (events are side effects of other operations)
- Create operations handled by: project creation RPC, locale addition triggers, key creation triggers, translation job completion

### Problems Identified

1. **Inconsistent CRUD Naming Convention**
   - Mix of `Request`/`Response` suffixes with no suffix types (`TelemetryEvent` vs `TelemetryEventResponse`)
   - Duplicate parameter types: `ListTelemetryEventsParams` vs `TelemetryEventsParams`
   - Manual request types instead of following established patterns

2. **Type Duplication and Redundancy**
   - `TelemetryEventResponse` = `TelemetryEvent` (redundant alias)
   - `TelemetryEventsParams` = `ListTelemetryEventsParams` (duplicate interface)
   - Multiple manual event interfaces that mirror database structure

3. **Manual Type Definitions Instead of Supabase-Derived Types**
   - `CreateTelemetryEventRequest` manually defined as Pick operation
   - Event-specific interfaces manually defined instead of derived from database types
   - Complex union types that could be simplified

4. **Export Bloat and Unused Types**
   - Many types exported from main index but not used by API layer
   - Event-specific interfaces exported but only used internally for union types
   - `TelemetryEventUpdate` exported but no update operations exist (append-only table)

5. **Complex Event Type Hierarchy**
   - Manual event interfaces with duplicated fields (created_at, project_id, etc.)
   - Union types that add complexity without clear benefit
   - Properties interfaces that could be simplified

6. **Inconsistent Property Typing**
   - Properties field typed as `Json | null` in database but manually typed in interfaces
   - Event-specific property validation not leveraged from database constraints

## Proposed Refactoring

### New Type Definitions

Following the established CRUD naming convention and type derivation strategy:

```typescript
// List Operations
export type TelemetryEventsResponse = Tables<'telemetry_events'>[];

// Single Event Operations (if needed in future)
export type TelemetryEventResponse = Tables<'telemetry_events'>;

// List Parameters
export type TelemetryEventsRequest = {
  limit?: number;
  offset?: number;
  order?: 'created_at.asc' | 'created_at.desc';
};

// Create Operations (for future API use - currently handled by database)
export type CreateTelemetryEventRequest = {
  event_name: Enums<'event_type'>;
  project_id: string;
  properties?: Json | null;
};

// Event-specific property types (derived from database usage patterns)
export type KeyCreatedProperties = {
  full_key: string;
  key_count: number;
};

export type LanguageAddedProperties = {
  is_default?: boolean;
  locale: string;
  locale_count: number;
};

export type ProjectCreatedProperties = {
  locale_count: number;
};

export type TranslationCompletedProperties = {
  completed_keys: number;
  failed_keys: number;
  mode: string;
  target_locale: string;
};

// Union type for type-safe property handling
export type TelemetryEventProperties =
  | KeyCreatedProperties
  | LanguageAddedProperties
  | ProjectCreatedProperties
  | TranslationCompletedProperties;
```

### Migration Strategy

1. **Phase 1: Type Definition Updates**
   - Replace manual type definitions with Supabase-derived types following CRUD convention
   - Remove redundant aliases (`TelemetryEventResponse` → `TelemetryEvent`)
   - Simplify event-specific interfaces to property-only types
   - Update `src/shared/types/telemetry/index.ts` with new structure
   - Remove unused types entirely (no backward compatibility)

2. **Phase 2: API Layer Updates**
   - Update `useTelemetryEvents` hook to use new type names
   - Update Zod schemas to reference new types (`TelemetryEventsRequest`)
   - Update import statements across telemetry API files
   - Rename `LIST_TELEMETRY_EVENTS_SCHEMA` to `TELEMETRY_EVENTS_SCHEMA` for consistency

3. **Phase 3: Component Layer Updates**
   - Update `ProjectTelemetryContent` component type annotations
   - Update telemetry hooks and utilities to use new property types
   - Update any component-level type imports

4. **Phase 4: Export Cleanup**
   - Update `src/shared/types/index.ts` to export only API-used types
   - Remove exports for internal types (`TelemetryEventInsert`, `TelemetryEventUpdate`, etc.)
   - Reorganize exports by CRUD operation type

### Impact Assessment

**Breaking Changes:**

- All type names change to follow new CRUD convention (`TelemetryEventResponse` → `TelemetryEvent`)
- `ListTelemetryEventsParams` → `TelemetryEventsRequest` (parameter object naming)
- Event-specific interfaces simplified to property-only types
- All import statements must be updated across telemetry feature
- This affects only telemetry feature (isolated scope)

**No Backward Compatibility:**

- Legacy types removed entirely (append-only events, no migration needed)
- All files importing old types must be updated simultaneously
- Requires coordinated changes across telemetry API and components

**Benefits:**

- Eliminated type duplication by using direct Supabase table types
- Consistent CRUD naming convention matching other features (projects, keys, locales)
- Simplified type hierarchy (removed complex manual interfaces)
- Direct type safety from Supabase schema instead of manual definitions
- Cleaner separation between database types and application types
- Reduced export surface area (only API-used types exported)

**Testing Requirements:**

- Runtime validation tests must pass (Zod schemas compatible with new types)
- API hook integration tests must pass with updated type names
- Component rendering tests must pass with new type structure
- TypeScript compilation must succeed across updated telemetry files
- No behavioral changes in API responses or UI rendering

## Implementation Details

### Files to Modify

**1. `src/shared/types/telemetry/index.ts`**

- Replace all manual type definitions with Supabase-derived types
- Implement new CRUD naming convention
- Remove complex event union types and manual interfaces
- Keep only essential property types for type-safe handling

**2. `src/shared/types/index.ts`**

- Update telemetry exports to only include API-used types
- Remove exports for internal database types (`TelemetryEventInsert`, `TelemetryEventUpdate`)
- Organize exports by CRUD operation (List, Create)

**3. `src/features/telemetry/api/telemetry.schemas.ts`**

- Rename `LIST_TELEMETRY_EVENTS_SCHEMA` to `TELEMETRY_EVENTS_SCHEMA`
- Update Zod schema type annotations to use new type names
- Ensure schema transformations remain compatible
- Update import statements to reference new types

**4. API Hook Files**

- `src/features/telemetry/api/useTelemetryEvents/useTelemetryEvents.ts`:
  - Update import statements for new type names
  - Update parameter type from `ListTelemetryEventsParams` to `TelemetryEventsRequest`
  - Update return type annotation to `TelemetryEventsResponse`

**5. Component Files**

- `src/features/telemetry/components/views/ProjectTelemetryContent.tsx`:
  - Update hook usage to match new parameter structure
  - Update any local type annotations

**6. Telemetry Utility Files**

- `src/features/telemetry/hooks/useTelemetryKPIs.ts`:
  - Update type annotations for property types
  - Update event processing logic to use new property interfaces

**7. Test Files**

- Update all test files importing old types to use new type names
- Update mock data generators to use new type structure
- Update test assertions to match new type names

### Validation Updates

Schema compatibility maintained:

- `TELEMETRY_EVENTS_SCHEMA` validates `TelemetryEventsRequest` input parameters
- `TELEMETRY_EVENT_RESPONSE_SCHEMA` validates Supabase table row structure
- Property validation remains consistent with existing event structures
- Runtime validation behavior unchanged (same Zod transformations)

### API Hook Updates

Minimal changes required:

- Import statement updates only for type names
- Parameter destructuring unchanged (same field names)
- Query construction unchanged (same Supabase calls)
- Error handling unchanged (same validation patterns)
- Query key structures unchanged

### Migration Timeline

**Week 1:** Type definition updates and API layer updates
**Week 2:** Component layer updates and testing
**Week 3:** Export cleanup and integration testing
**Week 4:** Final validation and documentation updates
