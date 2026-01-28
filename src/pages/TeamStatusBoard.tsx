import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { fetchLoggedInTeamMembers, TeamMemberStatus } from '@/lib/teamStatusApi';
import { StatusCard } from '@/components/team-status/StatusCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Shield } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type SortOption = 'login' | 'name';

export default function TeamStatusBoard() {
  const { isAdmin, isHR, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  
  const [agents, setAgents] = useState<TeamMemberStatus[]>([]);
  const [leadsAndTech, setLeadsAndTech] = useState<TeamMemberStatus[]>([]);
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
      setAgents(result.agents);
      setLeadsAndTech(result.leadsAndTech);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sort members based on selected option
  const sortMembers = (members: TeamMemberStatus[]): TeamMemberStatus[] => {
    return [...members].sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      }
      // Default: sort by login time (most recent first)
      return new Date(b.statusSince).getTime() - new Date(a.statusSince).getTime();
    });
  };

  const sortedAgents = sortMembers(agents);
  const sortedLeadsAndTech = sortMembers(leadsAndTech);

  const totalOnline = agents.length + leadsAndTech.length;

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
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-[2fr_1fr]'}`}>
            {/* Agents Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  Agents
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({sortedAgents.length})
                </span>
              </div>
              
              {sortedAgents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortedAgents.map(member => (
                    <StatusCard
                      key={member.profileId}
                      member={member}
                      showDashboardLink={canViewDashboards}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No agents online.</p>
              )}
            </div>

            {/* Team Leads & Tech Support Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  Team Leads & Tech Support
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({sortedLeadsAndTech.length})
                </span>
              </div>
              
              {sortedLeadsAndTech.length > 0 ? (
                <div className="grid gap-4">
                  {sortedLeadsAndTech.map(member => (
                    <StatusCard
                      key={member.profileId}
                      member={member}
                      showDashboardLink={canViewDashboards}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No leads/tech support online.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
