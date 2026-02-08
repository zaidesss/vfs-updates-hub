import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RevalidaV2Attempt } from '@/lib/revalidaV2Api';
import { CheckCircle2, Clock, Info } from 'lucide-react';

interface AttemptResultV2Props {
  attempt: RevalidaV2Attempt;
  totalPoints: number;
}

export function AttemptResultV2({ attempt, totalPoints }: AttemptResultV2Props) {
  const isPending = attempt.status === 'submitted';
  const isGraded = attempt.status === 'graded';
  const percentage = attempt.percentage ?? 0;

  const getScoreColor = () => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-green-600';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (isPending) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-700">Pending AI Review</p>
              <p className="text-sm text-amber-600">
                Your situational responses are being graded. Check back soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGraded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium">Assessment Complete</span>
          </div>
          <span className={`text-2xl font-bold ${getScoreColor()}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>

        <Progress 
          value={percentage} 
          className="h-3" 
        />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Correct answers are not shown.</span>
        </div>
      </div>
    );
  }

  return null;
}