
# Agent Reports Enhancements

## Overview

Two improvements requested for the Agent Reports page:

| Request | Current Behavior | Desired Behavior |
|---------|------------------|------------------|
| EOD Analytics | Not visible on Agent Reports page | Display team-wide daily performance metrics |
| Default Status Filter | Shows "All Status" on load | Shows only "Open" status by default |

---

## Part 1: Default Status Filter to "Open"

### Problem
When loading the Agent Reports page, users see all reports (open, escalated, validated, dismissed) by default. This clutters the view with already-processed reports when the primary use case is reviewing pending (open) incidents.

### Solution
Change the default status filter from empty (`''`) to `'open'` so only actionable items appear on initial load.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AgentReports.tsx` | Set initial status state to `'open'` |
| `src/pages/AgentReports.tsx` | Update `handleClearFilters` to reset to `'open'` instead of `''` |

### Technical Changes

**File: `src/pages/AgentReports.tsx`**

**Line 41 - Initial State:**
```typescript
// Before:
const [status, setStatus] = useState('');

// After:
const [status, setStatus] = useState('open');
```

**Lines 89-93 - Clear Filters:**
```typescript
// Before:
const handleClearFilters = () => {
  setAgentEmail('');
  setIncidentType('');
  setStatus('');
};

// After:
const handleClearFilters = () => {
  setAgentEmail('');
  setIncidentType('');
  setStatus('open'); // Preserve default "open" filter
};
```

---

## Part 2: EOD Analytics Panel

### Problem
The EOD (End of Day) team analytics are calculated daily but only sent via email/Slack. Users want to view these metrics directly on the Agent Reports page.

### Solution
Create a collapsible EOD Analytics panel that displays team-wide performance metrics above the incident reports table.

### Data Available from Edge Function

The `generate-eod-analytics` function returns:

```typescript
{
  date: string;
  attendance: {
    active: number;           // Agents who logged in
    scheduled: number;        // Expected to work
    onTime: number;           // Logged in on time
    onTimeRate: number;       // Percentage
    fullShift: number;        // Completed full shift
    fullShiftRate: number;    // Percentage
  };
  productivity: {
    total: number;            // Total tickets
    email: number;
    chat: number;
    call: number;
    quotaAgents: number;      // Agents with quota
    quotaMet: number;         // Met quota
    quotaRate: number;        // Percentage
    avgGap: number | null;    // Average ticket gap (mins)
  };
  time: {
    avgLogged: number | null; // Average hours logged
    avgRequired: number | null;
  };
  compliance: {
    clean: number;            // Zero violations
    cleanRate: number;        // Percentage
    incidents: number;        // Total incidents
    breakdown: Record<string, number>;  // By type
  };
  status: 'good' | 'warning' | 'critical';
  details: string[];          // Status explanations
}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/agentReportsApi.ts` | Add `fetchEODAnalytics()` function |
| `src/components/agent-reports/EODAnalyticsPanel.tsx` | New component to display analytics |
| `src/pages/AgentReports.tsx` | Import and render the panel |

### Technical Changes

**File: `src/lib/agentReportsApi.ts`**

Add new function at the end of the file:

```typescript
/**
 * EOD Analytics data structure
 */
export interface EODAnalytics {
  date: string;
  attendance: {
    active: number;
    scheduled: number;
    onTime: number;
    onTimeRate: number;
    fullShift: number;
    fullShiftRate: number;
  };
  productivity: {
    total: number;
    email: number;
    chat: number;
    call: number;
    quotaAgents: number;
    quotaMet: number;
    quotaRate: number;
    avgGap: number | null;
  };
  time: {
    avgLogged: number | null;
    avgRequired: number | null;
  };
  compliance: {
    clean: number;
    cleanRate: number;
    incidents: number;
    breakdown: Record<string, number>;
  };
  status: 'good' | 'warning' | 'critical';
  details: string[];
}

/**
 * Fetch EOD team analytics for a specific date
 */
export async function fetchEODAnalytics(
  date?: string
): Promise<{ data: EODAnalytics | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-eod-analytics`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ date }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || 'Failed to fetch analytics' };
    }

    const result = await response.json();
    return { data: result.analytics, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
```

---

**File: `src/components/agent-reports/EODAnalyticsPanel.tsx`** (New File)

Create a collapsible panel with 4 metric cards:
- Attendance (Active, On-Time Rate, Shift Completion)
- Productivity (Tickets, Quota Rate, Avg Gap)
- Time (Avg Logged vs Required)
- Compliance (Clean Rate, Incidents Breakdown)

Features:
- Date picker to select which day's analytics to view
- Status badge (Good/Warning/Critical) with color coding
- Details list showing threshold violations
- Collapsible accordion for space efficiency

UI Layout:
```text
+------------------------------------------------------------------+
| EOD Team Analytics                      [Date: Jan 6, 2026] [v]  |
| Status: WARNING - On-Time Login below target: 85%                |
+------------------------------------------------------------------+
| Attendance       | Productivity      | Time           | Compliance |
| 12/15 active     | 247 tickets       | 7.8h / 8h avg  | 87% clean  |
| 80% on-time      | 72% quota met     |                | 3 incidents|
| 93% full shift   | 4.2 min avg gap   |                |            |
+------------------------------------------------------------------+
```

---

**File: `src/pages/AgentReports.tsx`**

Add import and render the panel:

```typescript
// Add import
import { EODAnalyticsPanel } from '@/components/agent-reports/EODAnalyticsPanel';

// In the JSX, after ReportSummaryCards:
{/* EOD Analytics Panel */}
<EODAnalyticsPanel />

{/* Existing Filters Card */}
<Card>
```

---

## Implementation Order

| Step | Task |
|------|------|
| 1 | Change default status filter to `'open'` in AgentReports.tsx |
| 2 | Add `fetchEODAnalytics` function to agentReportsApi.ts |
| 3 | Create EODAnalyticsPanel component |
| 4 | Import and render panel in AgentReports.tsx |
| 5 | Test date selection and analytics display |

---

## Additional Considerations

### Permissions
- EOD Analytics should only be visible to Admin/HR users (matches who receives email notifications)
- Use `isAdmin || isHR` check before rendering the panel

### Caching
- Analytics can be cached briefly (5 minutes) since the data is calculated daily
- Add `staleTime` to the query if using React Query

### Edge Function Deployment
- Ensure `generate-eod-analytics` is deployed (was already in `config.toml`)
- Test the endpoint before integrating

---

## Summary

| Change | Files | Complexity |
|--------|-------|------------|
| Default "Open" filter | 1 file, 2 lines | Low |
| EOD Analytics Panel | 3 files, new component | Medium |
