/**
 * Shared utility to resolve a position array to a category string.
 * Used by scorecard, coverage board, team status, master directory, and dashboard.
 *
 * Examples:
 *   ["Email", "Chat", "Phone"] → "Hybrid"
 *   ["Email", "Chat"]          → "Email + Chat"
 *   ["Email", "Phone"]         → "Email + Phone"
 *   ["Email"]                  → "Email"
 *   ["Chat"]                   → "Chat"
 *   ["Phone"]                  → "Phone"
 *   ["Logistics"]              → "Logistics"
 *   ["Team Lead"]              → "Team Lead"
 *   ["Technical"]              → "Technical"
 */
export function resolvePositionCategory(positionArray: string[] | string | null): string {
  const arr = Array.isArray(positionArray) ? positionArray : positionArray ? [positionArray] : [];
  if (arr.length === 0) return 'Email';

  const has = (r: string) => arr.includes(r);

  if (has('Email') && has('Chat') && has('Phone')) return 'Hybrid';
  if (has('Email') && has('Chat')) return 'Chat';
  if (has('Email') && has('Phone')) return 'Hybrid';
  if (has('Email')) return 'Chat';
  if (has('Chat')) return 'Chat';
  if (has('Phone')) return 'Hybrid';
  if (has('Logistics')) return 'Logistics';
  if (has('Team Lead')) return 'Team Lead';
  if (has('Technical')) return 'Technical';

  return 'Chat';
}
