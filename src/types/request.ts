import type { UpdateCategory } from '@/lib/categories';

export type RequestType = 'new_article' | 'update_existing' | 'general';
export type RequestStatus = 'pending' | 'pending_final_review' | 'approved' | 'rejected';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FinalDecision = 'create_new' | 'update_existing' | 'reject' | null;

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
  final_decision: FinalDecision | null;
  final_notes: string | null;
  final_reviewed_at: string | null;
  final_reviewed_by: string | null;
}

export interface RequestApproval {
  id: string;
  request_id: string;
  approver_email: string;
  approver_name: string | null;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
  stage: number;
  active: boolean;
}

export interface ArticleRequestWithApprovals extends ArticleRequest {
  approvals: RequestApproval[];
}
