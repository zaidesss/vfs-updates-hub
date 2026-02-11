import { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { DashboardWeekSelector } from '@/components/dashboard/DashboardWeekSelector';
import { CoverageTimeline } from '@/components/coverage-board/CoverageTimeline';
import { CoverageFilters, EMPTY_FILTERS, applyFilters, type CoverageFilterState } from '@/components/coverage-board/CoverageFilters';
import { OverrideEditor, type PendingOverride } from '@/components/coverage-board/OverrideEditor';
import { SaveConfirmationDialog } from '@/components/coverage-board/SaveConfirmationDialog';
import { CoverageActivityLog } from '@/components/coverage-board/CoverageActivityLog';
import { decimalToTimeLabel } from '@/components/coverage-board/ShiftBlock';
import { usePortalClock } from '@/context/PortalClockContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAgentSchedules,
  fetchOverridesForWeek,
  fetchLeavesForWeek,
  groupAgents,
  upsertOverride,
  deleteOverride,
  insertOverrideLog,
  type AgentScheduleRow,
  type CoverageOverride,
} from '@/lib/coverageBoardApi';

export default function CoverageBoard() {
  const { now } = usePortalClock();
  const { user, isAdmin, isSuperAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = isAdmin || isSuperAdmin || isHR;

  const [weekStart, setWeekStart] = useState(() => startOfWeek(now, { weekStartsOn: 1 }));
  const [showEffective, setShowEffective] = useState(true);
  const [filters, setFilters] = useState<CoverageFilterState>(EMPTY_FILTERS);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [pendingOverrides, setPendingOverrides] = useState<Map<string, PendingOverride>>(new Map());
  const [saving, setSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Override editor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorAgent, setEditorAgent] = useState<AgentScheduleRow | null>(null);
  const [editorDate, setEditorDate] = useState<Date | null>(null);
  const [editorDayOffset, setEditorDayOffset] = useState(0);

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

  // Build override lookup for editor
  const overrideByKey = useMemo(() => {
    const map = new Map<string, CoverageOverride>();
    for (const o of overrides) map.set(`${o.agent_id}:${o.date}`, o);
    return map;
  }, [overrides]);

  // Edit mode handlers
  const handleCellClick = useCallback((agent: AgentScheduleRow, dayOffset: number, date: Date) => {
    setEditorAgent(agent);
    setEditorDate(date);
    setEditorDayOffset(dayOffset);
    setEditorOpen(true);
  }, []);

  const handleApplyOverride = useCallback((override: PendingOverride) => {
    setPendingOverrides(prev => {
      const next = new Map(prev);
      const typeKey = override.block_type || 'override';
      next.set(`${override.agent_id}:${override.date}:${typeKey}`, override);
      return next;
    });
  }, []);

  // Handle block drag/resize adjustments from the timeline
  const handleBlockAdjust = useCallback((agent: AgentScheduleRow, dayOffset: number, newStartHour: number, newEndHour: number, blockType: string) => {
    const dateStr = format(addDays(weekStart, dayOffset), 'yyyy-MM-dd');
    const startLabel = decimalToTimeLabel(newStartHour);
    // If end > 24, wrap to next-day time label
    const endLabel = newEndHour > 24 ? decimalToTimeLabel(newEndHour - 24) : decimalToTimeLabel(newEndHour);
    const validType = (blockType === 'regular' || blockType === 'ot' || blockType === 'dayoff') ? blockType : 'override';
    handleApplyOverride({
      agent_id: agent.id,
      date: dateStr,
      override_start: startLabel,
      override_end: endLabel,
      reason: 'drag adjustment',
      block_type: validType as PendingOverride['block_type'],
    });
  }, [weekStart, handleApplyOverride]);

  const handleRemoveOverride = useCallback((agentId: string, dateStr: string) => {
    const dbKey = `${agentId}:${dateStr}`;
    const existingInDb = overrideByKey.get(dbKey);
    setPendingOverrides(prev => {
      const next = new Map(prev);
      // Remove all block-type keys for this agent+date
      for (const k of Array.from(next.keys())) {
        if (k.startsWith(dbKey + ':')) next.delete(k);
      }
      if (existingInDb) {
        // Mark for deletion on save
        next.set(`${dbKey}:override`, { agent_id: agentId, date: dateStr, override_start: '', override_end: '', reason: '', _delete: true });
      }
      return next;
    });
  }, [overrideByKey]);

   const handleSave = async () => {
     if (pendingOverrides.size === 0) return;
     setSaving(true);
     try {
       // Helper function to parse time label to decimal hours
       const parseTimeToDecimal = (timeLabel: string): number | null => {
         if (!timeLabel) return null;
         const match = timeLabel.match(/^(\d+):(\d+)(?:\s*(AM|PM))?$/i);
         if (!match) return null;
         let hour = parseInt(match[1]);
         const min = parseInt(match[2]) || 0;
         const period = match[3]?.toUpperCase();
         if (period === 'PM' && hour !== 12) hour += 12;
         if (period === 'AM' && hour === 12) hour = 0;
         return hour + min / 60;
       };

       // First pass: save all pending overrides
       for (const [key, pending] of pendingOverrides) {
         if (pending._delete) {
           const existing = overrideByKey.get(key);
           if (existing) await deleteOverride(existing.id);
         } else {
           const overrideType = pending.block_type || 'override';
           await upsertOverride({
             agent_id: pending.agent_id,
             date: pending.date,
             override_start: pending.override_start,
             override_end: pending.override_end,
             reason: pending.reason,
             created_by: user?.email || '',
             override_type: overrideType,
             break_schedule: undefined,
             previous_value: undefined,
           });
           
           // Insert log entry
           const agent = agents.find(a => a.id === pending.agent_id);
           if (agent) {
             await insertOverrideLog({
               agent_id: pending.agent_id,
               agent_name: agent.full_name || agent.agent_name || agent.email,
               date: pending.date,
               override_type: overrideType,
               previous_value: null,
               new_value: `${pending.override_start} - ${pending.override_end}`,
               changed_by: user?.email || '',
             });
           }
         }
       }

       // Second pass: detect and resolve overnight shift conflicts
       for (const [key, pending] of pendingOverrides) {
         if (pending._delete || !pending.block_type || !['ot', 'regular'].includes(pending.block_type)) continue;
         
         const endDecimal = parseTimeToDecimal(pending.override_end);
         if (endDecimal === null) continue;

         // Check if this block extends past midnight (overnight shift)
         const startDecimal = parseTimeToDecimal(pending.override_start);
         if (startDecimal !== null && endDecimal > 24) {
           // This is an overnight shift
           const agent = agents.find(a => a.id === pending.agent_id);
           if (!agent) continue;

           // Check if next day is a day off
           const currentDate = new Date(pending.date);
           const nextDate = addDays(currentDate, 1);
           const nextDateStr = format(nextDate, 'yyyy-MM-dd');
           
           // Determine if next day is a day off
           const nextJsDay = nextDate.getDay();
           const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
           const nextDayName = DAY_NAMES[nextJsDay];
           const isNextDayOff = agent.day_off?.some(d => d.toLowerCase().substring(0, 3) === nextDayName.substring(0, 3));

           if (isNextDayOff) {
             // Automatically create a day-off override shortened to when the overnight shift ends
             const shortendedEndTime = decimalToTimeLabel(endDecimal - 24);
             
             await upsertOverride({
               agent_id: pending.agent_id,
               date: nextDateStr,
               override_start: '0:00',
               override_end: shortendedEndTime,
               reason: `Auto-adjusted: overnight shift from ${format(currentDate, 'MMM d')} ends at ${shortendedEndTime}`,
               created_by: user?.email || '',
               override_type: 'dayoff',
               break_schedule: undefined,
               previous_value: 'full day off',
             });

             // Log the automatic adjustment
             await insertOverrideLog({
               agent_id: pending.agent_id,
               agent_name: agent.full_name || agent.agent_name || agent.email,
               date: nextDateStr,
               override_type: 'dayoff',
               previous_value: 'full day off',
               new_value: `0:00 - ${shortendedEndTime}`,
               changed_by: user?.email || 'system',
             });

             toast.info(`Auto-adjusted: ${agent.agent_name || agent.email}'s day off on ${format(nextDate, 'MMM d')} shortened due to overnight shift.`);
           }
         }
       }

       toast.success(`${pendingOverrides.size} override(s) saved`);
       queryClient.invalidateQueries({ queryKey: ['coverage-overrides'] });
       setPendingOverrides(new Map());
       setEditMode(false);
     } catch (err: any) {
       toast.error(err.message || 'Failed to save overrides');
     } finally {
       setSaving(false);
     }
   };

  const handleCancel = () => {
    setPendingOverrides(new Map());
    setEditMode(false);
  };

  const pendingCount = Array.from(pendingOverrides.values()).filter(p => !p._delete).length;
  const deleteCount = Array.from(pendingOverrides.values()).filter(p => p._delete).length;
  const totalPending = pendingCount + deleteCount;

  // Get current editor context
  const editorBaseKey = editorAgent && editorDate ? `${editorAgent.id}:${format(editorDate, 'yyyy-MM-dd')}` : '';
  const editorExistingOverride = editorBaseKey ? overrideByKey.get(editorBaseKey) || null : null;
  const editorPendingOverride = editorBaseKey ? pendingOverrides.get(`${editorBaseKey}:override`) || null : null;

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

            {/* Edit mode buttons */}
            {canEdit && !editMode && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditMode(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {editMode && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setConfirmDialogOpen(true)} disabled={saving || totalPending === 0}>
                  <Save className="h-3.5 w-3.5" /> Save Changes
                  {totalPending > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{totalPending}</Badge>}
                </Button>
              </>
            )}
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
            editMode={editMode}
            pendingOverrides={pendingOverrides}
            onCellClick={handleCellClick}
            onBlockAdjust={handleBlockAdjust}
          />
        )}

        {/* Activity Log */}
        <CoverageActivityLog weekStart={startStr} weekEnd={endStr} />
      </div>

      {/* Override Editor Dialog */}
      <OverrideEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agent={editorAgent}
        date={editorDate}
        dayOffset={editorDayOffset}
        existingOverride={editorExistingOverride}
        pendingOverride={editorPendingOverride}
        onApply={handleApplyOverride}
        onRemove={handleRemoveOverride}
      />

      {/* Save Confirmation Dialog */}
      <SaveConfirmationDialog
        open={confirmDialogOpen}
        pendingOverrides={pendingOverrides}
        agents={agents}
        onCancel={() => setConfirmDialogOpen(false)}
        onConfirm={async () => {
          setConfirmDialogOpen(false);
          await handleSave();
        }}
      />
    </Layout>
  );
}
