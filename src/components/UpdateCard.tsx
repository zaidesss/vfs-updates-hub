import { Link } from 'react-router-dom';
import { Update } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface UpdateCardProps {
  update: Update;
  totalAgents: number;
}

export function UpdateCard({ update, totalAgents }: UpdateCardProps) {
  const { user } = useAuth();
  const { isAcknowledged, getAcknowledgementCount } = useUpdates();
  
  const acknowledged = user ? isAcknowledged(update.id, user.email) : false;
  const ackCount = getAcknowledgementCount(update.id);
  const completionPercent = totalAgents > 0 ? Math.round((ackCount / totalAgents) * 100) : 0;
  
  const isOverdue = update.deadline_at && isPast(new Date(update.deadline_at)) && !acknowledged;

  return (
    <Link to={`/updates/${update.id}`}>
      <Card className={cn(
        'group transition-all duration-200 hover:shadow-md cursor-pointer animate-fade-in',
        acknowledged ? 'bg-accent/30' : 'bg-card',
        isOverdue && 'border-destructive/50'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {acknowledged ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {update.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {update.summary}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant={acknowledged ? 'secondary' : 'default'} className="text-xs">
                {acknowledged ? 'Read' : 'Unread'}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Posted {format(new Date(update.posted_at), 'MMM d, yyyy')}</span>
            </div>
            
            {update.deadline_at && (
              <div className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-destructive'
              )}>
                <Clock className="h-3.5 w-3.5" />
                <span>Due {format(new Date(update.deadline_at), 'MMM d, h:mm a')}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Help Center</span>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Team completion</span>
              <span className="font-medium">{ackCount}/{totalAgents} ({completionPercent}%)</span>
            </div>
            <Progress value={completionPercent} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
