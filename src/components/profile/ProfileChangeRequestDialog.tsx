import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { createProfileChangeRequest } from '@/lib/agentProfileApi';
import { useToast } from '@/hooks/use-toast';

interface ProfileChangeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmail: string;
  fieldName: string;
  fieldLabel: string;
  currentValue: string | null;
}

export function ProfileChangeRequestDialog({
  isOpen,
  onClose,
  targetEmail,
  fieldName,
  fieldLabel,
  currentValue
}: ProfileChangeRequestDialogProps) {
  const { toast } = useToast();
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!requestedValue.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the requested value',
        variant: 'destructive'
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for this change request',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    const result = await createProfileChangeRequest(
      targetEmail,
      fieldName,
      currentValue,
      requestedValue.trim(),
      reason.trim()
    );

    if (result.data) {
      toast({
        title: 'Request Submitted',
        description: `Your change request (${result.data.reference_number}) has been submitted for review.`
      });
      setRequestedValue('');
      setReason('');
      onClose();
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Change: {fieldLabel}</DialogTitle>
          <DialogDescription>
            Submit a request to update this field. A Super Admin will review your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Value</Label>
            <Input value={currentValue || '(Not set)'} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested_value">Requested Value *</Label>
            <Input
              id="requested_value"
              value={requestedValue}
              onChange={(e) => setRequestedValue(e.target.value)}
              placeholder="Enter the new value you're requesting"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this change is needed"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
