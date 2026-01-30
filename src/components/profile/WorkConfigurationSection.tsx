import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { cn } from '@/lib/utils';
import { 
  AgentProfileInput, 
  POSITION_OPTIONS, 
  SUPPORT_TYPE_OPTIONS,
  getPositionDefaults 
} from '@/lib/agentProfileApi';

const ZENDESK_INSTANCES = ['ZD1', 'ZD2'];
const SUPPORT_ACCOUNTS = Array.from({ length: 17 }, (_, i) => String(i + 1));
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WorkConfigurationSectionProps {
  profile: AgentProfileInput;
  onInputChange: (field: keyof AgentProfileInput, value: any) => void;
  isSuperAdmin: boolean;
  onPositionChange?: (position: string) => void;
}

export function WorkConfigurationSection({
  profile,
  onInputChange,
  isSuperAdmin,
  onPositionChange,
}: WorkConfigurationSectionProps) {
  const positionDefaults = getPositionDefaults(profile.position || null);
  const canEdit = isSuperAdmin;

  // Check if a day is selected as day off
  const isDayOff = (day: string) => (profile.day_off || []).includes(day);

  // Handle position change - auto-populate dependent fields
  const handlePositionChange = (position: string) => {
    const defaults = getPositionDefaults(position);
    
    onInputChange('position', position);
    onInputChange('views', defaults.views);
    onInputChange('ticket_assignment_view_id', defaults.ticketViewId);
    
    // For non-Hybrid, set fixed support type
    if (position !== 'Hybrid Support') {
      onInputChange('support_type', defaults.supportType);
    }
    
    // Clear quotas for positions that don't need them
    if (!defaults.showQuotaEmail) onInputChange('quota_email', null);
    if (!defaults.showQuotaChat) onInputChange('quota_chat', null);
    if (!defaults.showQuotaPhone) onInputChange('quota_phone', null);
    
    onPositionChange?.(position);
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

  // Handle support type toggle for Hybrid
  const handleSupportTypeToggle = (type: string, checked: boolean) => {
    const currentTypes = profile.support_type || [];
    if (checked) {
      onInputChange('support_type', [...currentTypes, type]);
    } else {
      onInputChange('support_type', currentTypes.filter(t => t !== type));
    }
  };

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
      {/* Position Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Position / Role</Label>
          <Select
            value={profile.position || ''}
            onValueChange={handlePositionChange}
            disabled={!canEdit}
          >
            <SelectTrigger className={!canEdit ? 'bg-muted' : ''}>
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Support Type - conditional rendering */}
        <div className="space-y-2">
          <Label>Support Type</Label>
          {positionDefaults.supportTypeEditable ? (
            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
              {SUPPORT_TYPE_OPTIONS.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(profile.support_type || []).includes(type)}
                    onCheckedChange={(checked) => handleSupportTypeToggle(type, !!checked)}
                    disabled={!canEdit}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex items-center h-10">
              {(profile.support_type || positionDefaults.supportType).map((type) => (
                <Badge key={type} variant="secondary" className="mr-1">{type}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Views - read-only based on position */}
        <div className="space-y-2">
          <Label>Views</Label>
          <div className="flex items-center h-10">
            {(profile.views || positionDefaults.views).map((view) => (
              <Badge key={view} variant="outline" className="mr-1">{view}</Badge>
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
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Mon')}
              readOnly={isDayOff('Mon')}
              className={cn('text-xs', (!canEdit || isDayOff('Mon')) && 'bg-muted')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tuesday</Label>
            <Input
              value={getScheduleValue('Tue', profile.tue_schedule)}
              onChange={(e) => onInputChange('tue_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Tue')}
              readOnly={isDayOff('Tue')}
              className={cn('text-xs', (!canEdit || isDayOff('Tue')) && 'bg-muted')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Wednesday</Label>
            <Input
              value={getScheduleValue('Wed', profile.wed_schedule)}
              onChange={(e) => onInputChange('wed_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Wed')}
              readOnly={isDayOff('Wed')}
              className={cn('text-xs', (!canEdit || isDayOff('Wed')) && 'bg-muted')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Thursday</Label>
            <Input
              value={getScheduleValue('Thu', profile.thu_schedule)}
              onChange={(e) => onInputChange('thu_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Thu')}
              readOnly={isDayOff('Thu')}
              className={cn('text-xs', (!canEdit || isDayOff('Thu')) && 'bg-muted')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Friday</Label>
            <Input
              value={getScheduleValue('Fri', profile.fri_schedule)}
              onChange={(e) => onInputChange('fri_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Fri')}
              readOnly={isDayOff('Fri')}
              className={cn('text-xs', (!canEdit || isDayOff('Fri')) && 'bg-muted')}
            />
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
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Sat')}
              readOnly={isDayOff('Sat')}
              className={cn('text-xs', (!canEdit || isDayOff('Sat')) && 'bg-muted')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sunday</Label>
            <Input
              value={getScheduleValue('Sun', profile.sun_schedule)}
              onChange={(e) => onInputChange('sun_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit || isDayOff('Sun')}
              readOnly={isDayOff('Sun')}
              className={cn('text-xs', (!canEdit || isDayOff('Sun')) && 'bg-muted')}
            />
          </div>
        </div>
      </div>

      {/* Break & OT Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Break Schedule</Label>
          <Input
            value={profile.break_schedule || ''}
            onChange={(e) => onInputChange('break_schedule', e.target.value)}
            placeholder="12:00 PM-1:00 PM"
            disabled={!canEdit}
            className={!canEdit ? 'bg-muted' : ''}
          />
        </div>
        <div className="space-y-2">
          <Label>Weekday OT Schedule</Label>
          <Input
            value={profile.weekday_ot_schedule || ''}
            onChange={(e) => onInputChange('weekday_ot_schedule', e.target.value)}
            placeholder="5:00 PM-7:00 PM"
            disabled={!canEdit}
            className={!canEdit ? 'bg-muted' : ''}
          />
        </div>
        <div className="space-y-2">
          <Label>Weekend OT Schedule</Label>
          <Input
            value={profile.weekend_ot_schedule || ''}
            onChange={(e) => onInputChange('weekend_ot_schedule', e.target.value)}
            placeholder="5:00 PM-7:00 PM"
            disabled={!canEdit}
            className={!canEdit ? 'bg-muted' : ''}
          />
        </div>
      </div>
    </div>
  );
}