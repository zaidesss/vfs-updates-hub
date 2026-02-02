/**
 * Converts a name string to proper case (Title Case)
 * e.g., "BLAKE DUCATI" -> "Blake Ducati", "john doe" -> "John Doe"
 */
export function toProperCase(name: string | null | undefined): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes a name to proper case for storage
 */
export function normalizeNameForStorage(name: string | null | undefined): string {
  if (!name) return '';
  return toProperCase(name.trim());
}
