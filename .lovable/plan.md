

## Build Volume & Demand Page

### Overview

Replace the placeholder "Coming Soon" page at `/operations/reports/volume` with a fully functional Volume & Demand analytics dashboard. This page will visualize daily ticket volumes from both Zendesk instances (ZD1 and ZD2), broken down by channel (Email, Chat, Call), using your existing `ticket_logs` and `call_count_daily` data.

### What the Page Will Show

1. **Summary Cards** -- Total tickets for the selected period, broken down by channel (Email, Chat, Call), plus a daily average
2. **Daily Volume Bar Chart** -- Stacked bar chart (recharts) showing daily ticket counts by channel, with both instances combined or filtered
3. **Instance Comparison** -- Side-by-side cards showing ZD1 vs ZD2 totals for the selected period
4. **Channel Distribution** -- Pie/donut chart showing the percentage split across Email, Chat, and Call
5. **Daily Data Table** -- Tabular breakdown of each day's counts (date, email, chat, call, total)

### Filters/Controls

- **Instance Selector**: "Both", "ZD1 Only", or "ZD2 Only"
- **Date Range**: Rolling 2-week window (default, matching Ticket Logs), with option to pick custom start/end dates
- **Channel Filter**: All, Email, Chat, Call

### Data Source

All data comes from the existing `ticket_logs` table (queried directly via the client library) plus `call_count_daily` for ZD1 call counts. No new database tables, edge functions, or API calls needed.

### Implementation Details

**File modified:**
- `src/pages/operations/VolumeDemand.tsx` -- Complete rewrite from placeholder to full dashboard

**Key technical choices:**
- Uses `@tanstack/react-query` for data fetching (consistent with ZendeskInsights pattern)
- Uses `recharts` `BarChart` for the daily volume chart and `PieChart` for channel distribution
- Queries `ticket_logs` grouped by date and ticket_type with EST timezone casting
- Merges `call_count_daily` data for ZD1 call counts (same logic as `get_ticket_dashboard_data`)
- Uses existing UI components: `Card`, `Select`, `Badge`, `Skeleton`
- Uses `date-fns` for date manipulation, `date-picker` for custom range selection
- Responsive grid layout: summary cards on top, chart below, table at bottom

**No database changes needed** -- this is a read-only frontend page using existing tables.

### Step-by-Step

We will implement this in a single step since it's one file (`VolumeDemand.tsx`). The page will:

1. Query `ticket_logs` with date range + instance filters, grouping by date and ticket_type
2. Query `call_count_daily` for ZD1 call data in the same range
3. Merge the results into a daily breakdown array
4. Render summary cards, bar chart, pie chart, and data table
