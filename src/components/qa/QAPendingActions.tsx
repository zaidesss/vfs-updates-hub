import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PendingAction {
  id: string;
  evaluation_id: string;
  custom_action: string | null;
  is_resolved: boolean;
  created_at: string;
  action_plan?: {
    action_text: string;
    category: string | null;
  } | null;
  evaluation?: {
    reference_number: string | null;
    audit_date: string;
  };
}

interface QAPendingActionsProps {
  actions: PendingAction[];
}

export function QAPendingActions({ actions }: QAPendingActionsProps) {
  if (actions.length === 0) return null;

  return (
    <Card className="border-chart-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-chart-4">
          <AlertCircle className="h-5 w-5" />
          Previous Actions Pending Review ({actions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action) => (
            <div 
              key={action.id} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {action.action_plan?.action_text || action.custom_action}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {action.action_plan?.category && (
                    <Badge variant="outline" className="text-xs">
                      {action.action_plan.category}
                    </Badge>
                  )}
                  {action.evaluation && (
                    <span className="text-xs text-muted-foreground">
                      From {action.evaluation.reference_number || 'evaluation'} on {format(new Date(action.evaluation.audit_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
