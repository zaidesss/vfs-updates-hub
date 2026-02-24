

## Analysis and Plan

### Critical Data Issue Found: Duplicate Position Values

While reviewing the fields, I discovered a **major data integrity problem**. The position arrays for nearly all agents contain **both old and new values** duplicated. For example, Ashley Nerviol has:

```text
["Email Support", "Chat Support", "Phone Support", "Email", "Chat", "Phone"]
```

This happened because when we added the new shortened names via checkboxes, the old "X Support" values were never cleaned up. This affects **all 29 agents** and will cause incorrect behavior in:
- Team Status Board categorization (falls through to first match, may pick wrong one)
- Scorecard position filtering
- EOD/Weekly analytics exclusion logic
- Position defaults auto-population

### Items 1-12 Summary

| # | Field | Current State |
|---|-------|--------------|
| 1 | Position / Role | Duplicated values (bug above). Also: you want "Hybrid" removed from options. |
| 2 | Total Hours (Weekly) | Calculates correctly from schedule data |
| 3 | Weekday hours | Derived from Mon-Fri schedules |
| 4 | Weekend: 0.0h | Correct for agents with Sat/Sun as Day Off (no weekend schedule) |
| 5 | OT | Reflects ot_enabled + OT schedule hours |
| 6 | Break Deduction | Calculated per working day |
| 7 | Day Off | Working correctly (checkbox toggles) |
| 8 | Weekday Schedule | Monday auto-populates Tue-Fri |
| 9 | Weekend Schedule | Saturday auto-populates Sunday |
| 10 | Break Schedule | Single field, applied to all working days |
| 11 | OT Schedule Enabled | Toggle switch |
| 12 | Weekday OT Schedule | Monday OT auto-populates Tue-Fri OT |

### Plan Step 1: Fix Position Data

**Database migration** to:
1. Remove "Hybrid" from `POSITION_OPTIONS` in code
2. Clean up all duplicate position values in the database (strip old "X Support" suffixed versions, keep only new shortened names)
3. Update `categorizeByPosition` in `teamStatusApi.ts` and `get_weekly_scorecard_data` to handle the new values
4. Update the `handlePositionToggle` check for Hybrid (line 152 in WorkConfigurationSection still references `'Hybrid Support'`)

### Plan Step 2: ZD1 vs ZD2 Agent Split Recommendation

**Current state:** 27 agents on ZD1, 2 on ZD2 (Nikki Ignacio, Reza Joy Docto)

**Volume & Demand analysis from your screenshot:**

| Metric | ZD1 | ZD2 |
|--------|-----|-----|
| Total Unresolved | 19,402 | 5,335 |
| Email backlog | 18,707 (41/d avg) | 2,395 (5/d avg) |
| Chat backlog | 47 (0/d) | 2,529 (6/d avg) |
| Call backlog | 64 (0/d) | 0 |

**Key observations:**
- ZD2 has a **massive chat backlog** (2,529) with only ~6/day throughput — this is severely understaffed
- ZD1 email backlog is enormous (18,707) but has decent daily throughput (41/d)
- ZD1 chat and call volumes are near zero — agents are primarily doing email
- ZD2 has no calls at all

**Before I can recommend a specific split**, I need to understand a few things — I will ask these as follow-up questions after you approve the plan direction.

Questions I need answered to finalize the split:
- What is each agent's **primary skill/preference** — are some agents better at chat vs email?
- Do you want to **balance headcount** (e.g., 20 ZD1 / 9 ZD2) or **balance by volume ratio**?
- Should the ZD2 agents primarily handle **chat** (since that's the biggest gap), or a mix?
- Are there shift coverage considerations — ZD2 needs agents during specific hours?
- Should agents with "Emails" upwork contract stay on ZD1, and "Hybrid" contracts be candidates for ZD2?

### Implementation Steps (after discussion)

1. Run database migration to clean position data and remove "Hybrid" option
2. Update frontend code to remove "Hybrid" from POSITION_OPTIONS and fix the `'Hybrid Support'` reference
3. After you decide the split, bulk-update `zendesk_instance` for the selected agents

