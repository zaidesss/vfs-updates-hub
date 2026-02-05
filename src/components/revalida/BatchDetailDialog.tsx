import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { RevalidaBatch, RevalidaQuestion, isDeadlinePassed, getTimeRemaining } from '@/lib/revalidaApi';
import { format } from 'date-fns';

interface BatchDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  batch: RevalidaBatch | null;
  questions: RevalidaQuestion[];
}

export function BatchDetailDialog({
  isOpen,
  onOpenChange,
  batch,
  questions,
}: BatchDetailDialogProps) {
  if (!batch) return null;

  const isDraft = !batch.is_active && !batch.start_at;
  const isActive = batch.is_active && !isDeadlinePassed(batch.end_at);
  const isExpired = isDeadlinePassed(batch.end_at);

  const getStatusBadge = () => {
    if (isDraft) return <Badge variant="outline">Draft</Badge>;
    if (isActive) return <Badge className="bg-green-600">Active</Badge>;
    if (isExpired) return <Badge variant="secondary">Expired</Badge>;
    return <Badge variant="secondary">Inactive</Badge>;
  };

  // Sort questions by order_index
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          {/* Fixed Header Section */}
          <div className="p-6 pb-0 space-y-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Batch Details
              </DialogTitle>
              <DialogDescription>{batch.title}</DialogDescription>
            </DialogHeader>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {getStatusBadge()}
              <span className="text-muted-foreground">
                {batch.question_count} Questions
              </span>
              <span className="text-muted-foreground">
                {batch.total_points} Points
              </span>
              {batch.end_at && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {isExpired ? 'Expired' : getTimeRemaining(batch.end_at)}
                </span>
              )}
            </div>

            {batch.start_at && (
              <div className="text-xs text-muted-foreground">
                Published: {format(new Date(batch.start_at), 'MMM d, yyyy h:mm a')}
              </div>
            )}

            <Separator />
          </div>

          {/* Scrollable Questions Section */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-6 pt-4">
                {sortedQuestions.map((question, idx) => (
                  <Card key={question.id} className="border-border">
                    <CardContent className="pt-4 space-y-3">
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              Question {idx + 1}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {question.type === 'mcq' && 'Multiple Choice'}
                              {question.type === 'true_false' && 'True/False'}
                              {question.type === 'situational' && 'Situational'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({question.points} pts)
                            </span>
                          </div>
                          <p className="text-sm">{question.prompt}</p>
                        </div>
                      </div>

                      {/* MCQ Choices */}
                      {question.type === 'mcq' && (
                        <div className="space-y-1.5 pl-2">
                          {question.choice_a && (
                            <div className={`flex items-center gap-2 text-sm p-1.5 rounded ${question.correct_answer === 'A' ? 'bg-green-500/10 text-green-600 font-medium' : ''}`}>
                              {question.correct_answer === 'A' && <CheckCircle2 className="h-4 w-4" />}
                              <span className="font-medium">A.</span> {question.choice_a}
                            </div>
                          )}
                          {question.choice_b && (
                            <div className={`flex items-center gap-2 text-sm p-1.5 rounded ${question.correct_answer === 'B' ? 'bg-green-500/10 text-green-600 font-medium' : ''}`}>
                              {question.correct_answer === 'B' && <CheckCircle2 className="h-4 w-4" />}
                              <span className="font-medium">B.</span> {question.choice_b}
                            </div>
                          )}
                          {question.choice_c && (
                            <div className={`flex items-center gap-2 text-sm p-1.5 rounded ${question.correct_answer === 'C' ? 'bg-green-500/10 text-green-600 font-medium' : ''}`}>
                              {question.correct_answer === 'C' && <CheckCircle2 className="h-4 w-4" />}
                              <span className="font-medium">C.</span> {question.choice_c}
                            </div>
                          )}
                          {question.choice_d && (
                            <div className={`flex items-center gap-2 text-sm p-1.5 rounded ${question.correct_answer === 'D' ? 'bg-green-500/10 text-green-600 font-medium' : ''}`}>
                              {question.correct_answer === 'D' && <CheckCircle2 className="h-4 w-4" />}
                              <span className="font-medium">D.</span> {question.choice_d}
                            </div>
                          )}
                        </div>
                      )}

                      {/* True/False Answer */}
                      {question.type === 'true_false' && (
                        <div className="flex items-center gap-2 text-sm pl-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            Correct Answer: {question.correct_answer}
                          </span>
                        </div>
                      )}

                      {/* Situational Note */}
                      {question.type === 'situational' && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                          <span className="text-sm text-warning">
                            Requires manual grading
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
