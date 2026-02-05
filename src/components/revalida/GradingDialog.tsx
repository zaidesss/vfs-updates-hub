import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RevalidaAttempt, RevalidaAnswer, RevalidaQuestion, RevalidaBatch } from '@/lib/revalidaApi';
import { CheckCircle2, XCircle, PenTool, Loader2, Save } from 'lucide-react';

interface GradingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  attempt: RevalidaAttempt | null;
  batch: RevalidaBatch | null;
  questions: RevalidaQuestion[];
  answers: RevalidaAnswer[];
  onGradeAnswer: (answerId: string, points: number, feedback?: string) => Promise<void>;
  onFinalizeGrading: () => Promise<void>;
  isLoading: boolean;
}

export function GradingDialog({
  isOpen,
  onOpenChange,
  attempt,
  batch,
  questions,
  answers,
  onGradeAnswer,
  onFinalizeGrading,
  isLoading,
}: GradingDialogProps) {
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Build question map
  const questionsMap = new Map(questions.map(q => [q.id, q]));
  const answersMap = new Map(answers.map(a => [a.question_id, a]));

  // Get situational questions and their answers
  const situationalQuestions = questions.filter(q => q.type === 'situational');
  const situationalAnswers = situationalQuestions
    .map(q => {
      const answer = answersMap.get(q.id);
      return answer ? { question: q, answer } : null;
    })
    .filter(Boolean) as { question: RevalidaQuestion; answer: RevalidaAnswer }[];

  // Initialize grades from existing answers
  useEffect(() => {
    const initialGrades: Record<string, { points: number; feedback: string }> = {};
    situationalAnswers.forEach(({ answer }) => {
      initialGrades[answer.id] = {
        points: answer.points_awarded ?? 0,
        feedback: answer.feedback ?? '',
      };
    });
    setGrades(initialGrades);
  }, [answers]);

  const handleGradeChange = (answerId: string, field: 'points' | 'feedback', value: any) => {
    setGrades(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value,
      },
    }));
  };

  const handleSaveGrade = async (answerId: string) => {
    const grade = grades[answerId];
    if (!grade) return;

    setSavingId(answerId);
    try {
      await onGradeAnswer(answerId, grade.points, grade.feedback || undefined);
    } finally {
      setSavingId(null);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await onFinalizeGrading();
      onOpenChange(false);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Check if all situational answers are graded
  const allGraded = situationalAnswers.every(
    ({ answer }) => answer.points_awarded !== null
  );

  // Calculate current totals
  const autoScore = attempt?.auto_score_points ?? 0;
  const autoTotal = attempt?.auto_total_points ?? 0;
  const manualScore = situationalAnswers.reduce(
    (sum, { answer }) => sum + (answer.points_awarded ?? 0),
    0
  );
  const manualTotal = attempt?.manual_total_points ?? 0;
  const totalScore = autoScore + manualScore;
  const totalPoints = autoTotal + manualTotal;
  const currentPercent = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

  if (!attempt || !batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Grade Submission
          </DialogTitle>
          <DialogDescription>
            {attempt.agent_email} - {batch.title}
          </DialogDescription>
        </DialogHeader>

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
            <p className="text-xs text-muted-foreground">Current %</p>
            <p className="text-lg font-bold text-primary">
              {currentPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Grading List */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {situationalAnswers.map(({ question, answer }, idx) => (
              <Card key={answer.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Question {idx + 1}
                        <Badge variant="outline" className="text-xs">
                          Situational
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          (max {question.points} pts)
                        </span>
                      </CardTitle>
                      <p className="text-sm">{question.prompt}</p>
                    </div>
                    {answer.points_awarded !== null ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agent's Response */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Agent's Response</Label>
                    <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">
                      {answer.answer_value || <em className="text-muted-foreground">No response</em>}
                    </div>
                  </div>

                  <Separator />

                  {/* Grading Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`points-${answer.id}`}>Points Awarded</Label>
                      <Input
                        id={`points-${answer.id}`}
                        type="number"
                        min={0}
                        max={question.points}
                        value={grades[answer.id]?.points ?? ''}
                        onChange={(e) =>
                          handleGradeChange(
                            answer.id,
                            'points',
                            Math.min(question.points, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`feedback-${answer.id}`}>Feedback (optional)</Label>
                      <Textarea
                        id={`feedback-${answer.id}`}
                        value={grades[answer.id]?.feedback ?? ''}
                        onChange={(e) => handleGradeChange(answer.id, 'feedback', e.target.value)}
                        placeholder="Add feedback..."
                        rows={2}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveGrade(answer.id)}
                    disabled={savingId === answer.id || isLoading}
                  >
                    {savingId === answer.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Grade
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {allGraded
              ? '✓ All questions graded'
              : `${situationalAnswers.filter(a => a.answer.points_awarded !== null).length}/${situationalAnswers.length} graded`}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={!allGraded || isFinalizing}
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalize Grade
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
