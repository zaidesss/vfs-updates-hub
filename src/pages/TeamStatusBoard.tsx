import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { fetchLoggedInTeamMembers, CategorizedTeamMembers, TeamMemberStatus } from '@/lib/teamStatusApi';
import { StatusCard } from '@/components/team-status/StatusCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Shield, Phone, MessageSquare, Mail, Shuffle } from 'lucide-react';
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
  const [totalOnline, setTotalOnline] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('login');

  const canViewDashboards = isAdmin || isHR || isSuperAdmin;

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await fetchLoggedInTeamMembers();
    
    if (result.error) {
      setError(result.error);
    } else {
      setCategories(result.categories);
      setTotalOnline(result.totalOnline);
    }
    
    setIsLoading(false);
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
              {totalOnline} team member{totalOnline !== 1 ? 's' : ''} online
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
        {!isLoading && !error && totalOnline === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No one is online</h3>
            <p className="text-muted-foreground">
              Team members will appear here when they log in.
            </p>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        {!isLoading && !error && totalOnline > 0 && (
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
                  title="Other"
                  icon={<Users className="h-5 w-5 text-muted-foreground" />}
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
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
