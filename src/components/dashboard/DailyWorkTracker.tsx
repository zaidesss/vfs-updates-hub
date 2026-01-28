import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, Ticket } from 'lucide-react';

interface DailyWorkTrackerProps {
  quota: number | null;
  ticketsHandled?: number;
  timeLoggedMinutes?: number;
}

export function DailyWorkTracker({ 
  quota, 
  ticketsHandled = 0, 
  timeLoggedMinutes = 0 
}: DailyWorkTrackerProps) {
  const quotaValue = quota || 50; // Default quota
  const progressPercent = Math.min((ticketsHandled / quotaValue) * 100, 100);
  
  const hours = Math.floor(timeLoggedMinutes / 60);
  const minutes = timeLoggedMinutes % 60;
  const timeFormatted = `${hours}h ${minutes}m`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Daily Work Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tickets Handled */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ticket className="h-4 w-4" />
                Tickets Handled
              </div>
              <span className="text-sm font-medium">
                {ticketsHandled}/{quotaValue}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {progressPercent.toFixed(0)}% of daily quota
            </p>
          </div>

          {/* Time Logged */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time Logged
              </div>
              <span className="text-2xl font-bold">{timeFormatted}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              (Data will be wired to actual tracking later)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
