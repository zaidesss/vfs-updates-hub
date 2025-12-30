/**
 * Get current datetime in New York EST timezone, formatted for datetime-local input
 */
export function getNewYorkDatetimeLocal(): string {
  const now = new Date();
  
  // Format the date in New York timezone
  const nyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = nyFormatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  
  for (const part of parts) {
    dateParts[part.type] = part.value;
  }
  
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}`;
}

/**
 * Get default deadline (24 hours from now in NY time)
 */
export function getDefaultDeadline(): string {
  const now = new Date();
  // Add 24 hours
  now.setHours(now.getHours() + 24);
  
  const nyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = nyFormatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  
  for (const part of parts) {
    dateParts[part.type] = part.value;
  }
  
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}`;
}
