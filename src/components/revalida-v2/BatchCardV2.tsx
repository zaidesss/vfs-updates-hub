import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RevalidaV2Batch,
  RevalidaV2Attempt,
  isDeadlinePassed,
  getTimeRemaining,
  startAttempt,
} from '@/lib/revalidaV2Api';
import { AttemptResultV2 } from './AttemptResultV2';
import { Clock, Play, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BatchCardV2Props {
  batch: RevalidaV2Batch;
  attempt: RevalidaV2Attempt | null;
  userEmail: string;
  onAttemptStarted: (attempt: RevalidaV2Attempt) => void;
}

export function BatchCardV2({ batch, attempt, userEmail, onAttemptStarted }: BatchCardV2Props) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(batch.end_at));
  const [isStarting, setIsStarting] = useState(false);
  const expired = isDeadlinePassed(batch.end_at);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(batch.end_at));
    }, 60000);
    return () => clearInterval(interval);
  }, [batch.end_at]);

  const handleStartTest = async () => {
    if (expired) {
      toast.error('This assessment has expired');
      return;
    }

    setIsStarting(true);
    try {
      const newAttempt = await startAttempt(batch.id, userEmail);
      onAttemptStarted(newAttempt);
      navigate(`/team-performance/revalida-v2/${batch.id}/take`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start assessment');
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinueTest = () => {
    navigate(`/team-performance/revalida-v2/${batch.id}/take`);
  };

  const getStatusBadge = () => {
    if (expired && !attempt) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (!attempt) {
      return <Badge variant="outline">Not Started</Badge>;
    }
    if (attempt.status === 'in_progress') {
      return <Badge variant="secondary">In Progress</Badge>;
    }
    if (attempt.status === 'submitted') {
      return <Badge className="bg-amber-500">Pending Review</Badge>;
    }
    if (attempt.status === 'graded') {
      return <Badge className="bg-green-600">Graded</Badge>;
    }
    return null;
  };

  // Show result if attempt is submitted or graded
  if (attempt && (attempt.status === 'submitted' || attempt.status === 'graded')) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{batch.title}</CardTitle>
              <CardDescription>
                {batch.mcq_count} MCQ • {batch.tf_count} T/F • {batch.situational_count} Situational
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <AttemptResultV2 attempt={attempt} totalPoints={batch.total_points} />
        </CardContent>
      </Card>
    );
  }

  // Show test card for not started or in progress
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{batch.title}</CardTitle>
            <CardDescription>
              {batch.mcq_count} MCQ • {batch.tf_count} T/F • {batch.situational_count} Situational
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Total Points: {batch.total_points}</span>
        </div>

        {!expired && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-amber-600">{timeRemaining}</span>
          </div>
        )}

        {expired && !attempt ? (
          <div className="text-sm text-destructive">
            You did not complete this assessment before the deadline.
          </div>
        ) : attempt?.status === 'in_progress' ? (
          <Button onClick={handleContinueTest} className="w-full">
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue Test
          </Button>
        ) : !attempt && !expired ? (
          <Button onClick={handleStartTest} disabled={isStarting} className="w-full">
            <Play className="h-4 w-4 mr-2" />
            {isStarting ? 'Starting...' : 'Start Test'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}