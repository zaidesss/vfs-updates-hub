import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Clock, ArrowRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityEvent {
  id: string;
  profileId: string;
  agentName: string;
  agentEmail: string;
  eventType: string;
  prevStatus: string;
  newStatus: string;
  createdAt: string;
}

// Status color mapping using semantic tokens where possible
const STATUS_COLORS: Record<string, string> = {
  LOGGED_IN: 'bg-chart-2',
  LOGGED_OUT: 'bg-muted-foreground',
  ON_BREAK: 'bg-warning',
  COACHING: 'bg-primary',
  RESTARTING: 'bg-destructive/70',
  ON_BIO: 'bg-chart-5',
  ON_OT: 'bg-chart-1',
};

// Format status for display
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    LOGGED_IN: 'Logged In',
    LOGGED_OUT: 'Logged Out',
    ON_BREAK: 'On Break',
    COACHING: 'Coaching',
    RESTARTING: 'Restarting',
    ON_BIO: 'Bio Break',
    ON_OT: 'On OT',
  };
  return statusMap[status] || status;
}

// Format event type for display
function formatEventType(eventType: string): string {
  const eventMap: Record<string, string> = {
    LOGIN: 'logged in',
    LOGOUT: 'logged out',
    BREAK_IN: 'started break',
    BREAK_OUT: 'ended break',
    COACHING_START: 'started coaching',
    COACHING_END: 'ended coaching',
    DEVICE_RESTART_START: 'restarting device',
    DEVICE_RESTART_END: 'device restarted',
    BIO_START: 'started bio break',
    BIO_END: 'ended bio break',
    OT_LOGIN: 'started OT',
    OT_LOGOUT: 'ended OT',
  };
  return eventMap[eventType] || eventType.toLowerCase().replace(/_/g, ' ');
}

interface LiveActivityFeedProps {
  maxItems?: number;
  className?: string;
}

export function LiveActivityFeed({ maxItems = 15, className }: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  const loadRecentActivities = async () => {
    try {
      // Calculate start of today (midnight local time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch recent profile events with agent info - only from today
      const { data: events, error } = await supabase
        .from('profile_events')
        .select(`
          id,
          profile_id,
          event_type,
          prev_status,
          new_status,
          created_at
        `)
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      if (!events || events.length === 0) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      // Get unique profile IDs
      const profileIds = [...new Set(events.map(e => e.profile_id))];

      // Fetch agent profiles
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('id, full_name, email')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map events to activities
      const mappedActivities: ActivityEvent[] = events.map(event => {
        const profile = profileMap.get(event.profile_id);
        return {
          id: event.id,
          profileId: event.profile_id,
          agentName: profile?.full_name || profile?.email || 'Unknown',
          agentEmail: profile?.email || '',
          eventType: event.event_type,
          prevStatus: event.prev_status,
          newStatus: event.new_status,
          createdAt: event.created_at,
        };
      });

      setActivities(mappedActivities);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecentActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('profile-events-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_events',
        },
        async (payload) => {
          const event = payload.new as any;
          
          // Fetch agent profile for this event
          const { data: profile } = await supabase
            .from('agent_profiles')
            .select('full_name, email')
            .eq('id', event.profile_id)
            .single();

          // Filter: only add events from today
          const eventDate = new Date(event.created_at);
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          if (eventDate >= todayStart) {
            const newActivity: ActivityEvent = {
              id: event.id,
              profileId: event.profile_id,
              agentName: profile?.full_name || profile?.email || 'Unknown',
              agentEmail: profile?.email || '',
              eventType: event.event_type,
              prevStatus: event.prev_status,
              newStatus: event.new_status,
              createdAt: event.created_at,
            };

            setActivities(prev => [newActivity, ...prev.slice(0, maxItems - 1)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maxItems]);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">No recent activity</span>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, idx) => (
                <div
                  key={activity.id}
                  className={cn(
                    'flex items-start gap-3 py-2',
                    idx === 0 && 'animate-in fade-in slide-in-from-top-2 duration-300'
                  )}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[activity.newStatus] || 'bg-gray-400')} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium truncate">{activity.agentName}</span>
                      <span className="text-muted-foreground">{formatEventType(activity.eventType)}</span>
                    </div>
                    
                    {/* Status transition */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs py-0">
                        {formatStatus(activity.prevStatus)}
                      </Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-xs py-0',
                          activity.newStatus === 'LOGGED_IN' && 'border-chart-2 text-chart-2',
                          activity.newStatus === 'LOGGED_OUT' && 'border-muted-foreground text-muted-foreground'
                        )}
                      >
                        {formatStatus(activity.newStatus)}
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
