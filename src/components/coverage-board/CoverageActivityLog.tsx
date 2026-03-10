import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export interface CoverageLog {
  id: string;
  agent_id: string;
  agent_name: string;
  date: string;
  override_type: string;
  previous_value: string | null;
  new_value: string | null;
  break_schedule: string | null;
  changed_by: string;
  created_at: string;
}

interface CoverageActivityLogProps {
  weekStart: string;
  weekEnd: string;
}

export function CoverageActivityLog({ weekStart, weekEnd }: CoverageActivityLogProps) {
  const [logs, setLogs] = useState<CoverageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchAgent, setSearchAgent] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('coverage_override_logs')
          .select('*')
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    if (weekStart && weekEnd) {
      fetchLogs();
    }
  }, [weekStart, weekEnd]);

  const filteredLogs = logs.filter(log =>
    log.agent_name.toLowerCase().includes(searchAgent.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'regular':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ot':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'dayoff':
        return 'bg-muted text-muted-foreground';
      case 'override':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatChangeValue = (prev: string | null, next: string | null) => {
    if (!prev && !next) return '--';
    if (!prev) return `→ ${next}`;
    if (!next) return `${prev} →`;
    return `${prev} → ${next}`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
          <Input
            placeholder="Search agent..."
            value={searchAgent}
            onChange={(e) => setSearchAgent(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded for this week
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Break Schedule</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.agent_name}</TableCell>
                    <TableCell>{format(parseISO(log.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(log.override_type)}>
                        {getTypeLabel(log.override_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatChangeValue(log.previous_value, log.new_value)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.break_schedule || '--'}
                    </TableCell>
                    <TableCell className="text-sm">{log.changed_by}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2">
          Showing {filteredLogs.length} of {logs.length} entries
        </div>
      </div>
    </Card>
  );
}
