import { Layout } from '@/components/Layout';
import { useUpdates } from '@/context/UpdatesContext';
import { CATEGORY_CONFIG, UpdateCategory, getCategoryLabel } from '@/lib/categories';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, FileText, Clock, ChevronLeft } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function CategoryArticles() {
  const { category } = useParams<{ category: string }>();
  const { updates, ensureLoaded } = useUpdates();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // Validate category
  const isValidCategory = category && category in CATEGORY_CONFIG;
  
  if (!isValidCategory) {
    return <Navigate to="/knowledge-base" replace />;
  }

  const categoryKey = category as UpdateCategory;
  const categoryConfig = CATEGORY_CONFIG[categoryKey];

  // Filter updates for this category
  const categoryUpdates = useMemo(() => 
    updates
      .filter(u => u.status === 'published' && u.category === categoryKey)
      .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()),
    [updates, categoryKey]
  );

  // Search within category
  const filteredUpdates = useMemo(() => {
    if (!searchQuery.trim()) return categoryUpdates;
    const query = searchQuery.toLowerCase();
    return categoryUpdates.filter(update =>
      update.title.toLowerCase().includes(query) ||
      update.summary.toLowerCase().includes(query)
    );
  }, [categoryUpdates, searchQuery]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/knowledge-base">Knowledge Base</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{categoryConfig.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="space-y-2">
          <Link 
            to="/knowledge-base" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{categoryConfig.label}</h1>
          <p className="text-muted-foreground">
            {categoryUpdates.length} {categoryUpdates.length === 1 ? 'article' : 'articles'} in this category
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search in ${categoryConfig.label}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Articles List */}
        {filteredUpdates.length > 0 ? (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {filteredUpdates.map(update => (
              <Link
                key={update.id}
                to={`/updates/${update.id}`}
                className="flex items-start gap-4 p-5 hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-foreground">{update.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{update.summary}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(update.posted_at), { addSuffix: true })}
                    <span className="mx-1">•</span>
                    By {update.posted_by}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={searchQuery ? 'No articles match your search' : 'No articles in this category yet'}
              description={searchQuery ? 'Try a different search term' : undefined}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
