

## Plan: Backfill `email_counted` for Legacy Zendesk Tickets (ZD2 Only)

### Clarified Requirements

Based on your answers:

1. **Exclude solved tickets** (only scan `new`, `open`, `pending` status tickets)
2. **Process in batches** (~5 pages per edge function invocation to avoid timeout)
3. **ZD2 only** -- skip ZD1 entirely in the backfill logic
4. **SuperAdmin-only UI** in the Admin page
5. **Auto-chain** -- after each batch completes, the UI automatically triggers the next batch until done

### Implementation Steps

**Step 1: Database migration**

Create two tables:
- `zd_backfill_jobs` -- tracks job state, cursor, counts
- `zd_backfill_job_items` -- per-ticket audit trail

RLS: SuperAdmin-only access via `is_super_admin()`.

```sql
create table if not exists zd_backfill_jobs (
  id uuid primary key default gen_random_uuid(),
  zendesk_instance_name text not null,
  job_type text not null,
  status text not null default 'Running',
  started_at timestamptz default now(),
  finished_at timestamptz,
  cursor_unix bigint,
  processed int default 0,
  updated int default 0,
  skipped int default 0,
  errors int default 0,
  last_ticket_id bigint,
  error text,
  dry_run boolean default false
);

create table if not exists zd_backfill_job_items (
  id bigserial primary key,
  job_id uuid not null references zd_backfill_jobs(id) on delete cascade,
  ticket_id bigint not null,
  action text not null,
  message text,
  created_at timestamptz default now(),
  unique (job_id, ticket_id)
);
```

Enable RLS with SuperAdmin-only policies.

**Step 2: Edge function `zd-backfill-email-counted`**

- POST handler accepting: `zendesk_instance_name` (hardcoded to ZD2), `mode`, `start_time_unix`, `max_pages` (default 5), `per_page` (default 100), `dry_run`, optional `job_id` + `resume`
- Uses Zendesk Incremental Export Cursor API: `GET /api/v2/incremental/tickets/cursor.json?start_time={unix}&per_page=100`
- For `email_only` mode: if `via.channel === "email"` and tags missing `email_counted`, PUT with `additional_tags: ["email_counted"]`
- For `messaging_convert_optional` mode: if messaging + 2+ public agent replies, add `email_converted` + `email_counted`
- Skips tickets with `status === "solved"` or `status === "closed"`
- Rate limit: honor 429 `Retry-After`, exponential backoff on 5xx
- Checkpoints cursor + counts after each page
- Returns JSON summary with `job_id`, `status`, `processed`, `updated`, `skipped`, `errors`, `has_more`
- Uses `ZENDESK_API_TOKEN_ZD2` + `ZENDESK_ADMIN_EMAIL` (already configured)

**Step 3: Admin UI component `BackfillManager.tsx`**

SuperAdmin-only section at the bottom of `Admin.tsx`:
- Instance display: "ZD2 (customerserviceadvocateshelp)" -- no dropdown needed since ZD1 is excluded
- Start date picker (converted to unix)
- Mode selector: `email_only` / `messaging_convert_optional`
- Dry run toggle
- Run button -- starts a new job
- **Auto-chain**: after each batch returns with `has_more: true`, automatically calls the function again with `resume: true` after a 2-second delay
- Progress display: processed / updated / skipped / errors counts, live-updating
- Stop button to cancel auto-chaining
- Jobs history table from `zd_backfill_jobs`

**Step 4: Register in `supabase/config.toml`**

```toml
[functions.zd-backfill-email-counted]
verify_jwt = false
```

### Files Created/Modified

| File | Action |
|---|---|
| Migration SQL | Create `zd_backfill_jobs` + `zd_backfill_job_items` with RLS |
| `supabase/functions/zd-backfill-email-counted/index.ts` | New edge function |
| `src/components/admin/BackfillManager.tsx` | New UI component |
| `src/pages/Admin.tsx` | Import + render BackfillManager for SuperAdmins |

### What This Does NOT Touch

- No ZD1 interaction
- No webhook logic
- No ticket_logs or scorecard changes
- No FRT/AHT computation
- No Zendesk trigger creation

