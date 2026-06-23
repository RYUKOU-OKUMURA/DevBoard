// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getRepositoryViewKey, useRepositoryView } from '../useRepositoryView';

describe('useRepositoryView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the all view when nothing is stored', () => {
    const { result } = renderHook(() => useRepositoryView('alice-id'));

    expect(result.current.viewMode).toBe('all');
  });

  it('persists the selected view mode per account', () => {
    const { result } = renderHook(() => useRepositoryView('alice-id'));

    act(() => {
      result.current.setViewMode('roadmap');
    });

    expect(result.current.viewMode).toBe('roadmap');
    expect(localStorage.getItem(getRepositoryViewKey('alice-id'))).toContain('"roadmap"');
  });

  it('restores the stored view mode for the same account', () => {
    localStorage.setItem(getRepositoryViewKey('alice-id'), '"kanban"');

    const { result } = renderHook(() => useRepositoryView('alice-id'));

    expect(result.current.viewMode).toBe('kanban');
  });

  it('falls back to all when the stored value is invalid', () => {
    localStorage.setItem(getRepositoryViewKey('alice-id'), '"gantt"');

    const { result } = renderHook(() => useRepositoryView('alice-id'));

    expect(result.current.viewMode).toBe('all');
  });
});
