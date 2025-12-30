import { Agent, Update, Acknowledgement } from '@/types';

// Generic demo agents - DO NOT use real user data
export const mockAgents: Agent[] = [
  { name: 'Demo Agent 1', email: 'agent1@example.com', client_name: 'Client A', active: true },
  { name: 'Demo Agent 2', email: 'agent2@example.com', client_name: 'Client A', active: true },
  { name: 'Demo Agent 3', email: 'agent3@example.com', client_name: 'Client B', active: true },
  { name: 'Demo Agent 4', email: 'agent4@example.com', client_name: 'Client B', active: true },
  { name: 'Demo Agent 5', email: 'agent5@example.com', client_name: 'Client C', active: true },
  { name: 'Demo Admin', email: 'admin@example.com', client_name: 'Internal', active: true },
];

// Mock updates with generic demo data
export const mockUpdates: Update[] = [
  {
    id: '1',
    title: 'Weekly Assessment - Week 51',
    summary: 'Weekly assessment for the current period',
    body: `## Weekly Assessment

Please complete the assessment form for this week.

### Instructions:
1. Open the form link below
2. Complete all required fields
3. Submit before the deadline

**DEADLINE: End of week**`,
    help_center_url: 'https://docs.google.com/forms/example',
    posted_by: 'Admin',
    posted_at: '2024-12-20T01:23:00Z',
    deadline_at: '2024-12-21T20:00:00Z',
    status: 'published',
  },
  {
    id: '2',
    title: 'New Product Guidelines',
    summary: 'New article created for product handling procedures',
    body: `## Product Guidelines

A new Help Center article has been created to guide you through:

- Shipment procedures
- Replacement requests
- Escalation protocols

Please review the article thoroughly and acknowledge once complete.`,
    help_center_url: 'https://docs.google.com/document/example',
    posted_by: 'Admin',
    posted_at: '2024-12-22T01:01:00Z',
    deadline_at: null,
    status: 'published',
  },
];

// Mock acknowledgements with generic demo data
export const mockAcknowledgements: Acknowledgement[] = [
  { update_id: '1', agent_email: 'agent1@example.com', acknowledged_at: '2024-12-20T14:30:00Z' },
  { update_id: '1', agent_email: 'agent2@example.com', acknowledged_at: '2024-12-20T15:00:00Z' },
];

// Admin emails - use database for production
export const adminEmails = ['admin@example.com'];
