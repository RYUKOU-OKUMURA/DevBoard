import type {
  RepoProjectStage,
  RepoScheduleBucket,
  RepoUserMeta,
  RepoUserStatus,
  RepositoryMetaPatch,
} from '../types';
import { getStorageItem, removeStorageItem, setStorageItem } from '../utils/storage';

const REPOSITORY_META_STORAGE_PREFIX = 'repository-meta:';
const REPOSITORY_META_VERSION = 2;

type RepositoryMetaEnvelope = {
  version: number;
  records: RepoUserMeta[];
};

const USER_STATUS_VALUES = new Set<RepoUserStatus>([
  'unreviewed',
  'learning',
  'in_progress',
  'paused',
  'done',
]);

const PROJECT_STAGE_VALUES = new Set<RepoProjectStage>([
  'unassigned',
  'idea',
  'planning',
  'implementation',
  'testing',
  'released',
  'maintenance',
]);

const SCHEDULE_BUCKET_VALUES = new Set<RepoScheduleBucket>([
  'this_week',
  'next_week',
  'this_month',
  'next_month',
  'later',
  'unscheduled',
]);

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access repository metadata.');
  }
  return accountId;
}

export function getRepositoryMetaKey(accountId: string): string {
  return `${REPOSITORY_META_STORAGE_PREFIX}${assertAccountId(accountId)}`;
}

function isRepoUserStatus(value: unknown): value is RepoUserStatus {
  return typeof value === 'string' && USER_STATUS_VALUES.has(value as RepoUserStatus);
}

function isRepoProjectStage(value: unknown): value is RepoProjectStage {
  return typeof value === 'string' && PROJECT_STAGE_VALUES.has(value as RepoProjectStage);
}

function isRepoScheduleBucket(value: unknown): value is RepoScheduleBucket {
  return typeof value === 'string' && SCHEDULE_BUCKET_VALUES.has(value as RepoScheduleBucket);
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

function normalizeRepositoryMeta(value: unknown): RepoUserMeta | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const repoId = readString(record.repoId).trim();
  if (!repoId) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = readIsoString(record.createdAt, now);

  return {
    repoId,
    tracked: typeof record.tracked === 'boolean' ? record.tracked : true,
    status: isRepoUserStatus(record.status) ? record.status : 'unreviewed',
    stage: isRepoProjectStage(record.stage) ? record.stage : 'unassigned',
    scheduleBucket: isRepoScheduleBucket(record.scheduleBucket)
      ? record.scheduleBucket
      : 'unscheduled',
    purpose: readString(record.purpose),
    nextAction: readString(record.nextAction),
    note: readString(record.note),
    createdAt,
    updatedAt: readIsoString(record.updatedAt, createdAt),
  };
}

function parseRepositoryMetaEnvelope(value: unknown): RepoUserMeta[] | null {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as RepositoryMetaEnvelope).records)
      ? (value as RepositoryMetaEnvelope).records
      : null;

  if (!records) {
    return null;
  }

  const normalized = records
    .map((record) => normalizeRepositoryMeta(record))
    .filter((record): record is RepoUserMeta => record !== null);

  return normalized;
}

export function createDefaultRepositoryMeta(repoId: string, now = new Date().toISOString()): RepoUserMeta {
  return {
    repoId,
    tracked: false,
    status: 'unreviewed',
    stage: 'unassigned',
    scheduleBucket: 'unscheduled',
    purpose: '',
    nextAction: '',
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function getRepositoryMetas(accountId: string): RepoUserMeta[] {
  const key = getRepositoryMetaKey(accountId);
  const stored = getStorageItem<RepositoryMetaEnvelope | RepoUserMeta[]>(key, { version: REPOSITORY_META_VERSION, records: [] });
  const parsed = parseRepositoryMetaEnvelope(stored);

  if (parsed === null) {
    removeStorageItem(key);
    return [];
  }

  return parsed;
}

export function saveRepositoryMetas(accountId: string, metas: RepoUserMeta[]): boolean {
  const key = getRepositoryMetaKey(accountId);
  const dedupedByRepoId = new Map<string, RepoUserMeta>();

  metas.forEach((meta) => {
    const normalized = normalizeRepositoryMeta(meta);
    if (normalized) {
      dedupedByRepoId.set(normalized.repoId, normalized);
    }
  });

  const payload: RepositoryMetaEnvelope = {
    version: REPOSITORY_META_VERSION,
    records: Array.from(dedupedByRepoId.values()),
  };

  return setStorageItem(key, payload);
}

export function getRepositoryMetaMap(accountId: string): Record<string, RepoUserMeta> {
  return Object.fromEntries(getRepositoryMetas(accountId).map((meta) => [meta.repoId, meta]));
}

export function saveRepositoryMetaMap(accountId: string, metaByRepoId: Record<string, RepoUserMeta>): boolean {
  return saveRepositoryMetas(accountId, Object.values(metaByRepoId));
}

export function upsertRepositoryMeta(
  accountId: string,
  repoId: string,
  patch: RepositoryMetaPatch,
  now = new Date().toISOString()
): RepoUserMeta {
  const existing = getRepositoryMetaMap(accountId)[repoId];
  const base = existing ?? createDefaultRepositoryMeta(repoId, now);
  const next: RepoUserMeta = {
    repoId,
    tracked: patch.tracked ?? base.tracked,
    status: patch.status ?? base.status,
    stage: patch.stage ?? base.stage,
    scheduleBucket: patch.scheduleBucket ?? base.scheduleBucket,
    purpose: patch.purpose ?? base.purpose,
    nextAction: patch.nextAction ?? base.nextAction,
    note: patch.note ?? base.note,
    createdAt: base.createdAt,
    updatedAt: now,
  };

  saveRepositoryMetaMap(accountId, {
    ...getRepositoryMetaMap(accountId),
    [repoId]: next,
  });

  return next;
}

export function clearRepositoryMetas(accountId: string): boolean {
  return removeStorageItem(getRepositoryMetaKey(accountId));
}
