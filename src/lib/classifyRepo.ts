import type { Repo, ColumnKey } from "../types";

export type ClassifyOptions = {
  /** Active threshold in days (inclusive). Defaults to 60 days. */
  activeThreshold?: number;
  /** Stale threshold in days (inclusive). Defaults to 180 days. */
  staleThreshold?: number;
  /** Reference date used to compare against pushedAt. Defaults to now. */
  now?: Date;
};

const DEFAULT_ACTIVE_THRESHOLD = 60;
const DEFAULT_STALE_THRESHOLD = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getThresholdValue(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function differenceInDays(from: Date, to: Date): number {
  const diffMs = from.getTime() - to.getTime();
  if (!Number.isFinite(diffMs)) {
    return Number.NaN;
  }
  return diffMs / MS_PER_DAY;
}

/**
 * リポジトリの最終更新日時とアーカイブ状態に基づいて列分類を判定する。
 */
export function classifyRepo(repo: Repo, options: ClassifyOptions = {}): ColumnKey {
  if (repo.isArchived) {
    return "Archived";
  }

  const activeThreshold = getThresholdValue(options.activeThreshold, DEFAULT_ACTIVE_THRESHOLD);
  const staleThreshold = getThresholdValue(options.staleThreshold, DEFAULT_STALE_THRESHOLD);
  const referenceDate = options.now instanceof Date && !Number.isNaN(options.now.getTime()) ? options.now : new Date();

  if (staleThreshold < activeThreshold) {
    throw new Error("staleThreshold must be greater than or equal to activeThreshold");
  }

  const pushedDate = new Date(repo.pushedAt);
  if (Number.isNaN(pushedDate.getTime())) {
    return "Dormant";
  }

  const rawDiffDays = differenceInDays(referenceDate, pushedDate);
  if (Number.isNaN(rawDiffDays)) {
    return "Dormant";
  }

  const diffDays = Math.max(0, rawDiffDays);

  if (diffDays <= activeThreshold) {
    return "Active";
  }

  if (diffDays <= staleThreshold) {
    return "Stale";
  }

  return "Dormant";
}
