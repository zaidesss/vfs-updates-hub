import { useState } from 'react';
import { RevalidaV2Attempt, RevalidaV2Question, upsertAnswer, calculateAttemptScore, updateAttempt } from '@/lib/revalidaV2Api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TestInterfaceProps {
  attempt: RevalidaV2Attempt;
  questions: RevalidaV2Question[];
  onComplete: (score: number, percentage: number) => void;
}

export const TestInterface = ({ attempt, questions, onComplete }: TestInterfaceProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const questionOrder = attempt.question_order || questions.map(q => q.id);
  const orderedQuestion = questions.find(q => q.id === questionOrder[currentIndex]);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion?.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Are you sure? You cannot change your answers after submitting.')) return;

    setIsSubmitting(true);
    try {
      // Save all answers
      for (const question of questions) {
        const answer = answers[question.id];
        if (!answer) continue;

        let isCorrect = false;
        let pointsEarned = 0;

        if (question.type === 'mcq' || question.type === 'true_false') {
          isCorrect = answer === question.correct_answer;
          pointsEarned = isCorrect ? question.points : 0;
        }

        await upsertAnswer({
          id: `${attempt.id}-${question.id}`,
          attempt_id: attempt.id,
          question_id: question.id,
          agent_answer: answer,
          is_correct: question.type !== 'situational' ? isCorrect : null,
          points_earned: question.type !== 'situational' ? pointsEarned : null,
          ai_status: question.type === 'situational' ? 'pending' : 'graded',
        });
      }

      // Calculate score
      const score = await calculateAttemptScore(attempt.id);

      // Update attempt
      await updateAttempt(attempt.id, {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        score: score.score,
        percentage: score.percentage,
      });

      toast.success('Test submitted successfully!');
      onComplete(score.score, score.percentage);
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.error('Failed to submit test');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orderedQuestion) {
    return <div>Loading question...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {orderedQuestion.type === 'mcq' && 'Multiple Choice'}
            {orderedQuestion.type === 'true_false' && 'True/False'}
            {orderedQuestion.type === 'situational' && 'Situational'}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{orderedQuestion.prompt}</CardTitle>
          {orderedQuestion.type === 'situational' && orderedQuestion.evaluation_rubric && (
            <CardDescription className="mt-2 whitespace-pre-wrap">
              {orderedQuestion.evaluation_rubric}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {orderedQuestion.type === 'mcq' && (
            <RadioGroup value={answers[orderedQuestion.id] || ''} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(choice => (
                  <div key={choice} className="flex items-center space-x-2">
                    <RadioGroupItem value={choice} id={`choice-${choice}`} />
                    <Label htmlFor={`choice-${choice}`} className="cursor-pointer flex-1">
                      <strong>{choice}.</strong> {orderedQuestion[`choice_${choice.toLowerCase()}`]}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {orderedQuestion.type === 'true_false' && (
            <RadioGroup value={answers[orderedQuestion.id] || ''} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {['True', 'False'].map(value => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`tf-${value}`} />
                    <Label htmlFor={`tf-${value}`} className="cursor-pointer">
                      {value}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {orderedQuestion.type === 'situational' && (
            <Textarea
              placeholder="Type your response here..."
              value={answers[orderedQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="min-h-32"
            />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Check className="h-4 w-4 mr-1" />
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
