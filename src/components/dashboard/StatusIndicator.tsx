import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProfileStatus } from '@/lib/agentDashboardApi';

interface StatusIndicatorProps {
  status: ProfileStatus;
  since?: string;
  className?: string;
}

const STATUS_CONFIG: Record<ProfileStatus, { label: string; color: string; bgColor: string }> = {
  LOGGED_OUT: { 
    label: 'Logged Out', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted' 
  },
  LOGGED_IN: { 
    label: 'Logged In', 
    color: 'text-green-700 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30' 
  },
  ON_BREAK: { 
    label: 'On Break', 
    color: 'text-amber-700 dark:text-amber-400', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30' 
  },
  COACHING: { 
    label: 'Coaching', 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30' 
  },
  RESTARTING: { 
    label: 'Device Restart', 
    color: 'text-orange-700 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30' 
  },
  ON_BIO: { 
    label: 'Bio Break', 
    color: 'text-cyan-700 dark:text-cyan-400', 
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' 
  },
};

/**
 * Format status time in EST timezone with smart date display:
 * - Same day: shows only time (e.g., "3:15 PM")
 * - Different day: shows date + time (e.g., "1/27/2026 5:00 PM")
 */
function formatTimeSince(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  
  // Get date strings in EST for comparison
  const dateEST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
  
  const todayEST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(today);
  
  const timeFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  
  if (dateEST === todayEST) {
    // Same day: show only time
    return timeFormatted;
  } else {
    // Different day: show date + time
    return `${dateEST} ${timeFormatted}`;
  }
}

export function StatusIndicator({ status, since, className }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Badge 
          variant="secondary" 
          className={cn(
            'font-semibold px-3 py-1',
            config.bgColor,
            config.color
          )}
        >
          <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-current" />
          {config.label}
        </Badge>
      </div>
      {since && (
        <span className="text-sm text-muted-foreground">
          Since: {formatTimeSince(since)}
        </span>
      )}
    </div>
  );
}
