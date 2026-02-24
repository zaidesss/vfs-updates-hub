import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CapacitySettings {
  id: string;
  target_response_time_minutes: number;
  agent_hours_per_day: number;
  working_days_per_week: number;
  number_of_agents: number;
  business_hours_start: string;
  business_hours_end: string;
  timezone: string;
  utilization_alert_threshold: number;
  after_hours_threshold: number;
  alert_email: string;
  client_allocated_hours: number;
  working_days: number[];
}

const DEFAULT_SETTINGS: Omit<CapacitySettings, 'id'> = {
  target_response_time_minutes: 5,
  agent_hours_per_day: 5,
  working_days_per_week: 5,
  number_of_agents: 1,
  business_hours_start: '09:00:00',
  business_hours_end: '14:00:00',
  timezone: 'America/New_York',
  utilization_alert_threshold: 85,
  after_hours_threshold: 30,
  alert_email: 'hr@virtualfreelancesolutions.com',
  client_allocated_hours: 5,
  working_days: [1, 2, 3, 4, 5],
};

export function useCapacitySettings() {
  return useQuery({
    queryKey: ['capacity-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_settings' as any)
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching capacity settings:', error);
        return DEFAULT_SETTINGS as CapacitySettings;
      }

      return data as unknown as CapacitySettings;
    },
  });
}

export function useUpdateCapacitySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<CapacitySettings, 'id'>>) => {
      // First try to get existing settings
      const { data: existing } = await supabase
        .from('capacity_settings' as any)
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('capacity_settings' as any)
          .update(settings as any)
          .eq('id', (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('capacity_settings' as any)
          .insert(settings as any)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Capacity planning settings have been updated.',
      });
    },
    onError: (error) => {
      console.error('Error saving capacity settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save capacity settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
}