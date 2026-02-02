import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { PASS_THRESHOLD } from '@/lib/qaEvaluationsApi';

interface QAEvaluation {
  id: string;
  agent_email: string;
  percentage: number;
  work_week_start: string | null;
  work_week_end: string | null;
  audit_date: string;
  status: string;
}

interface QAPerformanceSummaryProps {
  evaluations: QAEvaluation[];
}

interface WeekSummary {
  weekLabel: string;
  startDate: string;
  endDate: string;
  count: number;
  average: number;
  isPassing: boolean;
}

export function QAPerformanceSummary({ evaluations }: QAPerformanceSummaryProps) {
  // Calculate current week summary (based on work_week fields)
  // Week starts on Monday and ends on Sunday
  const currentWeekSummary = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    // Filter evaluations where work_week_start matches this week's Monday
    const weekEvaluations = evaluations.filter(e => {
      if (e.work_week_start) {
        // Match evaluations where work_week_start is this Monday
        return e.work_week_start === weekStartStr;
      }
      // Fallback to audit_date for legacy data
      return e.audit_date >= weekStartStr && e.audit_date <= weekEndStr;
    }).filter(e => e.status === 'sent');
    
    const average = weekEvaluations.length > 0
      ? weekEvaluations.reduce((sum, e) => sum + Number(e.percentage), 0) / weekEvaluations.length
      : 0;
    
    return {
      weekLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
      count: weekEvaluations.length,
      average: Math.round(average * 100) / 100,
      isPassing: average >= PASS_THRESHOLD,
      target: 5, // 5 tickets per week target
    };
  }, [evaluations]);

  // Calculate monthly summary with weekly breakdown
  // Monthly = evaluations where work_week_start falls within the calendar month
  // This means a work week that starts Jan 26 and ends Feb 1 counts for January
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
    
    // Get all evaluations where work_week_start falls within this month
    const monthEvaluations = evaluations.filter(e => {
      const weekStart = e.work_week_start || e.audit_date;
      return weekStart >= monthStartStr && weekStart <= monthEndStr && e.status === 'sent';
    });
    
    // Group by work week
    const weeklyGroups = new Map<string, QAEvaluation[]>();
    
    monthEvaluations.forEach(e => {
      const weekKey = e.work_week_start && e.work_week_end 
        ? `${e.work_week_start}|${e.work_week_end}`
        : e.audit_date; // Fallback
      
      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, []);
      }
      weeklyGroups.get(weekKey)!.push(e);
    });
    
    // Calculate weekly averages
    const weeklyAverages: WeekSummary[] = [];
    weeklyGroups.forEach((evals, key) => {
      const [start, end] = key.split('|');
      const avg = evals.reduce((sum, e) => sum + Number(e.percentage), 0) / evals.length;
      
      weeklyAverages.push({
        weekLabel: end 
          ? `${format(new Date(start + 'T12:00:00'), 'MMM d')} - ${format(new Date(end + 'T12:00:00'), 'MMM d')}`
          : format(new Date(start + 'T12:00:00'), 'MMM d'),
        startDate: start,
        endDate: end || start,
        count: evals.length,
        average: Math.round(avg * 100) / 100,
        isPassing: avg >= PASS_THRESHOLD,
      });
    });
    
    // Sort by start date
    weeklyAverages.sort((a, b) => a.startDate.localeCompare(b.startDate));
    
    // Calculate month-to-date average (true average across ALL evaluations, not average of averages)
    const totalSum = monthEvaluations.reduce((sum, e) => sum + Number(e.percentage), 0);
    const monthAverage = monthEvaluations.length > 0
      ? totalSum / monthEvaluations.length
      : 0;
    
    return {
      monthLabel: format(now, 'MMMM yyyy'),
      totalEvaluations: monthEvaluations.length,
      weeksCompleted: weeklyAverages.length,
      weeklyBreakdown: weeklyAverages,
      average: Math.round(monthAverage * 100) / 100,
      isPassing: monthAverage >= PASS_THRESHOLD,
    };
  }, [evaluations]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Current Week Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Summary</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {currentWeekSummary.weekLabel}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {currentWeekSummary.average}%
              </span>
              <Badge 
                variant={currentWeekSummary.isPassing ? 'default' : 'destructive'}
                className={currentWeekSummary.isPassing ? 'bg-chart-2/20 text-chart-2 border-chart-2/50 hover:bg-chart-2/30' : ''}
              >
                {currentWeekSummary.isPassing ? 'Passing' : 'Below Target'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tickets Evaluated</span>
              <span className="font-medium">
                {currentWeekSummary.count} / {currentWeekSummary.target}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${Math.min((currentWeekSummary.count / currentWeekSummary.target) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {monthlySummary.monthLabel}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {monthlySummary.average}%
              </span>
              <Badge 
                variant={monthlySummary.isPassing ? 'default' : 'destructive'}
                className={monthlySummary.isPassing ? 'bg-chart-2/20 text-chart-2 border-chart-2/50 hover:bg-chart-2/30' : ''}
              >
                {monthlySummary.isPassing ? 'Passing' : 'Below Target'}
              </Badge>
            </div>
            
            {/* Weekly Breakdown */}
            {monthlySummary.weeklyBreakdown.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground">
                  Weekly Breakdown ({monthlySummary.weeksCompleted} week{monthlySummary.weeksCompleted !== 1 ? 's' : ''})
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {monthlySummary.weeklyBreakdown.map((week, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[140px]">
                        {week.weekLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          ({week.count} tickets)
                        </span>
                        <span className={`font-medium ${week.isPassing ? 'text-chart-2' : 'text-destructive'}`}>
                          {week.average}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {monthlySummary.weeklyBreakdown.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No evaluations this month
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
