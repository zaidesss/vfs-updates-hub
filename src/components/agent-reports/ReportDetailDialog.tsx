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
  CheckCircle, XCircle, Eye
} from 'lucide-react';
import {
  type AgentReport,
  type ReportStatus,
  INCIDENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  updateReportStatus,
} from '@/lib/agentReportsApi';
import { toast } from '@/hooks/use-toast';

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
};

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

  if (!report) return null;

  const config = INCIDENT_TYPE_CONFIG[report.incident_type];
  const Icon = ICON_MAP[config.icon] || Target;
  const severityConfig = SEVERITY_CONFIG[report.severity];
  const statusConfig = STATUS_CONFIG[report.status];

  const handleStatusUpdate = async (newStatus: ReportStatus) => {
    setIsUpdating(true);
    const result = await updateReportStatus(report.id, newStatus, currentUserEmail, notes);
    setIsUpdating(false);

    if (result.success) {
      toast({ title: 'Status Updated', description: `Report marked as ${newStatus}` });
      onStatusUpdated();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update status', variant: 'destructive' });
    }
  };

  // Render incident-specific details
  const renderDetails = () => {
    const details = report.details || {};

    switch (report.incident_type) {
      case 'QUOTA_NOT_MET':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Quota</span>
              <span className="font-medium">{details.quota || '-'} tickets</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Count</span>
              <span className="font-medium">{details.actual || '-'} tickets</span>
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
              <span className="font-medium">{details.timeUsedSeconds ? Math.ceil(details.timeUsedSeconds / 60) : '-'} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allowance</span>
              <span className="font-medium">{details.allowanceSeconds ? Math.ceil(details.allowanceSeconds / 60) : '-'} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exceeded By</span>
              <span className="font-medium text-red-600">
                {details.exceededSeconds ? Math.ceil(details.exceededSeconds / 60) : 0} mins
              </span>
            </div>
          </div>
        );

      case 'NO_LOGOUT':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Login</span>
              <span className="font-medium">{details.loginTime || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Logout</span>
              <span className="font-medium">{details.scheduleEnd || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-Logged Out</span>
              <span className="font-medium">{details.auto_logged_out ? 'Yes' : 'No'}</span>
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
              <span className="font-medium">{details.scheduleStart || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Login</span>
              <span className="font-medium">{details.loginTime || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minutes Late</span>
              <span className="font-medium text-amber-600">{details.minutesLate || '-'}</span>
            </div>
          </div>
        );

      case 'EARLY_OUT':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule End</span>
              <span className="font-medium">{details.scheduleEnd || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Logout</span>
              <span className="font-medium">{details.logoutTime || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minutes Early</span>
              <span className="font-medium text-orange-600">{details.minutesEarly || '-'}</span>
            </div>
          </div>
        );

      case 'TIME_NOT_MET':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Hours</span>
              <span className="font-medium">{details.expected?.toFixed(1) || '-'} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Hours</span>
              <span className="font-medium">{details.actual?.toFixed(1) || '-'} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium capitalize">{details.source || '-'}</span>
            </div>
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.label}
          </DialogTitle>
          <DialogDescription>
            Incident report for {report.agent_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="flex gap-2 pt-2">
              {report.status === 'open' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('reviewed')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark Reviewed
                </Button>
              )}
              <Button
                variant="default"
                onClick={() => handleStatusUpdate('validated')}
                disabled={isUpdating}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleStatusUpdate('dismissed')}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
