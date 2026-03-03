// Pre-approvers (4 people) - first stage of approval
export const PRE_APPROVERS = [
  { email: 'jaeransanchez@gmail.com', name: 'Jaeran' },
  { email: 'dzaydee06@gmail.com', name: 'Juno' },
  { email: 'joanargao@gmail.com', name: 'Kristin' },
  { email: 'mjesguerraiman@gmail.com', name: 'Meryl' },
];

// All approvers for reference (no more dedicated final approver)
export const ALL_APPROVERS = [...PRE_APPROVERS];

export const PRE_APPROVER_EMAILS = PRE_APPROVERS.map(a => a.email);

export const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

export function getApproverName(email: string): string {
  const approver = ALL_APPROVERS.find(a => a.email.toLowerCase() === email.toLowerCase());
  return approver?.name || email;
}

export function isPreApprover(email: string): boolean {
  return PRE_APPROVER_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
}

// Final review is now done by any Super Admin, Admin, or HR — no dedicated person
export function isFinalApprover(_email: string): boolean {
  return false;
}

export function isAnyApprover(email: string): boolean {
  return isPreApprover(email);
}

// Legacy exports for backward compatibility
export const REQUIRED_APPROVERS = PRE_APPROVERS;
export const REQUIRED_APPROVER_EMAILS = PRE_APPROVER_EMAILS;
export function isRequiredApprover(email: string): boolean {
  return isPreApprover(email);
}
