import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, getDay, getHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface TicketLogRow {
  id: string;
  timestamp: string;
  ticket_type: string;
  zd_instance: string;
  agent_name: string;
  is_ot: boolean;
  is_autosolved: boolean;
}

export function useCapacityVolumeData(dateRange: DateRange, zdInstance?: string) {
  return useQuery({
    queryKey: ['capacity-volume', dateRange.start.toISOString(), dateRange.end.toISOString(), zdInstance],
    queryFn: async () => {
      let query = supabase
        .from('ticket_logs')
        .select('id, timestamp, ticket_type, zd_instance, agent_name, is_ot, is_autosolved')
        .gte('timestamp', dateRange.start.toISOString())
        .lte('timestamp', dateRange.end.toISOString());

      if (zdInstance && zdInstance !== 'all') {
        query = query.eq('zd_instance', zdInstance);
      }

      const { data: tickets, error } = await query;
      if (error) throw error;

      const typedTickets = (tickets || []) as TicketLogRow[];
      return calculateVolumeData(typedTickets);
    },
  });
}

function calculateVolumeData(tickets: TicketLogRow[]) {
  const byDate = new Map<string, number>();
  const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
  const byHour = Array(24).fill(0);

  tickets.forEach(ticket => {
    if (!ticket.timestamp) return;
    
    // Convert to EST for consistent day/hour bucketing
    const utcDate = parseISO(ticket.timestamp);
    const estDate = toZonedTime(utcDate, 'America/New_York');
    const dateKey = format(estDate, 'yyyy-MM-dd');
    
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);
    byDayOfWeek[getDay(estDate)]++;
    byHour[getHours(estDate)]++;
  });

  const ticketsByDate = Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ticketsByDay = byDayOfWeek.map((count, i) => ({ day: dayNames[i], count }));

  const ticketsByHour = byHour.map((count, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count,
  }));

  return {
    ticketsByDate,
    ticketsByDay,
    ticketsByHour,
    total: tickets.length,
  };
}