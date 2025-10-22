export type TimeAgoOptions = {
  now?: Date;
};

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 60 * SECONDS_IN_MINUTE;
const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
const SECONDS_IN_MONTH = 30 * SECONDS_IN_DAY;
const SECONDS_IN_YEAR = 365 * SECONDS_IN_DAY;

function getReferenceDate(now?: Date): Date {
  if (now instanceof Date && !Number.isNaN(now.getTime())) {
    return now;
  }
  return new Date();
}

function formatQuantity(value: number, suffix: string): string {
  const rounded = Math.floor(value);
  if (rounded <= 0) {
    return "just now";
  }
  return `${rounded}${suffix} ago`;
}

/**
 * ISO 8601 文字列を相対時間表記に変換する。
 */
export function timeAgo(value: string, options: TimeAgoOptions = {}): string {
  const reference = getReferenceDate(options.now);
  const target = new Date(value);

  if (Number.isNaN(target.getTime())) {
    return "Invalid date";
  }

  const diffSeconds = (reference.getTime() - target.getTime()) / 1000;

  if (!Number.isFinite(diffSeconds)) {
    return "Invalid date";
  }

  if (diffSeconds <= 0) {
    return "just now";
  }

  if (diffSeconds < SECONDS_IN_MINUTE) {
    return "just now";
  }

  if (diffSeconds < SECONDS_IN_HOUR) {
    return formatQuantity(diffSeconds / SECONDS_IN_MINUTE, "m");
  }

  if (diffSeconds < SECONDS_IN_DAY) {
    return formatQuantity(diffSeconds / SECONDS_IN_HOUR, "h");
  }

  if (diffSeconds < SECONDS_IN_MONTH) {
    return formatQuantity(diffSeconds / SECONDS_IN_DAY, "d");
  }

  if (diffSeconds < SECONDS_IN_YEAR) {
    return formatQuantity(diffSeconds / SECONDS_IN_MONTH, "mo");
  }

  return formatQuantity(diffSeconds / SECONDS_IN_YEAR, "y");
}
