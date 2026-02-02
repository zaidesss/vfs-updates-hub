import { useParams, Link, Navigate } from 'react-router-dom';
import { useUpdates } from '@/context/UpdatesContext';
import { PlaybookPage } from '@/components/playbook/PlaybookPage';
import { PlaybookArticle as PlaybookArticleType } from '@/lib/playbookTypes';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useEffect } from 'react';

export default function PlaybookArticle() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const { updates, ensureLoaded, isLoading } = useUpdates();

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const update = useMemo(() => 
    updates.find(u => u.id === id),
    [updates, id]
  );

  // Wait for updates to load before redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!update) {
    return <Navigate to="/knowledge-base" replace />;
  }

  // Try to parse the body as structured JSON
  let articleData: PlaybookArticleType | null = null;
  let parseError = false;

  try {
    const parsed = JSON.parse(update.body);
    if (parsed.title && parsed.sections) {
      articleData = parsed;
    }
  } catch {
    parseError = true;
  }

  // If we can't parse as structured data, show fallback
  if (!articleData) {
    return (
      <div className="min-h-screen bg-[hsl(35,40%,96%)]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link 
            to={category ? `/knowledge-base/${category}` : '/knowledge-base'}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>

          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Legacy Article Format
            </h1>
            <p className="text-muted-foreground mb-4">
              This article uses the old markdown format and needs to be re-formatted with AI.
            </p>
            <Button asChild>
              <Link to={`/updates/${id}`}>View in Classic Mode</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Back button overlay */}
      <div className="fixed top-4 left-4 z-20">
        <Link 
          to={category ? `/knowledge-base/${category}` : '/knowledge-base'}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-[hsl(35,40%,96%)]/90 backdrop-blur-sm rounded-lg border border-[hsl(35,30%,88%)] shadow-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <PlaybookPage article={articleData} />
    </div>
  );
}
