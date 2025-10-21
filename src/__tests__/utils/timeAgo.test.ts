import { describe, it, expect } from 'vitest';
import { timeAgo, formatDate, toISODate } from '../../utils/timeAgo';

describe('timeAgo', () => {
  it('should display "just now" for very recent dates', () => {
    const now = new Date();
    expect(timeAgo(now.toISOString())).toBe('just now');
  });

  it('should display "just now" for dates within last minute', () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    expect(timeAgo(thirtySecondsAgo.toISOString())).toBe('just now');
  });

  it('should display minutes ago', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinutesAgo.toISOString())).toBe('5m ago');
  });

  it('should display hours ago', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHoursAgo.toISOString())).toBe('3h ago');
  });

  it('should display days ago', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(timeAgo(threeDaysAgo.toISOString())).toBe('3d ago');
  });

  it('should display weeks ago', () => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoWeeksAgo.toISOString())).toBe('2w ago');
  });

  it('should display months ago', () => {
    const now = new Date();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoMonthsAgo.toISOString())).toBe('2mo ago');
  });

  it('should display years ago', () => {
    const now = new Date();
    const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoYearsAgo.toISOString())).toBe('2y ago');
  });

  it('should handle future dates gracefully', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(timeAgo(future.toISOString())).toBe('just now');
  });

  it('should handle edge cases at boundaries', () => {
    const now = new Date();
    
    // Exactly 1 minute
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    expect(timeAgo(oneMinuteAgo.toISOString())).toBe('1m ago');
    
    // Exactly 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(timeAgo(oneHourAgo.toISOString())).toBe('1h ago');
    
    // Exactly 1 day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(timeAgo(oneDayAgo.toISOString())).toBe('1d ago');
  });
});

describe('formatDate', () => {
  it('should format date to locale string', () => {
    const date = '2024-01-15T12:00:00Z';
    const formatted = formatDate(date);
    expect(formatted).toMatch(/Jan.*15.*2024/);
  });

  it('should handle different date formats', () => {
    const date = new Date('2024-06-30T08:30:00Z');
    const formatted = formatDate(date.toISOString());
    expect(formatted).toMatch(/Jun.*30.*2024/);
  });
});

describe('toISODate', () => {
  it('should convert date to ISO string', () => {
    const date = '2024-01-15T12:00:00Z';
    const iso = toISODate(date);
    expect(iso).toBe('2024-01-15T12:00:00.000Z');
  });

  it('should handle date objects', () => {
    const date = new Date('2024-06-30T08:30:00Z');
    const iso = toISODate(date.toISOString());
    expect(iso).toContain('2024-06-30');
  });
});
