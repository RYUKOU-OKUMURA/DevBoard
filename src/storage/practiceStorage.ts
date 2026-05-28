import type { PracticeIssueDraft, PracticePullRequestDraft, PracticeSyncStatus } from '../types';
import { getStorageItem, removeStorageItem, setStorageItem } from '../utils/storage';

const PRACTICE_ISSUE_STORAGE_PREFIX = 'practice-issues:';
const PRACTICE_ISSUE_STORAGE_VERSION = 1;
const PRACTICE_PULL_REQUEST_STORAGE_PREFIX = 'practice-pull-requests:';
const PRACTICE_PULL_REQUEST_STORAGE_VERSION = 1;

type PracticeIssueEnvelope = {
  version: number;
  records: PracticeIssueDraft[];
};

type PracticePullRequestEnvelope = {
  version: number;
  records: PracticePullRequestDraft[];
};

const SYNC_STATUS_VALUES = new Set<PracticeSyncStatus>(['local_only', 'synced', 'failed']);

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access practice issue drafts.');
  }
  return accountId;
}

export function getPracticeIssueDraftsKey(accountId: string): string {
  return `${PRACTICE_ISSUE_STORAGE_PREFIX}${assertAccountId(accountId)}`;
}

export function getPracticePullRequestDraftsKey(accountId: string): string {
  return `${PRACTICE_PULL_REQUEST_STORAGE_PREFIX}${assertAccountId(accountId)}`;
}

function isPracticeSyncStatus(value: unknown): value is PracticeSyncStatus {
  return typeof value === 'string' && SYNC_STATUS_VALUES.has(value as PracticeSyncStatus);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readIsoString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : value;
}

function readCriteria(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => readString(item).trim())
    .filter((item) => item.length > 0);
}

function readOptionalString(value: unknown): string | null {
  const normalized = readString(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function readOptionalPositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return value;
}

function normalizePracticeIssueDraft(value: unknown): PracticeIssueDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = readString(record.id).trim();
  const repoId = readString(record.repoId).trim();
  if (!id || !repoId) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = readIsoString(record.createdAt, now);

  return {
    id,
    repoId,
    title: readString(record.title),
    reason: readString(record.reason),
    doneCriteria: readCriteria(record.doneCriteria),
    generatedMarkdown: readString(record.generatedMarkdown),
    syncStatus: isPracticeSyncStatus(record.syncStatus) ? record.syncStatus : 'local_only',
    githubIssueNumber: readOptionalPositiveInteger(record.githubIssueNumber),
    githubIssueUrl: readOptionalString(record.githubIssueUrl) ?? undefined,
    createdAt,
    updatedAt: readIsoString(record.updatedAt, createdAt),
  };
}

function parsePracticeIssueEnvelope(value: unknown): PracticeIssueDraft[] | null {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as PracticeIssueEnvelope).records)
      ? (value as PracticeIssueEnvelope).records
      : null;

  if (!records) {
    return null;
  }

  return records
    .map((record) => normalizePracticeIssueDraft(record))
    .filter((record): record is PracticeIssueDraft => record !== null);
}

function normalizePracticePullRequestDraft(value: unknown): PracticePullRequestDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = readString(record.id).trim();
  const repoId = readString(record.repoId).trim();
  if (!id || !repoId) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = readIsoString(record.createdAt, now);

  return {
    id,
    repoId,
    title: readString(record.title),
    changedItems: readCriteria(record.changedItems),
    reviewPoints: readCriteria(record.reviewPoints),
    relatedIssueDraftId: readOptionalString(record.relatedIssueDraftId),
    generatedMarkdown: readString(record.generatedMarkdown),
    syncStatus: isPracticeSyncStatus(record.syncStatus) ? record.syncStatus : 'local_only',
    createdAt,
    updatedAt: readIsoString(record.updatedAt, createdAt),
  };
}

function parsePracticePullRequestEnvelope(value: unknown): PracticePullRequestDraft[] | null {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as PracticePullRequestEnvelope).records)
      ? (value as PracticePullRequestEnvelope).records
      : null;

  if (!records) {
    return null;
  }

  return records
    .map((record) => normalizePracticePullRequestDraft(record))
    .filter((record): record is PracticePullRequestDraft => record !== null);
}

export function createPracticeIssueDraft(input: {
  id: string;
  repoId: string;
  title: string;
  reason: string;
  doneCriteria: string[];
  generatedMarkdown: string;
  now?: string;
}): PracticeIssueDraft {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    repoId: input.repoId,
    title: input.title,
    reason: input.reason,
    doneCriteria: input.doneCriteria,
    generatedMarkdown: input.generatedMarkdown,
    syncStatus: 'local_only',
    createdAt: now,
    updatedAt: now,
  };
}

export function createPracticePullRequestDraft(input: {
  id: string;
  repoId: string;
  title: string;
  changedItems: string[];
  reviewPoints: string[];
  relatedIssueDraftId?: string | null;
  generatedMarkdown: string;
  now?: string;
}): PracticePullRequestDraft {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    repoId: input.repoId,
    title: input.title,
    changedItems: input.changedItems,
    reviewPoints: input.reviewPoints,
    relatedIssueDraftId: input.relatedIssueDraftId ?? null,
    generatedMarkdown: input.generatedMarkdown,
    syncStatus: 'local_only',
    createdAt: now,
    updatedAt: now,
  };
}

export function getPracticeIssueDrafts(accountId: string): PracticeIssueDraft[] {
  const key = getPracticeIssueDraftsKey(accountId);
  const stored = getStorageItem<PracticeIssueEnvelope | PracticeIssueDraft[]>(key, {
    version: PRACTICE_ISSUE_STORAGE_VERSION,
    records: [],
  });
  const parsed = parsePracticeIssueEnvelope(stored);

  if (parsed === null) {
    removeStorageItem(key);
    return [];
  }

  return parsed;
}

export function getPracticePullRequestDrafts(accountId: string): PracticePullRequestDraft[] {
  const key = getPracticePullRequestDraftsKey(accountId);
  const stored = getStorageItem<PracticePullRequestEnvelope | PracticePullRequestDraft[]>(key, {
    version: PRACTICE_PULL_REQUEST_STORAGE_VERSION,
    records: [],
  });
  const parsed = parsePracticePullRequestEnvelope(stored);

  if (parsed === null) {
    removeStorageItem(key);
    return [];
  }

  return parsed;
}

export function savePracticeIssueDrafts(accountId: string, drafts: PracticeIssueDraft[]): boolean {
  const key = getPracticeIssueDraftsKey(accountId);
  const dedupedById = new Map<string, PracticeIssueDraft>();

  drafts.forEach((draft) => {
    const normalized = normalizePracticeIssueDraft(draft);
    if (normalized) {
      dedupedById.set(normalized.id, normalized);
    }
  });

  const payload: PracticeIssueEnvelope = {
    version: PRACTICE_ISSUE_STORAGE_VERSION,
    records: Array.from(dedupedById.values()),
  };

  return setStorageItem(key, payload);
}

export function savePracticePullRequestDrafts(accountId: string, drafts: PracticePullRequestDraft[]): boolean {
  const key = getPracticePullRequestDraftsKey(accountId);
  const dedupedById = new Map<string, PracticePullRequestDraft>();

  drafts.forEach((draft) => {
    const normalized = normalizePracticePullRequestDraft(draft);
    if (normalized) {
      dedupedById.set(normalized.id, normalized);
    }
  });

  const payload: PracticePullRequestEnvelope = {
    version: PRACTICE_PULL_REQUEST_STORAGE_VERSION,
    records: Array.from(dedupedById.values()),
  };

  return setStorageItem(key, payload);
}

export function getPracticeIssueDraftsByRepoId(accountId: string): Record<string, PracticeIssueDraft[]> {
  return getPracticeIssueDrafts(accountId).reduce<Record<string, PracticeIssueDraft[]>>((grouped, draft) => {
    grouped[draft.repoId] = [...(grouped[draft.repoId] ?? []), draft];
    return grouped;
  }, {});
}

export function getPracticePullRequestDraftsByRepoId(accountId: string): Record<string, PracticePullRequestDraft[]> {
  return getPracticePullRequestDrafts(accountId).reduce<Record<string, PracticePullRequestDraft[]>>((grouped, draft) => {
    grouped[draft.repoId] = [...(grouped[draft.repoId] ?? []), draft];
    return grouped;
  }, {});
}

export function clearPracticeIssueDrafts(accountId: string): boolean {
  return removeStorageItem(getPracticeIssueDraftsKey(accountId));
}

export function clearPracticePullRequestDrafts(accountId: string): boolean {
  return removeStorageItem(getPracticePullRequestDraftsKey(accountId));
}
