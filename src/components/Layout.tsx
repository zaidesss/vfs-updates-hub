import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, User, Settings, LogOut, Bell, BarChart3, FileQuestion, CalendarDays, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin, isHR } = useAuth();
  const location = useLocation();

  const navItems = [
    ...(!isAdmin ? [{ href: '/profile', label: 'Bio', icon: User }] : []),
    { href: '/updates', label: 'Upd', icon: FileText },
    { href: '/requests', label: 'Upd Req', icon: FileQuestion },
    { href: '/leave-request', label: 'Out Req', icon: Clock },
    { href: '/calendar', label: 'Out Cal', icon: CalendarDays },
    ...(!isAdmin ? [{ href: '/outage-report', label: 'Out Rep', icon: User }] : []),
    ...(isAdmin ? [{ href: '/outage-stats', label: 'Out Stats', icon: BarChart3 }] : []),
    ...((isAdmin || isHR) ? [{ href: '/manage-profiles', label: 'All Bios', icon: Users }] : []),
    ...((isAdmin || isHR) ? [{ href: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

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

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    location.pathname === item.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
        <div className="flex justify-around py-2">
          {navItems.map(item => (
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
    </div>
  );
}
