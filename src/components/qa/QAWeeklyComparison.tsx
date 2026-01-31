import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';

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
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                label={{ value: 'Evaluations', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                label={{ value: 'Avg Score %', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="evaluationCount" 
                name="Evaluations" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="averageScore" 
                name="Avg Score %" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary below chart */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
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
