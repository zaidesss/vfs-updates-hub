import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePortalClock } from '@/context/PortalClockContext';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { getTodayEST } from '@/lib/timezoneUtils';
import { supabase } from '@/integrations/supabase/client';

import { ProfileHeader } from '@/components/dashboard/ProfileHeader';
import { ShiftScheduleTable } from '@/components/dashboard/ShiftScheduleTable';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { StatusButtons } from '@/components/dashboard/StatusButtons';
import { DailyWorkTracker } from '@/components/dashboard/DailyWorkTracker';
import { DailyEventSummary } from '@/components/dashboard/DailyEventSummary';
import { WeeklySummaryCard } from '@/components/dashboard/WeeklySummaryCard';
import { DashboardWeekSelector } from '@/components/dashboard/DashboardWeekSelector';

import {
  fetchDashboardProfile,
  fetchAgentDashboardRPC,
  getProfileStatus,
  updateProfileStatus,
  getApprovedLeavesForWeek,
  getWeekLoginEvents,
  getWeekAllEvents,
  calculateAttendanceForWeek,
  getAgentTagByEmail,
  getTodayTicketCountByType,
  getWeekTicketCountByType,
  getWeekAvgGapData,
  getDayTicketCountByType,
  getDayAvgGapData,
  getDayPortalHours,
  fetchUpworkTimeFromCache,
  fetchUpworkTimeForWeek,
  fetchUpworkTimeForDay,
  autoGenerateLateLoginRequest,
  parseScheduleRange,
  fetchCoverageOverridesForAgent,
  getDataSourceForWeek,
  fetchAttendanceDualRead,
  type DashboardProfile,
  type ProfileStatus,
  type EventType,
  type DayAttendance,
  type ProfileEvent,
  type ApprovedLeave,
  type TicketCountByType,
  type CoverageOverrideForWeek,
} from '@/lib/agentDashboardApi';

/**
 * Calculate bio allowance based on shift duration
 * 8+ hours = 4 mins, less = 2 mins
 */
function calculateBioAllowanceFromSchedule(profile: DashboardProfile): number {
  const dayMap: Record<number, keyof DashboardProfile> = {
    0: 'sun_schedule',
    1: 'mon_schedule',
    2: 'tue_schedule',
    3: 'wed_schedule',
    4: 'thu_schedule',
    5: 'fri_schedule',
    6: 'sat_schedule',
  };
  
  const today = new Date().getDay();
  const scheduleKey = dayMap[today];
  const schedule = profile[scheduleKey] as string | null;
  
  if (!schedule) return 2 * 60; // Default 2 mins (120 seconds)
  
  const parsed = parseScheduleRange(schedule);
  if (!parsed) return 2 * 60;
  
  let durationMinutes = parsed.endMinutes - parsed.startMinutes;
  if (durationMinutes < 0) durationMinutes += 24 * 60;
  
  // 8+ hours (480 mins) = 4 mins (240 secs), otherwise 2 mins (120 secs)
  return durationMinutes >= 480 ? 4 * 60 : 2 * 60;
}

export default function AgentDashboard() {
  const { profileId } = useParams<{ profileId: string }>();
  const { user, isAdmin, isHR } = useAuth();
  const { currentDayKey } = usePortalClock();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>('LOGGED_OUT');
  const [statusSince, setStatusSince] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<DayAttendance[]>([]);
  const [allEvents, setAllEvents] = useState<ProfileEvent[]>([]);
  const [dataSource, setDataSource] = useState<'snapshot' | 'live'>('live');
  
  // Week selector state - use EST for consistent week boundaries
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in EST timezone
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  });
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  
  // Day selector state - default to current day for current week, or Sunday for past weeks
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const now = new Date();
    const todayEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return todayEST;
  });
  
  // Bio break state
  const [bioTimeRemaining, setBioTimeRemaining] = useState<number | null>(null);
  const [bioAllowance, setBioAllowance] = useState<number | null>(null);
  
  // Refs to prevent duplicate notifications
  const restartExceededNotifiedRef = useRef(false);
  const bioExceededNotifiedRef = useRef(false);
  
  // Daily Work Tracker state
  const [agentTag, setAgentTag] = useState<string | null>(null);
  const [ticketCounts, setTicketCounts] = useState<TicketCountByType>({ email: 0, chat: 0, call: 0, total: 0, otEmail: 0 });
  const [avgGapSeconds, setAvgGapSeconds] = useState<number | null>(null);
  const [isRefreshingTracker, setIsRefreshingTracker] = useState(false);
  
  // Upwork integration state
  const [portalHours, setPortalHours] = useState<number | null>(null);
  const [portalLoginTime, setPortalLoginTime] = useState<string | null>(null);
  const [upworkHours, setUpworkHours] = useState<number | null>(null);
  const [upworkSyncedAt, setUpworkSyncedAt] = useState<string | null>(null);
  const [upworkError, setUpworkError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!profileId) {
      setError('No profile ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile (full fields) and RPC data (status/metrics) in parallel
      // This reduces 4+ queries to 2 queries
      const [profileResult, rpcResult, statusResult] = await Promise.all([
        fetchDashboardProfile(profileId),
        fetchAgentDashboardRPC(profileId, selectedDate), // Pass selected date for week calculation
        getProfileStatus(profileId), // Still need this for bio fields not in RPC
      ]);

      if (profileResult.error) {
        setError(profileResult.error);
        return;
      }

      if (!profileResult.data) {
        setError('Profile not found');
        return;
      }

      setProfile(profileResult.data);

      // Use RPC data for status and avg gap, get ticket breakdown separately
      if (rpcResult.data) {
        setStatus(rpcResult.data.current_status);
        setStatusSince(rpcResult.data.status_since);
      } else if (statusResult.data) {
        // Fallback to direct status query
        setStatus(statusResult.data.current_status);
        setStatusSince(statusResult.data.status_since);
      }
      
      // Bio fields always from direct status query
      if (statusResult.data) {
        setBioTimeRemaining(statusResult.data.bio_time_remaining_seconds);
        setBioAllowance(statusResult.data.bio_allowance_seconds);
        restartExceededNotifiedRef.current = false;
        bioExceededNotifiedRef.current = false;
      }

      // Fetch login events, all events, approved leaves, and coverage overrides in parallel
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      // Use dual-read: snapshots for old weeks, live data for recent weeks
      const dualReadResult = await fetchAttendanceDualRead(
        profileResult.data,
        weekStart,
        weekEnd,
        profileId
      );

      const weekAttendance = dualReadResult.data || [];
      const source = dualReadResult.dataSource;

      // For live data, also fetch all events for the Activity card
      let fetchedAllEvents: ProfileEvent[] = [];
      if (source === 'live') {
        const allEventsResult = await getWeekAllEvents(profileId, weekStart, weekEnd);
        fetchedAllEvents = allEventsResult.data || [];
      }

      setAttendance(weekAttendance);
      setAllEvents(fetchedAllEvents);
      setDataSource(source);

      // Check for today's attendance and auto-generate Late Login outage if needed
      const todayStr = getTodayEST();
      const todayAttendance = weekAttendance.find(
        (d) => format(d.date, 'yyyy-MM-dd') === todayStr
      );
      
      // If today's status is "late" and there's a login time, auto-generate outage request
      if (todayAttendance?.status === 'late' && todayAttendance.loginTime && todayAttendance.scheduleStart) {
        // Parse schedule start time to minutes
        const scheduleStartParsed = todayAttendance.scheduleStart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (scheduleStartParsed) {
          let schedH = parseInt(scheduleStartParsed[1], 10);
          const schedM = parseInt(scheduleStartParsed[2], 10);
          const schedPeriod = scheduleStartParsed[3].toUpperCase();
          if (schedPeriod === 'PM' && schedH !== 12) schedH += 12;
          if (schedPeriod === 'AM' && schedH === 12) schedH = 0;
          const scheduleStartMinutes = schedH * 60 + schedM;

          // Parse login time to minutes
          const loginParsed = todayAttendance.loginTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (loginParsed) {
            let loginH = parseInt(loginParsed[1], 10);
            const loginM = parseInt(loginParsed[2], 10);
            const loginPeriod = loginParsed[3].toUpperCase();
            if (loginPeriod === 'PM' && loginH !== 12) loginH += 12;
            if (loginPeriod === 'AM' && loginH === 12) loginH = 0;
            const loginTimeMinutes = loginH * 60 + loginM;

            // Auto-generate the late login request
            autoGenerateLateLoginRequest(
              profileResult.data.email,
              scheduleStartMinutes,
              loginTimeMinutes,
              todayStr
            ).catch(err => {
              console.error('Failed to auto-generate late login request:', err);
            });
          }
        }
      }

      // Fetch agent tag for detailed ticket breakdown
      const { data: tag } = await getAgentTagByEmail(profileResult.data.email);
      
      // Determine the appropriate day to fetch data for (shared across branches)
      const now = new Date();
      const todayEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const currentWeekStart = startOfWeek(todayEST, { weekStartsOn: 1 });
      const isCurrentWeek = format(weekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');
      
      // Default day: today for current week, Sunday for past weeks
      const defaultDay = isCurrentWeek ? todayEST : weekEnd;
      setSelectedDay(defaultDay);
      
      if (tag) {
        setAgentTag(tag);
        
        // Fetch per-type ticket breakdown for the selected day
        const ticketResult = await getDayTicketCountByType(tag, defaultDay);
        setTicketCounts(ticketResult.data);
        
        // Fetch avg gap for the selected day
        const gapResult = await getDayAvgGapData(tag, defaultDay);
        setAvgGapSeconds(gapResult.data.avgGapSeconds);
        
        // Fetch portal hours for the selected day
        const portalResult = await getDayPortalHours(profileId, defaultDay);
        setPortalHours(portalResult.data.hours);
        setPortalLoginTime(portalResult.data.loginTime);
      } else {
        // No tag, get portal hours from the attendance for the selected day
        const dayStr = format(defaultDay, 'yyyy-MM-dd');
        const dayAttendance = weekAttendance.find((d) => format(d.date, 'yyyy-MM-dd') === dayStr);
        setPortalHours(dayAttendance?.hoursWorkedMinutes ? dayAttendance.hoursWorkedMinutes / 60 : null);
        setPortalLoginTime(dayAttendance?.loginTime || null);
      }
      
      // Fetch Upwork hours for the selected day if contract ID exists
      if (profileResult.data.upwork_contract_id) {
        const upworkResult = await fetchUpworkTimeForDay(
          profileResult.data.upwork_contract_id,
          defaultDay
        );
        if (upworkResult.error) {
          setUpworkError(upworkResult.error);
          setUpworkHours(null);
          setUpworkSyncedAt(null);
        } else {
          setUpworkHours(upworkResult.hours);
          setUpworkSyncedAt(upworkResult.syncedAt);
          setUpworkError(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [profileId, selectedDate, weekStart, weekEnd]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh tracker data for the selected day
  const handleRefreshTracker = async () => {
    if (!profileId) return;
    
    setIsRefreshingTracker(true);
    try {
      // Fetch ticket and gap data if agent tag is available
      if (agentTag) {
        let ticketResult;
        
        // If viewing snapshot data, use OT count from snapshot
        if (dataSource === 'snapshot') {
          const dayAttendance = attendance.find(a => a.dayKey === format(selectedDay, 'yyyy-MM-dd'));
          if (dayAttendance?.otTicketCount !== undefined) {
            // For snapshot mode, merge snapshot's OT count with live ticket data
            const liveTickets = await getDayTicketCountByType(agentTag, selectedDay);
            ticketResult = {
              data: {
                ...liveTickets.data,
                otEmail: dayAttendance.otTicketCount
              }
            };
          } else {
            ticketResult = await getDayTicketCountByType(agentTag, selectedDay);
          }
        } else {
          ticketResult = await getDayTicketCountByType(agentTag, selectedDay);
        }
        
        setTicketCounts(ticketResult.data);
        
        // Fetch avg gap for selected day
        const gapResult = await getDayAvgGapData(agentTag, selectedDay);
        setAvgGapSeconds(gapResult.data.avgGapSeconds);
      }
      
      // Fetch portal hours for selected day
      const portalResult = await getDayPortalHours(profileId, selectedDay);
      setPortalHours(portalResult.data.hours);
      setPortalLoginTime(portalResult.data.loginTime);
      
      // Fetch Upwork hours for selected day if contract exists
      if (profile?.upwork_contract_id) {
        const upworkResult = await fetchUpworkTimeForDay(profile.upwork_contract_id, selectedDay);
        if (upworkResult.error) {
          setUpworkError(upworkResult.error);
          setUpworkHours(null);
          setUpworkSyncedAt(null);
        } else {
          setUpworkHours(upworkResult.hours);
          setUpworkSyncedAt(upworkResult.syncedAt);
          setUpworkError(null);
        }
      }
    } catch (err) {
      console.error('Failed to refresh tracker:', err);
    } finally {
      setIsRefreshingTracker(false);
    }
  };

  // Handle day selection change within the Work Tracker
  const handleDayChange = async (date: Date) => {
    setSelectedDay(date);
    
    if (!profileId) return;
    
    setIsRefreshingTracker(true);
    try {
      // Fetch ticket and gap data if agent tag is available
      if (agentTag) {
        let ticketResult;
        
        // If viewing snapshot data, use OT count from snapshot
        if (dataSource === 'snapshot') {
          const dayAttendance = attendance.find(a => a.dayKey === format(date, 'yyyy-MM-dd'));
          if (dayAttendance?.otTicketCount !== undefined) {
            // For snapshot mode, merge snapshot's OT count with live ticket data
            const liveTickets = await getDayTicketCountByType(agentTag, date);
            ticketResult = {
              data: {
                ...liveTickets.data,
                otEmail: dayAttendance.otTicketCount
              }
            };
          } else {
            ticketResult = await getDayTicketCountByType(agentTag, date);
          }
        } else {
          ticketResult = await getDayTicketCountByType(agentTag, date);
        }
        
        setTicketCounts(ticketResult.data);
        
        // Fetch avg gap for the selected day
        const gapResult = await getDayAvgGapData(agentTag, date);
        setAvgGapSeconds(gapResult.data.avgGapSeconds);
      }
      
      // Fetch portal hours for the selected day
      const portalResult = await getDayPortalHours(profileId, date);
      setPortalHours(portalResult.data.hours);
      setPortalLoginTime(portalResult.data.loginTime);
      
      // Fetch Upwork hours for the selected day if contract exists
      if (profile?.upwork_contract_id) {
        const upworkResult = await fetchUpworkTimeForDay(profile.upwork_contract_id, date);
        if (upworkResult.error) {
          setUpworkError(upworkResult.error);
          setUpworkHours(null);
          setUpworkSyncedAt(null);
        } else {
          setUpworkHours(upworkResult.hours);
          setUpworkSyncedAt(upworkResult.syncedAt);
          setUpworkError(null);
        }
      }
    } catch (err) {
      console.error('Failed to load day data:', err);
    } finally {
      setIsRefreshingTracker(false);
    }
  };

  // Handle week selection change - reset selectedDay to appropriate default
  const handleWeekChange = (date: Date) => {
    setSelectedDate(date);
    
    const now = new Date();
    const todayEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const newWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const newWeekEnd = endOfWeek(date, { weekStartsOn: 1 });
    
    // Check if the new week is the current week
    const currentWeekStart = startOfWeek(todayEST, { weekStartsOn: 1 });
    const isCurrentWeek = format(newWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');
    
    if (isCurrentWeek) {
      // Current week: default to today
      setSelectedDay(todayEST);
    } else {
      // Past week: default to Sunday (end of week)
      setSelectedDay(newWeekEnd);
    }
  };

  const handleStatusChange = async (eventType: EventType) => {
    if (!profileId || !user?.email) return;

    setIsUpdating(true);
    
    const result = await updateProfileStatus(profileId, eventType, user.email);
    
    if (result.success && result.newStatus) {
      setStatus(result.newStatus);
      setStatusSince(new Date().toISOString());
      
      // Reset notification refs on status change
      if (result.newStatus !== 'RESTARTING') {
        restartExceededNotifiedRef.current = false;
      }
      if (result.newStatus !== 'ON_BIO') {
        bioExceededNotifiedRef.current = false;
      }
      
      // Update bio remaining from API result if available
      if (result.bioTimeRemaining !== undefined) {
        setBioTimeRemaining(result.bioTimeRemaining);
      }
      
      toast({
        title: 'Status Updated',
        description: `Status changed to ${result.newStatus.replace('_', ' ')}`,
      });
      
      // Reload attendance data after status change
      await loadDashboardData();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update status',
        variant: 'destructive',
      });
    }
    
    setIsUpdating(false);
  };

  // Callback when device restart exceeds 5 minutes
  const handleRestartExceeded = useCallback(async () => {
    if (restartExceededNotifiedRef.current || !profile) return;
    restartExceededNotifiedRef.current = true;
    
    try {
      await supabase.functions.invoke('send-status-alert-notification', {
        body: {
          agentEmail: profile.email,
          agentName: profile.full_name || profile.agent_name || profile.email,
          alertType: 'EXCESSIVE_RESTART',
          details: { elapsedSeconds: 300 },
        },
      });
    } catch (err) {
      console.error('Failed to send restart alert:', err);
    }
  }, [profile]);

  // Callback when bio break allowance is depleted
  const handleBioExceeded = useCallback(async () => {
    if (bioExceededNotifiedRef.current || !profile) return;
    bioExceededNotifiedRef.current = true;
    
    try {
      await supabase.functions.invoke('send-status-alert-notification', {
        body: {
          agentEmail: profile.email,
          agentName: profile.full_name || profile.agent_name || profile.email,
          alertType: 'BIO_OVERUSE',
          details: { allowance: bioAllowance },
        },
      });
    } catch (err) {
      console.error('Failed to send bio alert:', err);
    }
  }, [profile, bioAllowance]);

  // Access control - admins, HR, or the agent themselves can view
  const canAccess = isAdmin || isHR || (profile && profile.email === user?.email);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-destructive">{error || 'Profile not found'}</p>
          <Link to="/master-directory">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">Access denied. You can only view your own dashboard.</p>
          <Link to="/master-directory">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 sm:gap-4">
            <Link to="/master-directory">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
                <span className="truncate">Agent Dashboard</span>
                {dataSource === 'snapshot' && (
                  <Badge variant="secondary" className="text-xs font-normal ml-1">
                    Snapshot
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground text-sm truncate">
                {profile.full_name || profile.agent_name || profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Header */}
        <ProfileHeader profile={profile} />

        {/* Shift Schedule with Attendance and Week Selector */}
        <ShiftScheduleTable 
          profile={profile} 
          attendance={attendance}
          weekStart={weekStart}
          weekEnd={weekEnd}
          weekSelector={
            <DashboardWeekSelector 
              selectedDate={selectedDate} 
              onDateChange={handleWeekChange} 
            />
          }
        />

        {/* Weekly Summary */}
        <WeeklySummaryCard 
          attendance={attendance} 
          allEvents={allEvents}
          weekStart={weekStart}
          weekEnd={weekEnd}
        />

        {/* Today's Activity + Status Control - side by side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Event Summary */}
          <DailyEventSummary events={allEvents} selectedDay={selectedDay} />

          {/* Status Control */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusIndicator status={status} since={statusSince} />
              <StatusButtons
                currentStatus={status}
                isLoading={isUpdating}
                onStatusChange={handleStatusChange}
                statusSince={statusSince}
                bioTimeRemaining={bioTimeRemaining}
                bioAllowance={bioAllowance ?? (profile ? calculateBioAllowanceFromSchedule(profile) : null)}
                onRestartExceeded={handleRestartExceeded}
                onBioExceeded={handleBioExceeded}
                otEnabled={profile.ot_enabled}
                shiftSchedule={profile[`${currentDayKey}_schedule` as keyof DashboardProfile] as string | null}
                breakSchedule={profile.break_schedule}
              />
            </CardContent>
          </Card>
        </div>

        {/* Daily Work Tracker */}
        <DailyWorkTracker 
          position={profile.position}
          quotaEmail={profile.quota_email}
          quotaChat={profile.quota_chat}
          quotaPhone={profile.quota_phone}
          quotaOtEmail={profile.quota_ot_email}
          ticketCounts={ticketCounts}
          avgGapSeconds={avgGapSeconds}
          onRefresh={handleRefreshTracker}
          isRefreshing={isRefreshingTracker}
          portalHours={portalHours}
          portalLoginTime={portalLoginTime}
          upworkHours={upworkHours}
          upworkError={upworkError}
          upworkSyncedAt={upworkSyncedAt}
          hasUpworkContract={!!profile.upwork_contract_id}
          otEnabled={!!profile.ot_enabled}
          isOnOT={status === 'ON_OT'}
          weekStart={weekStart}
          selectedDay={selectedDay}
          onDayChange={handleDayChange}
        />
      </div>
    </Layout>
  );
}
