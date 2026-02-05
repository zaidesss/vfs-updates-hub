import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, PlayCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { RevalidaBatch, RevalidaAttempt, getTimeRemaining, isDeadlinePassed } from '@/lib/revalidaApi';

interface BatchCardProps {
  batch: RevalidaBatch;
  attempt: RevalidaAttempt | null;
  onStartTest: () => void;
  isStarting?: boolean;
}

export function BatchCard({ batch, attempt, onStartTest, isStarting }: BatchCardProps) {
  const deadlinePassed = isDeadlinePassed(batch.end_at);
  const timeRemaining = getTimeRemaining(batch.end_at);

  const getStatusBadge = () => {
    if (!attempt) {
      if (deadlinePassed) {
        return <Badge variant="destructive">Expired</Badge>;
      }
      return <Badge variant="outline">Not Started</Badge>;
    }

    switch (attempt.status) {
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'submitted':
      case 'needs_manual_review':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'graded':
        return <Badge className="bg-green-600">Graded</Badge>;
      default:
        return null;
    }
  };

  const canStartTest = !attempt && !deadlinePassed && batch.is_active;
  const canContinueTest = attempt?.status === 'in_progress' && !deadlinePassed;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Weekly Knowledge Test
            </CardTitle>
            <p className="text-sm text-muted-foreground">{batch.title}</p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className={deadlinePassed ? 'text-destructive' : ''}>
              {timeRemaining || 'No deadline set'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{batch.question_count} Questions</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{batch.total_points} points total</span>
          </div>
        </div>

        {/* Show result if graded */}
        {attempt?.status === 'graded' && attempt.final_percent !== null && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-600">
                Your Score: {attempt.final_percent.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Correct answers are not shown.
            </p>
          </div>
        )}

        {/* Show pending if needs review */}
        {(attempt?.status === 'submitted' || attempt?.status === 'needs_manual_review') && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-600">
                ⏳ Pending Review
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your test includes situational questions that require manual grading.
            </p>
          </div>
        )}

        {/* Action buttons */}
        {canStartTest && (
          <Button onClick={onStartTest} disabled={isStarting} className="w-full">
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Test
              </>
            )}
          </Button>
        )}

        {canContinueTest && (
          <Button onClick={onStartTest} className="w-full">
            <PlayCircle className="h-4 w-4 mr-2" />
            Continue Test
          </Button>
        )}

        {!canStartTest && !canContinueTest && !attempt && deadlinePassed && (
          <p className="text-sm text-muted-foreground text-center">
            The deadline for this test has passed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
