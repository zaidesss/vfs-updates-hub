import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeeklyData {
  week: string;
  startDate: string;
  endDate: string;
  evaluationCount: number;
  averageScore: number;
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
              <p className="text-sm font-medium text-primary mt-1">{week.averageScore}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
