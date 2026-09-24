// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_TAB, resolveTabCandidate, useActiveTab } from '../useActiveTab';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('resolveTabCandidate', () => {
  it('defaults to the repository board', () => {
    expect(DEFAULT_TAB).toBe('board');
    expect(resolveTabCandidate('')).toEqual({
      tab: 'board',
      pendingLegacy: null,
    });
  });

  it.each(['board', 'issues', 'practice', 'advanced', 'activity', 'manual'] as const)('keeps current tab value %s', (tab) => {
    expect(resolveTabCandidate(tab)).toEqual({
      tab,
      pendingLegacy: null,
    });
  });

  it('opens the issues tab from the URL', () => {
    window.history.replaceState({}, '', '/?tab=issues');
    localStorage.setItem('activeTab', 'practice');

    const { result } = renderHook(() => useActiveTab());

    expect(result.current.activeTab).toBe('issues');
  });

  it('restores the saved issues tab when there is no tab query', () => {
    localStorage.setItem('activeTab', 'issues');

    const { result } = renderHook(() => useActiveTab());

    expect(result.current.activeTab).toBe('issues');
  });

  it('restores tab changes from browser history', () => {
    window.history.replaceState({}, '', '/?tab=board');
    const { result } = renderHook(() => useActiveTab());

    act(() => result.current.setActiveTab('issues'));
    act(() => {
      window.history.replaceState({}, '', '/?tab=practice');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.activeTab).toBe('practice');
  });

  it.each(['updates', 'todos'] as const)('maps legacy tab value %s to advanced for migration', (legacyTab) => {
    expect(resolveTabCandidate(legacyTab)).toEqual({
      tab: 'advanced',
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
