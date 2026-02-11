

## Fix Timezone Bug in Late Login Auto-Generation + Data Cleanup

### Summary
Three issues to address:
1. **Timezone bug** causing auto-generated Late Login outages to use the wrong date
2. **Data correction** for Stephen's wrongly-dated leave request (and Ellen's)
3. **False report cleanup** for Stephen's Feb 11 EARLY_OUT and LATE_LOGIN

---

### Issue 1: Timezone Bug in Auto-Generated Late Login Date

**File:** `src/pages/AgentDashboard.tsx` (lines 213-214)

**Problem:** The code uses `new Date()` which returns browser local time. For agents in UTC+8 (Philippines), a 5:07 PM EST login on Monday Feb 9 becomes 6:07 AM Feb 10 local time. The `format(today, 'yyyy-MM-dd')` then produces `'2026-02-10'` instead of `'2026-02-09'`, creating the outage request on the wrong date.

**Fix:** Replace `new Date()` with `getTodayEST()` from `timezoneUtils.ts` so the date is always in EST regardless of browser timezone. Also update the attendance matching to use the EST date string.

```text
Current (buggy):
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

Fixed:
  const todayStr = getTodayEST();
```

---

### Issue 2: Data Correction -- Wrong-Date Leave Requests

Two auto-generated Late Login outages were created with `start_date = '2026-02-10'` but should be `'2026-02-09'`:

| ID | Agent | Current Date | Correct Date | Status |
|---|---|---|---|---|
| `22d659ce-...` | Stephen Martinez | 2026-02-10 | 2026-02-09 | approved |
| `de93be93-...` | Ellen Eugenio | 2026-02-10 | 2026-02-09 | for_review |

Ellen also has a canceled duplicate (`fc62ca57-...`) with the same wrong date -- this can be left as-is since it's already canceled.

**Action:** Update `start_date` and `end_date` to `'2026-02-09'` for both records.

---

### Issue 3: False Report Cleanup

Delete Stephen's two false Feb 11 reports (generated mid-shift due to accidental logout/re-login):

| ID | Type | Date |
|---|---|---|
| `3670dd55-...` | EARLY_OUT | 2026-02-11 |
| `e34771f8-...` | LATE_LOGIN | 2026-02-11 |

Plus the previously identified false reports from the earlier plan:

| ID | Agent | Type | Date |
|---|---|---|---|
| `214766b2-f3dd-41e2-af0b-45e2ea9b4c4e` | Meryl Jean | EARLY_OUT | Feb 9 |
| `2189ee6d-5e10-4ebb-aea5-cee4c11b4dd9` | Biah Mae | EARLY_OUT | Feb 11 |

---

### Step-by-Step Implementation

**Step 1:** Fix `src/pages/AgentDashboard.tsx` -- replace `new Date()` with `getTodayEST()` for the late login auto-generation date logic (lines 213-214).

**Step 2:** Correct Stephen's and Ellen's leave request dates in the database (update start_date/end_date from Feb 10 to Feb 9).

**Step 3:** Delete the 4 false agent reports (Stephen's 2 + Meryl Jean's 1 + Biah Mae's 1).

