import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { RevalidaAttempt, RevalidaAnswer, RevalidaQuestion, RevalidaBatch } from '@/lib/revalidaApi';
import { format } from 'date-fns';

interface SubmissionDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  attempt: RevalidaAttempt | null;
  batch: RevalidaBatch | null;
  questions: RevalidaQuestion[];
  answers: RevalidaAnswer[];
  isAdmin: boolean;
}

export function SubmissionDetailDialog({
  isOpen,
  onOpenChange,
  attempt,
  batch,
  questions,
  answers,
  isAdmin,
}: SubmissionDetailDialogProps) {
  if (!attempt || !batch) return null;

  // Build maps for lookup
  const questionsMap = new Map(questions.map(q => [q.id, q]));
  const answersMap = new Map(answers.map(a => [a.question_id, a]));

  // Get ordered questions based on attempt's question_order
  const orderedQuestions = (attempt.question_order || [])
    .map(qId => questionsMap.get(qId))
    .filter(Boolean) as RevalidaQuestion[];

  const getStatusBadge = () => {
    switch (attempt.status) {
      case 'graded':
        return <Badge className="bg-green-600">Graded</Badge>;
      case 'needs_manual_review':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'in_progress':
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return null;
    }
  };

  // Calculate totals
  const autoScore = attempt.auto_score_points ?? 0;
  const autoTotal = attempt.auto_total_points ?? 0;
  const manualScore = attempt.manual_score_points ?? 0;
  const manualTotal = attempt.manual_total_points ?? 0;
  const totalScore = autoScore + manualScore;
  const totalPoints = autoTotal + manualTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          {/* Fixed Header Section */}
          <div className="p-6 pb-0 space-y-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submission Details
              </DialogTitle>
              <DialogDescription>
                {attempt.agent_email} - {batch.title}
              </DialogDescription>
            </DialogHeader>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {getStatusBadge()}
              {attempt.submitted_at && (
                <span className="text-muted-foreground">
                  Submitted: {format(new Date(attempt.submitted_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Auto-graded</p>
                <p className="text-lg font-bold">
                  {autoScore}/{autoTotal}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Manual</p>
                <p className="text-lg font-bold">
                  {manualScore}/{manualTotal}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Final Score</p>
                <p className="text-lg font-bold text-primary">
                  {attempt.final_percent !== null 
                    ? `${attempt.final_percent.toFixed(1)}%`
                    : 'Pending'}
                </p>
              </div>
            </div>

            <Separator />
          </div>

          {/* Scrollable Questions Section */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-6 pt-4">
            {orderedQuestions.map((question, idx) => {
              const answer = answersMap.get(question.id);
              const isSituational = question.type === 'situational';
              
              // Determine if answer is correct (for admin display)
              const isCorrect = answer?.is_correct;
              const pointsAwarded = answer?.points_awarded ?? 0;
              const maxPoints = question.points;

              return (
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
                            ({maxPoints} pts)
                          </span>
                        </div>
                        <p className="text-sm">{question.prompt}</p>
                      </div>
                      
                      {/* Admin-only correctness indicator */}
                      {isAdmin && answer && !isSituational && (
                        isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )
                      )}
                      {isAdmin && answer && isSituational && (
                        answer.points_awarded !== null ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                        )
                      )}
                    </div>

                    {/* Agent's Answer */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Answer</p>
                      <div className="p-3 rounded-md bg-muted text-sm">
                        {answer?.answer_value || <em className="text-muted-foreground">No response</em>}
                      </div>
                    </div>

                    {/* Admin-only: Points and Correct Answer for MCQ/TF */}
                    {isAdmin && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className={`font-medium ${pointsAwarded === maxPoints ? 'text-green-600' : pointsAwarded > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {pointsAwarded}/{maxPoints} points
                          </span>
                          
                          {/* Show correct answer for MCQ/TF */}
                          {!isSituational && question.correct_answer && (
                            <span className="text-muted-foreground">
                              Correct: <span className="font-medium">{question.correct_answer}</span>
                            </span>
                          )}
                        </div>
                        
                        {/* Feedback for situational */}
                        {isSituational && answer?.feedback && (
                          <span className="text-muted-foreground italic">
                            Feedback: {answer.feedback}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
