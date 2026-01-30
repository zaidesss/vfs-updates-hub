import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
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

  // Handle Monday schedule change - auto-populate Tue-Fri
  const handleMondayChange = (value: string) => {
    onInputChange('mon_schedule', value);
    onInputChange('tue_schedule', value);
    onInputChange('wed_schedule', value);
    onInputChange('thu_schedule', value);
    onInputChange('fri_schedule', value);
  };

  // Handle Saturday schedule change - auto-populate Sunday
  const handleSaturdayChange = (value: string) => {
    onInputChange('sat_schedule', value);
    onInputChange('sun_schedule', value);
  };

  // Handle day off toggle
  const handleDayOffToggle = (day: string, checked: boolean) => {
    const currentDaysOff = profile.day_off || [];
    if (checked) {
      onInputChange('day_off', [...currentDaysOff, day]);
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

        {/* Ticket Assignment Toggle */}
        <div className="space-y-2">
          <Label>Ticket Assignment</Label>
          <div className="flex items-center gap-3 h-10">
            <Switch
              checked={profile.ticket_assignment_enabled || false}
              onCheckedChange={(checked) => onInputChange('ticket_assignment_enabled', checked)}
              disabled={!canEdit}
            />
            <span className="text-sm text-muted-foreground">
              {profile.ticket_assignment_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
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

      {/* Weekday Schedule */}
      <div className="space-y-4">
        <ProfileSectionHeader title="Weekday Schedule" badge="hr" locked={!canEdit} />
        <p className="text-xs text-muted-foreground">Monday auto-populates Tue-Fri. Each field remains editable.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Monday</Label>
            <Input
              value={profile.mon_schedule || ''}
              onChange={(e) => handleMondayChange(e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tuesday</Label>
            <Input
              value={profile.tue_schedule || ''}
              onChange={(e) => onInputChange('tue_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Wednesday</Label>
            <Input
              value={profile.wed_schedule || ''}
              onChange={(e) => onInputChange('wed_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Thursday</Label>
            <Input
              value={profile.thu_schedule || ''}
              onChange={(e) => onInputChange('thu_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Friday</Label>
            <Input
              value={profile.fri_schedule || ''}
              onChange={(e) => onInputChange('fri_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
            />
          </div>
        </div>
      </div>

      {/* Weekend Schedule */}
      <div className="space-y-4">
        <ProfileSectionHeader title="Weekend Schedule" badge="hr" locked={!canEdit} />
        <p className="text-xs text-muted-foreground">Saturday auto-populates Sunday. Each field remains editable.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Saturday</Label>
            <Input
              value={profile.sat_schedule || ''}
              onChange={(e) => handleSaturdayChange(e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sunday</Label>
            <Input
              value={profile.sun_schedule || ''}
              onChange={(e) => onInputChange('sun_schedule', e.target.value)}
              placeholder="8:00 AM-5:00 PM"
              disabled={!canEdit}
              className={!canEdit ? 'bg-muted text-xs' : 'text-xs'}
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

      {/* Day Off */}
      <div className="space-y-2">
        <Label>Day Off</Label>
        <div className="flex flex-wrap gap-3 p-3 border rounded-md">
          {DAY_OPTIONS.map((day) => (
            <label key={day} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={(profile.day_off || []).includes(day)}
                onCheckedChange={(checked) => handleDayOffToggle(day, !!checked)}
                disabled={!canEdit}
              />
              <span className="text-sm">{day}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}