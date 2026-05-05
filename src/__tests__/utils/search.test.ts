import { describe, it, expect } from 'vitest';
import {
  normalizeString,
  matchesSearch,
  filterRepos,
  sortRepos,
  searchAndSortRepos,
} from '../../utils/search';
import { Repo } from '../../types';

describe('normalizeString', () => {
  it('should convert to lowercase', () => {
    expect(normalizeString('HELLO')).toBe('hello');
  });

  it('should trim whitespace', () => {
    expect(normalizeString('  hello  ')).toBe('hello');
  });

  it('should handle mixed case and whitespace', () => {
    expect(normalizeString('  HeLLo WoRLd  ')).toBe('hello world');
  });
});

describe('matchesSearch', () => {
  const createMockRepo = (
    nameWithOwner: string,
    primaryLanguage?: string,
    description?: string,
    topics: string[] = []
  ): Repo => ({
    id: '1',
    nameWithOwner,
    htmlUrl: 'https://github.com/test/repo',
    pushedAt: new Date().toISOString(),
    isArchived: false,
    isPrivate: false,
    primaryLanguage,
    description,
    topics,
  });

  it('should match repository name', () => {
    const repo = createMockRepo('octocat/Hello-World');
    expect(matchesSearch(repo, 'hello')).toBe(true);
    expect(matchesSearch(repo, 'world')).toBe(true);
    expect(matchesSearch(repo, 'octocat')).toBe(true);
  });

  it('should match primary language', () => {
    const repo = createMockRepo('test/repo', 'TypeScript');
    expect(matchesSearch(repo, 'typescript')).toBe(true);
    expect(matchesSearch(repo, 'type')).toBe(true);
  });

  it('should match description', () => {
    const repo = createMockRepo('test/repo', undefined, 'A cool React application');
    expect(matchesSearch(repo, 'react')).toBe(true);
    expect(matchesSearch(repo, 'cool')).toBe(true);
    expect(matchesSearch(repo, 'application')).toBe(true);
  });

  it('should match topics', () => {
    const repo = createMockRepo('test/repo', undefined, undefined, ['javascript', 'web', 'api']);
    expect(matchesSearch(repo, 'javascript')).toBe(true);
    expect(matchesSearch(repo, 'web')).toBe(true);
    expect(matchesSearch(repo, 'api')).toBe(true);
  });

  it('should be case-insensitive', () => {
    const repo = createMockRepo('Test/REPO', 'JavaScript', 'A Cool APP', ['REACT']);
    expect(matchesSearch(repo, 'test')).toBe(true);
    expect(matchesSearch(repo, 'javascript')).toBe(true);
    expect(matchesSearch(repo, 'cool')).toBe(true);
    expect(matchesSearch(repo, 'react')).toBe(true);
  });

  it('should return true for empty query', () => {
    const repo = createMockRepo('test/repo');
    expect(matchesSearch(repo, '')).toBe(true);
    expect(matchesSearch(repo, '   ')).toBe(true);
  });

  it('should return false for no matches', () => {
    const repo = createMockRepo('test/repo', 'Python', 'A backend service', ['api', 'backend']);
    expect(matchesSearch(repo, 'react')).toBe(false);
    expect(matchesSearch(repo, 'frontend')).toBe(false);
  });

  it('should handle partial matches', () => {
    const repo = createMockRepo('user/my-awesome-project', 'JavaScript', 'An awesome app');
    expect(matchesSearch(repo, 'awe')).toBe(true);
    expect(matchesSearch(repo, 'proj')).toBe(true);
  });
});

describe('filterRepos', () => {
  const repos: Repo[] = [
    {
      id: '1',
      nameWithOwner: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
      pushedAt: '2024-01-15T12:00:00Z',
      isArchived: false,
      isPrivate: false,
      primaryLanguage: 'JavaScript',
      topics: ['javascript', 'web'],
    },
    {
      id: '2',
      nameWithOwner: 'user/react-app',
      htmlUrl: 'https://github.com/user/react-app',
      pushedAt: '2024-02-10T08:00:00Z',
      isArchived: false,
      isPrivate: false,
      primaryLanguage: 'TypeScript',
      description: 'A React application',
      topics: ['react', 'typescript'],
    },
    {
      id: '3',
      nameWithOwner: 'company/python-api',
      htmlUrl: 'https://github.com/company/python-api',
      pushedAt: '2024-03-05T14:00:00Z',
      isArchived: false,
      isPrivate: true,
      primaryLanguage: 'Python',
      description: 'Backend API service',
      topics: ['python', 'api', 'backend'],
    },
  ];

  it('should return all repos for empty query', () => {
    expect(filterRepos(repos, '')).toHaveLength(3);
    expect(filterRepos(repos, '   ')).toHaveLength(3);
  });

  it('should filter by name', () => {
    const filtered = filterRepos(repos, 'react');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.nameWithOwner).toBe('user/react-app');
  });

  it('should filter by language', () => {
    const filtered = filterRepos(repos, 'python');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.primaryLanguage).toBe('Python');
  });

  it('should filter by description', () => {
    const filtered = filterRepos(repos, 'backend');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.description).toContain('Backend');
  });

  it('should filter by topics', () => {
    const filtered = filterRepos(repos, 'api');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.topics).toContain('api');
  });

  it('should return multiple matches', () => {
    const filtered = filterRepos(repos, 'javascript');
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });
});

describe('sortRepos', () => {
  const repos: Repo[] = [
    {
      id: '1',
      nameWithOwner: 'zebra/project',
      htmlUrl: 'https://github.com/zebra/project',
      pushedAt: '2024-01-15T12:00:00Z',
      isArchived: false,
      isPrivate: false,
      topics: [],
    },
    {
      id: '2',
      nameWithOwner: 'apple/app',
      htmlUrl: 'https://github.com/apple/app',
      pushedAt: '2024-03-10T08:00:00Z',
      isArchived: false,
      isPrivate: false,
      topics: [],
    },
    {
      id: '3',
      nameWithOwner: 'monkey/tool',
      htmlUrl: 'https://github.com/monkey/tool',
      pushedAt: '2024-02-05T14:00:00Z',
      isArchived: false,
      isPrivate: false,
      topics: [],
    },
  ];

  it('should sort by lastUpdated descending', () => {
    const sorted = sortRepos(repos, 'lastUpdated');
    expect(sorted[0]!.nameWithOwner).toBe('apple/app');   // March
    expect(sorted[1]!.nameWithOwner).toBe('monkey/tool'); // February
    expect(sorted[2]!.nameWithOwner).toBe('zebra/project'); // January
  });

  it('should sort by name ascending', () => {
    const sorted = sortRepos(repos, 'name');
    expect(sorted[0]!.nameWithOwner).toBe('apple/app');
    expect(sorted[1]!.nameWithOwner).toBe('monkey/tool');
    expect(sorted[2]!.nameWithOwner).toBe('zebra/project');
  });

  it('should not mutate original array', () => {
    const original = [...repos];
    sortRepos(repos, 'name');
    expect(repos).toEqual(original);
  });
});

describe('searchAndSortRepos', () => {
  const repos: Repo[] = [
    {
      id: '1',
      nameWithOwner: 'user/react-app',
      htmlUrl: 'https://github.com/user/react-app',
      pushedAt: '2024-01-15T12:00:00Z',
      isArchived: false,
      isPrivate: false,
      primaryLanguage: 'TypeScript',
      topics: ['react', 'typescript'],
    },
    {
      id: '2',
      nameWithOwner: 'company/react-native',
      htmlUrl: 'https://github.com/company/react-native',
      pushedAt: '2024-03-10T08:00:00Z',
      isArchived: false,
      isPrivate: false,
      primaryLanguage: 'JavaScript',
      topics: ['react', 'mobile'],
    },
    {
      id: '3',
      nameWithOwner: 'org/react-lib',
      htmlUrl: 'https://github.com/org/react-lib',
      pushedAt: '2024-02-05T14:00:00Z',
      isArchived: false,
      isPrivate: false,
      primaryLanguage: 'TypeScript',
      topics: ['react', 'library'],
    },
  ];

  it('should search and sort by lastUpdated', () => {
    const result = searchAndSortRepos(repos, 'react', 'lastUpdated');
    expect(result).toHaveLength(3);
    expect(result[0]!.nameWithOwner).toBe('company/react-native'); // March
    expect(result[1]!.nameWithOwner).toBe('org/react-lib');        // February
    expect(result[2]!.nameWithOwner).toBe('user/react-app');       // January
  });

  it('should search and sort by name', () => {
    const result = searchAndSortRepos(repos, 'react', 'name');
    expect(result).toHaveLength(3);
    expect(result[0]!.nameWithOwner).toBe('company/react-native');
    expect(result[1]!.nameWithOwner).toBe('org/react-lib');
    expect(result[2]!.nameWithOwner).toBe('user/react-app');
  });

  it('should filter then sort', () => {
    const result = searchAndSortRepos(repos, 'typescript', 'name');
    expect(result).toHaveLength(2);
    expect(result[0]!.nameWithOwner).toBe('org/react-lib');
    expect(result[1]!.nameWithOwner).toBe('user/react-app');
  });
});
