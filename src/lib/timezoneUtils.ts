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

/**
 * Get current EST day key ('mon', 'tue', etc.)
 * Used for schedule-based visibility checks.
 * @param now - Optional Date to use instead of current time (e.g., from PortalClock)
 */
export function getCurrentESTDayKey(now?: Date): string {
  const estDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(now || new Date());
  return estDay.toLowerCase().slice(0, 3);
}

/**
 * Get current EST time as minutes from midnight.
 * Used for checking if current time falls within a schedule window.
 * @param now - Optional Date to use instead of current time (e.g., from PortalClock)
 */
export function getCurrentESTTimeMinutes(now?: Date): number {
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now || new Date());
  
  const hour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(estParts.find(p => p.type === 'minute')?.value || '0', 10);
  return hour * 60 + minute;
}

/**
 * Get today's date in EST as 'YYYY-MM-DD'.
 * @param now - Optional Date to use instead of current time (e.g., from PortalClock)
 */
export function getTodayEST(now?: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now || new Date());
}

/**
 * Parse a time string like "9:00 AM" or "17:30" to minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  
  const cleanTime = timeStr.trim().toUpperCase();
  
  // Handle 12-hour format (e.g., "9:00 AM", "5:30 PM")
  const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }
  
  // Handle 24-hour format (e.g., "17:30")
  const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  
  return null;
}

/**
 * Parse a schedule range like "9:00 AM - 5:30 PM" into start/end minutes.
 * Handles midnight-crossing schedules (e.g., "8:00 PM - 3:30 AM").
 */
export function parseScheduleRange(schedule: string | null): { start: number; end: number } | null {
  if (!schedule || schedule.toLowerCase() === 'day off' || schedule.toLowerCase() === 'off') {
    return null;
  }
  
  const parts = schedule.split('-').map(s => s.trim());
  if (parts.length !== 2) return null;
  
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  
  if (start === null || end === null) return null;
  
  return { start, end };
}

/**
 * Check if a given time (in minutes) falls within a schedule range.
 * Handles midnight-crossing schedules (e.g., 8 PM - 3:30 AM).
 */
export function isTimeInScheduleRange(
  currentMinutes: number, 
  scheduleStart: number, 
  scheduleEnd: number
): boolean {
  if (scheduleStart <= scheduleEnd) {
    // Normal schedule (e.g., 9:00 AM - 5:30 PM)
    return currentMinutes >= scheduleStart && currentMinutes <= scheduleEnd;
  } else {
    // Midnight-crossing schedule (e.g., 8:00 PM - 3:30 AM)
    return currentMinutes >= scheduleStart || currentMinutes <= scheduleEnd;
  }
}
