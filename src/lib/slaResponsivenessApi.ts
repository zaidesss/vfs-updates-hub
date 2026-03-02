import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfWeek, endOfWeek, format, parseISO, addDays } from 'date-fns';

export interface OldestTicket {
  id: number;
  created_at: string;
  subject: string;
  age_minutes: number;
}

export interface ResolutionData {
  avgFirstReplyMinutes: number | null;
  avgFullResolutionMinutes: number | null;
  distribution: { bucket: string; count: number }[];
}

export interface SlaInstanceData {
  lastHourNew: number;
  lastHourResponded: number;
  remainingYesterday: number;
  totalYesterday: number;
  workedYesterday: number;
  oldestNewTicket: OldestTicket | null;
  resolution: ResolutionData;
}

export interface SlaResponsivenessData {
  zd1: SlaInstanceData;
  zd2: SlaInstanceData;
  fetchedAt: string;
}

const POLL_INTERVAL = 60_000;

export function useSlaResponsiveness() {
  const [data, setData] = useState<SlaResponsivenessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'fetch-sla-responsiveness'
      );
      if (fnError) throw new Error(fnError.message || 'Failed to fetch SLA data');
      if (result?.error) throw new Error(result.error);
      setData(result as SlaResponsivenessData);
      setError(null);
    } catch (err: any) {
      console.error('SLA responsiveness fetch error:', err);
      setError(err.message || 'Failed to load SLA data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatResolutionTime(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function combineInstances(zd1: SlaInstanceData, zd2: SlaInstanceData): SlaInstanceData {
  const combinedDistribution = (zd1.resolution.distribution || []).map((b, i) => ({
    bucket: b.bucket,
    count: b.count + (zd2.resolution.distribution[i]?.count ?? 0),
  }));

  // Pick the older of the two oldest tickets
  let oldest: OldestTicket | null = null;
  if (zd1.oldestNewTicket && zd2.oldestNewTicket) {
    oldest = zd1.oldestNewTicket.age_minutes >= zd2.oldestNewTicket.age_minutes
      ? zd1.oldestNewTicket : zd2.oldestNewTicket;
  } else {
    oldest = zd1.oldestNewTicket || zd2.oldestNewTicket;
  }

  const avgOrNull = (a: number | null, b: number | null) => {
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;
    return Math.round((a + b) / 2);
  };

  return {
    lastHourNew: zd1.lastHourNew + zd2.lastHourNew,
    lastHourResponded: zd1.lastHourResponded + zd2.lastHourResponded,
    remainingYesterday: zd1.remainingYesterday + zd2.remainingYesterday,
    totalYesterday: zd1.totalYesterday + zd2.totalYesterday,
    workedYesterday: zd1.workedYesterday + zd2.workedYesterday,
    oldestNewTicket: oldest,
    resolution: {
      avgFirstReplyMinutes: avgOrNull(zd1.resolution.avgFirstReplyMinutes, zd2.resolution.avgFirstReplyMinutes),
      avgFullResolutionMinutes: avgOrNull(zd1.resolution.avgFullResolutionMinutes, zd2.resolution.avgFullResolutionMinutes),
      distribution: combinedDistribution,
    },
  };
}

// ── Historical Snapshots ──

export interface DailySnapshot {
  date: string;
  zd_instance: string;
  total_new: number;
  total_responded: number;
  remaining_unanswered: number;
  avg_first_reply_minutes: number | null;
  avg_full_resolution_minutes: number | null;
  distribution: { bucket: string; count: number }[];
}

export interface WeeklyBucket {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  zd1: AggregatedMetrics;
  zd2: AggregatedMetrics;
}

export interface AggregatedMetrics {
  totalNew: number;
  totalResponded: number;
  remaining: number;
  avgFirstReply: number | null;
  avgFullResolution: number | null;
}

function aggregateSnapshots(snapshots: DailySnapshot[]): AggregatedMetrics {
  if (!snapshots.length) return { totalNew: 0, totalResponded: 0, remaining: 0, avgFirstReply: null, avgFullResolution: null };
  const totalNew = snapshots.reduce((s, d) => s + d.total_new, 0);
  const totalResponded = snapshots.reduce((s, d) => s + d.total_responded, 0);
  const remaining = snapshots.reduce((s, d) => s + d.remaining_unanswered, 0);
  const frt = snapshots.filter(d => d.avg_first_reply_minutes != null).map(d => d.avg_first_reply_minutes!);
  const fr = snapshots.filter(d => d.avg_full_resolution_minutes != null).map(d => d.avg_full_resolution_minutes!);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  return { totalNew, totalResponded, remaining, avgFirstReply: avg(frt), avgFullResolution: avg(fr) };
}

export function groupByWeek(snapshots: DailySnapshot[]): WeeklyBucket[] {
  const weekMap = new Map<string, { zd1: DailySnapshot[]; zd2: DailySnapshot[]; start: Date; end: Date }>();

  for (const s of snapshots) {
    const d = parseISO(s.date);
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    const we = endOfWeek(d, { weekStartsOn: 1 });
    const key = format(ws, 'yyyy-MM-dd');
    if (!weekMap.has(key)) weekMap.set(key, { zd1: [], zd2: [], start: ws, end: we });
    const bucket = weekMap.get(key)!;
    if (s.zd_instance === 'ZD1') bucket.zd1.push(s);
    else bucket.zd2.push(s);
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      weekLabel: `${format(v.start, 'MMM d')} – ${format(v.end, 'MMM d')}`,
      weekStart: format(v.start, 'yyyy-MM-dd'),
      weekEnd: format(v.end, 'yyyy-MM-dd'),
      zd1: aggregateSnapshots(v.zd1),
      zd2: aggregateSnapshots(v.zd2),
    }));
}

export function useSlaHistory() {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('sla_daily_snapshots')
        .select('*')
        .gte('date', '2026-02-26')
        .order('date', { ascending: true });

      console.log('SLA history raw response:', { data, error: err, count: data?.length });

      if (err) throw new Error(err.message);
      if (!data || data.length === 0) {
        console.warn('SLA history: no rows returned');
      }
      setSnapshots((data || []) as unknown as DailySnapshot[]);
      setError(null);
    } catch (e: any) {
      console.error('SLA history fetch error:', e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  const weekly = useMemo(() => groupByWeek(snapshots), [snapshots]);

  return { snapshots, weekly, isLoading, error, refresh: fetchSnapshots };
}
