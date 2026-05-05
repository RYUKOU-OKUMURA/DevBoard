// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRepositoryMetas } from '../../storage/repositoryMetaStorage';
import { useRepositoryMeta } from '../useRepositoryMeta';

describe('useRepositoryMeta', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists metadata updates for the active account', () => {
    const { result } = renderHook(() => useRepositoryMeta('alice-id'));

    act(() => {
      result.current.updateMeta('repo-1', {
        status: 'in_progress',
        purpose: '公開前に整理する',
        nextAction: 'READMEを書く',
        note: 'まずは小さく進める',
      });
    });

    expect(result.current.saveError).toBeNull();
    expect(result.current.getMeta('repo-1')?.nextAction).toBe('READMEを書く');
    expect(getRepositoryMetas('alice-id')[0]?.purpose).toBe('公開前に整理する');
  });

  it('does not commit optimistic state when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useRepositoryMeta('alice-id'));

    act(() => {
      result.current.updateMeta('repo-1', { nextAction: '保存できない入力' });
    });

    expect(result.current.saveError).toContain('保存できませんでした');
    expect(result.current.getMeta('repo-1')).toBeNull();
  });
});
