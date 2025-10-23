import type { Repo, ColumnKey } from "../types";
import { differenceInDays, isValidDate } from "../utils/date";

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

function getThresholdValue(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
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
  const referenceDate = options.now && isValidDate(options.now) ? options.now : new Date();

  if (staleThreshold < activeThreshold) {
    throw new Error("staleThreshold must be greater than or equal to activeThreshold");
  }

  const pushedDate = new Date(repo.pushedAt);
  if (!isValidDate(pushedDate)) {
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
