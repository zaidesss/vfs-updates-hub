import { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { DashboardWeekSelector } from '@/components/dashboard/DashboardWeekSelector';
import { CoverageTimeline } from '@/components/coverage-board/CoverageTimeline';
import { CoverageFilters, EMPTY_FILTERS, applyFilters, type CoverageFilterState } from '@/components/coverage-board/CoverageFilters';
import { OverrideEditor, type PendingOverride } from '@/components/coverage-board/OverrideEditor';
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
      next.set(`${override.agent_id}:${override.date}`, override);
      return next;
    });
  }, []);

  const handleRemoveOverride = useCallback((agentId: string, dateStr: string) => {
    const key = `${agentId}:${dateStr}`;
    const existingInDb = overrideByKey.get(key);
    setPendingOverrides(prev => {
      const next = new Map(prev);
      if (existingInDb) {
        // Mark for deletion on save
        next.set(key, { agent_id: agentId, date: dateStr, override_start: '', override_end: '', reason: '', _delete: true });
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [overrideByKey]);

  const handleSave = async () => {
    if (pendingOverrides.size === 0) return;
    setSaving(true);
    try {
      for (const [key, pending] of pendingOverrides) {
        if (pending._delete) {
          const existing = overrideByKey.get(key);
          if (existing) await deleteOverride(existing.id);
        } else {
          await upsertOverride({
            agent_id: pending.agent_id,
            date: pending.date,
            override_start: pending.override_start,
            override_end: pending.override_end,
            reason: pending.reason,
            created_by: user?.email || '',
          });
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
  const editorKey = editorAgent && editorDate ? `${editorAgent.id}:${format(editorDate, 'yyyy-MM-dd')}` : '';
  const editorExistingOverride = editorKey ? overrideByKey.get(editorKey) || null : null;
  const editorPendingOverride = editorKey ? pendingOverrides.get(editorKey) || null : null;

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
                <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving || totalPending === 0}>
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
          />
        )}
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
    </Layout>
  );
}
