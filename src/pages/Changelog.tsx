import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, ExternalLink, Calendar, Tag, ArrowRight } from 'lucide-react';
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

const CATEGORY_COLORS: Record<string, string> = {
  'Profile': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Updates': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Leave': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Notifications': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Calendar': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export default function Changelog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChangelog();
  }, []);

  const loadChangelog = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('portal_changelog')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading changelog:', error);
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
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
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portal Changelog</h1>
            <p className="text-muted-foreground">
              See what's new and improved in the VFS Agent Portal
            </p>
          </div>
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

            <div className="space-y-6">
              {entries.map((entry, index) => (
                <div key={entry.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className="absolute left-4 top-6 h-4 w-4 rounded-full bg-primary border-4 border-background" />

                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
    </Layout>
  );
}
