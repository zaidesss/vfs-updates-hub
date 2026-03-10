import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, Calendar, Tag, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ChangelogEntry {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  category: string;
  feature_link: string | null;
  visible_to_roles: string[];
  created_by: string;
  created_at: string;
}

interface ChangelogView {
  id: string;
  user_email: string;
  changelog_id: string;
  viewed_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Profile': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Updates': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Leave': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Notifications': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Calendar': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Other': 'bg-muted text-muted-foreground',
};

interface WhatsNewTabProps {
  onUnreadCountChange?: (count: number) => void;
}

export function WhatsNewTab({ onUnreadCountChange }: WhatsNewTabProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChangelog();
  }, [user?.email]);

  const loadChangelog = async () => {
    setIsLoading(true);
    
    // Load changelog entries
    const { data: changelogData, error: changelogError } = await supabase
      .from('portal_changelog')
      .select('*')
      .order('created_at', { ascending: false });

    if (changelogError) {
      console.error('Error loading changelog:', changelogError);
    } else {
      setEntries(changelogData || []);
    }

    // Load viewed entries for current user (using localStorage for now)
    // In production, you might want a database table for this
    const storedViews = localStorage.getItem(`changelog_viewed_${user?.email}`);
    if (storedViews) {
      setViewedIds(new Set(JSON.parse(storedViews)));
    }

    setIsLoading(false);
  };

  // Mark all as viewed
  const markAllAsViewed = () => {
    const allIds = entries.map(e => e.id);
    const newViewedIds = new Set(allIds);
    setViewedIds(newViewedIds);
    localStorage.setItem(`changelog_viewed_${user?.email}`, JSON.stringify(allIds));
    onUnreadCountChange?.(0);
  };

  // Mark single entry as viewed
  const markAsViewed = (entryId: string) => {
    if (!viewedIds.has(entryId)) {
      const newViewedIds = new Set([...viewedIds, entryId]);
      setViewedIds(newViewedIds);
      localStorage.setItem(`changelog_viewed_${user?.email}`, JSON.stringify([...newViewedIds]));
      onUnreadCountChange?.(entries.length - newViewedIds.size);
    }
  };

  // Calculate unread count
  useEffect(() => {
    const unreadCount = entries.filter(e => !viewedIds.has(e.id)).length;
    onUnreadCountChange?.(unreadCount);
  }, [entries, viewedIds, onUnreadCountChange]);

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
  };

  const isNew = (entry: ChangelogEntry) => !viewedIds.has(entry.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = entries.filter(e => !viewedIds.has(e.id)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">What's New</h2>
            <p className="text-sm text-muted-foreground">
              Recent updates and improvements to the portal
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsViewed}>
            Mark all as read
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No changes yet</h3>
            <p className="text-muted-foreground mt-2">
              Portal updates will appear here when available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {entries.map((entry) => (
              <div 
                key={entry.id} 
                className="relative pl-14"
                onClick={() => markAsViewed(entry.id)}
              >
                {/* Timeline dot */}
                <div className={`absolute left-4 top-6 h-4 w-4 rounded-full border-4 border-background transition-colors ${
                  isNew(entry) ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
                }`} />

                <Card className={`overflow-hidden transition-all hover:shadow-md ${
                  isNew(entry) ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono">
                            {entry.reference_number}
                          </Badge>
                          <Badge className={getCategoryColor(entry.category)}>
                            <Tag className="h-3 w-3 mr-1" />
                            {entry.category}
                          </Badge>
                          {isNew(entry) && (
                            <Badge className="bg-primary text-primary-foreground">
                              <Sparkles className="h-3 w-3 mr-1" />
                              New
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {entry.description}
                    </p>
                    {entry.feature_link && (
                      <Link to={entry.feature_link}>
                        <Button variant="link" className="p-0 h-auto mt-3 text-primary">
                          Go to feature
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
