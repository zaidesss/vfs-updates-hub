import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import { findSimilarUpdates } from '@/lib/requestApi';
import { format } from 'date-fns';

interface SimilarUpdate {
  id: string;
  title: string;
  similarity: 'high' | 'medium' | 'low';
  reason: string;
  update: {
    id: string;
    title: string;
    summary: string;
    category: string | null;
    status: string;
    posted_at: string;
  } | null;
}

interface SimilarUpdatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  summary?: string;
  body?: string;
  onEditExisting?: (updateId: string) => void;
}

export function SimilarUpdatesModal({
  open,
  onOpenChange,
  title,
  summary,
  body,
  onEditExisting,
}: SimilarUpdatesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [similarUpdates, setSimilarUpdates] = useState<SimilarUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!title && !summary && !body) {
      setError('Please enter at least a title, summary, or body to search.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const result = await findSimilarUpdates({ title, summary, body });
    
    if (result.error) {
      setError(result.error);
    } else {
      setSimilarUpdates(result.data || []);
    }
    
    setIsLoading(false);
    setHasSearched(true);
  };

  const getSimilarityBadge = (similarity: string) => {
    switch (similarity) {
      case 'high':
        return <Badge variant="destructive">High Match</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500">Medium Match</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Match</Badge>;
      default:
        return <Badge>{similarity}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Check for Similar Updates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!hasSearched && (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Click the button below to use AI to find existing updates that may cover similar topics.
              </p>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Find Similar Updates'
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {hasSearched && !isLoading && !error && (
            <>
              {similarUpdates.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No similar updates found. It's safe to create a new one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Found {similarUpdates.length} potentially similar update(s):
                  </p>
                  {similarUpdates.map((similar) => (
                    <div
                      key={similar.id}
                      className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getSimilarityBadge(similar.similarity)}
                            {similar.update?.status && (
                              <Badge variant="outline">{similar.update.status}</Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{similar.title}</h4>
                          {similar.update?.posted_at && (
                            <p className="text-xs text-muted-foreground">
                              Posted: {format(new Date(similar.update.posted_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        {onEditExisting && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onEditExisting(similar.id);
                              onOpenChange(false);
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Edit This
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{similar.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHasSearched(false);
                    setSimilarUpdates([]);
                  }}
                >
                  Search Again
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
