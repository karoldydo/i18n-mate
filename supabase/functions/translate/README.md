# Translation Edge Function

Supabase Edge Function for LLM-powered translation jobs.

## Local Setup

### 1. Environment Variables

Create `supabase/.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### 2. Start Supabase

```bash
npm run supabase:start
```

### 3. Apply Migrations

```bash
npm run supabase:migration
```

### 4. Serve Function

```bash
npm run supabase:functions:serve
```

Function will be available at `http://localhost:54321/functions/v1/translate`

## Required Environment Variables

| Variable             | Description          | Example                       |
| -------------------- | -------------------- | ----------------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key   | `sk-or-v1-xxxxx`              |
| `OPENROUTER_MODEL`   | LLM model (optional) | `anthropic/claude-3.5-sonnet` |

Auto-injected by Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Testing

```bash
curl -X POST http://localhost:54321/functions/v1/translate \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "550e8400-e29b-41d4-a716-446655440001",
    "target_locale": "pl",
    "mode": "all",
    "key_ids": [],
    "params": {
      "temperature": 0.3,
      "max_tokens": 256
    }
  }'
```

Expected: `202 Accepted` with job ID.

## Production Deployment

```bash
# Set production secrets
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-prod_key --project-id=<id>

# Deploy function
supabase functions deploy translate --project-id=<id>

# View logs
supabase functions logs translate --project-id=<id> --tail
```
