import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapacitySettings, useUpdateCapacitySettings, CapacitySettings } from '@/hooks/useCapacitySettings';
import { Settings, Save, Loader2 } from 'lucide-react';

const DAY_LABELS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

// Convert "HH:MM:SS" to "HH:MM AM/PM" for time input display
function timeToInput(timeStr: string): string {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, '0')}:${m} ${ampm}`;
}

// Convert "HH:MM" (24h from input) to "HH:MM:SS"
function inputToTime(val: string): string {
  return val + ':00';
}

export function CapacitySettingsSection() {
  const { data: settings, isLoading } = useCapacitySettings();
  const updateSettings = useUpdateCapacitySettings();

  const [form, setForm] = useState<Partial<Omit<CapacitySettings, 'id'>>>({});

  useEffect(() => {
    if (settings) {
      setForm({
        target_response_time_minutes: settings.target_response_time_minutes,
        agent_hours_per_day: settings.agent_hours_per_day,
        working_days_per_week: settings.working_days_per_week,
        number_of_agents: settings.number_of_agents,
        business_hours_start: settings.business_hours_start,
        business_hours_end: settings.business_hours_end,
        timezone: settings.timezone,
        utilization_alert_threshold: settings.utilization_alert_threshold,
        after_hours_threshold: settings.after_hours_threshold,
        alert_email: settings.alert_email,
        client_allocated_hours: settings.client_allocated_hours,
        working_days: settings.working_days,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(form);
  };

  const toggleDay = (day: number) => {
    const current = form.working_days || [1, 2, 3, 4, 5];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setForm(prev => ({ ...prev, working_days: updated, working_days_per_week: updated.length }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Parse time for input[type=time]
  const startTime = (form.business_hours_start || '09:00:00').substring(0, 5);
  const endTime = (form.business_hours_end || '14:00:00').substring(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Capacity Planning Configuration</CardTitle>
        </div>
        <CardDescription>Configure staffing parameters for capacity planning reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Hours */}
        <div>
          <h4 className="font-medium mb-3">Business Hours</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (EST)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setForm(prev => ({ ...prev, business_hours_start: inputToTime(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time (EST)</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setForm(prev => ({ ...prev, business_hours_end: inputToTime(e.target.value) }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label className="mb-2 block">Business Days</Label>
            <div className="flex flex-wrap gap-3">
              {DAY_LABELS.map(d => (
                <div key={d.value} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`day-${d.value}`}
                    checked={(form.working_days || []).includes(d.value)}
                    onCheckedChange={() => toggleDay(d.value)}
                  />
                  <Label htmlFor={`day-${d.value}`} className="text-sm cursor-pointer">{d.label}</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Select the days your team operates</p>
          </div>
        </div>

        {/* Staffing Configuration */}
        <div>
          <h4 className="font-medium mb-3">Staffing Configuration</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Target Response (min)</Label>
              <Input
                type="number"
                min={1}
                value={form.target_response_time_minutes ?? 5}
                onChange={(e) => setForm(prev => ({ ...prev, target_response_time_minutes: parseInt(e.target.value) || 5 }))}
              />
              <p className="text-xs text-muted-foreground">Max time for first response</p>
            </div>
            <div className="space-y-2">
              <Label>Number of Agents</Label>
              <Input
                type="number"
                min={1}
                value={form.number_of_agents ?? 1}
                onChange={(e) => setForm(prev => ({ ...prev, number_of_agents: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Hours/Day (per agent)</Label>
              <Input
                type="number"
                min={1}
                step={0.5}
                value={form.agent_hours_per_day ?? 5}
                onChange={(e) => setForm(prev => ({ ...prev, agent_hours_per_day: parseFloat(e.target.value) || 5 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Allocated Hours</Label>
              <Input
                type="number"
                min={1}
                step={0.5}
                value={form.client_allocated_hours ?? 5}
                onChange={(e) => setForm(prev => ({ ...prev, client_allocated_hours: parseFloat(e.target.value) || 5 }))}
              />
              <p className="text-xs text-muted-foreground">Total hours client has budgeted</p>
            </div>
          </div>

          <div className="mt-4 w-full sm:w-64">
            <Label>Weekly Capacity</Label>
            <Input
              readOnly
              value={`${((form.agent_hours_per_day ?? 5) * (form.number_of_agents ?? 1) * (form.working_days?.length ?? 5))}h`}
              className="bg-muted"
            />
          </div>
        </div>

        {/* Staffing Alerts */}
        <div>
          <h4 className="font-medium mb-3">Staffing Alerts</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Utilization Alert Threshold (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.utilization_alert_threshold ?? 85}
                onChange={(e) => setForm(prev => ({ ...prev, utilization_alert_threshold: parseInt(e.target.value) || 85 }))}
              />
              <p className="text-xs text-muted-foreground">Alert when utilization exceeds this %</p>
            </div>
            <div className="space-y-2">
              <Label>After-Hours Threshold (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.after_hours_threshold ?? 30}
                onChange={(e) => setForm(prev => ({ ...prev, after_hours_threshold: parseInt(e.target.value) || 30 }))}
              />
              <p className="text-xs text-muted-foreground">Suggest extending hours if exceeded</p>
            </div>
            <div className="space-y-2">
              <Label>Alert Email</Label>
              <Input
                type="email"
                value={form.alert_email ?? ''}
                onChange={(e) => setForm(prev => ({ ...prev, alert_email: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Daily digest sent here</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}