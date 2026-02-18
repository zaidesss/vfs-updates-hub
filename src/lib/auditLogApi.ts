import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  area: string;
  action_type: string;
  entity_id: string | null;
  entity_label: string | null;
  reference_number: string | null;
  changed_by: string;
  changes: Record<string, { old: string | null; new: string | null }> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AuditLogFilters {
  area?: string;
  actionType?: string;
  changedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('portal_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.area) {
    query = query.eq('area', filters.area);
  }
  if (filters.actionType) {
    query = query.eq('action_type', filters.actionType);
  }
  if (filters.changedBy) {
    query = query.ilike('changed_by', `%${filters.changedBy}%`);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return (data || []) as unknown as AuditLogEntry[];
}

/**
 * Fetch audit logs relevant to a specific agent email.
 * Searches changed_by, entity_label, and metadata for the email.
 */
export async function fetchMyActivityLogs(agentEmail: string): Promise<AuditLogEntry[]> {
  const emailLower = agentEmail.toLowerCase();

  // Fetch logs where the agent was the actor OR the subject
  const { data, error } = await supabase
    .from('portal_audit_log')
    .select('*')
    .or(`changed_by.ilike.%${emailLower}%,metadata->>target_email.ilike.%${emailLower}%,metadata->>agent_email.ilike.%${emailLower}%`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching my activity logs:', error);
    return [];
  }

  return (data || []) as unknown as AuditLogEntry[];
}

export async function writeAuditLog(entry: {
  area: string;
  action_type: string;
  entity_id?: string;
  entity_label?: string;
  reference_number?: string;
  changed_by: string;
  changes?: Record<string, { old: string | null; new: string | null }>;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  const { error } = await supabase
    .from('portal_audit_log')
    .insert({
      area: entry.area,
      action_type: entry.action_type,
      entity_id: entry.entity_id || null,
      entity_label: entry.entity_label || null,
      reference_number: entry.reference_number || null,
      changed_by: entry.changed_by,
      changes: entry.changes as any || null,
      metadata: entry.metadata as any || null,
    });

  if (error) {
    console.error('Error writing audit log:', error);
    return false;
  }
  return true;
}

export const AUDIT_AREAS = [
  'QA Evaluations',
  'Updates',
  'Leave Requests',
  'User Management',
  'Profile',
  'Coverage Board',
  'Knowledge Base',
  'Scorecard',
  'Revalida',
  'Announcements',
  'Master Directory',
  'Agent Reports',
] as const;

export const ACTION_TYPES = [
  'created',
  'updated',
  'deleted',
  'new_feature',
] as const;
