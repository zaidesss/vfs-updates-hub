import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle2, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { fetchCalendarRequests, CalendarLeaveRequest } from '@/lib/leaveRequestApi';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: 'bg-warning',
  approved: 'bg-success',
};

export default function Calendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<CalendarLeaveRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  useEffect(() => {
    loadRequests();
  }, [currentDate]);

  const loadRequests = async () => {
    setIsLoading(true);
    
    // Get requests for the entire month (with buffer for multi-day events)
    const start = format(subMonths(monthStart, 1), 'yyyy-MM-dd');
    const end = format(addMonths(monthEnd, 1), 'yyyy-MM-dd');
    
    const result = await fetchCalendarRequests(start, end);
    
    if (result.data) {
      setRequests(result.data);
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  const days = useMemo(() => {
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add padding days for the start of the week
    const startPadding = monthStart.getDay();
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    
    return [...paddedDays, ...daysInMonth];
  }, [monthStart, monthEnd]);

  const getRequestsForDay = (date: Date): CalendarLeaveRequest[] => {
    return requests.filter(req => {
      const startDate = parseISO(req.start_date);
      const endDate = parseISO(req.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate }) ||
             isSameDay(date, startDate) ||
             isSameDay(date, endDate);
    });
  };

  const selectedDayRequests = selectedDate ? getRequestsForDay(selectedDate) : [];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar Outages</h1>
          <p className="text-muted-foreground">View all pending and approved leave requests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="h-24 bg-muted/30 rounded-lg" />;
                      }
                      
                      const dayRequests = getRequestsForDay(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "h-24 p-1 rounded-lg border text-left transition-colors hover:bg-accent/50",
                            isToday(day) && "border-primary",
                            !isSameMonth(day, currentDate) && "opacity-50",
                            isSelected && "bg-accent border-primary",
                            !isSelected && "border-border"
                          )}
                        >
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            isToday(day) && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5 overflow-hidden">
                            {dayRequests.slice(0, 2).map(req => (
                              <div
                                key={req.id}
                                className={cn(
                                  "text-[10px] truncate px-1 py-0.5 rounded",
                                  STATUS_COLORS[req.status]
                                )}
                              >
                                {req.agent_name}
                              </div>
                            ))}
                            {dayRequests.length > 2 && (
                              <div className="text-[10px] text-muted-foreground px-1">
                                +{dayRequests.length - 2} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={cn("w-3 h-3 rounded-full", STATUS_DOT_COLORS.pending)} />
                      <span className="text-muted-foreground">Pending</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={cn("w-3 h-3 rounded-full", STATUS_DOT_COLORS.approved)} />
                      <span className="text-muted-foreground">Approved</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Selected day details */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
              </CardTitle>
              <CardDescription>
                {selectedDate 
                  ? `${selectedDayRequests.length} outage${selectedDayRequests.length !== 1 ? 's' : ''}`
                  : 'Click on a day to see details'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-muted-foreground text-sm">Click on a day in the calendar to view outage details.</p>
              ) : selectedDayRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">No outages scheduled for this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayRequests.map(req => (
                    <div key={req.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{req.agent_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {req.client_name}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "flex items-center gap-1",
                          req.status === 'pending' 
                            ? 'bg-warning/10 text-warning border-warning/20' 
                            : 'bg-success/10 text-success border-success/20'
                        )}>
                          {req.status === 'pending' ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <p className="text-muted-foreground">Dates</p>
                        <p>{format(parseISO(req.start_date), 'MMM d')} - {format(parseISO(req.end_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
