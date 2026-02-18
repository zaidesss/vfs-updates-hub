import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { 
  Target, LogOut, Clock, RotateCcw, Timer, LogIn, DoorOpen, User,
  CheckCircle, XCircle, ArrowUpRight, Coffee, UserX
} from 'lucide-react';
import {
  type AgentReport,
  type ReportStatus,
  type IncidentType,
  INCIDENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  updateReportStatus,
  isEscalatableIncident,
  getOutageReasonForIncident,
} from '@/lib/agentReportsApi';
import { 
  createEscalatedOutageRequest, 
  checkExistingOutageRequest,
  EscalatedOutageInput
} from '@/lib/leaveRequestApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/auditLogApi';
import { EscalationConfirmDialog } from './EscalationConfirmDialog';

interface ReportDetailDialogProps {
  report: AgentReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
  currentUserEmail: string;
  canEdit: boolean;
}

const ICON_MAP: Record<string, typeof Target> = {
  target: Target,
  'log-out': LogOut,
  clock: Clock,
  'rotate-ccw': RotateCcw,
  timer: Timer,
  'log-in': LogIn,
  'door-open': DoorOpen,
  user: User,
  coffee: Coffee,
  'user-x': UserX,
};

// Convert minutes from midnight to HH:MM format
function formatMinutesToTime(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function ReportDetailDialog({
  report,
  open,
  onOpenChange,
  onStatusUpdated,
  currentUserEmail,
  canEdit,
}: ReportDetailDialogProps) {
  const [notes, setNotes] = useState(report?.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  if (!report) return null;

  const config = INCIDENT_TYPE_CONFIG[report.incident_type];
  const Icon = ICON_MAP[config.icon] || Target;
  const severityConfig = SEVERITY_CONFIG[report.severity];
  const statusConfig = STATUS_CONFIG[report.status];
  const canEscalate = isEscalatableIncident(report.incident_type);
  const outageReason = getOutageReasonForIncident(report.incident_type);

  const handleStatusUpdate = async (newStatus: ReportStatus) => {
    setIsUpdating(true);
    const result = await updateReportStatus(report.id, newStatus, currentUserEmail, notes);
    setIsUpdating(false);

    if (result.success) {
      toast({ title: 'Status Updated', description: `Report marked as ${STATUS_CONFIG[newStatus].label.toLowerCase()}` });
      writeAuditLog({
        area: 'Agent Reports',
        action_type: 'updated',
        entity_id: report.id,
        entity_label: report.agent_name,
        changed_by: currentUserEmail,
        changes: { status: { old: report.status, new: newStatus } },
        metadata: { incident_type: report.incident_type, agent_email: report.agent_email },
      });
      onStatusUpdated();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update status', variant: 'destructive' });
    }
  };

  // Calculate escalation time range based on incident type
  const getEscalationTimeRange = (): { startTime: string; endTime: string } => {
    const details = report.details || {};
    
    switch (report.incident_type) {
      case 'LATE_LOGIN': {
        // Backend stores: scheduledStart (minutes), actualLogin (minutes), lateByMinutes
        const scheduleStartMins = details.scheduledStart;
        const loginMins = details.actualLogin;
        
        if (scheduleStartMins !== undefined && loginMins !== undefined) {
          // Start time: schedule + 5min grace
          const graceMinutes = scheduleStartMins + 5;
          const startTime = formatMinutesToTime(graceMinutes);
          
          // End time: 1 min before actual login
          const endTime = formatMinutesToTime(Math.max(0, loginMins - 1));
          
          return { startTime, endTime };
        }
        return { startTime: '09:00', endTime: '10:00' }; // Fallback
      }
      case 'EARLY_OUT': {
        // Backend stores: actualLogout (minutes), scheduledEnd (minutes)
        const logoutMins = details.actualLogout;
        const scheduleEndMins = details.scheduledEnd;
        
        if (logoutMins !== undefined && scheduleEndMins !== undefined) {
          return { 
            startTime: formatMinutesToTime(logoutMins), 
            endTime: formatMinutesToTime(scheduleEndMins) 
          };
        }
        return { startTime: '17:00', endTime: '18:00' };
      }
      case 'TIME_NOT_MET': {
        // Use shortfallMinutes to calculate gap
        const shortfallMins = details.shortfallMinutes || 0;
        const scheduleEndMins = details.scheduledEnd || 18 * 60; // Default 6PM
        
        const startMins = Math.max(0, scheduleEndMins - shortfallMins);
        return { 
          startTime: formatMinutesToTime(startMins), 
          endTime: formatMinutesToTime(scheduleEndMins) 
        };
      }
      case 'EXCESSIVE_RESTARTS': {
        // Restarts track cumulative duration - use a placeholder range
        // The duration is in durationMinutes but we don't have specific timestamps
        const durationMins = details.durationMinutes || 0;
        // Default to a 1-hour window starting at 9 AM for equipment issues
        return { startTime: '09:00', endTime: formatMinutesToTime(9 * 60 + Math.max(durationMins, 60)) };
      }
      default:
        return { startTime: '09:00', endTime: '10:00' };
    }
  };

  const handleEscalate = async () => {
    setIsEscalating(true);
    
    try {
      // Check for existing outage request
      const existingCheck = await checkExistingOutageRequest(
        report.agent_email,
        report.incident_date,
        outageReason
      );
      
      if (existingCheck.data === true) {
        toast({
          title: 'Duplicate Request',
          description: `An outage request for "${outageReason}" already exists for this agent on this date.`,
          variant: 'destructive',
        });
        setIsEscalating(false);
        setShowEscalationDialog(false);
        return;
      }
      
      // Fetch agent profile for client/team lead/role
      const { data: profile } = await supabase
        .from('agent_profiles')
        .select('clients, team_lead, position')
        .eq('email', report.agent_email.toLowerCase())
        .maybeSingle();
      
      const { startTime, endTime } = getEscalationTimeRange();
      
      const input: EscalatedOutageInput = {
        agent_email: report.agent_email,
        agent_name: report.agent_name,
        client_name: profile?.clients || 'Unknown',
        team_lead_name: profile?.team_lead || 'Unknown',
        role: profile?.position || 'Unknown',
        start_date: report.incident_date,
        start_time: startTime,
        end_time: endTime,
        outage_reason: outageReason as 'Late Login' | 'Undertime' | 'Equipment Issue',
      };
      
      const result = await createEscalatedOutageRequest(input);
      
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        setIsEscalating(false);
        return;
      }
      
      // Update report status to reviewed (escalated)
      await updateReportStatus(report.id, 'reviewed', currentUserEmail, notes);
      
      toast({
        title: 'Outage Request Created',
        description: `Request ${result.data?.reference_number || ''} created for ${report.agent_name}`,
      });

      writeAuditLog({
        area: 'Agent Reports',
        action_type: 'updated',
        entity_id: report.id,
        entity_label: report.agent_name,
        changed_by: currentUserEmail,
        changes: { status: { old: report.status, new: 'reviewed' } },
        metadata: {
          incident_type: report.incident_type,
          agent_email: report.agent_email,
          escalated_to: 'outage_request',
          outage_reference: result.data?.reference_number || null,
        },
      });

      onStatusUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to escalate report',
        variant: 'destructive',
      });
    } finally {
      setIsEscalating(false);
      setShowEscalationDialog(false);
    }
  };

  const { startTime: escalationStartTime, endTime: escalationEndTime } = canEscalate ? getEscalationTimeRange() : { startTime: '', endTime: '' };

  // Render incident-specific details
  const renderDetails = () => {
    const details = report.details || {};

    switch (report.incident_type) {
      case 'QUOTA_NOT_MET':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Quota</span>
              <span className="font-medium">{details.expectedQuota ?? '-'} tickets</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Count</span>
              <span className="font-medium">{details.actualTotal ?? '-'} tickets</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shortfall</span>
              <span className="font-medium text-red-600">{details.shortfall ?? '-'} tickets</span>
            </div>
            {details.breakdown && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                <p>Breakdown: Email: {details.breakdown.email || 0}, Chat: {details.breakdown.chat || 0}, Call: {details.breakdown.call || 0}</p>
              </div>
            )}
          </div>
        );

      case 'EXCESSIVE_RESTARTS':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restart Duration</span>
              <span className="font-medium">{details.durationMinutes || '-'} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Limit</span>
              <span className="font-medium">5 mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exceeded By</span>
              <span className="font-medium text-red-600">
                {details.durationMinutes ? Math.max(0, details.durationMinutes - 5) : 0} mins
              </span>
            </div>
          </div>
        );

      case 'BIO_OVERUSE':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bio Time Used</span>
              <span className="font-medium">{details.totalBioSeconds ? Math.ceil(details.totalBioSeconds / 60) : '-'} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allowance</span>
              <span className="font-medium">{details.bioAllowance ? Math.ceil(details.bioAllowance / 60) : '-'} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exceeded By</span>
              <span className="font-medium text-red-600">
                {details.overageSeconds ? Math.ceil(details.overageSeconds / 60) : 0} mins
              </span>
            </div>
          </div>
        );

      case 'NO_LOGOUT':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Login</span>
              <span className="font-medium">
                {details.loginTime 
                  ? format(new Date(details.loginTime), 'h:mm a')
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Logout</span>
              <span className="font-medium">{formatMinutesToTime(details.scheduledEnd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-Logged Out</span>
              <span className="font-medium">{details.autoLoggedOut ? 'Yes' : 'No'}</span>
            </div>
          </div>
        );

      case 'HIGH_GAP':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Gap</span>
              <span className="font-medium">{details.avgGapSeconds ? Math.round(details.avgGapSeconds / 60) : '-'} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Count</span>
              <span className="font-medium">{details.ticketCount || '-'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: High gap is only flagged when daily quota is not met.
            </p>
          </div>
        );

      case 'LATE_LOGIN':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule Start</span>
              <span className="font-medium">{formatMinutesToTime(details.scheduledStart)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Login</span>
              <span className="font-medium">{formatMinutesToTime(details.actualLogin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minutes Late</span>
              <span className="font-medium text-amber-600">{details.lateByMinutes ?? '-'}</span>
            </div>
          </div>
        );

      case 'EARLY_OUT':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule End</span>
              <span className="font-medium">{formatMinutesToTime(details.scheduledEnd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Logout</span>
              <span className="font-medium">{formatMinutesToTime(details.actualLogout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minutes Early</span>
              <span className="font-medium text-orange-600">{details.earlyByMinutes ?? '-'}</span>
            </div>
          </div>
        );

      case 'TIME_NOT_MET':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Hours</span>
              <span className="font-medium">{details.requiredHours?.toFixed(1) ?? '-'} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Logged Hours</span>
              <span className="font-medium">{details.loggedHours?.toFixed(1) ?? '-'} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shortfall</span>
              <span className="font-medium text-red-600">{details.shortfallMinutes ?? '-'} mins</span>
            </div>
            {details.source && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium capitalize">{details.source}</span>
              </div>
            )}
          </div>
        );

      case 'NCNS':
        return (
          <div className="space-y-2">
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Agent was scheduled to work but did not log in and has no outage request for this date.
              </p>
            </div>
            {details.scheduledShift && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled Shift</span>
                <span className="font-medium">{details.scheduledShift}</span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="shrink-0 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              {config.label}
            </DialogTitle>
            <DialogDescription>
              Incident report for {report.agent_name}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Agent Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{report.agent_name}</p>
              <p className="text-sm text-muted-foreground">{report.agent_email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {format(parseISO(report.incident_date), 'MMM d, yyyy')}
              </p>
              <div className="flex gap-2 mt-1">
                <Badge className={severityConfig.color}>{severityConfig.label}</Badge>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Incident Details */}
          <div>
            <h4 className="font-medium mb-3">Incident Details</h4>
            {renderDetails()}
          </div>

          {report.frequency_count > 1 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ This incident has occurred <strong>{report.frequency_count} times</strong> this week.
              </p>
            </div>
          )}

          <Separator />

          {/* Notes */}
          {canEdit && (
            <div className="space-y-2">
              <Label htmlFor="notes">Team Lead Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this incident..."
                rows={3}
              />
            </div>
          )}

          {!canEdit && report.notes && (
            <div>
              <Label>Notes</Label>
              <p className="text-sm mt-1">{report.notes}</p>
            </div>
          )}

          {report.reviewed_by && (
            <p className="text-xs text-muted-foreground">
              Last reviewed by {report.reviewed_by} on{' '}
              {report.reviewed_at ? format(parseISO(report.reviewed_at), 'MMM d, yyyy h:mm a') : '-'}
            </p>
          )}

          {/* Action Buttons */}
          {canEdit && report.status !== 'validated' && report.status !== 'dismissed' && (
            <div className="flex flex-wrap gap-2 pt-2">
              {/* Escalate as Outage - only for escalatable incidents */}
              {canEscalate && (report.status === 'open' || report.status === 'reviewed') && (
                <Button
                  variant="outline"
                  onClick={() => setShowEscalationDialog(true)}
                  disabled={isUpdating || isEscalating}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Escalate as Outage
                </Button>
              )}
              <Button
                variant="default"
                onClick={() => handleStatusUpdate('validated')}
                disabled={isUpdating || isEscalating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate (Coaching)
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleStatusUpdate('dismissed')}
                disabled={isUpdating || isEscalating}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss (Invalid)
              </Button>
            </div>
          )}

          {/* Escalation Confirmation Dialog */}
          {canEscalate && (
            <EscalationConfirmDialog
              open={showEscalationDialog}
              onOpenChange={setShowEscalationDialog}
              report={report}
              outageReason={outageReason}
              startTime={escalationStartTime}
              endTime={escalationEndTime}
              onConfirm={handleEscalate}
              isLoading={isEscalating}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
