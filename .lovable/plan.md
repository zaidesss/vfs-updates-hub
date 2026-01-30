

# Fix: Sync Bios to Master Directory

## Problem

The `agent_directory` table is missing a record for `malcom@persistbrands.com`. The Master Directory shows this user (from `agent_profiles`), but all the synced fields (schedules, agent_name, etc.) are empty because there's no corresponding `agent_directory` row.

**Database State:**
- `agent_profiles` has complete Bios data for `malcom@persistbrands.com`
- `agent_directory` has **no record** for this email

The sync function exists in `agentProfileApi.ts` but it only triggers when a profile is saved through the app. If profiles were created before the sync logic was added, they won't have `agent_directory` records.

---

## Solution

### 1. Add a "Sync All" Button to Master Directory

Add a button in the Master Directory header that triggers a one-time sync of all `agent_profiles` data to `agent_directory`. This will:
- Find all profiles that are missing `agent_directory` records
- Create the missing records with the correct synced data
- Recalculate total hours for all entries

### 2. Improve Sync Error Handling

Currently, the sync fails silently. We should log errors and show a warning toast if the sync fails.

---

## Implementation Details

### File 1: `src/lib/masterDirectoryApi.ts`

Add a new function to sync all profiles to directory:

```typescript
export async function syncAllProfilesToDirectory(): Promise<{ 
  success: boolean; 
  synced: number; 
  error: string | null 
}> {
  try {
    // Fetch all profiles with work configuration data
    const { data: profiles, error: profilesError } = await supabase
      .from('agent_profiles')
      .select('email, agent_name, agent_tag, zendesk_instance, support_account, support_type, views, quota_email, quota_chat, quota_phone, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, break_schedule, weekday_ot_schedule, weekend_ot_schedule, day_off, upwork_contract_id');
    
    if (profilesError) {
      return { success: false, synced: 0, error: profilesError.message };
    }
    
    // Fetch existing directory entries
    const { data: existingEntries } = await supabase
      .from('agent_directory')
      .select('email');
    
    const existingEmails = new Set((existingEntries || []).map(e => e.email.toLowerCase()));
    
    let syncedCount = 0;
    
    for (const profile of profiles || []) {
      const email = profile.email.toLowerCase();
      
      // Calculate quota
      const quota = (profile.quota_email || 0) + (profile.quota_chat || 0) + (profile.quota_phone || 0);
      
      // Prepare sync data
      const syncData = {
        email,
        agent_name: profile.agent_name || null,
        agent_tag: profile.agent_tag || null,
        zendesk_instance: profile.zendesk_instance || null,
        support_account: profile.support_account || null,
        support_type: Array.isArray(profile.support_type) ? profile.support_type.join(', ') : null,
        views: profile.views || [],
        quota: quota || null,
        mon_schedule: profile.mon_schedule || null,
        tue_schedule: profile.tue_schedule || null,
        wed_schedule: profile.wed_schedule || null,
        thu_schedule: profile.thu_schedule || null,
        fri_schedule: profile.fri_schedule || null,
        sat_schedule: profile.sat_schedule || null,
        sun_schedule: profile.sun_schedule || null,
        break_schedule: profile.break_schedule || null,
        weekday_ot_schedule: profile.weekday_ot_schedule || null,
        weekend_ot_schedule: profile.weekend_ot_schedule || null,
        day_off: profile.day_off || [],
        upwork_contract_id: profile.upwork_contract_id || null,
        weekday_schedule: profile.mon_schedule || null,
        weekend_schedule: profile.sat_schedule || null,
      };
      
      // Calculate hours
      const hours = calculateTotalHours({
        weekday_schedule: syncData.weekday_schedule,
        weekend_schedule: syncData.weekend_schedule,
        weekday_ot_schedule: syncData.weekday_ot_schedule,
        weekend_ot_schedule: syncData.weekend_ot_schedule,
        break_schedule: syncData.break_schedule,
        day_off: syncData.day_off,
      });
      
      // Upsert to agent_directory
      const { error: upsertError } = await supabase
        .from('agent_directory')
        .upsert({
          ...syncData,
          weekday_total_hours: hours.weekday_total_hours,
          weekend_total_hours: hours.weekend_total_hours,
          ot_total_hours: hours.ot_total_hours,
          unpaid_break_hours: hours.unpaid_break_hours,
          overall_total_hours: hours.overall_total_hours,
        }, { onConflict: 'email' });
      
      if (!upsertError) {
        syncedCount++;
      }
    }
    
    return { success: true, synced: syncedCount, error: null };
  } catch (err: any) {
    return { success: false, synced: 0, error: err.message };
  }
}
```

### File 2: `src/pages/MasterDirectory.tsx`

Add a "Sync All" button next to the "Save All" button:

```typescript
import { syncAllProfilesToDirectory } from '@/lib/masterDirectoryApi';
import { RefreshCw } from 'lucide-react';

// Add state for syncing
const [isSyncing, setIsSyncing] = useState(false);

// Add sync handler
const handleSyncAll = async () => {
  setIsSyncing(true);
  const { success, synced, error } = await syncAllProfilesToDirectory();
  setIsSyncing(false);
  
  if (success) {
    toast({
      title: 'Sync Complete',
      description: `Successfully synced ${synced} profile(s) to Master Directory.`,
    });
    await loadData(); // Refresh the data
  } else {
    toast({
      title: 'Sync Failed',
      description: error || 'Failed to sync profiles.',
      variant: 'destructive',
    });
  }
};

// Add button in header next to Save All
<Button
  onClick={handleSyncAll}
  disabled={isSyncing}
  variant="outline"
  className="mr-2"
>
  <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
  {isSyncing ? 'Syncing...' : 'Sync from Bios'}
</Button>
```

### File 3: `src/lib/agentProfileApi.ts`

Improve sync error handling to show a warning (optional enhancement):

```typescript
// In syncProfileToDirectory function, add better error handling
const { error: syncError } = await supabase
  .from('agent_directory')
  .upsert(syncData, { onConflict: 'email' });

if (syncError) {
  console.error('Failed to sync profile to directory:', syncError);
  throw new Error(`Directory sync failed: ${syncError.message}`);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/masterDirectoryApi.ts` | Add `syncAllProfilesToDirectory()` function |
| `src/pages/MasterDirectory.tsx` | Add "Sync from Bios" button and handler |
| `src/lib/agentProfileApi.ts` | (Optional) Improve error handling in sync function |

---

## Result

After implementation:
1. Admin clicks "Sync from Bios" button in Master Directory
2. All `agent_profiles` data is synced to `agent_directory`
3. `malcom@persistbrands.com` will now show the correct schedules, agent_name, etc.
4. All hour calculations will be computed correctly

---

## Alternative Consideration

**Should the sync happen automatically when loading Master Directory?**
- Pros: Always up-to-date without manual action
- Cons: Slower page load, could cause data conflicts if someone is editing in Bios simultaneously

I recommend the manual "Sync from Bios" button approach for more control. Would you like me to also add automatic sync on page load?

