import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, getDay } from 'date-fns';
import { useState } from 'react';
import type { PendingOverride } from './OverrideEditor';
import type { AgentScheduleRow } from '@/lib/coverageBoardApi';

/** Look up the agent's base schedule for a given date */
function getBaseScheduleForDate(agent: AgentScheduleRow, date: Date): string {
  const dayIndex = getDay(date); // 0=Sun..6=Sat
  const scheduleMap: Record<number, string | null> = {
    0: agent.sun_schedule,
    1: agent.mon_schedule,
    2: agent.tue_schedule,
    3: agent.wed_schedule,
    4: agent.thu_schedule,
    5: agent.fri_schedule,
    6: agent.sat_schedule,
  };
  const DAY_SHORTS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayShort = DAY_SHORTS[dayIndex];
  const isDayOff = agent.day_off?.some(d => d.substring(0, 3).toLowerCase() === dayShort.toLowerCase());
  if (isDayOff) return 'Day Off';
  return scheduleMap[dayIndex] || 'No Schedule';
}

interface SaveConfirmationDialogProps {
  open: boolean;
  pendingOverrides: Map<string, PendingOverride>;
  agents: AgentScheduleRow[];
  onConfirm: (overridesWithBreaks: Map<string, PendingOverride>) => void;
  onCancel: () => void;
}

export function SaveConfirmationDialog({
  open,
  pendingOverrides,
  agents,
  onConfirm,
  onCancel,
}: SaveConfirmationDialogProps) {
  const [breakSchedules, setBreakSchedules] = useState<Map<string, string>>(new Map());

  // Group overrides by agent+date for display
  const groupedChanges = Array.from(pendingOverrides.entries()).reduce(
    (acc, [key, override]) => {
      if (override._delete) return acc;

      const [agentId, dateStr, blockType] = key.split(':');
      const groupKey = `${agentId}:${dateStr}`;

      if (!acc.has(groupKey)) {
        acc.set(groupKey, []);
      }
      acc.get(groupKey)!.push({ key, override, blockType });
      return acc;
    },
    new Map<string, Array<{ key: string; override: PendingOverride; blockType?: string }>>()
  );

  const changes = Array.from(groupedChanges.entries()).map(([groupKey, blocks]) => {
    const [agentId, dateStr] = groupKey.split(':');
    const agent = agents.find(a => a.id === agentId);
    const agentName = agent?.full_name || agent?.agent_name || agent?.email || 'Unknown';

    return {
      groupKey,
      agentId,
      agentName,
      dateStr,
      date: parseISO(dateStr),
      blocks,
    };
  });

  changes.sort((a, b) => parseISO(a.dateStr).getTime() - parseISO(b.dateStr).getTime());

  const handleConfirm = () => {
    // Merge break schedules back into pending overrides
    const overridesWithBreaks = new Map(pendingOverrides);
    for (const [key, breakSchedule] of breakSchedules.entries()) {
      if (overridesWithBreaks.has(key)) {
        const override = { ...overridesWithBreaks.get(key)! };
        // Store break schedule in the override for later use
        (override as any).break_schedule = breakSchedule;
        overridesWithBreaks.set(key, override);
      }
    }
    onConfirm(overridesWithBreaks);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Review Pending Changes</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes to review.</p>
          ) : (
            changes.map((change) => (
              <div key={change.groupKey} className="space-y-2">
                <h3 className="font-semibold text-sm">
                  {change.agentName} · {format(change.date, 'EEE, MMM d, yyyy')}
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead className="w-32">From</TableHead>
                        <TableHead className="w-32">To</TableHead>
                        <TableHead className="flex-1">Break Schedule</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {change.blocks.map(({ key, override, blockType }) => {
                        const typeLabel = blockType
                          ? blockType.charAt(0).toUpperCase() + blockType.slice(1)
                          : 'Override';

                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium text-xs">{typeLabel}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {(() => {
                                const agent = agents.find(a => a.id === change.agentId);
                                return agent ? getBaseScheduleForDate(agent, change.date) : '—';
                              })()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {override.override_start} – {override.override_end}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Input
                                placeholder="Optional"
                                value={breakSchedules.get(key) || ''}
                                onChange={(e) => {
                                  const newBreaks = new Map(breakSchedules);
                                  if (e.target.value) {
                                    newBreaks.set(key, e.target.value);
                                  } else {
                                    newBreaks.delete(key);
                                  }
                                  setBreakSchedules(newBreaks);
                                }}
                                className="h-7 text-xs"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={changes.length === 0}>
            Confirm Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
