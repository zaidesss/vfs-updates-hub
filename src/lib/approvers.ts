// Pre-approvers (4 people) - first stage of approval
export const PRE_APPROVERS = [
  { email: 'jaeransanchez@gmail.com', name: 'Jaeran' },
  { email: 'dzaydee06@gmail.com', name: 'Juno' },
  { email: 'joanargao@gmail.com', name: 'Kristin' },
  { email: 'mjesguerraiman@gmail.com', name: 'Meryl' },
];

// Final approver (Patrick) - second stage, reviews after all pre-approvers approve
export const FINAL_APPROVER = { email: 'patrickargao@gmail.com', name: 'Patrick' };

// All approvers for reference
export const ALL_APPROVERS = [...PRE_APPROVERS, FINAL_APPROVER];

export const PRE_APPROVER_EMAILS = PRE_APPROVERS.map(a => a.email);
export const FINAL_APPROVER_EMAIL = FINAL_APPROVER.email;

export const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

export function getApproverName(email: string): string {
  const approver = ALL_APPROVERS.find(a => a.email.toLowerCase() === email.toLowerCase());
  return approver?.name || email;
}

export function isPreApprover(email: string): boolean {
  return PRE_APPROVER_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
}

export function isFinalApprover(email: string): boolean {
  return FINAL_APPROVER_EMAIL.toLowerCase() === email.toLowerCase();
}

export function isAnyApprover(email: string): boolean {
  return isPreApprover(email) || isFinalApprover(email);
}

// Legacy exports for backward compatibility
export const REQUIRED_APPROVERS = PRE_APPROVERS;
export const REQUIRED_APPROVER_EMAILS = PRE_APPROVER_EMAILS;
export function isRequiredApprover(email: string): boolean {
  return isPreApprover(email);
}
