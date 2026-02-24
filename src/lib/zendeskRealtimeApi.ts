import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';

export interface ConversationAssignee {
  name: string;
  count: number;
}

export interface TalkStats {
  agentsOnline: number;
  ongoingCalls: number;
  callsInQueue: number;
  callbacksInQueue: number;
}

export interface MessagingStats {
  agentsOnline: number;
  activeConversations: number;
  conversationsInQueue: number;
  assignees: ConversationAssignee[];
}

export interface InstanceStats {
  talk: TalkStats;
  messaging: MessagingStats;
}

export interface ZendeskRealtimeData {
  zd1: InstanceStats;
  zd2: InstanceStats;
  fetchedAt: string;
}

const POLL_INTERVAL = 60_000; // 60 seconds

export function useZendeskRealtime() {
  const [data, setData] = useState<ZendeskRealtimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'fetch-zendesk-realtime'
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch realtime data');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      setData(result as ZendeskRealtimeData);
      setError(null);
    } catch (err: any) {
      console.error('Zendesk realtime fetch error:', err);
      setError(err.message || 'Failed to load realtime stats');
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
