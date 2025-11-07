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

    saveViewerRepos([baseRepo]);

    const stored = localStorage.getItem('devboard_viewer_repos');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.timestamp).toBeTypeOf('number');
    expect(parsed.repos).toHaveLength(1);
    expect(parsed.repos[0].source).toEqual({ type: 'viewer' });

    const loaded = loadViewerRepos();
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].source?.type).toBe('viewer');
  });

  it('returns null and clears cache when viewer data is expired', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(now);

    saveViewerRepos([baseRepo]);

    vi.advanceTimersByTime(REPO_CACHE_TTL_MS + 1);

    const loaded = loadViewerRepos();
    expect(loaded).toBeNull();
    expect(localStorage.getItem('devboard_viewer_repos')).toBeNull();
  });

  it('removes invalid viewer cache payloads gracefully', () => {
    localStorage.setItem('devboard_viewer_repos', 'invalid-json');

    const loaded = loadViewerRepos();
    expect(loaded).toBeNull();
    expect(localStorage.getItem('devboard_viewer_repos')).toBeNull();
  });

  it('removes legacy viewer payload without timestamp', () => {
    localStorage.setItem('devboard_viewer_repos', JSON.stringify([baseRepo]));

    const loaded = loadViewerRepos();
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

    saveCustomRepos([manualRepo]);

    const loaded = loadCustomRepos();
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

    saveCustomRepos([manualRepo]);

    vi.advanceTimersByTime(REPO_CACHE_TTL_MS + 60_000);

    const loaded = loadCustomRepos();
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].id).toBe('manual-ttl');
  });

  it('migrates legacy custom repos stored without metadata', () => {
    const legacyManual = { ...baseRepo, id: 'legacy-manual' };

    localStorage.setItem('devboard_custom_repos', JSON.stringify([legacyManual]));

    const loaded = loadCustomRepos();
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].source?.type).toBe('manual');

    const persisted = JSON.parse(localStorage.getItem('devboard_custom_repos')!);
    expect(persisted).toHaveProperty('timestamp');
    expect(typeof persisted.timestamp).toBe('number');
    expect(persisted.repos[0].source).toEqual({ type: 'manual' });
  });

  it('returns timestamps when available', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(now);

    saveViewerRepos([baseRepo]);
    saveCustomRepos([baseRepo]);

    const viewerTimestamp = getViewerReposTimestamp();
    const customTimestamp = getCustomReposTimestamp();

    expect(viewerTimestamp).toBeTypeOf('number');
    expect(customTimestamp).toBeTypeOf('number');
    expect(viewerTimestamp).toBe(customTimestamp);
  });
});
