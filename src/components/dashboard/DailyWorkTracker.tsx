import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, Ticket, Timer, Clock, AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';
import { formatGapTime } from '@/lib/agentDashboardApi';
import { cn } from '@/lib/utils';

interface DailyWorkTrackerProps {
  quota: number | null;
  ticketsHandled: number;
  avgGapSeconds: number | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  // Portal hours (always show)
  portalHours?: number | null;
  portalLoginTime?: string | null;
  // Upwork integration props (only show when hasUpworkContract)
  upworkHours?: number | null;
  upworkError?: string | null;
  upworkStartTime?: string | null;
  hasUpworkContract?: boolean;
}

export function DailyWorkTracker({ 
  quota, 
  ticketsHandled,
  avgGapSeconds,
  onRefresh,
  isRefreshing,
  portalHours,
  portalLoginTime,
  upworkHours,
  upworkError,
  upworkStartTime,
  hasUpworkContract,
}: DailyWorkTrackerProps) {
  const quotaValue = quota || 50; // Default quota
  const progressPercent = Math.min((ticketsHandled / quotaValue) * 100, 100);
  const isOverQuota = ticketsHandled > quotaValue;

  // Calculate variance between portal and Upwork hours (only if both are available)
  const hasUpworkData = upworkHours !== null && upworkHours !== undefined;
  const hasPortalData = portalHours !== null && portalHours !== undefined;
  const variance = hasPortalData && hasUpworkData 
    ? portalHours - upworkHours
    : null;
  
  // Determine variance status (within 10 min tolerance is OK)
  const varianceStatus = variance !== null 
    ? Math.abs(variance) <= 0.167 // ~10 minutes tolerance
      ? 'ok' 
      : variance > 0 
        ? 'over' // Portal shows more than Upwork
        : 'under' // Upwork shows more than Portal
    : null;

  const formatHours = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return '--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Determine grid columns based on what we're showing
  // Always show: Tickets, Avg Gap, Portal Time
  // Conditionally show: Upwork Time (when hasUpworkContract)
  const gridCols = hasUpworkContract 
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" 
    : "grid-cols-1 md:grid-cols-3";

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
        <div className={cn("grid gap-6", gridCols)}>
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

          {/* Portal Time Logged - ALWAYS SHOW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Portal Time
              </div>
              <span className="text-2xl font-bold">
                {formatHours(portalHours)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
              {portalLoginTime ? (
                <>
                  <PlayCircle className="h-3 w-3" />
                  Started: {portalLoginTime}
                </>
              ) : (
                'Login to logout duration'
              )}
            </div>
          </div>

          {/* Upwork Time Logged - Only show if Upwork contract exists */}
          {hasUpworkContract && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-green-600" />
                  Upwork Time
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {upworkError ? '--' : formatHours(upworkHours)}
                  </span>
                  {varianceStatus && (
                    <span title={`Variance: ${variance !== null ? (variance > 0 ? '+' : '') + formatHours(variance) : '--'}`}>
                      {varianceStatus === 'ok' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {varianceStatus === 'over' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      {varianceStatus === 'under' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </span>
                  )}
                </div>
              </div>
              {upworkError ? (
                <p className="text-xs text-muted-foreground italic">
                  {upworkError.includes('re-authorize') || upworkError.includes('refresh') 
                    ? 'Upwork re-authorization needed' 
                    : upworkError.includes('API') 
                      ? 'Upwork API unavailable'
                      : 'Unable to fetch Upwork data'}
                </p>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
                  {upworkStartTime ? (
                    <>
                      <PlayCircle className="h-3 w-3 text-green-600" />
                      Started: {upworkStartTime}
                    </>
                  ) : varianceStatus === 'ok' ? (
                    'Times match ✓'
                  ) : varianceStatus === 'over' ? (
                    `Portal +${formatHours(variance)} vs Upwork`
                  ) : varianceStatus === 'under' ? (
                    `Upwork +${formatHours(Math.abs(variance ?? 0))} vs Portal`
                  ) : (
                    'From Upwork Work Diary'
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
