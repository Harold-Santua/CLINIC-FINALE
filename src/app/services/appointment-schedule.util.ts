import { APPOINTMENT_BLOCK_MINUTES, appointmentBlocksSchedule } from '../interfaces/appointment';

/** Parse "HH:mm" or "HH:mm:ss" to minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const parts = time.trim().split(':');
  const hour = Number(parts[0] ?? 0);
  const minute = Number(parts[1] ?? 0);
  return hour * 60 + minute;
}

/** Format minutes since midnight as "HH:mm". */
export function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** End of the 1-hour block for a slot start time. */
export function blockEndTime(appointmentTime: string): string {
  return formatMinutesToTime(parseTimeToMinutes(appointmentTime) + APPOINTMENT_BLOCK_MINUTES);
}

/** True when two 1-hour blocks overlap. */
export function blocksOverlap(startA: string, startB: string): boolean {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = aStart + APPOINTMENT_BLOCK_MINUTES;
  const bStart = parseTimeToMinutes(startB);
  const bEnd = bStart + APPOINTMENT_BLOCK_MINUTES;
  return aStart < bEnd && bStart < aEnd;
}

/** Slot documents block booking when status still occupies the calendar. */
export function slotBlocksActiveAppointment(status: string | undefined): boolean {
  if (!status) {
    return true;
  }
  return appointmentBlocksSchedule(status);
}
