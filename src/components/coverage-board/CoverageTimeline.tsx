import { useMemo } from 'react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { usePortalClock } from '@/context/PortalClockContext';
import { ShiftBlock, POSITION_COLORS } from './ShiftBlock';
import { MainGroupHeader, SubGroupHeader } from './GroupHeader';
import {
  HOURS_PER_DAY,
  DAYS_IN_WEEK,
  TOTAL_HOUR_COLS,
  getDisplayName,
  computeDailyHours,
  formatDaysOff,
  getEffectiveBlocks,
  type AgentGroup,
  type AgentScheduleRow,
  type CoverageOverride,
  type LeaveForDate,
} from '@/lib/coverageBoardApi';

// ── CSS gradient background for hour + day lines ────────────────────────────

const hourWidthPct = (1 / TOTAL_HOUR_COLS) * 100;
const dayWidthPct = (HOURS_PER_DAY / TOTAL_HOUR_COLS) * 100;

const TIMELINE_BG = [
  // Thin hour lines
  `repeating-linear-gradient(90deg, hsl(var(--border) / 0.25) 0px, hsl(var(--border) / 0.25) 1px, transparent 1px, transparent ${hourWidthPct}%)`,
  // Strong day separator lines
  `repeating-linear-gradient(90deg, hsl(var(--border)) 0px, hsl(var(--border)) 2px, transparent 2px, transparent ${dayWidthPct}%)`,
].join(', ');

// ── Sticky widths & offsets ─────────────────────────────────────────────────

const COL_DAILY_W = 70;
const COL_OFF_W = 90;
const COL_NAME_W = 150;
const COL_OFF_LEFT = COL_DAILY_W;
const COL_NAME_LEFT = COL_DAILY_W + COL_OFF_W;

const STICKY_CELL = 'sticky z-10 border-b border-r border-border';
const HEADER_STICKY = 'sticky z-20 border-b border-r border-border bg-muted';

// ── Hour labels ─────────────────────────────────────────────────────────────

const HOUR_LABELS = Array.from({ length: HOURS_PER_DAY }, (_, i) => `${i}:00`);

// ── Day label row items ─────────────────────────────────────────────────────

const DAY_LABELS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// ── Component ───────────────────────────────────────────────────────────────

interface CoverageTimelineProps {
  groups: AgentGroup[];
  weekStart: Date;
  overrides: CoverageOverride[];
  leaves: LeaveForDate[];
  showEffective: boolean;
}

export function CoverageTimeline({
  groups,
  weekStart,
  overrides,
  leaves,
  showEffective,
}: CoverageTimelineProps) {
  const { now } = usePortalClock();

  // Build lookup maps keyed by "agentId:dateStr" and "email:dateStr"
  const overrideMap = useMemo(() => {
    const map = new Map<string, CoverageOverride>();
    for (const o of overrides) map.set(`${o.agent_id}:${o.date}`, o);
    return map;
  }, [overrides]);

  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveForDate[]>();
    for (const l of leaves) {
      // A leave can span multiple days; index by each date in range
      const key = l.agent_email.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [leaves]);

  // Current time indicator
  const dayOffsetNow = differenceInCalendarDays(now, weekStart);
  const isCurrentWeek = dayOffsetNow >= 0 && dayOffsetNow < DAYS_IN_WEEK;
  const currentTimePct = isCurrentWeek
    ? ((dayOffsetNow * HOURS_PER_DAY + now.getHours() + now.getMinutes() / 60) / TOTAL_HOUR_COLS) * 100
    : -1;

  const todayStr = format(now, 'yyyy-MM-dd');

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-2 text-xs text-muted-foreground">
        {Object.entries(POSITION_COLORS).map(([label, cls]) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm border ${cls}`} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border bg-violet-500/80 border-violet-600" />
          OT
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border bg-amber-500/70 border-amber-600" />
          Override
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border bg-red-500/30 border-red-500" />
          Outage
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border bg-zinc-500/50 border-zinc-500/60" />
          Day Off
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border bg-zinc-700/70 border-zinc-600/50" />
          No Schedule
        </span>
        {isCurrentWeek && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-yellow-500" />
            Now (EST)
          </span>
        )}
      </div>
      <div className="overflow-auto border border-border rounded-lg bg-card" data-table-scroll style={{ height: 'calc(100vh - 220px)' }}>
      {/* ─── Header Row 1: Day labels ─── */}
      <div
        className="grid min-w-[5000px] sticky top-0 z-30 bg-muted"
        style={{ gridTemplateColumns: `${COL_DAILY_W}px ${COL_OFF_W}px ${COL_NAME_W}px repeat(${TOTAL_HOUR_COLS}, minmax(28px, 1fr))` }}
      >
        {/* 3 blank sticky headers */}
        <div className={HEADER_STICKY} style={{ left: 0, width: COL_DAILY_W }} />
        <div className={HEADER_STICKY} style={{ left: COL_OFF_LEFT, width: COL_OFF_W }} />
        <div className={HEADER_STICKY} style={{ left: COL_NAME_LEFT, width: COL_NAME_W }} />

        {/* Day labels spanning 24 cols each */}
        {DAY_LABELS_SHORT.map((label, dayIdx) => {
          const dayDate = addDays(weekStart, dayIdx);
          const dateStr = format(dayDate, 'yyyy-MM-dd');
          const isToday = dateStr === todayStr;
          return (
            <div
              key={label}
              className={`text-center text-[11px] font-bold py-1.5 border-b border-border ${isToday ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
              style={{ gridColumn: `span ${HOURS_PER_DAY}` }}
            >
              {label} <span className="font-normal text-[10px] opacity-70">{format(dayDate, 'MMM d')}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Header Row 2: Column labels + hour labels ─── */}
      <div
        className="grid min-w-[5000px] sticky top-[30px] z-30 bg-muted"
        style={{ gridTemplateColumns: `${COL_DAILY_W}px ${COL_OFF_W}px ${COL_NAME_W}px repeat(${TOTAL_HOUR_COLS}, minmax(28px, 1fr))` }}
      >
        <div className={`${HEADER_STICKY} px-1 py-1 text-[10px] font-semibold text-muted-foreground flex items-center justify-center`} style={{ left: 0, width: COL_DAILY_W }}>
          HRS
        </div>
        <div className={`${HEADER_STICKY} px-1 py-1 text-[10px] font-semibold text-muted-foreground flex items-center justify-center`} style={{ left: COL_OFF_LEFT, width: COL_OFF_W }}>
          OFF
        </div>
        <div className={`${HEADER_STICKY} px-1 py-1 text-[10px] font-semibold text-muted-foreground flex items-center`} style={{ left: COL_NAME_LEFT, width: COL_NAME_W }}>
          AGENT
        </div>

        {/* 168 hour labels */}
        {Array.from({ length: DAYS_IN_WEEK }).map((_, dayIdx) =>
          HOUR_LABELS.map((lbl, hr) => (
            <div
              key={`${dayIdx}-${hr}`}
              className={`text-center text-[9px] text-muted-foreground py-1 border-b border-border ${hr === 0 ? 'border-l border-l-border' : 'border-l border-l-border/20'}`}
            >
              {lbl}
            </div>
          ))
        )}
      </div>

      {/* ─── Agent rows ─── */}
      {groups.map(group => {
        const totalCount = group.subGroups.reduce((s, sg) => s + sg.agents.length, 0);
        return (
          <div key={group.label}>
            <MainGroupHeader label={group.label} totalCount={totalCount} />
            {group.subGroups.map(sub => (
              <div key={sub.subLabel}>
                <SubGroupHeader subLabel={sub.subLabel} agentCount={sub.agents.length} />
                {sub.agents.map(agent => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    weekStart={weekStart}
                    overrideMap={overrideMap}
                    leaveMap={leaveMap}
                    showEffective={showEffective}
                    currentTimePct={currentTimePct}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── Agent Row ───────────────────────────────────────────────────────────────

function AgentRow({
  agent,
  weekStart,
  overrideMap,
  leaveMap,
  showEffective,
  currentTimePct,
}: {
  agent: AgentScheduleRow;
  weekStart: Date;
  overrideMap: Map<string, CoverageOverride>;
  leaveMap: Map<string, LeaveForDate[]>;
  showEffective: boolean;
  currentTimePct: number;
}) {
  const displayName = getDisplayName(agent);
  const dailyHrs = computeDailyHours(agent);
  const daysOff = formatDaysOff(agent);

  // Collect all blocks for all 7 days
  const allBlocks = useMemo(() => {
    const blocks: Array<{ dayOffset: number; startHour: number; endHour: number; type: string; startLabel: string; endLabel: string; isOverridden?: boolean; outageReason?: string }> = [];

    for (let dayOff = 0; dayOff < DAYS_IN_WEEK; dayOff++) {
      const dateStr = format(addDays(weekStart, dayOff), 'yyyy-MM-dd');
      const override = overrideMap.get(`${agent.id}:${dateStr}`);

      // Find leave for this agent on this date
      const agentLeaves = leaveMap.get(agent.email.toLowerCase()) || [];
      const leave = agentLeaves.find(l => {
        return dateStr >= l.start_date && dateStr <= l.end_date;
      });

      const dayBlocks = getEffectiveBlocks(agent, dayOff, override, leave, showEffective);
      blocks.push(...dayBlocks);
    }

    return blocks;
  }, [agent, weekStart, overrideMap, leaveMap, showEffective]);

  return (
    <div
      className="grid min-w-[5000px]"
      style={{ gridTemplateColumns: `${COL_DAILY_W}px ${COL_OFF_W}px ${COL_NAME_W}px 1fr` }}
    >
      {/* Sticky: Daily Hours */}
      <div
        className={`${STICKY_CELL} bg-card px-1 flex items-center justify-center text-[10px] text-muted-foreground font-mono`}
        style={{ left: 0, width: COL_DAILY_W, minHeight: 32 }}
      >
        {dailyHrs}
      </div>

      {/* Sticky: Days Off */}
      <div
        className={`${STICKY_CELL} bg-card px-1 flex items-center justify-center text-[10px] text-muted-foreground`}
        style={{ left: COL_OFF_LEFT, width: COL_OFF_W, minHeight: 32 }}
      >
        {daysOff}
      </div>

      {/* Sticky: Agent Name */}
      <div
        className={`${STICKY_CELL} bg-card px-2 flex items-center text-xs font-medium truncate`}
        style={{ left: COL_NAME_LEFT, width: COL_NAME_W, minHeight: 32 }}
      >
        {displayName}
      </div>

      {/* Timeline cell */}
      <div
        className="relative border-b border-border bg-zinc-800/50"
        style={{
          minHeight: 32,
          backgroundImage: TIMELINE_BG,
          backgroundSize: '100% 100%',
        }}
      >
        {allBlocks.map((block, idx) => (
          <ShiftBlock
            key={idx}
            dayOffset={block.dayOffset}
            startHour={block.startHour}
            endHour={block.endHour}
            type={block.type as any}
            agentName={displayName}
            startLabel={block.startLabel}
            endLabel={block.endLabel}
            supportType={agent.position || undefined}
            isOverridden={block.isOverridden}
            outageReason={block.outageReason}
          />
        ))}

        {/* Current time indicator */}
        {currentTimePct >= 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-yellow-500 z-20 pointer-events-none"
            style={{ left: `${currentTimePct}%` }}
          />
        )}
      </div>
    </div>
  );
}
