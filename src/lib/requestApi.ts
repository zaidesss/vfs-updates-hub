import { supabase } from '@/integrations/supabase/client';
import { ArticleRequest, ArticleRequestWithApprovals, RequestApproval, FinalDecision } from '@/types/request';
import { PRE_APPROVERS } from '@/lib/approvers';
import { writeAuditLog } from '@/lib/auditLogApi';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Fetch all article requests with their approvals
export async function fetchArticleRequests(): Promise<ApiResponse<ArticleRequestWithApprovals[]>> {
  try {
    const { data: requests, error: requestsError } = await supabase
      .from('article_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      return { data: null, error: requestsError.message };
    }

    // Fetch approvals for all requests
    const requestIds = requests?.map(r => r.id) || [];
    const { data: approvals, error: approvalsError } = await supabase
      .from('request_approvals')
      .select('*')
      .in('request_id', requestIds);

    if (approvalsError) {
      console.error('Error fetching approvals:', approvalsError);
    }

    // Combine requests with their approvals
    const requestsWithApprovals: ArticleRequestWithApprovals[] = (requests || []).map(request => ({
      ...request,
      final_decision: request.final_decision as FinalDecision,
      approvals: (approvals || []).filter(a => a.request_id === request.id) as RequestApproval[],
    }));

    return { data: requestsWithApprovals, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch article requests:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Create a new article request
export async function createArticleRequest(request: {
  submitted_by: string;
  category: string | null;
  request_type: string;
  sample_ticket: string | null;
  description: string;
  priority: string;
}): Promise<ApiResponse<ArticleRequest>> {
  try {
    const { data, error } = await supabase
      .from('article_requests')
      .insert([{
        submitted_by: request.submitted_by.toLowerCase(),
        category: request.category as any,
        request_type: request.request_type as any,
        sample_ticket: request.sample_ticket || null,
        description: request.description,
        priority: request.priority,
        status: 'pending' as const,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      return { data: null, error: error.message };
    }

    // Create approval records only for PRE-APPROVERS (stage 1)
    const approvalInserts = PRE_APPROVERS.map(approver => ({
      request_id: data.id,
      approver_email: approver.email,
      approver_name: approver.name,
      approved: false,
      stage: 1,
      active: true,
    }));

    const { error: approvalsError } = await supabase
      .from('request_approvals')
      .insert(approvalInserts);

    if (approvalsError) {
      console.error('Error creating approvals:', approvalsError);
    }

    // Send notification only to pre-approvers
    try {
      await supabase.functions.invoke('send-request-notification', {
        body: {
          requestId: data.id,
          submittedBy: request.submitted_by,
          description: request.description,
          category: request.category,
          requestType: request.request_type,
          sampleTicket: request.sample_ticket,
          priority: request.priority,
          approverEmails: PRE_APPROVERS.map(a => a.email),
        },
      });
      console.log('Sent notifications to pre-approvers');
    } catch (notifyError) {
      console.error('Failed to send notifications:', notifyError);
    }

    writeAuditLog({
      area: 'Knowledge Base',
      action_type: 'created',
      entity_id: data.id,
      entity_label: request.description.substring(0, 100),
      reference_number: data.reference_number || undefined,
      changed_by: request.submitted_by,
      metadata: { request_type: request.request_type, category: request.category, priority: request.priority },
    });

    return { data: data as ArticleRequest, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to create article request:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Approve a request (for pre-approvers)
export async function approveRequest(requestId: string, approverEmail: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('request_approvals')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('request_id', requestId)
      .eq('approver_email', approverEmail.toLowerCase());

    if (error) {
      console.error('Error approving request:', error);
      return { data: null, error: error.message };
    }

    // Check if all pre-approvers have approved
    try {
      const { data: checkResult } = await supabase.functions.invoke('check-full-approval', {
        body: { requestId },
      });
      console.log('Check full approval result:', checkResult);
    } catch (checkError) {
      console.error('Error checking full approval:', checkError);
    }

    writeAuditLog({
      area: 'Knowledge Base',
      action_type: 'updated',
      entity_id: requestId,
      entity_label: 'Pre-approval',
      changed_by: approverEmail,
      metadata: { stage: 'pre_approval' },
    });

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to approve request:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Final review by Super Admin / HR
export async function finalizeRequestReview(
  requestId: string,
  approverEmail: string,
  decision: FinalDecision,
  notes?: string
): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { data, error } = await supabase.functions.invoke('finalize-request-review', {
      body: {
        requestId,
        approverEmail,
        decision,
        notes,
      },
    });

    if (error) {
      console.error('Error finalizing review:', error);
      return { data: null, error: error.message };
    }

    writeAuditLog({
      area: 'Knowledge Base',
      action_type: 'updated',
      entity_id: requestId,
      entity_label: `Final review: ${decision}`,
      changed_by: approverEmail,
      metadata: { stage: 'final_review', decision, notes },
    });

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to finalize review:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Reject a request (for admins)
export async function rejectRequest(requestId: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('article_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to reject request:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Delete an article request (for admins)
export async function deleteArticleRequest(requestId: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    // First delete associated approvals
    const { error: approvalsError } = await supabase
      .from('request_approvals')
      .delete()
      .eq('request_id', requestId);

    if (approvalsError) {
      console.error('Error deleting approvals:', approvalsError);
      // Continue anyway - approvals might not exist
    }

    // Then delete the request
    const { error } = await supabase
      .from('article_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Error deleting request:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to delete article request:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Find similar updates using AI
export async function findSimilarUpdates(params: {
  title?: string;
  summary?: string;
  body?: string;
}): Promise<ApiResponse<Array<{
  id: string;
  title: string;
  similarity: 'high' | 'medium' | 'low';
  reason: string;
  update: any;
}>>> {
  try {
    const { data, error } = await supabase.functions.invoke('find-similar-updates', {
      body: params,
    });

    if (error) {
      console.error('Error finding similar updates:', error);
      return { data: null, error: error.message };
    }

    return { data: data?.similarUpdates || [], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to find similar updates:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Delete an update (for HR role)
export async function deleteUpdate(updateId: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('updates')
      .delete()
      .eq('id', updateId);

    if (error) {
      console.error('Error deleting update:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to delete update:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Check if user is HR
export async function checkIsHR(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email.toLowerCase())
      .eq('role', 'hr')
      .maybeSingle();

    if (error) {
      console.error('Error checking HR status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Failed to check HR status:', err);
    return false;
  }
}
