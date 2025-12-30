import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, XCircle } from 'lucide-react';
import { Update, Acknowledgement } from '@/types';
import { AdminRole } from '@/lib/api';

interface UserAcknowledgementDashboardProps {
  users: AdminRole[];
  updates: Update[];
  acknowledgements: Acknowledgement[];
}

interface UserAckStats {
  email: string;
  acknowledged: number;
  total: number;
  percentage: number;
}

export function UserAcknowledgementDashboard({ users, updates, acknowledgements }: UserAcknowledgementDashboardProps) {
  // Only count published updates
  const publishedUpdates = updates.filter(u => u.status === 'published');
  const totalUpdates = publishedUpdates.length;

  // Calculate acknowledgement stats for each user
  const userStats: UserAckStats[] = users.map(user => {
    const userAcks = acknowledgements.filter(
      ack => ack.agent_email.toLowerCase() === user.email.toLowerCase()
    );
    
    // Count how many published updates this user has acknowledged
    const acknowledged = publishedUpdates.filter(update =>
      userAcks.some(ack => ack.update_id === update.id)
    ).length;

    return {
      email: user.email,
      acknowledged,
      total: totalUpdates,
      percentage: totalUpdates > 0 ? Math.round((acknowledged / totalUpdates) * 100) : 0,
    };
  });

  // Sort by percentage descending
  userStats.sort((a, b) => b.percentage - a.percentage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>User Acknowledgement Dashboard</CardTitle>
        </div>
        <CardDescription>
          Track how many updates each user has acknowledged ({totalUpdates} total published updates)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {userStats.map((stat) => (
              <div key={stat.email} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0">
                  {stat.percentage === 100 ? (
                    <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                  ) : stat.percentage === 0 ? (
                    <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{stat.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={stat.percentage} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {stat.acknowledged}/{stat.total}
                    </span>
                  </div>
                </div>
                <Badge 
                  variant={stat.percentage === 100 ? 'default' : stat.percentage >= 50 ? 'secondary' : 'outline'}
                  className="flex-shrink-0"
                >
                  {stat.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
