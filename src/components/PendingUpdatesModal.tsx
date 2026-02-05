import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import type { Update } from '@/types';

interface PendingUpdatesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUpdates: Update[];
}

export function PendingUpdatesModal({ isOpen, onOpenChange, pendingUpdates }: PendingUpdatesModalProps) {
  const navigate = useNavigate();

  const handleViewUpdates = () => {
    onOpenChange(false);
    navigate('/updates');
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-xl">Updates Pending</DialogTitle>
              <DialogDescription className="mt-1">
                You must acknowledge all updates before logging out.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{pendingUpdates.length}</span> update(s) that require acknowledgment:
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {pendingUpdates.map((update) => (
              <div 
                key={update.id} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{update.title}</p>
                  {update.category && (
                    <p className="text-xs text-muted-foreground mt-0.5">{update.category}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleViewUpdates} className="w-full" size="lg">
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Updates
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="w-full text-muted-foreground"
            >
              Close
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You cannot logout until all updates are acknowledged.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
