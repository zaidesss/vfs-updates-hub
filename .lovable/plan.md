

## Upwork Integration - Build Plan

### Current State
- ✅ OAuth tokens saved (`UPWORK_ACCESS_TOKEN`, `UPWORK_REFRESH_TOKEN`)
- ✅ OAuth callback function working
- ❌ `upwork_contract_id` field missing from `agent_directory` table
- ❌ `fetch-upwork-time` edge function not created
- ❌ Daily Work Tracker doesn't display Upwork time comparison

---

### Step 1: Add `upwork_contract_id` Column to Database

Add a new column to store each agent's Upwork contract ID:

```sql
ALTER TABLE public.agent_directory 
ADD COLUMN upwork_contract_id TEXT DEFAULT NULL;
```

---

### Step 2: Create `fetch-upwork-time` Edge Function

New file: `supabase/functions/fetch-upwork-time/index.ts`

This function will:
1. Accept `contractId` and `date` parameters
2. Call Upwork Work Diary API to fetch logged hours
3. Handle token refresh if access token expires
4. Return hours worked for the specified date

Key API endpoint: `https://www.upwork.com/api/v3/workdiary/contracts/{contract_id}/{date}`

Required secrets (already configured):
- `UPWORK_CLIENT_ID`
- `UPWORK_CLIENT_SECRET`
- `UPWORK_ACCESS_TOKEN`
- `UPWORK_REFRESH_TOKEN`

---

### Step 3: Update Master Directory UI

Modify `src/pages/MasterDirectory.tsx` and `src/lib/masterDirectoryApi.ts` to:
- Add "Upwork Contract ID" input column after "Day Off"
- Include the field in save/load operations
- Track changes in history

---

### Step 4: Enhance Daily Work Tracker

Update `src/components/dashboard/DailyWorkTracker.tsx` to:
- Add "Time Logged (Portal)" showing login/logout duration
- Add "Time Logged (Upwork)" showing fetched Upwork hours
- Display comparison/variance between the two

---

### Step 5: Update API Layer

Modify `src/lib/agentDashboardApi.ts` to:
- Fetch agent's `upwork_contract_id` from directory
- Call the edge function to get Upwork hours
- Return data to the Daily Work Tracker component

---

### Technical Details

**Upwork API Token Refresh Logic:**
```text
┌─────────────────────────────────────────────────────────┐
│  fetch-upwork-time Edge Function                        │
├─────────────────────────────────────────────────────────┤
│  1. Try API call with current access token              │
│  2. If 401 Unauthorized:                                │
│     a. Use refresh token to get new access token        │
│     b. Update stored token (or log for manual update)   │
│     c. Retry API call                                   │
│  3. Return hours worked for the date                    │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
```text
Agent Dashboard → DailyWorkTracker → agentDashboardApi
                                           ↓
                              fetch-upwork-time (Edge Function)
                                           ↓
                              Upwork Work Diary API
                                           ↓
                              Return hours logged
```

---

### Questions Before Proceeding

1. **Do you want to implement all 5 steps together, or proceed step-by-step?** (Recommended: step-by-step so we can test each part)

2. **For the Upwork Contract ID, do you already have a test agent's contract ID we can use for testing?** This is needed to call the Upwork API.

3. **Where should the "Time Logged" comparison appear?** The Daily Work Tracker seems like the right place, but let me know if you want it elsewhere.

