import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { REQUIRED_APPROVERS, isRequiredApprover } from '@/lib/approvers';
import { fetchArticleRequests, createArticleRequest, approveRequest, rejectRequest } from '@/lib/requestApi';
import { ArticleRequestWithApprovals } from '@/types/request';
import { Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Requests() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ArticleRequestWithApprovals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  
  const [newRequest, setNewRequest] = useState({
    category: '',
    request_type: 'new_article',
    sample_ticket: '',
    description: '',
    priority: 'normal',
  });

  const isApprover = user?.email ? isRequiredApprover(user.email) : false;

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

  const handleSubmit = async () => {
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
      toast({ title: 'Request submitted', description: 'Approvers have been notified.' });
      setShowNewRequest(false);
      setNewRequest({ category: '', request_type: 'new_article', sample_ticket: '', description: '', priority: 'normal' });
      loadRequests();
    }
    setIsSubmitting(false);
  };

  const handleApprove = async (requestId: string) => {
    if (!user?.email) return;
    const result = await approveRequest(requestId, user.email);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Approved', description: 'Your approval has been recorded.' });
      loadRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
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
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No requests yet</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      <Badge variant="outline">{request.request_type === 'new_article' ? 'New Article' : request.request_type === 'update_existing' ? 'Update' : 'General'}</Badge>
                      {request.category && <Badge variant="secondary">{getCategoryLabel(request.category)}</Badge>}
                      <Badge variant={request.priority === 'urgent' ? 'destructive' : request.priority === 'high' ? 'default' : 'outline'}>{request.priority}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{format(new Date(request.submitted_at), 'PPp')}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">By: {request.submitted_by}</p>
                    {request.sample_ticket && <p className="text-sm text-muted-foreground">Ticket: {request.sample_ticket}</p>}
                  </div>
                  <p className="text-sm">{request.description}</p>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Approvals ({request.approvals.filter(a => a.approved).length}/{request.approvals.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {request.approvals.map(approval => {
                        const canApprove = user?.email?.toLowerCase() === approval.approver_email.toLowerCase() && !approval.approved && request.status === 'pending';
                        return (
                          <div key={approval.id} className="flex items-center gap-2">
                            <Checkbox checked={approval.approved} disabled={!canApprove} onCheckedChange={() => canApprove && handleApprove(request.id)} />
                            <span className={`text-sm ${approval.approved ? 'text-green-600' : 'text-muted-foreground'}`}>{approval.approver_name || approval.approver_email}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
