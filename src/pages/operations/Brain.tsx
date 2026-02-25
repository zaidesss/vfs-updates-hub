import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Brain as BrainIcon, Loader2 } from 'lucide-react';
import { format, addDays, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toZonedTime } from 'date-fns-tz';

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function useVoiceCounts(weekStart: Date) {
  const days = getWeekDays(weekStart);
  const startDate = format(days[0], 'yyyy-MM-dd');
  const endDate = format(days[6], 'yyyy-MM-dd');

  // Query using EST day boundaries
  const startUTC = new Date(`${startDate}T00:00:00-05:00`).toISOString();
  const endUTC = new Date(`${endDate}T23:59:59.999-05:00`).toISOString();

  return useQuery({
    queryKey: ['brain-voice-counts', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_logs')
        .select('timestamp')
        .ilike('ticket_type', 'call')
        .eq('zd_instance', 'ZD1')
        .gte('timestamp', startUTC)
        .lte('timestamp', endUTC);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const estDate = toZonedTime(new Date(row.timestamp), 'America/New_York');
        const key = format(estDate, 'yyyy-MM-dd');
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    },
  });
}

const Brain = () => {
  const [weekStart, setWeekStart] = useState(() => new Date(2026, 1, 23));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = getWeekDays(weekStart);

  const { data: voiceCounts, isLoading } = useVoiceCounts(weekStart);

  const navigatePrev = () => setWeekStart(prev => subWeeks(prev, 1));
  const navigateNext = () => setWeekStart(prev => addWeeks(prev, 1));

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainIcon className="h-6 w-6 text-primary" />
            Brain
          </h1>
          <p className="text-muted-foreground">Weekly overview</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center font-medium">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Week View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]" />
                    {days.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[120px]">
                        <div className="font-semibold">{format(day, 'EEE')}</div>
                        <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-sm">Voice</TableCell>
                    {days.map((day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      const count = voiceCounts?.[key] ?? 0;
                      return (
                        <TableCell key={day.toISOString()} className="text-center border">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                          ) : (
                            <span className={count > 0 ? 'font-semibold' : 'text-muted-foreground'}>{count}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Brain;
