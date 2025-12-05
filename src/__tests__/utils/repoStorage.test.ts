import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadViewerRepos,
  saveViewerRepos,
  loadCustomRepos,
  saveCustomRepos,
  getViewerReposTimestamp,
  getCustomReposTimestamp,
  REPO_CACHE_TTL_MS,
} from '../../utils/repoStorage';
import type { Repo } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});
Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
});

const ACCOUNT_A = 'alice';
const ACCOUNT_B = 'bob';

const baseRepo: Repo = {
  id: '1',
  nameWithOwner: 'octocat/Hello-World',
  htmlUrl: 'https://github.com/octocat/Hello-World',
  pushedAt: '2024-01-01T00:00:00Z',
  isArchived: false,
  isPrivate: false,
  topics: ['demo'],
};

describe('repoStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves and loads viewer repos within TTL', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(now);

    saveViewerRepos(ACCOUNT_A, [baseRepo]);

    const stored = localStorage.getItem(`devboard_viewer_repos:${ACCOUNT_A}`);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.timestamp).toBeTypeOf('number');
    expect(parsed.repos).toHaveLength(1);
    expect(parsed.repos[0].source).toEqual({ type: 'viewer' });

    const loaded = loadViewerRepos(ACCOUNT_A);
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].source?.type).toBe('viewer');
  });

  it('returns null and clears cache when viewer data is expired', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(now);

    saveViewerRepos(ACCOUNT_A, [baseRepo]);

    vi.advanceTimersByTime(REPO_CACHE_TTL_MS + 1);

    const loaded = loadViewerRepos(ACCOUNT_A);
    expect(loaded).toBeNull();
    expect(localStorage.getItem(`devboard_viewer_repos:${ACCOUNT_A}`)).toBeNull();
  });

  it('removes invalid viewer cache payloads gracefully', () => {
    localStorage.setItem(`devboard_viewer_repos:${ACCOUNT_A}`, 'invalid-json');

    const loaded = loadViewerRepos(ACCOUNT_A);
    expect(loaded).toBeNull();
    expect(localStorage.getItem(`devboard_viewer_repos:${ACCOUNT_A}`)).toBeNull();
  });

  it('removes legacy viewer payload without timestamp', () => {
    localStorage.setItem('devboard_viewer_repos', JSON.stringify([baseRepo]));

    const loaded = loadViewerRepos(ACCOUNT_A);
    expect(loaded).toBeNull();
    expect(localStorage.getItem('devboard_viewer_repos')).toBeNull();
  });

  it('saves and loads custom repos with manual source', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const manualRepo: Repo = {
      ...baseRepo,
      id: 'manual-1',
    };

    saveCustomRepos(ACCOUNT_A, [manualRepo]);

    const loaded = loadCustomRepos(ACCOUNT_A);
    expect(loaded).not.toBeNull();
    expect(loaded![0].source?.type).toBe('manual');
  });

  it('keeps custom repos even after TTL passes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const manualRepo: Repo = {
      ...baseRepo,
      id: 'manual-ttl',
    };

    saveCustomRepos(ACCOUNT_A, [manualRepo]);

    vi.advanceTimersByTime(REPO_CACHE_TTL_MS + 60_000);

    const loaded = loadCustomRepos(ACCOUNT_A);
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].id).toBe('manual-ttl');
  });

  it('migrates legacy custom repos stored without metadata', () => {
    const legacyManual = { ...baseRepo, id: 'legacy-manual' };

    localStorage.setItem('devboard_custom_repos', JSON.stringify([legacyManual]));

    const loaded = loadCustomRepos(ACCOUNT_A);
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].source?.type).toBe('manual');

    const persisted = JSON.parse(localStorage.getItem(`devboard_custom_repos:${ACCOUNT_A}`)!);
    expect(persisted).toHaveProperty('timestamp');
    expect(typeof persisted.timestamp).toBe('number');
    expect(persisted.repos[0].source).toEqual({ type: 'manual' });
    expect(localStorage.getItem('devboard_custom_repos')).toBeNull();
  });

  it('returns timestamps when available', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(now);

    saveViewerRepos(ACCOUNT_A, [baseRepo]);
    saveCustomRepos(ACCOUNT_A, [baseRepo]);

    const viewerTimestamp = getViewerReposTimestamp(ACCOUNT_A);
    const customTimestamp = getCustomReposTimestamp(ACCOUNT_A);

    expect(viewerTimestamp).toBeTypeOf('number');
    expect(customTimestamp).toBeTypeOf('number');
    expect(viewerTimestamp).toBe(customTimestamp);
  });

  it('keeps caches separated by accountId', () => {
    saveViewerRepos(ACCOUNT_A, [baseRepo]);
    saveViewerRepos(ACCOUNT_B, [{ ...baseRepo, id: 'b', nameWithOwner: 'other/repo' }]);

    const loadedA = loadViewerRepos(ACCOUNT_A);
    const loadedB = loadViewerRepos(ACCOUNT_B);

    expect(loadedA?.[0].nameWithOwner).toBe('octocat/Hello-World');
    expect(loadedB?.[0].nameWithOwner).toBe('other/repo');
  });

  it('separates custom caches by accountId', () => {
    const repoA = { ...baseRepo, id: 'custom-a', nameWithOwner: 'alice/repo' };
    const repoB = { ...baseRepo, id: 'custom-b', nameWithOwner: 'bob/repo' };

    saveCustomRepos(ACCOUNT_A, [repoA]);
    saveCustomRepos(ACCOUNT_B, [repoB]);

    expect(loadCustomRepos(ACCOUNT_A)?.[0].nameWithOwner).toBe('alice/repo');
    expect(loadCustomRepos(ACCOUNT_B)?.[0].nameWithOwner).toBe('bob/repo');
  });

  it('migrates viewer cache from legacy key to account-scoped key', () => {
    const payload = {
      repos: [{ ...baseRepo, source: { type: 'viewer' as const } }],
      timestamp: Date.now(),
    };
    localStorage.setItem('devboard_viewer_repos', JSON.stringify(payload));

    const loaded = loadViewerRepos(ACCOUNT_A);

    expect(loaded).not.toBeNull();
    expect(localStorage.getItem(`devboard_viewer_repos:${ACCOUNT_A}`)).not.toBeNull();
    expect(localStorage.getItem('devboard_viewer_repos')).toBeNull();
  });

  it('throws when accountId is missing', () => {
    expect(() => loadViewerRepos('')).toThrow('accountId is required');
    expect(() => saveCustomRepos('', [baseRepo])).toThrow('accountId is required');
  });
});
