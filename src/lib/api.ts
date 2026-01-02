import { Update, Acknowledgement, UpdateChangeHistory } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { mockUpdates, mockAcknowledgements } from '@/lib/mockData';

// Flag to control whether to use the real API or mock data
const USE_MOCK_DATA = false;

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface AdminRole {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  name?: string;
}

// Fetch admin emails from the database
export async function fetchAdminEmails(): Promise<ApiResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('email')
      .eq('role', 'admin');

    if (error) {
      console.error('Error fetching admin emails:', error);
      return { data: null, error: error.message };
    }

    const emails = data?.map(row => row.email.toLowerCase()) || [];
    return { data: emails, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch admin emails:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Check if an email is an admin
export async function checkIsAdmin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email.toLowerCase())
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Failed to check admin status:', err);
    return false;
  }
}

// Add a new admin
export async function addAdmin(email: string, name?: string): Promise<ApiResponse<AdminRole>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({ email: email.toLowerCase(), role: 'admin', name: name || null })
      .select()
      .single();

    if (error) {
      console.error('Error adding admin:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to add admin:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Remove an admin
export async function removeAdmin(email: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('email', email.toLowerCase());

    if (error) {
      console.error('Error removing admin:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to remove admin:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Fetch all admins
export async function fetchAdmins(): Promise<ApiResponse<AdminRole[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admins:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole[], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch admins:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Fetch all users (non-admin)
export async function fetchUsers(): Promise<ApiResponse<AdminRole[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole[], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch users:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Add a new user
export async function addUser(email: string, name?: string): Promise<ApiResponse<AdminRole>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({ email: email.toLowerCase(), role: 'user', name: name || null })
      .select()
      .single();

    if (error) {
      console.error('Error adding user:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to add user:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Remove a user (via edge function to also delete from Auth)
export async function removeUser(email: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { email: email.toLowerCase() }
    });

    if (error) {
      console.error('Error removing user:', error);
      return { data: null, error: error.message };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to remove user:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Bulk add users
export async function bulkAddUsers(emails: string[]): Promise<ApiResponse<{ added: number; failed: string[] }>> {
  const results = { added: 0, failed: [] as string[] };
  
  for (const email of emails) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) continue;
    
    const { error } = await addUser(trimmedEmail);
    if (error) {
      results.failed.push(trimmedEmail);
    } else {
      results.added++;
    }
  }
  
  return { data: results, error: null };
}

// Fetch updates directly from the database
export async function fetchUpdates(): Promise<ApiResponse<Update[]>> {
  if (USE_MOCK_DATA) {
    return { data: mockUpdates, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('posted_at', { ascending: false });

    if (error) {
      console.error('Error fetching updates:', error);
      return { data: mockUpdates, error: null };
    }

    // Map database rows to Update type
    const updates: Update[] = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      help_center_url: row.help_center_url || '',
      posted_by: row.posted_by,
      posted_at: row.posted_at,
      deadline_at: row.deadline_at,
      status: row.status as 'draft' | 'published' | 'archived' | 'obsolete',
      category: row.category,
      reference_number: row.reference_number,
    }));

    return { data: updates, error: null };
  } catch (err) {
    console.log('Falling back to mock updates data');
    return { data: mockUpdates, error: null };
  }
}

export async function fetchAcknowledgements(): Promise<ApiResponse<Acknowledgement[]>> {
  if (USE_MOCK_DATA) {
    return { data: mockAcknowledgements, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('acknowledgements')
      .select('update_id, agent_email, acknowledged_at');

    if (error) {
      console.error('Error fetching acknowledgements:', error);
      return { data: mockAcknowledgements, error: null };
    }

    return { data: data as Acknowledgement[], error: null };
  } catch (err) {
    console.log('Falling back to mock acknowledgements data');
    return { data: mockAcknowledgements, error: null };
  }
}

export async function acknowledgeUpdate(updateId: string, agentEmail: string): Promise<ApiResponse<{ ok: boolean; acknowledged_at: string }>> {
  if (USE_MOCK_DATA) {
    return {
      data: { ok: true, acknowledged_at: new Date().toISOString() },
      error: null
    };
  }

  try {
    const acknowledged_at = new Date().toISOString();

    const { error } = await supabase
      .from('acknowledgements')
      .insert({
        update_id: updateId,
        agent_email: agentEmail.toLowerCase(),
        acknowledged_at
      });

    if (error) {
      console.error('Error acknowledging update:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true, acknowledged_at }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to acknowledge update:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

export async function createUpdate(update: Omit<Update, 'id' | 'posted_at'>): Promise<ApiResponse<{ ok: boolean; update: Update }>> {
  if (USE_MOCK_DATA) {
    const newUpdate: Update = {
      ...update,
      id: String(Date.now()),
      posted_at: new Date().toISOString(),
    };
    return { data: { ok: true, update: newUpdate }, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('updates')
      .insert([{
        title: update.title,
        summary: update.summary,
        body: update.body,
        help_center_url: update.help_center_url || null,
        posted_by: update.posted_by,
        deadline_at: update.deadline_at || null,
        status: update.status,
        category: update.category || null,
      }] as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating update:', error);
      return { data: null, error: error.message };
    }

    const newUpdate: Update = {
      id: data.id,
      title: data.title,
      summary: data.summary,
      body: data.body,
      help_center_url: data.help_center_url || '',
      posted_by: data.posted_by,
      posted_at: data.posted_at,
      deadline_at: data.deadline_at,
      status: data.status as 'draft' | 'published' | 'archived' | 'obsolete',
      category: data.category,
      reference_number: data.reference_number,
    };

    // If update is published, send notifications
    if (update.status === 'published') {
      try {
        await supabase.functions.invoke('send-notifications', {
          body: { updateTitle: update.title, referenceNumber: data.reference_number }
        });
        console.log('Notifications sent for new update');
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
        // Don't fail the create - notifications are best-effort
      }
    }

    return { data: { ok: true, update: newUpdate }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to create update:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

export async function editUpdate(
  updateId: string, 
  update: Partial<Omit<Update, 'id' | 'posted_at'>>,
  changedBy?: string
): Promise<ApiResponse<{ ok: boolean; update: Update }>> {
  if (USE_MOCK_DATA) {
    const editedUpdate: Update = {
      id: updateId,
      posted_at: new Date().toISOString(),
      title: update.title || '',
      summary: update.summary || '',
      body: update.body || '',
      help_center_url: update.help_center_url || '',
      posted_by: update.posted_by || '',
      deadline_at: update.deadline_at || null,
      status: update.status || 'draft',
    };
    return { data: { ok: true, update: editedUpdate }, error: null };
  }

  try {
    // Fetch current update to track changes
    const { data: currentUpdate, error: fetchError } = await supabase
      .from('updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (fetchError) {
      console.error('Error fetching current update:', fetchError);
    }

    // Build update object with only defined fields
    const updateFields: Record<string, unknown> = {};
    if (update.title !== undefined) updateFields.title = update.title;
    if (update.summary !== undefined) updateFields.summary = update.summary;
    if (update.body !== undefined) updateFields.body = update.body;
    if (update.help_center_url !== undefined) updateFields.help_center_url = update.help_center_url || null;
    if (update.posted_by !== undefined) updateFields.posted_by = update.posted_by;
    if (update.deadline_at !== undefined) updateFields.deadline_at = update.deadline_at || null;
    if (update.status !== undefined) updateFields.status = update.status;

    const { data, error } = await supabase
      .from('updates')
      .update(updateFields)
      .eq('id', updateId)
      .select()
      .single();

    if (error) {
      console.error('Error editing update:', error);
      return { data: null, error: error.message };
    }

    const editedUpdate: Update = {
      id: data.id,
      title: data.title,
      summary: data.summary,
      body: data.body,
      help_center_url: data.help_center_url || '',
      posted_by: data.posted_by,
      posted_at: data.posted_at,
      deadline_at: data.deadline_at,
      status: data.status as 'draft' | 'published' | 'archived' | 'obsolete',
      category: data.category,
      reference_number: data.reference_number,
    };

    // Track changes in change history
    if (currentUpdate && changedBy) {
      const changes: Record<string, { old: string | null; new: string | null }> = {};
      
      const fieldsToTrack = ['title', 'summary', 'body', 'help_center_url', 'posted_by', 'deadline_at', 'status'];
      for (const field of fieldsToTrack) {
        const oldValue = currentUpdate[field];
        const newValue = data[field];
        if (oldValue !== newValue) {
          changes[field] = { old: oldValue, new: newValue };
        }
      }

      if (Object.keys(changes).length > 0) {
        const { error: historyError } = await supabase
          .from('update_change_history')
          .insert({
            update_id: updateId,
            changed_by: changedBy,
            changes: changes,
          });

        if (historyError) {
          console.error('Error saving change history:', historyError);
        }
      }
    }

    // Send notification for edit
    try {
      await supabase.functions.invoke('send-notifications', {
        body: { updateTitle: update.title || editedUpdate.title, isEdit: true, referenceNumber: data.reference_number }
      });
      console.log('Notifications sent for edited update');
    } catch (notifyError) {
      console.error('Failed to send edit notifications:', notifyError);
      // Don't fail the edit - notifications are best-effort
    }

    return { data: { ok: true, update: editedUpdate }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to edit update:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Fetch change history for an update
export async function fetchChangeHistory(updateId: string): Promise<ApiResponse<UpdateChangeHistory[]>> {
  try {
    const { data, error } = await supabase
      .from('update_change_history')
      .select('*')
      .eq('update_id', updateId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching change history:', error);
      return { data: null, error: error.message };
    }

    return { data: data as UpdateChangeHistory[], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch change history:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Submit a question about an update
export async function submitQuestion(
  updateId: string, 
  updateTitle: string, 
  userEmail: string, 
  question: string
): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase.functions.invoke('send-question', {
      body: { updateId, updateTitle, userEmail, question }
    });

    if (error) {
      console.error('Error submitting question:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to submit question:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Create user with password via edge function
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'user' | 'hr'
): Promise<ApiResponse<{ success: boolean; userId?: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('create-user-with-password', {
      body: { email, password, name, role }
    });

    if (error) {
      console.error('Error creating user with password:', error);
      return { data: null, error: error.message };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data: { success: true, userId: data?.userId }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to create user with password:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Change user email via edge function
export async function changeUserEmail(
  oldEmail: string,
  newEmail: string
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const { data, error } = await supabase.functions.invoke('change-user-email', {
      body: { oldEmail, newEmail }
    });

    if (error) {
      console.error('Error changing user email:', error);
      return { data: null, error: error.message };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to change user email:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Force password reset for a user
export async function forcePasswordReset(email: string, userName?: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ must_change_password: true } as any)
      .eq('email', email.toLowerCase());

    if (error) {
      console.error('Error setting password reset flag:', error);
      return { data: null, error: error.message };
    }

    // Send notification email to user
    try {
      await supabase.functions.invoke('send-password-reset-notification', {
        body: { email: email.toLowerCase(), userName }
      });
      console.log('Password reset notification sent');
    } catch (notifyError) {
      console.error('Failed to send password reset notification:', notifyError);
      // Don't fail the operation if notification fails
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to set password reset flag:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Reply to a question about an update
export async function replyToQuestion(
  questionId: string,
  updateId: string,
  updateTitle: string,
  replyText: string,
  repliedBy: string,
  userEmail: string
): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    // Update the question with the reply
    const { error } = await supabase
      .from('update_questions')
      .update({
        reply: replyText,
        replied_by: repliedBy,
        replied_at: new Date().toISOString()
      })
      .eq('id', questionId);

    if (error) {
      console.error('Error replying to question:', error);
      return { data: null, error: error.message };
    }

    // Send notification to the user who asked the question
    try {
      await supabase.functions.invoke('send-question-reply-notification', {
        body: { questionId, updateId, updateTitle, replyText, repliedBy, userEmail }
      });
      console.log('Reply notification sent');
    } catch (notifyError) {
      console.error('Failed to send reply notification:', notifyError);
      // Don't fail the operation if notification fails
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to reply to question:', errorMessage);
    return { data: null, error: errorMessage };
  }
}
