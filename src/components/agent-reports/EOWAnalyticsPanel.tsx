import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Target, 
  Clock, 
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { fetchEOWAnalytics, type EOWAnalytics, INCIDENT_TYPE_CONFIG, type IncidentType } from '@/lib/agentReportsApi';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function EOWAnalyticsPanel() {
  const { isAdmin, isHR, isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  // Default to previous week
  const [selectedDate, setSelectedDate] = useState<Date>(subWeeks(new Date(), 1));
  const [analytics, setAnalytics] = useState<EOWAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only show to Admin/HR/SuperAdmin
  const canView = isAdmin || isHR || isSuperAdmin;

  // Calculate week boundaries
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  useEffect(() => {
    if (!canView) return;
    
    const loadAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      const result = await fetchEOWAnalytics(weekStartStr, weekEndStr);
      
      if (result.error) {
        setError(result.error);
        setAnalytics(null);
      } else {
        setAnalytics(result.data);
      }
      
      setIsLoading(false);
    };

    loadAnalytics();
  }, [selectedDate, canView]);

  if (!canView) return null;

  const getStatusConfig = (status: EOWAnalytics['status']) => {
    switch (status) {
      case 'good':
        return { 
          label: 'Good', 
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          icon: CheckCircle2,
        };
      case 'warning':
        return { 
          label: 'Warning', 
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
          icon: AlertTriangle,
        };
      case 'critical':
        return { 
          label: 'Critical', 
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          icon: XCircle,
        };
    }
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `${Math.round(value)}%`;
  };

  const formatHours = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const hrs = Math.floor(value);
    const mins = Math.round((value - hrs) * 60);
    return hrs === 0 ? `${mins}m` : mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
  };

  const formatGap = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return '-';
    return `${minutes.toFixed(1)} min`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">EOW Team Analytics</CardTitle>
              {analytics && (
                <Badge className={cn('ml-2', getStatusConfig(analytics.status).color)}>
                  {getStatusConfig(analytics.status).label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Week Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date() || date < subWeeks(new Date(), 12)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          {/* Status Details */}
          {analytics && analytics.details.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              {analytics.details.slice(0, 2).join(' • ')}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm">Failed to load weekly analytics</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Attendance Card */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Attendance</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Days</span>
                        <span className="font-medium">{analytics.attendance.activeDays}/{analytics.attendance.scheduledDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">On-Time</span>
                        <span className="font-medium">{formatPercent(analytics.attendance.onTimeRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Shift</span>
                        <span className="font-medium">{formatPercent(analytics.attendance.fullShiftRate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Productivity Card */}
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900 dark:text-green-100">Productivity</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Tickets</span>
                        <span className="font-medium">{analytics.productivity.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quota Met</span>
                        <span className="font-medium">{formatPercent(analytics.productivity.quotaRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Gap</span>
                        <span className="font-medium">{formatGap(analytics.productivity.avgGap)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Time Card */}
                <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900 dark:text-purple-100">Time</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Logged</span>
                        <span className="font-medium">{formatHours(analytics.time.totalLogged)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Required</span>
                        <span className="font-medium">{formatHours(analytics.time.totalRequired)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg/Day</span>
                        <span className="font-medium">{formatHours(analytics.time.avgLoggedPerDay)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Compliance Card */}
                <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-900 dark:text-amber-100">Compliance</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clean Rate</span>
                        <span className="font-medium">{formatPercent(analytics.compliance.cleanRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Incidents</span>
                        <span className="font-medium">{analytics.compliance.totalIncidents}</span>
                      </div>
                      {Object.keys(analytics.compliance.breakdown || {}).length > 0 && (
                        <div className="pt-1 border-t border-amber-200 dark:border-amber-700">
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(analytics.compliance.breakdown).slice(0, 3).map(([type, count]) => {
                              const config = INCIDENT_TYPE_CONFIG[type as IncidentType];
                              return (
                                <span key={type} className="text-xs text-muted-foreground">
                                  {config?.label || type}: {count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No weekly analytics data available for this period.</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
