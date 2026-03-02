import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';

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
    oldestNewTicket: oldest,
    resolution: {
      avgFirstReplyMinutes: avgOrNull(zd1.resolution.avgFirstReplyMinutes, zd2.resolution.avgFirstReplyMinutes),
      avgFullResolutionMinutes: avgOrNull(zd1.resolution.avgFullResolutionMinutes, zd2.resolution.avgFullResolutionMinutes),
      distribution: combinedDistribution,
    },
  };
}
