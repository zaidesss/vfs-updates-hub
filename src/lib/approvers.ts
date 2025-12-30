// Required approvers for article requests
export const REQUIRED_APPROVERS = [
  { email: 'jaeransanchez@gmail.com', name: 'Jaeran' },
  { email: 'dzaydee06@gmail.com', name: 'Juno' },
  { email: 'joanargao@gmail.com', name: 'Kristin' },
  { email: 'mjesguerraiman@gmail.com', name: 'Meryl' },
  { email: 'patrickargao@gmail.com', name: 'Patrick' },
];

export const REQUIRED_APPROVER_EMAILS = REQUIRED_APPROVERS.map(a => a.email);

export const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

export function getApproverName(email: string): string {
  const approver = REQUIRED_APPROVERS.find(a => a.email.toLowerCase() === email.toLowerCase());
  return approver?.name || email;
}

export function isRequiredApprover(email: string): boolean {
  return REQUIRED_APPROVER_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
}
