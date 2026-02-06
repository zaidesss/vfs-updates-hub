import { AgentProfileInput } from './agentProfileApi';

// Schedule format validation regex: "8:00 AM-5:00 PM" or "8:00AM-5:00PM"
const SCHEDULE_REGEX = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

// Day constants for working day calculations
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];

export function parseScheduleHours(schedule: string | null | undefined): number {
  if (!schedule || schedule.trim() === '') return 0;
  
  const match = schedule.trim().match(SCHEDULE_REGEX);
  if (!match) return 0;
  
  const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match;
  
  // Convert to 24-hour format
  let start24 = parseInt(startHour);
  if (startPeriod.toUpperCase() === 'PM' && start24 !== 12) start24 += 12;
  if (startPeriod.toUpperCase() === 'AM' && start24 === 12) start24 = 0;
  
  let end24 = parseInt(endHour);
  if (endPeriod.toUpperCase() === 'PM' && end24 !== 12) end24 += 12;
  if (endPeriod.toUpperCase() === 'AM' && end24 === 12) end24 = 0;
  
  const startMinutes = start24 * 60 + parseInt(startMin);
  const endMinutes = end24 * 60 + parseInt(endMin);
  
  // Handle overnight shifts
  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60;
  
  return diff / 60;
}

/**
 * Calculate total weekly hours for an agent profile.
 * Uses the same logic as Master Directory calculation.
 * Formula: (Weekday + Weekend + OT) - Unpaid Break + Revalida (0.5h) + Meeting (0.5h)
 */
export function calculateProfileTotalHours(profile: Partial<AgentProfileInput>): {
  weekdayTotalHours: number;
  weekendTotalHours: number;
  otTotalHours: number;
  unpaidBreakHours: number;
  overallTotalHours: number;
} {
  const dayOff = profile.day_off || [];
  
  // Count working days (exclude days off)
  const workingWeekdays = WEEKDAYS.filter(day => !dayOff.includes(day)).length;
  const workingWeekendDays = WEEKENDS.filter(day => !dayOff.includes(day)).length;
  
  // Get weekday schedule from Monday (representative)
  const dailyWeekdayHours = parseScheduleHours(profile.mon_schedule);
  // Get weekend schedule from Saturday (representative)
  const dailyWeekendHours = parseScheduleHours(profile.sat_schedule);
  
  // Calculate OT hours from per-day OT schedules
  const otSchedules = [
    profile.mon_ot_schedule,
    profile.tue_ot_schedule,
    profile.wed_ot_schedule,
    profile.thu_ot_schedule,
    profile.fri_ot_schedule,
    profile.sat_ot_schedule,
    profile.sun_ot_schedule,
  ];
  
  let otTotalHours = 0;
  if (profile.ot_enabled) {
    otSchedules.forEach((schedule) => {
      if (schedule) {
        otTotalHours += parseScheduleHours(schedule);
      }
    });
  }
  
  // Calculate weekly totals
  const weekdayTotalHours = workingWeekdays * dailyWeekdayHours;
  const weekendTotalHours = workingWeekendDays * dailyWeekendHours;
  
  // Check if break schedule has a value - only apply break deductions if it does
  const hasBreakSchedule = profile.break_schedule && profile.break_schedule.trim() !== '';
  
  let unpaidBreakHours = 0;
  if (hasBreakSchedule) {
    // Parse actual break duration from break schedule
    const breakDurationPerDay = parseScheduleHours(profile.break_schedule);
    // Deduct breaks for ALL scheduled working days (weekdays + weekends)
    const totalWorkingDays = workingWeekdays + workingWeekendDays;
    unpaidBreakHours = totalWorkingDays * breakDurationPerDay;
  }
  
  // Fixed weekly additions (paid activities)
  const revalidaHours = 0.5;  // 30 mins weekly
  const weeklyMeetingHours = 0.5;  // 30 mins weekly
  
  // Formula: (Weekday + Weekend + OT) - Unpaid Break + Revalida + Meeting
  const overallTotalHours = weekdayTotalHours + weekendTotalHours + otTotalHours - unpaidBreakHours + revalidaHours + weeklyMeetingHours;
  
  return {
    weekdayTotalHours,
    weekendTotalHours,
    otTotalHours,
    unpaidBreakHours,
    overallTotalHours,
  };
}
