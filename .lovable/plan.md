

## Auto-Log All Code Changes to Audit Log

### What This Means

Every time I (Lovable) make a code change for you -- whether it's a new feature, a bug fix, a UI tweak, or any modification -- I will automatically insert an entry into the Audit Log immediately after applying the change.

### How Each Entry Will Look

| Field | Value |
|-------|-------|
| **Changed By** | Patrick Argao |
| **Area** | The relevant module (e.g., QA Evaluations, Updates, Profile, etc.) |
| **Action Type** | `new_feature` for new additions, `updated` for edits/fixes, `deleted` for removals |
| **Entity Label** | Short description of what changed (e.g., "Send to Agent from List View") |
| **Changes** | Field-level diffs where applicable (old vs. new values) |
| **Metadata** | Description of the change and any relevant context |

### What I Need to Do

1. **Add this as a project custom instruction** so it persists across all future conversations -- every time you chat with me, I will remember to log changes.

2. **Backfill the "Send to Agent" feature** that was just added but not logged as a development entry.

3. **Going forward**, after every code change I make, I will insert an audit log entry using the database insert tool before confirming the change to you.

### Technical Details

- Entries are inserted directly into the `portal_audit_log` table via database insert (not through the API, since this is a development-time action)
- `changed_by` will always be "Patrick Argao" (derived from your logged-in profile)
- No code changes are needed -- this is a workflow/process change in how I operate

