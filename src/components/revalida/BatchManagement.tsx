import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RevalidaBatch, getTimeRemaining, isDeadlinePassed } from '@/lib/revalidaApi';
import { Plus, Play, Pause, Trash2, Eye, Edit, FileSpreadsheet, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface BatchManagementProps {
  batches: RevalidaBatch[];
  isLoading: boolean;
  onCreateNew: () => void;
  onEditBatch: (batchId: string) => void;
  onPublish: (batchId: string) => Promise<void>;
  onDeactivate: (batchId: string) => Promise<void>;
  onDelete: (batchId: string) => Promise<void>;
  onViewBatch: (batchId: string) => void;
}

export function BatchManagement({
  batches,
  isLoading,
  onCreateNew,
  onEditBatch,
  onPublish,
  onDeactivate,
  onDelete,
  onViewBatch,
}: BatchManagementProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handlePublish = async (batchId: string) => {
    setActionLoading(batchId);
    try {
      await onPublish(batchId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (batchId: string) => {
    setActionLoading(batchId);
    try {
      await onDeactivate(batchId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (batchId: string) => {
    setActionLoading(batchId);
    try {
      await onDelete(batchId);
    } finally {
      setActionLoading(null);
    }
  };

  const isDraftBatch = (batch: RevalidaBatch) => !batch.is_active && !batch.start_at;

  const getStatusBadge = (batch: RevalidaBatch) => {
    if (isDraftBatch(batch)) {
      return <Badge variant="outline">Draft</Badge>;
    }
    if (batch.is_active && !isDeadlinePassed(batch.end_at)) {
      return <Badge className="bg-green-600">Active</Badge>;
    }
    if (isDeadlinePassed(batch.end_at)) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Batch Management
        </CardTitle>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Batch
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No batches created yet.</p>
            <p className="text-sm">Click "Create New Batch" to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.title}</TableCell>
                  <TableCell>{getStatusBadge(batch)}</TableCell>
                  <TableCell>{batch.question_count}</TableCell>
                  <TableCell>{batch.total_points}</TableCell>
                  <TableCell>
                    {batch.end_at ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {isDeadlinePassed(batch.end_at)
                          ? 'Expired'
                          : getTimeRemaining(batch.end_at)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(batch.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewBatch(batch.id)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Edit button - for drafts and active batches (typo corrections) */}
                      {(isDraftBatch(batch) || (batch.is_active && !isDeadlinePassed(batch.end_at))) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditBatch(batch.id)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Publish button - only for drafts */}
                      {isDraftBatch(batch) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Publish"
                              disabled={actionLoading === batch.id}
                            >
                              {actionLoading === batch.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Publish Batch?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will make the test available to agents for 48 hours. 
                                Only one batch can be active at a time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handlePublish(batch.id)}>
                                Publish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Deactivate button - only for active batches */}
                      {batch.is_active && !isDeadlinePassed(batch.end_at) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Deactivate"
                              disabled={actionLoading === batch.id}
                            >
                              {actionLoading === batch.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pause className="h-4 w-4 text-yellow-600" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Batch?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will immediately stop agents from taking this test.
                                Existing submissions will be preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeactivate(batch.id)}>
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Delete button - only for drafts or expired */}
                      {(!batch.is_active || isDeadlinePassed(batch.end_at)) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              disabled={actionLoading === batch.id}
                            >
                              {actionLoading === batch.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the batch and all associated 
                                questions, attempts, and answers. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(batch.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
