export type TimeAgoOptions = {
  now?: Date;
  locale?: 'en' | 'ja';
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

function formatQuantity(value: number, suffix: string, locale: 'en' | 'ja' = 'en'): string {
  const rounded = Math.floor(value);
  if (rounded <= 0) {
    return locale === 'ja' ? 'たった今' : 'just now';
  }
  if (locale === 'ja') {
    return `${rounded}${suffix}前`;
  }
  return `${rounded}${suffix} ago`;
}

/**
 * ISO 8601 文字列を相対時間表記に変換する。
 */
export function timeAgo(value: string, options: TimeAgoOptions = {}): string {
  const reference = getReferenceDate(options.now);
  const target = new Date(value);
  const locale = options.locale || 'en';

  if (Number.isNaN(target.getTime())) {
    return locale === 'ja' ? '無効な日付' : 'Invalid date';
  }

  const diffSeconds = (reference.getTime() - target.getTime()) / 1000;

  if (!Number.isFinite(diffSeconds)) {
    return locale === 'ja' ? '無効な日付' : 'Invalid date';
  }

  if (diffSeconds <= 0) {
    return locale === 'ja' ? 'たった今' : 'just now';
  }

  if (diffSeconds < SECONDS_IN_MINUTE) {
    return locale === 'ja' ? 'たった今' : 'just now';
  }

  if (diffSeconds < SECONDS_IN_HOUR) {
    return formatQuantity(diffSeconds / SECONDS_IN_MINUTE, locale === 'ja' ? '分' : 'm', locale);
  }

  if (diffSeconds < SECONDS_IN_DAY) {
    return formatQuantity(diffSeconds / SECONDS_IN_HOUR, locale === 'ja' ? '時間' : 'h', locale);
  }

  if (diffSeconds < SECONDS_IN_MONTH) {
    return formatQuantity(diffSeconds / SECONDS_IN_DAY, locale === 'ja' ? '日前' : 'd', locale);
  }

  if (diffSeconds < SECONDS_IN_YEAR) {
    return formatQuantity(diffSeconds / SECONDS_IN_MONTH, locale === 'ja' ? 'ヶ月' : 'mo', locale);
  }

  return formatQuantity(diffSeconds / SECONDS_IN_YEAR, locale === 'ja' ? '年前' : 'y', locale);
}
