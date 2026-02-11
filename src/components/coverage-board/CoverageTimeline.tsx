import { useMemo } from 'react';
import { usePortalClock } from '@/context/PortalClockContext';
import { GroupHeader } from './GroupHeader';
import { ShiftBlock, parseScheduleRange } from './ShiftBlock';
import type { AgentGroup, AgentScheduleRow, CoverageOverride, LeaveForDate } from '@/lib/coverageBoardApi';
import { getScheduleForDay, isDayOff } from '@/lib/coverageBoardApi';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

interface CoverageTimelineProps {
  groups: AgentGroup[];
  selectedDayIndex: number; // 0=Sun, 1=Mon ... 6=Sat
  selectedDayName: string;
  overrides: CoverageOverride[];
  leaves: LeaveForDate[];
  showEffective: boolean;
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

function AgentRow({
  agent,
  dayIndex,
  dayName,
  override,
  leave,
  showEffective,
}: {
  agent: AgentScheduleRow;
  dayIndex: number;
  dayName: string;
  override?: CoverageOverride;
  leave?: LeaveForDate;
  showEffective: boolean;
}) {
  const displayName = agent.agent_name || agent.full_name || agent.email;
  const agentIsDayOff = isDayOff(agent, dayName);
  const { schedule, otSchedule } = getScheduleForDay(agent, dayIndex);

  // Determine effective schedule
  let effectiveSchedule = schedule;
  let effectiveOt = otSchedule;
  let isOverridden = false;

  if (showEffective && override) {
    effectiveSchedule = `${override.override_start} - ${override.override_end}`;
    effectiveOt = null;
    isOverridden = true;
  }

  const regularRange = effectiveSchedule ? parseScheduleRange(effectiveSchedule) : null;
  const otRange = effectiveOt ? parseScheduleRange(effectiveOt) : null;
  const leaveRange = leave ? (() => {
    const lStart = parseScheduleRange(`${leave.start_time} - ${leave.end_time}`);
    return lStart;
  })() : null;

  return (
    <div className="contents group">
      {/* Agent name cell */}
      <div className="sticky left-0 z-10 bg-card border-b border-r border-border px-2 py-1.5 text-xs font-medium truncate flex items-center min-h-[32px]">
        {displayName}
      </div>
      {/* Timeline cell */}
      <div className="relative border-b border-border min-h-[32px]">
        {/* Hour grid lines */}
        {HOURS.map(h => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-border/30"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* Day off */}
        {agentIsDayOff && !isOverridden && (
          <ShiftBlock
            startHour={0}
            endHour={24}
            type="dayoff"
            agentName={displayName}
            startLabel="Day Off"
            endLabel=""
            supportType={agent.position || undefined}
          />
        )}

        {/* Regular shift */}
        {regularRange && !agentIsDayOff && (
          <ShiftBlock
            startHour={regularRange.start}
            endHour={regularRange.end}
            type={isOverridden ? 'override' : 'regular'}
            agentName={displayName}
            startLabel={effectiveSchedule?.split(/\s*[-–]\s*/)[0] || ''}
            endLabel={effectiveSchedule?.split(/\s*[-–]\s*/)[1] || ''}
            supportType={agent.position || undefined}
            isOverridden={isOverridden}
          />
        )}

        {/* Override on day off */}
        {isOverridden && agentIsDayOff && regularRange && (
          <ShiftBlock
            startHour={regularRange.start}
            endHour={regularRange.end}
            type="override"
            agentName={displayName}
            startLabel={effectiveSchedule?.split(/\s*[-–]\s*/)[0] || ''}
            endLabel={effectiveSchedule?.split(/\s*[-–]\s*/)[1] || ''}
            supportType={agent.position || undefined}
            isOverridden
          />
        )}

        {/* OT shift */}
        {otRange && !isOverridden && (
          <ShiftBlock
            startHour={otRange.start}
            endHour={otRange.end}
            type="ot"
            agentName={displayName}
            startLabel={effectiveOt?.split(/\s*[-–]\s*/)[0] || ''}
            endLabel={effectiveOt?.split(/\s*[-–]\s*/)[1] || ''}
            supportType={agent.position || undefined}
          />
        )}

        {/* Outage overlay */}
        {showEffective && leaveRange && (
          <ShiftBlock
            startHour={leaveRange.start}
            endHour={leaveRange.end}
            type="outage"
            agentName={displayName}
            startLabel={leave!.start_time}
            endLabel={leave!.end_time}
            outageReason={leave!.outage_reason}
          />
        )}
      </div>
    </div>
  );
}

export function CoverageTimeline({
  groups,
  selectedDayIndex,
  selectedDayName,
  overrides,
  leaves,
  showEffective,
}: CoverageTimelineProps) {
  const { now } = usePortalClock();

  // Current time indicator position
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimePercent = (currentHour / 24) * 100;

  // Build lookup maps
  const overrideMap = useMemo(() => {
    const map = new Map<string, CoverageOverride>();
    for (const o of overrides) map.set(o.agent_id, o);
    return map;
  }, [overrides]);

  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveForDate>();
    for (const l of leaves) map.set(l.agent_email.toLowerCase(), l);
    return map;
  }, [leaves]);

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-card">
      <div
        className="grid min-w-[1200px]"
        style={{ gridTemplateColumns: '180px 1fr' }}
      >
        {/* Header row */}
        <div className="sticky left-0 z-20 bg-muted border-b border-r border-border px-2 py-2 text-xs font-semibold text-muted-foreground">
          Agent
        </div>
        <div className="relative border-b border-border bg-muted">
          <div className="flex">
            {HOURS.map(h => (
              <div
                key={h}
                className="flex-1 text-center text-[10px] text-muted-foreground py-2 border-l border-border/30 first:border-l-0"
              >
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
        </div>

        {/* Agent rows grouped */}
        {groups.map(group => (
          <div key={group.label} className="contents">
            <GroupHeader label={group.label} agentCount={group.agents.length} />
            {group.agents.map(agent => (
              <AgentRow
                key={agent.id}
                agent={agent}
                dayIndex={selectedDayIndex}
                dayName={selectedDayName}
                override={overrideMap.get(agent.id)}
                leave={leaveMap.get(agent.email.toLowerCase())}
                showEffective={showEffective}
              />
            ))}
          </div>
        ))}

        {/* Current time indicator - spans the timeline column */}
        <div className="sticky left-0" />
        <div className="relative h-0">
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
            style={{
              left: `${currentTimePercent}%`,
              height: '9999px',
              marginTop: '-9999px',
            }}
          />
        </div>
      </div>
    </div>
  );
}
