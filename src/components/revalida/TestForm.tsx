import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuestionRenderer } from './QuestionRenderer';
import { RevalidaBatch, RevalidaQuestion, RevalidaAttempt, getTimeRemaining } from '@/lib/revalidaApi';
import { Clock, Send, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

interface TestFormProps {
  batch: RevalidaBatch;
  questions: RevalidaQuestion[];
  attempt: RevalidaAttempt;
  onSubmit: (answers: { question_id: string; answer_value: string }[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TestForm({
  batch,
  questions,
  attempt,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TestFormProps) {
  // Create a map for quick question lookup
  const questionsMap = new Map(questions.map(q => [q.id, q]));
  
  // Order questions based on the attempt's shuffled order
  const orderedQuestions = (attempt.question_order as string[])
    .map(id => questionsMap.get(id))
    .filter(Boolean) as RevalidaQuestion[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = orderedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / orderedQuestions.length) * 100;
  const timeRemaining = getTimeRemaining(batch.end_at);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentIndex < orderedQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const answersArray = orderedQuestions.map(q => ({
      question_id: q.id,
      answer_value: answers[q.id] || '',
    }));
    await onSubmit(answersArray);
  };

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
  const allAnswered = answeredCount === orderedQuestions.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">{batch.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{timeRemaining}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>
              Question {currentIndex + 1} of {orderedQuestions.length}
            </span>
            <span className="text-muted-foreground">
              {answeredCount} of {orderedQuestions.length} answered
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      {currentQuestion && (
        <QuestionRenderer
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          value={answers[currentQuestion.id] || ''}
          onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          disabled={isSubmitting}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0 || isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentIndex === orderedQuestions.length - 1 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Test
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit your test?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {allAnswered ? (
                      'You have answered all questions. Once submitted, you cannot change your answers.'
                    ) : (
                      `You have ${orderedQuestions.length - answeredCount} unanswered question(s). Are you sure you want to submit?`
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review Answers</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    Submit Test
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-3">Jump to question:</p>
          <div className="flex flex-wrap gap-2">
            {orderedQuestions.map((q, idx) => (
              <Button
                key={q.id}
                variant={currentIndex === idx ? 'default' : answers[q.id] ? 'secondary' : 'outline'}
                size="sm"
                className="w-10 h-10"
                onClick={() => setCurrentIndex(idx)}
                disabled={isSubmitting}
              >
                {idx + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
