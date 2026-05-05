import { describe, expect, it } from 'vitest';
import type { Repo } from '../../../types';
import { countRepositoryHealth, getVisibleRepositoryItems } from '../repositoryHomeModel';

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

describe('getVisibleRepositoryItems', () => {
  const repos: Repo[] = [
    createRepo({
      id: 'frontend',
      nameWithOwner: 'alice/frontend-app',
      description: 'React dashboard',
      primaryLanguage: 'TypeScript',
      topics: ['react', 'dashboard'],
      pushedAt: '2025-02-01T00:00:00.000Z',
    }),
    createRepo({
      id: 'backend',
      nameWithOwner: 'alice/backend-api',
      description: 'Node service',
      primaryLanguage: 'JavaScript',
      topics: ['api'],
      pushedAt: '2025-03-01T00:00:00.000Z',
    }),
    createRepo({
      id: 'data',
      nameWithOwner: 'alice/data-tool',
      description: 'Python utilities',
      primaryLanguage: 'Python',
      topics: ['analysis'],
      pushedAt: '2024-12-01T00:00:00.000Z',
    }),
  ];

  it('searches name, description, primary language, and topics', () => {
    expect(getVisibleRepositoryItems(repos, 'frontend', 'lastUpdated', new Set()).map((repo) => repo.id)).toEqual([
      'frontend',
    ]);
    expect(getVisibleRepositoryItems(repos, 'dashboard', 'lastUpdated', new Set()).map((repo) => repo.id)).toEqual([
      'frontend',
    ]);
    expect(getVisibleRepositoryItems(repos, 'python', 'lastUpdated', new Set()).map((repo) => repo.id)).toEqual([
      'data',
    ]);
    expect(getVisibleRepositoryItems(repos, 'api', 'lastUpdated', new Set()).map((repo) => repo.id)).toEqual([
      'backend',
    ]);
  });

  it('sorts by last updated descending and name ascending', () => {
    expect(getVisibleRepositoryItems(repos, '', 'lastUpdated', new Set()).map((repo) => repo.id)).toEqual([
      'backend',
      'frontend',
      'data',
    ]);
    expect(getVisibleRepositoryItems(repos, '', 'name', new Set()).map((repo) => repo.id)).toEqual([
      'backend',
      'data',
      'frontend',
    ]);
  });

  it('excludes repositories hidden by the legacy board setting', () => {
    expect(getVisibleRepositoryItems(repos, '', 'name', new Set(['backend'])).map((repo) => repo.id)).toEqual([
      'data',
      'frontend',
    ]);
  });
});

describe('countRepositoryHealth', () => {
  it('counts automatic health labels for visible repositories', () => {
    const repos: Repo[] = [
      createRepo({ id: 'active', nameWithOwner: 'alice/active', pushedAt: '2025-01-10T00:00:00.000Z' }),
      createRepo({ id: 'stale', nameWithOwner: 'alice/stale', pushedAt: '2024-11-01T00:00:00.000Z' }),
      createRepo({ id: 'dormant', nameWithOwner: 'alice/dormant', pushedAt: '2024-01-01T00:00:00.000Z' }),
      createRepo({ id: 'archived', nameWithOwner: 'alice/archived', isArchived: true }),
    ];

    expect(countRepositoryHealth(repos, { now: new Date('2025-01-15T00:00:00.000Z') })).toEqual({
      Active: 1,
      Stale: 1,
      Dormant: 1,
      Archived: 1,
    });
  });
});
