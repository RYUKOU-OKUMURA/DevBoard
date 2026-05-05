// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import type { RepoUserMeta } from '../../types';
import {
  clearRepositoryMetas,
  getRepositoryMetaKey,
  getRepositoryMetas,
  saveRepositoryMetas,
  upsertRepositoryMeta,
} from '../repositoryMetaStorage';

const ACCOUNT_A = 'alice-id';
const ACCOUNT_B = 'bob-id';

function createMeta(repoId = 'repo-1'): RepoUserMeta {
  return {
    repoId,
    status: 'learning',
    purpose: 'READMEを整える',
    nextAction: '使い方を追記する',
    note: 'あとでスクリーンショットを足す',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('repositoryMetaStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('namespaces repository metadata by accountId', () => {
    saveRepositoryMetas(ACCOUNT_A, [createMeta('repo-a')]);
    saveRepositoryMetas(ACCOUNT_B, [createMeta('repo-b')]);

    expect(getRepositoryMetas(ACCOUNT_A).map((meta) => meta.repoId)).toEqual(['repo-a']);
    expect(getRepositoryMetas(ACCOUNT_B).map((meta) => meta.repoId)).toEqual(['repo-b']);
  });

  it('stores a versioned envelope with only MVP fields', () => {
    saveRepositoryMetas(ACCOUNT_A, [
      {
        ...createMeta(),
        difficulty: 3,
        confidence: 4,
        lastReviewedAt: '2026-01-02T00:00:00.000Z',
      } as RepoUserMeta & Record<string, unknown>,
    ]);

    const raw = localStorage.getItem(getRepositoryMetaKey(ACCOUNT_A));
    const parsed = raw ? JSON.parse(raw) : null;

    expect(parsed?.version).toBe(1);
    expect(parsed?.records).toHaveLength(1);
    expect(parsed?.records[0]).toEqual(createMeta());
    expect(parsed?.records[0].difficulty).toBeUndefined();
    expect(parsed?.records[0].confidence).toBeUndefined();
    expect(parsed?.records[0].lastReviewedAt).toBeUndefined();
  });

  it('drops corrupted JSON and returns an empty list', () => {
    localStorage.setItem(getRepositoryMetaKey(ACCOUNT_A), '{invalid-json');

    expect(getRepositoryMetas(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getRepositoryMetaKey(ACCOUNT_A))).toBeNull();
  });

  it('drops invalid envelopes without crashing', () => {
    localStorage.setItem(getRepositoryMetaKey(ACCOUNT_A), JSON.stringify({ version: 1, records: 'wrong' }));

    expect(getRepositoryMetas(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getRepositoryMetaKey(ACCOUNT_A))).toBeNull();
  });

  it('upserts a single repository while preserving createdAt', () => {
    saveRepositoryMetas(ACCOUNT_A, [createMeta()]);

    const updated = upsertRepositoryMeta(
      ACCOUNT_A,
      'repo-1',
      { status: 'in_progress', nextAction: 'Issue練習を作る' },
      '2026-02-01T00:00:00.000Z'
    );

    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(updated.status).toBe('in_progress');
    expect(getRepositoryMetas(ACCOUNT_A)[0]?.nextAction).toBe('Issue練習を作る');
  });

  it('throws when accountId is missing', () => {
    expect(() => getRepositoryMetas('')).toThrow('accountId is required');
    expect(() => saveRepositoryMetas('', [])).toThrow('accountId is required');
    expect(() => clearRepositoryMetas('')).toThrow('accountId is required');
  });
});
