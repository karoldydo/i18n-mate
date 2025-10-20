# Telemetry API Tests

Tests for telemetry event retrieval endpoint corresponding to `src/features/telemetry/api/` hooks.

## Overview

This script tests the read-only telemetry endpoint that provides access to auto-tracked events. Events are created automatically by database triggers, RPC functions, and Edge Functions.

## Test Scripts

| Script                          | Hook Tested          | Description                                                                              |
| ------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `test-list-telemetry-events.sh` | `useTelemetryEvents` | Lists telemetry events for project (owner or service_role only); events are auto-tracked |

## Running Tests

### Individual Test

```bash
# List telemetry events (requires PROJECT_ID)
./test-list-telemetry-events.sh <PROJECT_ID>
```

### All Tests

```bash
./run-all.sh <PROJECT_ID>
```

The `run-all.sh` script executes the telemetry test:

1. Lists recent telemetry events for the project
2. Displays event counts by type

## Requirements

- Existing project with activity (use other test scripts to generate events)
- Supabase instance running (local or remote)
- `.env` file with required variables
- Authenticated user with confirmed email (must be project owner)
- `curl` and `python3` installed

## Notes

- **Read-only**: No manual POST endpoint for telemetry - events are created automatically
- **Auto-tracked events**:
  - `project_created` - Created by `create_project_with_default_locale` RPC
  - `language_added` - Created by database trigger on `project_locales` insert
  - `key_created` - Created by database trigger on `keys` insert
  - `translation_completed` - Created by translation job Edge Function
- **Access control**: Only project owner or service_role can view events
- **Partitioning**: Table is partitioned by month for performance
- **Pagination**: Supports filtering and pagination via query parameters
- **Event structure**: Contains `event_type`, `project_id`, `user_id`, `metadata`, `created_at`
- **Use cases**: Activity tracking, audit logs, analytics
