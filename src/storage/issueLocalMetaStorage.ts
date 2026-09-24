import type { IssueLocalMeta, IssueLocalMetaPatch, IssueLocalPriority } from '../types';
import { getStorageItem, getStorageString, setStorageItem, setStorageString } from '../utils/storage';

const ISSUE_META_PREFIX = 'devboard-issue-meta:';
const MIGRATION_PREFIX = 'devboard-issue-meta-migrated:';
const LEGACY_TODO_PREFIX = 'github-dashboard-todos:';
const MAX_NOTE_LENGTH = 2000;

type IssueLocalMetaMap = Record<string, IssueLocalMeta>;

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access issue metadata.');
  }
  return accountId;
}

export function getIssueLocalMetaKey(accountId: string): string {
  return `${ISSUE_META_PREFIX}${assertAccountId(accountId)}`;
}

export function getIssueLocalMetaMigrationKey(accountId: string): string {
  return `${MIGRATION_PREFIX}${assertAccountId(accountId)}`;
}

export function getIssueLocalMetaEntryKey(repoId: string, issueNumber: number): string {
  return `${repoId}#${issueNumber}`;
}

function isPriority(value: unknown): value is IssueLocalPriority {
  return value === 'high' || value === 'medium' || value === 'low';
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readEntryKey(value: string): { repoId: string; issueNumber: number } | null {
  const separator = value.indexOf('#');
  if (separator < 1 || separator !== value.lastIndexOf('#')) return null;
  const repoId = value.slice(0, separator);
  const numberText = value.slice(separator + 1);
  const issueNumber = Number(numberText);
  if (!repoId.trim() || repoId !== repoId.trim() || !/^\d+$/.test(numberText) || !Number.isSafeInteger(issueNumber) || issueNumber < 1 || String(issueNumber) !== numberText) {
    return null;
  }
  return { repoId, issueNumber };
}

function normalizeMeta(value: unknown): IssueLocalMeta | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const priority = isPriority(record.priority) ? record.priority : undefined;
  const dueDate = isDateOnly(record.dueDate) ? record.dueDate : undefined;
  const note = typeof record.note === 'string' ? record.note.slice(0, MAX_NOTE_LENGTH) : undefined;
  if (!priority && !dueDate && !note) return null;
  const updatedAt = typeof record.updatedAt === 'string' && !Number.isNaN(Date.parse(record.updatedAt))
    ? record.updatedAt
    : new Date().toISOString();
  return { priority, dueDate, note, updatedAt };
}

function normalizeMap(value: unknown): IssueLocalMetaMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: IssueLocalMetaMap = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (readEntryKey(key)) {
      const normalized = normalizeMeta(entry);
      if (normalized) result[key] = normalized;
    }
  });
  return result;
}

export function getIssueLocalMetaMap(accountId: string): IssueLocalMetaMap {
  return normalizeMap(getStorageItem<unknown>(getIssueLocalMetaKey(accountId), {}));
}

export function getIssueLocalMeta(accountId: string, repoId: string, issueNumber: number): IssueLocalMeta | null {
  return getIssueLocalMetaMap(accountId)[getIssueLocalMetaEntryKey(repoId, issueNumber)] ?? null;
}

export function saveIssueLocalMetaMap(accountId: string, metas: IssueLocalMetaMap): boolean {
  return setStorageItem(getIssueLocalMetaKey(accountId), normalizeMap(metas));
}

export function updateIssueLocalMeta(
  accountId: string,
  repoId: string,
  issueNumber: number,
  patch: IssueLocalMetaPatch,
  now = new Date().toISOString()
): boolean {
  const key = getIssueLocalMetaEntryKey(repoId, issueNumber);
  const metas = getIssueLocalMetaMap(accountId);
  const current = metas[key];
  const priority = patch.priority === null
    ? undefined
    : patch.priority === undefined
      ? current?.priority
      : isPriority(patch.priority) ? patch.priority : current?.priority;
  const dueDate = patch.dueDate === null || patch.dueDate === ''
    ? undefined
    : patch.dueDate === undefined
      ? current?.dueDate
      : isDateOnly(patch.dueDate) ? patch.dueDate : current?.dueDate;
  const note = patch.note === undefined
    ? current?.note
    : patch.note.slice(0, MAX_NOTE_LENGTH);
  const next = normalizeMeta({ priority, dueDate, note, updatedAt: now });
  const updated = { ...metas };
  if (next) updated[key] = next;
  else delete updated[key];
  return saveIssueLocalMetaMap(accountId, updated);
}

type LegacyTodo = {
  repoId: string;
  issueNumber: number;
  priority?: unknown;
  dueDate?: unknown;
  description?: unknown;
  updatedAt: string;
};

function getLegacyTodos(accountId: string): unknown[] {
  const raw = getStorageString(`${LEGACY_TODO_PREFIX}${accountId}`, '');
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function isLegacyTodo(value: unknown): value is LegacyTodo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const todo = value as Record<string, unknown>;
  return typeof todo.repoId === 'string' && todo.repoId.trim() !== '' && todo.repoId === todo.repoId.trim() && !todo.repoId.includes('#') &&
    typeof todo.issueNumber === 'number' && Number.isSafeInteger(todo.issueNumber) && todo.issueNumber > 0 &&
    typeof todo.updatedAt === 'string' && !Number.isNaN(Date.parse(todo.updatedAt));
}

function readLegacyDueDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const dateOnly = value.slice(0, 10);
  if (!isDateOnly(dateOnly)) return undefined;
  if (value === dateOnly) return dateOnly;
  const isDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(value);
  return isDateTime && !Number.isNaN(Date.parse(value)) ? dateOnly : undefined;
}

function legacyMeta(todo: LegacyTodo): IssueLocalMeta | null {
  return normalizeMeta({
    priority: todo.priority,
    dueDate: readLegacyDueDate(todo.dueDate),
    note: todo.description,
    updatedAt: todo.updatedAt,
  });
}

export function migrateLinkedIssueTodos(accountId: string): boolean {
  const migrationKey = getIssueLocalMetaMigrationKey(accountId);
  if (getStorageString(migrationKey, '') === '1') return true;

  const metas = getIssueLocalMetaMap(accountId);
  const latestMetaByIssue = new Map<string, IssueLocalMeta>();
  getLegacyTodos(accountId).forEach((todo) => {
    if (!isLegacyTodo(todo)) return;
    const key = getIssueLocalMetaEntryKey(todo.repoId, todo.issueNumber);
    if (metas[key]) return;
    const meta = legacyMeta(todo);
    if (!meta) return;
    const existing = latestMetaByIssue.get(key);
    if (!existing || Date.parse(meta.updatedAt) > Date.parse(existing.updatedAt)) latestMetaByIssue.set(key, meta);
  });

  let changed = false;
  latestMetaByIssue.forEach((meta, key) => {
    metas[key] = meta;
    changed = true;
  });

  if (changed && !saveIssueLocalMetaMap(accountId, metas)) return false;
  return setStorageString(migrationKey, '1');
}
