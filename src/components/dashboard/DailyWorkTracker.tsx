import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, Mail, MessageCircle, Phone, Timer, Clock, AlertTriangle, CheckCircle2, PlayCircle, Zap } from 'lucide-react';
import { formatGapTime } from '@/lib/agentDashboardApi';
import { cn } from '@/lib/utils';
import { WorkTrackerDaySelector } from './WorkTrackerDaySelector';

import { TicketCountByType } from '@/lib/agentDashboardApi';

interface DailyWorkTrackerProps {
  // Position-specific quotas and counts
  position: string | null;
  quotaEmail: number | null;
  quotaChat: number | null;
  quotaPhone: number | null;
  quotaOtEmail: number | null;
  ticketCounts: TicketCountByType;
  avgGapSeconds: number | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  // Portal hours (always show)
  portalHours?: number | null;
  portalLoginTime?: string | null;
  // Upwork integration props (only show when hasUpworkContract)
  upworkHours?: number | null;
  upworkError?: string | null;
  upworkSyncedAt?: string | null;  // When data was last synced from Upwork
  hasUpworkContract?: boolean;
  // OT tracking
  otEnabled?: boolean;
  isOnOT?: boolean;
  otHoursWorkedMinutes?: number | null;
  dataSource?: 'snapshot' | 'live';
  // Day selector props
  weekStart: Date;
  selectedDay: Date;
  onDayChange: (date: Date) => void;
}

/**
 * Determine which ticket types to show based on position
 */
function getVisibleTicketTypes(
  position: string | null,
  quotaChat: number | null,
  quotaPhone: number | null
): { showEmail: boolean; showChat: boolean; showCall: boolean } {
  const pos = (position || '').toLowerCase();
  
  // Email is always shown for support agents
  const showEmail = ['email', 'hybrid', 'email + chat', 'email + phone'].includes(pos) || pos === '';
  
  // Chat: show if position includes Chat role, or if quota_chat is set
  const showChat = ['chat', 'hybrid', 'email + chat'].includes(pos) || (quotaChat !== null && quotaChat > 0);
  
  // Call: show if position includes Phone role, or if quota_phone is set
  const showCall = ['phone', 'hybrid', 'email + phone'].includes(pos) || (quotaPhone !== null && quotaPhone > 0);
  
  return { showEmail, showChat, showCall };
}

interface TicketProgressBarProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  quota: number | null;
  colorClass?: string;
}

function TicketProgressBar({ icon, label, count, quota, colorClass = 'text-primary' }: TicketProgressBarProps) {
  const hasQuota = quota !== null && quota > 0;
  const progressPercent = hasQuota ? Math.min((count / quota) * 100, 100) : 0;
  const isOverQuota = hasQuota && count > quota;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", colorClass)}>
          {icon}
          {label}
        </div>
        <span className={cn("text-sm font-medium", isOverQuota && 'text-green-600')}>
          {hasQuota ? `${count}/${quota}` : count}
        </span>
      </div>
      {hasQuota ? (
        <>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {isOverQuota 
              ? `${(progressPercent - 100).toFixed(0)}% over quota!` 
              : `${progressPercent.toFixed(0)}% of quota`}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground italic">No quota set</p>
      )}
    </div>
  );
}

export function DailyWorkTracker({ 
  position,
  quotaEmail, 
  quotaChat,
  quotaPhone,
  quotaOtEmail,
  ticketCounts,
  avgGapSeconds,
  onRefresh,
  isRefreshing,
  portalHours,
  portalLoginTime,
  upworkHours,
  upworkError,
  upworkSyncedAt,
  hasUpworkContract,
  otEnabled,
  isOnOT,
  otHoursWorkedMinutes,
  dataSource,
  weekStart,
  selectedDay,
  onDayChange,
}: DailyWorkTrackerProps) {
  const { showEmail, showChat, showCall } = getVisibleTicketTypes(position, quotaChat, quotaPhone);
  
  // Show OT Email bar if OT is enabled in profile, currently on OT, or has OT tickets today
  const showOtEmail = otEnabled || isOnOT || (ticketCounts.otEmail > 0);

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

  // Count how many ticket type bars we're showing (include OT Email if visible)
  const ticketBarsCount = [showEmail, showChat, showCall, showOtEmail].filter(Boolean).length;

  // Determine grid columns for the bottom row (Avg Gap, Portal Time, Upwork Time, OT Time)
  const showOtHours = (otHoursWorkedMinutes ?? 0) > 0;
  const timeMetricsCount = (hasUpworkContract ? 3 : 2) + (showOtHours ? 1 : 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Work Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            <WorkTrackerDaySelector
              weekStart={weekStart}
              selectedDay={selectedDay}
              onDayChange={onDayChange}
            />
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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tickets Handled Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Tickets Handled</h4>
          <div className={cn(
            "grid gap-4",
            ticketBarsCount === 1 && "grid-cols-1",
            ticketBarsCount === 2 && "grid-cols-1 md:grid-cols-2",
            ticketBarsCount === 3 && "grid-cols-1 md:grid-cols-3",
            ticketBarsCount >= 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {showEmail && (
              <TicketProgressBar
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                count={ticketCounts.email}
                quota={quotaEmail}
                colorClass="text-blue-600"
              />
            )}
            {showChat && (
              <TicketProgressBar
                icon={<MessageCircle className="h-4 w-4" />}
                label="Chat"
                count={ticketCounts.chat}
                quota={quotaChat}
                colorClass="text-green-600"
              />
            )}
            {showCall && (
              <TicketProgressBar
                icon={<Phone className="h-4 w-4" />}
                label="Calls"
                count={ticketCounts.call}
                quota={quotaPhone}
                colorClass="text-amber-600"
              />
            )}
            {showOtEmail && (
              <TicketProgressBar
                icon={<Zap className="h-4 w-4" />}
                label={dataSource === 'snapshot' ? "OT Email (Snapshot)" : "OT Email"}
                count={ticketCounts.otEmail}
                quota={quotaOtEmail}
                colorClass="text-violet-600"
              />
            )}
          </div>
        </div>

        {/* Time Metrics Row */}
        <div className={cn(
          "grid gap-6",
          timeMetricsCount === 2 && "grid-cols-1 md:grid-cols-2",
          timeMetricsCount === 3 && "grid-cols-1 md:grid-cols-3",
          timeMetricsCount >= 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
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
                  {upworkSyncedAt ? (
                    <>
                      Synced: {new Date(upworkSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </>
                  ) : upworkHours !== null ? (
                    varianceStatus === 'ok' ? (
                      'Times match ✓'
                    ) : varianceStatus === 'over' ? (
                      `Portal +${formatHours(variance)} vs Upwork`
                    ) : varianceStatus === 'under' ? (
                      `Upwork +${formatHours(Math.abs(variance ?? 0))} vs Portal`
                    ) : (
                      'From last logout sync'
                    )
                  ) : (
                    'Syncs on logout'
                  )}
                </div>
              )}
            </div>
          )}

          {/* OT Time - show when OT hours are available */}
          {showOtHours && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-violet-600">
                  <Timer className="h-4 w-4" />
                  OT Time
                </div>
                <span className="text-2xl font-bold">
                  {formatHours((otHoursWorkedMinutes ?? 0) / 60)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Overtime hours worked
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
