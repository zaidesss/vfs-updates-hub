import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { UpworkLimitRequestDialog } from '@/components/profile/UpworkLimitRequestDialog';
import { cn } from '@/lib/utils';
import { 
  AgentProfileInput, 
  POSITION_OPTIONS, 
  UPWORK_CONTRACT_TYPE_OPTIONS,
  getPositionDefaults,
  canEditSchedules 
} from '@/lib/agentProfileApi';
import { validateScheduleFormat, validateOTScheduleConflict } from '@/lib/masterDirectoryApi';
import { calculateProfileTotalHours } from '@/lib/profileTotalHours';
import { useAuth } from '@/context/AuthContext';
import { Clock, Send, AlertCircle, Lock } from 'lucide-react';

const ZENDESK_INSTANCES = ['ZD1', 'ZD2'];
const SUPPORT_ACCOUNTS = Array.from({ length: 17 }, (_, i) => String(i + 1));
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WorkConfigurationSectionProps {
  profile: AgentProfileInput;
  onInputChange: (field: keyof AgentProfileInput, value: any) => void;
  isSuperAdmin: boolean;
  isAdmin?: boolean; // Allow admin access to work config fields
  onPositionChange?: (position: string) => void;
  scheduleErrors?: Record<string, string>;
  onScheduleBlur?: (field: string, value: string) => void;
  agentFullName?: string; // For dialog display
}

export function WorkConfigurationSection({
  profile,
  onInputChange,
  isSuperAdmin,
  isAdmin = false,
  onPositionChange,
  scheduleErrors = {},
  onScheduleBlur,
  agentFullName,
}: WorkConfigurationSectionProps) {
  const { user, isAdmin: authIsAdmin, isSuperAdmin: authIsSuperAdmin } = useAuth();
  
  // Local state for validation errors if no external handler provided
  const [localScheduleErrors, setLocalScheduleErrors] = useState<Record<string, string>>({});
  const [showUpworkDialog, setShowUpworkDialog] = useState(false);
  
  const errors = Object.keys(scheduleErrors).length > 0 ? scheduleErrors : localScheduleErrors;

  const positionDefaults = getPositionDefaults(profile.position || null);
  // Admins and Super Admins can edit work configuration fields
  const canEdit = isAdmin || isSuperAdmin;
  
  // Can request upwork limit adjustment (Admins or Super Admins only)
  const canRequestUpworkLimit = authIsAdmin || authIsSuperAdmin;

  // Calculate total hours using the same logic as Master Directory
  const totalHours = useMemo(() => {
    return calculateProfileTotalHours(profile);
  }, [
    profile.mon_schedule,
    profile.tue_schedule,
    profile.wed_schedule,
    profile.thu_schedule,
    profile.fri_schedule,
    profile.sat_schedule,
    profile.sun_schedule,
    profile.break_schedule,
    profile.ot_enabled,
    profile.mon_ot_schedule,
    profile.tue_ot_schedule,
    profile.wed_ot_schedule,
    profile.thu_ot_schedule,
    profile.fri_ot_schedule,
    profile.sat_ot_schedule,
    profile.sun_ot_schedule,
    profile.day_off,
  ]);

  // Mapping of OT fields to their corresponding regular schedule fields
  const OT_TO_REGULAR_MAPPING: Record<string, keyof AgentProfileInput> = {
    'mon_ot_schedule': 'mon_schedule',
    'tue_ot_schedule': 'tue_schedule',
    'wed_ot_schedule': 'wed_schedule',
    'thu_ot_schedule': 'thu_schedule',
    'fri_ot_schedule': 'fri_schedule',
    'sat_ot_schedule': 'sat_schedule',
    'sun_ot_schedule': 'sun_schedule',
  };

  // Validation handler for schedule fields
  const handleScheduleBlur = (field: string, value: string) => {
    if (onScheduleBlur) {
      onScheduleBlur(field, value);
      return;
    }
    
    // Local validation fallback
    let error: string | undefined;
    
    // Step 1: Format validation
    if (value && value !== 'Day Off' && !validateScheduleFormat(value)) {
      error = 'Invalid format. Use: H:MM AM-H:MM PM (e.g., 8:00 AM-5:00 PM)';
    }
    
    // Step 2: OT conflict validation (only if format is valid)
    if (!error && field in OT_TO_REGULAR_MAPPING) {
      const regularField = OT_TO_REGULAR_MAPPING[field];
      const regularSchedule = profile[regularField] as string | null;
      const conflictResult = validateOTScheduleConflict(regularSchedule, value);
      
      if (!conflictResult.isValid && conflictResult.error) {
        error = conflictResult.error;
      }
    }
    
    if (error) {
      setLocalScheduleErrors(prev => ({
        ...prev,
        [field]: error!
      }));
    } else {
      setLocalScheduleErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Check if a day is selected as day off
  const isDayOff = (day: string) => (profile.day_off || []).includes(day);

  // Handle position change - auto-populate dependent fields
  const handlePositionChange = (positions: string[]) => {
    const defaults = getPositionDefaults(positions);
    
    onInputChange('position', positions);
    onInputChange('ticket_assignment_view_id', defaults.ticketViewId);
    
    // Clear quotas for positions that don't need them
    if (!defaults.showQuotaEmail) onInputChange('quota_email', null);
    if (!defaults.showQuotaChat) onInputChange('quota_chat', null);
    if (!defaults.showQuotaPhone) onInputChange('quota_phone', null);
    
    onPositionChange?.(positions[0] || '');
  };

  // Handle position toggle for checkbox multi-select
  const handlePositionToggle = (pos: string, checked: boolean) => {
    const currentPositions = profile.position || [];
    if (checked) {
      handlePositionChange([...currentPositions, pos]);
    } else {
      handlePositionChange(currentPositions.filter(p => p !== pos));
    }
  };

  // Handle upwork contract type toggle for checkbox multi-select
  const handleContractTypeToggle = (type: string, checked: boolean) => {
    const currentTypes = profile.upwork_contract_type || [];
    if (checked) {
      onInputChange('upwork_contract_type', [...currentTypes, type]);
    } else {
      onInputChange('upwork_contract_type', currentTypes.filter(t => t !== type));
    }
  };

  // Handle Monday schedule change - auto-populate Tue-Fri (only if not day off)
  const handleMondayChange = (value: string) => {
    onInputChange('mon_schedule', value);
    if (!isDayOff('Tue')) onInputChange('tue_schedule', value);
    if (!isDayOff('Wed')) onInputChange('wed_schedule', value);
    if (!isDayOff('Thu')) onInputChange('thu_schedule', value);
    if (!isDayOff('Fri')) onInputChange('fri_schedule', value);
  };

  // Handle Saturday schedule change - auto-populate Sunday (only if not day off)
  const handleSaturdayChange = (value: string) => {
    onInputChange('sat_schedule', value);
    if (!isDayOff('Sun')) onInputChange('sun_schedule', value);
  };

  // Handle Monday OT schedule change - auto-populate Tue-Fri OT
  const handleMondayOTChange = (value: string) => {
    onInputChange('mon_ot_schedule', value);
    onInputChange('tue_ot_schedule', value);
    onInputChange('wed_ot_schedule', value);
    onInputChange('thu_ot_schedule', value);
    onInputChange('fri_ot_schedule', value);
  };

  // Handle Saturday OT schedule change - auto-populate Sunday OT
  const handleSaturdayOTChange = (value: string) => {
    onInputChange('sat_ot_schedule', value);
    onInputChange('sun_ot_schedule', value);
  };

  // Handle day off toggle - clear schedule when day is marked as off
  const handleDayOffToggle = (day: string, checked: boolean) => {
    const currentDaysOff = profile.day_off || [];
    if (checked) {
      onInputChange('day_off', [...currentDaysOff, day]);
      // Clear the schedule for this day
      const scheduleFieldMap: Record<string, keyof AgentProfileInput> = {
        'Mon': 'mon_schedule',
        'Tue': 'tue_schedule',
        'Wed': 'wed_schedule',
        'Thu': 'thu_schedule',
        'Fri': 'fri_schedule',
        'Sat': 'sat_schedule',
        'Sun': 'sun_schedule',
      };
      if (scheduleFieldMap[day]) {
        onInputChange(scheduleFieldMap[day], null);
      }
    } else {
      onInputChange('day_off', currentDaysOff.filter(d => d !== day));
    }
  };

  // (Support type toggle removed - now derived from position)

  // Compute agent_tag from agent_name
  const handleAgentNameChange = (value: string) => {
    onInputChange('agent_name', value);
    onInputChange('agent_tag', value.toLowerCase().replace(/\s+/g, ''));
  };

  // Helper to get schedule value for display (shows "Day Off" if day is off)
  const getScheduleValue = (day: string, scheduleValue: string | null | undefined) => {
    return isDayOff(day) ? 'Day Off' : (scheduleValue || '');
  };

  return (
    <div className="space-y-6">
      {/* Total Hours Display (Read-only) */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Total Hours (Weekly)</Label>
              <p className="text-2xl font-semibold">
                {totalHours.overallTotalHours.toFixed(1)} <span className="text-base font-normal text-muted-foreground">hours</span>
              </p>
            </div>
          </div>
          {canRequestUpworkLimit && (
            <Button
              variant="outline"
              onClick={() => setShowUpworkDialog(true)}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Request Upwork Limit Adjustment
            </Button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div>Weekday: {totalHours.weekdayTotalHours.toFixed(1)}h</div>
          <div>Weekend: {totalHours.weekendTotalHours.toFixed(1)}h</div>
          <div>OT: {totalHours.otTotalHours.toFixed(1)}h</div>
          <div>Break Deduction: -{totalHours.unpaidBreakHours.toFixed(1)}h</div>
        </div>
      </div>

      {/* Upwork Limit Request Dialog */}
      <UpworkLimitRequestDialog
        isOpen={showUpworkDialog}
        onOpenChange={setShowUpworkDialog}
        agentName={agentFullName || profile.agent_name || 'Agent'}
        agentEmail={profile.email}
        currentTotalHours={totalHours.overallTotalHours}
        teamLead={profile.team_lead || ''}
        requestedBy={user?.name || user?.email || ''}
      />

      {/* Upwork Contract Type - Checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Upwork Contract</Label>
          <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] items-center">
            {UPWORK_CONTRACT_TYPE_OPTIONS.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(profile.upwork_contract_type || []).includes(type)}
                  onCheckedChange={(checked) => handleContractTypeToggle(type, !!checked)}
                  disabled={!canEdit}
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Upwork Contract ID */}
        <div className="space-y-2">
          <Label>Upwork Contract ID</Label>
          <Input
            value={profile.upwork_contract_id || ''}
            onChange={(e) => onInputChange('upwork_contract_id', e.target.value)}
            placeholder="Enter contract ID"
            disabled={!canEdit}
            className={!canEdit ? 'bg-muted' : ''}
          />
        </div>

        {/* Position / Role - Checkboxes */}
        <div className="space-y-2">
          <Label>Position / Role</Label>
          <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] items-center">
            {POSITION_OPTIONS.map((pos) => (
              <label key={pos} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(profile.position || []).includes(pos)}
                  onCheckedChange={(checked) => handlePositionToggle(pos, !!checked)}
                  disabled={!canEdit}
                />
                <span className="text-sm">{pos}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Agent Name</Label>
          <Input
            value={profile.agent_name || ''}
            onChange={(e) => handleAgentNameChange(e.target.value)}
            placeholder="Defaults from first name"
            disabled={!canEdit}
            className={!canEdit ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label>Agent Tag</Label>
          <Input
            value={profile.agent_tag || ''}
            readOnly
            disabled
            className="bg-muted"
            placeholder="Auto-computed"
          />
        </div>

        <div className="space-y-2">
          <Label>Zendesk Instance</Label>
          <Select
            value={profile.zendesk_instance || ''}
            onValueChange={(value) => onInputChange('zendesk_instance', value)}
            disabled={!canEdit}
          >
            <SelectTrigger className={!canEdit ? 'bg-muted' : ''}>
              <SelectValue placeholder="Select instance" />
            </SelectTrigger>
            <SelectContent>
              {ZENDESK_INSTANCES.map((inst) => (
                <SelectItem key={inst} value={inst}>{inst}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Support Account</Label>
          <Select
            value={profile.support_account || ''}
            onValueChange={(value) => onInputChange('support_account', value)}
            disabled={!canEdit}
          >
            <SelectTrigger className={!canEdit ? 'bg-muted' : ''}>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_ACCOUNTS.map((acc) => (
                <SelectItem key={acc} value={acc}>{acc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>



        {/* Zendesk User ID */}
        <div className="space-y-2">
          <Label>Zendesk User ID</Label>
          <Input
            value={profile.zendesk_user_id || ''}
            onChange={(e) => onInputChange('zendesk_user_id', e.target.value)}
            placeholder="e.g., 11436740426393"
            disabled={!canEdit}
            className={!canEdit ? 'bg-muted' : ''}
          />
        </div>
      </div>

      {/* Productivity (Quota) - conditional based on position */}
      {(positionDefaults.showQuotaEmail || positionDefaults.showQuotaChat || positionDefaults.showQuotaPhone) && (
        <div className="space-y-4">
          <ProfileSectionHeader title="Productivity (Quota)" badge="hr" locked={!canEdit} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {positionDefaults.showQuotaEmail && (
              <div className="space-y-2">
                <Label>Email Quota</Label>
                <Input
                  type="number"
                  value={profile.quota_email ?? ''}
                  onChange={(e) => onInputChange('quota_email', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                  disabled={!canEdit}
                  className={!canEdit ? 'bg-muted' : ''}
                />
              </div>
            )}
            {positionDefaults.showQuotaChat && (
              <div className="space-y-2">
                <Label>Chat Quota</Label>
                <Input
                  type="number"
                  value={profile.quota_chat ?? ''}
                  onChange={(e) => onInputChange('quota_chat', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                  disabled={!canEdit}
                  className={!canEdit ? 'bg-muted' : ''}
                />
              </div>
            )}
            {positionDefaults.showQuotaPhone && (
              <div className="space-y-2">
                <Label>Phone Quota</Label>
                <Input
                  type="number"
                  value={profile.quota_phone ?? ''}
                  onChange={(e) => onInputChange('quota_phone', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                  disabled={!canEdit}
                  className={!canEdit ? 'bg-muted' : ''}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Edit Policy Banner - between Productivity and Day Off */}
      {canEdit && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-900 dark:text-amber-200">
            <strong>Schedule Editing Policy:</strong> Base schedule changes apply to the week starting <strong>{canEditSchedules().editableWeekStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>. 
            To adjust this week's schedule, use the <strong>Coverage Board</strong>. This policy protects historical performance data.
          </AlertDescription>
        </Alert>
      )}

      {/* Day Off - moved before schedules so it can affect them */}
      <div className="space-y-2">
        <Label>Day Off</Label>
        <div className="flex flex-wrap gap-3 p-3 border rounded-md">
          {DAY_OPTIONS.map((day) => (
            <label key={day} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isDayOff(day)}
                onCheckedChange={(checked) => handleDayOffToggle(day, !!checked)}
                disabled={!canEdit}
              />
              <span className="text-sm">{day}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Weekday Schedule */}
      <div className="space-y-4">
        <ProfileSectionHeader title="Weekday Schedule" badge="hr" locked={!canEdit} />
        <p className="text-xs text-muted-foreground">Monday auto-populates Tue-Fri. Days marked as "Day Off" are disabled.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Monday</Label>
            <Input
              value={getScheduleValue('Mon', profile.mon_schedule)}
              onChange={(e) => handleMondayChange(e.target.value)}
              onBlur={(e) => handleScheduleBlur('mon_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Mon')}
              readOnly={isDayOff('Mon')}
              className={cn('text-xs', (!canEdit || isDayOff('Mon')) && 'bg-muted', errors['mon_schedule'] && 'border-destructive')}
            />
            {errors['mon_schedule'] && <p className="text-xs text-destructive">{errors['mon_schedule']}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tuesday</Label>
            <Input
              value={getScheduleValue('Tue', profile.tue_schedule)}
              onChange={(e) => onInputChange('tue_schedule', e.target.value)}
              onBlur={(e) => handleScheduleBlur('tue_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Tue')}
              readOnly={isDayOff('Tue')}
              className={cn('text-xs', (!canEdit || isDayOff('Tue')) && 'bg-muted', errors['tue_schedule'] && 'border-destructive')}
            />
            {errors['tue_schedule'] && <p className="text-xs text-destructive">{errors['tue_schedule']}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Wednesday</Label>
            <Input
              value={getScheduleValue('Wed', profile.wed_schedule)}
              onChange={(e) => onInputChange('wed_schedule', e.target.value)}
              onBlur={(e) => handleScheduleBlur('wed_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Wed')}
              readOnly={isDayOff('Wed')}
              className={cn('text-xs', (!canEdit || isDayOff('Wed')) && 'bg-muted', errors['wed_schedule'] && 'border-destructive')}
            />
            {errors['wed_schedule'] && <p className="text-xs text-destructive">{errors['wed_schedule']}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Thursday</Label>
            <Input
              value={getScheduleValue('Thu', profile.thu_schedule)}
              onChange={(e) => onInputChange('thu_schedule', e.target.value)}
              onBlur={(e) => handleScheduleBlur('thu_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Thu')}
              readOnly={isDayOff('Thu')}
              className={cn('text-xs', (!canEdit || isDayOff('Thu')) && 'bg-muted', errors['thu_schedule'] && 'border-destructive')}
            />
            {errors['thu_schedule'] && <p className="text-xs text-destructive">{errors['thu_schedule']}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Friday</Label>
            <Input
              value={getScheduleValue('Fri', profile.fri_schedule)}
              onChange={(e) => onInputChange('fri_schedule', e.target.value)}
              onBlur={(e) => handleScheduleBlur('fri_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Fri')}
              readOnly={isDayOff('Fri')}
              className={cn('text-xs', (!canEdit || isDayOff('Fri')) && 'bg-muted', errors['fri_schedule'] && 'border-destructive')}
            />
            {errors['fri_schedule'] && <p className="text-xs text-destructive">{errors['fri_schedule']}</p>}
          </div>
        </div>
      </div>

      {/* Weekend Schedule */}
      <div className="space-y-4">
        <ProfileSectionHeader title="Weekend Schedule" badge="hr" locked={!canEdit} />
        <p className="text-xs text-muted-foreground">Saturday auto-populates Sunday. Days marked as "Day Off" are disabled.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Saturday</Label>
            <Input
              value={getScheduleValue('Sat', profile.sat_schedule)}
              onChange={(e) => handleSaturdayChange(e.target.value)}
              onBlur={(e) => handleScheduleBlur('sat_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Sat')}
              readOnly={isDayOff('Sat')}
              className={cn('text-xs', (!canEdit || isDayOff('Sat')) && 'bg-muted', errors['sat_schedule'] && 'border-destructive')}
            />
            {errors['sat_schedule'] && <p className="text-xs text-destructive">{errors['sat_schedule']}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sunday</Label>
            <Input
              value={getScheduleValue('Sun', profile.sun_schedule)}
              onChange={(e) => onInputChange('sun_schedule', e.target.value)}
              onBlur={(e) => handleScheduleBlur('sun_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Sun')}
              readOnly={isDayOff('Sun')}
              className={cn('text-xs', (!canEdit || isDayOff('Sun')) && 'bg-muted', errors['sun_schedule'] && 'border-destructive')}
            />
            {errors['sun_schedule'] && <p className="text-xs text-destructive">{errors['sun_schedule']}</p>}
          </div>
        </div>
      </div>

      {/* Break & OT Schedules */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Break Schedule</Label>
          <Input
            value={profile.break_schedule || ''}
            onChange={(e) => onInputChange('break_schedule', e.target.value)}
            onBlur={(e) => handleScheduleBlur('break_schedule', e.target.value)}
            placeholder="12:00 PM-1:00 PM"
            disabled={!canEdit}
            className={cn(!canEdit ? 'bg-muted' : '', errors['break_schedule'] && 'border-destructive')}
          />
          {errors['break_schedule'] && <p className="text-xs text-destructive">{errors['break_schedule']}</p>}
        </div>

        {/* OT Schedule Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">OT Schedule Enabled</Label>
            <p className="text-xs text-muted-foreground">Enable to configure overtime schedule</p>
          </div>
          <Switch
            checked={profile.ot_enabled || false}
            onCheckedChange={(checked) => onInputChange('ot_enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        {/* OT Schedule Fields - per-day when OT is enabled */}
        {profile.ot_enabled && (
          <div className="space-y-4 p-3 border rounded-md bg-muted/30">
            {/* Weekday OT Schedule */}
            <div className="space-y-3">
              <ProfileSectionHeader title="Weekday OT Schedule" badge="hr" locked={!canEdit} />
              <p className="text-xs text-muted-foreground">Monday OT auto-populates Tue-Fri OT.</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Monday OT</Label>
                  <Input
                    value={profile.mon_ot_schedule || ''}
                    onChange={(e) => handleMondayOTChange(e.target.value)}
                    onBlur={(e) => handleScheduleBlur('mon_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['mon_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['mon_ot_schedule'] && <p className="text-xs text-destructive">{errors['mon_ot_schedule']}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tuesday OT</Label>
                  <Input
                    value={profile.tue_ot_schedule || ''}
                    onChange={(e) => onInputChange('tue_ot_schedule', e.target.value)}
                    onBlur={(e) => handleScheduleBlur('tue_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['tue_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['tue_ot_schedule'] && <p className="text-xs text-destructive">{errors['tue_ot_schedule']}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Wednesday OT</Label>
                  <Input
                    value={profile.wed_ot_schedule || ''}
                    onChange={(e) => onInputChange('wed_ot_schedule', e.target.value)}
                    onBlur={(e) => handleScheduleBlur('wed_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['wed_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['wed_ot_schedule'] && <p className="text-xs text-destructive">{errors['wed_ot_schedule']}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Thursday OT</Label>
                  <Input
                    value={profile.thu_ot_schedule || ''}
                    onChange={(e) => onInputChange('thu_ot_schedule', e.target.value)}
                    onBlur={(e) => handleScheduleBlur('thu_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['thu_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['thu_ot_schedule'] && <p className="text-xs text-destructive">{errors['thu_ot_schedule']}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Friday OT</Label>
                  <Input
                    value={profile.fri_ot_schedule || ''}
                    onChange={(e) => onInputChange('fri_ot_schedule', e.target.value)}
                    onBlur={(e) => handleScheduleBlur('fri_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['fri_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['fri_ot_schedule'] && <p className="text-xs text-destructive">{errors['fri_ot_schedule']}</p>}
                </div>
              </div>
            </div>

            {/* Weekend OT Schedule */}
            <div className="space-y-3">
              <ProfileSectionHeader title="Weekend OT Schedule" badge="hr" locked={!canEdit} />
              <p className="text-xs text-muted-foreground">Saturday OT auto-populates Sunday OT.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Saturday OT</Label>
                  <Input
                    value={profile.sat_ot_schedule || ''}
                    onChange={(e) => handleSaturdayOTChange(e.target.value)}
                    onBlur={(e) => handleScheduleBlur('sat_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['sat_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['sat_ot_schedule'] && <p className="text-xs text-destructive">{errors['sat_ot_schedule']}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sunday OT</Label>
                  <Input
                    value={profile.sun_ot_schedule || ''}
                    onChange={(e) => onInputChange('sun_ot_schedule', e.target.value)}
                    onBlur={(e) => handleScheduleBlur('sun_ot_schedule', e.target.value)}
                    placeholder="5:00 PM-7:00 PM"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted', errors['sun_ot_schedule'] && 'border-destructive')}
                  />
                  {errors['sun_ot_schedule'] && <p className="text-xs text-destructive">{errors['sun_ot_schedule']}</p>}
                </div>
              </div>
            </div>

            {/* OT Productivity */}
            <div className="space-y-3">
              <ProfileSectionHeader title="OT Productivity" badge="hr" locked={!canEdit} />
              <p className="text-xs text-muted-foreground">OT productivity is measured in emails handled during OT hours.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">OT Email Quota</Label>
                  <Input
                    type="number"
                    value={profile.quota_ot_email ?? ''}
                    onChange={(e) => onInputChange('quota_ot_email', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="0"
                    disabled={!canEdit}
                    className={cn('text-xs', !canEdit && 'bg-muted')}
                  />
                  <p className="text-xs text-muted-foreground">Daily quota for emails during OT</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}