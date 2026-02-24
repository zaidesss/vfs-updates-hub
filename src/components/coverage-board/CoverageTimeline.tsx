import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { usePortalClock } from '@/context/PortalClockContext';
import { ShiftBlock, POSITION_COLORS, decimalToTimeLabel, parseTimeToDecimal as parseTimeToDecimalLocal, parseScheduleRange } from './ShiftBlock';
import { MainGroupHeader, SubGroupHeader } from './GroupHeader';
import {
  HOURS_PER_DAY,
  DAYS_IN_WEEK,
  TOTAL_HOUR_COLS,
  getDisplayName,
  computeDailyHours,
  formatDaysOff,
  getEffectiveBlocks,
  getScheduleForDay,
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
  editMode?: boolean;
  pendingOverrides?: Map<string, import('./OverrideEditor').PendingOverride>;
  onCellClick?: (agent: AgentScheduleRow, dayOffset: number, date: Date) => void;
  onBlockAdjust?: (agent: AgentScheduleRow, dayOffset: number, newStartHour: number, newEndHour: number, blockType: string) => void;
}

export function CoverageTimeline({
  groups,
  weekStart,
  overrides,
  leaves,
  showEffective,
  editMode = false,
  pendingOverrides,
  onCellClick,
  onBlockAdjust,
}: CoverageTimelineProps) {
  const { now } = usePortalClock();

  // Measure timeline cell width for drag calculations
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    if (!timelineRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setTimelineWidth(entry.contentRect.width);
    });
    ro.observe(timelineRef.current);
    return () => ro.disconnect();
  }, []);

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

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
      <div ref={timelineRef} className="overflow-auto border border-border rounded-lg bg-card" data-table-scroll style={{ height: 'calc(100vh - 220px)' }}>
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
                    editMode={editMode}
                    pendingOverrides={pendingOverrides}
                    onCellClick={onCellClick}
                    onBlockAdjust={onBlockAdjust}
                    timelineWidth={timelineWidth}
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
  editMode = false,
  pendingOverrides,
  onCellClick,
  onBlockAdjust,
  timelineWidth = 0,
}: {
  agent: AgentScheduleRow;
  weekStart: Date;
  overrideMap: Map<string, CoverageOverride>;
  leaveMap: Map<string, LeaveForDate[]>;
  showEffective: boolean;
  currentTimePct: number;
  editMode?: boolean;
  pendingOverrides?: Map<string, import('./OverrideEditor').PendingOverride>;
  onCellClick?: (agent: AgentScheduleRow, dayOffset: number, date: Date) => void;
  onBlockAdjust?: (agent: AgentScheduleRow, dayOffset: number, newStartHour: number, newEndHour: number, blockType: string) => void;
  timelineWidth?: number;
}) {
  const displayName = getDisplayName(agent);
  const dailyHrs = computeDailyHours(agent);
  const daysOff = formatDaysOff(agent);

  // Collect all blocks for all 7 days
  const allBlocks = useMemo(() => {
    const blocks: Array<{ dayOffset: number; startHour: number; endHour: number; type: string; startLabel: string; endLabel: string; isOverridden?: boolean; outageReason?: string; hasConflict?: boolean; conflictDay?: string }> = [];

    // Pre-compute which days are day-off for conflict detection
    const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const OFFSET_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

    for (let dayOff = 0; dayOff < DAYS_IN_WEEK; dayOff++) {
      const dateStr = format(addDays(weekStart, dayOff), 'yyyy-MM-dd');
      const baseKey = `${agent.id}:${dateStr}`;
      const dbOverride = overrideMap.get(baseKey);
      // Look up per-block-type pending overrides
      const pendingRegular = pendingOverrides?.get(`${baseKey}:regular`);
      const pendingOt = pendingOverrides?.get(`${baseKey}:ot`);
      const pendingDayoff = pendingOverrides?.get(`${baseKey}:dayoff`);
      const pendingOverride = pendingOverrides?.get(`${baseKey}:override`);

      // Find leave for this agent on this date
      const agentLeaves = leaveMap.get(agent.email.toLowerCase()) || [];
      const leave = agentLeaves.find(l => dateStr >= l.start_date && dateStr <= l.end_date);

      const hasTypedPending = (pendingRegular && !pendingRegular._delete) || (pendingOt && !pendingOt._delete) || (pendingDayoff && !pendingDayoff._delete);

      if (hasTypedPending) {
        // Selective merge: get base blocks, then patch each block type independently
        const baseBlocks = getEffectiveBlocks(agent, dayOff, dbOverride, leave, showEffective);

        for (const b of baseBlocks) {
          const typedPending = b.type === 'regular' ? pendingRegular
            : b.type === 'ot' ? pendingOt
            : b.type === 'dayoff' ? pendingDayoff
            : null;

          if (typedPending && !typedPending._delete) {
            const startDec = parseTimeToDecimalLocal(typedPending.override_start);
            const endDec = parseTimeToDecimalLocal(typedPending.override_end);
            if (startDec !== null && endDec !== null) {
              blocks.push({
                ...b,
                startHour: startDec,
                endHour: endDec <= startDec ? 24 + endDec : endDec,
                startLabel: typedPending.override_start,
                endLabel: typedPending.override_end,
              });
            } else {
              blocks.push(b);
            }
          } else {
            blocks.push(b);
          }
        }
      } else {
        // Full replacement behavior (manual dialog override or no typed pending)
        let override = dbOverride;
        if (pendingOverride && !pendingOverride._delete) {
          override = {
            id: dbOverride?.id ?? '',
            agent_id: agent.id,
            date: dateStr,
            override_start: pendingOverride.override_start,
            override_end: pendingOverride.override_end,
            reason: pendingOverride.reason || dbOverride?.reason || '',
            created_at: dbOverride?.created_at ?? '',
            created_by: dbOverride?.created_by ?? null,
          } as CoverageOverride;
        } else if (pendingOverride?._delete) {
          override = undefined;
        }
        const dayBlocks = getEffectiveBlocks(agent, dayOff, override, leave, showEffective);
        blocks.push(...dayBlocks);
      }
    }

    // ── Sunday overnight spillover onto Monday ──
    // Sunday is dayOffset=6, JS day index 0. Check if Sunday's schedule is overnight.
    const sundayOffset = 6;
    const sundayDateStr = format(addDays(weekStart, sundayOffset), 'yyyy-MM-dd');
    const sundayBaseKey = `${agent.id}:${sundayDateStr}`;
    const sundayDbOverride = overrideMap.get(sundayBaseKey);
    const sundayPendingRegular = pendingOverrides?.get(`${sundayBaseKey}:regular`);
    const sundayPendingOt = pendingOverrides?.get(`${sundayBaseKey}:ot`);
    const sundayPendingOverride = pendingOverrides?.get(`${sundayBaseKey}:override`);

    // Helper to check and add spillover for a given schedule string and type
    const addSpillover = (scheduleStr: string | null, type: 'regular' | 'ot') => {
      if (!scheduleStr || scheduleStr.toLowerCase() === 'day off') return;
      const range = parseScheduleRange(scheduleStr);
      if (!range) return;
      // Overnight: end < start (e.g., 10PM=22 to 4:30AM=4.5)
      if (range.end < range.start) {
        const parts = scheduleStr.split(/\s*[-–]\s*/);
        blocks.push({
          dayOffset: 0, // Monday
          startHour: 0,
          endHour: range.end,
          type,
          startLabel: parts[0] || '',
          endLabel: parts[1] || '',
          isOverridden: false,
        });
      }
    };

    // Determine effective Sunday schedule (override > pending > base)
    if (sundayPendingOverride && !sundayPendingOverride._delete) {
      const overrideSchedule = `${sundayPendingOverride.override_start} - ${sundayPendingOverride.override_end}`;
      addSpillover(overrideSchedule, 'regular');
    } else if (sundayDbOverride && showEffective) {
      const overrideSchedule = `${sundayDbOverride.override_start} - ${sundayDbOverride.override_end}`;
      addSpillover(overrideSchedule, 'regular');
    } else {
      // Check base schedule for regular
      const sunJsDay = 0; // Sunday JS day index
      const { schedule: sunSchedule, otSchedule: sunOtSchedule } = getScheduleForDay(agent, sunJsDay);

      if (sundayPendingRegular && !sundayPendingRegular._delete) {
        addSpillover(`${sundayPendingRegular.override_start} - ${sundayPendingRegular.override_end}`, 'regular');
      } else {
        addSpillover(sunSchedule, 'regular');
      }

      if (sundayPendingOt && !sundayPendingOt._delete) {
        addSpillover(`${sundayPendingOt.override_start} - ${sundayPendingOt.override_end}`, 'ot');
      } else {
        addSpillover(sunOtSchedule, 'ot');
      }
    }

    // Day-off conflict detection: if a block's endHour > 24, check if next day is a day off
    for (const block of blocks) {
      if (block.endHour > 24 && block.dayOffset < 6) {
        const nextDayOffset = block.dayOffset + 1;
        const nextJsDay = OFFSET_TO_JS_DAY[nextDayOffset];
        const nextDayName = DAY_NAMES_FULL[nextJsDay];
        const nextIsDayOff = agent.day_off?.some(d => d.toLowerCase().substring(0, 3) === nextDayName.toLowerCase().substring(0, 3));
        if (nextIsDayOff) {
          block.hasConflict = true;
          block.conflictDay = nextDayName;
        }
      }
    }

    return blocks;
  }, [agent, weekStart, overrideMap, leaveMap, showEffective, pendingOverrides]);

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
            supportType={Array.isArray(agent.position) ? agent.position[0] || undefined : agent.position || undefined}
            isOverridden={block.isOverridden}
            outageReason={block.outageReason}
            hasConflict={block.hasConflict}
            conflictDay={block.conflictDay}
            editMode={editMode}
            timelineWidth={timelineWidth}
            onBlockAdjust={onBlockAdjust ? (newStart, newEnd) => onBlockAdjust(agent, block.dayOffset, newStart, newEnd, block.type) : undefined}
          />
        ))}

        {/* Edit mode: day click targets */}
        {editMode && onCellClick && (
          Array.from({ length: DAYS_IN_WEEK }).map((_, dayIdx) => {
            const dayDate = addDays(weekStart, dayIdx);
            const dateStrForDay = format(dayDate, 'yyyy-MM-dd');
            const dayBaseKey = `${agent.id}:${dateStrForDay}`;
            const hasPending = ['regular', 'ot', 'dayoff', 'override'].some(t => {
              const p = pendingOverrides?.get(`${dayBaseKey}:${t}`);
              return p && !p._delete;
            });
            return (
              <div
                key={dayIdx}
                className={`absolute top-0 bottom-0 z-[5] cursor-pointer transition-colors hover:bg-white/10 ${hasPending ? 'ring-2 ring-inset ring-dashed ring-amber-400/70' : ''}`}
                style={{
                  left: `${(dayIdx * HOURS_PER_DAY / TOTAL_HOUR_COLS) * 100}%`,
                  width: `${(HOURS_PER_DAY / TOTAL_HOUR_COLS) * 100}%`,
                }}
                onClick={() => onCellClick(agent, dayIdx, dayDate)}
              />
            );
          })
        )}

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
