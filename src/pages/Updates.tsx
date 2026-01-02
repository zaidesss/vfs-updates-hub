import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Layout } from '@/components/Layout';
import { UpdateCard } from '@/components/UpdateCard';
import { UserAcknowledgementDashboard } from '@/components/UserAcknowledgementDashboard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, RefreshCw, Loader2, Filter, MessageSquare } from 'lucide-react';
import { CATEGORIES, UpdateCategory } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { UpdateQuestion } from '@/types';

type FilterTab = 'unread' | 'read' | 'all';

export default function Updates() {
  const { user, isAdmin } = useAuth();
  const { updates, acknowledgements, isAcknowledged, isLoading, refreshData } = useUpdates();

  useEffect(() => {
    document.title = 'Updates | VFS Updates Hub';
  }, []);
  const [activeTab, setActiveTab] = useState<FilterTab>('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<UpdateCategory | 'all'>('all');
  const [questions, setQuestions] = useState<(UpdateQuestion & { update_title?: string; reference_number?: string | null })[]>([]);

  const loadQuestions = async () => {
    if (!isAdmin) return;
    const { data: questionsData } = await supabase
      .from('update_questions')
      .select('*')
      .order('created_at', { ascending: false });
    
    const enrichedQuestions = (questionsData || []).map((q) => {
      const update = updates.find(u => u.id === q.update_id);
      return { ...q, update_title: update?.title || 'Unknown Update' };
    });
    setQuestions(enrichedQuestions);
  };

  useEffect(() => {
    if (isAdmin && updates.length > 0) {
      loadQuestions();
    }
  }, [isAdmin, updates]);

  const publishedUpdates = updates.filter(u => u.status === 'published');

  const filteredUpdates = useMemo(() => {
    let filtered = publishedUpdates;

    // Filter by read status
    if (activeTab === 'unread') {
      filtered = filtered.filter(u => !isAcknowledged(u.id, user?.email || ''));
    } else if (activeTab === 'read') {
      filtered = filtered.filter(u => isAcknowledged(u.id, user?.email || ''));
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(u => u.category === categoryFilter);
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
  }, [publishedUpdates, activeTab, searchQuery, isAcknowledged, user?.email, categoryFilter]);

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

        <div className="flex flex-col gap-4">
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
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as UpdateCategory | 'all')}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <UpdateCard update={update} />
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Team Acknowledgement Overview</h2>
            <UserAcknowledgementDashboard updates={updates} acknowledgements={acknowledgements} />
          </div>
        )}

        {/* Agent Questions - Admin only */}
        {isAdmin && questions.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Agent Questions</CardTitle>
              </div>
              <CardDescription>Questions submitted by agents about updates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref #</TableHead>
                    <TableHead>Update</TableHead>
                    <TableHead>Asked By</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map(q => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {q.reference_number || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate font-medium" title={q.update_title}>{q.update_title}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{getKnownNameByEmail(q.user_email) || q.user_email}</p>
                          <p className="text-xs text-muted-foreground">{q.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate" title={q.question}>{q.question}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(q.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
