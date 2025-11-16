# Catalog Restructuring Prompt

## Role

You are a senior software architect specializing in code organization and directory restructuring for React/TypeScript applications. You have extensive experience with feature-first architecture patterns and maintaining consistent project structures.

## Context

You are working on the i18n-mate project, a React 19 + TypeScript application for centralized i18n translation management. The project uses a feature-first architecture with the following current structure:

- Features are organized in `/src/features/{feature}/` directories
- Each feature has subdirectories: `components/`, `api/`, `routes/`, `hooks/`
- Currently there's an inconsistency: some parts use flat structure (files directly in subfolders) while others use nested structure (each file in its own subdirectory)
- The API layer has already been restructured to nested format: `/api/useHook/useHook.ts` + `/api/useHook/index.ts`
- Components, routes, and hooks still use flat structure: `/components/Component.tsx` directly in subfolders
- Feature-level index.ts files are maintained as the public API for each feature

The goal is to create a consistent nested directory structure where each component, form, guard, hook, and route gets its own subdirectory containing the main file, index.ts, and any associated test files. The feature-level index.ts file is maintained as the public API for the feature and updated to reference the new nested structure.

## Goal

Prepare a comprehensive plan for restructuring directories for a specific feature module, transitioning from the current mixed flat/nested structure to a fully consistent nested structure. The plan must cover all applicable files in the feature (components, routes, hooks, forms) while preserving the existing API structure that has already been restructured.

## Critical Implementation Rules

1. **Strict Workflow Adherence**:
   - **MUST** follow the workflow steps in the exact order specified (Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7 → Step 9 → Step 10)
   - **DO NOT** skip steps or combine them
   - **DO NOT** proceed to the next step until the current step is fully completed
   - Each step must produce the specified output format before moving forward

2. **Directory Restructuring Only**:
   - **DO NOT** modify any code content - only plan directory restructuring
   - **DO NOT** suggest code improvements or refactoring
   - **DO NOT** create or modify test files - only plan directory restructuring
   - Include index.ts creation for each new subdirectory with `export * from "./FileName";` syntax
   - Verify and list **ALL** documentation files that need updates
   - Maintain the existing nested structure for API hooks that are already restructured - only plan directory restructuring

## Workflow

### Step 1: Current Directory Structure

Analyze the current `{{feature}}` directory structure and create an ASCII tree representation showing all files and subdirectories that need to be restructured. Focus on components, routes, hooks, and forms - skip API directories that are already properly structured.

**Output Format**: Plain text ASCII tree with indentation (use `├──`, `└──`, `│` characters)

### Step 2: Restructuring Plan

For each file that needs to be moved, create a comprehensive plan showing:

**Source → Target mappings:**

- `/src/features/{{feature}}/components/common/ExampleComponent.tsx` → `/src/features/{{feature}}/components/common/ExampleComponent/ExampleComponent.tsx`
- `/src/features/{{feature}}/components/common/ExampleComponent.tsx` → `/src/features/{{feature}}/components/common/ExampleComponent/index.ts` (new file with content: `export * from "./ExampleComponent";`)

**Include:**

- All component files (.tsx)
- All hook files (.ts)
- All route files (.tsx)
- All form files (.tsx)
- All guard files (.tsx)
- Associated test files (.test.tsx, .test.ts) if they exist
- Skip API files that are already in nested structure

**Output Format**: Markdown list with clear source → target mappings

### Step 3: File Movement Commands

Provide exact terminal commands for each move operation:

```bash
mkdir -p /path/to/new/directory
mv /path/to/source/file /path/to/destination/
# ... additional commands for index.ts creation
```

**Output Format**: Complete bash script with all necessary commands

### Step 4: Import/Export Verification

List all files that may need import path updates after restructuring, grouped by feature areas. Specifically verify:

- **API folders**: Ensure each API hook directory has an `index.ts` file that properly exports using `export * from "./FileName"` pattern
- **Feature-level imports**: Check that the main feature `index.ts` file imports from the correct nested paths
- **Cross-feature imports**: Verify any imports from other features still work with updated paths

**Output Format**: Markdown list grouped by feature areas

### Step 5: Documentation Updates Required

List all documentation files that need updates:

- `.cursor/rules/shared.mdc` - Update project structure section
- `.ai/` folder documentation files that reference the old structure
- All other `*.md` files in the project that mention directory structures

**Output Format**: Markdown list of all files requiring updates

### Step 6: Execute File Movement Commands

Execute all the file movement commands from Step 3 in sequence. Run each command individually and verify successful execution before proceeding to the next:

```bash
# Execute the mkdir commands first to create all necessary directories
# Then execute all mv commands to move files to their new locations
# Finally create all index.ts files for the new subdirectories with content: export * from "./FileName";
```

### Step 7: Update Feature-Level Index Files

After completing the file movements and creating new index.ts files in the subdirectories, update the main feature-level index.ts file to export from the new nested structure:

**Important:** The feature-level index.ts file serves as the public API for the feature and should export all components, hooks, routes, and other public interfaces. Update the import paths to reference the new nested structure.

Example updated feature index.ts:

```typescript
// error handling
export * from './api/{{feature}}.errors';

// schemas and types
export * from './api/{{feature}}.schemas';

// mutation hooks (API layer already nested)
export * from './api/useExampleHook';

// component exports (updated to nested structure)
export * from './components/common/ExampleComponent';
export * from './components/forms/ExampleForm';
export * from './components/layouts/ExampleLayout';

// route exports (updated to nested structure)
export * from './routes/ExamplePage';
```

### Step 9: Verification Commands

After completing the file movements, run these commands to verify the restructuring was successful:

```bash
npm run lint:fix
npm run build
npm run test
```

### Step 10: Update Documentation

Execute the documentation updates identified in Step 5. Update all listed files to reflect the new nested directory structure:

- Update `.cursor/rules/shared.mdc` - Modify the project structure section to document the consistent nested structure
- Update `.ai/` folder documentation files that reference the old flat structure
- Update all other `*.md` files in the project that mention directory structures

After updating documentation, run a final verification:

```bash
npm run lint:fix
npm run build
```

## Validation Checklist

Before finalizing, ensure:

- [ ] All `{{feature}}` directory files are properly mapped in restructuring plan
- [ ] ASCII tree accurately represents current directory structure
- [ ] All terminal commands are valid and executable
- [ ] Index.ts files follow correct export pattern: `export * from "./FileName";`
- [ ] API folder index.ts files properly export using `export * from "./FileName"` pattern
- [ ] Feature-level index.ts files are updated to reference new nested structure
- [ ] Documentation files requiring updates are comprehensively listed
- [ ] Import/export verification covers all affected files
- [ ] Code matches existing project patterns exactly

## Example References

Study existing implementations in the codebase for patterns:

- **Nested API Structure**: `src/features/*/api/` - Browse existing API directory structures
- **Feature Organization**: `src/features/` - Review existing feature module organization
- **Index Files**: Any existing `index.ts` files in feature directories

## Notes

### Input Parameter

- `{{feature}}`: The name of the feature to restructure (e.g., "auth", "keys", "projects")

### Additional Guidelines

- Always verify directory existence before creating restructuring plans
- Ensure all file paths use absolute paths when executing commands
- Test commands in a safe environment before full execution
- Backup critical files before making structural changes
