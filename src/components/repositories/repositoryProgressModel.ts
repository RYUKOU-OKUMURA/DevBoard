import type {
  Repo,
  RepoScheduleBucket,
  RepoUserMeta,
  RepoUserStatus,
} from '../../types';

/**
 * メタデータが未保存のリポジトリを表示するための仮想メタデータを返す。
 * 戻り値はlocalStorageへ保存せず、表示専用の初期値（tracked: false）とする。
 */
export function resolveRepositoryMeta(
  repoId: string,
  meta: RepoUserMeta | null | undefined
): RepoUserMeta {
  if (meta) {
    return meta;
  }

  const now = new Date(0).toISOString();

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

export const KANBAN_STATUS_ORDER: RepoUserStatus[] = [
  'in_progress',
  'paused',
  'learning',
  'unreviewed',
  'done',
];

export const ROADMAP_BUCKET_ORDER: RepoScheduleBucket[] = [
  'this_week',
  'next_week',
  'this_month',
  'next_month',
  'later',
  'unscheduled',
];

export type RepositoryProgressItem = {
  repo: Repo;
  meta: RepoUserMeta;
};

/**
 * tracked なリポジトリだけを自分の状態（カンバン列）でグループ化する。
 * 未設定・除外済みのリポジトリは仮想メタデータの tracked: false で自動的に除外される。
 */
export function groupRepositoriesByStatus(
  repos: Repo[],
  getMeta: (repoId: string) => RepoUserMeta | null
): Record<RepoUserStatus, RepositoryProgressItem[]> {
  const groups: Record<RepoUserStatus, RepositoryProgressItem[]> = {
    unreviewed: [],
    learning: [],
    in_progress: [],
    paused: [],
    done: [],
  };

  repos.forEach((repo) => {
    const meta = resolveRepositoryMeta(repo.id, getMeta(repo.id));
    if (!meta.tracked) {
      return;
    }

    groups[meta.status].push({ repo, meta });
  });

  return groups;
}

/**
 * ロードマップ用に、tracked なリポジトリを1リポジトリ1行のアイテムとして返す。
 */
export function createRoadmapItems(
  repos: Repo[],
  getMeta: (repoId: string) => RepoUserMeta | null
): RepositoryProgressItem[] {
  return repos
    .map((repo) => ({
      repo,
      meta: resolveRepositoryMeta(repo.id, getMeta(repo.id)),
    }))
    .filter((item) => item.meta.tracked);
}
