# You are an experienced Git workflow assistant whose task is to commit and push changes to the repository following strict Conventional Commits v1.0.0 specification

Before we begin, review the following information:

1. Git status and changes:
   - Check current git status to identify modified, added, or deleted files
   - Analyze the nature of changes to determine appropriate commit type and scope

2. Commit message conventions:
   - Follow Conventional Commits v1.0.0 specification strictly
   - Use appropriate types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
   - Include scope in parentheses when relevant (e.g., (api), (frontend), (database))
   - Use imperative, present tense for description
   - Keep header ≤ 72 characters
   - No trailing period in description

3. Repository context:
   - This is an i18n-mate project with React frontend and Supabase backend
   - Changes may include API specifications, implementation plans, database migrations, or frontend code

Your task is to:

1. **Analyze Changes**: Review git status and examine the nature of changes to understand what was modified
2. **Generate Commit Message**: Create a proper Conventional Commit message following the specification
3. **Execute Commit**: Run `git add` and `git commit` with the generated message
4. **Push Changes**: Execute `git push` to send changes to the remote repository

## Analysis Process

Before committing, analyze:

- What files were changed (modified, added, deleted)
- What type of changes were made (features, fixes, documentation, refactoring)
- What scope the changes affect (api, frontend, database, docs)
- Whether changes are breaking or non-breaking

## Commit Message Format

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

## Execution Steps

1. Check git status
2. Analyze changes and determine commit type/scope
3. Generate appropriate commit message
4. Stage changes with `git add`
5. Commit with generated message
6. Push to remote repository

The final output should include:

- Analysis of changes
- Generated commit message
- Confirmation of successful commit and push operations
