import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { DashboardWeekSelector } from '@/components/dashboard/DashboardWeekSelector';
import { CoverageTimeline } from '@/components/coverage-board/CoverageTimeline';
import { CoverageFilters, EMPTY_FILTERS, applyFilters, type CoverageFilterState } from '@/components/coverage-board/CoverageFilters';
import { usePortalClock } from '@/context/PortalClockContext';
import {
  fetchAgentSchedules,
  fetchOverridesForWeek,
  fetchLeavesForWeek,
  groupAgents,
} from '@/lib/coverageBoardApi';

export default function CoverageBoard() {
  const { now } = usePortalClock();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now, { weekStartsOn: 1 }));
  const [showEffective, setShowEffective] = useState(true);
  const [filters, setFilters] = useState<CoverageFilterState>(EMPTY_FILTERS);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch agents
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['coverage-agents'],
    queryFn: fetchAgentSchedules,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch overrides for entire week
  const { data: overrides = [] } = useQuery({
    queryKey: ['coverage-overrides', startStr, endStr],
    queryFn: () => fetchOverridesForWeek(startStr, endStr),
    enabled: showEffective,
  });

  // Fetch leaves for entire week
  const { data: leaves = [] } = useQuery({
    queryKey: ['coverage-leaves', startStr, endStr],
    queryFn: () => fetchLeavesForWeek(startStr, endStr),
    enabled: showEffective,
  });

  const filteredAgents = useMemo(() => applyFilters(agents, filters), [agents, filters]);
  const groups = useMemo(() => groupAgents(filteredAgents), [filteredAgents]);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Team Coverage Board</h1>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <CoverageFilters showEffective={showEffective} onToggleView={setShowEffective} filters={filters} onFiltersChange={setFilters} agents={agents} />
            <DashboardWeekSelector selectedDate={weekStart} onDateChange={setWeekStart} />
          </div>
        </div>

        {/* Timeline */}
        {loadingAgents ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">Loading schedules...</div>
        ) : (
          <CoverageTimeline
            groups={groups}
            weekStart={weekStart}
            overrides={overrides}
            leaves={leaves}
            showEffective={showEffective}
          />
        )}
      </div>
    </Layout>
  );
}
