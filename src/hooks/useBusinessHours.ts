import { useMemo } from 'react';
import { useCapacitySettings } from './useCapacitySettings';
import { parseISO, getDay, getHours, getMinutes, addDays, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface BusinessHoursConfig {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  timezone: string;
  workingDays: number[];
}

interface TicketWithDate {
  timestamp: string | null;
  [key: string]: unknown;
}

export function useBusinessHours() {
  const { data: settings } = useCapacitySettings();

  const config = useMemo<BusinessHoursConfig>(() => {
    const startParts = (settings?.business_hours_start || '09:00:00').split(':');
    const endParts = (settings?.business_hours_end || '14:00:00').split(':');
    
    return {
      startHour: parseInt(startParts[0], 10),
      startMinute: parseInt(startParts[1], 10),
      endHour: parseInt(endParts[0], 10),
      endMinute: parseInt(endParts[1], 10),
      timezone: settings?.timezone || 'America/New_York',
      workingDays: settings?.working_days || [1, 2, 3, 4, 5],
    };
  }, [settings]);

  const isWithinBusinessHours = (timestamp: Date | string): boolean => {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    const zonedDate = toZonedTime(date, config.timezone);
    
    const dayOfWeek = getDay(zonedDate);
    if (!config.workingDays.includes(dayOfWeek)) return false;
    
    const hours = getHours(zonedDate);
    const minutes = getMinutes(zonedDate);
    const timeInMinutes = hours * 60 + minutes;
    const startInMinutes = config.startHour * 60 + config.startMinute;
    const endInMinutes = config.endHour * 60 + config.endMinute;
    
    return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
  };

  const businessHoursLabel = `${config.startHour}:${String(config.startMinute).padStart(2, '0')} - ${config.endHour}:${String(config.endMinute).padStart(2, '0')} EST`;

  return {
    config,
    isWithinBusinessHours,
    businessHoursLabel,
  };
}