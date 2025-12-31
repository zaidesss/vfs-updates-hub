import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { PRE_APPROVERS, FINAL_APPROVER, isPreApprover, isFinalApprover } from '@/lib/approvers';
import { fetchArticleRequests, createArticleRequest, approveRequest, finalizeRequestReview, findSimilarUpdates, deleteArticleRequest } from '@/lib/requestApi';
import { ArticleRequestWithApprovals, FinalDecision } from '@/types/request';
import { Plus, Clock, CheckCircle, XCircle, Loader2, UserCheck, Crown, Sparkles, FileText, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SimilarUpdate {
  id: string;
  title: string;
  similarity: 'high' | 'medium' | 'low';
  reason: string;
  update: {
    id: string;
    title: string;
    summary: string;
    category: string | null;
    status: string;
    posted_at: string;
  } | null;
}

export default function Requests() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ArticleRequestWithApprovals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [finalNotes, setFinalNotes] = useState<Record<string, string>>({});
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<string | null>(null);
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false);
  const [showSimilarResults, setShowSimilarResults] = useState(false);
  const [similarUpdates, setSimilarUpdates] = useState<SimilarUpdate[]>([]);
  
  const [newRequest, setNewRequest] = useState({
    category: '',
    request_type: 'new_article',
    sample_ticket: '',
    description: '',
    priority: 'normal',
  });

  const userIsPreApprover = user?.email ? isPreApprover(user.email) : false;
  const userIsFinalApprover = user?.email ? isFinalApprover(user.email) : false;

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    const result = await fetchArticleRequests();
    if (result.data) {
      setRequests(result.data);
    }
    setIsLoading(false);
  };

  const handleCheckSimilar = async () => {
    if (!newRequest.description.trim()) {
      toast({ title: 'Error', description: 'Please enter a description first', variant: 'destructive' });
      return;
    }

    setIsCheckingSimilar(true);
    const result = await findSimilarUpdates({ body: newRequest.description });
    setIsCheckingSimilar(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    if (result.data && result.data.length > 0) {
      setSimilarUpdates(result.data);
      setShowSimilarResults(true);
    } else {
      // No similar updates found, proceed to submit
      await submitRequest();
    }
  };

  const submitRequest = async () => {
    if (!user?.email || !newRequest.description.trim()) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const result = await createArticleRequest({
      submitted_by: user.email,
      category: newRequest.category || null,
      request_type: newRequest.request_type,
      sample_ticket: newRequest.sample_ticket || null,
      description: newRequest.description,
      priority: newRequest.priority,
    });

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Request submitted', description: 'Pre-approvers have been notified.' });
      setShowNewRequest(false);
      setShowSimilarResults(false);
      setSimilarUpdates([]);
      setNewRequest({ category: '', request_type: 'new_article', sample_ticket: '', description: '', priority: 'normal' });
      loadRequests();
    }
    setIsSubmitting(false);
  };

  const getSimilarityBadge = (similarity: string) => {
    switch (similarity) {
      case 'high':
        return <Badge variant="destructive">High Match</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500">Medium Match</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Match</Badge>;
      default:
        return <Badge>{similarity}</Badge>;
    }
  };

  const handlePreApprove = async (requestId: string) => {
    if (!user?.email) return;
    const result = await approveRequest(requestId, user.email);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Approved', description: 'Your approval has been recorded.' });
      loadRequests();
    }
  };

  const handleFinalDecision = async (requestId: string, decision: FinalDecision) => {
    if (!user?.email || !decision) return;
    setProcessingRequest(requestId);
    const result = await finalizeRequestReview(requestId, user.email, decision, finalNotes[requestId]);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: decision === 'reject' ? 'Rejected' : 'Approved', description: 'HR and submitter have been notified.' });
      loadRequests();
    }
    setProcessingRequest(null);
  };

  const handleDeleteRequest = async (requestId: string) => {
    setDeletingRequest(requestId);
    const result = await deleteArticleRequest(requestId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Request has been deleted.' });
      loadRequests();
    }
    setDeletingRequest(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending Pre-Approval</Badge>;
      case 'pending_final_review': return <Badge className="bg-amber-500"><Crown className="h-3 w-3 mr-1" /> Awaiting Final Review</Badge>;
      case 'approved': return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Submit a Request</h1>
            <p className="text-muted-foreground">Request new articles or updates to existing content</p>
          </div>
          <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit New Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Submitted By</label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Timestamp</label>
                    <Input value={format(new Date(), 'PPp')} disabled />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Request Type</label>
                  <Select value={newRequest.request_type} onValueChange={v => setNewRequest(p => ({ ...p, request_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_article">New Article</SelectItem>
                      <SelectItem value="update_existing">Update Existing</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newRequest.category} onValueChange={v => setNewRequest(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Sample Ticket #</label>
                  <Input placeholder="e.g., TICKET-12345" value={newRequest.sample_ticket} onChange={e => setNewRequest(p => ({ ...p, sample_ticket: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newRequest.priority} onValueChange={v => setNewRequest(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea placeholder="Describe what article or update you need..." value={newRequest.description} onChange={e => setNewRequest(p => ({ ...p, description: e.target.value }))} rows={4} />
                </div>
                <Button onClick={handleCheckSimilar} disabled={isSubmitting || isCheckingSimilar} className="w-full">
                  {(isSubmitting || isCheckingSimilar) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCheckingSimilar ? 'Checking...' : <><Sparkles className="h-4 w-4 mr-2" />Check for Similar Updates</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Similar Updates Results Dialog */}
          <Dialog open={showSimilarResults} onOpenChange={setShowSimilarResults}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Similar Updates Found
                </DialogTitle>
                <DialogDescription>
                  We found {similarUpdates.length} potentially similar update(s). Review them and decide whether to proceed.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                {similarUpdates.map((similar) => (
                  <div
                    key={similar.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSimilarityBadge(similar.similarity)}
                          {similar.update?.status && (
                            <Badge variant="outline">{similar.update.status}</Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{similar.title}</h4>
                        {similar.update?.posted_at && (
                          <p className="text-xs text-muted-foreground">
                            Posted: {format(new Date(similar.update.posted_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      {similar.update && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/updates/${similar.update!.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{similar.reason}</p>
                  </div>
                ))}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowSimilarResults(false)}>
                  Cancel
                </Button>
                <Button onClick={submitRequest} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Anyway
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No requests yet</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {requests.map(request => {
              const preApprovals = request.approvals.filter(a => a.stage === 1);
              const finalApproval = request.approvals.find(a => a.stage === 2);
              const preApprovedCount = preApprovals.filter(a => a.approved).length;

              return (
                <Card key={request.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {getStatusBadge(request.status)}
                        <Badge variant="outline">{request.request_type === 'new_article' ? 'New Article' : request.request_type === 'update_existing' ? 'Update' : 'General'}</Badge>
                        {request.category && <Badge variant="secondary">{getCategoryLabel(request.category)}</Badge>}
                        <Badge variant={request.priority === 'urgent' ? 'destructive' : request.priority === 'high' ? 'default' : 'outline'}>{request.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{format(new Date(request.submitted_at), 'PPp')}</span>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this request? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRequest(request.id)}
                                  disabled={deletingRequest === request.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingRequest === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">By: {request.submitted_by}</p>
                      {request.sample_ticket && <p className="text-sm text-muted-foreground">Ticket: {request.sample_ticket}</p>}
                    </div>
                    <p className="text-sm">{request.description}</p>
                    
                    {/* Pre-Approvals Section */}
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Pre-Approvals ({preApprovedCount}/{PRE_APPROVERS.length})
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {preApprovals.map(approval => {
                          const canApprove = user?.email?.toLowerCase() === approval.approver_email.toLowerCase() && !approval.approved && request.status === 'pending';
                          return (
                            <div key={approval.id} className="flex items-center gap-2">
                              <Checkbox checked={approval.approved} disabled={!canApprove} onCheckedChange={() => canApprove && handlePreApprove(request.id)} />
                              <span className={`text-sm ${approval.approved ? 'text-green-600' : 'text-muted-foreground'}`}>{approval.approver_name || approval.approver_email}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Final Review Section */}
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Final Review ({FINAL_APPROVER.name})
                      </p>
                      
                      {request.status === 'pending' && (
                        <p className="text-sm text-muted-foreground">Waiting for all pre-approvals before final review.</p>
                      )}

                      {request.status === 'pending_final_review' && userIsFinalApprover && (
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                          <Textarea 
                            placeholder="Optional notes for your decision..."
                            value={finalNotes[request.id] || ''}
                            onChange={e => setFinalNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                            rows={2}
                          />
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" onClick={() => handleFinalDecision(request.id, 'create_new')} disabled={processingRequest === request.id}>
                              {processingRequest === request.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Approve: Create New
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleFinalDecision(request.id, 'update_existing')} disabled={processingRequest === request.id}>
                              Approve: Update Existing
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleFinalDecision(request.id, 'reject')} disabled={processingRequest === request.id}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {request.status === 'pending_final_review' && !userIsFinalApprover && (
                        <p className="text-sm text-amber-600">Awaiting {FINAL_APPROVER.name}'s final decision.</p>
                      )}

                      {(request.status === 'approved' || request.status === 'rejected') && request.final_decision && (
                        <div className="text-sm">
                          <p><strong>Decision:</strong> {request.final_decision === 'create_new' ? 'Create New Article' : request.final_decision === 'update_existing' ? 'Update Existing' : 'Rejected'}</p>
                          {request.final_notes && <p><strong>Notes:</strong> {request.final_notes}</p>}
                          {request.final_reviewed_at && <p className="text-muted-foreground">Reviewed: {format(new Date(request.final_reviewed_at), 'PPp')}</p>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
