// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Repo, RepoUserMeta } from '../../../types';
import { RepositoryProgressKanban } from '../RepositoryProgressKanban';

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
    nextAction: '次の作業',
    note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RepositoryProgressKanban', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the five status columns in order', () => {
    render(
      <RepositoryProgressKanban
        repos={[createRepo('seed')]}
        getMeta={() => createMeta('seed', { status: 'in_progress' })}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
      />
    );

    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(headings).toEqual(['進行中', '保留', '確認中', '未整理', '完了']);
  });

  it('places tracked repositories in the matching column', () => {
    const repos = [createRepo('active'), createRepo('paused'), createRepo('skipped')];
    const metaByRepoId: Record<string, RepoUserMeta> = {
      active: createMeta('active', { status: 'in_progress' }),
      paused: createMeta('paused', { status: 'paused' }),
    };
    render(
      <RepositoryProgressKanban
        repos={repos}
        getMeta={(repoId) => metaByRepoId[repoId] ?? null}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
      />
    );

    const inProgressSection = screen.getByRole('region', { name: '進行中のプロジェクト' });
    const pausedSection = screen.getByRole('region', { name: '保留のプロジェクト' });

    expect(inProgressSection.textContent).toContain('active');
    expect(pausedSection.textContent).toContain('paused');
    expect(screen.queryByText('alice/skipped')).toBeNull();
  });

  it('opens the detail panel when a card is clicked', () => {
    const repo = createRepo('active');
    const onOpenDetail = vi.fn();
    render(
      <RepositoryProgressKanban
        repos={[repo]}
        getMeta={() => createMeta('active', { status: 'in_progress' })}
        getAutoHealth={() => 'Active'}
        onOpenDetail={onOpenDetail}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'alice/active の詳細を開く' }));

    expect(onOpenDetail).toHaveBeenCalledWith(repo);
  });

  it('shows the empty board when nothing is tracked', () => {
    const onShowAll = vi.fn();
    render(
      <RepositoryProgressKanban
        repos={[createRepo('ignored')]}
        getMeta={() => null}
        getAutoHealth={() => 'Active'}
        onOpenDetail={() => undefined}
        onShowAll={onShowAll}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '「すべて」を見る' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });
});
