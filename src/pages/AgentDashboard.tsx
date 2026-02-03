import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

import { ProfileHeader } from '@/components/dashboard/ProfileHeader';
import { ShiftScheduleTable } from '@/components/dashboard/ShiftScheduleTable';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { StatusButtons } from '@/components/dashboard/StatusButtons';
import { DailyWorkTracker } from '@/components/dashboard/DailyWorkTracker';
import { DailyEventSummary } from '@/components/dashboard/DailyEventSummary';
import { WeeklySummaryCard } from '@/components/dashboard/WeeklySummaryCard';

import {
  fetchDashboardProfile,
  getProfileStatus,
  updateProfileStatus,
  getApprovedLeavesForWeek,
  getWeekLoginEvents,
  getWeekAllEvents,
  calculateAttendanceForWeek,
  getAgentTagByEmail,
  getTodayTicketCount,
  getTodayGapData,
  fetchUpworkTime,
  autoGenerateLateLoginRequest,
  parseScheduleRange,
  type DashboardProfile,
  type ProfileStatus,
  type EventType,
  type DayAttendance,
  type ProfileEvent,
  type ApprovedLeave,
} from '@/lib/agentDashboardApi';
import { format } from 'date-fns';

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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>('LOGGED_OUT');
  const [statusSince, setStatusSince] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<DayAttendance[]>([]);
  const [allEvents, setAllEvents] = useState<ProfileEvent[]>([]);
  
  // Bio break state
  const [bioTimeRemaining, setBioTimeRemaining] = useState<number | null>(null);
  const [bioAllowance, setBioAllowance] = useState<number | null>(null);
  
  // Refs to prevent duplicate notifications
  const restartExceededNotifiedRef = useRef(false);
  const bioExceededNotifiedRef = useRef(false);
  
  // Daily Work Tracker state
  const [agentTag, setAgentTag] = useState<string | null>(null);
  const [ticketsHandled, setTicketsHandled] = useState(0);
  const [avgGapSeconds, setAvgGapSeconds] = useState<number | null>(null);
  const [isRefreshingTracker, setIsRefreshingTracker] = useState(false);
  
  // Upwork integration state
  const [portalHours, setPortalHours] = useState<number | null>(null);
  const [portalLoginTime, setPortalLoginTime] = useState<string | null>(null);
  const [upworkHours, setUpworkHours] = useState<number | null>(null);
  const [upworkError, setUpworkError] = useState<string | null>(null);
  const [upworkStartTime, setUpworkStartTime] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!profileId) {
      setError('No profile ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile and status in parallel
      const [profileResult, statusResult] = await Promise.all([
        fetchDashboardProfile(profileId),
        getProfileStatus(profileId),
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

      if (statusResult.data) {
        setStatus(statusResult.data.current_status);
        setStatusSince(statusResult.data.status_since);
        setBioTimeRemaining(statusResult.data.bio_time_remaining_seconds);
        setBioAllowance(statusResult.data.bio_allowance_seconds);
        // Reset notification refs when status changes
        restartExceededNotifiedRef.current = false;
        bioExceededNotifiedRef.current = false;
      }

      // Calculate week dates
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

      // Fetch login events, all events (for breaks), and approved leaves in parallel
      const [loginEventsResult, allEventsResult, leavesResult] = await Promise.all([
        getWeekLoginEvents(profileId, weekStart, weekEnd),
        getWeekAllEvents(profileId, weekStart, weekEnd),
        getApprovedLeavesForWeek(profileResult.data.email, weekStart, weekEnd),
      ]);

      const loginEvents: ProfileEvent[] = loginEventsResult.data || [];
      const allEvents: ProfileEvent[] = allEventsResult.data || [];
      const approvedLeaves: ApprovedLeave[] = leavesResult.data || [];

      // Calculate attendance for each day of the week (with break tracking)
      const weekAttendance = calculateAttendanceForWeek(
        profileResult.data,
        loginEvents,
        approvedLeaves,
        weekStart,
        allEvents  // Pass all events for break calculation
      );

      setAttendance(weekAttendance);
      setAllEvents(allEvents);

      // Check for today's attendance and auto-generate Late Login outage if needed
      const todayStr = format(today, 'yyyy-MM-dd');
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

      // Fetch agent tag for ticket tracking
      const { data: tag } = await getAgentTagByEmail(profileResult.data.email);
      if (tag) {
        setAgentTag(tag);
        // Fetch initial ticket data
        const [ticketResult, gapResult] = await Promise.all([
          getTodayTicketCount(tag),
          getTodayGapData(tag),
        ]);
        setTicketsHandled(ticketResult.data);
        setAvgGapSeconds(gapResult.data?.avgGapSeconds || null);
      }
      
      // Calculate portal hours and login time from today's attendance
      const todayAttendanceForHours = weekAttendance.find(
        (d) => format(d.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      );
      if (todayAttendanceForHours?.hoursWorkedMinutes) {
        setPortalHours(todayAttendanceForHours.hoursWorkedMinutes / 60);
      }
      if (todayAttendanceForHours?.loginTime) {
        setPortalLoginTime(todayAttendanceForHours.loginTime);
      }
      
      // Fetch Upwork hours if contract ID exists
      if (profileResult.data.upwork_contract_id) {
        const todayStr = format(today, 'yyyy-MM-dd');
        const upworkResult = await fetchUpworkTime(
          profileResult.data.upwork_contract_id,
          todayStr,
          profileResult.data.email // Pass email for database logging
        );
        if (upworkResult.error) {
          setUpworkError(upworkResult.error);
          setUpworkHours(null);
          setUpworkStartTime(null);
        } else {
          setUpworkHours(upworkResult.hours);
          setUpworkStartTime(upworkResult.firstCellTime);
          setUpworkError(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh tracker data manually
  const handleRefreshTracker = async () => {
    if (!agentTag) return;
    
    setIsRefreshingTracker(true);
    try {
      const [ticketResult, gapResult] = await Promise.all([
        getTodayTicketCount(agentTag),
        getTodayGapData(agentTag),
      ]);
      setTicketsHandled(ticketResult.data);
      setAvgGapSeconds(gapResult.data?.avgGapSeconds || null);
    } catch (err) {
      console.error('Failed to refresh tracker:', err);
    } finally {
      setIsRefreshingTracker(false);
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
              </h1>
              <p className="text-muted-foreground text-sm truncate">
                {profile.full_name || profile.agent_name || profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Header */}
        <ProfileHeader profile={profile} />

        {/* Shift Schedule with Attendance */}
        <ShiftScheduleTable profile={profile} attendance={attendance} />

        {/* Weekly Summary */}
        <WeeklySummaryCard attendance={attendance} allEvents={allEvents} />

        {/* Today's Activity + Status Control - side by side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Event Summary */}
          <DailyEventSummary events={allEvents} />

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
              />
            </CardContent>
          </Card>
        </div>

        {/* Daily Work Tracker */}
        <DailyWorkTracker 
          quota={profile.quota}
          ticketsHandled={ticketsHandled}
          avgGapSeconds={avgGapSeconds}
          onRefresh={handleRefreshTracker}
          isRefreshing={isRefreshingTracker}
          portalHours={portalHours}
          portalLoginTime={portalLoginTime}
          upworkHours={upworkHours}
          upworkError={upworkError}
          upworkStartTime={upworkStartTime}
          hasUpworkContract={!!profile.upwork_contract_id}
        />
      </div>
    </Layout>
  );
}
