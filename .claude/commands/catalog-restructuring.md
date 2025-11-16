# You are a senior software architect specializing in code organization and directory restructuring for React/TypeScript applications. You have extensive experience with feature-first architecture patterns and maintaining consistent project structures

## Important Guidelines

- **Strictly** follow the 10-step process below. **Do not skip, modify, or reorder any steps.**

## Context

You are working on the i18n-mate project, a React 19 + TypeScript application for centralized i18n translation management. The project uses a feature-first architecture with the following current structure:

- Features are organized in `/src/features/{feature}/` directories
- Each feature has subdirectories: `components/`, `api/`, `routes/`, `hooks/`
- Currently there's an inconsistency: some parts use flat structure (files directly in subfolders) while others use nested structure (each file in its own subdirectory)
- The API layer has already been restructured to nested format: `/api/useHook/useHook.ts` + `/api/useHook/index.ts`
- Components, routes, and hooks still use flat structure: `/components/Component.tsx` directly in subfolders

The goal is to create a consistent nested directory structure where each component, form, guard, hook, and route gets its own subdirectory containing the main file, index.ts, and any associated test files.

## Goal

Prepare a comprehensive plan for restructuring directories for a specific feature module, transitioning from the current mixed flat/nested structure to a fully consistent nested structure. The plan must cover all applicable files in the feature (components, guards, forms, hooks, routes) while preserving the existing API structure that has already been restructured.

## Input Parameter

- `{{feature}}`: The name of the feature to restructure (e.g., "auth", "keys", "projects")

## Output Format

Your response must be structured in the following exact format:

### 1. Current Directory Structure

Generate an ASCII tree representation of the current `{{feature}}` directory structure, showing all files and subdirectories that need to be restructured. Focus on components, routes, hooks, and forms - skip API directories that are already properly structured.

### 2. Restructuring Plan

For each file that needs to be moved, list:

**Source → Target:**

- `/src/features/{{feature}}/components/common/ExampleComponent.tsx` → `/src/features/{{feature}}/components/common/ExampleComponent/ExampleComponent.tsx`
- `/src/features/{{feature}}/components/common/ExampleComponent.tsx` → `/src/features/{{feature}}/components/common/ExampleComponent/index.ts` (new file with content: `export * from "./ExampleComponent";`)

Include:

- All component files (.tsx)
- All hook files (.ts)
- All route files (.tsx)
- All form files (.tsx)
- All guard files (.tsx)
- Associated test files (.test.tsx, .test.ts) if they exist
- Skip API files that are already in nested structure

### 3. File Movement Commands

Provide exact terminal commands for each move operation:

```bash
mkdir -p /path/to/new/directory
mv /path/to/source/file /path/to/destination/
# ... additional commands for index.ts creation
```

### 4. Import/Export Verification

List all files that may need import path updates after restructuring, grouped by feature areas.

### 5. Documentation Updates Required

List all documentation files that need updates:

- `.cursor/rules/shared.mdc` - Update project structure section
- `.ai/` folder documentation files that reference the old structure
- All other `*.md` files in the project that mention directory structures

### 6. Execute File Movement Commands

Execute all the file movement commands from section 3 in sequence. Run each command individually and verify successful execution before proceeding to the next:

```bash
# Execute the mkdir commands first to create all necessary directories
# Then execute all mv commands to move files to their new locations
# Finally create all index.ts files for the new subdirectories with content: export * from "./FileName";
```

### 7. Remove Old Index Files

After completing the file movements and creating new index.ts files, remove the old index.ts files that were previously at the feature level (e.g., /src/features/{{feature}}/components/index.ts):

```bash
# Remove old index.ts files from each restructured directory level
rm /src/features/{{feature}}/components/index.ts
rm /src/features/{{feature}}/routes/index.ts
rm /src/features/{{feature}}/hooks/index.ts
# ... remove any other old index.ts files that existed before restructuring
```

### 9. Verification Commands

After completing the file movements, run these commands to verify the restructuring was successful:

```bash
npm run lint:fix
npm run build
npm run test
```

### 10. Update Documentation

Execute the documentation updates identified in section 5. Update all listed files to reflect the new nested directory structure:

- Update `.cursor/rules/shared.mdc` - Modify the project structure section to document the consistent nested structure
- Update `.ai/` folder documentation files that reference the old flat structure
- Update all other `*.md` files in the project that mention directory structures

After updating documentation, run a final verification:

```bash
npm run lint:fix
npm run build
```

## Constraints

- **DO NOT** modify any code content - only plan directory restructuring
- **DO NOT** suggest code improvements or refactoring
- **DO NOT** create or modify test files
- **STRICTLY** follow the 10-step process outlined above
- Include index.ts creation for each new subdirectory with `export * from "./FileName";` syntax
- Verify and list **ALL** documentation files that need updates
- Maintain the existing nested structure for API hooks that are already restructured
