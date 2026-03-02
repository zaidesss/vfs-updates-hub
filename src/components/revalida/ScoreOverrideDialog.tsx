import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RevalidaAttempt, RevalidaAnswer, RevalidaQuestion, RevalidaBatch, overrideAnswer, recalculateAttemptScore } from '@/lib/revalidaApi';
import { CheckCircle2, XCircle, PenTool, Loader2, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/auditLogApi';

interface ScoreOverrideDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  attempt: RevalidaAttempt | null;
  batch: RevalidaBatch | null;
  questions: RevalidaQuestion[];
  answers: RevalidaAnswer[];
  agentNameMap: Map<string, string>;
  graderEmail: string;
  onSaved: () => void;
}

interface OverrideState {
  pointsAwarded: number;
  feedback: string;
  changed: boolean;
}

export function ScoreOverrideDialog({
  isOpen,
  onOpenChange,
  attempt,
  batch,
  questions,
  answers,
  agentNameMap,
  graderEmail,
  onSaved,
}: ScoreOverrideDialogProps) {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<Record<string, OverrideState>>({});
  const [isSaving, setIsSaving] = useState(false);

  const questionsMap = new Map(questions.map(q => [q.id, q]));
  const answersMap = new Map(answers.map(a => [a.question_id, a]));

  // Get ordered questions
  const orderedQuestions = (attempt?.question_order || [])
    .map(qId => questionsMap.get(qId))
    .filter(Boolean) as RevalidaQuestion[];

  // Initialize overrides from current answers
  useEffect(() => {
    const initial: Record<string, OverrideState> = {};
    answers.forEach(a => {
      initial[a.id] = {
        pointsAwarded: a.points_awarded ?? 0,
        feedback: a.feedback ?? '',
        changed: false,
      };
    });
    setOverrides(initial);
  }, [answers]);

  const handleChange = (answerId: string, field: 'pointsAwarded' | 'feedback', value: any) => {
    setOverrides(prev => {
      const original = answers.find(a => a.id === answerId);
      const updated = { ...prev[answerId], [field]: value };
      // Mark as changed if different from original
      const origPoints = original?.points_awarded ?? 0;
      const origFeedback = original?.feedback ?? '';
      updated.changed = updated.pointsAwarded !== origPoints || updated.feedback !== origFeedback;
      return { ...prev, [answerId]: updated };
    });
  };

  const changedCount = Object.values(overrides).filter(o => o.changed).length;

  const handleSave = async () => {
    if (!attempt || changedCount === 0) return;
    setIsSaving(true);
    try {
      const changedAnswers = Object.entries(overrides).filter(([, o]) => o.changed);
      
      // Build audit changes
      const auditChanges: Record<string, { old: any; new: any }> = {};
      
      for (const [answerId, override] of changedAnswers) {
        const original = answers.find(a => a.id === answerId);
        const question = original ? questionsMap.get(original.question_id) : null;
        const isCorrect = override.pointsAwarded > 0;
        
        auditChanges[`answer_${answerId}`] = {
          old: { points: original?.points_awarded, feedback: original?.feedback },
          new: { points: override.pointsAwarded, feedback: override.feedback || null },
        };
        
        await overrideAnswer(answerId, override.pointsAwarded, isCorrect, override.feedback || undefined);
      }

      // Recalculate
      const updated = await recalculateAttemptScore(attempt.id, graderEmail);

      // Audit log
      writeAuditLog({
        area: 'Revalida',
        action_type: 'updated',
        entity_id: attempt.id,
        entity_label: `Score Override: ${agentNameMap.get(attempt.agent_email.toLowerCase()) || attempt.agent_email}`,
        changed_by: graderEmail,
        changes: {
          ...auditChanges,
          final_percent: { old: String(attempt.final_percent), new: String(updated.final_percent) },
        },
        metadata: { version: 'v1', batch_id: attempt.batch_id, override_count: String(changedCount) },
      });

      toast({
        title: 'Scores Updated',
        description: `${changedCount} answer(s) overridden. New score: ${updated.final_percent?.toFixed(1)}%`,
      });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error saving overrides',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!attempt || !batch) return null;

  const agentName = agentNameMap.get(attempt.agent_email.toLowerCase()) || attempt.agent_email;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="shrink-0 p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Score Override
            </DialogTitle>
            <DialogDescription>
              {agentName} — {batch.title}
            </DialogDescription>
          </DialogHeader>

          {/* Current Score Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Auto-graded</p>
              <p className="text-lg font-bold">
                {attempt.auto_score_points}/{attempt.auto_total_points}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Manual</p>
              <p className="text-lg font-bold">
                {attempt.manual_score_points}/{attempt.manual_total_points}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Final Score</p>
              <p className="text-lg font-bold text-primary">
                {attempt.final_percent !== null ? `${attempt.final_percent.toFixed(1)}%` : 'Pending'}
              </p>
            </div>
          </div>

          {changedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              {changedCount} answer(s) modified — save to recalculate
            </div>
          )}

          <Separator />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-0">
          <div className="space-y-4">
            {orderedQuestions.map((question, idx) => {
              const answer = answersMap.get(question.id);
              if (!answer) return null;
              const override = overrides[answer.id];
              if (!override) return null;
              const isSituational = question.type === 'situational';
              const originalPoints = answers.find(a => a.id === answer.id)?.points_awarded ?? 0;

              return (
                <Card key={question.id} className={override.changed ? 'border-yellow-400 dark:border-yellow-600' : ''}>
                  <CardContent className="pt-4 space-y-3">
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            Q{idx + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {question.type === 'mcq' && 'MCQ'}
                            {question.type === 'true_false' && 'T/F'}
                            {question.type === 'situational' && 'Situational'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            (max {question.points} pts)
                          </span>
                          {override.changed && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Modified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{question.prompt}</p>
                      </div>
                      {answer.is_correct === true && !override.changed && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      )}
                      {answer.is_correct === false && !override.changed && (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                    </div>

                    {/* Agent's Answer */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Agent's Answer</p>
                      <div className="p-3 rounded-md bg-muted text-sm">
                        {answer.answer_value || <em className="text-muted-foreground">No response</em>}
                      </div>
                    </div>

                    {/* Correct Answer (for MCQ/TF) */}
                    {!isSituational && question.correct_answer && (
                      <div className="text-sm text-muted-foreground">
                        Correct Answer: <span className="font-medium">{question.correct_answer}</span>
                      </div>
                    )}

                    {/* Editable Points + Feedback */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Points Awarded</Label>
                        <Input
                          type="number"
                          min={0}
                          max={question.points}
                          value={override.pointsAwarded}
                          onChange={(e) =>
                            handleChange(
                              answer.id,
                              'pointsAwarded',
                              Math.min(question.points, Math.max(0, parseInt(e.target.value) || 0))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Override Reason / Feedback</Label>
                        <Textarea
                          value={override.feedback}
                          onChange={(e) => handleChange(answer.id, 'feedback', e.target.value)}
                          placeholder="Reason for override..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex justify-between items-center p-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {changedCount > 0 ? `${changedCount} answer(s) modified` : 'No changes yet'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={changedCount === 0 || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Recalculate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
