import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Brain as BrainIcon } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const Brain = () => {
  // Default to week of Feb 23, 2026 (Monday)
  const [weekStart, setWeekStart] = useState(() => new Date(2026, 1, 23));

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = getWeekDays(weekStart);

  const navigatePrev = () => setWeekStart(prev => subWeeks(prev, 1));
  const navigateNext = () => setWeekStart(prev => addWeeks(prev, 1));

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainIcon className="h-6 w-6 text-primary" />
            Brain
          </h1>
          <p className="text-muted-foreground">Weekly overview</p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center font-medium">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekly Calendar Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Week View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    {days.map((day) => (
                      <TableCell key={day.toISOString()} className="text-center align-top h-32 border">
                        <span className="text-xs text-muted-foreground">—</span>
                      </TableCell>
                    ))}
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
