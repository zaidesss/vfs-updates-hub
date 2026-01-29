import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, Ticket, Timer } from 'lucide-react';
import { formatGapTime } from '@/lib/agentDashboardApi';

interface DailyWorkTrackerProps {
  quota: number | null;
  ticketsHandled: number;
  avgGapSeconds: number | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DailyWorkTracker({ 
  quota, 
  ticketsHandled,
  avgGapSeconds,
  onRefresh,
  isRefreshing,
}: DailyWorkTrackerProps) {
  const quotaValue = quota || 50; // Default quota
  const progressPercent = Math.min((ticketsHandled / quotaValue) * 100, 100);
  const isOverQuota = ticketsHandled > quotaValue;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Daily Work Tracker
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
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
              <span className={`text-sm font-medium ${isOverQuota ? 'text-green-600' : ''}`}>
                {ticketsHandled}/{quotaValue}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {isOverQuota 
                ? `${(progressPercent - 100).toFixed(0)}% over quota!` 
                : `${progressPercent.toFixed(0)}% of daily quota`}
            </p>
          </div>

          {/* Average Gap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                Avg Gap
              </div>
              <span className="text-2xl font-bold">
                {formatGapTime(avgGapSeconds)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Average time between ticket responses
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
