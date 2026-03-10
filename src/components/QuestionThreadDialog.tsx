import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, User, CheckCircle2, RotateCcw, Lock, MessageCircle } from 'lucide-react';
import { formatDisplayDateTime } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type QuestionStatus = 'pending' | 'on_going' | 'answered' | 'closed';

interface QuestionReply {
  id: string;
  question_id: string;
  user_email: string;
  user_name: string | null;
  message: string;
  created_at: string;
}

interface QuestionData {
  id: string;
  update_id: string;
  user_email: string;
  question: string;
  created_at: string;
  reference_number?: string | null;
  update_title?: string;
  reply?: string | null;
  replied_by?: string | null;
  replied_at?: string | null;
  status?: QuestionStatus;
}

interface QuestionThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: QuestionData | null;
  onReplySubmitted?: () => void;
}

export function QuestionThreadDialog({ open, onOpenChange, question, onReplySubmitted }: QuestionThreadDialogProps) {
  const { user, isAdmin, isHR } = useAuth();
  const [replies, setReplies] = useState<QuestionReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<QuestionStatus>('pending');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user can reply (admin, HR, or the question asker)
  const isQuestionAsker = user?.email?.toLowerCase() === question?.user_email?.toLowerCase();
  const canReply = (isAdmin || isHR || isQuestionAsker) && currentStatus !== 'closed';
  
  // Update current status when question changes
  useEffect(() => {
    if (question) {
      setCurrentStatus(question.status || 'pending');
    }
  }, [question]);

  useEffect(() => {
    if (open && question) {
      loadReplies();
    }
  }, [open, question?.id]);

  useEffect(() => {
    // Scroll to bottom when replies change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const loadReplies = async () => {
    if (!question) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_replies')
        .select('*')
        .eq('question_id', question.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (err) {
      console.error('Failed to load replies:', err);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!question || !replyText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Insert the reply
      const { error } = await supabase
        .from('question_replies')
        .insert({
          question_id: question.id,
          user_email: user.email.toLowerCase(),
          user_name: user.name || user.email,
          message: replyText.trim()
        });

      if (error) throw error;

      // Auto-update status to 'on_going' if it was 'pending'
      if (currentStatus === 'pending') {
        await updateStatus('on_going', false);
      }

      // Send notification to the other party
      if (isQuestionAsker) {
        // Notify admins/HR that there's a follow-up
        console.log('Follow-up from question asker - admin notification would go here');
      } else {
        // Notify the question asker that admin/HR replied
        await supabase.functions.invoke('send-question-reply-notification', {
          body: {
            questionId: question.id,
            updateId: question.update_id,
            updateTitle: question.update_title || 'Update',
            replyText: replyText.trim(),
            repliedBy: user.name || user.email,
            userEmail: question.user_email,
            referenceNumber: question.reference_number
          }
        });
      }

      setReplyText('');
      await loadReplies();
      onReplySubmitted?.();
      toast.success('Reply sent');
    } catch (err) {
      console.error('Failed to submit reply:', err);
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (newStatus: QuestionStatus, showToast = true) => {
    if (!question || !user) return;

    try {
      const { error } = await supabase
        .from('update_questions')
        .update({ status: newStatus })
        .eq('id', question.id);

      if (error) throw error;

      setCurrentStatus(newStatus);
      onReplySubmitted?.();
      
      if (showToast) {
        const statusLabels: Record<QuestionStatus, string> = {
          pending: 'Pending',
          on_going: 'On-Going',
          answered: 'Answered',
          closed: 'Closed'
        };
        toast.success(`Status updated to ${statusLabels[newStatus]}`);
      }

      // Send status change notification
      try {
        await supabase.functions.invoke('send-status-change-notification', {
          body: {
            questionId: question.id,
            updateId: question.update_id,
            updateTitle: question.update_title || 'Update',
            referenceNumber: question.reference_number,
            questionAskerEmail: question.user_email,
            questionAskerName: getKnownNameByEmail(question.user_email) || question.user_email,
            newStatus,
            changedBy: user.name || user.email,
            changedByEmail: user.email,
          }
        });
      } catch (notifErr) {
        console.error('Failed to send status notification:', notifErr);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleMarkAnswered = () => updateStatus('answered');
  const handleReopen = () => updateStatus('pending');
  const handleCloseThread = () => updateStatus('closed');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  if (!question) return null;

  const questionAskerName = getKnownNameByEmail(question.user_email) || question.user_email;

  const getStatusBadge = () => {
    const statusConfig: Record<QuestionStatus, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { 
        label: 'Pending', 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: <MessageCircle className="h-3 w-3 mr-1" />
      },
      on_going: { 
        label: 'On-Going', 
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: <MessageCircle className="h-3 w-3 mr-1" />
      },
      answered: { 
        label: 'Answered', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />
      },
      closed: { 
        label: 'Closed', 
        className: 'bg-muted text-muted-foreground',
        icon: <Lock className="h-3 w-3 mr-1" />
      }
    };
    
    const config = statusConfig[currentStatus];
    return (
      <Badge className={config.className}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Build conversation with original question + legacy reply + new replies
  const conversationItems: Array<{ type: 'question' | 'legacy' | 'reply'; data: any }> = [
    { type: 'question', data: question }
  ];

  // Add legacy reply if it exists (from before the thread system)
  if (question.reply) {
    conversationItems.push({
      type: 'legacy',
      data: {
        message: question.reply,
        user_name: question.replied_by,
        created_at: question.replied_at
      }
    });
  }

  // Add new replies
  replies.forEach(reply => {
    conversationItems.push({ type: 'reply', data: reply });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Question Thread</span>
            {question.reference_number && (
              <Badge variant="outline" className="font-mono text-xs">
                {question.reference_number}
              </Badge>
            )}
            {getStatusBadge()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            About: <span className="font-medium">{question.update_title}</span>
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[400px]" ref={scrollRef}>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              conversationItems.map((item, index) => {
                if (item.type === 'question') {
                  // Original question
                  const isCurrentUser = user?.email?.toLowerCase() === question.user_email.toLowerCase();
                  return (
                    <div
                      key="original-question"
                      className={cn(
                        "flex gap-3",
                        isCurrentUser ? "flex-row-reverse" : ""
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className={cn(
                        "flex flex-col max-w-[80%]",
                        isCurrentUser ? "items-end" : ""
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{questionAskerName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDisplayDateTime(question.created_at)}
                          </span>
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-2",
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <p className="text-sm">{question.question}</p>
                        </div>
                      </div>
                    </div>
                  );
                } else if (item.type === 'legacy') {
                  // Legacy reply from before thread system
                  const replierName = item.data.user_name || 'Admin';
                  const isCurrentUser = user?.name === replierName || user?.email === replierName;
                  return (
                    <div
                      key="legacy-reply"
                      className={cn(
                        "flex gap-3",
                        isCurrentUser ? "flex-row-reverse" : ""
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <div className={cn(
                        "flex flex-col max-w-[80%]",
                        isCurrentUser ? "items-end" : ""
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{replierName}</span>
                          {item.data.created_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDisplayDateTime(item.data.created_at)}
                            </span>
                          )}
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-2",
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <p className="text-sm">{item.data.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // New reply from thread system
                  const reply = item.data as QuestionReply;
                  const replierName = reply.user_name || getKnownNameByEmail(reply.user_email) || reply.user_email;
                  const isCurrentUser = user?.email?.toLowerCase() === reply.user_email.toLowerCase();
                  return (
                    <div
                      key={reply.id}
                      className={cn(
                        "flex gap-3",
                        isCurrentUser ? "flex-row-reverse" : ""
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <div className={cn(
                        "flex flex-col max-w-[80%]",
                        isCurrentUser ? "items-end" : ""
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{replierName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDisplayDateTime(reply.created_at)}
                          </span>
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-2",
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <p className="text-sm">{reply.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </ScrollArea>

        {canReply && (
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] resize-none"
              disabled={isSubmitting}
            />
            <Button
              size="icon"
              onClick={handleSubmitReply}
              disabled={!replyText.trim() || isSubmitting}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {currentStatus === 'closed' && (
          <div className="text-sm text-muted-foreground text-center py-2 border-t flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            This thread has been closed and cannot receive new replies.
          </div>
        )}

        {!canReply && currentStatus !== 'closed' && (
          <p className="text-sm text-muted-foreground text-center py-2 border-t">
            Only admins, HR, or the question asker can reply to this thread.
          </p>
        )}

        {/* Helper text for users */}
        {isQuestionAsker && currentStatus !== 'closed' && currentStatus !== 'answered' && (
          <p className="text-xs text-muted-foreground text-center py-2 px-4 bg-muted/50 rounded-md">
            💡 If you think your question has been answered and have no follow-up questions, feel free to mark the status as "Answered" to close this thread.
          </p>
        )}

        {/* Status action buttons */}
        {currentStatus !== 'closed' && (
          <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
            {/* User can mark as answered or reopen */}
            {isQuestionAsker && currentStatus !== 'answered' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAnswered}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark as Answered
              </Button>
            )}
            
            {isQuestionAsker && currentStatus === 'answered' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopen}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Re-open Question
              </Button>
            )}

            {/* Admin/HR can also mark as answered */}
            {(isAdmin || isHR) && !isQuestionAsker && currentStatus !== 'answered' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAnswered}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark as Answered
              </Button>
            )}

            {/* Admin can close thread permanently */}
            {(isAdmin || isHR) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseThread}
                className="text-destructive hover:text-destructive ml-auto"
              >
                <Lock className="h-4 w-4 mr-1" />
                Close Thread
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}