import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Calendar, Clock, User } from 'lucide-react';
import type { AgentReport } from '@/lib/agentReportsApi';

interface EscalationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: AgentReport;
  outageReason: string;
  startTime: string;
  endTime: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export function EscalationConfirmDialog({
  open,
  onOpenChange,
  report,
  outageReason,
  startTime,
  endTime,
  onConfirm,
  isLoading,
}: EscalationConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-purple-600" />
            Escalate as Outage Request
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <span className="block">
              This will create an outage request for review. The report will be marked as escalated.
            </span>
            
            <span className="block rounded-lg border p-4 space-y-3 bg-muted/50">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{report.agent_name}</span>
              </span>
              
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{report.incident_date}</span>
              </span>
              
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{startTime} - {endTime}</span>
              </span>
              
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  {outageReason}
                </Badge>
              </span>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Creating...' : 'Create Outage Request'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
