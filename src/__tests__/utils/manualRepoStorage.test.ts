import { describe, it, expect, beforeEach } from 'vitest';
import {
  getManualRepos,
  saveManualRepos,
  addMultipleManualRepos,
  clearManualRepos,
} from '../../utils/manualRepoStorage';
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

const manualRepo: Repo = {
  id: 'manual-1',
  nameWithOwner: 'octocat/Hello-World',
  htmlUrl: 'https://github.com/octocat/Hello-World',
  pushedAt: '2024-01-01T00:00:00Z',
  isArchived: false,
  isPrivate: false,
  topics: [],
};

describe('manualRepoStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('namespaces manual repos by accountId', () => {
    saveManualRepos(ACCOUNT_A, [manualRepo]);
    saveManualRepos(ACCOUNT_B, [{ ...manualRepo, id: 'manual-2', nameWithOwner: 'foo/bar' }]);

    const loadedA = getManualRepos(ACCOUNT_A);
    const loadedB = getManualRepos(ACCOUNT_B);

    expect(loadedA).toHaveLength(1);
    expect(loadedA[0].nameWithOwner).toBe('octocat/Hello-World');
    expect(loadedB[0].nameWithOwner).toBe('foo/bar');
  });

  it('migrates legacy manual repos into account-scoped key', () => {
    localStorage.setItem('github-dashboard-manual-repos', JSON.stringify([manualRepo]));

    const loaded = getManualRepos(ACCOUNT_A);

    expect(loaded).toHaveLength(1);
    expect(localStorage.getItem(`manual-repos:${ACCOUNT_A}`)).not.toBeNull();
    expect(localStorage.getItem('github-dashboard-manual-repos')).toBeNull();
  });

  it('throws when accountId is missing', () => {
    expect(() => getManualRepos('')).toThrow('accountId is required');
    expect(() => addMultipleManualRepos('', [manualRepo])).toThrow('accountId is required');
    expect(() => clearManualRepos('')).toThrow('accountId is required');
  });
});
