import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Loader2, Activity } from 'lucide-react';
import { fetchMyActivityLogs, AuditLogEntry } from '@/lib/auditLogApi';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { format } from 'date-fns';

const ACTION_TYPE_COLORS: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  new_feature: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

function ActivityEntry({ entry, agentEmail }: { entry: AuditLogEntry; agentEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const actorName = getKnownNameByEmail(entry.changed_by) || entry.changed_by;
  const isSelf = entry.changed_by.toLowerCase() === agentEmail.toLowerCase();

  const actorLabel = isSelf ? 'You' : actorName;

  const actionVerb = entry.action_type === 'created' ? 'created'
    : entry.action_type === 'deleted' ? 'deleted'
    : entry.action_type === 'new_feature' ? 'added'
    : 'updated';

  const hasDetails = (entry.changes && Object.keys(entry.changes).length > 0) ||
    (entry.metadata && Object.keys(entry.metadata).length > 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => hasDetails && setIsOpen(!isOpen)}
      >
        <div className="mt-1">
          {hasDetails ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => e.stopPropagation()}>
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className={`font-medium ${isSelf ? 'text-primary' : 'text-foreground'}`}>
              {actorLabel}
            </span>
            {' '}{actionVerb}{' '}
            <span className="font-medium text-foreground">{entry.entity_label || entry.area}</span>
            {entry.reference_number && (
              <span className="text-muted-foreground"> ({entry.reference_number})</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{entry.area}</Badge>
            <Badge className={`${ACTION_TYPE_COLORS[entry.action_type] || ''} border-0 text-[10px] px-1.5 py-0 capitalize`}>
              {entry.action_type === 'new_feature' ? 'New' : entry.action_type}
            </Badge>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="ml-11 pl-3 pb-3 border-l-2 border-muted">
          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <div className="space-y-1.5">
              {Object.entries(entry.changes).map(([field, diff]) => (
                <div key={field} className="text-xs">
                  <span className="font-medium capitalize text-muted-foreground">{field.replace(/_/g, ' ')}:</span>
                  <div className="ml-3 flex flex-col gap-0.5">
                    {(diff as any)?.old !== null && (diff as any)?.old !== undefined && (
                      <span className="text-red-600 dark:text-red-400 line-through">
                        {String((diff as any).old).substring(0, 200)}
                      </span>
                    )}
                    {(diff as any)?.new !== null && (diff as any)?.new !== undefined && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {String((diff as any).new).substring(0, 200)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface MyActivityTabProps {
  agentEmail: string;
}

export function MyActivityTab({ agentEmail }: MyActivityTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agentEmail) return;
    setIsLoading(true);
    fetchMyActivityLogs(agentEmail).then(data => {
      setLogs(data);
      setIsLoading(false);
    });
  }, [agentEmail]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet.</p>
        <p className="text-sm mt-1">Changes to your profile, leave requests, and QA evaluations will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map(entry => (
        <ActivityEntry key={entry.id} entry={entry} agentEmail={agentEmail} />
      ))}
    </div>
  );
}
