import { Agent, Update, Acknowledgement } from '@/types';

// Mock agents based on the provided roster
export const mockAgents: Agent[] = [
  { name: 'Adelyn Torralba', email: 'taosfoodservices@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Biah Mae Divinagracia', email: 'vivarezbia@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Charles Josef Invidiado', email: 'c.invidiado27@gmail.com', client_name: 'ReachOut', active: true },
  { name: 'Desiree Cataytay', email: 'descataytay.26@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Divine Grace Obrera', email: 'divinabonjeobera@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Elaine Centeno', email: 'elaineumalicenteno@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Ellen Eugenio', email: 'hannhash1607@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Erika Rhea Santiago', email: 'erikarheasantiago123@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Grejah Daquipil', email: 'grejdaquipil@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Jaeran Sanchez', email: 'jaeransanchez@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Jane Evangelista', email: 'jane.evangelista040113@gmail.com', client_name: 'Tyler Gehrs', active: true },
  { name: 'Jannah Bugayong', email: 'jannahdelacruz21@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Jazmin Ochoa', email: 'ochoajazmincjay@gmail.com', client_name: 'Eazey', active: true },
  { name: 'Jennifer Katigbak', email: 'missjenn.organizedme@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Jesse Argao', email: 'jessieargao.24@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Meryl Jean Iman', email: 'mjesguerraiman@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Nikki Ignacio', email: 'ignacionikki7@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Noelle Patrick dela Cruz', email: 'khrysothemismarketing@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Patrick Argao', email: 'patrickargao@gmail.com', client_name: 'PersistBrands', active: true },
  { name: 'Pauline Desabilla', email: 'paulinecarbajosa0713@gmail.com', client_name: 'PersistBrands', active: true },
  // Admin user for demo
  { name: 'Admin User', email: 'admin@vfs.com', client_name: 'VFS', active: true },
];

// Mock updates based on the screenshot
export const mockUpdates: Update[] = [
  {
    id: '1',
    title: 'Revalida - Dec 15-21',
    summary: 'Weekly revalida assessment for December 15-21',
    body: `## Revalida Assessment

Please complete the revalida form for the period December 15-21.

### Instructions:
1. Open the Google Form link below
2. Complete all required fields
3. Submit before the deadline

**DEADLINE: December 21, 8PM EST**`,
    help_center_url: 'https://docs.google.com/forms/d/e/1FAIpQLSf0z_NuQ-Y5P5zlUjnHtCz2xJaDBH0XHUfVWpBSQcLhNw1yw/viewform?usp=header',
    posted_by: 'Meryl',
    posted_at: '2024-12-20T01:23:00Z',
    deadline_at: '2024-12-21T20:00:00Z',
    status: 'published',
  },
  {
    id: '2',
    title: 'Shipment, Replacement and Escalation - Holy Grail Tummy Control Bootcut Jeans',
    summary: 'New article created for Holy Grail Tummy Control Bootcut Jeans handling procedures',
    body: `## Holy Grail Tummy Control Bootcut Jeans

A new Help Center article has been created to guide you through:

- Shipment procedures
- Replacement requests
- Escalation protocols

Please review the article thoroughly and acknowledge once complete.`,
    help_center_url: 'https://customerserviceadvocates.zendesk.com/hc/en-us/articles/5358754476777-Holy-Grail-Tummy-Control-Bootcut-Jeans',
    posted_by: 'Johann',
    posted_at: '2024-12-22T01:01:00Z',
    deadline_at: null,
    status: 'published',
  },
  {
    id: '3',
    title: 'Revalida - Dec 22-28',
    summary: 'Weekly revalida assessment for December 22-28',
    body: `## Revalida Assessment

Please complete the revalida form for the period December 22-28.

### Instructions:
1. Open the Google Form link below
2. Complete all required fields
3. Submit before the deadline

**DEADLINE: December 28, 8PM EST**`,
    help_center_url: 'https://docs.google.com/forms/d/e/1FAIpQLSflfP895p2dta35Hun-NR8aHR3hD5ramQwfldHdynQ-kg8xWAA/viewform?usp=dialog',
    posted_by: 'Meryl',
    posted_at: '2024-12-26T09:14:00Z',
    deadline_at: '2024-12-28T20:00:00Z',
    status: 'published',
  },
  {
    id: '4',
    title: 'Family Tonality Playbook',
    summary: 'New playbook for family-oriented communication and tonality',
    body: `## Family Tonality Playbook

A comprehensive guide has been created to help you communicate effectively with customers in a warm, family-oriented manner.

### Key Topics:
- Understanding family dynamics
- Empathetic communication
- Problem resolution with care
- Building long-term relationships

Please review the full article in the Help Center.`,
    help_center_url: 'https://customerserviceadvocates.zendesk.com/hc/en-us/articles/53796121795893-Family-Tonality-Playbook',
    posted_by: 'Patrick',
    posted_at: '2024-12-27T10:00:00Z',
    deadline_at: null,
    status: 'published',
  },
];

// Mock acknowledgements
export const mockAcknowledgements: Acknowledgement[] = [
  { update_id: '1', agent_email: 'vivarezbia@gmail.com', acknowledged_at: '2024-12-20T14:30:00Z' },
  { update_id: '1', agent_email: 'paulinecarbajosa0713@gmail.com', acknowledged_at: '2024-12-20T15:00:00Z' },
  { update_id: '1', agent_email: 'jaeransanchez@gmail.com', acknowledged_at: '2024-12-20T16:00:00Z' },
  { update_id: '3', agent_email: 'vivarezbia@gmail.com', acknowledged_at: '2024-12-26T10:00:00Z' },
  { update_id: '3', agent_email: 'paulinecarbajosa0713@gmail.com', acknowledged_at: '2024-12-26T11:00:00Z' },
];

// Admin emails
export const adminEmails = ['admin@vfs.com', 'patrickargao@gmail.com', 'mjesguerraiman@gmail.com'];
