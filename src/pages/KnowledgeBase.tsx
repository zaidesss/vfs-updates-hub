import { Layout } from '@/components/Layout';
import { useUpdates } from '@/context/UpdatesContext';
import { CATEGORY_CONFIG, UpdateCategory } from '@/lib/categories';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, FileText, Clock, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function KnowledgeBase() {
  const { updates } = useUpdates();
  const [searchQuery, setSearchQuery] = useState('');

  // Only show published updates
  const publishedUpdates = useMemo(() => 
    updates.filter(u => u.status === 'published'),
    [updates]
  );

  // Count articles per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    publishedUpdates.forEach(update => {
      if (update.category) {
        counts[update.category] = (counts[update.category] || 0) + 1;
      }
    });
    return counts;
  }, [publishedUpdates]);

  // Get recent updates
  const recentUpdates = useMemo(() => 
    [...publishedUpdates]
      .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())
      .slice(0, 5),
    [publishedUpdates]
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return publishedUpdates.filter(update =>
      update.title.toLowerCase().includes(query) ||
      update.summary.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [publishedUpdates, searchQuery]);

  const categories = Object.entries(CATEGORY_CONFIG) as [UpdateCategory, { label: string; color: string }][];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse articles by category or search for specific topics
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 max-h-96 overflow-auto">
              {searchResults.map(update => (
                <Link
                  key={update.id}
                  to={`/updates/${update.id}`}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <FileText className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{update.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{update.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(([categoryKey, config]) => {
            const count = categoryCounts[categoryKey] || 0;
            return (
              <Link
                key={categoryKey}
                to={`/knowledge-base/${categoryKey}`}
                className="group p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {config.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {count} {count === 1 ? 'article' : 'articles'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Updates */}
        {recentUpdates.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Updates</h2>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {recentUpdates.map(update => (
                <Link
                  key={update.id}
                  to={`/updates/${update.id}`}
                  className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{update.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{update.summary}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(update.posted_at), { addSuffix: true })}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
