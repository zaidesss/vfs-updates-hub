import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Monitor, Headphones, Clock, Target, Coffee, Timer } from 'lucide-react';
import type { DashboardProfile } from '@/lib/agentDashboardApi';
import type { EffectiveDaySchedule } from '@/lib/scheduleResolver';

interface ProfileHeaderProps {
  profile: DashboardProfile;
  effectiveWeekSchedules?: EffectiveDaySchedule[];
}

export function ProfileHeader({ profile, effectiveWeekSchedules }: ProfileHeaderProps) {
  // Get today's OT schedule from effective schedules
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const todayEffective = effectiveWeekSchedules?.find(d => d.dayDate === todayStr);
  const todayOtSchedule = todayEffective?.otSchedule || null;

  const fields = [
    { 
      icon: User, 
      label: 'Agent Name', 
      value: profile.full_name || profile.agent_name || '-' 
    },
    { 
      icon: Monitor, 
      label: 'Zendesk Instance', 
      value: profile.zendesk_instance || '-' 
    },
    { 
      icon: Headphones, 
      label: 'Support Account', 
      value: profile.support_account || '-' 
    },
    { 
      icon: Headphones, 
      label: 'Support Type', 
      value: profile.support_type || 'Email',
      badge: true 
    },
    { 
      icon: Timer, 
      label: 'OT Schedule', 
      value: todayOtSchedule || 'None',
      badge: !!todayOtSchedule
    },
    { 
      icon: Coffee, 
      label: 'Break Schedule', 
      value: profile.break_schedule || '-' 
    },
    { 
      icon: Target, 
      label: 'Daily Quota', 
      value: profile.quota ? `${profile.quota} tickets/day` : '-' 
    },
    { 
      icon: Monitor, 
      label: 'Upwork Contract', 
      value: Array.isArray(profile.upwork_contract_type) && profile.upwork_contract_type.length > 0 
        ? profile.upwork_contract_type.join(', ') 
        : '-',
      badge: Array.isArray(profile.upwork_contract_type) && profile.upwork_contract_type.length > 0
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Profile Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {fields.map((field, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <field.icon className="h-3.5 w-3.5" />
                {field.label}
              </div>
              {field.badge ? (
                <Badge variant="secondary" className="font-medium">
                  {field.value}
                </Badge>
              ) : (
                <p className="font-medium text-sm truncate">{field.value}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
