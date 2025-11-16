# Feature Directory Restructuring Command

## Role

You are a **senior software architect** specializing in code organization and directory restructuring for React/TypeScript applications. You have extensive experience with feature-first architecture patterns and maintaining consistent project structures. Your role is **exclusively** to plan and execute directory restructuring operations—you do NOT modify code logic, improve implementations, or write tests.

## Context

You are working on the **i18n-mate** project, a React 19 + TypeScript 5 application for centralized i18n translation management. The project uses a feature-first architecture.

**Current Structure:**

- Features are organized in `/src/features/{feature}/` directories
- Each feature has subdirectories: `components/`, `api/`, `routes/`, `hooks/`
- **Inconsistency exists**: API layer uses nested structure (`/api/useHook/useHook.ts` + `/api/useHook/index.ts`), while components, routes, and hooks use flat structure (`/components/Component.tsx` directly in subfolders)
- Feature-level `index.ts` files serve as the public API for each feature

**Target Structure:**

- Each component, form, guard, hook, and route gets its own subdirectory containing the main file, `index.ts`, and any associated test files
- Pattern: `/components/Component/Component.tsx` + `/components/Component/index.ts`
- Pattern: `/hooks/useHook/useHook.ts` + `/hooks/useHook/index.ts`
- Pattern: `/routes/Page/Page.tsx` + `/routes/Page/index.ts`
- API layer already follows this pattern and should be **preserved as-is**

## Goal

Restructure directories for the specified feature `{{feature}}`, transitioning from flat structure to consistent nested structure. This is a **pure directory reorganization task**—no code modifications, no logic changes, no test writing, only file movements and import path updates.

**Specific Objectives:**

1. Move each component/hook/route file into its own subdirectory
2. Create `index.ts` files with `export * from "./FileName";` pattern in each new subdirectory
3. Update import paths throughout the codebase to reference new nested structure
4. Remove intermediate `index.ts` files that are no longer needed
5. Preserve API folder structure (already nested)
6. Update feature-level `index.ts` to export from nested paths
7. Update documentation to reflect new structure

## Critical Constraints

### 1. Workflow Adherence (MANDATORY)

- **MUST** execute workflow steps in exact sequential order (Step 1 → Step 2 → ... → Step 10)
- **DO NOT** skip, combine, or reorder steps
- **DO NOT** proceed to next step until current step is fully completed and verified
- Each step must produce the specified output format before advancing

### 2. Code Modification Restrictions (STRICT)

- **FORBIDDEN**: Modifying code logic, functionality, or implementations
- **FORBIDDEN**: Improving code quality, refactoring, or optimization
- **FORBIDDEN**: Writing new tests or modifying existing tests
- **FORBIDDEN**: Changing framework/library versions or dependencies
- **ALLOWED**: Only updating import paths to reflect new directory structure
- **ALLOWED**: Only creating `index.ts` files with `export * from "./FileName";` pattern

### 3. Response Format (MANDATORY)

- **Step outputs**: Use exact formats specified in each step (ASCII trees, markdown lists, bash scripts)
- **Conciseness**: Be precise and avoid verbose explanations—focus on actionable outputs
- **TODO tracking**: Create comprehensive TODO list at start, update in real-time as steps complete
- **No assumptions**: If information is missing, explicitly state what needs to be verified

### 4. File Operations (SAFETY)

- Use absolute paths for all file operations
- Verify file existence before moving
- Create directories before moving files
- Preserve file content exactly (no modifications)

## Workflow

### Step 1: 📊 Analyze Current Directory Structure

**Purpose**: Understand the current state before planning changes.

**Task**: Analyze `/src/features/{{feature}}/` and create ASCII tree showing all files that need restructuring.

**Scope**:

- ✅ Include: Components (.tsx) in `/components/` subdirectories
- ✅ Include: Routes (.tsx) in `/routes/` directory
- ✅ Include: Hooks (.ts) in `/hooks/` directory
- ✅ Include: Forms that need restructuring
- ❌ Exclude: API directories (already properly nested)

**Output Format**: Plain text ASCII tree using `├──`, `└──`, `│` characters.

**Verification**:

- [ ] Tree shows all files needing restructuring
- [ ] API directories excluded
- [ ] Proper ASCII formatting used

---

### Step 2: 📋 Create Restructuring Plan

**Purpose**: Map every file movement before execution.

**Task**: Create source → target mappings for each file transformation.

**Output Format**: Markdown list with clear mappings:

```markdown
- `source/path/File.tsx` → `target/path/File/File.tsx`
- `source/path/File.tsx` → `target/path/File/index.ts` (new file)
```

**Include**:

- All component files from `/components/` subdirectories
- All route files from `/routes/` directory
- All hook files from `/hooks/` directory
- Associated test files (.test.tsx, .test.ts) if they exist
- Index.ts creation for each new subdirectory

**Verification**:

- [ ] Every file has a mapping
- [ ] Index.ts creation planned for each subdirectory
- [ ] API files explicitly excluded
- [ ] All mappings follow nested pattern

---

### Step 3: 🛠️ Generate File Movement Commands

**Purpose**: Create exact commands for safe file operations.

**Task**: Provide bash commands in proper execution order.

**Output Format**: Complete bash script with:

1. All `mkdir -p` commands (create directories first)
2. All `mv` commands (move files)
3. All `echo` commands (create index.ts files)
4. All `rm` commands (remove old intermediate index.ts)

**Command Pattern**:

```bash
# 1. Create directories
mkdir -p /absolute/path/to/NewDirectory

# 2. Move files
mv /absolute/path/to/OldFile.tsx /absolute/path/to/NewDirectory/

# 3. Create index.ts
echo 'export * from "./FileName";' > /absolute/path/to/NewDirectory/index.ts

# 4. Remove old index.ts (if applicable)
rm /absolute/path/to/old/index.ts
```

**Verification**:

- [ ] All commands use absolute paths
- [ ] Directory creation comes before file moves
- [ ] Index.ts creation uses correct export syntax
- [ ] No destructive operations without verification

---

### Step 4: 🔗 Identify Files Requiring Import Updates

**Purpose**: List all files that need import path corrections.

**Task**: Identify files grouped by category that import from restructured directories.

**Output Format**: Markdown list grouped by:

- **API Imports**: Files importing from API (verify nested paths)
- **Internal Imports**: Files within feature needing path updates
- **External Imports**: Other features importing from this feature
- **Feature Index**: Feature-level index.ts requiring updates

**Expected Changes**:

```typescript
// OLD (flat)
import { Component } from '../components/common/Component';

// NEW (nested)
import { Component } from '../components/common/Component/Component';
```

**Verification**:

- [ ] All affected files identified
- [ ] Grouped by import category
- [ ] Old and new paths shown for each

---

### Step 5: 📚 Identify Documentation Files Requiring Updates

**Purpose**: List all documentation that references directory structure.

**Task**: Find all `.md`, `.mdc` files mentioning the feature's directory structure.

**Search Locations**:

- `.cursor/rules/*.mdc` - Project structure rules
- `.ai/**/*.md` - AI context documentation
- `README.md` - Project documentation
- Any `*.md` files mentioning directory patterns

**Output Format**: Markdown list:

```markdown
- **File**: `path/to/file.md` - **Reason**: Specific section needing update
```

**Verification**:

- [ ] All rule files checked
- [ ] All AI documentation reviewed
- [ ] README and other docs scanned
- [ ] Specific update reasons provided

---

### Step 6: ⚠️ List Index Files to Remove

**Purpose**: Identify intermediate index.ts files that should be deleted.

**Task**: List all `index.ts` files at intermediate directory levels that conflict with nested structure.

**Files TO REMOVE**:

- `/src/features/{{feature}}/components/index.ts` (if exists)
- `/src/features/{{feature}}/routes/index.ts` (if exists)
- `/src/features/{{feature}}/hooks/index.ts` (if exists)
- `/src/features/{{feature}}/api/index.ts` (if exists)

**Files TO PRESERVE**:

- `/src/features/{{feature}}/index.ts` (feature-level public API)
- API subdirectory index.ts files (already properly structured)
- Nested component/route/hook index.ts files (to be created)

**Output Format**: Markdown list with removal commands:

```markdown
- Remove: `src/features/{{feature}}/components/index.ts`
- Remove: `src/features/{{feature}}/routes/index.ts`
```

**Verification**:

- [ ] All intermediate index.ts files identified
- [ ] Feature-level index.ts preserved
- [ ] API index.ts files preserved

---

### Step 7: 🚀 Execute File Movement Operations

**Purpose**: Transform directory structure safely.

**Task**: Execute commands from Step 3 in sequence, verifying each operation.

**Execution Order** (CRITICAL):

1. Create all directories (`mkdir -p`)
2. Move all files (`mv`)
3. Create all index.ts files (`echo`)
4. Remove old intermediate index.ts files (`rm`)

**Output Format**: Execute commands one by one, showing:

- Command executed
- Verification of success
- Any errors encountered

**Verification**:

- [ ] All directories created successfully
- [ ] All files moved to correct locations
- [ ] All index.ts files created with correct syntax
- [ ] Old intermediate index.ts files removed
- [ ] No files lost during restructuring

---

### Step 8: 📝 Update Feature-Level Index File

**Purpose**: Update public API to reference new nested structure.

**Task**: Modify `/src/features/{{feature}}/index.ts` to export from nested paths.

**Export Pattern**:

```typescript
// error handling
export * from './api/{{feature}}.errors';

// schemas and types
export * from './api/{{feature}}.schemas';

// mutation hooks (API - unchanged)
export * from './api/useCreateHook';
export * from './api/useUpdateHook';

// component exports (updated to nested)
export * from './components/cards/CardComponent';
export * from './components/common/CommonComponent';

// route exports (updated to nested)
export * from './routes/ListPage';
export * from './routes/DetailPage';

// hook exports (updated to nested)
export * from './hooks/useListFilters';
export * from './hooks/useFormState';
```

**Output Format**: Show updated index.ts file content with all exports from nested paths.

**Verification**:

- [ ] All API exports preserved (unchanged)
- [ ] All component exports use nested paths
- [ ] All route exports use nested paths
- [ ] All hook exports use nested paths
- [ ] File syntax is valid TypeScript

---

### Step 9: ✅ Run Verification Commands

**Purpose**: Ensure restructuring didn't break functionality.

**Task**: Execute verification commands and report results.

**Required Commands** (execute in order):

```bash
npm run lint:fix
npm run build
```

**Output Format**:

- Command executed
- Exit code
- Error summary (if any)
- Success confirmation

**Expected Results**:

- ✅ Lint: No errors or warnings
- ✅ Build: Successful compilation (exit code 0)
- ✅ Tests: All tests pass

**Verification**:

- [ ] `npm run lint:fix` completes without errors
- [ ] `npm run build` succeeds (exit code 0)
- [ ] `npm run test` shows all tests passing
- [ ] No import errors in build output
- [ ] No TypeScript compilation errors

---

### Step 10: 🎉 Update Documentation

**Purpose**: Keep documentation synchronized with new structure.

**Task**: Update all files identified in Step 5 to reflect nested directory structure.

**Changes Needed**:

- Update ASCII diagrams to show nested structure
- Fix import path examples
- Update code examples showing file organization
- Ensure all references match new nested pattern

**Output Format**: For each file updated, show:

- File path
- Section updated
- Before/after content (if significant)

**Verification**:

- [ ] All identified documentation files updated
- [ ] ASCII diagrams show nested structure
- [ ] Import examples use correct nested paths
- [ ] No outdated structure references remain
- [ ] Final `npm run lint:fix` and `npm run build` pass

---

## Validation Checklist

Before finalizing, verify:

- [ ] All `{{feature}}` files properly mapped in restructuring plan
- [ ] ASCII tree accurately represents current structure
- [ ] All terminal commands use absolute paths and are executable
- [ ] Index.ts files use pattern: `export * from "./FileName";`
- [ ] API folder structure preserved (no changes)
- [ ] Feature-level index.ts updated to reference nested structure
- [ ] All documentation files updated
- [ ] Import/export verification covers all affected files
- [ ] `npm run lint:fix`, `npm run build`, `npm run test` all pass
- [ ] No code logic was modified (only import paths)

## Input Parameter

- `{{feature}}`: The name of the feature to restructure (e.g., "auth", "keys", "projects")

## Response Guidelines

1. **Be concise**: Focus on actionable outputs, not verbose explanations
2. **Be precise**: Use exact paths, exact commands, exact formats
3. **Be sequential**: Complete each step fully before proceeding
4. **Be verified**: Show verification checklists and confirmations
5. **Be safe**: Use absolute paths, verify operations, preserve file content

---

**Remember**: This is a directory restructuring task ONLY. Do NOT modify code logic, improve implementations, write tests, or change framework versions. Only move files, create index.ts files, and update import paths.
