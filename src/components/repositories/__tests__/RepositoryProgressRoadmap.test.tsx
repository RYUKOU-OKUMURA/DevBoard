// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Repo, RepoUserMeta } from '../../../types';
import { RepositoryProgressRoadmap } from '../RepositoryProgressRoadmap';

function createRepo(id: string): Repo {
  return {
    id,
    nameWithOwner: `alice/${id}`,
    htmlUrl: `https://github.com/alice/${id}`,
    pushedAt: '2025-01-01T00:00:00.000Z',
    isArchived: false,
    isPrivate: false,
    topics: [],
  };
}

function createMeta(repoId: string, overrides: Partial<RepoUserMeta> = {}): RepoUserMeta {
  return {
    repoId,
    tracked: true,
    status: 'in_progress',
    stage: 'implementation',
    scheduleBucket: 'this_week',
    purpose: '',
    nextAction: 'ロードマップ行を実装する',
    note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RepositoryProgressRoadmap', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the schedule bucket headers in order', () => {
    render(
      <RepositoryProgressRoadmap
        repos={[createRepo('active')]}
        getMeta={() => createMeta('active')}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
      />
    );

    expect(screen.getByText('プロジェクト')).toBeTruthy();
    expect(screen.getByText('今週')).toBeTruthy();
    expect(screen.getByText('来週')).toBeTruthy();
    expect(screen.getByText('今月中')).toBeTruthy();
    expect(screen.getByText('来月')).toBeTruthy();
    expect(screen.getByText('それ以降')).toBeTruthy();
    expect(screen.getByText('未定')).toBeTruthy();
  });

  it('shows tracked repositories and places a single bar in their bucket', () => {
    render(
      <RepositoryProgressRoadmap
        repos={[createRepo('this-week')]}
        getMeta={() => createMeta('this-week', { scheduleBucket: 'this_week' })}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
      />
    );

    expect(screen.getByText('this-week')).toBeTruthy();
    // Only the matching bucket renders the bar, so exactly one bar button per repo.
    const barButtons = screen.getAllByRole('button', { name: 'alice/this-week の詳細を開く' });
    expect(barButtons).toHaveLength(1);
    expect(within(barButtons[0]!).getByText('実装')).toBeTruthy();
  });

  it('shows unscheduled tracked repositories under 未定', () => {
    render(
      <RepositoryProgressRoadmap
        repos={[createRepo('unplanned')]}
        getMeta={() => createMeta('unplanned', { scheduleBucket: 'unscheduled' })}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
      />
    );

    expect(screen.getAllByRole('button', { name: 'alice/unplanned の詳細を開く' })).toHaveLength(1);
  });

  it('omits untracked repositories', () => {
    render(
      <RepositoryProgressRoadmap
        repos={[createRepo('ignored')]}
        getMeta={() => null}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
        onShowAll={() => undefined}
      />
    );

    expect(screen.getByText('まだ進捗管理対象がありません')).toBeTruthy();
    expect(screen.queryByText('ignored')).toBeNull();
  });

  it('opens the detail panel when a bar is clicked', () => {
    const repo = createRepo('active');
    const onOpenDetail = vi.fn();
    render(
      <RepositoryProgressRoadmap
        repos={[repo]}
        getMeta={() => createMeta('active')}
        getAutoHealth={() => 'Active'}
        onOpenDetail={onOpenDetail}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'alice/active の詳細を開く' }));

    expect(onOpenDetail).toHaveBeenCalledWith(repo);
  });
});
