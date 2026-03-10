import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RevalidaAttempt, RevalidaBatch } from '@/lib/revalidaApi';
import { Users, Eye, PenTool, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SubmissionTableProps {
  attempts: RevalidaAttempt[];
  batches: RevalidaBatch[];
  selectedBatchId: string | null;
  onBatchChange: (batchId: string | null) => void;
  onViewAttempt: (attemptId: string) => void;
  onEditAttempt?: (attemptId: string) => void;
  agentNameMap?: Map<string, string>;
  isLoading: boolean;
}

export function SubmissionTable({
  attempts,
  batches,
  selectedBatchId,
  onBatchChange,
  onViewAttempt,
  onEditAttempt,
  agentNameMap,
  isLoading,
}: SubmissionTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'submitted':
      case 'needs_manual_review':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'graded':
        return <Badge className="bg-green-600">Graded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBatchTitle = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    return batch?.title || 'Unknown Batch';
  };

  const resolveAgentName = (email: string) => {
    return agentNameMap?.get(email.toLowerCase()) || email;
  };

  const canEdit = (status: string) => {
    return status === 'graded' || status === 'needs_manual_review' || status === 'submitted';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Submissions
        </CardTitle>
        <Select
          value={selectedBatchId || 'all'}
          onValueChange={(value) => onBatchChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No submissions yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">{resolveAgentName(attempt.agent_email)}</TableCell>
                  <TableCell>{getBatchTitle(attempt.batch_id)}</TableCell>
                  <TableCell>{getStatusBadge(attempt.status)}</TableCell>
                  <TableCell>
                    {attempt.final_percent !== null ? (
                      <span className={`font-medium ${attempt.final_percent >= 95 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {attempt.final_percent.toFixed(1)}%
                      </span>
                    ) : attempt.status === 'in_progress' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-yellow-600">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {attempt.submitted_at ? (
                      format(new Date(attempt.submitted_at), 'MMM d, yyyy HH:mm')
                    ) : (
                      <span className="text-muted-foreground">Not submitted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewAttempt(attempt.id)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onEditAttempt && canEdit(attempt.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditAttempt(attempt.id)}
                          title="Override Scores"
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
