import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { writeAuditLog } from '@/lib/auditLogApi';
import { Loader2, Send, Clock, User } from 'lucide-react';

interface UpworkLimitRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  agentEmail: string;
  currentTotalHours: number;
  teamLead: string;
  requestedBy: string;
}

export function UpworkLimitRequestDialog({
  isOpen,
  onOpenChange,
  agentName,
  agentEmail,
  currentTotalHours,
  teamLead,
  requestedBy,
}: UpworkLimitRequestDialogProps) {
  const { toast } = useToast();
  const [newLimit, setNewLimit] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    const limitValue = parseFloat(newLimit);
    if (isNaN(limitValue) || limitValue <= 0) {
      toast({
        title: 'Invalid Limit',
        description: 'Please enter a valid number for the new limit.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-upwork-limit-request', {
        body: {
          agentName,
          agentEmail,
          currentTotalHours,
          requestedLimit: limitValue,
          teamLead: teamLead || 'Not assigned',
          reason: reason.trim() || undefined,
          requestedBy,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send request');
      }

      toast({
        title: 'Request Sent',
        description: 'Upwork Limit Adjustment request has been submitted successfully.',
      });

      writeAuditLog({
        area: 'Profile',
        action_type: 'created',
        entity_label: `Upwork Limit Request: ${agentName}`,
        changed_by: requestedBy,
        changes: { upwork_limit: { old: String(currentTotalHours), new: String(limitValue) } },
        metadata: { type: 'upwork_limit_request', agent_email: agentEmail },
      });

      // Reset and close
      setNewLimit('');
      setReason('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error sending upwork limit request:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to send request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setNewLimit('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Request Upwork Limit Adjustment</DialogTitle>
              <DialogDescription className="mt-1">
                Submit a request to adjust the Upwork weekly hour limit.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Info - Read Only */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{agentName}</span>
              <span className="text-muted-foreground">({agentEmail})</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Current Total Hours: <span className="font-medium text-foreground">{currentTotalHours.toFixed(1)} hours</span></span>
            </div>
          </div>

          {/* New Limit Input */}
          <div className="space-y-2">
            <Label htmlFor="new-limit" className="text-sm font-medium">
              New Upwork Limit (hours) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-limit"
              type="number"
              step="0.5"
              min="0"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="e.g., 50"
              className="text-base"
            />
          </div>

          {/* Team Lead - Read Only */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Team Lead</Label>
            <div className="p-2.5 rounded-md bg-muted border border-border text-sm">
              {teamLead || 'Not assigned'}
            </div>
          </div>

          {/* Reason - Optional */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for the adjustment..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSending || !newLimit}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
