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
    tracked: true,
    status: 'in_progress',
    stage: 'implementation',
    scheduleBucket: 'this_week',
    purpose: 'READMEを整える',
    nextAction: '使い方を追記する',
    note: 'スクリーンショットを足す',
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

  it('stores a version 2 envelope with progress fields and drops unknown extras', () => {
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

    expect(parsed?.version).toBe(2);
    expect(parsed?.records).toHaveLength(1);
    expect(parsed?.records[0]).toEqual(createMeta());
    expect(parsed?.records[0].difficulty).toBeUndefined();
    expect(parsed?.records[0].confidence).toBeUndefined();
    expect(parsed?.records[0].lastReviewedAt).toBeUndefined();
  });

  it('migrates version 1 records with default progress fields', () => {
    localStorage.setItem(
      getRepositoryMetaKey(ACCOUNT_A),
      JSON.stringify({
        version: 1,
        records: [
          {
            repoId: 'repo-1',
            status: 'paused',
            purpose: '既存目的',
            nextAction: '既存の次作業',
            note: '既存メモ',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
      })
    );

    const [meta] = getRepositoryMetas(ACCOUNT_A);

    expect(meta?.status).toBe('paused');
    expect(meta?.purpose).toBe('既存目的');
    expect(meta?.nextAction).toBe('既存の次作業');
    expect(meta?.note).toBe('既存メモ');
    expect(meta?.stage).toBe('unassigned');
    expect(meta?.scheduleBucket).toBe('unscheduled');
    expect(meta?.tracked).toBe(true);
  });

  it('resets invalid stage and schedule bucket to defaults', () => {
    saveRepositoryMetas(ACCOUNT_A, [
      {
        ...createMeta(),
        stage: 'not-a-stage',
        scheduleBucket: 'not-a-bucket',
      } as unknown as RepoUserMeta,
    ]);

    const [meta] = getRepositoryMetas(ACCOUNT_A);

    expect(meta?.stage).toBe('unassigned');
    expect(meta?.scheduleBucket).toBe('unscheduled');
  });

  it('drops corrupted JSON and returns an empty list', () => {
    localStorage.setItem(getRepositoryMetaKey(ACCOUNT_A), '{invalid-json');

    expect(getRepositoryMetas(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getRepositoryMetaKey(ACCOUNT_A))).toBeNull();
  });

  it('drops invalid envelopes without crashing', () => {
    localStorage.setItem(getRepositoryMetaKey(ACCOUNT_A), JSON.stringify({ version: 2, records: 'wrong' }));

    expect(getRepositoryMetas(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getRepositoryMetaKey(ACCOUNT_A))).toBeNull();
  });

  it('upserts while preserving existing items', () => {
    saveRepositoryMetas(ACCOUNT_A, [createMeta()]);

    const updated = upsertRepositoryMeta(ACCOUNT_A, 'repo-1', { scheduleBucket: 'next_week' });

    expect(updated.status).toBe('in_progress');
    expect(updated.stage).toBe('implementation');
    expect(updated.scheduleBucket).toBe('next_week');
  });

  it('toggles tracked while preserving the other fields', () => {
    saveRepositoryMetas(ACCOUNT_A, [createMeta()]);

    const toggled = upsertRepositoryMeta(ACCOUNT_A, 'repo-1', { tracked: false });

    expect(toggled.tracked).toBe(false);
    expect(toggled.status).toBe('in_progress');
    expect(toggled.stage).toBe('implementation');
  });

  it('throws when accountId is missing', () => {
    expect(() => getRepositoryMetas('')).toThrow('accountId is required');
    expect(() => saveRepositoryMetas('', [])).toThrow('accountId is required');
    expect(() => clearRepositoryMetas('')).toThrow('accountId is required');
  });
});
