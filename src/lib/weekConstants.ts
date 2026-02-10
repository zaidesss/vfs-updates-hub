import { startOfWeek, addWeeks } from 'date-fns';

/** The year the portal was created. Used as the floor for year selectors. */
export const PORTAL_START_YEAR = 2026;

/**
 * Shared anchor date for all week selectors across the portal.
 * All weeks are integer multiples of 7 days from this date,
 * guaranteeing uniform week boundaries everywhere.
 */
export const ANCHOR_DATE = startOfWeek(new Date(2026, 1, 2), { weekStartsOn: 1 });

/**
 * Get the start of "last week" relative to the given date.
 * Used as the portal-wide default selected week.
 */
export function getLastWeekStart(now: Date): Date {
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  return addWeeks(currentWeekStart, -1);
}
