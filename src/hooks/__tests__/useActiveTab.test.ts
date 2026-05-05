import { describe, expect, it } from 'vitest';
import { DEFAULT_TAB, resolveTabCandidate } from '../useActiveTab';

describe('resolveTabCandidate', () => {
  it('defaults to the repository board', () => {
    expect(DEFAULT_TAB).toBe('board');
    expect(resolveTabCandidate('')).toEqual({
      tab: 'board',
      pendingLegacy: null,
    });
  });

  it.each(['board', 'activity', 'manual'] as const)('keeps current tab value %s', (tab) => {
    expect(resolveTabCandidate(tab)).toEqual({
      tab,
      pendingLegacy: null,
    });
  });

  it.each(['updates', 'todos'] as const)('maps legacy tab value %s to activity for migration', (legacyTab) => {
    expect(resolveTabCandidate(legacyTab)).toEqual({
      tab: 'activity',
      pendingLegacy: legacyTab,
    });
  });

  it.each(['unknown', '"board"', '{not-json'] as const)('falls back safely for invalid value %s', (value) => {
    expect(resolveTabCandidate(value)).toEqual({
      tab: 'board',
      pendingLegacy: null,
    });
  });
});
