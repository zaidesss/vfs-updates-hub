

## Plan: Create a Zendesk Voice Tag Verification Edge Function

### What it does
A utility edge function that queries the Zendesk Search API for the total count of tickets with the `voice` tag created on a given date, including all statuses (new, open, pending, hold, solved, closed). This lets you cross-verify the Brain page's call counts against actual Zendesk tag data.

### Technical Details

**New file:** `supabase/functions/zd-count-voice-tags/index.ts`

- Accepts `{ zdInstance: "ZD1" | "ZD2", date: "YYYY-MM-DD" }`
- Uses existing `ZENDESK_API_TOKEN_ZD1` / `ZENDESK_API_TOKEN_ZD2` + `ZENDESK_ADMIN_EMAIL` secrets
- Runs query: `type:ticket tags:voice created:YYYY-MM-DD` (no status filter = includes solved/closed)
- Returns `{ zdInstance, date, totalVoiceTagged: number }`
- Standard CORS headers, `verify_jwt = false` in config.toml

**Config update:** Add `[functions.zd-count-voice-tags]` with `verify_jwt = false` to `supabase/config.toml`

### Other considerations before proceeding

1. **Should this also break down by status?** (e.g., how many are solved vs open) — useful for deeper debugging
2. **Should it support other tags too?** (e.g., `emails`, `chat`) so you can verify all channels, not just voice
3. **Should it support date ranges?** (e.g., `startDate` + `endDate`) instead of just a single date

