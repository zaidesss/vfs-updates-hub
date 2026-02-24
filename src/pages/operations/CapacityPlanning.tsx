import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker, getDefaultDateRange, DateRange } from '@/components/reports/DateRangePicker';
import { ZdInstanceFilter } from '@/components/reports/ZdInstanceFilter';
import { useCapacityVolumeData } from '@/hooks/useCapacityVolumeData';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Users, Clock, TrendingUp, AlertTriangle, CheckCircle, Target, Calendar, Settings, Moon, Sun, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MINUTES_PER_HOUR = 60;

const formatHourAmPm = (hour: number): string => {
  const h = hour % 24;
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
};

const CapacityPlanning = () => {
  const [dateRange, setDateRange] = useState<DateRange>(() => getDefaultDateRange());
  const [zdInstance, setZdInstance] = useState<string | undefined>(undefined);

  const { data: volumeData, isLoading: isLoadingVolume, dataUpdatedAt } = useCapacityVolumeData(
    dateRange,
    zdInstance
  );
  const { data: settings, isLoading: isLoadingSettings } = useCapacitySettings();
  const { businessHoursLabel, config: businessConfig } = useBusinessHours();

  const lastUpdatedLabel = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const estDate = toZonedTime(new Date(dataUpdatedAt), 'America/New_York');
    return format(estDate, "MMM d, yyyy 'at' h:mm a") + ' EST';
  }, [dataUpdatedAt]);

  const TARGET_RESPONSE_TIME_MINUTES = settings?.target_response_time_minutes ?? 5;
  const CURRENT_AGENT_HOURS_PER_DAY = settings?.agent_hours_per_day ?? 5;
  const CURRENT_WORKING_DAYS_PER_WEEK = settings?.working_days?.length ?? 5;
  const NUMBER_OF_AGENTS = settings?.number_of_agents ?? 1;
  const TOTAL_HOURS_PER_DAY = CURRENT_AGENT_HOURS_PER_DAY * NUMBER_OF_AGENTS;
  const AFTER_HOURS_THRESHOLD = settings?.after_hours_threshold ?? 30;
  const CLIENT_ALLOCATED_HOURS = settings?.client_allocated_hours ?? 5;
  const WORKING_DAYS = settings?.working_days ?? [1, 2, 3, 4, 5];

  const capacityMetrics = useMemo(() => {
    if (!volumeData?.ticketsByDate || isLoadingSettings) return null;

    const totalTickets = volumeData.ticketsByDate.reduce((sum, d) => sum + d.count, 0);
    
    const businessDays = volumeData.ticketsByDate.filter(d => {
      const date = parseISO(d.date);
      return WORKING_DAYS.includes(date.getDay());
    }).length || 1;

    const ticketsPerBusinessDay = totalTickets / businessDays;
    const ticketsPerWeek = ticketsPerBusinessDay * CURRENT_WORKING_DAYS_PER_WEEK;

    const requiredMinutesPerDay = ticketsPerBusinessDay * TARGET_RESPONSE_TIME_MINUTES;
    const requiredHoursPerDay = requiredMinutesPerDay / MINUTES_PER_HOUR;
    const requiredMinutesPerWeek = ticketsPerWeek * TARGET_RESPONSE_TIME_MINUTES;
    const requiredHoursPerWeek = requiredMinutesPerWeek / MINUTES_PER_HOUR;

    const availableMinutesPerDay = TOTAL_HOURS_PER_DAY * MINUTES_PER_HOUR;
    const availableHoursPerWeek = CURRENT_AGENT_HOURS_PER_DAY * CURRENT_WORKING_DAYS_PER_WEEK;

    const utilizationPercent = (requiredMinutesPerDay / availableMinutesPerDay) * 100;
    const capacityGapMinutes = requiredMinutesPerDay - availableMinutesPerDay;
    const capacityGapHours = capacityGapMinutes / MINUTES_PER_HOUR;

    let recommendation: 'adequate' | 'warning' | 'critical';
    let recommendationText: string;
    let additionalHoursNeeded = 0;

    if (utilizationPercent <= 70) {
      recommendation = 'adequate';
      recommendationText = 'Current staffing is adequate. You have buffer capacity for volume spikes.';
    } else if (utilizationPercent <= 100) {
      recommendation = 'warning';
      recommendationText = 'Approaching full capacity. Consider adding hours during peak times or monitoring closely.';
    } else {
      recommendation = 'critical';
      additionalHoursNeeded = Math.ceil(capacityGapHours * 10) / 10;
      recommendationText = `Understaffed by ${additionalHoursNeeded.toFixed(1)} hours/day. Add ${Math.ceil(additionalHoursNeeded * CURRENT_WORKING_DAYS_PER_WEEK)} hours/week to meet SLA.`;
    }

    const peakHour = volumeData.ticketsByHour?.reduce((max, h) => 
      h.count > max.count ? h : max, { hour: '0', count: 0 }
    );
    
    const peakDay = volumeData.ticketsByDay?.reduce((max, d) => 
      d.count > max.count ? d : max, { day: 'Monday', count: 0 }
    );

    const dailyCapacityData = volumeData.ticketsByDate
      .filter(d => WORKING_DAYS.includes(parseISO(d.date).getDay()))
      .map(d => {
        const requiredMins = d.count * TARGET_RESPONSE_TIME_MINUTES;
        return {
          date: format(parseISO(d.date), 'MMM dd'),
          tickets: d.count,
          requiredMinutes: requiredMins,
          availableMinutes: availableMinutesPerDay,
          utilizationPercent: Math.round((requiredMins / availableMinutesPerDay) * 100),
        };
      });

    return {
      totalTickets,
      businessDays,
      ticketsPerBusinessDay: Math.round(ticketsPerBusinessDay * 10) / 10,
      ticketsPerWeek: Math.round(ticketsPerWeek),
      requiredHoursPerDay: Math.round(requiredHoursPerDay * 10) / 10,
      requiredHoursPerWeek: Math.round(requiredHoursPerWeek * 10) / 10,
      availableHoursPerWeek,
      utilizationPercent: Math.round(utilizationPercent),
      capacityGapHours: Math.round(capacityGapHours * 10) / 10,
      recommendation,
      recommendationText,
      additionalHoursNeeded,
      peakHour: peakHour?.hour || 'N/A',
      peakDay: peakDay?.day || 'N/A',
      dailyCapacityData,
    };
  }, [volumeData, isLoadingSettings, TARGET_RESPONSE_TIME_MINUTES, TOTAL_HOURS_PER_DAY, CURRENT_WORKING_DAYS_PER_WEEK, WORKING_DAYS, CURRENT_AGENT_HOURS_PER_DAY]);

  const getRecommendationBadge = () => {
    if (!capacityMetrics) return null;
    switch (capacityMetrics.recommendation) {
      case 'adequate':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircle className="w-4 h-4 mr-1" /> Adequate Staffing
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <AlertTriangle className="w-4 h-4 mr-1" /> Monitor Closely
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-4 h-4 mr-1" /> Additional Hours Needed
          </Badge>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Capacity Planning</h1>
            <p className="text-muted-foreground">
              Analyze staffing requirements based on ticket volume and response time targets
            </p>
            {lastUpdatedLabel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <RefreshCw className="h-3 w-3" />
                Last updated: {lastUpdatedLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker
              period="weekly"
              value={dateRange}
              onChange={setDateRange}
            />
            <ZdInstanceFilter value={zdInstance} onChange={setZdInstance} />
          </div>
        </div>

        {/* Configuration Summary */}
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Configuration</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" className="flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Edit
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSettings ? (
              <div className="flex gap-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-32" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Business Hours: <strong>{businessHoursLabel}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span>Target Response: <strong>{TARGET_RESPONSE_TIME_MINUTES} min</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Staff: <strong>{NUMBER_OF_AGENTS} agent{NUMBER_OF_AGENTS > 1 ? 's' : ''} × {CURRENT_AGENT_HOURS_PER_DAY}h/day</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Capacity: <strong>{capacityMetrics?.availableHoursPerWeek || (TOTAL_HOURS_PER_DAY * CURRENT_WORKING_DAYS_PER_WEEK)}h/week</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Client Allocated: <strong>{CLIENT_ALLOCATED_HOURS}h</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendation Card */}
        {capacityMetrics && (
          <Card className={`border-2 ${
            capacityMetrics.recommendation === 'adequate' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' :
            capacityMetrics.recommendation === 'warning' ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' :
            'border-destructive/50 bg-destructive/10'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Staffing Recommendation</CardTitle>
                {getRecommendationBadge()}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{capacityMetrics.recommendationText}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Capacity Utilization</span>
                  <span className="font-semibold">{capacityMetrics.utilizationPercent}%</span>
                </div>
                <Progress 
                  value={Math.min(capacityMetrics.utilizationPercent, 100)} 
                  className={`h-3 ${
                    capacityMetrics.utilizationPercent > 100 ? '[&>div]:bg-destructive' :
                    capacityMetrics.utilizationPercent > 70 ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-green-500'
                  }`}
                />
                {capacityMetrics.utilizationPercent > 100 && (
                  <p className="text-sm text-destructive">
                    ⚠️ Over capacity by {capacityMetrics.utilizationPercent - 100}%
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium">Avg Tickets/Day</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityMetrics?.ticketsPerBusinessDay || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Business days only</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium">Required Hours/Day</CardDescription>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityMetrics?.requiredHoursPerDay || 0}h</div>
              <p className="text-xs text-muted-foreground mt-1">Based on {TARGET_RESPONSE_TIME_MINUTES} min/ticket target</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium">Capacity Gap</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityMetrics?.capacityGapHours || 0}h</div>
              <p className="text-xs text-muted-foreground mt-1">
                {capacityMetrics?.capacityGapHours && capacityMetrics.capacityGapHours > 0 ? "Hours short per day" : "Buffer available"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium">Peak Day</CardDescription>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityMetrics?.peakDay || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-1">Peak hour: {capacityMetrics?.peakHour || 'N/A'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Capacity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Capacity Analysis</CardTitle>
            <CardDescription>Required vs available capacity per business day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityMetrics?.dailyCapacityData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                    formatter={(value, name) => [
                      `${value} min`,
                      name === 'requiredMinutes' ? 'Required' : 'Available'
                    ]}
                  />
                  <ReferenceLine 
                    y={TOTAL_HOURS_PER_DAY * MINUTES_PER_HOUR} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5"
                    label={{ value: 'Capacity', position: 'right' }}
                  />
                  <Bar 
                    dataKey="requiredMinutes" 
                    fill="hsl(var(--chart-1))" 
                    name="Required Minutes"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Utilization Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Utilization Trend</CardTitle>
            <CardDescription>Daily capacity utilization percentage (100% = at full capacity)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={capacityMetrics?.dailyCapacityData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    domain={[0, 'auto']}
                    label={{ value: '%', angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                    formatter={(value) => [`${value}%`, 'Utilization']}
                  />
                  <ReferenceLine y={100} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                  <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="utilizationPercent" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* After-Hours Analysis */}
        <AfterHoursAnalysis 
          volumeData={volumeData}
          businessConfig={businessConfig}
          afterHoursThreshold={AFTER_HOURS_THRESHOLD}
          businessHoursLabel={businessHoursLabel}
          clientAllocatedHours={CLIENT_ALLOCATED_HOURS}
        />
      </div>
    </Layout>
  );
};

// After-Hours Analysis Component
interface AfterHoursAnalysisProps {
  volumeData: ReturnType<typeof useCapacityVolumeData>['data'];
  businessConfig: { startHour: number; endHour: number; workingDays: number[] };
  afterHoursThreshold: number;
  businessHoursLabel: string;
  clientAllocatedHours: number;
}

const AfterHoursAnalysis = ({ volumeData, businessConfig, afterHoursThreshold, businessHoursLabel, clientAllocatedHours }: AfterHoursAnalysisProps) => {
  const analysis = useMemo(() => {
    if (!volumeData?.ticketsByHour) return null;

    const hourlyVolume: number[] = Array(24).fill(0);
    let withinHours = 0;
    let beforeOpen = 0;
    let afterClose = 0;
    
    volumeData.ticketsByHour.forEach((h) => {
      const hour = parseInt(h.hour.split(':')[0], 10);
      hourlyVolume[hour] = h.count;
      if (hour >= businessConfig.startHour && hour < businessConfig.endHour) {
        withinHours += h.count;
      } else if (hour < businessConfig.startHour) {
        beforeOpen += h.count;
      } else {
        afterClose += h.count;
      }
    });

    const dayNameToNumber: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    let weekend = 0;
    volumeData.ticketsByDay?.forEach((d) => {
      const dayNum = dayNameToNumber[d.day];
      if (dayNum !== undefined && !businessConfig.workingDays.includes(dayNum)) {
        weekend += d.count;
      }
    });

    const total = withinHours + beforeOpen + afterClose;
    const afterHoursTotal = beforeOpen + afterClose;
    const afterHoursPercent = total > 0 ? (afterHoursTotal / total) * 100 : 0;
    const weekendPercent = volumeData.total ? (weekend / volumeData.total) * 100 : 0;
    const exceedsThreshold = afterHoursPercent > afterHoursThreshold;

    const pieData = [
      { name: 'Business Hours', value: withinHours, color: 'hsl(var(--primary))' },
      { name: 'Before Open', value: beforeOpen, color: 'hsl(var(--chart-2))' },
      { name: 'After Close', value: afterClose, color: 'hsl(var(--chart-3))' },
    ].filter(d => d.value > 0);

    const currentLength = businessConfig.endHour - businessConfig.startHour;
    const maxWindowSize = Math.max(currentLength, Math.min(clientAllocatedHours, 12));

    let bestStart = businessConfig.startHour;
    let bestEnd = businessConfig.endHour;
    let bestCoverage = withinHours;

    for (let windowSize = currentLength; windowSize <= maxWindowSize; windowSize++) {
      for (let start = 0; start <= 24 - windowSize; start++) {
        let coverage = 0;
        for (let h = start; h < start + windowSize; h++) {
          coverage += hourlyVolume[h];
        }
        if (coverage > bestCoverage || (coverage === bestCoverage && windowSize < (bestEnd - bestStart))) {
          bestCoverage = coverage;
          bestStart = start;
          bestEnd = start + windowSize;
        }
      }
      if (total > 0 && (bestCoverage / total) * 100 >= 80) break;
    }

    const suggestedCoveragePercent = total > 0 ? (bestCoverage / total) * 100 : 0;
    const currentCoveragePercent = total > 0 ? (withinHours / total) * 100 : 0;
    let ticketsCapturedByExtending = bestCoverage - withinHours;
    if (ticketsCapturedByExtending < 0) ticketsCapturedByExtending = 0;

    const afterHoursPeaks = hourlyVolume
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.hour < businessConfig.startHour || h.hour >= businessConfig.endHour)
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const suggestedHoursLength = bestEnd - bestStart;
    const needsChange = bestStart !== businessConfig.startHour || bestEnd !== businessConfig.endHour;

    return {
      withinHours, beforeOpen, afterClose, weekend,
      afterHoursPercent, weekendPercent, exceedsThreshold, pieData,
      suggestedStart: bestStart, suggestedEnd: bestEnd,
      suggestedCoveragePercent, currentCoveragePercent,
      ticketsCapturedByExtending, afterHoursPeaks,
      suggestedHoursLength, currentHoursLength: currentLength, needsChange,
    };
  }, [volumeData, businessConfig, afterHoursThreshold, clientAllocatedHours]);

  if (!analysis) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>After-Hours Volume Analysis</CardTitle>
          </div>
          {analysis.exceedsThreshold && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Above {afterHoursThreshold}% Threshold
            </Badge>
          )}
        </div>
        <CardDescription>
          Tickets received outside business hours ({businessHoursLabel}, Mon-Fri)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysis.exceedsThreshold && analysis.needsChange && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recommended Business Hours: {formatHourAmPm(analysis.suggestedStart)} – {formatHourAmPm(analysis.suggestedEnd)} EST</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Your current hours ({formatHourAmPm(businessConfig.startHour)}–{formatHourAmPm(businessConfig.endHour)}) cover only <strong>{analysis.currentCoveragePercent.toFixed(0)}%</strong> of ticket volume. 
                Shifting to <strong>{formatHourAmPm(analysis.suggestedStart)}–{formatHourAmPm(analysis.suggestedEnd)}</strong> ({analysis.suggestedHoursLength}h window) would cover <strong>{analysis.suggestedCoveragePercent.toFixed(0)}%</strong> of tickets — capturing <strong>{analysis.ticketsCapturedByExtending} additional tickets</strong>.
              </p>
              {analysis.afterHoursPeaks.length > 0 && (
                <p className="text-sm">
                  Busiest off-hours: {analysis.afterHoursPeaks.map(p => `${formatHourAmPm(p.hour)} (${p.count} tickets)`).join(', ')}.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {analysis.exceedsThreshold && !analysis.needsChange && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Consider Extending Business Hours</AlertTitle>
            <AlertDescription>
              {analysis.afterHoursPercent.toFixed(0)}% of tickets arrive outside business hours, but volume is spread thinly.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex items-center justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {analysis.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">During Hours</span>
                </div>
                <p className="text-2xl font-bold">{analysis.withinHours}</p>
                <p className="text-xs text-muted-foreground">
                  {((analysis.withinHours / (analysis.withinHours + analysis.beforeOpen + analysis.afterClose)) * 100 || 0).toFixed(0)}% of total
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">After Hours</span>
                </div>
                <p className="text-2xl font-bold">{analysis.beforeOpen + analysis.afterClose}</p>
                <p className="text-xs text-muted-foreground">
                  {analysis.afterHoursPercent.toFixed(0)}% of total
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <span>Before {formatHourAmPm(businessConfig.startHour)}</span>
                <span className="font-medium">{analysis.beforeOpen} tickets</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <span>After {formatHourAmPm(businessConfig.endHour)}</span>
                <span className="font-medium">{analysis.afterClose} tickets</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <span>Non-Working Days</span>
                <span className="font-medium">{analysis.weekend} tickets</span>
              </div>
            </div>

            {!analysis.exceedsThreshold && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="h-4 w-4 mt-0.5" />
                <span>After-hours volume is within acceptable range ({analysis.afterHoursPercent.toFixed(0)}% vs {afterHoursThreshold}% threshold)</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CapacityPlanning;