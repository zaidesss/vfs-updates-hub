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
  status: 'draft' | 'published' | 'archived';
}

export interface Acknowledgement {
  id?: string;
  update_id: string;
  agent_email: string;
  acknowledged_at: string;
}

export type UserRole = 'agent' | 'admin';

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
}
