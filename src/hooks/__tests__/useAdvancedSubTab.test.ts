// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ADVANCED_SUB_TAB, type AdvancedSubTab } from '../../types';
import { useAdvancedSubTab, getSubStorageKey } from '../useAdvancedSubTab';

describe('useAdvancedSubTab', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  });

  afterEach(() => {
    localStorage.clear();
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  });

  it('defaults to the legacy sub tab when advanced and nothing is stored', () => {
    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    expect(result.current.subTab).toBe(DEFAULT_ADVANCED_SUB_TAB);
    expect(DEFAULT_ADVANCED_SUB_TAB).toBe('legacy');
  });

  it('returns the default when activeTab is not advanced', () => {
    const { result } = renderHook(() => useAdvancedSubTab('board', 'alice-id'));

    expect(result.current.subTab).toBe(DEFAULT_ADVANCED_SUB_TAB);
  });

  it('updates the sub tab via setSubTab', () => {
    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    act(() => {
      result.current.setSubTab('activity');
    });

    expect(result.current.subTab).toBe('activity');
  });

  it('persists the sub tab per account when advanced', () => {
    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    act(() => {
      result.current.setSubTab('manual');
    });

    expect(localStorage.getItem(getSubStorageKey('alice-id'))).toContain('"manual"');
  });

  it('does not persist when activeTab is not advanced', () => {
    const { result } = renderHook(() => useAdvancedSubTab('board', 'alice-id'));

    act(() => {
      result.current.setSubTab('manual');
    });

    expect(localStorage.getItem(getSubStorageKey('alice-id'))).toBeNull();
  });

  it('falls back to the default when the stored value is invalid', () => {
    localStorage.setItem(getSubStorageKey('alice-id'), '"unknown-sub"');

    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    expect(result.current.subTab).toBe(DEFAULT_ADVANCED_SUB_TAB);
  });

  it('restores the sub tab from localStorage when advanced', () => {
    localStorage.setItem(getSubStorageKey('alice-id'), '"overview"');

    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    expect(result.current.subTab).toBe('overview');
  });

  it('restores the sub tab from URL ?sub= when advanced', () => {
    window.history.replaceState({}, '', '/?sub=activity');

    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    expect(result.current.subTab).toBe('activity');
  });

  it('restores the sub tab via popstate event when advanced', () => {
    // 初期URLを tab=advanced にしてpopstate時にreadUrlTabがadvancedを返すようにする
    window.history.replaceState({}, '', '/?tab=advanced');
    const { result } = renderHook(() => useAdvancedSubTab('advanced', 'alice-id'));

    act(() => {
      result.current.setSubTab('activity' as AdvancedSubTab);
    });

    expect(result.current.subTab).toBe('activity');

    // ブラウザの戻るでURLが?tab=advanced&sub=legacyに変わった状況をシミュレート
    act(() => {
      window.history.replaceState({}, '', '/?tab=advanced&sub=legacy');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.subTab).toBe('legacy');
  });
});
