import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { usePortalClock } from '@/context/PortalClockContext';
import { fetchScheduledTeamMembers, CategorizedTeamMembers, TeamMemberStatus } from '@/lib/teamStatusApi';
import { StatusCard } from '@/components/team-status/StatusCard';
import { LiveActivityFeed } from '@/components/team/LiveActivityFeed';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { PageGuideButton } from '@/components/PageGuideButton';
import { RefreshCw, Users, Shield, Phone, MessageSquare, Mail, Shuffle, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type SortOption = 'login' | 'name';

interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  members: TeamMemberStatus[];
  showDashboardLink: boolean;
  sortBy: SortOption;
}

function CategorySection({ title, icon, members, showDashboardLink, sortBy }: CategorySectionProps) {
  if (members.length === 0) return null;

  const sortedMembers = [...members].sort((a, b) => {
    if (sortBy === 'name') {
      return a.fullName.localeCompare(b.fullName);
    }
    return new Date(b.statusSince).getTime() - new Date(a.statusSince).getTime();
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-foreground">
          {title}
        </h2>
        <span className="text-sm text-muted-foreground">
          ({members.length})
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sortedMembers.map(member => (
          <StatusCard
            key={member.profileId}
            member={member}
            showDashboardLink={showDashboardLink}
          />
        ))}
      </div>
    </div>
  );
}

export default function TeamStatusBoard() {
  const { isAdmin, isHR, isSuperAdmin } = useAuth();
  const { now, todayEST, currentTimeMinutes } = usePortalClock();
  const isMobile = useIsMobile();
  
  const [categories, setCategories] = useState<CategorizedTeamMembers>({
    phoneSupport: [],
    chatSupport: [],
    emailSupport: [],
    hybridSupport: [],
    teamLeads: [],
    techSupport: [],
    other: [],
  });
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalOnline, setTotalOnline] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('login');

  const canViewDashboards = isAdmin || isHR || isSuperAdmin;

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchScheduledTeamMembers(todayEST, currentTimeMinutes);
      
      if (!result) {
        setError('No response from team status API');
        return;
      }
      
      if (result.error) {
        setError(result.error);
      } else {
        setCategories(result.categories);
        setTotalScheduled(result.totalScheduled);
        setTotalOnline(result.totalOnline);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasLeadsOrTech = categories.teamLeads.length > 0 || categories.techSupport.length > 0;
  const hasSupportAgents = categories.phoneSupport.length > 0 || 
    categories.chatSupport.length > 0 || 
    categories.emailSupport.length > 0 || 
    categories.hybridSupport.length > 0 ||
    categories.other.length > 0;

  return (
    <Layout>
      <div className="space-y-6">
       {/* Header */}
       <PageHeader
         title="Team Status Board"
         description={`${totalScheduled} scheduled now (${totalOnline} online) · ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} EST`}
       >
           <div className="flex items-center gap-1 rounded-lg border border-border p-1">
             <Button
               variant={sortBy === 'login' ? 'secondary' : 'ghost'}
               size="sm"
               onClick={() => setSortBy('login')}
               className="text-xs"
             >
               By Login
             </Button>
             <Button
               variant={sortBy === 'name' ? 'secondary' : 'ghost'}
               size="sm"
               onClick={() => setSortBy('name')}
               className="text-xs"
             >
               By Name
             </Button>
           </div>
           <Button
             variant="outline"
             size="sm"
             onClick={loadData}
             disabled={isLoading}
           >
             <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
             <span className="ml-2 hidden sm:inline">Refresh</span>
           </Button>
           <PageGuideButton pageId="team-status" />
       </PageHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scheduled</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{totalScheduled}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Online</p>
            <p className="text-2xl font-semibold text-success mt-1">{totalOnline}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">On Break</p>
            <p className="text-2xl font-semibold text-warning mt-1">
              {Object.values(categories).flat().filter(m => m.currentStatus === 'ON_BREAK' || m.currentStatus === 'ON_BIO').length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Offline</p>
            <p className="text-2xl font-semibold text-muted-foreground mt-1">
              {Object.values(categories).flat().filter(m => m.currentStatus === 'LOGGED_OUT').length}
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalScheduled === 0 && (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No one is scheduled right now"
            description="Team members will appear here during their scheduled shift hours."
          />
        )}

        {/* Main Content - Two Column Layout */}
        {!isLoading && !error && totalScheduled > 0 && (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : hasLeadsOrTech && hasSupportAgents ? 'lg:grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
            {/* Support Agents Section (Left Column) */}
            {hasSupportAgents && (
              <div className="space-y-6">
                <CategorySection
                  title="Phone"
                  icon={<Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
                  members={categories.phoneSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Chat"
                  icon={<MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
                  members={categories.chatSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Email"
                  icon={<Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                  members={categories.emailSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Hybrid"
                  icon={<Shuffle className="h-5 w-5 text-pink-600 dark:text-pink-400" />}
                  members={categories.hybridSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />

                <CategorySection
                  title="Logistics"
                  icon={<Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                  members={categories.other}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
              </div>
            )}

            {/* Team Leads & Tech Support Section (Right Column) */}
            {hasLeadsOrTech && (
              <div className="space-y-6">
                <CategorySection
                  title="Team Leads"
                  icon={<Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                  members={categories.teamLeads}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Technical"
                  icon={<Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
                  members={categories.techSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />

                <LiveActivityFeed />
              </div>
            )}

            {/* If only support agents, show activity feed below */}
            {hasSupportAgents && !hasLeadsOrTech && (
              <LiveActivityFeed />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
