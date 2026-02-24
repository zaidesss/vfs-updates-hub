/**
 * Calculate elapsed time between two timestamps counting ONLY business hours.
 * Business hours: 9:00-14:00 EST (America/New_York), Monday-Friday.
 */

const BH_START_HOUR = 9;
const BH_START_MIN = 0;
const BH_END_HOUR = 14;
const BH_END_MIN = 0;
const BH_MINUTES_PER_DAY = (BH_END_HOUR * 60 + BH_END_MIN) - (BH_START_HOUR * 60 + BH_START_MIN);

function toEST(date: Date): { dayOfWeek: number; minuteOfDay: number; dateMs: number } {
  const estStr = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estDate = new Date(estStr);
  return {
    dayOfWeek: estDate.getDay(),
    minuteOfDay: estDate.getHours() * 60 + estDate.getMinutes(),
    dateMs: estDate.getTime(),
  };
}

function isWorkday(dayOfWeek: number): boolean {
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

const BH_START = BH_START_HOUR * 60 + BH_START_MIN;
const BH_END = BH_END_HOUR * 60 + BH_END_MIN;

function clampToBH(minuteOfDay: number): number {
  if (minuteOfDay <= BH_START) return BH_START;
  if (minuteOfDay >= BH_END) return BH_END;
  return minuteOfDay;
}

export function calcBusinessHours(startISO: string, endISO: string): number {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  if (endDate <= startDate) return 0;

  const start = toEST(startDate);
  const end = toEST(endDate);

  const startDayStart = new Date(start.dateMs);
  startDayStart.setHours(0, 0, 0, 0);
  const endDayStart = new Date(end.dateMs);
  endDayStart.setHours(0, 0, 0, 0);

  const daysDiff = Math.round((endDayStart.getTime() - startDayStart.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    if (!isWorkday(start.dayOfWeek)) return 0;
    const from = clampToBH(start.minuteOfDay);
    const to = clampToBH(end.minuteOfDay);
    return Math.max(0, to - from) / 60;
  }

  let totalMinutes = 0;

  if (isWorkday(start.dayOfWeek)) {
    const from = clampToBH(start.minuteOfDay);
    totalMinutes += Math.max(0, BH_END - from);
  }

  for (let i = 1; i < daysDiff; i++) {
    const currentDay = new Date(startDayStart.getTime() + i * 24 * 60 * 60 * 1000);
    if (isWorkday(currentDay.getDay())) {
      totalMinutes += BH_MINUTES_PER_DAY;
    }
  }

  if (isWorkday(end.dayOfWeek)) {
    const to = clampToBH(end.minuteOfDay);
    totalMinutes += Math.max(0, to - BH_START);
  }

  return totalMinutes / 60;
}