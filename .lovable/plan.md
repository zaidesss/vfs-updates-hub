

# Reliability Calculation with Outage-Based Deductions ✅ IMPLEMENTED

## Summary

This update modifies how **Reliability** is calculated in the Team Scorecard. Instead of the previous formula that adjusted scheduled days by approved leave, the new approach starts at 100% reliability and **deducts 1% for each outage day** from the Outages page, **except for "Planned Leave"** which has no deduction.

## Implementation Status: ✅ Complete

### Changes Made:

1. **Database Migration** ✅
   - Updated `get_weekly_scorecard_data` RPC to return `planned_leave_days` and `unplanned_outage_days` separately
   - Added `unplanned_outage_days` column to `saved_scorecards` table

2. **TypeScript Updates** ✅
   - Updated `ScorecardRPCResult` interface with new fields
   - Updated `AgentScorecard` interface with `plannedLeaveDays` and `unplannedOutageDays`
   - Added `countOutageDaysByType()` function for legacy support
   - Updated reliability calculation in both RPC and legacy fetch functions

## New Behavior

The new formula is:
```
reliability = 100 - (unplanned_outage_days × 1)
```

Where:
- **Planned Leave**: No deduction (fully excused)
- **All other outage reasons**: 1% deduction per day
  - Medical Leave: 1% per day
  - Late Login: 1% per day  
  - Power Outage: 1% per day
  - Wi-Fi Issue: 1% per day
  - Equipment Issue: 1% per day
  - Undertime: 1% per day
  - Unplanned: 1% per day

**Example**: Agent has 2 days Medical Leave + 1 day Planned Leave + 1 day Late Login
- Deduction = 2% (Medical) + 0% (Planned) + 1% (Late Login) = 3%
- Reliability = 100% - 3% = 97%

## Outage Reasons Reference

| Outage Reason | Deduction |
|---------------|-----------|
| Planned Leave | 0% (exempt) |
| Medical Leave | 1% per day |
| Late Login | 1% per day |
| Power Outage | 1% per day |
| Wi-Fi Issue | 1% per day |
| Equipment Issue | 1% per day |
| Undertime | 1% per day |
| Unplanned | 1% per day |

## UI Impact

- Agent with 0 unplanned outage days: **100% reliability**
- Agent with 3 unplanned outage days: **97% reliability**
- Agent on 5-day Planned Leave covering all scheduled days: Shows **"On Leave"** status

