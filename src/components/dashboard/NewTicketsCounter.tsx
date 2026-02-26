import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Ticket, Info } from 'lucide-react';
import { useZendeskRealtime } from '@/lib/zendeskRealtimeApi';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export function NewTicketsCounter() {
  const { data, isLoading, error, refresh } = useZendeskRealtime();

  const zd1Count = data?.zd1?.newTickets ?? 0;
  const zd2Count = data?.zd2?.newTickets ?? 0;
  const total = zd1Count + zd2Count;

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Unable to load ticket count</span>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30 bg-gradient-to-r from-destructive/5 via-destructive/10 to-destructive/5 dark:from-destructive/10 dark:via-destructive/20 dark:to-destructive/10">
      <CardContent className="py-5 px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Count */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-destructive/15 dark:bg-destructive/25">
              <Ticket className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold tracking-tight text-destructive tabular-nums">
                  {isLoading ? '—' : total.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    New Tickets as of Today
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto text-sm" side="top">
                      Ticket counting started on <strong>February 26, 2026</strong>.
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>ZD1: <strong className="text-foreground">{isLoading ? '—' : zd1Count.toLocaleString()}</strong></span>
                <span className="text-border">|</span>
                <span>ZD2: <strong className="text-foreground">{isLoading ? '—' : zd2Count.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Right: SLA badge + refresh */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant="destructive" className="text-xs font-bold px-2.5 py-1">
              2hr SLA
            </Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {fetchedAt && <span>Updated {fetchedAt}</span>}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
