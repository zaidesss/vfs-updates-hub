import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RevalidaV2Attempt } from '@/lib/revalidaV2Api';
import { CheckCircle2, Clock, Info, Eye } from 'lucide-react';

interface AttemptResultV2Props {
  attempt: RevalidaV2Attempt;
  totalPoints: number;
  canViewResults?: boolean;
  onViewResults?: () => void;
}

export function AttemptResultV2({ attempt, totalPoints, canViewResults, onViewResults }: AttemptResultV2Props) {
  const isPending = attempt.status === 'submitted';
  const isGraded = attempt.status === 'graded';
  const percentage = attempt.percentage ?? 0;

  const getScoreColor = () => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-red-600';
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
          {canViewResults && (
            <Button variant="outline" size="sm" onClick={onViewResults} className="mt-4">
              <Eye className="h-4 w-4 mr-2" />
              View My Results
            </Button>
          )}
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

        {canViewResults ? (
          <Button variant="outline" size="sm" onClick={onViewResults}>
            <Eye className="h-4 w-4 mr-2" />
            View My Results
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Correct answers are not shown.</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}