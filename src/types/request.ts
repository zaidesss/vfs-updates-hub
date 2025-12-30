import type { UpdateCategory } from '@/lib/categories';

export type RequestType = 'new_article' | 'update_existing' | 'general';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ArticleRequest {
  id: string;
  submitted_by: string;
  submitted_at: string;
  category: UpdateCategory | null;
  request_type: RequestType;
  sample_ticket: string | null;
  description: string;
  priority: string;
  status: RequestStatus;
  created_at: string;
}

export interface RequestApproval {
  id: string;
  request_id: string;
  approver_email: string;
  approver_name: string | null;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
}

export interface ArticleRequestWithApprovals extends ArticleRequest {
  approvals: RequestApproval[];
}
