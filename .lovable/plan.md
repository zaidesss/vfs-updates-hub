
## Update Cron Schedule: `compute-weekly-snapshots` to Sunday 9:00 AM EST

### Current State
- **Job Name**: `compute-weekly-snapshots`
- **Current Schedule**: Wednesday at 9:00 AM EST (`0 14 * * 3`)
- **Current Behavior**: Snapshots the previous Monday-Sunday week's data on Wednesday morning

### Desired State
- **New Schedule**: Sunday at 9:00 AM EST (`0 14 * * 0`)
- **New Behavior**: Snapshots each completed week (Monday-Sunday) on Sunday morning at 9:00 AM EST
  - Previous week's data → snapshots this coming Sunday 9 AM
  - Current week's data → snapshots next Sunday 9 AM

### Implementation
The change requires:
1. **Database Update**: Unschedule the existing `compute-weekly-snapshots` job
2. **Reschedule**: Create a new cron job that triggers the `compute-weekly-snapshots` edge function every Sunday at 14:00 UTC (9:00 AM EST)
   - Cron expression: `0 14 * * 0`
   - Uses `cron.schedule()` with `net.http_post()` to invoke the edge function
   - Includes Bearer token authorization and JSON body with timestamp

### No Code Changes Required
- The edge function logic itself doesn't change—the `getWeekBoundaries()` function will correctly identify "the previous week" regardless of when it runs
- Only the trigger schedule changes

### Expected Result
- Sunday 9:00 AM EST each week: All weekly snapshot tables are populated for the prior Monday-Sunday week
- Seamless continuation of data aggregation without logic changes
