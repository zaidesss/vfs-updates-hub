import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  createLeaveRequest,
  fetchMyLeaveRequests,
  fetchAllLeaveRequests,
  checkConflicts,
  updateLeaveRequestStatus,
  cancelLeaveRequest,
  LeaveRequest as LeaveRequestType,
  LeaveRequestInput
} from '@/lib/leaveRequestApi';
import { getAgentInfoByEmail, getAgentClients, CLIENT_OPTIONS } from '@/lib/agentDirectory';

const OUTAGE_REASONS = [
  'Sick Leave',
  'Vacation Leave',
  'Emergency Leave',
  'Personal Leave',
  'Bereavement Leave',
  'Medical Appointment',
  'Family Emergency',
  'Other'
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<LeaveRequestType[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [agentClients, setAgentClients] = useState<string[]>(CLIENT_OPTIONS);
  const [isDirectoryUser, setIsDirectoryUser] = useState(false);
  
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
    
    // Check for conflicts first
    const conflictResult = await checkConflicts(formData);
    
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
    
    // No conflict, proceed with submission
    const result = await createLeaveRequest(formData, user.email);
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully'
      });
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

  const handleStatusChange = async (id: string, status: 'approved' | 'declined') => {
    if (!user?.email) return;
    
    const result = await updateLeaveRequestStatus(id, status, user.email);
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Request ${status}`
      });
      loadRequests();
    }
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
            <CardTitle>Submit New Request</CardTitle>
            <CardDescription>Fill in all required fields to submit a leave request</CardDescription>
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
                  <Input
                    id="agent_name"
                    value={formData.agent_name}
                    onChange={(e) => handleInputChange('agent_name', e.target.value)}
                    placeholder="Your name"
                  />
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
                      {agentClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team_lead_name">Team Lead Name *</Label>
                  <Input
                    id="team_lead_name"
                    value={formData.team_lead_name}
                    onChange={(e) => handleInputChange('team_lead_name', e.target.value)}
                    placeholder="Team lead name"
                    disabled={isDirectoryUser}
                    className={isDirectoryUser ? 'bg-muted' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="Your role"
                    disabled={isDirectoryUser}
                    className={isDirectoryUser ? 'bg-muted' : ''}
                  />
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
                  <Label htmlFor="attachment_url">Attachment URL (optional)</Label>
                  <Input
                    id="attachment_url"
                    value={formData.attachment_url}
                    onChange={(e) => handleInputChange('attachment_url', e.target.value)}
                    placeholder="Google Drive link or other attachment URL"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
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
                        <TableCell>{req.outage_reason}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[req.status]}>
                            <span className="flex items-center gap-1">
                              {STATUS_ICONS[req.status]}
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {isAdmin && req.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success hover:text-success"
                                  onClick={() => handleStatusChange(req.id, 'approved')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleStatusChange(req.id, 'declined')}
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {!isAdmin && req.status === 'pending' && req.agent_email === user?.email?.toLowerCase() && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleCancel(req.id)}
                              >
                                Cancel
                              </Button>
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
    </Layout>
  );
}
