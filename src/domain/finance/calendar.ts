/**
 * Projection calendar. A projection runs 12 months starting at `launchMonth`
 * (0 = January). Non-leap year — 365 nights.
 */

export const DAYS_IN_MONTH: readonly number[] = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];

export function daysInMonth(calendarMonth: number): number {
  return DAYS_IN_MONTH[((calendarMonth % 12) + 12) % 12] ?? 30;
}

/** Projection month `p` (1..12) → calendar month (0..11). */
export function calendarMonthFor(launchMonth: number, projectionMonth: number): number {
  return (((launchMonth + projectionMonth - 1) % 12) + 12) % 12;
}

/** Nights open to bookings in a month; owner-blocked nights reduce this (≥ 0). */
export function availableNights(calendarMonth: number, blockedNights: number): number {
  return Math.max(0, daysInMonth(calendarMonth) - blockedNights);
}
