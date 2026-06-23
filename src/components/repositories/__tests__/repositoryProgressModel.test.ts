import { describe, expect, it } from 'vitest';
import type { Repo, RepoUserMeta } from '../../../types';
import {
  createRoadmapItems,
  groupRepositoriesByStatus,
  resolveRepositoryMeta,
} from '../repositoryProgressModel';

type RepoInit = Partial<Repo> & { nameWithOwner: string };

function createRepo(overrides: RepoInit): Repo {
  return {
    id: overrides.id ?? overrides.nameWithOwner,
    nameWithOwner: overrides.nameWithOwner,
    htmlUrl: overrides.htmlUrl ?? `https://github.com/${overrides.nameWithOwner}`,
    pushedAt: overrides.pushedAt ?? '2025-01-01T00:00:00.000Z',
    isArchived: overrides.isArchived ?? false,
    isPrivate: overrides.isPrivate ?? false,
    description: overrides.description,
    primaryLanguage: overrides.primaryLanguage,
    topics: overrides.topics ?? [],
    stargazers_count: overrides.stargazers_count,
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
    nextAction: '',
    note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveRepositoryMeta', () => {
  it('returns saved metadata as-is', () => {
    const meta = createMeta('repo-1', { status: 'paused', scheduleBucket: 'next_month' });
    expect(resolveRepositoryMeta('repo-1', meta)).toBe(meta);
  });

  it('returns virtual defaults for unsaved repositories without persisting them', () => {
    const virtual = resolveRepositoryMeta('repo-1', null);

    expect(virtual.tracked).toBe(false);
    expect(virtual.status).toBe('unreviewed');
    expect(virtual.stage).toBe('unassigned');
    expect(virtual.scheduleBucket).toBe('unscheduled');
  });
});

describe('groupRepositoriesByStatus', () => {
  it('groups tracked repositories into the correct status column', () => {
    const repos = [
      createRepo({ id: 'in-progress', nameWithOwner: 'a/in-progress' }),
      createRepo({ id: 'paused', nameWithOwner: 'a/paused' }),
    ];
    const metaByRepoId: Record<string, RepoUserMeta> = {
      'in-progress': createMeta('in-progress', { status: 'in_progress' }),
      paused: createMeta('paused', { status: 'paused' }),
    };
    const getMeta = (repoId: string) => metaByRepoId[repoId] ?? null;

    const groups = groupRepositoriesByStatus(repos, getMeta);

    expect(groups.in_progress.map((item) => item.repo.id)).toEqual(['in-progress']);
    expect(groups.paused.map((item) => item.repo.id)).toEqual(['paused']);
  });

  it('excludes untracked repositories from every column', () => {
    const repos = [createRepo({ id: 'ignored', nameWithOwner: 'a/ignored' })];
    const getMeta = () => null;

    const groups = groupRepositoriesByStatus(repos, getMeta);

    expect(groups.in_progress).toHaveLength(0);
    expect(groups.paused).toHaveLength(0);
    expect(groups.unreviewed).toHaveLength(0);
  });

  it('does not duplicate tracked repositories across columns', () => {
    const repos = [createRepo({ id: 'repo-1', nameWithOwner: 'a/repo-1' })];
    const getMeta = () => createMeta('repo-1', { status: 'done' });

    const groups = groupRepositoriesByStatus(repos, getMeta);

    const total = Object.values(groups).reduce((sum, items) => sum + items.length, 0);
    expect(total).toBe(1);
    expect(groups.done.map((item) => item.repo.id)).toEqual(['repo-1']);
  });
});

describe('createRoadmapItems', () => {
  it('returns one row per tracked repository', () => {
    const repos = [
      createRepo({ id: 'this-week', nameWithOwner: 'a/this-week' }),
      createRepo({ id: 'next-month', nameWithOwner: 'a/next-month' }),
      createRepo({ id: 'ignored', nameWithOwner: 'a/ignored' }),
    ];
    const metaByRepoId: Record<string, RepoUserMeta> = {
      'this-week': createMeta('this-week', { scheduleBucket: 'this_week' }),
      'next-month': createMeta('next-month', { scheduleBucket: 'next_month' }),
    };
    const getMeta = (repoId: string) => metaByRepoId[repoId] ?? null;

    const items = createRoadmapItems(repos, getMeta);

    expect(items.map((item) => item.repo.id)).toEqual(['this-week', 'next-month']);
    expect(items[0]?.meta.scheduleBucket).toBe('this_week');
    expect(items[1]?.meta.scheduleBucket).toBe('next_month');
  });

  it('omits untracked repositories', () => {
    const repos = [createRepo({ id: 'ignored', nameWithOwner: 'a/ignored' })];
    const getMeta = () => null;

    expect(createRoadmapItems(repos, getMeta)).toEqual([]);
  });
});
