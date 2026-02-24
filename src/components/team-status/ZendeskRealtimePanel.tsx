import { useZendeskRealtime, InstanceStats } from '@/lib/zendeskRealtimeApi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageSquare, RefreshCw, AlertCircle, Users, PhoneCall, PhoneIncoming, Headphones, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

function StatItem({ icon, label, value, variant }: { 
  icon: React.ReactNode; label: string; value: number; variant?: 'default' | 'warning' 
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ml-auto tabular-nums ${
        variant === 'warning' && value > 0 ? 'text-destructive' : 'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  );
}

function InstanceCard({ label, stats }: { label: string; stats: InstanceStats }) {
  const assigned = Math.max(0, stats.messaging.activeConversations - stats.messaging.conversationsInQueue);
  return (
    <Card className="flex-1 min-w-[280px]">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">{label}</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Phone column */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Phone className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</span>
            </div>
            <StatItem icon={<Users className="h-3.5 w-3.5" />} label="Online" value={stats.talk.agentsOnline} />
            <StatItem icon={<PhoneCall className="h-3.5 w-3.5" />} label="On call" value={stats.talk.ongoingCalls} />
            <StatItem icon={<PhoneIncoming className="h-3.5 w-3.5" />} label="In queue" value={stats.talk.callsInQueue} variant="warning" />
            <StatItem icon={<Headphones className="h-3.5 w-3.5" />} label="Callbacks" value={stats.talk.callbacksInQueue} variant="warning" />
          </div>

          {/* Messaging column */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Messaging</span>
            </div>
            <StatItem icon={<MessageSquare className="h-3.5 w-3.5" />} label="Active" value={stats.messaging.activeConversations} />
            <StatItem icon={<UserCheck className="h-3.5 w-3.5" />} label="Assigned" value={assigned} />
            <StatItem icon={<PhoneIncoming className="h-3.5 w-3.5" />} label="In queue" value={stats.messaging.conversationsInQueue} variant="warning" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ZendeskRealtimePanel() {
  const { data, isLoading, error, refresh } = useZendeskRealtime();

  if (isLoading && !data) {
    return (
      <div className="flex gap-4 flex-wrap">
        <Skeleton className="h-[180px] flex-1 min-w-[280px]" />
        <Skeleton className="h-[180px] flex-1 min-w-[280px]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <span className="text-sm text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={refresh} className="ml-auto">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Live Zendesk Stats</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {data.fetchedAt && (
            <span>Updated {formatDistanceToNow(new Date(data.fetchedAt), { addSuffix: true })}</span>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={refresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex gap-4 flex-wrap">
        <InstanceCard label="ZD1" stats={data.zd1} />
        <InstanceCard label="ZD2" stats={data.zd2} />
      </div>
    </div>
  );
}
