// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIssueLocalMeta,
  getIssueLocalMetaKey,
  getIssueLocalMetaMap,
  getIssueLocalMetaMigrationKey,
  migrateLinkedIssueTodos,
  updateIssueLocalMeta,
} from '../issueLocalMetaStorage';

const ACCOUNT = 'alice-id';
const LEGACY_KEY = `github-dashboard-todos:${ACCOUNT}`;

describe('issue local meta inProgress', () => {
  it('keeps inProgress only when true and drops the entry when nothing else remains', () => {
    localStorage.clear();
    updateIssueLocalMeta('alice-id', 'repo-a', 1, { inProgress: true });
    expect(getIssueLocalMeta('alice-id', 'repo-a', 1)?.inProgress).toBe(true);
    updateIssueLocalMeta('alice-id', 'repo-a', 1, { note: 'memo' });
    expect(getIssueLocalMeta('alice-id', 'repo-a', 1)?.inProgress).toBe(true);
    updateIssueLocalMeta('alice-id', 'repo-a', 1, { inProgress: false, note: '' });
    expect(getIssueLocalMeta('alice-id', 'repo-a', 1)).toBeNull();
  });
});

describe('issueLocalMetaStorage', () => {
  beforeEach(() => localStorage.clear());

  it('scopes metadata by account and discards invalid entries and fields', () => {
    localStorage.setItem(getIssueLocalMetaKey(ACCOUNT), JSON.stringify({
      'repo-a#1': { priority: 'high', dueDate: '2026-12-20', note: 42, updatedAt: '2026-01-01T00:00:00.000Z' },
      'repo-a#2': { priority: 'urgent', dueDate: 'tomorrow', note: 'keep', updatedAt: 'invalid' },
      'repo-a#0': { note: 'bad issue key', updatedAt: '2026-01-01T00:00:00.000Z' },
      'repo-a#3#4': { note: 'bad key', updatedAt: '2026-01-01T00:00:00.000Z' },
      'repo-a#4': { priority: 'wrong', dueDate: '2026-02-30', note: 12 },
    }));

    expect(getIssueLocalMetaMap(ACCOUNT)).toMatchObject({
      'repo-a#1': { priority: 'high', dueDate: '2026-12-20' },
      'repo-a#2': { note: 'keep' },
    });
    expect(getIssueLocalMeta('bob-id', 'repo-a', 1)).toBeNull();
    expect(getIssueLocalMetaMap(ACCOUNT)['repo-a#4']).toBeUndefined();
  });

  it('returns an empty map for invalid JSON', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem(getIssueLocalMetaKey(ACCOUNT), '{broken');

    expect(getIssueLocalMetaMap(ACCOUNT)).toEqual({});
  });

  it('removes an entry when its last field is cleared and truncates notes', () => {
    updateIssueLocalMeta(ACCOUNT, 'repo-a', 7, { priority: 'medium', dueDate: '2026-07-01', note: 'x'.repeat(2100) });
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 7)?.note).toHaveLength(2000);

    updateIssueLocalMeta(ACCOUNT, 'repo-a', 7, { priority: null, dueDate: null, note: '' });
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 7)).toBeNull();
    expect(JSON.parse(localStorage.getItem(getIssueLocalMetaKey(ACCOUNT)) ?? '{}')).toEqual({});
  });

  it('migrates linked todos without changing the old storage value and keeps the newest todo', () => {
    const legacy = [
      { repoId: 'repo-a', issueNumber: 8, priority: 'low', dueDate: '2026-04-03T00:00:00.000Z', description: 'old', updatedAt: '2026-01-01T00:00:00.000Z' },
      { repoId: 'repo-a', issueNumber: 8, priority: 'high', dueDate: '2026-04-04T00:00:00.000Z', description: 'latest', updatedAt: '2026-02-01T00:00:00.000Z' },
      { repoId: 'repo-a', priority: 'medium', description: 'unlinked', updatedAt: '2026-03-01T00:00:00.000Z' },
    ];
    const raw = JSON.stringify(legacy);
    localStorage.setItem(LEGACY_KEY, raw);

    expect(migrateLinkedIssueTodos(ACCOUNT)).toBe(true);
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 8)).toMatchObject({
      priority: 'high', dueDate: '2026-04-04', note: 'latest', updatedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(localStorage.getItem(LEGACY_KEY)).toBe(raw);
  });

  it('keeps the newest todo that can produce metadata', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      {
        repoId: 'repo-a', issueNumber: 8, priority: 'high', dueDate: '2026-04-01',
        description: 'older valid todo', updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        repoId: 'repo-a', issueNumber: 8, priority: 'urgent', dueDate: '2026-04-01Tbad',
        description: 42, updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]));

    expect(migrateLinkedIssueTodos(ACCOUNT)).toBe(true);
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 8)).toEqual({
      priority: 'high', dueDate: '2026-04-01', note: 'older valid todo', updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('migrates legacy due dates with offsets that omit the colon', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      {
        repoId: 'repo-a', issueNumber: 8, priority: 'medium', dueDate: '2026-04-01T00:00:00+0900',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]));

    expect(migrateLinkedIssueTodos(ACCOUNT)).toBe(true);
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 8)?.dueDate).toBe('2026-04-01');
  });

  it('skips malformed linked todos and migrates valid entries after them', () => {
    const validTodo = {
      repoId: 'repo-a', issueNumber: 8, priority: 'high', dueDate: '2026-04-04',
      description: 'valid', updatedAt: '2026-02-01T00:00:00.000Z',
    };
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      null,
      42,
      'x',
      { repoId: 'repo-a' },
      validTodo,
    ]));

    expect(() => migrateLinkedIssueTodos(ACCOUNT)).not.toThrow();
    expect(getIssueLocalMetaMap(ACCOUNT)).toEqual({
      'repo-a#8': {
        priority: 'high', dueDate: '2026-04-04', note: 'valid', updatedAt: '2026-02-01T00:00:00.000Z',
      },
    });
  });

  it('does not migrate an invalid legacy due date while keeping other fields', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      {
        repoId: 'repo-a', issueNumber: 8, priority: 'medium', dueDate: '2026-04-01Tbad',
        description: 'keep this note', updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]));

    expect(migrateLinkedIssueTodos(ACCOUNT)).toBe(true);
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 8)).toEqual({
      priority: 'medium', note: 'keep this note', updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });

  it('does not overwrite existing metadata and runs only once', () => {
    updateIssueLocalMeta(ACCOUNT, 'repo-a', 8, {
      priority: 'high', dueDate: '2026-04-04', note: 'existing',
    });
    const existingMeta = getIssueLocalMeta(ACCOUNT, 'repo-a', 8);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      {
        repoId: 'repo-a', issueNumber: 8, priority: 'low', dueDate: '2026-04-05',
        description: 'legacy overwrite', updatedAt: '2026-02-01T00:00:00.000Z',
      },
      { repoId: 'repo-b', issueNumber: 9, priority: 'low', updatedAt: '2026-02-01T00:00:00.000Z' },
    ]));

    migrateLinkedIssueTodos(ACCOUNT);
    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 8)).toEqual(existingMeta);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      { repoId: 'repo-b', issueNumber: 9, priority: 'high', updatedAt: '2026-03-01T00:00:00.000Z' },
    ]));
    migrateLinkedIssueTodos(ACCOUNT);

    expect(getIssueLocalMeta(ACCOUNT, 'repo-a', 8)).toEqual(existingMeta);
    expect(getIssueLocalMeta(ACCOUNT, 'repo-b', 9)?.priority).toBe('low');
    expect(localStorage.getItem(getIssueLocalMetaMigrationKey(ACCOUNT))).toBe('1');
  });

  it('does not throw for invalid legacy JSON and flags the migration complete', () => {
    localStorage.setItem(LEGACY_KEY, '{broken');

    expect(() => migrateLinkedIssueTodos(ACCOUNT)).not.toThrow();
    expect(localStorage.getItem(LEGACY_KEY)).toBe('{broken');
    expect(localStorage.getItem(getIssueLocalMetaMigrationKey(ACCOUNT))).toBe('1');
  });
});
