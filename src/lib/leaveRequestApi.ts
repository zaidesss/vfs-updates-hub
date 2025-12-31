import { supabase } from "@/integrations/supabase/client";

export interface LeaveRequest {
  id: string;
  agent_email: string;
  agent_name: string;
  client_name: string;
  team_lead_name: string;
  role: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  outage_duration_hours: number | null;
  total_days: number | null;
  daily_hours: number | null;
  outage_reason: string;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'declined' | 'canceled';
  remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestInput {
  agent_name: string;
  client_name: string;
  team_lead_name: string;
  role: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  outage_reason: string;
  attachment_url?: string;
}

export interface LeaveRequestHistory {
  id: string;
  leave_request_id: string;
  changed_by: string;
  changed_at: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Helper to log changes to history
async function logLeaveRequestChange(
  leaveRequestId: string,
  changedBy: string,
  oldData: Partial<LeaveRequest>,
  newData: Partial<LeaveRequest>
): Promise<void> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  const fieldsToTrack = [
    'agent_name', 'client_name', 'team_lead_name', 'role',
    'start_date', 'end_date', 'start_time', 'end_time',
    'outage_reason', 'attachment_url', 'status', 'remarks'
  ];
  
  for (const field of fieldsToTrack) {
    const oldVal = oldData[field as keyof LeaveRequest];
    const newVal = newData[field as keyof LeaveRequest];
    if (oldVal !== newVal) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  
  if (Object.keys(changes).length > 0) {
    // Direct insert - cast to bypass type checking for new table
    const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<{ error: unknown }> } })
      .from('leave_request_history')
      .insert({
        leave_request_id: leaveRequestId,
        changed_by: changedBy,
        changes
      });
    
    if (error) {
      console.error('Error logging history:', error);
    }
  }
}

// Fetch leave request history
export async function fetchLeaveRequestHistory(
  leaveRequestId: string
): Promise<ApiResponse<LeaveRequestHistory[]>> {
  try {
    // Cast to bypass type checking for new table
    const result = await (supabase as unknown as { 
      from: (table: string) => { 
        select: (cols: string) => { 
          eq: (col: string, val: string) => { 
            order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> 
          } 
        } 
      } 
    })
      .from('leave_request_history')
      .select('*')
      .eq('leave_request_id', leaveRequestId)
      .order('changed_at', { ascending: false });
    
    if (result.error) {
      console.error('Error fetching history:', result.error);
      return { data: null, error: result.error.message };
    }
    
    return { data: result.data as LeaveRequestHistory[], error: null };
  } catch (err) {
    console.error('Error fetching history:', err);
    return { data: null, error: 'Failed to fetch history' };
  }
}

// Calculate duration, days, and daily hours
function calculateDurations(startDate: string, endDate: string, startTime: string, endTime: string) {
  const sd = new Date(startDate);
  const ed = new Date(endDate);
  
  // Parse times (format: "HH:mm")
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  // Calculate daily hours
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight (end time < start time)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const dailyMinutes = endMinutes - startMinutes;
  const dailyHours = dailyMinutes / 60;
  
  // Calculate total days
  const daysDiff = Math.floor((ed.getTime() - sd.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  
  // Total duration
  const totalHours = dailyHours * daysDiff;
  
  return {
    outage_duration_hours: Number(totalHours.toFixed(2)),
    total_days: daysDiff,
    daily_hours: Number(dailyHours.toFixed(2))
  };
}

// Conflict detection: same client + role + overlapping dates + overlapping times
export async function checkConflicts(
  input: LeaveRequestInput,
  excludeId?: string
): Promise<ApiResponse<{ hasConflict: boolean; conflictingAgents: string[] }>> {
  try {
    // Fetch all non-canceled/declined requests for the same client and role
    let query = supabase
      .from('leave_requests')
      .select('id, agent_name, start_date, end_date, start_time, end_time')
      .eq('client_name', input.client_name)
      .eq('role', input.role)
      .not('status', 'in', '("declined","canceled")');
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking conflicts:', error);
      return { data: null, error: error.message };
    }
    
    if (!data || data.length === 0) {
      return { data: { hasConflict: false, conflictingAgents: [] }, error: null };
    }
    
    const conflictingAgents: string[] = [];
    const inputStartDate = new Date(input.start_date);
    const inputEndDate = new Date(input.end_date);
    
    // Parse input times
    const [inputStartH, inputStartM] = input.start_time.split(':').map(Number);
    const [inputEndH, inputEndM] = input.end_time.split(':').map(Number);
    let inputStartMin = inputStartH * 60 + inputStartM;
    let inputEndMin = inputEndH * 60 + inputEndM;
    if (inputEndMin <= inputStartMin) inputEndMin += 24 * 60;
    
    for (const req of data) {
      const reqStartDate = new Date(req.start_date);
      const reqEndDate = new Date(req.end_date);
      
      // Check date overlap
      const datesOverlap = inputStartDate <= reqEndDate && reqStartDate <= inputEndDate;
      if (!datesOverlap) continue;
      
      // Check time overlap
      const [reqStartH, reqStartM] = req.start_time.split(':').map(Number);
      const [reqEndH, reqEndM] = req.end_time.split(':').map(Number);
      let reqStartMin = reqStartH * 60 + reqStartM;
      let reqEndMin = reqEndH * 60 + reqEndM;
      if (reqEndMin <= reqStartMin) reqEndMin += 24 * 60;
      
      const timesOverlap = inputStartMin < reqEndMin && reqStartMin < inputEndMin;
      if (timesOverlap) {
        conflictingAgents.push(req.agent_name);
      }
    }
    
    return {
      data: {
        hasConflict: conflictingAgents.length > 0,
        conflictingAgents
      },
      error: null
    };
  } catch (err) {
    console.error('Error checking conflicts:', err);
    return { data: null, error: 'Failed to check conflicts' };
  }
}

export async function createLeaveRequest(
  input: LeaveRequestInput,
  agentEmail: string
): Promise<ApiResponse<LeaveRequest>> {
  try {
    const durations = calculateDurations(input.start_date, input.end_date, input.start_time, input.end_time);
    
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        agent_email: agentEmail.toLowerCase(),
        agent_name: input.agent_name,
        client_name: input.client_name,
        team_lead_name: input.team_lead_name,
        role: input.role,
        start_date: input.start_date,
        end_date: input.end_date,
        start_time: input.start_time,
        end_time: input.end_time,
        outage_reason: input.outage_reason,
        attachment_url: input.attachment_url || null,
        ...durations
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating leave request:', error);
      return { data: null, error: error.message };
    }
    
    return { data: data as LeaveRequest, error: null };
  } catch (err) {
    console.error('Error creating leave request:', err);
    return { data: null, error: 'Failed to create leave request' };
  }
}

export async function updateLeaveRequest(
  id: string,
  input: LeaveRequestInput,
  agentEmail: string,
  resetToPending: boolean = false
): Promise<ApiResponse<LeaveRequest>> {
  try {
    // First fetch the old data for history logging
    const { data: oldData } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    const durations = calculateDurations(input.start_date, input.end_date, input.start_time, input.end_time);
    
    const updateData: Record<string, unknown> = {
      agent_name: input.agent_name,
      client_name: input.client_name,
      team_lead_name: input.team_lead_name,
      role: input.role,
      start_date: input.start_date,
      end_date: input.end_date,
      start_time: input.start_time,
      end_time: input.end_time,
      outage_reason: input.outage_reason,
      attachment_url: input.attachment_url || null,
      ...durations
    };

    // If resetting to pending (editing an approved request), clear review info
    if (resetToPending) {
      updateData.status = 'pending';
      updateData.reviewed_by = null;
      updateData.reviewed_at = null;
      updateData.remarks = null;
    }

    // For agent edits - always require their email match
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .eq('agent_email', agentEmail.toLowerCase())
      .select()
      .maybeSingle();

    if (!data && !error) {
      return { data: null, error: 'Request not found or you do not have permission to update it' };
    }
    
    if (error) {
      console.error('Error updating leave request:', error);
      return { data: null, error: error.message };
    }

    // Log the change to history
    if (oldData && data) {
      await logLeaveRequestChange(id, agentEmail, oldData as LeaveRequest, data as LeaveRequest);
    }
    
    return { data: data as LeaveRequest, error: null };
  } catch (err) {
    console.error('Error updating leave request:', err);
    return { data: null, error: 'Failed to update leave request' };
  }
}

// Admin update - no agent_email restriction, always resets to pending
export async function adminUpdateLeaveRequest(
  id: string,
  input: LeaveRequestInput,
  adminEmail: string
): Promise<ApiResponse<LeaveRequest>> {
  try {
    // First fetch the old data for history logging
    const { data: oldData } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    const durations = calculateDurations(input.start_date, input.end_date, input.start_time, input.end_time);
    
    const updateData: Record<string, unknown> = {
      agent_name: input.agent_name,
      client_name: input.client_name,
      team_lead_name: input.team_lead_name,
      role: input.role,
      start_date: input.start_date,
      end_date: input.end_date,
      start_time: input.start_time,
      end_time: input.end_time,
      outage_reason: input.outage_reason,
      attachment_url: input.attachment_url || null,
      ...durations,
      // Always reset to pending when admin edits
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      remarks: null
    };

    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating leave request (admin):', error);
      return { data: null, error: error.message };
    }

    // Log the change to history
    if (oldData && data) {
      await logLeaveRequestChange(id, adminEmail, oldData as LeaveRequest, data as LeaveRequest);
    }
    
    return { data: data as LeaveRequest, error: null };
  } catch (err) {
    console.error('Error updating leave request (admin):', err);
    return { data: null, error: 'Failed to update leave request' };
  }
}

export async function fetchMyLeaveRequests(): Promise<ApiResponse<LeaveRequest[]>> {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching leave requests:', error);
      return { data: null, error: error.message };
    }
    
    return { data: data as LeaveRequest[], error: null };
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    return { data: null, error: 'Failed to fetch leave requests' };
  }
}

export async function fetchAllLeaveRequests(): Promise<ApiResponse<LeaveRequest[]>> {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all leave requests:', error);
      return { data: null, error: error.message };
    }
    
    return { data: data as LeaveRequest[], error: null };
  } catch (err) {
    console.error('Error fetching all leave requests:', err);
    return { data: null, error: 'Failed to fetch all leave requests' };
  }
}

// Calendar-specific type with limited fields for privacy
export interface CalendarLeaveRequest {
  id: string;
  agent_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved';
  outage_reason: string;
}

export async function fetchCalendarRequests(startDate: string, endDate: string): Promise<ApiResponse<CalendarLeaveRequest[]>> {
  try {
    // Only select limited fields for calendar view (privacy protection)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, agent_name, client_name, start_date, end_date, status, outage_reason')
      .in('status', ['pending', 'approved'])
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
      .order('start_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching calendar requests:', error);
      return { data: null, error: error.message };
    }
    
    return { data: data as CalendarLeaveRequest[], error: null };
  } catch (err) {
    console.error('Error fetching calendar requests:', err);
    return { data: null, error: 'Failed to fetch calendar requests' };
  }
}

export async function updateLeaveRequestStatus(
  id: string,
  status: 'approved' | 'declined' | 'canceled',
  reviewedBy: string,
  remarks?: string
): Promise<ApiResponse<LeaveRequest>> {
  try {
    // First fetch the old data for history logging
    const { data: oldData } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    const updateData: Record<string, unknown> = {
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString()
    };
    
    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }
    
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating leave request:', error);
      return { data: null, error: error.message };
    }

    // Log the change to history
    if (oldData && data) {
      await logLeaveRequestChange(id, reviewedBy, oldData as LeaveRequest, data as LeaveRequest);
    }

    // Send decision notification
    if (data) {
      try {
        await supabase.functions.invoke('send-leave-decision-notification', {
          body: {
            requestId: data.id,
            agentName: data.agent_name,
            agentEmail: data.agent_email,
            clientName: data.client_name,
            teamLeadName: data.team_lead_name,
            role: data.role,
            startDate: data.start_date,
            endDate: data.end_date,
            startTime: data.start_time,
            endTime: data.end_time,
            outageReason: data.outage_reason,
            totalDays: data.total_days,
            outageDurationHours: data.outage_duration_hours,
            decision: status,
            reviewedBy: reviewedBy,
            remarks: remarks
          }
        });
      } catch (notifyErr) {
        console.error('Failed to send decision notification:', notifyErr);
      }
    }
    
    return { data: data as LeaveRequest, error: null };
  } catch (err) {
    console.error('Error updating leave request:', err);
    return { data: null, error: 'Failed to update leave request' };
  }
}

// Cancel leave request - allow canceling any status (pending or approved)
export async function cancelLeaveRequest(id: string, agentEmail: string): Promise<ApiResponse<LeaveRequest>> {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'canceled',
        reviewed_by: agentEmail,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('agent_email', agentEmail.toLowerCase())
      .select()
      .single();
    
    if (error) {
      console.error('Error canceling leave request:', error);
      return { data: null, error: error.message };
    }

    // Send cancellation notification
    if (data) {
      try {
        await supabase.functions.invoke('send-leave-decision-notification', {
          body: {
            requestId: data.id,
            agentName: data.agent_name,
            agentEmail: data.agent_email,
            clientName: data.client_name,
            teamLeadName: data.team_lead_name,
            role: data.role,
            startDate: data.start_date,
            endDate: data.end_date,
            startTime: data.start_time,
            endTime: data.end_time,
            outageReason: data.outage_reason,
            totalDays: data.total_days,
            outageDurationHours: data.outage_duration_hours,
            decision: 'canceled',
            reviewedBy: agentEmail,
            remarks: 'Canceled by agent'
          }
        });
      } catch (notifyErr) {
        console.error('Failed to send cancellation notification:', notifyErr);
      }
    }
    
    return { data: data as LeaveRequest, error: null };
  } catch (err) {
    console.error('Error canceling leave request:', err);
    return { data: null, error: 'Failed to cancel leave request' };
  }
}

// Upload file to storage bucket
export async function uploadAttachment(file: File, agentEmail: string): Promise<ApiResponse<string>> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${agentEmail}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('leave-attachments')
      .upload(fileName, file);
    
    if (error) {
      console.error('Error uploading attachment:', error);
      return { data: null, error: error.message };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('leave-attachments')
      .getPublicUrl(data.path);
    
    return { data: urlData.publicUrl, error: null };
  } catch (err) {
    console.error('Error uploading attachment:', err);
    return { data: null, error: 'Failed to upload attachment' };
  }
}