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
   - **MUST** follow the workflow steps in the exact order specified (Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7 → Step 8 → Step 9 → Step 10)
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

3. **Mandatory TODO List Management**:
   - **MUST** create a comprehensive TODO list at the beginning of the conversation that fully mirrors all workflow steps and planned activities as part of the model's thinking process
   - **MUST** track progress through the TODO list during the conversation, marking tasks as completed only after successful execution
   - **MUST** update TODO status in real-time during the conversation as each step is completed
   - **MUST NOT** proceed to the next step until the current step's TODO item is marked as completed in the conversation
   - **MUST** include all 10 workflow steps as separate TODO items with clear descriptions in the conversation flow
   - **MUST** add additional TODO items for any preparatory or cleanup activities discovered during analysis as part of the conversation

## Workflow

### Step 1: 📊 Analyze Current Directory Structure

**🔍 FOUNDATION: Understand what needs to be restructured before making changes!**

Analyze the current `{{feature}}` directory structure and create an ASCII tree representation showing all files and subdirectories that need to be restructured. Focus on components, routes, hooks, and forms - skip API directories that are already properly structured.

**🎯 What to analyze:**

- Component files (.tsx) in `/components/` subdirectories
- Route files (.tsx) in `/routes/` directory
- Hook files (.ts) in `/hooks/` directory
- Form components that need restructuring
- Skip API directories (already properly nested)

**📋 Expected structure to find:**

```markdown
src/features/{{feature}}/
├── components/
│ ├── cards/Component.tsx ← These need restructuring
│ ├── dialogs/Component.tsx ← These need restructuring
│ └── common/Component.tsx ← These need restructuring
├── routes/
│ ├── Page.tsx ← These need restructuring
│ └── AnotherPage.tsx ← These need restructuring
├── hooks/
│ ├── useHook.ts ← These need restructuring
│ └── useAnotherHook.ts ← These need restructuring
└── api/ ← SKIP - already properly structured
```

**📄 Output Format:**
Plain text ASCII tree with indentation (use `├──`, `└──`, `│` characters)

**🔍 VERIFICATION CHECKLIST:**

- [ ] ASCII tree shows all files that need restructuring
- [ ] API directories are excluded (already nested)
- [ ] Tree uses proper ASCII characters (`├──`, `└──`, `│`)
- [ ] All component/route/hook files are captured

### Step 2: 📋 Create Restructuring Plan

**🗺️ PLANNING: Map every file movement before executing anything!**

For each file that needs to be moved, create a comprehensive plan showing the transformation from flat to nested structure.

**📂 Source → Target mappings:**

```markdown
FROM (flat structure):
├── components/common/ExampleComponent.tsx
├── routes/ExamplePage.tsx
└── hooks/useExampleHook.ts

TO (nested structure):
├── components/common/ExampleComponent/ExampleComponent.tsx
├── components/common/ExampleComponent/index.ts
├── routes/ExamplePage/ExamplePage.tsx
├── routes/ExamplePage/index.ts
├── hooks/useExampleHook/useExampleHook.ts
└── hooks/useExampleHook/index.ts
```

**✅ What to include:**

- All component files (.tsx) from `/components/` subdirectories
- All route files (.tsx) from `/routes/` directory
- All hook files (.ts) from `/hooks/` directory
- All form components that need individual directories
- Associated test files (.test.tsx, .test.ts) if they exist
- Index.ts creation for each new subdirectory

**❌ What to skip:**

- API files that are already in nested structure
- Files that don't need restructuring

**📄 Output Format:**
Markdown list with clear source → target mappings:

- `source/path/File.tsx` → `target/path/File/File.tsx`
- `source/path/File.tsx` → `target/path/File/index.ts` (new file)

**🔍 VERIFICATION CHECKLIST:**

- [ ] Every component file has a mapping to its own subdirectory
- [ ] Every route file has a mapping to its own subdirectory
- [ ] Every hook file has a mapping to its own subdirectory
- [ ] Index.ts creation is planned for each new subdirectory
- [ ] API files are explicitly excluded
- [ ] All mappings follow the nested directory pattern

### Step 3: 🛠️ Generate File Movement Commands

**⚡ EXECUTION: Create exact commands for safe file operations!**

Provide precise terminal commands for each move operation to transform the directory structure safely.

**📂 Command sequence:**

1. Create all new directories first (`mkdir -p`)
2. Move files to new locations (`mv`)
3. Create index.ts files in new subdirectories
4. Remove old intermediate index.ts files

**💻 Example commands:**

```bash
# 1. Create new directories
mkdir -p src/features/{{feature}}/components/common/ExampleComponent
mkdir -p src/features/{{feature}}/routes/ExamplePage
mkdir -p src/features/{{feature}}/hooks/useExampleHook

# 2. Move files to new locations
mv src/features/{{feature}}/components/common/ExampleComponent.tsx src/features/{{feature}}/components/common/ExampleComponent/
mv src/features/{{feature}}/routes/ExamplePage.tsx src/features/{{feature}}/routes/ExamplePage/
mv src/features/{{feature}}/hooks/useExampleHook.ts src/features/{{feature}}/hooks/useExampleHook/

# 3. Create index.ts files
echo 'export * from "./ExampleComponent";' > src/features/{{feature}}/components/common/ExampleComponent/index.ts
echo 'export * from "./ExamplePage";' > src/features/{{feature}}/routes/ExamplePage/index.ts
echo 'export * from "./useExampleHook";' > src/features/{{feature}}/hooks/useExampleHook/index.ts
```

**📄 Output Format:**
Complete bash script with all necessary commands in proper execution order.

**🔍 VERIFICATION CHECKLIST:**

- [ ] All `mkdir -p` commands come first
- [ ] All `mv` commands follow directory creation
- [ ] Index.ts creation commands include proper export syntax
- [ ] Commands use absolute paths for safety
- [ ] No destructive operations without backups

### Step 4: 🔗 Verify Import/Export Paths

**🔍 VALIDATION: Ensure all imports work after restructuring!**

List all files that may need import path updates after restructuring, grouped by feature areas. Import paths must be updated to reflect the new nested directory structure.

**🎯 What to verify:**

**📁 API folders:**

- Each API hook directory has `index.ts` with `export * from "./FileName"` pattern
- Direct imports from API hooks work correctly

**🏠 Feature-level imports:**

- Main feature `index.ts` imports from correct nested paths
- All component/route/hook exports are accessible

**🔄 Cross-feature imports:**

- Other features importing from this feature still work
- Absolute import paths using `@/features/{{feature}}/` are correct

**📋 Expected changes:**

```typescript
❌ OLD (flat structure):
import { Component } from '../components/common/Component';
import { useHook } from '../hooks/useHook';

✅ NEW (nested structure):
import { Component } from '../components/common/Component/Component';
import { useHook } from '../hooks/useHook/useHook';
```

**📄 Output Format:**
Markdown list grouped by feature areas:

- **API Imports**: Files needing API import updates
- **Internal Imports**: Files within the feature needing path updates
- **External Imports**: Other features needing import updates

**🔍 VERIFICATION CHECKLIST:**

- [ ] All API hook imports use correct nested paths
- [ ] Feature-level index.ts exports from nested paths
- [ ] Cross-feature imports are updated
- [ ] No broken import paths remain
- [ ] Absolute imports (`@/features/...`) work correctly

### Step 5: 📚 Identify Documentation Updates

**📖 MAINTENANCE: Keep documentation in sync with code structure!**

List all documentation files that need updates to reflect the new nested directory structure. Documentation must accurately represent the current codebase organization.

**📋 Files that typically need updates:**

**🏗️ Project Structure Docs:**

- `.cursor/rules/shared.mdc` - Update project structure section
- `.cursor/rules/*.mdc` - Any rules mentioning directory patterns

**🤖 AI Context Files:**

- `.ai/` folder documentation files that reference the old flat structure
- `.ai/ui/ui-plan.md` - UI structure documentation
- `.ai/api/api-plan.md` - API structure documentation

**📄 General Documentation:**

- `README.md` - If it mentions project structure
- All other `*.md` files in the project that mention directory structures
- Any architecture documentation

**🔍 Where to look:**

- Search for mentions of "components/", "routes/", "hooks/" patterns
- Look for ASCII diagrams showing directory structure
- Check for import path examples in documentation

**📄 Output Format:**
Markdown list of all files requiring updates:

- **File**: `path/to/file.md` - **Reason**: What needs updating
- **File**: `path/to/another.md` - **Reason**: Specific changes needed

**🔍 VERIFICATION CHECKLIST:**

- [ ] All `.cursor/rules/` files checked for structure references
- [ ] All `.ai/` documentation files reviewed
- [ ] README and other docs scanned for directory mentions
- [ ] No outdated ASCII diagrams remain
- [ ] Import path examples are current

### Step 6: ⚠️ CRITICAL - Clean Up Existing Index Files

**🚨 ATTENTION: This step is often overlooked but CRITICAL for clean structure!**

Remove any existing index.ts files at intermediate directory levels that are not part of the nested structure. This ensures a clean transition to the new consistent structure.

**❌ Files TO REMOVE (intermediate levels):**

- `/src/features/{{feature}}/components/index.ts`
- `/src/features/{{feature}}/routes/index.ts`
- `/src/features/{{feature}}/hooks/index.ts`
- `/src/features/{{feature}}/api/index.ts` (if exists)

**✅ Files TO PRESERVE:**

- Feature-level index.ts (`/src/features/{{feature}}/index.ts`) - KEEP
- API subdirectory index.ts files (already properly structured) - KEEP
- Nested component/route/hook index.ts files - KEEP

**Example - Before vs After:**

❌ **BEFORE (mixed structure):**

```markdown
src/features/{{feature}}/
├── components/
│ ├── index.ts ← REMOVE THIS
│ ├── ComponentA.tsx
│ └── ComponentB.tsx
├── routes/
│ ├── index.ts ← REMOVE THIS
│ ├── PageA.tsx
│ └── PageB.tsx
└── index.ts ← KEEP THIS
```

✅ **AFTER (clean nested structure):**

```markdown
src/features/{{feature}}/
├── components/
│ ├── ComponentA/ComponentA.tsx + index.ts
│ └── ComponentB/ComponentB.tsx + index.ts
├── routes/
│ ├── PageA/PageA.tsx + index.ts
│ └── PageB/PageB.tsx + index.ts
└── index.ts ← KEEP THIS (exports from nested paths)
```

```bash
# Remove index.ts files from intermediate directories that should not exist
find /src/features/{{feature}}/components -name "index.ts" -type f -delete
find /src/features/{{feature}}/routes -name "index.ts" -type f -delete
find /src/features/{{feature}}/hooks -name "index.ts" -type f -delete
find /src/features/{{feature}}/api -name "index.ts" -type f -delete
```

**🔍 VERIFICATION CHECKLIST:**

- [ ] No `index.ts` exists in `/components/` (only in subdirs)
- [ ] No `index.ts` exists in `/routes/` (only in subdirs)
- [ ] No `index.ts` exists in `/hooks/` (only in subdirs)
- [ ] No `index.ts` exists in `/api/` (only in subdirs)
- [ ] Feature-level `index.ts` still exists and exports from nested paths

**⚠️ WARNING:** Do not execute this step until after Step 5 is completed!

### Step 7: 🚀 Execute File Movement Commands

**⚡ ACTION: Transform the directory structure safely!**

Execute all the file movement commands from Step 3 in sequence. Run each command individually and verify successful execution before proceeding to the next.

**📋 Execution order (CRITICAL):**

1. **Create directories first** - All `mkdir -p` commands
2. **Move files** - All `mv` commands to relocate files
3. **Create index files** - Generate `index.ts` in each new subdirectory
4. **Clean up** - Remove old intermediate index.ts files (from Step 6)

**💻 Command execution pattern:**

```bash
# 1. Create all new directories first
mkdir -p src/features/{{feature}}/components/common/ExampleComponent
mkdir -p src/features/{{feature}}/routes/ExamplePage
# ... all mkdir commands

# 2. Move all files to new locations
mv src/features/{{feature}}/components/common/ExampleComponent.tsx src/features/{{feature}}/components/common/ExampleComponent/
mv src/features/{{feature}}/routes/ExamplePage.tsx src/features/{{feature}}/routes/ExamplePage/
# ... all mv commands

# 3. Create index.ts files in new subdirectories
echo 'export * from "./ExampleComponent";' > src/features/{{feature}}/components/common/ExampleComponent/index.ts
echo 'export * from "./ExamplePage";' > src/features/{{feature}}/routes/ExamplePage/index.ts
# ... all index.ts creation commands

# 4. Clean up intermediate index.ts files (Step 6)
rm src/features/{{feature}}/components/index.ts
rm src/features/{{feature}}/routes/index.ts
rm src/features/{{feature}}/hooks/index.ts
```

**🔍 VERIFICATION CHECKLIST:**

- [ ] All directories created before moving files
- [ ] All files moved to correct new locations
- [ ] Index.ts files created with proper export syntax
- [ ] Old intermediate index.ts files removed
- [ ] No files lost during restructuring
- [ ] Directory structure matches the plan from Step 2

### Step 8: 📝 Update Feature-Level Index Files

**🔧 FINALIZE: Create the public API for the restructured feature!**

After completing the file movements and creating new index.ts files in the subdirectories, update the main feature-level index.ts file to export from the new nested structure.

**🎯 Purpose:**
The feature-level index.ts file serves as the **public API** for the feature and should export all components, hooks, routes, and other public interfaces. Update the import paths to reference the new nested structure.

**📋 Organization pattern:**

```typescript
// error handling
export * from './api/{{feature}}.errors';

// schemas and types
export * from './api/{{feature}}.schemas';

// mutation hooks (API layer already nested)
export * from './api/useCreateHook';
export * from './api/useUpdateHook';
export * from './api/useDeleteHook';

// component exports (updated to nested structure)
export * from './components/cards/CardComponent';
export * from './components/common/CommonComponent';
export * from './components/dialogs/DialogComponent';
export * from './components/forms/FormComponent';
export * from './components/views/ViewComponent';

// route exports (updated to nested structure)
export * from './routes/ListPage';
export * from './routes/DetailPage';

// hook exports (updated to nested structure)
export * from './hooks/useListFilters';
export * from './hooks/useFormState';
```

**📄 Structure guidelines:**

- **Error handling** first
- **Schemas/types** second
- **API hooks** third (unchanged)
- **Components** grouped by type
- **Routes** as a group
- **Custom hooks** last

**🔍 VERIFICATION CHECKLIST:**

- [ ] All API exports preserved (unchanged)
- [ ] All new component exports use nested paths
- [ ] All new route exports use nested paths
- [ ] All new hook exports use nested paths
- [ ] File can be imported without errors
- [ ] All public APIs are accessible

### Step 9: ✅ Run Verification Commands

**🧪 TESTING: Ensure everything works after restructuring!**

After completing the file movements, run these commands to verify the restructuring was successful and no functionality was broken.

**📋 Verification sequence:**

1. **Lint check** - Ensure code style is correct
2. **Type check & build** - Verify TypeScript compilation works
3. **Test suite** - Run all tests to catch any import errors

**💻 Required commands:**

```bash
# 1. Fix any linting issues
npm run lint:fix

# 2. Build the project (includes TypeScript compilation)
npm run build

# 3. Run the full test suite
npm run test
```

**🎯 What these commands verify:**

- **Lint**: Code style and formatting consistency
- **Build**: TypeScript compilation and import resolution
- **Tests**: Unit tests pass, no broken imports or functionality

**📊 Expected results:**

- ✅ Lint: No errors or warnings
- ✅ Build: Successful compilation, no TypeScript errors
- ✅ Tests: All tests pass (look for "252 passed" or similar)

**🔍 VERIFICATION CHECKLIST:**

- [ ] `npm run lint:fix` completes without errors
- [ ] `npm run build` succeeds (check exit code 0)
- [ ] `npm run test` shows all tests passing
- [ ] No import errors in build output
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in tests

### Step 10: 🎉 Finalize Documentation Updates

**📖 COMPLETE: Documentation matches the new structure!**

Execute the documentation updates identified in Step 5. Update all listed files to reflect the new nested directory structure and ensure consistency across all documentation.

**📋 Files to update (from Step 5):**

**🏗️ Project Rules:**

- `.cursor/rules/shared.mdc` - Update project structure section to show nested pattern
- `.cursor/rules/*.mdc` - Any rules files mentioning directory structures

**🤖 AI Context Files:**

- `.ai/` folder documentation files that reference the old flat structure
- Update any ASCII diagrams, import examples, or structure descriptions

**📄 General Documentation:**

- `README.md` - If it contains project structure information
- Any other `*.md` files mentioning directory structures
- Architecture documentation

**🔄 Changes needed:**

- Update ASCII diagrams to show nested structure
- Fix import path examples in documentation
- Update any code examples showing file organization
- Ensure all references match the new nested pattern

**💻 Final verification:**

```bash
# Run final checks after documentation updates
npm run lint:fix
npm run build
```

**📊 Documentation update checklist:**

- [ ] ASCII diagrams updated to show nested structure
- [ ] Import path examples corrected
- [ ] Code examples reflect new organization
- [ ] No references to old flat structure remain
- [ ] All documentation files are consistent

**🔍 VERIFICATION CHECKLIST:**

- [ ] All identified documentation files updated
- [ ] No outdated structure references remain
- [ ] ASCII diagrams accurately represent new structure
- [ ] Import examples use correct nested paths
- [ ] Final build and lint pass
- [ ] Documentation is consistent across all files

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
