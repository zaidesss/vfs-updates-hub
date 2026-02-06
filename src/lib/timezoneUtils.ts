/**
 * EST Timezone Utilities
 * 
 * All date/time logic in this portal operates in EST (Eastern Standard Time).
 * EST is UTC-5 (ignoring DST for simplicity in business logic).
 */

/**
 * Get EST day boundaries in UTC format for database queries.
 * 
 * Midnight EST = 5:00 AM UTC same day
 * 11:59:59 PM EST = 4:59:59 AM UTC next day
 * 
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Object with start and end timestamps in ISO format
 */
export function getESTDayBoundaries(dateStr: string): { start: string; end: string } {
  // Midnight EST = 5:00 AM UTC same day
  const startOfDayEST = `${dateStr}T05:00:00.000Z`;
  
  // 11:59:59 PM EST = 4:59:59 AM UTC next day
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  const nextDayStr = date.toISOString().split('T')[0];
  const endOfDayEST = `${nextDayStr}T04:59:59.999Z`;
  
  return { start: startOfDayEST, end: endOfDayEST };
}

/**
 * Get EST week boundaries in UTC format for database queries.
 * Week starts on Monday.
 * 
 * @param weekStartStr - Week start date string in 'YYYY-MM-DD' format (should be a Monday)
 * @param weekEndStr - Week end date string in 'YYYY-MM-DD' format (should be a Sunday)
 * @returns Object with start and end timestamps in ISO format
 */
export function getESTWeekBoundaries(weekStartStr: string, weekEndStr: string): { start: string; end: string } {
  // Week start: Monday at midnight EST = Monday 5:00 AM UTC
  const startOfWeekEST = `${weekStartStr}T05:00:00.000Z`;
  
  // Week end: Sunday at 11:59:59 PM EST = Monday 4:59:59 AM UTC
  const [year, month, day] = weekEndStr.split('-').map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day));
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const nextDayStr = endDate.toISOString().split('T')[0];
  const endOfWeekEST = `${nextDayStr}T04:59:59.999Z`;
  
  return { start: startOfWeekEST, end: endOfWeekEST };
}

/**
 * Parse a date string safely without timezone shift.
 * Use this for local date display to avoid off-by-one day issues.
 * 
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Date object set to midnight local time
 */
export function parseDateStringLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the auto-logout timestamp for a given date.
 * Auto-logout should occur at 11:59:59 PM EST of the target date.
 * 
 * 11:59:59 PM EST = 4:59:59 AM UTC the next day
 * 
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Date object representing 11:59:59 PM EST
 */
export function getAutoLogoutTimestamp(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  // Set to 4:59:59 AM UTC = 11:59:59 PM EST previous day
  date.setUTCHours(4, 59, 59, 0);
  return date;
}

/**
 * Convert a UTC timestamp to EST date string ('YYYY-MM-DD').
 * Useful for grouping events by EST day.
 * 
 * @param utcTimestamp - ISO timestamp string
 * @returns Date string in 'YYYY-MM-DD' format in EST
 */
export function getESTDateFromTimestamp(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  // Format in EST timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Check if a UTC timestamp falls within an EST day.
 * 
 * @param utcTimestamp - ISO timestamp string
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns true if timestamp is within the EST day
 */
export function isTimestampInESTDay(utcTimestamp: string, dateStr: string): boolean {
  const { start, end } = getESTDayBoundaries(dateStr);
  const timestamp = new Date(utcTimestamp).getTime();
  return timestamp >= new Date(start).getTime() && timestamp <= new Date(end).getTime();
}

/**
 * Generate all dates in a week (Mon-Sun) for display purposes.
 * 
 * @param weekStartDate - Monday of the week as a Date object
 * @returns Array of 7 date strings in 'YYYY-MM-DD' format
 */
export function generateWeekDates(weekStartDate: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}
