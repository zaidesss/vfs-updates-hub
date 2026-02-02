import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PASS_THRESHOLD } from '@/lib/qaEvaluationsApi';

interface WeeklyData {
  week: string;
  startDate: string;
  endDate: string;
  evaluationCount: number;
  averageScore: number;
  individualScores?: number[];
}

interface QAWeeklyComparisonProps {
  data: WeeklyData[];
}

export function QAWeeklyComparison({ data }: QAWeeklyComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">4-Week Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {data.map((week) => (
            <div key={week.week} className="text-center">
              <p className="text-sm font-medium">{week.week}</p>
              <p className="text-xs text-muted-foreground mb-1">
                {week.startDate} - {week.endDate}
              </p>
              <p className="text-lg font-bold">{week.evaluationCount}</p>
              <p className="text-xs text-muted-foreground">evaluations</p>
              <p className={`text-sm font-medium mt-1 ${week.averageScore >= PASS_THRESHOLD ? 'text-chart-2' : 'text-destructive'}`}>
                {week.averageScore}%
              </p>
              
              {/* Individual scores breakdown */}
              {week.individualScores && week.individualScores.length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  <div className="flex flex-wrap justify-center gap-1">
                    {week.individualScores.map((score, idx) => (
                      <span 
                        key={idx} 
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          score >= PASS_THRESHOLD 
                            ? 'bg-chart-2/10 text-chart-2' 
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {score}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
