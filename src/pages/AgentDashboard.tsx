import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';

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
  type DashboardProfile,
  type ProfileStatus,
  type EventType,
  type DayAttendance,
  type ProfileEvent,
  type ApprovedLeave,
} from '@/lib/agentDashboardApi';

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
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleStatusChange = async (eventType: EventType) => {
    if (!profileId || !user?.email) return;

    setIsUpdating(true);
    
    const result = await updateProfileStatus(profileId, eventType, user.email);
    
    if (result.success && result.newStatus) {
      setStatus(result.newStatus);
      setStatusSince(new Date().toISOString());
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
              />
            </CardContent>
          </Card>
        </div>

        {/* Daily Work Tracker */}
        <DailyWorkTracker quota={profile.quota} />
      </div>
    </Layout>
  );
}
