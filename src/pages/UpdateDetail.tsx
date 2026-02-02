import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { fetchChangeHistory, submitQuestion } from '@/lib/api';
import { UpdateChangeHistory } from '@/types';
import { Layout } from '@/components/Layout';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { PlaybookPage } from '@/components/playbook/PlaybookPage';
import { PlaybookArticle } from '@/lib/playbookTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCategoryLabel, getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDisplayDate, formatDisplayDateTime } from '@/components/ui/date-picker';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  ExternalLink, 
  CheckCircle2,
  Circle,
  AlertTriangle,
  MessageCircleQuestion,
  History,
  ChevronDown,
  Loader2,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UpdateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUpdateById, isAcknowledged, getAcknowledgement, acknowledgeUpdate, ensureLoaded, isLoading } = useUpdates();

  const [question, setQuestion] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [changeHistory, setChangeHistory] = useState<UpdateChangeHistory[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const update = getUpdateById(id || '');
  const acknowledged = user ? isAcknowledged(id || '', user.email) : false;
  const acknowledgement = user ? getAcknowledgement(id || '', user.email) : undefined;

  // Load change history
  useEffect(() => {
    async function loadHistory() {
      if (id) {
        const { data } = await fetchChangeHistory(id);
        if (data) {
          setChangeHistory(data);
        }
      }
    }
    loadHistory();
  }, [id]);

  // Parse body as Playbook JSON if possible
  const playbookData = useMemo<PlaybookArticle | null>(() => {
    if (!update?.body) return null;
    try {
      const parsed = JSON.parse(update.body);
      if (parsed.title && parsed.sections && Array.isArray(parsed.sections)) {
        return parsed as PlaybookArticle;
      }
    } catch {
      // Not JSON, will render as markdown
    }
    return null;
  }, [update?.body]);

  // Show loading while data is being fetched
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!update) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="bg-muted/50 rounded-lg p-8 max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Update No Longer Available</h2>
            <p className="text-muted-foreground mb-6">
              This update may have been removed or is no longer accessible. 
              Please check the Updates page for the latest content.
            </p>
            <Button onClick={() => navigate('/updates')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Updates
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleAcknowledge = async () => {
    if (user && !acknowledged) {
      await acknowledgeUpdate(update.id, user.email);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!question.trim() || !user) return;

    setIsSubmittingQuestion(true);
    const { error } = await submitQuestion(update.id, update.title, user.email, question);
    setIsSubmittingQuestion(false);

    if (error) {
      toast.error('Failed to submit question');
    } else {
      toast.success('Question submitted! HR will get back to you.');
      setQuestion('');
    }
  };

  // Get display name for posted_by
  const postedByName = getKnownNameByEmail(update.posted_by) || update.posted_by;

  // Check if update is obsolete
  const isObsolete = update.status === 'obsolete';

  // Format field name for display
  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      title: 'Title',
      summary: 'Summary',
      body: 'Body',
      help_center_url: 'Help Center URL',
      posted_by: 'Posted By',
      deadline_at: 'Posted Date',
      status: 'Status',
      category: 'Category',
    };
    return fieldNames[field] || field;
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/updates')}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Updates
        </Button>

        {/* Obsolete Warning Banner */}
        {isObsolete && (
          <div className="bg-destructive text-destructive-foreground p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold text-lg">THIS IS AN OBSOLETE UPDATE</p>
              <p className="text-sm opacity-90">Do not use this information. It has been superseded or is no longer valid.</p>
            </div>
          </div>
        )}

        <Card className={`shadow-md ${isObsolete ? 'border-destructive/50 opacity-75' : ''}`}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {update.category && (
                    <Badge variant="outline" className={cn("text-xs", getCategoryColor(update.category))}>
                      {getCategoryLabel(update.category)}
                    </Badge>
                  )}
                  {isObsolete ? (
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Obsolete
                    </Badge>
                  ) : acknowledged ? (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Acknowledged
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                {update.reference_number && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono mb-1">
                    <Hash className="h-4 w-4" />
                    <span>{update.reference_number}</span>
                  </div>
                )}
                <h1 className="text-2xl font-bold text-foreground">{update.title}</h1>
                <p className="text-muted-foreground mt-2">{update.summary}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>Posted by {postedByName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDisplayDate(update.posted_at)}</span>
              </div>
              {update.deadline_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Due {formatDisplayDateTime(update.deadline_at)}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {playbookData ? (
              <PlaybookPage article={playbookData} />
            ) : (
              <MarkdownRenderer content={update.body} showToc={false} />
            )}

            {update.help_center_url && (
              <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Help Center Article</p>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href={update.help_center_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Article
                  </a>
                </Button>
              </div>
            )}
          </CardContent>

          <Separator />

          {/* Acknowledgement Section */}
          <CardContent className="pt-6">
            {acknowledged && acknowledgement ? (
              <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">You acknowledged this update</p>
                  <p className="text-sm text-muted-foreground">
                    on {formatDisplayDateTime(acknowledgement.acknowledged_at)}
                  </p>
                </div>
              </div>
            ) : !isObsolete ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  After reviewing this update and the linked article, click below to confirm you've read and understood the content.
                </p>
                <Button onClick={handleAcknowledge} size="lg" className="w-full sm:w-auto">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Acknowledge Update
                </Button>
              </div>
            ) : null}
          </CardContent>

          <Separator />

          {/* Questions Section */}
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Got any questions?</h3>
              </div>
              <Textarea
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleSubmitQuestion}
                disabled={!question.trim() || isSubmittingQuestion}
                className="w-full sm:w-auto"
              >
                {isSubmittingQuestion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Question'
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your question will be sent to HR and they will get back to you.
              </p>
            </div>
          </CardContent>

          {/* Change History Section */}
          {changeHistory.length > 0 && (
            <>
              <Separator />
              <CardContent className="pt-6">
                <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground">Change History ({changeHistory.length})</h3>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    {changeHistory.map((entry) => (
                      <div key={entry.id} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">
                            {getKnownNameByEmail(entry.changed_by) || entry.changed_by}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDisplayDateTime(entry.changed_at)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(entry.changes).map(([field, change]) => (
                            <div key={field} className="text-sm">
                              <span className="font-medium">{formatFieldName(field)}:</span>
                              <div className="ml-4 text-muted-foreground">
                                <div className="flex items-start gap-2">
                                  <span className="text-destructive shrink-0">−</span>
                                  <span className="line-through opacity-60 break-all">{change.old || '(empty)'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-success shrink-0">+</span>
                                  <span className="break-all">{change.new || '(empty)'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
