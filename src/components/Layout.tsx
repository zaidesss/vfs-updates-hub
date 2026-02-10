import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDemoTour } from '@/context/DemoTourContext';
import { useUpdates } from '@/context/UpdatesContext';
import { usePortalClock } from '@/context/PortalClockContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, User, Settings, LogOut, Bell, BarChart3, FileQuestion, 
  CalendarDays, Clock, Users, BookOpen, KeyRound, ChevronDown, HelpCircle, Lightbulb, ClipboardList, LayoutDashboard, Activity, Ticket, FileWarning, GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/NotificationBell';
import ImprovementsTracker from '@/components/ImprovementsTracker';
import { PendingUpdatesModal } from '@/components/PendingUpdatesModal';
import type { Update } from '@/types';

interface LayoutProps {
  children: ReactNode;
}

// Define menu groups
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

/** Compact live EST clock for the navbar */
function PortalClockDisplay() {
  const { now } = usePortalClock();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const shortTimeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums" title="Portal Time (EST)">
      <Clock className="h-3.5 w-3.5" />
      <span className="hidden lg:inline">EST {timeStr}</span>
      <span className="lg:hidden">{shortTimeStr}</span>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin, isHR, isSuperAdmin, profileId: userProfileId } = useAuth();
  const { openTour } = useDemoTour();
  const { getPendingUpdates, ensureLoaded } = useUpdates();
  const location = useLocation();
  const [showImprovements, setShowImprovements] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingUpdatesForLogout, setPendingUpdatesForLogout] = useState<Update[]>([]);

  // Ensure updates are loaded for pending check
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const handleLogoutClick = () => {
    if (user?.email) {
      const pending = getPendingUpdates(user.email);
      if (pending.length > 0) {
        setPendingUpdatesForLogout(pending);
        setShowPendingModal(true);
        return;
      }
    }
    logout();
  };

  // Define grouped navigation
  const getNavGroups = (): NavGroup[] => {
    const groups: NavGroup[] = [];

    // Updates Group
    groups.push({
      label: 'Updates',
      icon: FileText,
      items: [
        { href: '/updates', label: 'Updates', icon: FileText },
        { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
        { href: '/requests', label: 'Update Requests', icon: FileQuestion },
        { href: '/help-center', label: 'Help Center', icon: HelpCircle },
      ],
    });

    // Outages Group
    const outageItems: NavItem[] = [
      { href: '/leave-request', label: 'Outage Requests', icon: Clock },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    ];
    if (!isAdmin) {
      outageItems.push({ href: '/outage-report', label: 'My Outage Report', icon: User });
    }
    if (isAdmin) {
      outageItems.push({ href: '/outage-stats', label: 'Outage Statistics', icon: BarChart3 });
    }
    groups.push({
      label: 'Outages',
      icon: Clock,
      items: outageItems,
    });

    // People Group
    const peopleItems: NavItem[] = [];
    if (!isAdmin) {
      peopleItems.push({ href: '/profile', label: 'My Bio', icon: User });
      // Dashboard link for agents (below My Bio)
      if (userProfileId) {
        peopleItems.push({ href: `/people/${userProfileId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard });
      }
    }
    if (isAdmin || isHR) {
      peopleItems.push({ href: '/manage-profiles', label: 'All Bios', icon: Users });
    }
    if (isAdmin) {
      peopleItems.push({ href: '/master-directory', label: 'Master Directory', icon: ClipboardList });
      // Dashboard link for admins (below Master Directory)
      if (userProfileId) {
        peopleItems.push({ href: `/people/${userProfileId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard });
      }
    }
    // Team Status Board - available to all users
    peopleItems.push({ href: '/team-status', label: 'Team Status', icon: Activity });
    
    if (peopleItems.length > 0) {
      groups.push({
        label: 'People',
        icon: Users,
        items: peopleItems,
      });
    }

    // Team Performance Group (available to all users)
    groups.push({
      label: 'Team Performance',
      icon: BarChart3,
      items: [
        { href: '/team-performance/ticket-logs', label: 'Ticket Logs', icon: Ticket },
        { href: '/team-performance/qa-evaluations', label: 'QA Evaluations', icon: ClipboardList },
        { href: '/team-performance/agent-reports', label: 'Agent Reports', icon: FileWarning },
        { href: '/team-performance/scorecard', label: 'Scorecard', icon: BarChart3 },
        { href: '/team-performance/revalida', label: 'Revalida', icon: GraduationCap },
        { href: '/team-performance/revalida-v2', label: 'Revalida 2.0', icon: GraduationCap },
      ],
    });

    // Admin Group (only for admin/HR)
    if (isAdmin || isHR) {
      groups.push({
        label: 'Admin',
        icon: Settings,
        items: [
          { href: '/admin', label: 'Admin Panel', icon: Settings },
        ],
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.href);
  };

  // Flat nav items for mobile
  const getMobileNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { href: '/updates', label: 'Upd', icon: FileText },
      { href: '/leave-request', label: 'Out', icon: Clock },
      { href: '/calendar', label: 'Cal', icon: CalendarDays },
    ];
    if (!isAdmin) {
      items.push({ href: '/profile', label: 'Bio', icon: User });
    }
    if (isAdmin || isHR) {
      items.push({ href: '/admin', label: 'Admin', icon: Settings });
    }
    return items;
  };

  const mobileNavItems = getMobileNavItems();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">VFS Agent Portal</span>
            </Link>

            {/* Desktop Navigation with Dropdowns */}
            <nav className="hidden md:flex items-center gap-1">
              {navGroups.map((group) => (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      data-tour={`${group.label.toLowerCase()}-menu`}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                        isGroupActive(group)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <group.icon className="h-4 w-4" />
                      {group.label}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-48 bg-popover border border-border shadow-lg z-50"
                  >
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2 w-full cursor-pointer',
                            location.pathname === item.href && 'bg-accent'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    {/* Improvements Tracker - Admin menu only */}
                    {group.label === 'Admin' && (isAdmin || isHR) && (
                      <DropdownMenuItem 
                        onClick={() => setShowImprovements(true)}
                        className="flex items-center gap-2 w-full cursor-pointer"
                      >
                        <Lightbulb className="h-4 w-4" />
                        Improvements
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <PortalClockDisplay />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              data-tour="help-button"
              onClick={openTour}
              className="text-muted-foreground hover:text-foreground"
              title="Open Demo Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Link to="/change-password">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                title="Change Password"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogoutClick}
              className="text-muted-foreground hover:text-foreground"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
        <div className="flex justify-around py-2">
          {mobileNavItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                location.pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Improvements Tracker Dialog */}
      <ImprovementsTracker
        isOpen={showImprovements}
        onOpenChange={setShowImprovements}
        isSuperAdmin={isSuperAdmin}
        currentUserEmail={user?.email || ''}
        currentUserName={user?.name || ''}
      />

      {/* Pending Updates Modal for Logout */}
      <PendingUpdatesModal
        isOpen={showPendingModal}
        onOpenChange={setShowPendingModal}
        pendingUpdates={pendingUpdatesForLogout}
      />
    </div>
  );
}
