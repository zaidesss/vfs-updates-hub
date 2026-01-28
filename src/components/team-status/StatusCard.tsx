import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMemberStatus, ProfileStatus } from '@/lib/teamStatusApi';

interface StatusCardProps {
  member: TeamMemberStatus;
  showDashboardLink: boolean;
}

const STATUS_DISPLAY: Record<ProfileStatus, { label: string; className: string }> = {
  LOGGED_IN: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ON_BREAK: { label: 'Break', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  COACHING: { label: 'Coaching', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  LOGGED_OUT: { label: 'Offline', className: 'bg-muted text-muted-foreground' },
};

export function StatusCard({ member, showDashboardLink }: StatusCardProps) {
  const statusInfo = STATUS_DISPLAY[member.currentStatus] || STATUS_DISPLAY.LOGGED_OUT;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        {/* Name and Dashboard Link */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-foreground truncate flex-1">
            {member.fullName}
          </h3>
          {showDashboardLink && (
            <Link
              to={`/people/${member.profileId}/dashboard`}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              title="View Dashboard"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <Badge className={cn('font-medium', statusInfo.className)}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Shift Schedule */}
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Shift Schedule
            </p>
            <p className="text-foreground">
              {member.shiftSchedule || 'Not set'}
            </p>
          </div>

          {/* Break Schedule */}
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Break Schedule
            </p>
            <p className="text-foreground">
              {member.breakSchedule || 'Not set'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
