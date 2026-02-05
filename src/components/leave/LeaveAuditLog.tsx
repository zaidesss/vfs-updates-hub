import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, Clock, User, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fetchLeaveRequestHistory, LeaveRequestHistory } from '@/lib/leaveRequestApi';

interface LeaveAuditLogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
  agentName: string;
  referenceNumber?: string;
}

// Format change key to human-readable label
function formatChangeKey(key: string): string {
  const keyMap: Record<string, string> = {
    status: 'Status',
    start_date: 'Start Date',
    end_date: 'End Date',
    start_time: 'Start Time',
    end_time: 'End Time',
    outage_reason: 'Outage Reason',
    client_name: 'Client',
    team_lead_name: 'Team Lead',
    role: 'Role',
    admin_remarks: 'Admin Remarks',
    remarks: 'Remarks',
    attachment_url: 'Attachment',
    override_reason: 'Override Reason',
    total_days: 'Total Days',
    outage_duration_hours: 'Duration (Hours)',
  };
  return keyMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Format value for display
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  return String(value);
}

// Get badge variant for status
function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'declined':
    case 'canceled':
      return 'destructive';
    case 'pending':
    case 'pending_override':
    case 'for_review':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function LeaveAuditLog({
  isOpen,
  onOpenChange,
  requestId,
  agentName,
  referenceNumber,
}: LeaveAuditLogProps) {
  const [history, setHistory] = useState<LeaveRequestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      loadHistory();
    }
  }, [isOpen, requestId]);

  const loadHistory = async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    setError(null);
    
    const result = await fetchLeaveRequestHistory(requestId);
    
    if (result.error) {
      setError(result.error);
    } else {
      setHistory(result.data || []);
    }
    
    setIsLoading(false);
  };

  // Parse and render changes
  const renderChanges = (changes: Record<string, any>) => {
    const entries = Object.entries(changes);
    
    if (entries.length === 0) {
      return <span className="text-muted-foreground text-sm">No specific changes recorded</span>;
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, change]) => {
          // Handle different change formats
          if (typeof change === 'object' && change !== null && 'old' in change && 'new' in change) {
            // Format: { old: value, new: value }
            return (
              <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">{formatChangeKey(key)}:</span>
                {key === 'status' ? (
                  <>
                    <Badge variant={getStatusBadgeVariant(change.old)}>{formatValue(change.old)}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant={getStatusBadgeVariant(change.new)}>{formatValue(change.new)}</Badge>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground line-through">{formatValue(change.old)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-foreground">{formatValue(change.new)}</span>
                  </>
                )}
              </div>
            );
          } else {
            // Simple value format
            return (
              <div key={key} className="text-sm">
                <span className="font-medium text-muted-foreground">{formatChangeKey(key)}:</span>{' '}
                <span>{formatValue(change)}</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Request History
          </DialogTitle>
          <DialogDescription>
            {referenceNumber && <span className="font-mono">{referenceNumber}</span>}
            {referenceNumber && ' - '}
            {agentName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <span>No history recorded</span>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={entry.id}>
                  {idx > 0 && <Separator className="my-4" />}
                  <div className="space-y-3">
                    {/* Header with timestamp and actor */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.changed_by}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    
                    {/* Changes */}
                    <div className="pl-6">
                      {renderChanges(entry.changes as Record<string, any>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
