// Demo data for UI shell - all hardcoded sample data
// No backend required

export const DEMO_ACCOUNTS = {
  agent: { email: 'agent@demo.com', password: 'demo123', name: 'Jane Smith', role: 'agent' },
  admin: { email: 'admin@demo.com', password: 'demo123', name: 'Admin User', role: 'super_admin' },
};

const profileId1 = '11111111-1111-1111-1111-111111111111';
const profileId2 = '22222222-2222-2222-2222-222222222222';
const profileId3 = '33333333-3333-3333-3333-333333333333';
const profileId4 = '44444444-4444-4444-4444-444444444444';
const profileId5 = '55555555-5555-5555-5555-555555555555';
const profileId6 = '66666666-6666-6666-6666-666666666666';

export const DEMO_PROFILES = [
  {
    id: profileId1,
    email: 'agent@demo.com',
    full_name: 'Jane Smith',
    agent_name: 'Jane S.',
    agent_tag: 'Jane S.',
    position: ['Email', 'Chat'],
    employment_status: 'Active',
    support_account: 'VFS',
    support_type: ['Email', 'Chat'],
    zendesk_instance: 'customerserviceadvocates',
    team_lead: 'Admin User',
    start_date: '2023-01-15',
    hourly_rate: 5.5,
    payment_frequency: 'Weekly',
    birthday: '1995-06-20',
    phone_number: '+1234567890',
    home_address: '123 Demo Street, Test City',
    primary_internet_provider: 'Fiber ISP',
    primary_internet_speed: '100 Mbps',
    backup_internet_provider: 'Mobile Data',
    backup_internet_speed: '20 Mbps',
    backup_internet_type: 'Mobile',
    headset_model: 'Jabra Evolve2 75',
    emergency_contact_name: 'John Smith',
    emergency_contact_phone: '+0987654321',
    bank_name: 'Demo Bank',
    bank_account_number: '****1234',
    bank_account_holder: 'Jane Smith',
    clients: 'VFS',
    work_schedule: 'Weekday',
    break_schedule: '12:00 PM - 1:00 PM',
    mon_schedule: '9:00 AM - 6:00 PM',
    tue_schedule: '9:00 AM - 6:00 PM',
    wed_schedule: '9:00 AM - 6:00 PM',
    thu_schedule: '9:00 AM - 6:00 PM',
    fri_schedule: '9:00 AM - 6:00 PM',
    sat_schedule: null,
    sun_schedule: null,
    mon_ot_schedule: null,
    tue_ot_schedule: null,
    wed_ot_schedule: null,
    thu_ot_schedule: null,
    fri_ot_schedule: null,
    sat_ot_schedule: null,
    sun_ot_schedule: null,
    weekday_ot_schedule: null,
    weekend_ot_schedule: null,
    day_off: ['Sat', 'Sun'],
    ot_enabled: false,
    quota_email: 30,
    quota_chat: 15,
    quota_phone: 10,
    quota_ot_email: 0,
    ticket_assignment_enabled: true,
    ticket_assignment_view_id: '12345',
    upwork_contract_id: 'UP-001',
    upwork_contract_type: ['Hourly'],
    upwork_profile_url: 'https://upwork.com/demo',
    upwork_username: 'janesmith',
    zendesk_user_id: 'zd-001',
    views: ['All Unsolved', 'New Tickets'],
    rate_history: null,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: profileId2,
    email: 'admin@demo.com',
    full_name: 'Admin User',
    agent_name: 'Admin U.',
    agent_tag: 'Admin U.',
    position: ['Team Lead'],
    employment_status: 'Active',
    support_account: 'VFS',
    support_type: ['Email'],
    zendesk_instance: 'customerserviceadvocates',
    team_lead: null,
    start_date: '2022-01-01',
    hourly_rate: 8.0,
    break_schedule: '12:00 PM - 1:00 PM',
    mon_schedule: '8:00 AM - 5:00 PM',
    tue_schedule: '8:00 AM - 5:00 PM',
    wed_schedule: '8:00 AM - 5:00 PM',
    thu_schedule: '8:00 AM - 5:00 PM',
    fri_schedule: '8:00 AM - 5:00 PM',
    sat_schedule: null,
    sun_schedule: null,
    day_off: ['Sat', 'Sun'],
    quota_email: 40,
    quota_chat: 0,
    quota_phone: 0,
    quota_ot_email: 0,
    ot_enabled: false,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: profileId3,
    email: 'mike.jones@demo.com',
    full_name: 'Mike Jones',
    agent_name: 'Mike J.',
    agent_tag: 'Mike J.',
    position: ['Email', 'Chat', 'Phone'],
    employment_status: 'Active',
    support_account: 'VFS',
    support_type: ['Email', 'Chat', 'Phone'],
    zendesk_instance: 'customerserviceadvocates',
    team_lead: 'Admin User',
    start_date: '2023-03-10',
    break_schedule: '1:00 PM - 2:00 PM',
    mon_schedule: '10:00 AM - 7:00 PM',
    tue_schedule: '10:00 AM - 7:00 PM',
    wed_schedule: '10:00 AM - 7:00 PM',
    thu_schedule: '10:00 AM - 7:00 PM',
    fri_schedule: '10:00 AM - 7:00 PM',
    sat_schedule: '10:00 AM - 3:00 PM',
    sun_schedule: null,
    day_off: ['Sun'],
    quota_email: 25,
    quota_chat: 20,
    quota_phone: 15,
    quota_ot_email: 10,
    ot_enabled: true,
    created_at: '2023-03-10T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: profileId4,
    email: 'sarah.lee@demo.com',
    full_name: 'Sarah Lee',
    agent_name: 'Sarah L.',
    agent_tag: 'Sarah L.',
    position: ['Chat'],
    employment_status: 'Active',
    support_account: 'VFS',
    support_type: ['Chat'],
    zendesk_instance: 'customerserviceadvocateshelp',
    team_lead: 'Admin User',
    start_date: '2023-06-01',
    break_schedule: '11:00 AM - 12:00 PM',
    mon_schedule: '7:00 AM - 4:00 PM',
    tue_schedule: '7:00 AM - 4:00 PM',
    wed_schedule: '7:00 AM - 4:00 PM',
    thu_schedule: '7:00 AM - 4:00 PM',
    fri_schedule: '7:00 AM - 4:00 PM',
    sat_schedule: null,
    sun_schedule: null,
    day_off: ['Sat', 'Sun'],
    quota_email: 0,
    quota_chat: 25,
    quota_phone: 0,
    quota_ot_email: 0,
    ot_enabled: false,
    created_at: '2023-06-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: profileId5,
    email: 'tom.davis@demo.com',
    full_name: 'Tom Davis',
    agent_name: 'Tom D.',
    agent_tag: 'Tom D.',
    position: ['Email'],
    employment_status: 'Active',
    support_account: 'VFS',
    support_type: ['Email'],
    zendesk_instance: 'customerserviceadvocates',
    team_lead: 'Admin User',
    start_date: '2023-09-15',
    break_schedule: '12:30 PM - 1:30 PM',
    mon_schedule: '8:30 AM - 5:30 PM',
    tue_schedule: '8:30 AM - 5:30 PM',
    wed_schedule: '8:30 AM - 5:30 PM',
    thu_schedule: '8:30 AM - 5:30 PM',
    fri_schedule: '8:30 AM - 5:30 PM',
    sat_schedule: null,
    sun_schedule: null,
    day_off: ['Sat', 'Sun'],
    quota_email: 35,
    quota_chat: 0,
    quota_phone: 0,
    quota_ot_email: 0,
    ot_enabled: false,
    created_at: '2023-09-15T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: profileId6,
    email: 'lisa.wong@demo.com',
    full_name: 'Lisa Wong',
    agent_name: 'Lisa W.',
    agent_tag: 'Lisa W.',
    position: ['Logistics'],
    employment_status: 'Active',
    support_account: 'VFS',
    support_type: ['Email'],
    zendesk_instance: 'customerserviceadvocates',
    team_lead: 'Admin User',
    start_date: '2024-01-10',
    break_schedule: '12:00 PM - 1:00 PM',
    mon_schedule: '9:00 AM - 6:00 PM',
    tue_schedule: '9:00 AM - 6:00 PM',
    wed_schedule: '9:00 AM - 6:00 PM',
    thu_schedule: '9:00 AM - 6:00 PM',
    fri_schedule: '9:00 AM - 6:00 PM',
    sat_schedule: null,
    sun_schedule: null,
    day_off: ['Sat', 'Sun'],
    quota_email: 30,
    quota_chat: 0,
    quota_phone: 0,
    quota_ot_email: 0,
    ot_enabled: false,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const DEMO_USER_ROLES = [
  { id: '1', email: 'agent@demo.com', role: 'user', must_change_password: false },
  { id: '2', email: 'admin@demo.com', role: 'super_admin', must_change_password: false },
  { id: '3', email: 'mike.jones@demo.com', role: 'user', must_change_password: false },
  { id: '4', email: 'sarah.lee@demo.com', role: 'user', must_change_password: false },
  { id: '5', email: 'tom.davis@demo.com', role: 'user', must_change_password: false },
  { id: '6', email: 'lisa.wong@demo.com', role: 'user', must_change_password: false },
];

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
const weekAgo = new Date(Date.now() - 604800000).toISOString();

export const DEMO_UPDATES = [
  {
    id: 'upd-1',
    title: 'New Refund Policy Update',
    summary: 'Updated refund processing guidelines effective immediately.',
    body: '## Refund Policy Changes\n\nEffective immediately, all refund requests over $100 must be escalated to a Team Lead for approval.\n\n### Key Changes:\n- Refunds under $50: Auto-approve\n- Refunds $50-$100: Agent discretion\n- Refunds over $100: Team Lead approval required\n\n### Important Notes:\nPlease update your workflow accordingly.',
    help_center_url: 'https://help.example.com/refund-policy',
    posted_by: 'admin@demo.com',
    posted_at: yesterday,
    deadline_at: new Date(Date.now() + 604800000).toISOString(),
    status: 'published',
    category: 'policy_change',
    reference_number: 'UPD-0001',
  },
  {
    id: 'upd-2',
    title: 'Zendesk Macro Updates - March 2026',
    summary: 'Several macros have been updated to reflect new branding.',
    body: '## Macro Updates\n\nThe following macros have been updated:\n\n1. **Welcome Message** - New greeting format\n2. **Closing Message** - Updated signature\n3. **Escalation Template** - New escalation path\n\nPlease review and familiarize yourself with the changes.',
    help_center_url: '',
    posted_by: 'admin@demo.com',
    posted_at: twoDaysAgo,
    deadline_at: null,
    status: 'published',
    category: 'process_update',
    reference_number: 'UPD-0002',
  },
  {
    id: 'upd-3',
    title: 'Holiday Schedule Announcement',
    summary: 'Office closure dates for upcoming holidays.',
    body: '## Holiday Schedule\n\nPlease note the following holiday closures:\n\n- **March 15** - Company Holiday\n- **April 1** - Spring Break\n\nPlease plan your schedules accordingly.',
    help_center_url: '',
    posted_by: 'admin@demo.com',
    posted_at: weekAgo,
    deadline_at: null,
    status: 'published',
    category: 'announcement',
    reference_number: 'UPD-0003',
  },
  {
    id: 'upd-4',
    title: 'New Chat Widget Features',
    summary: 'Zendesk chat widget has been upgraded with new capabilities.',
    body: '## Chat Widget Upgrade\n\nNew features include:\n- **Typing indicators** for customers\n- **File sharing** up to 10MB\n- **Quick replies** for common questions\n\nTraining materials are available in the Knowledge Base.',
    help_center_url: 'https://help.example.com/chat-widget',
    posted_by: 'admin@demo.com',
    posted_at: weekAgo,
    deadline_at: new Date(Date.now() + 1209600000).toISOString(),
    status: 'published',
    category: 'tool_update',
    reference_number: 'UPD-0004',
  },
  {
    id: 'upd-5',
    title: 'Quality Standards Reminder',
    summary: 'Monthly reminder about quality evaluation criteria.',
    body: '## Quality Standards\n\nReminder: All agents are expected to maintain:\n- **CSAT score** above 90%\n- **First response time** under 2 hours\n- **Resolution time** under 24 hours\n\nPlease review the QA rubric for detailed criteria.',
    help_center_url: '',
    posted_by: 'admin@demo.com',
    posted_at: weekAgo,
    deadline_at: null,
    status: 'published',
    category: 'reminder',
    reference_number: 'UPD-0005',
  },
];

export const DEMO_ACKNOWLEDGEMENTS = [
  { id: 'ack-1', update_id: 'upd-3', agent_email: 'agent@demo.com', acknowledged_at: weekAgo },
  { id: 'ack-2', update_id: 'upd-5', agent_email: 'agent@demo.com', acknowledged_at: weekAgo },
  { id: 'ack-3', update_id: 'upd-1', agent_email: 'mike.jones@demo.com', acknowledged_at: yesterday },
  { id: 'ack-4', update_id: 'upd-2', agent_email: 'mike.jones@demo.com', acknowledged_at: twoDaysAgo },
  { id: 'ack-5', update_id: 'upd-3', agent_email: 'mike.jones@demo.com', acknowledged_at: weekAgo },
];

export const DEMO_UPDATE_QUESTIONS = [
  {
    id: 'q-1',
    update_id: 'upd-1',
    user_email: 'agent@demo.com',
    question: 'Does this refund policy apply to subscription cancellations as well?',
    created_at: yesterday,
    reference_number: 'Q-0001',
    reply: 'Yes, subscription cancellation refunds follow the same thresholds.',
    replied_by: 'admin@demo.com',
    replied_at: now,
    status: 'answered',
  },
  {
    id: 'q-2',
    update_id: 'upd-2',
    user_email: 'mike.jones@demo.com',
    question: 'Will the old macros still work during the transition?',
    created_at: twoDaysAgo,
    reference_number: 'Q-0002',
    reply: null,
    replied_by: null,
    replied_at: null,
    status: 'pending',
  },
];

export const DEMO_LEAVE_REQUESTS = [
  {
    id: 'lr-1',
    agent_email: 'agent@demo.com',
    agent_name: 'Jane Smith',
    client_name: 'VFS',
    role: 'Email/Chat Agent',
    team_lead_name: 'Admin User',
    outage_reason: 'Planned Leave',
    start_date: new Date(Date.now() + 604800000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 864000000).toISOString().split('T')[0],
    start_time: '9:00 AM',
    end_time: '6:00 PM',
    total_days: 3,
    daily_hours: 8,
    status: 'approved',
    remarks: 'Family vacation',
    reference_number: 'LR-0001',
    reviewed_by: 'admin@demo.com',
    reviewed_at: yesterday,
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 'lr-2',
    agent_email: 'mike.jones@demo.com',
    agent_name: 'Mike Jones',
    client_name: 'VFS',
    role: 'Hybrid Agent',
    team_lead_name: 'Admin User',
    outage_reason: 'Medical',
    start_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    start_time: '10:00 AM',
    end_time: '7:00 PM',
    total_days: 1,
    daily_hours: 8,
    status: 'pending',
    remarks: 'Doctor appointment',
    reference_number: 'LR-0002',
    reviewed_by: null,
    reviewed_at: null,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: 'lr-3',
    agent_email: 'sarah.lee@demo.com',
    agent_name: 'Sarah Lee',
    client_name: 'VFS',
    role: 'Chat Agent',
    team_lead_name: 'Admin User',
    outage_reason: 'ISP/Power Outage',
    start_date: twoDaysAgo.split('T')[0],
    end_date: twoDaysAgo.split('T')[0],
    start_time: '7:00 AM',
    end_time: '4:00 PM',
    total_days: 1,
    daily_hours: 8,
    status: 'rejected',
    remarks: 'Internet outage',
    reference_number: 'LR-0003',
    reviewed_by: 'admin@demo.com',
    reviewed_at: yesterday,
    override_reason: 'No supporting evidence provided',
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
];

export const DEMO_QA_EVALUATIONS = [
  {
    id: 'qa-1',
    agent_email: 'agent@demo.com',
    agent_name: 'Jane Smith',
    evaluator_email: 'admin@demo.com',
    evaluator_name: 'Admin User',
    ticket_id: '12345',
    ticket_type: 'email',
    ticket_url: 'https://zendesk.example.com/tickets/12345',
    work_week_start: weekAgo.split('T')[0],
    evaluation_date: yesterday.split('T')[0],
    greeting: 5,
    ticket_handling: 4,
    communication: 5,
    product_knowledge: 4,
    troubleshooting: 5,
    documentation: 4,
    tone_empathy: 5,
    total_score: 32,
    max_score: 35,
    percentage: 91.4,
    category: 'Satisfactory',
    notes: 'Great empathy shown. Minor documentation gap.',
    reference_number: 'QA-0001',
    status: 'published',
    zd_instance: 'customerserviceadvocates',
    coaching_notes: null,
    action_plan: null,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: 'qa-2',
    agent_email: 'mike.jones@demo.com',
    agent_name: 'Mike Jones',
    evaluator_email: 'admin@demo.com',
    evaluator_name: 'Admin User',
    ticket_id: '12346',
    ticket_type: 'chat',
    ticket_url: 'https://zendesk.example.com/tickets/12346',
    work_week_start: weekAgo.split('T')[0],
    evaluation_date: yesterday.split('T')[0],
    greeting: 5,
    ticket_handling: 5,
    communication: 4,
    product_knowledge: 5,
    troubleshooting: 5,
    documentation: 5,
    tone_empathy: 4,
    total_score: 33,
    max_score: 35,
    percentage: 94.3,
    category: 'Excellent',
    notes: 'Outstanding performance across all areas.',
    reference_number: 'QA-0002',
    status: 'published',
    zd_instance: 'customerserviceadvocates',
    coaching_notes: null,
    action_plan: null,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: 'qa-3',
    agent_email: 'sarah.lee@demo.com',
    agent_name: 'Sarah Lee',
    evaluator_email: 'admin@demo.com',
    evaluator_name: 'Admin User',
    ticket_id: '12347',
    ticket_type: 'chat',
    ticket_url: 'https://zendesk.example.com/tickets/12347',
    work_week_start: weekAgo.split('T')[0],
    evaluation_date: twoDaysAgo.split('T')[0],
    greeting: 4,
    ticket_handling: 3,
    communication: 4,
    product_knowledge: 3,
    troubleshooting: 3,
    documentation: 4,
    tone_empathy: 4,
    total_score: 25,
    max_score: 35,
    percentage: 71.4,
    category: 'Needs Improvement',
    notes: 'Product knowledge needs improvement. Coaching scheduled.',
    reference_number: 'QA-0003',
    status: 'published',
    zd_instance: 'customerserviceadvocateshelp',
    coaching_notes: 'Schedule 1-on-1 for product training',
    action_plan: 'coaching',
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
  {
    id: 'qa-4',
    agent_email: 'tom.davis@demo.com',
    agent_name: 'Tom Davis',
    evaluator_email: 'admin@demo.com',
    evaluator_name: 'Admin User',
    ticket_id: '12348',
    ticket_type: 'email',
    ticket_url: 'https://zendesk.example.com/tickets/12348',
    work_week_start: weekAgo.split('T')[0],
    evaluation_date: twoDaysAgo.split('T')[0],
    greeting: 5,
    ticket_handling: 4,
    communication: 5,
    product_knowledge: 5,
    troubleshooting: 4,
    documentation: 5,
    tone_empathy: 5,
    total_score: 33,
    max_score: 35,
    percentage: 94.3,
    category: 'Excellent',
    notes: 'Consistently excellent quality.',
    reference_number: 'QA-0004',
    status: 'published',
    zd_instance: 'customerserviceadvocates',
    coaching_notes: null,
    action_plan: null,
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
];

export const DEMO_AGENT_REPORTS = [
  {
    id: 'rpt-1',
    agent_email: 'agent@demo.com',
    agent_name: 'Jane Smith',
    profile_id: profileId1,
    incident_date: yesterday.split('T')[0],
    incident_type: 'Late Login',
    severity: 'minor',
    status: 'pending',
    notes: 'Logged in 15 minutes late due to internet issues.',
    details: { minutes_late: 15 },
    frequency_count: 1,
    reviewed_by: null,
    reviewed_at: null,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: 'rpt-2',
    agent_email: 'mike.jones@demo.com',
    agent_name: 'Mike Jones',
    profile_id: profileId3,
    incident_date: twoDaysAgo.split('T')[0],
    incident_type: 'Missed Chat',
    severity: 'moderate',
    status: 'reviewed',
    notes: 'Missed 2 incoming chats during peak hours.',
    details: { chats_missed: 2 },
    frequency_count: 1,
    reviewed_by: 'admin@demo.com',
    reviewed_at: yesterday,
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
];

export const DEMO_TICKET_DASHBOARD_DATA = [
  { agent_name: 'Jane S.', agent_email: 'agent@demo.com', log_date: yesterday.split('T')[0], email_count: 28, chat_count: 12, call_count: 0, avg_gap_seconds: 420, is_logged_in: true, autosolved_chat_count: 2 },
  { agent_name: 'Mike J.', agent_email: 'mike.jones@demo.com', log_date: yesterday.split('T')[0], email_count: 22, chat_count: 18, call_count: 8, avg_gap_seconds: 380, is_logged_in: true, autosolved_chat_count: 3 },
  { agent_name: 'Sarah L.', agent_email: 'sarah.lee@demo.com', log_date: yesterday.split('T')[0], email_count: 0, chat_count: 24, call_count: 0, avg_gap_seconds: 300, is_logged_in: false, autosolved_chat_count: 4 },
  { agent_name: 'Tom D.', agent_email: 'tom.davis@demo.com', log_date: yesterday.split('T')[0], email_count: 32, chat_count: 0, call_count: 0, avg_gap_seconds: 360, is_logged_in: true, autosolved_chat_count: 0 },
  { agent_name: 'Lisa W.', agent_email: 'lisa.wong@demo.com', log_date: yesterday.split('T')[0], email_count: 26, chat_count: 0, call_count: 0, avg_gap_seconds: 450, is_logged_in: false, autosolved_chat_count: 0 },
];

export const DEMO_PROFILE_STATUS = [
  { profile_id: profileId1, current_status: 'LOGGED_IN', status_since: new Date(Date.now() - 3600000).toISOString() },
  { profile_id: profileId2, current_status: 'LOGGED_IN', status_since: new Date(Date.now() - 7200000).toISOString() },
  { profile_id: profileId3, current_status: 'ON_BREAK', status_since: new Date(Date.now() - 1800000).toISOString() },
  { profile_id: profileId4, current_status: 'LOGGED_OUT', status_since: new Date(Date.now() - 36000000).toISOString() },
  { profile_id: profileId5, current_status: 'LOGGED_IN', status_since: new Date(Date.now() - 5400000).toISOString() },
  { profile_id: profileId6, current_status: 'LOGGED_OUT', status_since: new Date(Date.now() - 43200000).toISOString() },
];

export const DEMO_PROFILE_EVENTS = [
  { id: 'pe-1', profile_id: profileId1, event_type: 'LOGIN', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'pe-2', profile_id: profileId2, event_type: 'LOGIN', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'pe-3', profile_id: profileId3, event_type: 'LOGIN', created_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 'pe-4', profile_id: profileId3, event_type: 'BREAK_START', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'pe-5', profile_id: profileId5, event_type: 'LOGIN', created_at: new Date(Date.now() - 5400000).toISOString() },
];

export const DEMO_TEAM_STATUS_DATA = DEMO_PROFILES
  .filter(p => p.employment_status !== 'Terminated')
  .map(p => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    position: p.position,
    break_schedule: p.break_schedule,
    effective_schedule: p.mon_schedule,
    effective_ot_schedule: null,
    is_day_off: false,
  }));

export const DEMO_SCORECARD_DATA = DEMO_PROFILES
  .filter(p => !p.position?.includes('Team Lead'))
  .map(p => ({
    agent_email: p.email,
    agent_name: p.agent_name || p.full_name,
    agent_position: p.position?.includes('Phone') ? 'Hybrid' : p.position?.includes('Logistics') ? 'Logistics' : 'Chat',
    profile_id: p.id,
    quota_email: p.quota_email,
    quota_chat: p.quota_chat,
    quota_phone: p.quota_phone,
    quota_ot_email: p.quota_ot_email,
    day_off: p.day_off,
    mon_schedule: p.mon_schedule,
    tue_schedule: p.tue_schedule,
    wed_schedule: p.wed_schedule,
    thu_schedule: p.thu_schedule,
    fri_schedule: p.fri_schedule,
    sat_schedule: p.sat_schedule,
    sun_schedule: p.sun_schedule,
    email_count: Math.floor(Math.random() * 50) + 80,
    chat_count: p.quota_chat ? Math.floor(Math.random() * 30) + 50 : 0,
    call_count: p.quota_phone ? Math.floor(Math.random() * 20) + 30 : 0,
    ot_email_count: p.ot_enabled ? Math.floor(Math.random() * 15) + 5 : 0,
    qa_average: 85 + Math.random() * 15,
    revalida_score: 70 + Math.random() * 30,
    days_with_login: 5,
    approved_leave_days: 0,
    planned_leave_days: 0,
    unplanned_outage_days: 0,
    call_aht_seconds: 180 + Math.floor(Math.random() * 120),
    chat_aht_seconds: 300 + Math.floor(Math.random() * 200),
    chat_frt_seconds: 30 + Math.floor(Math.random() * 60),
    order_escalation: Math.random() * 5,
    productivity_count_override: null,
    is_saved: false,
  }));

export const DEMO_REVALIDA_BATCHES = [
  {
    id: 'rev-batch-1',
    title: 'March 2026 Monthly Assessment',
    description: 'Monthly knowledge assessment covering recent policy changes.',
    status: 'active',
    question_count: 20,
    time_limit_minutes: 30,
    passing_score: 70,
    start_at: weekAgo,
    end_at: new Date(Date.now() + 604800000).toISOString(),
    created_by: 'admin@demo.com',
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: 'rev-batch-2',
    title: 'February 2026 Assessment',
    description: 'Previous month knowledge check.',
    status: 'completed',
    question_count: 15,
    time_limit_minutes: 25,
    passing_score: 70,
    start_at: new Date(Date.now() - 2592000000).toISOString(),
    end_at: new Date(Date.now() - 1987200000).toISOString(),
    created_by: 'admin@demo.com',
    created_at: new Date(Date.now() - 2592000000).toISOString(),
    updated_at: new Date(Date.now() - 1987200000).toISOString(),
  },
];

export const DEMO_REVALIDA_QUESTIONS = [
  { id: 'rq-1', batch_id: 'rev-batch-1', question_text: 'What is the maximum refund amount an agent can approve without escalation?', question_type: 'multiple_choice', options: ['$25', '$50', '$100', '$200'], correct_answer: '$100', points: 5, order_num: 1 },
  { id: 'rq-2', batch_id: 'rev-batch-1', question_text: 'Which department handles subscription cancellation requests?', question_type: 'multiple_choice', options: ['Billing', 'Support', 'Retention', 'Sales'], correct_answer: 'Retention', points: 5, order_num: 2 },
];

export const DEMO_REVALIDA_ATTEMPTS = [
  { id: 'ra-1', batch_id: 'rev-batch-2', agent_email: 'agent@demo.com', agent_name: 'Jane Smith', status: 'graded', score: 85, total_points: 100, final_percent: 85, started_at: new Date(Date.now() - 2500000000).toISOString(), submitted_at: new Date(Date.now() - 2498000000).toISOString(), answers: {} },
  { id: 'ra-2', batch_id: 'rev-batch-2', agent_email: 'mike.jones@demo.com', agent_name: 'Mike Jones', status: 'graded', score: 92, total_points: 100, final_percent: 92, started_at: new Date(Date.now() - 2500000000).toISOString(), submitted_at: new Date(Date.now() - 2497000000).toISOString(), answers: {} },
];

export const DEMO_KB_CATEGORIES = [
  { id: 'kb-cat-1', name: 'Getting Started', slug: 'getting-started', description: 'Onboarding and setup guides', article_count: 3, icon: 'book' },
  { id: 'kb-cat-2', name: 'Policies & Procedures', slug: 'policies-procedures', description: 'Company policies and SOPs', article_count: 5, icon: 'file-text' },
  { id: 'kb-cat-3', name: 'Tools & Systems', slug: 'tools-systems', description: 'Zendesk, Upwork, and other tools', article_count: 4, icon: 'settings' },
  { id: 'kb-cat-4', name: 'Troubleshooting', slug: 'troubleshooting', description: 'Common issues and solutions', article_count: 6, icon: 'wrench' },
];

export const DEMO_KB_ARTICLES = [
  { id: 'kb-1', category_id: 'kb-cat-1', title: 'Welcome to VFS', slug: 'welcome', body: '# Welcome\n\nWelcome to the VFS support team!', status: 'published', order_num: 1, created_by: 'admin@demo.com', created_at: weekAgo, updated_at: weekAgo },
  { id: 'kb-2', category_id: 'kb-cat-1', title: 'Setting Up Your Workspace', slug: 'workspace-setup', body: '# Workspace Setup\n\nFollow these steps to set up your tools.', status: 'published', order_num: 2, created_by: 'admin@demo.com', created_at: weekAgo, updated_at: weekAgo },
  { id: 'kb-3', category_id: 'kb-cat-2', title: 'Refund Policy', slug: 'refund-policy', body: '# Refund Policy\n\nAll refund requests must follow...\n\n## Thresholds\n- Under $50: Auto-approve\n- $50-$100: Agent discretion\n- Over $100: Team Lead approval', status: 'published', order_num: 1, created_by: 'admin@demo.com', created_at: weekAgo, updated_at: weekAgo },
];

export const DEMO_COVERAGE_OVERRIDES = [
  {
    id: 'co-1',
    agent_id: profileId1,
    date: new Date().toISOString().split('T')[0],
    override_start: '10:00 AM',
    override_end: '7:00 PM',
    override_type: 'regular',
    reason: 'Schedule swap',
    previous_value: '9:00 AM - 6:00 PM',
    break_schedule: '1:00 PM - 2:00 PM',
    created_by: 'admin@demo.com',
    created_at: yesterday,
  },
];

export const DEMO_NOTIFICATIONS = [
  { id: 'notif-1', user_email: 'agent@demo.com', title: 'New Update Posted', message: 'A new refund policy update has been posted.', type: 'update', read: false, created_at: yesterday, link: '/updates' },
  { id: 'notif-2', user_email: 'agent@demo.com', title: 'Leave Request Approved', message: 'Your leave request LR-0001 has been approved.', type: 'leave', read: true, created_at: twoDaysAgo, link: '/leave-request' },
  { id: 'notif-3', user_email: 'admin@demo.com', title: 'New Leave Request', message: 'Mike Jones submitted a leave request.', type: 'leave', read: false, created_at: yesterday, link: '/leave-request' },
];

export const DEMO_IMPROVEMENTS = [
  { id: 'imp-1', task: 'Add bulk acknowledge feature for updates', category: 'Feature Request', priority: 'high', status: 'in_progress', requested_by_email: 'agent@demo.com', requested_by_name: 'Jane Smith', assignee_email: 'admin@demo.com', assignee_name: 'Admin User', description: 'Allow agents to acknowledge multiple updates at once.', notes: 'In development', sort_order: 1, created_at: weekAgo, updated_at: yesterday, completed_at: null, due_date: null, remarks: null },
  { id: 'imp-2', task: 'Dark mode support', category: 'Enhancement', priority: 'medium', status: 'todo', requested_by_email: 'mike.jones@demo.com', requested_by_name: 'Mike Jones', assignee_email: null, assignee_name: null, description: 'Add dark mode theme toggle.', notes: null, sort_order: 2, created_at: weekAgo, updated_at: weekAgo, completed_at: null, due_date: null, remarks: null },
  { id: 'imp-3', task: 'Fix calendar timezone issue', category: 'Bug', priority: 'high', status: 'completed', requested_by_email: 'sarah.lee@demo.com', requested_by_name: 'Sarah Lee', assignee_email: 'admin@demo.com', assignee_name: 'Admin User', description: 'Calendar shows wrong timezone for some users.', notes: 'Fixed in v2.1', sort_order: 3, created_at: new Date(Date.now() - 1209600000).toISOString(), updated_at: weekAgo, completed_at: weekAgo, due_date: null, remarks: null },
];

export const DEMO_CHANGELOG = [
  { id: 'cl-1', title: 'Portal v2.1 Release', description: 'Bug fixes and performance improvements.', version: '2.1.0', type: 'release', reference_number: 'CL-0001', created_at: weekAgo, updated_at: weekAgo },
  { id: 'cl-2', title: 'New QA Evaluation Form', description: 'Redesigned QA evaluation form with improved scoring.', version: '2.0.0', type: 'feature', reference_number: 'CL-0002', created_at: new Date(Date.now() - 2592000000).toISOString(), updated_at: new Date(Date.now() - 2592000000).toISOString() },
];

export const DEMO_ARTICLE_REQUESTS = [
  { id: 'req-1', description: 'Need article about handling chargebacks', request_type: 'new_article', category: 'process_update', status: 'pending', priority: 'medium', submitted_by: 'agent@demo.com', submitted_at: yesterday, sample_ticket: '99001', reference_number: 'REQ-0001', created_at: yesterday, final_decision: null, final_notes: null, final_reviewed_at: null, final_reviewed_by: null },
  { id: 'req-2', description: 'Update the shipping policy article with new carriers', request_type: 'update_article', category: 'policy_change', status: 'approved', priority: 'high', submitted_by: 'tom.davis@demo.com', submitted_at: weekAgo, sample_ticket: null, reference_number: 'REQ-0002', created_at: weekAgo, final_decision: 'approved', final_notes: 'Will update this week.', final_reviewed_at: twoDaysAgo, final_reviewed_by: 'admin@demo.com' },
];

export const DEMO_PROFILE_CHANGE_REQUESTS = [
  { id: 'pcr-1', profile_id: profileId1, agent_email: 'agent@demo.com', agent_name: 'Jane Smith', field_name: 'phone_number', old_value: '+1234567890', new_value: '+1234567999', status: 'pending', reference_number: 'PCR-0001', created_at: yesterday, reviewed_by: null, reviewed_at: null },
];

export const DEMO_AGENT_DIRECTORY = DEMO_PROFILES.map(p => ({
  id: p.id,
  email: p.email,
  agent_name: p.agent_name,
  agent_tag: p.agent_tag,
  support_account: p.support_account,
  support_type: p.support_type?.[0] || null,
  zendesk_instance: p.zendesk_instance,
  break_schedule: p.break_schedule,
  mon_schedule: p.mon_schedule,
  tue_schedule: p.tue_schedule,
  wed_schedule: p.wed_schedule,
  thu_schedule: p.thu_schedule,
  fri_schedule: p.fri_schedule,
  sat_schedule: p.sat_schedule,
  sun_schedule: p.sun_schedule,
  day_off: p.day_off,
  quota: p.quota_email,
  views: p.views || null,
  ticket_assignment_view_id: p.ticket_assignment_view_id || null,
  wd_ticket_assign: null,
  we_ticket_assign: null,
  upwork_contract_id: p.upwork_contract_id || null,
  upwork_contract_type: p.upwork_contract_type || null,
  created_at: p.created_at,
  updated_at: p.updated_at,
}));

export const DEMO_ZENDESK_REALTIME = {
  zd1: {
    newTickets: 12,
    openTickets: { total: 45, byAgent: [{ name: 'Jane S.', count: 8 }, { name: 'Mike J.', count: 12 }, { name: 'Tom D.', count: 15 }, { name: 'Lisa W.', count: 10 }] },
    sla: { breaching: 2, warning: 5 },
    messaging: { active: 8, waiting: 3, avgWaitTime: 45 },
    talk: { available: 3, online: 4, onCall: 1, inWrapUp: 0, away: 1 },
  },
  zd2: {
    newTickets: 6,
    openTickets: { total: 18, byAgent: [{ name: 'Sarah L.', count: 18 }] },
    sla: { breaching: 0, warning: 2 },
    messaging: { active: 4, waiting: 1, avgWaitTime: 30 },
    talk: { available: 0, online: 0, onCall: 0, inWrapUp: 0, away: 0 },
  },
};

export const DEMO_ATTENDANCE_SNAPSHOTS = DEMO_PROFILES
  .filter(p => !p.position?.includes('Team Lead'))
  .map(p => ({
    id: `att-${p.id}`,
    profile_id: p.id,
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    login_time: p.mon_schedule?.split(' - ')[0] || '9:00 AM',
    logout_time: null,
    schedule_start: p.mon_schedule?.split(' - ')[0] || '9:00 AM',
    schedule_end: p.mon_schedule?.split(' - ')[1] || '6:00 PM',
    hours_worked_minutes: 360,
    hours_worked_formatted: '6h 0m',
    break_duration_minutes: 60,
    break_duration_formatted: '1h 0m',
    allowed_break_minutes: 60,
    allowed_break_formatted: '1h 0m',
    break_overage_minutes: 0,
    is_overbreak: false,
    is_early_out: false,
    no_logout: false,
    created_at: now,
  }));

export const DEMO_SAVED_SCORECARDS: any[] = [];
export const DEMO_ZENDESK_AGENT_METRICS: any[] = [];
export const DEMO_NOTIFICATION_SETTINGS = [
  { id: 'ns-1', user_email: 'agent@demo.com', email_notifications: true, push_notifications: false, update_notifications: true, leave_notifications: true, qa_notifications: true },
];

export const DEMO_DEMO_GUIDE_VIEWS: any[] = [];
export const DEMO_UPDATE_CHANGE_HISTORY: any[] = [];
export const DEMO_REMINDER_LOGS: any[] = [];
export const DEMO_TICKET_LOGS: any[] = [];
export const DEMO_TICKET_GAP_DAILY: any[] = [];

export const DEMO_SCHEDULE_ASSIGNMENTS: any[] = [];
export const DEMO_COVERAGE_OVERRIDE_LOGS: any[] = [];
export const DEMO_DELETED_USERS: any[] = [];
export const DEMO_FAILED_EMAILS: any[] = [];
export const DEMO_EVENT_SNAPSHOTS: any[] = [];

// Helper to get data by table name
export function getDemoTableData(table: string): any[] {
  const tableMap: Record<string, any[]> = {
    agent_profiles: DEMO_PROFILES,
    agent_directory: DEMO_AGENT_DIRECTORY,
    user_roles: DEMO_USER_ROLES,
    updates: DEMO_UPDATES,
    acknowledgements: DEMO_ACKNOWLEDGEMENTS,
    update_questions: DEMO_UPDATE_QUESTIONS,
    leave_requests: DEMO_LEAVE_REQUESTS,
    qa_evaluations: DEMO_QA_EVALUATIONS,
    agent_reports: DEMO_AGENT_REPORTS,
    profile_status: DEMO_PROFILE_STATUS,
    profile_events: DEMO_PROFILE_EVENTS,
    revalida_batches: DEMO_REVALIDA_BATCHES,
    revalida_questions: DEMO_REVALIDA_QUESTIONS,
    revalida_attempts: DEMO_REVALIDA_ATTEMPTS,
    coverage_overrides: DEMO_COVERAGE_OVERRIDES,
    coverage_override_logs: DEMO_COVERAGE_OVERRIDE_LOGS,
    notifications: DEMO_NOTIFICATIONS,
    improvements: DEMO_IMPROVEMENTS,
    portal_changelog: DEMO_CHANGELOG,
    article_requests: DEMO_ARTICLE_REQUESTS,
    profile_change_requests: DEMO_PROFILE_CHANGE_REQUESTS,
    attendance_snapshots: DEMO_ATTENDANCE_SNAPSHOTS,
    saved_scorecards: DEMO_SAVED_SCORECARDS,
    zendesk_agent_metrics: DEMO_ZENDESK_AGENT_METRICS,
    notification_settings: DEMO_NOTIFICATION_SETTINGS,
    demo_guide_views: DEMO_DEMO_GUIDE_VIEWS,
    update_change_history: DEMO_UPDATE_CHANGE_HISTORY,
    reminder_logs: DEMO_REMINDER_LOGS,
    ticket_logs: DEMO_TICKET_LOGS,
    ticket_gap_daily: DEMO_TICKET_GAP_DAILY,
    agent_schedule_assignments: DEMO_SCHEDULE_ASSIGNMENTS,
    deleted_users: DEMO_DELETED_USERS,
    failed_emails: DEMO_FAILED_EMAILS,
    event_snapshots: DEMO_EVENT_SNAPSHOTS,
    call_count_daily: [],
    capacity_settings: [],
    directory_dropdown_options: [],
    guide_images: [],
    leave_request_history: [],
    agent_directory_history: [],
    nb_quiz_questions: [],
    nb_quiz_settings: [],
    nb_quiz_submissions: [],
  };
  return tableMap[table] || [];
}

// Helper to get RPC mock responses
export function getDemoRpcData(fnName: string, args?: any): any {
  switch (fnName) {
    case 'get_team_status_data':
      return DEMO_TEAM_STATUS_DATA;
    case 'get_team_status_profiles':
      return DEMO_PROFILES.filter(p => p.employment_status !== 'Terminated').map(p => ({
        id: p.id, email: p.email, full_name: p.full_name, position: p.position, break_schedule: p.break_schedule,
      }));
    case 'get_agent_dashboard_data':
      const profile = DEMO_PROFILES.find(p => p.id === args?.p_profile_id);
      if (!profile) return [];
      const status = DEMO_PROFILE_STATUS.find(s => s.profile_id === profile.id);
      return [{
        profile_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        agent_name: profile.agent_name,
        agent_position: profile.position?.join(', '),
        zendesk_instance: profile.zendesk_instance,
        support_type: profile.support_type?.[0],
        ticket_assignment_view_id: profile.ticket_assignment_view_id || null,
        quota_email: profile.quota_email,
        quota_chat: profile.quota_chat,
        quota_phone: profile.quota_phone,
        quota_ot_email: profile.quota_ot_email,
        mon_schedule: profile.mon_schedule,
        tue_schedule: profile.tue_schedule,
        wed_schedule: profile.wed_schedule,
        thu_schedule: profile.thu_schedule,
        fri_schedule: profile.fri_schedule,
        sat_schedule: profile.sat_schedule,
        sun_schedule: profile.sun_schedule,
        day_off: profile.day_off,
        ot_enabled: profile.ot_enabled,
        current_status: status?.current_status || 'LOGGED_OUT',
        status_since: status?.status_since || now,
        current_status_counter: 5,
        latest_login_time: new Date(Date.now() - 3600000).toISOString(),
        week_start_date: new Date(Date.now() - new Date().getDay() * 86400000).toISOString().split('T')[0],
        week_end_date: new Date(Date.now() + (6 - new Date().getDay()) * 86400000).toISOString().split('T')[0],
        total_tickets_week: 120,
        total_tickets_today: 28,
        avg_response_gap_seconds: 420,
      }];
    case 'get_ticket_dashboard_data':
      return DEMO_TICKET_DASHBOARD_DATA;
    case 'get_weekly_scorecard_data':
      return DEMO_SCORECARD_DATA;
    case 'get_team_outages_today':
      return DEMO_LEAVE_REQUESTS.filter(lr => lr.status === 'approved' || lr.status === 'pending').map(lr => ({
        agent_email: lr.agent_email, outage_reason: lr.outage_reason,
        start_date: lr.start_date, end_date: lr.end_date,
        start_time: lr.start_time, end_time: lr.end_time, status: lr.status,
      }));
    case 'get_profile_id_by_email':
      const found = DEMO_PROFILES.find(p => p.email.toLowerCase() === args?.p_email?.toLowerCase());
      return found?.id || null;
    case 'get_effective_schedule':
    case 'get_effective_schedules_for_week':
      return [];
    case 'is_admin':
      return args?._email === 'admin@demo.com';
    case 'is_super_admin':
      return args?._email === 'admin@demo.com';
    case 'has_role':
      if (args?._email === 'admin@demo.com') return true;
      return args?._role === 'user';
    case 'is_revalida_admin':
      return args?._email === 'admin@demo.com';
    case 'get_super_admin_count':
      return 1;
    case 'insert_reminder_log':
      return 'mock-id';
    default:
      return null;
  }
}

// Helper to get edge function mock responses
export function getDemoFunctionResponse(fnName: string, body?: any): any {
  switch (fnName) {
    case 'check-allowlist':
      const email = body?.email?.toLowerCase();
      const isAllowed = DEMO_USER_ROLES.some(r => r.email === email);
      return { data: { allowed: isAllowed }, error: null };
    case 'send-notifications':
    case 'send-reminders':
    case 'send-announcement':
    case 'send-leave-request-notification':
    case 'send-leave-decision-notification':
    case 'send-question':
    case 'send-question-reply-notification':
    case 'send-qa-notification':
    case 'send-profile-change-notification':
    case 'send-profile-status-notification':
    case 'send-request-notification':
    case 'send-request-stage-notification':
    case 'send-status-change-notification':
    case 'send-status-alert-notification':
    case 'send-override-request-notification':
    case 'send-password-reset-notification':
    case 'send-revalida-notification':
    case 'send-custom-action-notification':
    case 'send-upwork-limit-request':
    case 'send-approval-reminders':
    case 'send-rate-progression-reminders':
    case 'send-failed-emails-digest':
      return { data: { success: true }, error: null };
    case 'fetch-zendesk-realtime':
      return { data: DEMO_ZENDESK_REALTIME, error: null };
    case 'fetch-zendesk-metrics':
    case 'fetch-zendesk-insights':
      return { data: { metrics: [] }, error: null };
    case 'fetch-zendesk-ticket':
      return { data: { ticket: { id: body?.ticketId, subject: 'Demo Ticket', status: 'open' } }, error: null };
    case 'fetch-sla-responsiveness':
      return { data: { data: [] }, error: null };
    case 'fetch-volume-demand':
    case 'fetch-volume-comparison':
      return { data: { data: [] }, error: null };
    case 'fetch-call-counts':
      return { data: { data: [] }, error: null };
    case 'fetch-upwork-time':
      return { data: { hours: 0 }, error: null };
    case 'create-user-with-password':
      return { data: { success: true, user_id: 'mock-new-user' }, error: null };
    case 'delete-user':
    case 'restore-user':
      return { data: { success: true }, error: null };
    case 'change-user-email':
      return { data: { success: true }, error: null };
    case 'format-update':
      return { data: { formatted: body?.body || '' }, error: null };
    case 'find-similar-updates':
      return { data: { similar: [] }, error: null };
    case 'generate-agent-reports':
    case 'generate-eod-analytics':
    case 'generate-weekly-analytics':
      return { data: { reports: [] }, error: null };
    case 'analyze-qa-ticket':
      return { data: { analysis: 'Demo analysis not available.' }, error: null };
    case 'assign-tickets-on-login':
      return { data: { assigned: 0 }, error: null };
    case 'check-user-profile-mismatch':
      return { data: { mismatch: false }, error: null };
    case 'finalize-request-review':
      return { data: { success: true }, error: null };
    case 'check-full-approval':
      return { data: { approved: true }, error: null };
    case 'rehost-image':
      return { data: { url: body?.url || '' }, error: null };
    case 'extract-document-text':
      return { data: { text: 'Demo document text.' }, error: null };
    default:
      return { data: {}, error: null };
  }
}
