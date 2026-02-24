import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { usePortalClock } from '@/context/PortalClockContext';
import { fetchScheduledTeamMembers, CategorizedTeamMembers, TeamMemberStatus } from '@/lib/teamStatusApi';
import { StatusCard } from '@/components/team-status/StatusCard';
import { ZendeskRealtimePanel } from '@/components/team-status/ZendeskRealtimePanel';
import { LiveActivityFeed } from '@/components/team/LiveActivityFeed';
import { Button } from '@/components/ui/button';
import { PageGuideButton } from '@/components/PageGuideButton';
import { RefreshCw, Users, Shield, Phone, MessageSquare, Mail, Shuffle, Package, Bug } from 'lucide-react';
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
  const { now } = usePortalClock();
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
  const [showDebug, setShowDebug] = useState(false);

  const canViewDashboards = isAdmin || isHR || isSuperAdmin;

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchScheduledTeamMembers(now);
      
      if (!result) {
        setError('No response from team status API');
        console.error('[TeamStatus] fetchScheduledTeamMembers returned undefined');
        return;
      }
      
      if (result.error) {
        setError(result.error);
      } else {
        setCategories(result.categories);
        setTotalScheduled(result.totalScheduled);
        setTotalOnline(result.totalOnline);
      }
      
      console.log('[TeamStatus] loadData result:', {
        totalScheduled: result.totalScheduled,
        totalOnline: result.totalOnline,
        phone: result.categories.phoneSupport.length,
        chat: result.categories.chatSupport.length,
        email: result.categories.emailSupport.length,
        hybrid: result.categories.hybridSupport.length,
        leads: result.categories.teamLeads.length,
        tech: result.categories.techSupport.length,
        other: result.categories.other.length,
        error: result.error,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('[TeamStatus] loadData exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if leads/tech sidebar has content
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
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         <div>
           <h1 className="text-2xl font-bold text-foreground">Team Status Board</h1>
           <p className="text-muted-foreground">
             {totalScheduled} scheduled now ({totalOnline} online)
           </p>
         </div>

         <div className="flex items-center gap-2">
           {/* Sort Toggle */}
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

           {/* Refresh Button */}
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
         </div>
       </div>

        {/* Zendesk Real-Time Stats */}
        <ZendeskRealtimePanel />

        {/* Admin Debug Panel (temporary) */}
        {canViewDashboards && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-muted-foreground"
            >
              <Bug className="h-3 w-3 mr-1" />
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </Button>
            {showDebug && (
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs font-mono space-y-1">
                <p>totalScheduled: {totalScheduled} | totalOnline: {totalOnline}</p>
                <p>phone: {categories.phoneSupport.length} | chat: {categories.chatSupport.length} | email: {categories.emailSupport.length}</p>
                <p>hybrid: {categories.hybridSupport.length} | leads: {categories.teamLeads.length} | tech: {categories.techSupport.length} | other: {categories.other.length}</p>
                <p>clock: {now.toLocaleTimeString()} EST</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">Raw JSON</summary>
                  <pre className="mt-1 max-h-48 overflow-auto text-[10px]">{JSON.stringify(categories, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        )}

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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No one is scheduled right now</h3>
            <p className="text-muted-foreground">
              Team members will appear here during their scheduled shift hours.
            </p>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        {!isLoading && !error && totalScheduled > 0 && (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : hasLeadsOrTech && hasSupportAgents ? 'lg:grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
            {/* Support Agents Section (Left Column) */}
            {hasSupportAgents && (
              <div className="space-y-6">
                <CategorySection
                  title="Phone Support"
                  icon={<Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
                  members={categories.phoneSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Chat Support"
                  icon={<MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
                  members={categories.chatSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Email Support"
                  icon={<Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                  members={categories.emailSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />
                
                <CategorySection
                  title="Hybrid Support"
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
                  title="Technical Support"
                  icon={<Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
                  members={categories.techSupport}
                  showDashboardLink={canViewDashboards}
                  sortBy={sortBy}
                />

                <LiveActivityFeed />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
