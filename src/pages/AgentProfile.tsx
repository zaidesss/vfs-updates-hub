import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PageGuideButton } from '@/components/PageGuideButton';
import { Loader2, Save, User, DollarSign, Wifi, Building2, Briefcase, FileEdit } from 'lucide-react';
import { normalizeNameForStorage } from '@/lib/stringUtils';
import { fetchMyProfile, upsertProfile, AgentProfile, AgentProfileInput, RateHistoryEntry, calculateDaysEmployed, getFirstName, getPositionDefaults } from '@/lib/agentProfileApi';
import { validateScheduleFormat, validateOTScheduleConflict } from '@/lib/masterDirectoryApi';
import { getAgentInfoByEmail } from '@/lib/agentDirectory';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { ProfileChangeRequestDialog } from '@/components/profile/ProfileChangeRequestDialog';
import { WorkConfigurationSection } from '@/components/profile/WorkConfigurationSection';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';

const EMPLOYMENT_STATUS_OPTIONS = ['Active', 'Probationary', 'Training', 'Terminated', 'Resigned'];
const PAYMENT_FREQUENCY_OPTIONS = ['Weekly', 'Bi-weekly', 'Monthly'];
const BACKUP_INTERNET_TYPES = ['Mobile Data', 'Neighbor\'s WiFi', 'Backup Fiber', 'Pocket WiFi', 'Other'];

export default function AgentProfilePage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const emptyRateHistory = Array(6).fill({ date: '', rate: '' });
  
  const [profile, setProfile] = useState<AgentProfileInput>({
    email: '',
    full_name: '',
    phone_number: '',
    birthday: '',
    start_date: '',
    home_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    position: '',
    team_lead: '',
    clients: '',
    hourly_rate: null,
    rate_history: [],
    // Connectivity fields
    primary_internet_provider: '',
    primary_internet_speed: '',
    backup_internet_provider: '',
    backup_internet_speed: '',
    backup_internet_type: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    upwork_profile_url: '',
    upwork_username: '',
    headset_model: '',
    work_schedule: '',
    employment_status: 'Active',
    payment_frequency: '',
    // New work configuration fields
    agent_name: '',
    agent_tag: '',
    zendesk_instance: '',
    support_account: '',
    support_type: [],
    views: [],
    ticket_assignment_enabled: false,
    ticket_assignment_view_id: '',
    quota_email: null,
    quota_chat: null,
    quota_phone: null,
    mon_schedule: '',
    tue_schedule: '',
    wed_schedule: '',
    thu_schedule: '',
    fri_schedule: '',
    sat_schedule: '',
    sun_schedule: '',
    break_schedule: '',
    weekday_ot_schedule: '',
    weekend_ot_schedule: '',
    mon_ot_schedule: '',
    tue_ot_schedule: '',
    wed_ot_schedule: '',
    thu_ot_schedule: '',
    fri_ot_schedule: '',
    sat_ot_schedule: '',
    sun_ot_schedule: '',
    day_off: [],
    ot_enabled: false,
    zendesk_user_id: '',
  });
  
  const [rateHistoryUI, setRateHistoryUI] = useState<{ date: string; rate: string }[]>(emptyRateHistory);
  const [changeRequestDialog, setChangeRequestDialog] = useState<{
    isOpen: boolean;
    fieldName: string;
    fieldLabel: string;
    currentValue: string | null;
  }>({ isOpen: false, fieldName: '', fieldLabel: '', currentValue: null });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    const result = await fetchMyProfile();
    
    if (result.data) {
      const positionDefaults = getPositionDefaults(result.data.position);
      setProfile({
        email: result.data.email,
        full_name: result.data.full_name || '',
        phone_number: result.data.phone_number || '',
        birthday: result.data.birthday || '',
        start_date: result.data.start_date || '',
        home_address: result.data.home_address || '',
        emergency_contact_name: result.data.emergency_contact_name || '',
        emergency_contact_phone: result.data.emergency_contact_phone || '',
        position: result.data.position || '',
        team_lead: result.data.team_lead || '',
        clients: result.data.clients || '',
        hourly_rate: result.data.hourly_rate,
        rate_history: result.data.rate_history || [],
        // Connectivity fields
        primary_internet_provider: result.data.primary_internet_provider || '',
        primary_internet_speed: result.data.primary_internet_speed || '',
        backup_internet_provider: result.data.backup_internet_provider || '',
        backup_internet_speed: result.data.backup_internet_speed || '',
        backup_internet_type: result.data.backup_internet_type || '',
        bank_name: result.data.bank_name || '',
        bank_account_number: result.data.bank_account_number || '',
        bank_account_holder: result.data.bank_account_holder || '',
        upwork_profile_url: result.data.upwork_profile_url || '',
        upwork_username: result.data.upwork_username || '',
        upwork_contract_id: result.data.upwork_contract_id || '',
        headset_model: result.data.headset_model || '',
        work_schedule: result.data.work_schedule || '',
        employment_status: result.data.employment_status || 'Active',
        payment_frequency: result.data.payment_frequency || '',
        // New work configuration fields
        agent_name: result.data.agent_name || getFirstName(result.data.full_name),
        agent_tag: result.data.agent_tag || getFirstName(result.data.full_name)?.toLowerCase() || '',
        zendesk_instance: result.data.zendesk_instance || '',
        support_account: result.data.support_account || '',
        support_type: result.data.support_type || positionDefaults.supportType,
        views: result.data.views || positionDefaults.views,
        ticket_assignment_enabled: result.data.ticket_assignment_enabled || false,
        ticket_assignment_view_id: result.data.ticket_assignment_view_id || positionDefaults.ticketViewId || '',
        quota_email: result.data.quota_email,
        quota_chat: result.data.quota_chat,
        quota_phone: result.data.quota_phone,
        mon_schedule: result.data.mon_schedule || '',
        tue_schedule: result.data.tue_schedule || '',
        wed_schedule: result.data.wed_schedule || '',
        thu_schedule: result.data.thu_schedule || '',
        fri_schedule: result.data.fri_schedule || '',
        sat_schedule: result.data.sat_schedule || '',
        sun_schedule: result.data.sun_schedule || '',
        break_schedule: result.data.break_schedule || '',
        weekday_ot_schedule: result.data.weekday_ot_schedule || '',
        weekend_ot_schedule: result.data.weekend_ot_schedule || '',
        mon_ot_schedule: result.data.mon_ot_schedule || '',
        tue_ot_schedule: result.data.tue_ot_schedule || '',
        wed_ot_schedule: result.data.wed_ot_schedule || '',
        thu_ot_schedule: result.data.thu_ot_schedule || '',
        fri_ot_schedule: result.data.fri_ot_schedule || '',
        sat_ot_schedule: result.data.sat_ot_schedule || '',
        sun_ot_schedule: result.data.sun_ot_schedule || '',
        day_off: result.data.day_off || [],
        ot_enabled: result.data.ot_enabled || false,
        zendesk_user_id: result.data.zendesk_user_id || '',
      });
      
      const existingHistory = result.data.rate_history || [];
      const historyUI = Array(6).fill(null).map((_, i) => ({
        date: existingHistory[i]?.date || '',
        rate: existingHistory[i]?.rate?.toString() || ''
      }));
      setRateHistoryUI(historyUI);
    } else {
      // Pre-fill from directory if available
      const agentInfo = getAgentInfoByEmail(user.email);
      const firstName = getFirstName(agentInfo?.name || user.name || '');
      setProfile({
        email: user.email.toLowerCase(),
        full_name: agentInfo?.name || user.name || '',
        phone_number: '',
        birthday: '',
        start_date: '',
        home_address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        position: agentInfo?.position || '',
        team_lead: agentInfo?.teamLead || '',
        clients: agentInfo?.clients.join(', ') || '',
        hourly_rate: null,
        rate_history: [],
        primary_internet_provider: '',
        primary_internet_speed: '',
        backup_internet_provider: '',
        backup_internet_speed: '',
        backup_internet_type: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_holder: '',
        upwork_profile_url: '',
        upwork_username: '',
        upwork_contract_id: '',
        headset_model: '',
        work_schedule: '',
        employment_status: 'Active',
        payment_frequency: '',
        // New work configuration fields
        agent_name: firstName,
        agent_tag: firstName.toLowerCase(),
        zendesk_instance: '',
        support_account: '',
        support_type: [],
        views: [],
        ticket_assignment_enabled: false,
        ticket_assignment_view_id: '',
        quota_email: null,
        quota_chat: null,
        quota_phone: null,
        mon_schedule: '',
        tue_schedule: '',
        wed_schedule: '',
        thu_schedule: '',
        fri_schedule: '',
        sat_schedule: '',
        sun_schedule: '',
        break_schedule: '',
        weekday_ot_schedule: '',
        weekend_ot_schedule: '',
        mon_ot_schedule: '',
        tue_ot_schedule: '',
        wed_ot_schedule: '',
        thu_ot_schedule: '',
        fri_ot_schedule: '',
        sat_ot_schedule: '',
        sun_ot_schedule: '',
        day_off: [],
        ot_enabled: false,
        zendesk_user_id: '',
      });
      setRateHistoryUI(Array(6).fill(null).map(() => ({ date: '', rate: '' })));
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: keyof AgentProfileInput, value: string | number | null) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleRateHistoryChange = (index: number, field: 'date' | 'rate', value: string) => {
    setRateHistoryUI(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.email) return;
    
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
      const value = profile[f.key as keyof typeof profile] as string;
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
    
    // Validate OT schedule conflicts (only if OT is enabled)
    if (profile.ot_enabled) {
      const otConflictChecks = [
        { otKey: 'mon_ot_schedule', regularKey: 'mon_schedule', label: 'Monday' },
        { otKey: 'tue_ot_schedule', regularKey: 'tue_schedule', label: 'Tuesday' },
        { otKey: 'wed_ot_schedule', regularKey: 'wed_schedule', label: 'Wednesday' },
        { otKey: 'thu_ot_schedule', regularKey: 'thu_schedule', label: 'Thursday' },
        { otKey: 'fri_ot_schedule', regularKey: 'fri_schedule', label: 'Friday' },
        { otKey: 'sat_ot_schedule', regularKey: 'sat_schedule', label: 'Saturday' },
        { otKey: 'sun_ot_schedule', regularKey: 'sun_schedule', label: 'Sunday' },
      ];
      
      const otConflicts = otConflictChecks.filter(check => {
        const regularSchedule = profile[check.regularKey as keyof typeof profile] as string;
        const otSchedule = profile[check.otKey as keyof typeof profile] as string;
        const result = validateOTScheduleConflict(regularSchedule, otSchedule);
        return !result.isValid;
      });
      
      if (otConflicts.length > 0) {
        toast({
          title: 'OT Schedule Conflict',
          description: `${otConflicts.map(c => c.label).join(', ')} OT starts before regular shift ends. OT must start at or after regular shift end time.`,
          variant: 'destructive'
        });
        return;
      }
    }
    
    setIsSaving(true);
    
    const rateHistory: RateHistoryEntry[] = rateHistoryUI
      .filter(entry => entry.date && entry.rate)
      .map(entry => ({
        date: entry.date,
        rate: parseFloat(entry.rate)
      }));
    
    const result = await upsertProfile({
      ...profile,
      full_name: normalizeNameForStorage(profile.full_name),
      agent_name: normalizeNameForStorage(profile.agent_name),
      email: user.email.toLowerCase(),
      rate_history: rateHistory
    });
    
    if (result.data) {
      toast({
        title: 'Success',
        description: 'Profile saved successfully'
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

  const openChangeRequestDialog = (fieldName: string, fieldLabel: string, currentValue: string | null) => {
    setChangeRequestDialog({
      isOpen: true,
      fieldName,
      fieldLabel,
      currentValue
    });
  };

  const daysEmployed = calculateDaysEmployed(profile.start_date || null);

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
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal and work information</p>
          </div>
          <PageGuideButton pageId="profile" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{profile.full_name || user?.name || 'Agent'}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Section 1: Personal Information */}
            <div className="space-y-4">
              <ProfileSectionHeader title="Personal Information" badge="user" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={profile.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <DatePicker
                    id="birthday"
                    value={profile.birthday}
                    onChange={(value) => handleInputChange('birthday', value)}
                    placeholder="Select birthday"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="home_address">Home Address</Label>
                <Textarea
                  id="home_address"
                  value={profile.home_address}
                  onChange={(e) => handleInputChange('home_address', e.target.value)}
                  placeholder="Enter your complete home address"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Section 2: Emergency Contact */}
            <div className="space-y-4">
              <ProfileSectionHeader title="Emergency Contact" badge="user" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={profile.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Name of emergency contact"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={profile.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Connectivity & Technical Setup */}
            <div className="space-y-4">
              <ProfileSectionHeader title="Connectivity & Technical Setup" badge="user" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_internet_provider">Primary Internet Provider</Label>
                  <Input
                    id="primary_internet_provider"
                    value={profile.primary_internet_provider}
                    onChange={(e) => handleInputChange('primary_internet_provider', e.target.value)}
                    placeholder="e.g., PLDT, Globe, Converge"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="primary_internet_speed">Primary Internet Speed</Label>
                  <Input
                    id="primary_internet_speed"
                    value={profile.primary_internet_speed}
                    onChange={(e) => handleInputChange('primary_internet_speed', e.target.value)}
                    placeholder="e.g., 100 Mbps"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backup_internet_provider">Backup Internet Provider</Label>
                  <Input
                    id="backup_internet_provider"
                    value={profile.backup_internet_provider}
                    onChange={(e) => handleInputChange('backup_internet_provider', e.target.value)}
                    placeholder="e.g., Globe Mobile, Smart"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backup_internet_speed">Backup Internet Speed</Label>
                  <Input
                    id="backup_internet_speed"
                    value={profile.backup_internet_speed}
                    onChange={(e) => handleInputChange('backup_internet_speed', e.target.value)}
                    placeholder="e.g., 50 Mbps"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backup_internet_type">Backup Internet Type</Label>
                  <Select
                    value={profile.backup_internet_type}
                    onValueChange={(value) => handleInputChange('backup_internet_type', value)}
                  >
                    <SelectTrigger id="backup_internet_type">
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
                  <Label htmlFor="headset_model">Headset Model (for hybrid agents)</Label>
                  <Input
                    id="headset_model"
                    value={profile.headset_model}
                    onChange={(e) => handleInputChange('headset_model', e.target.value)}
                    placeholder="e.g., Jabra Evolve2 40"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Banking Information */}
            <div className="space-y-4">
              <ProfileSectionHeader title="Banking Information" badge="user" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={profile.bank_name}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    placeholder="e.g., BDO, BPI, Metrobank"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bank_account_holder">Account Holder Name</Label>
                  <Input
                    id="bank_account_holder"
                    value={profile.bank_account_holder}
                    onChange={(e) => handleInputChange('bank_account_holder', e.target.value)}
                    placeholder="Name as it appears on account"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={profile.bank_account_number}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                  placeholder="Your bank account number"
                />
              </div>
            </div>

            <Separator />

            {/* Section 5: Freelance Profiles */}
            <div className="space-y-4">
              <ProfileSectionHeader title="Freelance Profiles" badge="user" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upwork_username">Upwork Username</Label>
                  <Input
                    id="upwork_username"
                    value={profile.upwork_username}
                    onChange={(e) => handleInputChange('upwork_username', e.target.value)}
                    placeholder="Your Upwork username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="upwork_profile_url">Upwork Profile URL</Label>
                  <Input
                    id="upwork_profile_url"
                    value={profile.upwork_profile_url}
                    onChange={(e) => handleInputChange('upwork_profile_url', e.target.value)}
                    placeholder="https://www.upwork.com/freelancers/~..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 6: Work Information (Super Admin only) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ProfileSectionHeader title="Work Configuration" badge="hr" locked={!isSuperAdmin} />
                {!isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openChangeRequestDialog('work_info', 'Work Information', null)}
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Request Change
                  </Button>
                )}
              </div>
              
              <WorkConfigurationSection
                profile={profile}
                onInputChange={handleInputChange}
                isSuperAdmin={isSuperAdmin}
                isAdmin={isAdmin}
              />

              {/* Team Lead and Clients - still in this section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="team_lead">Team Lead</Label>
                  <Input
                    id="team_lead"
                    value={profile.team_lead}
                    onChange={(e) => handleInputChange('team_lead', e.target.value)}
                    placeholder="Name of your team lead"
                    disabled={!isAdmin}
                    className={!isAdmin ? 'bg-muted' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clients">Client(s)</Label>
                  <Input
                    id="clients"
                    value={profile.clients}
                    onChange={(e) => handleInputChange('clients', e.target.value)}
                    placeholder="e.g., VFS Global, Other Client"
                    disabled={!isAdmin}
                    className={!isAdmin ? 'bg-muted' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment_status">Employment Status</Label>
                  <Select
                    value={profile.employment_status}
                    onValueChange={(value) => handleInputChange('employment_status', value)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger id="employment_status" className={!isAdmin ? 'bg-muted' : ''}>
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
                  <Label htmlFor="start_date">Start Date (Employment)</Label>
                  <DatePicker
                    id="start_date"
                    value={profile.start_date}
                    onChange={(value) => handleInputChange('start_date', value)}
                    placeholder="Select start date"
                    disabled={!isAdmin}
                    className={!isAdmin ? 'bg-muted' : ''}
                  />
                </div>
              </div>

              {/* Days Employed Display */}
              {profile.start_date && (
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

            {/* Section 7: Compensation (Super Admin only) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ProfileSectionHeader title="Compensation" badge="hr" locked={!isSuperAdmin} />
                {!isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openChangeRequestDialog('compensation', 'Compensation', null)}
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Request Change
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_frequency">Payment Frequency</Label>
                  <Select
                    value={profile.payment_frequency}
                    onValueChange={(value) => handleInputChange('payment_frequency', value)}
                    disabled={!isSuperAdmin}
                  >
                    <SelectTrigger id="payment_frequency" className={!isSuperAdmin ? 'bg-muted' : ''}>
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
                  <Label htmlFor="hourly_rate">Current Hourly Rate ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      className={`pl-9 ${!isSuperAdmin ? 'bg-muted' : ''}`}
                      value={profile.hourly_rate ?? ''}
                      onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      disabled={!isSuperAdmin}
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
                        disabled={!isSuperAdmin}
                        className={!isSuperAdmin ? 'bg-muted' : ''}
                      />
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className={`pl-9 ${!isSuperAdmin ? 'bg-muted' : ''}`}
                          value={entry.rate}
                          onChange={(e) => handleRateHistoryChange(index, 'rate', e.target.value)}
                          placeholder="0.00"
                          disabled={!isSuperAdmin}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Enter dates and rates for up to 6 rate changes</p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
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
          </CardContent>
        </Card>
      </div>

      <ProfileChangeRequestDialog
        isOpen={changeRequestDialog.isOpen}
        onClose={() => setChangeRequestDialog({ ...changeRequestDialog, isOpen: false })}
        targetEmail={user?.email || ''}
        fieldName={changeRequestDialog.fieldName}
        fieldLabel={changeRequestDialog.fieldLabel}
        currentValue={changeRequestDialog.currentValue}
      />
    </Layout>
  );
}
