# Projects API Tests

Tests for project management endpoints corresponding to `src/features/projects/api/` hooks.

## Overview

These scripts test the complete CRUD lifecycle for projects including creation with default locale, listing, retrieval, updates, and deletion.

## Test Scripts

| Script                   | Hook Tested        | Description                                                                            |
| ------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `test-create-project.sh` | `useCreateProject` | Creates a new project with default locale via `create_project_with_default_locale` RPC |
| `test-list-projects.sh`  | `useProjects`      | Lists all user projects with locale and key counts via `list_projects_with_counts` RPC |
| `test-get-project.sh`    | `useProject`       | Retrieves single project details by ID                                                 |
| `test-update-project.sh` | `useUpdateProject` | Updates project name and description (prefix and default_locale are immutable)         |
| `test-delete-project.sh` | `useDeleteProject` | Deletes project and cascades to all related data                                       |

## Running Tests

### Individual Tests

```bash
# Create project (outputs PROJECT_ID for other tests)
./test-create-project.sh

# List all projects
./test-list-projects.sh

# Get project details (requires PROJECT_ID)
./test-get-project.sh <PROJECT_ID>

# Update project (requires PROJECT_ID)
./test-update-project.sh <PROJECT_ID>

# Delete project (requires PROJECT_ID)
./test-delete-project.sh <PROJECT_ID>
```

### All Tests in Sequence

```bash
./run-all.sh
```

The `run-all.sh` script executes all tests in the proper order:

1. Creates a test project
2. Lists all projects
3. Gets the created project details
4. Updates the project
5. Deletes the project

## Requirements

- Supabase instance running (local or remote)
- `.env` file with required variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `TEST_EMAIL`
  - `TEST_PASSWORD`
- Authenticated user with confirmed email
- `curl` and `python3` installed

## Notes

- Project prefix and default_locale are immutable after creation
- Deleting a project cascades to all related data (locales, keys, translations, jobs)
- All scripts include authentication step
- Scripts export PROJECT_ID for use in dependent tests
