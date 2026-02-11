import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { DashboardWeekSelector } from '@/components/dashboard/DashboardWeekSelector';
import { CoverageTimeline } from '@/components/coverage-board/CoverageTimeline';
import { CoverageFilters } from '@/components/coverage-board/CoverageFilters';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePortalClock } from '@/context/PortalClockContext';
import {
  fetchAgentSchedules,
  fetchOverridesForDate,
  fetchLeavesForDate,
  groupAgents,
} from '@/lib/coverageBoardApi';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// JS day indices: Mon=1 ... Sun=0
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CoverageBoard() {
  const { now } = usePortalClock();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now, { weekStartsOn: 1 }));
  const [selectedDayOffset, setSelectedDayOffset] = useState(() => {
    // Default to current day of week (0=Mon in our offset)
    const jsDay = now.getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon offset
  });
  const [showEffective, setShowEffective] = useState(true);

  const selectedDate = useMemo(() => addDays(weekStart, selectedDayOffset), [weekStart, selectedDayOffset]);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayIndex = DAY_INDICES[selectedDayOffset]; // JS day index (0=Sun)
  const selectedDayName = DAY_NAMES[selectedDayOffset];

  // Fetch agents
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['coverage-agents'],
    queryFn: fetchAgentSchedules,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch overrides for selected date
  const { data: overrides = [] } = useQuery({
    queryKey: ['coverage-overrides', dateStr],
    queryFn: () => fetchOverridesForDate(dateStr),
    enabled: showEffective,
  });

  // Fetch leaves for selected date
  const { data: leaves = [] } = useQuery({
    queryKey: ['coverage-leaves', dateStr],
    queryFn: () => fetchLeavesForDate(dateStr),
    enabled: showEffective,
  });

  const groups = useMemo(() => groupAgents(agents), [agents]);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Team Coverage Board</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <CoverageFilters showEffective={showEffective} onToggleView={setShowEffective} />
            <DashboardWeekSelector selectedDate={weekStart} onDateChange={setWeekStart} />
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-1 border-b border-border pb-1">
          {DAY_LABELS.map((label, i) => {
            const dayDate = addDays(weekStart, i);
            const isToday = format(dayDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
            return (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className={cn(
                  'text-xs h-8 px-3 rounded-md',
                  selectedDayOffset === i && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                  isToday && selectedDayOffset !== i && 'border border-primary/40'
                )}
                onClick={() => setSelectedDayOffset(i)}
              >
                {label}
                <span className="ml-1 text-[10px] opacity-70">{format(dayDate, 'd')}</span>
              </Button>
            );
          })}
        </div>

        {/* Timeline */}
        {loadingAgents ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">Loading schedules...</div>
        ) : (
          <CoverageTimeline
            groups={groups}
            selectedDayIndex={selectedDayIndex}
            selectedDayName={selectedDayName}
            overrides={overrides}
            leaves={leaves}
            showEffective={showEffective}
          />
        )}
      </div>
    </Layout>
  );
}
