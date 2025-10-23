/**
 * Shared date/time utilities for consistent calculations across the app.
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Type guard to check valid Date object */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Returns the signed difference in days between two dates (from - to) / MS_PER_DAY.
 * - If clampToZero is true, negative values are clamped to 0 (treat future dates as 0 days).
 * - No rounding is applied by default; caller can round as needed.
 */
export function differenceInDays(from: Date, to: Date, opts?: { clampToZero?: boolean }): number {
  const diffMs = from.getTime() - to.getTime();
  if (!Number.isFinite(diffMs)) return Number.NaN;
  const diffDays = diffMs / MS_PER_DAY;
  if (opts?.clampToZero) {
    return Math.max(0, diffDays);
  }
  return diffDays;
}
