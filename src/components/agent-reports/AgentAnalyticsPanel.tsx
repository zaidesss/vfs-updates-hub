import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { getTodayEST } from '@/lib/timezoneUtils';
import {
  type IncidentType,
  INCIDENT_TYPE_CONFIG,
  getAgentAnalytics,
} from '@/lib/agentReportsApi';

interface AgentAnalyticsPanelProps {
  agentEmail: string;
  agentName: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AgentAnalyticsPanel({ agentEmail, agentName }: AgentAnalyticsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    byType: Record<IncidentType, number>;
    byMonth: { month: string; count: number }[];
    trend: 'increasing' | 'decreasing' | 'stable';
  } | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      const endDate = getTodayEST();
      // Calculate 6 months back from EST today
      const [y, m, d] = endDate.split('-').map(Number);
      const sixMonthsAgo = new Date(y, m - 1 - 6, d);
      const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsAgo.getDate()).padStart(2, '0')}`;
      
      const result = await getAgentAnalytics(agentEmail, startDate, endDate);
      if (result.data) {
        setAnalytics(result.data);
      }
      setIsLoading(false);
    };

    if (agentEmail) {
      loadAnalytics();
    }
  }, [agentEmail]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare data for pie chart
  const pieData = Object.entries(analytics.byType)
    .filter(([_, count]) => count > 0)
    .map(([type, count], index) => ({
      name: INCIDENT_TYPE_CONFIG[type as IncidentType]?.label || type,
      value: count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  // Prepare data for bar chart
  const barData = analytics.byMonth.map((item) => ({
    month: format(new Date(item.month + '-01'), 'MMM'),
    count: item.count,
  }));

  const totalIncidents = Object.values(analytics.byType).reduce((a, b) => a + b, 0);

  const TrendIcon = analytics.trend === 'increasing' ? TrendingUp : 
                    analytics.trend === 'decreasing' ? TrendingDown : Minus;
  const trendColor = analytics.trend === 'increasing' ? 'text-red-600' : 
                     analytics.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Analytics: {agentName}</CardTitle>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <Badge variant="outline" className={trendColor}>
              {analytics.trend === 'increasing' ? 'Increasing' : 
               analytics.trend === 'decreasing' ? 'Decreasing' : 'Stable'}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalIncidents} incidents in the last 6 months
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Trend Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Monthly Trend</h4>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>

          {/* Incident Type Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-3">By Incident Type</h4>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
