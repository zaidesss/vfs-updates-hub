import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { RevalidaV2Attempt, RevalidaV2Question, RevalidaV2Answer } from '@/lib/revalidaV2Api';

interface SubmissionDetailV2Props {
  attempt: RevalidaV2Attempt;
  questions: RevalidaV2Question[];
  answers: RevalidaV2Answer[];
}

export function SubmissionDetailV2({ attempt, questions, answers }: SubmissionDetailV2Props) {
  const questionsMap = new Map(questions.map(q => [q.id, q]));
  const answersMap = new Map(answers.map(a => [a.question_id, a]));

  // Order questions by attempt's question_order if available, else by order_index
  const orderedQuestions = attempt.question_order?.length
    ? (attempt.question_order
        .map(qId => questionsMap.get(qId))
        .filter(Boolean) as RevalidaV2Question[])
    : [...questions].sort((a, b) => a.order_index - b.order_index);

  const totalScore = attempt.score ?? 0;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = attempt.percentage ?? 0;

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Score</p>
          <p className="text-lg font-bold">{totalScore}/{totalPoints}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Percentage</p>
          <p className="text-lg font-bold text-primary">
            {percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <Separator />

      {/* Questions */}
      <div className="space-y-4">
        {orderedQuestions.map((question, idx) => {
          const answer = answersMap.get(question.id);
          const isSituational = question.type === 'situational';
          const pointsEarned = isSituational
            ? (answer?.admin_override_score ?? answer?.ai_suggested_score ?? answer?.points_earned ?? 0)
            : (answer?.points_earned ?? 0);
          const maxPoints = question.points;
          const isCorrect = answer?.is_correct;

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

                  {/* Correctness indicator */}
                  {answer && !isSituational && (
                    isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
                    )
                  )}
                  {answer && isSituational && (
                    (answer.ai_suggested_score !== undefined && answer.ai_suggested_score !== null) || answer.admin_override_score !== undefined ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                    )
                  )}
                </div>

                {/* Agent's Answer */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Your Answer</p>
                  <div className="p-3 rounded-md bg-muted text-sm">
                    {answer?.agent_answer || <em className="text-muted-foreground">No response</em>}
                  </div>
                </div>

                {/* Points and Correct Answer */}
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-4">
                    <span className={`font-medium ${pointsEarned === maxPoints ? 'text-green-600 dark:text-green-400' : pointsEarned > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                      {pointsEarned}/{maxPoints} points
                    </span>

                    {/* Correct answer for MCQ/TF */}
                    {!isSituational && question.correct_answer && (
                      <span className="text-muted-foreground">
                        Correct: <span className="font-medium">{question.correct_answer}</span>
                      </span>
                    )}
                  </div>

                  {/* AI justification for situational */}
                  {isSituational && answer?.ai_score_justification && (
                    <p className="text-muted-foreground italic text-xs">
                      AI Feedback: {answer.ai_score_justification}
                    </p>
                  )}

                  {/* Admin override note */}
                  {isSituational && answer?.admin_override_score !== undefined && answer?.admin_override_score !== null && (
                    <p className="text-xs text-muted-foreground">
                      Score adjusted by admin
                      {answer.admin_override_reason && `: ${answer.admin_override_reason}`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}