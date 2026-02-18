import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PageGuideButton } from '@/components/PageGuideButton';
import { Loader2, Save, User, DollarSign, ChevronLeft, Search, Briefcase, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { fetchAllUsersWithProfiles, upsertProfile, AgentProfile, AgentProfileInput, RateHistoryEntry, calculateDaysEmployed, fetchAllChangeRequests, updateChangeRequestStatus, ProfileChangeRequest, UserWithProfile, getFirstName, getPositionDefaults } from '@/lib/agentProfileApi';
import { ScheduleChangeConfirmDialog } from '@/components/profile/ScheduleChangeConfirmDialog';
import { getNextMondayEST } from '@/lib/scheduleResolver';
import { normalizeNameForStorage } from '@/lib/stringUtils';
import { validateScheduleFormat } from '@/lib/masterDirectoryApi';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { WorkConfigurationSection } from '@/components/profile/WorkConfigurationSection';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DatePicker, formatDisplayDate, formatDisplayDateTime } from '@/components/ui/date-picker';
import { writeAuditLog } from '@/lib/auditLogApi';

const EMPLOYMENT_STATUS_OPTIONS = ['Active', 'Probationary', 'Training', 'Terminated', 'Resigned'];
const PAYMENT_FREQUENCY_OPTIONS = ['Weekly', 'Bi-weekly', 'Monthly'];
const BACKUP_INTERNET_TYPES = ['Mobile Data', 'Neighbor\'s WiFi', 'Backup Fiber', 'Pocket WiFi', 'Other'];

export default function ManageProfilesPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [usersWithProfiles, setUsersWithProfiles] = useState<UserWithProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [changeRequests, setChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [activeTab, setActiveTab] = useState('profiles');
  
  const [editData, setEditData] = useState<AgentProfileInput | null>(null);
  const [rateHistoryUI, setRateHistoryUI] = useState<{ date: string; rate: string }[]>([]);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [usersResult, requestsResult] = await Promise.all([
      fetchAllUsersWithProfiles(),
      isSuperAdmin ? fetchAllChangeRequests() : Promise.resolve({ data: [], error: null })
    ]);
    
    if (usersResult.data) {
      setUsersWithProfiles(usersResult.data);
    }
    if (requestsResult.data) {
      setChangeRequests(requestsResult.data);
    }
    setIsLoading(false);
  };

  const handleSelectUser = (userWithProfile: UserWithProfile) => {
    setSelectedUser(userWithProfile);
    const profile = userWithProfile.profile;
    const firstName = getFirstName(profile?.full_name || userWithProfile.name || '');
    const positionDefaults = getPositionDefaults(profile?.position || null);
    
    setEditData({
      email: userWithProfile.email,
      full_name: profile?.full_name || userWithProfile.name || '',
      phone_number: profile?.phone_number || '',
      birthday: profile?.birthday || '',
      start_date: profile?.start_date || '',
      home_address: profile?.home_address || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
      position: profile?.position || '',
      team_lead: profile?.team_lead || '',
      clients: profile?.clients || '',
      hourly_rate: profile?.hourly_rate,
      rate_history: profile?.rate_history || [],
      primary_internet_provider: profile?.primary_internet_provider || '',
      primary_internet_speed: profile?.primary_internet_speed || '',
      backup_internet_provider: profile?.backup_internet_provider || '',
      backup_internet_speed: profile?.backup_internet_speed || '',
      backup_internet_type: profile?.backup_internet_type || '',
      bank_name: profile?.bank_name || '',
      bank_account_number: profile?.bank_account_number || '',
      bank_account_holder: profile?.bank_account_holder || '',
      upwork_profile_url: profile?.upwork_profile_url || '',
      upwork_username: profile?.upwork_username || '',
      upwork_contract_id: profile?.upwork_contract_id || '',
      headset_model: profile?.headset_model || '',
      work_schedule: profile?.work_schedule || '',
      employment_status: profile?.employment_status || 'Active',
      payment_frequency: profile?.payment_frequency || '',
      // New work configuration fields
      agent_name: profile?.agent_name || firstName,
      agent_tag: profile?.agent_tag || firstName.toLowerCase(),
      zendesk_instance: profile?.zendesk_instance || '',
      support_account: profile?.support_account || '',
      support_type: profile?.support_type || positionDefaults.supportType,
      views: profile?.views || positionDefaults.views,
      ticket_assignment_enabled: profile?.ticket_assignment_enabled || false,
      ticket_assignment_view_id: profile?.ticket_assignment_view_id || positionDefaults.ticketViewId || '',
      quota_email: profile?.quota_email,
      quota_chat: profile?.quota_chat,
      quota_phone: profile?.quota_phone,
      mon_schedule: profile?.mon_schedule || '',
      tue_schedule: profile?.tue_schedule || '',
      wed_schedule: profile?.wed_schedule || '',
      thu_schedule: profile?.thu_schedule || '',
      fri_schedule: profile?.fri_schedule || '',
      sat_schedule: profile?.sat_schedule || '',
      sun_schedule: profile?.sun_schedule || '',
      break_schedule: profile?.break_schedule || '',
      weekday_ot_schedule: profile?.weekday_ot_schedule || '',
      weekend_ot_schedule: profile?.weekend_ot_schedule || '',
      mon_ot_schedule: profile?.mon_ot_schedule || '',
      tue_ot_schedule: profile?.tue_ot_schedule || '',
      wed_ot_schedule: profile?.wed_ot_schedule || '',
      thu_ot_schedule: profile?.thu_ot_schedule || '',
      fri_ot_schedule: profile?.fri_ot_schedule || '',
      sat_ot_schedule: profile?.sat_ot_schedule || '',
      sun_ot_schedule: profile?.sun_ot_schedule || '',
      day_off: profile?.day_off || [],
      ot_enabled: profile?.ot_enabled || false,
    });
    
    const existingHistory = profile?.rate_history || [];
    const historyUI = Array(6).fill(null).map((_, i) => ({
      date: existingHistory[i]?.date || '',
      rate: existingHistory[i]?.rate?.toString() || ''
    }));
    setRateHistoryUI(historyUI);
  };

  const handleInputChange = (field: keyof AgentProfileInput, value: string | number | null) => {
    if (!editData) return;
    setEditData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleRateHistoryChange = (index: number, field: 'date' | 'rate', value: string) => {
    setRateHistoryUI(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Schedule fields to detect changes
  const SCHEDULE_FIELDS = [
    'mon_schedule', 'tue_schedule', 'wed_schedule', 'thu_schedule', 'fri_schedule', 'sat_schedule', 'sun_schedule',
    'mon_ot_schedule', 'tue_ot_schedule', 'wed_ot_schedule', 'thu_ot_schedule', 'fri_ot_schedule', 'sat_ot_schedule', 'sun_ot_schedule',
    'break_schedule', 'day_off', 'ot_enabled', 'quota_email', 'quota_chat', 'quota_phone',
  ];

  const hasScheduleChanges = (): boolean => {
    if (!editData || !selectedUser?.profile) return false;
    const original = selectedUser.profile;
    return SCHEDULE_FIELDS.some(field => {
      const oldVal = original[field as keyof AgentProfile];
      const newVal = editData[field as keyof AgentProfileInput];
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    });
  };

  const handleSave = async () => {
    if (!editData || !selectedUser) return;
    
    // Validate all schedule fields before saving
    const scheduleFields = [
      { key: 'mon_schedule', label: 'Monday' },
      { key: 'tue_schedule', label: 'Tuesday' },
      { key: 'wed_schedule', label: 'Wednesday' },
      { key: 'thu_schedule', label: 'Thursday' },
      { key: 'fri_schedule', label: 'Friday' },
      { key: 'sat_schedule', label: 'Saturday' },
      { key: 'sun_schedule', label: 'Sunday' },
      { key: 'break_schedule', label: 'Break' },
      { key: 'weekday_ot_schedule', label: 'Weekday OT' },
      { key: 'weekend_ot_schedule', label: 'Weekend OT' },
    ];
    
    const invalidSchedules = scheduleFields.filter(f => {
      const value = editData[f.key as keyof typeof editData] as string;
      return value && value.trim() !== '' && !validateScheduleFormat(value);
    });
    
    if (invalidSchedules.length > 0) {
      toast({
        title: 'Invalid Schedule Format',
        description: `Please fix: ${invalidSchedules.map(f => f.label).join(', ')}. Format: H:MM AM-H:MM PM`,
        variant: 'destructive'
      });
      return;
    }

    // If schedule fields changed, show confirmation dialog first
    if (hasScheduleChanges()) {
      setShowScheduleConfirm(true);
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    if (!editData || !selectedUser) return;
    
    setIsSaving(true);
    
    const rateHistory: RateHistoryEntry[] = rateHistoryUI
      .filter(entry => entry.date && entry.rate)
      .map(entry => ({
        date: entry.date,
        rate: parseFloat(entry.rate)
      }));
    
    const result = await upsertProfile({
      ...editData,
      full_name: normalizeNameForStorage(editData.full_name),
      agent_name: normalizeNameForStorage(editData.agent_name),
      rate_history: rateHistory
    });
    
    if (result.data) {
      toast({
        title: 'Success',
        description: `Profile for ${editData.full_name || editData.email} saved successfully`
      });
      setUsersWithProfiles(prev => prev.map(u => 
        u.email === selectedUser.email 
          ? { ...u, profile: result.data! }
          : u
      ));
      setSelectedUser(prev => prev ? { ...prev, profile: result.data! } : null);

      // Build field-level diff for audit log
      const oldProfile = selectedUser.profile;
      const trackedFields: (keyof AgentProfile)[] = [
        'full_name', 'agent_name', 'position', 'employment_status', 'hourly_rate',
        'payment_frequency', 'start_date', 'team_lead', 'support_account', 'clients',
        'break_schedule', 'ot_enabled', 'phone_number', 'home_address', 'birthday',
        'emergency_contact_name', 'emergency_contact_phone', 'bank_name',
        'bank_account_number', 'bank_account_holder', 'primary_internet_provider',
        'primary_internet_speed', 'backup_internet_provider', 'backup_internet_speed',
        'backup_internet_type', 'headset_model', 'upwork_username', 'upwork_profile_url',
        'upwork_contract_id', 'zendesk_instance', 'zendesk_user_id',
        'quota_email', 'quota_phone', 'quota_chat', 'quota_ot_email',
      ];
      const changes: Record<string, { old: string | null; new: string | null }> = {};
      if (oldProfile) {
        for (const field of trackedFields) {
          const oldVal = String(oldProfile[field] ?? '');
          const newVal = String((editData as any)[field] ?? '');
          if (oldVal !== newVal) {
            changes[field] = { old: oldVal || null, new: newVal || null };
          }
        }
      }

      writeAuditLog({
        area: 'Profile',
        action_type: selectedUser.profile ? 'updated' : 'created',
        entity_label: editData.full_name || editData.email,
        changed_by: user?.email || '',
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        metadata: { target_email: editData.email },
      });
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsSaving(false);
  };

  const handleChangeRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!user?.email) return;
    
    const result = await updateChangeRequestStatus(requestId, action, user.email);
    
    if (result.data) {
      toast({
        title: 'Success',
        description: `Request ${action} successfully`
      });
      setChangeRequests(prev => prev.map(r => r.id === requestId ? result.data! : r));
      const request = changeRequests.find(r => r.id === requestId);
      writeAuditLog({
        area: 'Profile',
        action_type: 'updated',
        entity_label: request?.requested_by_name || request?.requested_by_email || '',
        reference_number: request?.reference_number || null,
        changed_by: user?.email || '',
        changes: { status: { old: 'pending', new: action } },
        metadata: { target_email: request?.target_email, field: request?.field_name },
      });
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = usersWithProfiles.filter(u => 
    (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.profile?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = changeRequests.filter(r => r.status === 'pending');
  const daysEmployed = editData?.start_date ? calculateDaysEmployed(editData.start_date) : 0;

  // Check if user can edit work/compensation sections
  const canEditWorkInfo = isAdmin;        // Admins and Super Admins can edit work config
  const canEditCompensation = isSuperAdmin; // Only Super Admins can edit compensation

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-muted-foreground">Access denied. Admin/HR only.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Agent Profiles</h1>
            <p className="text-muted-foreground">View and edit agent information and compensation</p>
          </div>
          <PageGuideButton pageId="manage-profiles" />
        </div>

        {isSuperAdmin && pendingRequests.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="profiles" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profiles
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Change Requests
                <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Profile Change Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{request.reference_number}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDisplayDateTime(request.created_at)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeRequestAction(request.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleChangeRequestAction(request.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Requested by:</span>
                            <p className="font-medium">{request.requested_by_name || request.requested_by_email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Target Profile:</span>
                            <p className="font-medium">{request.target_email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Field:</span>
                            <p className="font-medium">{request.field_name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Current Value:</span>
                            <p className="font-medium">{request.current_value || '(Not set)'}</p>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <span className="text-muted-foreground">Requested Value:</span>
                          <p className="font-medium text-primary">{request.requested_value}</p>
                        </div>
                        
                        {request.reason && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Reason:</span>
                            <p>{request.reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {pendingRequests.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No pending change requests</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profiles" className="mt-6">
              <ProfilesGrid 
                users={filteredUsers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedUser={selectedUser}
                handleSelectUser={handleSelectUser}
                editData={editData}
                handleInputChange={handleInputChange}
                handleRateHistoryChange={handleRateHistoryChange}
                rateHistoryUI={rateHistoryUI}
                handleSave={handleSave}
                isSaving={isSaving}
                canEditWorkInfo={canEditWorkInfo}
                canEditCompensation={canEditCompensation}
                daysEmployed={daysEmployed}
                setSelectedUser={setSelectedUser}
              />
            </TabsContent>
          </Tabs>
        )}

        {(!isSuperAdmin || pendingRequests.length === 0) && (
          <ProfilesGrid 
            users={filteredUsers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedUser={selectedUser}
            handleSelectUser={handleSelectUser}
            editData={editData}
            handleInputChange={handleInputChange}
            handleRateHistoryChange={handleRateHistoryChange}
            rateHistoryUI={rateHistoryUI}
            handleSave={handleSave}
            isSaving={isSaving}
            canEditWorkInfo={canEditWorkInfo}
            canEditCompensation={canEditCompensation}
            daysEmployed={daysEmployed}
            setSelectedUser={setSelectedUser}
          />
        )}

        <ScheduleChangeConfirmDialog
          open={showScheduleConfirm}
          onOpenChange={setShowScheduleConfirm}
          onConfirm={() => {
            setShowScheduleConfirm(false);
            executeSave();
          }}
          effectiveDate={new Date(getNextMondayEST() + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        />
      </div>
    </Layout>
  );
}

// Extracted ProfilesGrid component for reuse
interface ProfilesGridProps {
  users: UserWithProfile[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedUser: UserWithProfile | null;
  handleSelectUser: (user: UserWithProfile) => void;
  editData: AgentProfileInput | null;
  handleInputChange: (field: keyof AgentProfileInput, value: string | number | null) => void;
  handleRateHistoryChange: (index: number, field: 'date' | 'rate', value: string) => void;
  rateHistoryUI: { date: string; rate: string }[];
  handleSave: () => void;
  isSaving: boolean;
  canEditWorkInfo: boolean;
  canEditCompensation: boolean;
  daysEmployed: number;
  setSelectedUser: (user: UserWithProfile | null) => void;
}

function ProfilesGrid({
  users,
  searchQuery,
  setSearchQuery,
  selectedUser,
  handleSelectUser,
  editData,
  handleInputChange,
  handleRateHistoryChange,
  rateHistoryUI,
  handleSave,
  isSaving,
  canEditWorkInfo,
  canEditCompensation,
  daysEmployed,
  setSelectedUser
}: ProfilesGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Agents ({users.length})</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-1 p-3">
              {users.map((user) => (
                <button
                  key={user.email}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedUser?.email === user.email
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium truncate">
                    {user.profile?.full_name || user.name || 'Unnamed Agent'}
                  </div>
                  <div className={`text-sm truncate ${
                    selectedUser?.email === user.email
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  }`}>
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {user.profile?.employment_status ? (
                      <Badge 
                        variant={user.profile.employment_status === 'Active' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          selectedUser?.email === user.email
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : ''
                        }`}
                      >
                        {user.profile.employment_status}
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          selectedUser?.email === user.email
                            ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                            : ''
                        }`}
                      >
                        No Profile
                      </Badge>
                    )}
                    {user.profile?.hourly_rate && (
                      <span className={`text-xs ${
                        selectedUser?.email === user.email
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        ${user.profile.hourly_rate}/hr
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No agents found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Profile Editor */}
      <Card className="lg:col-span-2">
        {selectedUser && editData ? (
          <>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSelectedUser(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{editData.full_name || 'Agent'}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[550px] pr-4">
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Personal Information" badge="user" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={editData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={editData.phone_number}
                          onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Birthday</Label>
                        <DatePicker
                          value={editData.birthday}
                          onChange={(value) => handleInputChange('birthday', value)}
                          placeholder="Select birthday"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Home Address</Label>
                        <Input
                          value={editData.home_address}
                          onChange={(e) => handleInputChange('home_address', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Emergency Contact" badge="user" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Name</Label>
                        <Input
                          value={editData.emergency_contact_name}
                          onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <Input
                          value={editData.emergency_contact_phone}
                          onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Connectivity */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Connectivity & Technical Setup" badge="user" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Internet Provider</Label>
                        <Input
                          value={editData.primary_internet_provider}
                          onChange={(e) => handleInputChange('primary_internet_provider', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Primary Internet Speed</Label>
                        <Input
                          value={editData.primary_internet_speed}
                          onChange={(e) => handleInputChange('primary_internet_speed', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Backup Internet Provider</Label>
                        <Input
                          value={editData.backup_internet_provider}
                          onChange={(e) => handleInputChange('backup_internet_provider', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Backup Internet Speed</Label>
                        <Input
                          value={editData.backup_internet_speed}
                          onChange={(e) => handleInputChange('backup_internet_speed', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Backup Internet Type</Label>
                        <Select
                          value={editData.backup_internet_type}
                          onValueChange={(value) => handleInputChange('backup_internet_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BACKUP_INTERNET_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Headset Model</Label>
                        <Input
                          value={editData.headset_model}
                          onChange={(e) => handleInputChange('headset_model', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Banking */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Banking Information" badge="user" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                          value={editData.bank_name}
                          onChange={(e) => handleInputChange('bank_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          value={editData.bank_account_holder}
                          onChange={(e) => handleInputChange('bank_account_holder', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Account Number</Label>
                        <Input
                          value={editData.bank_account_number}
                          onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Freelance Profiles */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Freelance Profiles" badge="user" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Upwork Username</Label>
                        <Input
                          value={editData.upwork_username}
                          onChange={(e) => handleInputChange('upwork_username', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Upwork Profile URL</Label>
                        <Input
                          value={editData.upwork_profile_url}
                          onChange={(e) => handleInputChange('upwork_profile_url', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Work Configuration */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Work Configuration" badge="hr" locked={!canEditWorkInfo} />
                    
                    <WorkConfigurationSection
                      profile={editData}
                      onInputChange={handleInputChange}
                      isSuperAdmin={canEditWorkInfo}
                    />

                    {/* Additional Work Info Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>Team Lead</Label>
                        <Input
                          value={editData.team_lead}
                          onChange={(e) => handleInputChange('team_lead', e.target.value)}
                          disabled={!canEditWorkInfo}
                          className={!canEditWorkInfo ? 'bg-muted' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client(s)</Label>
                        <Input
                          value={editData.clients}
                          onChange={(e) => handleInputChange('clients', e.target.value)}
                          disabled={!canEditWorkInfo}
                          className={!canEditWorkInfo ? 'bg-muted' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Status</Label>
                        <Select
                          value={editData.employment_status}
                          onValueChange={(value) => handleInputChange('employment_status', value)}
                          disabled={!canEditWorkInfo}
                        >
                          <SelectTrigger className={!canEditWorkInfo ? 'bg-muted' : ''}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <DatePicker
                          value={editData.start_date}
                          onChange={(value) => handleInputChange('start_date', value)}
                          placeholder="Select start date"
                          disabled={!canEditWorkInfo}
                          className={!canEditWorkInfo ? 'bg-muted' : ''}
                        />
                      </div>
                    </div>

                    {editData.start_date && (
                      <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-4">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Days Employed</p>
                          <p className="text-2xl font-bold text-primary">{daysEmployed.toLocaleString()} days</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Compensation */}
                  <div className="space-y-4">
                    <ProfileSectionHeader title="Compensation" badge="hr" locked={!canEditCompensation} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Frequency</Label>
                        <Select
                          value={editData.payment_frequency}
                          onValueChange={(value) => handleInputChange('payment_frequency', value)}
                          disabled={!canEditCompensation}
                        >
                          <SelectTrigger className={!canEditCompensation ? 'bg-muted' : ''}>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_FREQUENCY_OPTIONS.map((freq) => (
                              <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Current Hourly Rate ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            className={`pl-9 ${!canEditCompensation ? 'bg-muted' : ''}`}
                            value={editData.hourly_rate ?? ''}
                            onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="0.00"
                            disabled={!canEditCompensation}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Rate History (Progressions)</Label>
                      <div className="space-y-2">
                        {rateHistoryUI.map((entry, index) => (
                          <div key={index} className="grid grid-cols-2 gap-3">
                            <DatePicker
                              value={entry.date}
                              onChange={(value) => handleRateHistoryChange(index, 'date', value)}
                              placeholder="Select date"
                              disabled={!canEditCompensation}
                              className={!canEditCompensation ? 'bg-muted' : ''}
                            />
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                className={`pl-9 ${!canEditCompensation ? 'bg-muted' : ''}`}
                                value={entry.rate}
                                onChange={(e) => handleRateHistoryChange(index, 'rate', e.target.value)}
                                placeholder="0.00"
                                disabled={!canEditCompensation}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Up to 6 rate progression entries</p>
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={isSaving} className="w-full mt-4">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </ScrollArea>
            </CardContent>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
            <User className="h-12 w-12 mb-4 opacity-50" />
            <p>Select an agent to view and edit their profile</p>
          </div>
        )}
      </Card>
    </div>
  );
}
