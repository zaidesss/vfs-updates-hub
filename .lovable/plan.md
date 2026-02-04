
# Populate Zendesk User IDs for Chat/Phone Agents

## Summary
Add Zendesk User IDs to the 6 agents who handle Chat and/or Phone support, prioritizing Desiree (Support 2) for immediate testing.

## Agents to Update

| Priority | Agent | Email | Support Account | Zendesk User ID |
|----------|-------|-------|-----------------|-----------------|
| **1st** | Desiree Cataytay | descataytay.26@gmail.com | 2 | 11436740426393 |
| 2nd | Will Angeline Reyes | willangelinereyes@gmail.com | 5 | 26969565500569 |
| 3rd | Precious Mae Gagarra | preciousgagarra21@gmail.com | 6 | 27511291800345 |
| 4th | Jennifer Katigbak | lhenlenkatigbak1999@gmail.com | 7 | 35402612196249 |
| 5th | Kimberly Lacaden | kimberlytlacaden@gmail.com | 14 | 37286736245145 |
| 6th | Pauline Carbajosa | paulinecarbajosa0713@gmail.com | 15 | 37286723394201 |

Note: Malcom Testing has no support_account assigned, so no Zendesk User ID can be mapped.

## Implementation Steps

### Step 1: Update Desiree's Profile (Priority)
```sql
UPDATE agent_profiles 
SET zendesk_user_id = '11436740426393'
WHERE email = 'descataytay.26@gmail.com';
```

### Step 2: Update Remaining 5 Agents
```sql
UPDATE agent_profiles SET zendesk_user_id = '26969565500569' WHERE support_account = '5';
UPDATE agent_profiles SET zendesk_user_id = '27511291800345' WHERE support_account = '6';
UPDATE agent_profiles SET zendesk_user_id = '35402612196249' WHERE support_account = '7';
UPDATE agent_profiles SET zendesk_user_id = '37286736245145' WHERE support_account = '14';
UPDATE agent_profiles SET zendesk_user_id = '37286723394201' WHERE support_account = '15';
```

### Step 3: Test Metrics Fetch for Desiree
Trigger the `fetch-zendesk-metrics` function for Jan 26 – Feb 1, 2026 to verify:
- Call AHT is retrieved from Zendesk Talk API
- Chat AHT and FRT are retrieved from Zendesk Support API
- Data is saved to `zendesk_agent_metrics` table

## Expected Outcome
After populating the IDs, the weekly cron job (Tuesdays 2:00 AM EST) will automatically fetch:
- **Call AHT**: Average handle time for phone calls
- **Chat AHT**: Average handle time for chat conversations  
- **Chat FRT**: First response time for chat tickets

Desiree should show actual metrics since she has `[Email Chat Phone]` support type and is actively using the Zendesk account.

## Technical Notes
- The edge function already uses `zendesk_user_id` for API queries (implemented earlier)
- Only agents with a populated `zendesk_user_id` will have metrics fetched
- Agents without Chat/Phone in `support_type` don't need IDs for AHT/FRT purposes
