import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, Ban, Pencil, Upload, X, FileText, History, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  createLeaveRequest,
  updateLeaveRequest,
  adminUpdateLeaveRequest,
  fetchMyLeaveRequests,
  fetchAllLeaveRequests,
  checkConflicts,
  updateLeaveRequestStatus,
  cancelLeaveRequest,
  uploadAttachment,
  fetchLeaveRequestHistory,
  deleteLeaveRequest,
  LeaveRequest as LeaveRequestType,
  LeaveRequestInput,
  LeaveRequestHistory
} from '@/lib/leaveRequestApi';
import { supabase } from '@/integrations/supabase/client';
import { getAgentInfoByEmail, getAgentClients, CLIENT_OPTIONS, AGENT_DIRECTORY } from '@/lib/agentDirectory';

// Get all agents for dropdown
const ALL_AGENTS = Object.entries(AGENT_DIRECTORY).map(([email, info]) => ({
  email,
  name: info.name,
  position: info.position,
  teamLead: info.teamLead,
  clients: info.clients
})).sort((a, b) => a.name.localeCompare(b.name));

// Get unique team leads
const TEAM_LEADS = [...new Set(Object.values(AGENT_DIRECTORY).map(a => a.teamLead).filter(Boolean))].sort();

// Get unique roles/positions
const ROLES = [...new Set(Object.values(AGENT_DIRECTORY).map(a => a.position))].sort();

const OUTAGE_REASONS = [
  'Power Outage',
  'Wi-Fi Issue',
  'Medical Leave',
  'Planned Leave',
  'Equipment Issue',
  'Late Login',
  'Undertime',
  'Unplanned'
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20',
  canceled: 'bg-muted text-muted-foreground border-muted'
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  declined: <XCircle className="h-3 w-3" />,
  canceled: <Ban className="h-3 w-3" />
};

export default function LeaveRequest() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [requests, setRequests] = useState<LeaveRequestType[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [agentClients, setAgentClients] = useState<string[]>(CLIENT_OPTIONS);
  const [isDirectoryUser, setIsDirectoryUser] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequestType | null>(null);
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  
  // Decision dialog state
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    requestId: string;
    decision: 'approved' | 'declined' | 'canceled';
    agentName: string;
  } | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  
  // History dialog state
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    requestId: string;
    agentName: string;
  } | null>(null);
  const [historyData, setHistoryData] = useState<LeaveRequestHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<LeaveRequestInput>({
    agent_name: '',
    client_name: '',
    team_lead_name: '',
    role: '',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    outage_reason: '',
    attachment_url: ''
  });

  useEffect(() => {
    if (user?.email) {
      const agentInfo = getAgentInfoByEmail(user.email);
      if (agentInfo) {
        setIsDirectoryUser(true);
        setAgentClients(agentInfo.clients);
        setFormData(prev => ({
          ...prev,
          agent_name: agentInfo.name,
          team_lead_name: agentInfo.teamLead,
          role: agentInfo.position,
          client_name: agentInfo.clients.length === 1 ? agentInfo.clients[0] : ''
        }));
      } else {
        setIsDirectoryUser(false);
        setAgentClients(CLIENT_OPTIONS);
        if (user.name) {
          setFormData(prev => ({ ...prev, agent_name: user.name }));
        }
      }
    }
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    setIsLoading(true);
    const result = isAdmin 
      ? await fetchAllLeaveRequests()
      : await fetchMyLeaveRequests();
    
    if (result.data) {
      setRequests(result.data);
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: keyof LeaveRequestInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setConflictWarning(null);
  };

  // Handle agent selection for admin - auto-populate other fields
  const handleAgentSelect = (agentName: string) => {
    const agent = ALL_AGENTS.find(a => a.name === agentName);
    if (agent) {
      setFormData(prev => ({
        ...prev,
        agent_name: agent.name,
        team_lead_name: agent.teamLead,
        role: agent.position,
        client_name: agent.clients.length === 1 ? agent.clients[0] : prev.client_name
      }));
      setAgentClients(agent.clients);
    } else {
      setFormData(prev => ({ ...prev, agent_name: agentName }));
    }
    setConflictWarning(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.email) return;
    
    setIsUploading(true);
    const result = await uploadAttachment(file, user.email);
    
    if (result.data) {
      setFormData(prev => ({ ...prev, attachment_url: result.data! }));
      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });
    } else if (result.error) {
      toast({
        title: 'Upload Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsUploading(false);
  };

  const clearAttachment = () => {
    setFormData(prev => ({ ...prev, attachment_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const required: (keyof LeaveRequestInput)[] = [
      'agent_name', 'client_name', 'team_lead_name', 'role',
      'start_date', 'end_date', 'start_time', 'end_time', 'outage_reason'
    ];
    
    for (const field of required) {
      if (!formData[field]) {
        toast({
          title: 'Validation Error',
          description: `${field.replace(/_/g, ' ')} is required`,
          variant: 'destructive'
        });
        return false;
      }
    }
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (endDate < startDate) {
      toast({
        title: 'Validation Error',
        description: 'End date must be on or after start date',
        variant: 'destructive'
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.email) return;
    
    setIsSubmitting(true);
    
    // Check for conflicts first (exclude current request when editing)
    const conflictResult = await checkConflicts(formData, editingRequest?.id);
    
    if (conflictResult.error) {
      toast({
        title: 'Error',
        description: conflictResult.error,
        variant: 'destructive'
      });
      setIsSubmitting(false);
      return;
    }
    
    if (conflictResult.data?.hasConflict) {
      const agents = conflictResult.data.conflictingAgents.join(', ');
      setConflictWarning(`⚠ Conflict detected with: ${agents}. Cannot submit request.`);
      toast({
        title: 'Conflict Detected',
        description: `Your request conflicts with existing requests from: ${agents}`,
        variant: 'destructive'
      });
      setIsSubmitting(false);
      return;
    }
    
    let result;
    
    if (editingRequest) {
      if (isAdminEditing) {
        // Admin editing any request
        result = await adminUpdateLeaveRequest(editingRequest.id, formData, user.email);
      } else {
        // Agent editing their own request - always reset to pending
        const isEditOfNonPending = editingRequest.status !== 'pending';
        result = await updateLeaveRequest(editingRequest.id, formData, user.email, isEditOfNonPending);
        
        // If editing non-pending request, send notification as updated request
        if (result.data && isEditOfNonPending) {
          try {
            await supabase.functions.invoke('send-leave-request-notification', {
              body: {
                agentName: formData.agent_name,
                agentEmail: user.email,
                clientName: formData.client_name,
                teamLeadName: formData.team_lead_name,
                role: formData.role,
                startDate: formData.start_date,
                endDate: formData.end_date,
                startTime: formData.start_time,
                endTime: formData.end_time,
                outageReason: formData.outage_reason,
                attachmentUrl: formData.attachment_url,
                totalDays: result.data.total_days,
                outageDurationHours: result.data.outage_duration_hours,
                isUpdated: true
              }
            });
          } catch (notifyErr) {
            console.error('Failed to send notification:', notifyErr);
          }
        }
      }
    } else {
      // Create new request and send notification
      result = await createLeaveRequest(formData, user.email);
      
      // Send notification for new requests
      if (result.data) {
        try {
          await supabase.functions.invoke('send-leave-request-notification', {
            body: {
              agentName: formData.agent_name,
              agentEmail: user.email,
              clientName: formData.client_name,
              teamLeadName: formData.team_lead_name,
              role: formData.role,
              startDate: formData.start_date,
              endDate: formData.end_date,
              startTime: formData.start_time,
              endTime: formData.end_time,
              outageReason: formData.outage_reason,
              attachmentUrl: formData.attachment_url,
              totalDays: result.data.total_days,
              outageDurationHours: result.data.outage_duration_hours
            }
          });
        } catch (notifyErr) {
          console.error('Failed to send notification:', notifyErr);
        }
      }
    }
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: editingRequest ? 'Leave request updated successfully' : 'Leave request submitted successfully'
      });
      setEditingRequest(null);
      setIsAdminEditing(false);
      // Reset form - preserve directory data
      const agentInfo = getAgentInfoByEmail(user.email);
      if (agentInfo) {
        setFormData({
          agent_name: agentInfo.name,
          client_name: agentInfo.clients.length === 1 ? agentInfo.clients[0] : '',
          team_lead_name: agentInfo.teamLead,
          role: agentInfo.position,
          start_date: '',
          end_date: '',
          start_time: '09:00',
          end_time: '17:00',
          outage_reason: '',
          attachment_url: ''
        });
      } else {
        setFormData({
          agent_name: user.name,
          client_name: '',
          team_lead_name: '',
          role: '',
          start_date: '',
          end_date: '',
          start_time: '09:00',
          end_time: '17:00',
          outage_reason: '',
          attachment_url: ''
        });
      }
      setConflictWarning(null);
      loadRequests();
    }
    
    setIsSubmitting(false);
  };
  
  const handleEdit = (req: LeaveRequestType, adminEdit: boolean = false) => {
    setEditingRequest(req);
    setIsAdminEditing(adminEdit);
    setFormData({
      agent_name: req.agent_name,
      client_name: req.client_name,
      team_lead_name: req.team_lead_name,
      role: req.role,
      start_date: req.start_date,
      end_date: req.end_date,
      start_time: req.start_time,
      end_time: req.end_time,
      outage_reason: req.outage_reason,
      attachment_url: req.attachment_url || ''
    });
    setConflictWarning(null);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingRequest(null);
    setIsAdminEditing(false);
    setConflictWarning(null);
    // Reset form
    const agentInfo = user?.email ? getAgentInfoByEmail(user.email) : null;
    if (agentInfo) {
      setFormData({
        agent_name: agentInfo.name,
        client_name: agentInfo.clients.length === 1 ? agentInfo.clients[0] : '',
        team_lead_name: agentInfo.teamLead,
        role: agentInfo.position,
        start_date: '',
        end_date: '',
        start_time: '09:00',
        end_time: '17:00',
        outage_reason: '',
        attachment_url: ''
      });
    } else {
      setFormData({
        agent_name: user?.name || '',
        client_name: '',
        team_lead_name: '',
        role: '',
        start_date: '',
        end_date: '',
        start_time: '09:00',
        end_time: '17:00',
        outage_reason: '',
        attachment_url: ''
      });
    }
  };

  const openDecisionDialog = (requestId: string, decision: 'approved' | 'declined' | 'canceled', agentName: string) => {
    setDecisionDialog({ open: true, requestId, decision, agentName });
    setDecisionRemarks('');
  };

  const handleConfirmDecision = async () => {
    if (!decisionDialog || !user?.email) return;
    
    setIsProcessingDecision(true);
    const result = await updateLeaveRequestStatus(
      decisionDialog.requestId, 
      decisionDialog.decision, 
      user.email,
      decisionRemarks || undefined
    );
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Request ${decisionDialog.decision}`
      });
      loadRequests();
    }
    
    setIsProcessingDecision(false);
    setDecisionDialog(null);
    setDecisionRemarks('');
  };

  const openHistoryDialog = async (requestId: string, agentName: string) => {
    setHistoryDialog({ open: true, requestId, agentName });
    setIsLoadingHistory(true);
    
    const result = await fetchLeaveRequestHistory(requestId);
    if (result.data) {
      setHistoryData(result.data);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load history',
        variant: 'destructive'
      });
    }
    setIsLoadingHistory(false);
  };

  const formatFieldName = (field: string): string => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    return String(value);
  };

  const handleCancel = async (id: string) => {
    if (!user?.email) return;
    
    const result = await cancelLeaveRequest(id, user.email);
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Request canceled'
      });
      loadRequests();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteLeaveRequest(id);
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Request deleted'
      });
      loadRequests();
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Request</h1>
          <p className="text-muted-foreground">Submit and manage your leave/outage requests</p>
        </div>

        {/* Submit Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRequest 
                ? (isAdminEditing ? 'Edit Request (Admin)' : 'Edit Request') 
                : 'Submit New Request'
              }
            </CardTitle>
            <CardDescription>
              {editingRequest && !isAdminEditing && editingRequest.status !== 'pending'
                ? 'Editing will reset this request to pending status'
                : 'Fill in all required fields to submit a leave request'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {conflictWarning && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{conflictWarning}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent_name">Agent Name *</Label>
                  {isAdmin ? (
                    <Select
                      value={formData.agent_name}
                      onValueChange={handleAgentSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_AGENTS.map(agent => (
                          <SelectItem key={agent.email} value={agent.name}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="agent_name"
                      value={formData.agent_name}
                      onChange={(e) => handleInputChange('agent_name', e.target.value)}
                      placeholder="Your name"
                      disabled={isDirectoryUser}
                      className={isDirectoryUser ? 'bg-muted' : ''}
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Select
                    value={formData.client_name}
                    onValueChange={(value) => handleInputChange('client_name', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAdmin ? CLIENT_OPTIONS : agentClients).map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team_lead_name">Team Lead Name *</Label>
                  {isAdmin ? (
                    <Select
                      value={formData.team_lead_name}
                      onValueChange={(value) => handleInputChange('team_lead_name', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_LEADS.map(lead => (
                          <SelectItem key={lead} value={lead}>{lead}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="team_lead_name"
                      value={formData.team_lead_name}
                      onChange={(e) => handleInputChange('team_lead_name', e.target.value)}
                      placeholder="Team lead name"
                      disabled={isDirectoryUser}
                      className={isDirectoryUser ? 'bg-muted' : ''}
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  {isAdmin ? (
                    <Select
                      value={formData.role}
                      onValueChange={(value) => handleInputChange('role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      placeholder="Your role"
                      disabled={isDirectoryUser}
                      className={isDirectoryUser ? 'bg-muted' : ''}
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time (EST) *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time (EST) *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange('end_time', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="outage_reason">Outage Reason *</Label>
                  <Select
                    value={formData.outage_reason}
                    onValueChange={(value) => handleInputChange('outage_reason', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTAGE_REASONS.map(reason => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Attachment (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="file-upload"
                    />
                    {!formData.attachment_url ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full justify-start"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 p-2 border rounded-lg w-full">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={formData.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate flex-1"
                        >
                          View Attachment
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearAttachment}
                          className="h-6 w-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || isUploading} className="w-full md:w-auto">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {editingRequest ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    editingRequest ? 'Update Request' : 'Submit Request'
                  )}
                </Button>
                {editingRequest && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? 'All Leave Requests' : 'My Leave Requests'}</CardTitle>
            <CardDescription>
              {isAdmin ? 'Review and approve/decline leave requests' : 'View the status of your leave requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leave requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Times</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Remarks</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{req.agent_name}</p>
                            <p className="text-xs text-muted-foreground">{req.role}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{req.client_name}</p>
                            <p className="text-xs text-muted-foreground">{req.team_lead_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(parseISO(req.start_date), 'MMM d, yyyy')}</p>
                            <p className="text-muted-foreground">to {format(parseISO(req.end_date), 'MMM d, yyyy')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{req.start_time} - {req.end_time}</p>
                            {req.total_days && req.daily_hours && (
                              <p className="text-xs text-muted-foreground">
                                {req.total_days}d × {req.daily_hours}h = {req.outage_duration_hours}h
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span>{req.outage_reason}</span>
                            {req.attachment_url && (
                              <a 
                                href={req.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="h-3 w-3" />
                                Attachment
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[req.status]}>
                            <span className="flex items-center gap-1">
                              {STATUS_ICONS[req.status]}
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <p className="text-xs text-muted-foreground max-w-[150px] truncate" title={req.remarks || ''}>
                              {req.remarks || '-'}
                            </p>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {isAdmin && req.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success hover:text-success"
                                onClick={() => openDecisionDialog(req.id, 'approved', req.agent_name)}
                              >
                                Approve
                              </Button>
                            )}
                            {isAdmin && (req.status === 'pending' || req.status === 'approved') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openDecisionDialog(req.id, 'declined', req.agent_name)}
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-muted-foreground hover:text-muted-foreground"
                                  onClick={() => openDecisionDialog(req.id, 'canceled', req.agent_name)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(req, true)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openHistoryDialog(req.id, req.agent_name)}
                                  title="View History"
                                >
                                  <History className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Leave Request</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this leave request from {req.agent_name}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(req.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            {!isAdmin && req.agent_email === user?.email?.toLowerCase() && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(req, false)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                {(req.status === 'pending' || req.status === 'approved') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleCancel(req.id)}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Decision Dialog */}
      <Dialog open={decisionDialog?.open || false} onOpenChange={(open) => !open && setDecisionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog?.decision === 'approved' && 'Approve Request'}
              {decisionDialog?.decision === 'declined' && 'Decline Request'}
              {decisionDialog?.decision === 'canceled' && 'Cancel Request'}
            </DialogTitle>
            <DialogDescription>
              {decisionDialog?.decision === 'approved' && `Approve the leave request for ${decisionDialog?.agentName}?`}
              {decisionDialog?.decision === 'declined' && `Decline the leave request for ${decisionDialog?.agentName}?`}
              {decisionDialog?.decision === 'canceled' && `Cancel the leave request for ${decisionDialog?.agentName}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Textarea
                id="remarks"
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder="Add any notes or reason for this decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialog(null)} disabled={isProcessingDecision}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDecision} 
              disabled={isProcessingDecision}
              className={
                decisionDialog?.decision === 'approved' ? 'bg-success hover:bg-success/90' :
                decisionDialog?.decision === 'declined' ? 'bg-destructive hover:bg-destructive/90' : ''
              }
            >
              {isProcessingDecision ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Confirm ${decisionDialog?.decision?.charAt(0).toUpperCase()}${decisionDialog?.decision?.slice(1)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog?.open || false} onOpenChange={(open) => !open && setHistoryDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit History - {historyDialog?.agentName}</DialogTitle>
            <DialogDescription>View all changes made to this leave request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : historyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No edit history found</p>
            ) : (
              historyData.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{entry.changed_by}</span>
                    <span className="text-muted-foreground">
                      {format(parseISO(entry.changed_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(entry.changes).map(([field, change]) => (
                      <div key={field} className="text-sm">
                        <span className="font-medium">{formatFieldName(field)}:</span>{' '}
                        <span className="text-destructive line-through">{formatFieldValue(change.old)}</span>
                        {' → '}
                        <span className="text-success">{formatFieldValue(change.new)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}