import type { UpdateCategory } from '@/lib/categories';

export interface Agent {
  id?: string;
  name: string;
  email: string;
  client_name: string;
  active: boolean;
}

export interface Update {
  id: string;
  title: string;
  summary: string;
  body: string;
  help_center_url: string;
  posted_by: string;
  posted_at: string;
  deadline_at: string | null;
  status: 'draft' | 'published' | 'archived' | 'obsolete';
  category?: UpdateCategory | null;
  reference_number?: string | null;
}

export interface Acknowledgement {
  id?: string;
  update_id: string;
  agent_email: string;
  acknowledged_at: string;
}

export interface UpdateQuestion {
  id: string;
  update_id: string;
  user_email: string;
  question: string;
  created_at: string;
  reference_number?: string | null;
  reply?: string | null;
  replied_by?: string | null;
  replied_at?: string | null;
}

export interface UpdateChangeHistory {
  id: string;
  update_id: string;
  changed_by: string;
  changed_at: string;
  changes: Record<string, { old: string | null; new: string | null }>;
}

export type UserRole = 'agent' | 'admin';

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
}
