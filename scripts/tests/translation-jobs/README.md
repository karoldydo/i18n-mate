# Translation Jobs API Tests

Tests for LLM translation job management endpoints corresponding to `src/features/translation-jobs/api/` hooks.

## Overview

These scripts test translation job lifecycle including creation via Edge Function, listing with pagination, checking for active jobs, viewing item-level details, and cancellation.

## Test Scripts

| Script                           | Hook Tested               | Description                                                                                                                |
| -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `test-create-translation-job.sh` | `useCreateTranslationJob` | Creates LLM translation job via `/functions/v1/translate` Edge Function; returns 202 Accepted and processes asynchronously |
| `test-list-translation-jobs.sh`  | `useTranslationJobs`      | Lists translation job history for project with pagination                                                                  |
| `test-get-active-job.sh`         | `useActiveTranslationJob` | Checks for active (pending/running) translation job; optimized for polling                                                 |
| `test-list-job-items.sh`         | `useTranslationJobItems`  | Gets detailed item-level status for individual keys within a job                                                           |
| `test-cancel-job.sh`             | `useCancelTranslationJob` | Cancels running translation job (only pending/running jobs can be cancelled)                                               |

## Running Tests

### Individual Tests

```bash
# Create translation job (outputs JOB_ID)
./test-create-translation-job.sh <PROJECT_ID> <TARGET_LOCALE> [MODE] [KEY_IDS]
# MODE: 'all' (default) or 'selected'
# KEY_IDS: Required if MODE is 'selected', comma-separated

# List translation jobs
./test-list-translation-jobs.sh <PROJECT_ID>

# Check for active job
./test-get-active-job.sh <PROJECT_ID>

# List job items (detailed status)
./test-list-job-items.sh <JOB_ID>

# Cancel job
./test-cancel-job.sh <PROJECT_ID> <JOB_ID>
```

### All Tests in Sequence

```bash
./run-all.sh <PROJECT_ID> <TARGET_LOCALE>
```

The `run-all.sh` script executes tests in the proper order:

1. Checks for active translation job (before creating new one)
2. Creates a new translation job
3. Lists translation job history
4. Lists job items with detailed status
5. Checks for active job again (should show new job)

Note: Cancel test is separate to avoid disrupting the job processing.

## Requirements

- Existing project with keys and multiple locales (use `../projects/test-create-project.sh`, `../locales/test-create-locale.sh`, and `../keys/test-create-key.sh` first)
- Target locale cannot be the project's default locale
- No other active job for the same project (409 conflict)
- Supabase instance running with Edge Functions deployed
- `.env` file with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` configured
- Authenticated user with confirmed email
- `curl` and `python3` installed

## Notes

- Jobs are created with 202 Accepted and process asynchronously
- Modes: `all` (translate all keys), `selected` (specific key_ids), `single` (one key)
- Only one active job allowed per project at a time
- Recommended polling interval: 2 seconds for job status
- Job items track individual key translation status and error codes
- Jobs can be cancelled only while pending or running
- Target locale must exist in project and cannot be default locale
- LLM parameters: `temperature` (default 0.3), `max_tokens` (default 1000)
- Edge Function integrates with OpenRouter.ai for translations
