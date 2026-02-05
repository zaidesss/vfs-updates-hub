import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuestionCard, QuestionDraft } from './QuestionCard';
import { ArrowLeft, Plus, Save, Send, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RevalidaBatch, RevalidaQuestion } from '@/lib/revalidaApi';

interface QuestionBuilderProps {
  editBatch?: RevalidaBatch | null;
  editQuestions?: RevalidaQuestion[];
  onSaveDraft: (title: string, questions: QuestionDraft[]) => Promise<void>;
  onSaveAndPublish: (title: string, questions: QuestionDraft[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function createEmptyQuestion(orderIndex: number): QuestionDraft {
  return {
    type: 'mcq',
    prompt: '',
    choice_a: '',
    choice_b: '',
    choice_c: '',
    choice_d: '',
    correct_answer: 'A',
    points: 5,
    order_index: orderIndex,
  };
}

function convertExistingQuestion(q: RevalidaQuestion): QuestionDraft {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    choice_a: q.choice_a || '',
    choice_b: q.choice_b || '',
    choice_c: q.choice_c || '',
    choice_d: q.choice_d || '',
    correct_answer: q.correct_answer,
    points: q.points,
    order_index: q.order_index,
  };
}

export function QuestionBuilder({
  editBatch,
  editQuestions,
  onSaveDraft,
  onSaveAndPublish,
  onCancel,
  isSaving,
}: QuestionBuilderProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(editBatch?.title || '');
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    if (editQuestions && editQuestions.length > 0) {
      return editQuestions.map(convertExistingQuestion).sort((a, b) => a.order_index - b.order_index);
    }
    return [createEmptyQuestion(0)];
  });

  const isEditMode = !!editBatch;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const validateQuestions = (): string | null => {
    if (!title.trim()) {
      return 'Batch title is required.';
    }
    if (questions.length === 0) {
      return 'At least one question is required.';
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        return `Question ${i + 1}: Prompt is required.`;
      }
      if (q.type === 'mcq') {
        if (!q.choice_a.trim() || !q.choice_b.trim()) {
          return `Question ${i + 1}: At least choices A and B are required for MCQ.`;
        }
        // Validate correct_answer points to a filled choice
        if (q.correct_answer === 'C' && !q.choice_c.trim()) {
          return `Question ${i + 1}: Correct answer C is selected but choice C is empty.`;
        }
        if (q.correct_answer === 'D' && !q.choice_d.trim()) {
          return `Question ${i + 1}: Correct answer D is selected but choice D is empty.`;
        }
      }
      if (q.type === 'true_false' && !q.correct_answer) {
        return `Question ${i + 1}: Correct answer is required for True/False.`;
      }
    }
    return null;
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [...prev, createEmptyQuestion(prev.length)]);
  };

  const handleUpdateQuestion = (index: number, updated: QuestionDraft) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? updated : q)));
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(prev => {
      const newQuestions = prev.filter((_, i) => i !== index);
      // Re-index
      return newQuestions.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setQuestions(prev => {
      const newQuestions = [...prev];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      return newQuestions.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    setQuestions(prev => {
      const newQuestions = [...prev];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      return newQuestions.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  const handleSaveDraft = async () => {
    const error = validateQuestions();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }
    try {
      await onSaveDraft(title.trim(), questions);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveAndPublish = async () => {
    const error = validateQuestions();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }
    try {
      await onSaveAndPublish(title.trim(), questions);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">
            {isEditMode ? 'Edit Batch' : 'Create New Batch'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Build your questions below
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto space-y-6 pb-32">
        {/* Batch Title */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="batch-title">Batch Title *</Label>
              <Input
                id="batch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., February Week 1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id || index}
              question={question}
              index={index}
              totalQuestions={questions.length}
              onChange={(updated) => handleUpdateQuestion(index, updated)}
              onDelete={() => handleDeleteQuestion(index)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))}
        </div>

        {/* Add Question Button */}
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={handleAddQuestion}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{questions.length} Questions</span>
              <span className="mx-2">|</span>
              <span>{totalPoints} Total Points</span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Save & Publish
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Publish Batch?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will make the test available to agents for 48 hours.
                      Any currently active batch will be deactivated.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveAndPublish}>
                      Publish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
