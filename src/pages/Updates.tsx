import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Layout } from '@/components/Layout';
import { UpdateCard } from '@/components/UpdateCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, RefreshCw, Loader2 } from 'lucide-react';

type FilterTab = 'unread' | 'read' | 'all';

export default function Updates() {
  const { user, agents } = useAuth();
  const { updates, isAcknowledged, isLoading, refreshData } = useUpdates();
  const [activeTab, setActiveTab] = useState<FilterTab>('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeAgents = agents.filter(a => a.active);
  const publishedUpdates = updates.filter(u => u.status === 'published');

  const filteredUpdates = useMemo(() => {
    let filtered = publishedUpdates;

    // Filter by read status
    if (activeTab === 'unread') {
      filtered = filtered.filter(u => !isAcknowledged(u.id, user?.email || ''));
    } else if (activeTab === 'read') {
      filtered = filtered.filter(u => isAcknowledged(u.id, user?.email || ''));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.title.toLowerCase().includes(query) ||
        u.summary.toLowerCase().includes(query)
      );
    }

    // Sort by posted date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
    );
  }, [publishedUpdates, activeTab, searchQuery, isAcknowledged, user?.email]);

  const unreadCount = publishedUpdates.filter(u => !isAcknowledged(u.id, user?.email || '')).length;
  const readCount = publishedUpdates.filter(u => isAcknowledged(u.id, user?.email || '')).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Updates</h1>
            <p className="text-muted-foreground mt-1">
              Review the latest process updates and acknowledge when complete
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="unread" className="gap-1.5">
                Unread
                {unreadCount > 0 && (
                  <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="gap-1.5">
                Read
                <span className="text-xs text-muted-foreground">({readCount})</span>
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredUpdates.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground">No updates found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'unread' 
                ? "You're all caught up!" 
                : searchQuery 
                  ? 'Try a different search term'
                  : 'No updates available'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredUpdates.map((update, index) => (
              <div 
                key={update.id} 
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-up"
              >
                <UpdateCard update={update} totalAgents={activeAgents.length} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
