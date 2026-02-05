import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RevalidaAttempt, RevalidaBatch } from '@/lib/revalidaApi';
import { ClipboardList, PenTool, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewQueueProps {
  attempts: RevalidaAttempt[];
  batches: RevalidaBatch[];
  onGradeAttempt: (attemptId: string) => void;
  isLoading: boolean;
}

export function ReviewQueue({
  attempts,
  batches,
  onGradeAttempt,
  isLoading,
}: ReviewQueueProps) {
  const getBatchTitle = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    return batch?.title || 'Unknown Batch';
  };

  const pendingAttempts = attempts.filter(a => a.status === 'needs_manual_review');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Manual Review Queue
          {pendingAttempts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingAttempts.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingAttempts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No submissions pending review.</p>
            <p className="text-sm">All situational questions have been graded.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Auto Score</TableHead>
                <TableHead>Manual Questions</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">{attempt.agent_email}</TableCell>
                  <TableCell>{getBatchTitle(attempt.batch_id)}</TableCell>
                  <TableCell>
                    {attempt.auto_total_points > 0 ? (
                      <span>
                        {attempt.auto_score_points}/{attempt.auto_total_points}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {attempt.manual_total_points} pts to grade
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {attempt.submitted_at
                      ? format(new Date(attempt.submitted_at), 'MMM d, yyyy HH:mm')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGradeAttempt(attempt.id)}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Grade
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
