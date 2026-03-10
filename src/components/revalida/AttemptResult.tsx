import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, Eye } from 'lucide-react';
import { RevalidaAttempt } from '@/lib/revalidaApi';

interface AttemptResultProps {
  attempt: RevalidaAttempt;
  canViewResults?: boolean;
  onViewResults?: () => void;
}

export function AttemptResult({ attempt, canViewResults, onViewResults }: AttemptResultProps) {
  if (attempt.status === 'graded' && attempt.final_percent !== null) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">Test Submitted</h3>
            <p className="text-3xl font-bold">
              {attempt.final_percent.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">
              Auto-graded: {attempt.auto_score_points}/{attempt.auto_total_points} points
              {attempt.manual_total_points > 0 && (
                <> | Manual: {attempt.manual_score_points}/{attempt.manual_total_points} points</>
              )}
            </p>
            {canViewResults ? (
              <Button variant="outline" size="sm" onClick={onViewResults} className="mt-2">
                <Eye className="h-4 w-4 mr-2" />
                View My Results
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Note: Correct answers are not shown.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attempt.status === 'submitted' || attempt.status === 'needs_manual_review') {
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-yellow-600">Pending Review</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your test includes situational questions that require manual grading. 
              Your final score will be available once reviewed.
            </p>
            {attempt.auto_total_points > 0 && (
              <p className="text-xs text-muted-foreground">
                Auto-graded portion: {attempt.auto_score_points}/{attempt.auto_total_points} points
              </p>
            )}
            {canViewResults && (
              <Button variant="outline" size="sm" onClick={onViewResults} className="mt-2">
                <Eye className="h-4 w-4 mr-2" />
                View My Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attempt.status === 'in_progress') {
    return (
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-blue-600">In Progress</h3>
            <p className="text-sm text-muted-foreground">
              You have an unfinished test. Click "Continue Test" to resume.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}