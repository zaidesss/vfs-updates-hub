import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user can reply (admin, HR, or the question asker)
  const canReply = isAdmin || isHR || (user?.email?.toLowerCase() === question?.user_email?.toLowerCase());

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

      // Send notification to the other party
      const isQuestionAsker = user.email.toLowerCase() === question.user_email.toLowerCase();
      
      if (isQuestionAsker) {
        // Notify admins/HR that there's a follow-up
        // For now, we'll skip this as there's no specific admin email list
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  if (!question) return null;

  const questionAskerName = getKnownNameByEmail(question.user_email) || question.user_email;

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
                            {format(new Date(question.created_at), 'MMM d, h:mm a')}
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
                              {format(new Date(item.data.created_at), 'MMM d, h:mm a')}
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
                            {format(new Date(reply.created_at), 'MMM d, h:mm a')}
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

        {!canReply && (
          <p className="text-sm text-muted-foreground text-center py-2 border-t">
            Only admins, HR, or the question asker can reply to this thread.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}