import type { ColumnKey, Repo, RepoScheduleBucket, RepoUserMeta } from '../../types';
import {
  ROADMAP_BUCKET_ORDER,
  createRoadmapItems,
} from './repositoryProgressModel';
import {
  REPOSITORY_SCHEDULE_BUCKET_OPTIONS,
  getRepositoryScheduleBucketLabel,
} from './repositoryMetaLabels';
import { RepositoryProgressRoadmapRow } from './RepositoryProgressRoadmapRow';

interface RepositoryProgressRoadmapProps {
  repos: Repo[];
  getMeta: (repoId: string) => RepoUserMeta | null;
  getAutoHealth: (repo: Repo) => ColumnKey;
  onOpenDetail: (repo: Repo) => void;
  onToggleTracked?: (repoId: string) => void;
  onShowAll?: () => void;
  isLoading?: boolean;
}

const ROADMAP_GRID_CLASS =
  'grid min-w-max grid-cols-[minmax(220px,320px)_repeat(6,minmax(160px,1fr))]';

function RoadmapSkeleton() {
  return (
    <div className={`${ROADMAP_GRID_CLASS}`} aria-label="ロードマップを読み込み中">
      {Array.from({ length: 14 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg border border-[var(--border-subtle)] bg-surface-secondary motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function EmptyRoadmap({ onShowAll }: { onShowAll?: () => void }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl">
      <div className="max-w-md text-center">
        <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">まだ進捗管理対象がありません</h2>
        <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
          リポジトリ一覧（すべて）から「進捗管理に追加」を選んでください。追加したものだけ、このロードマップに並びます。
        </p>
        {onShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="mt-stack-md inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-[var(--bg-secondary)]"
          >
            「すべて」を見る
          </button>
        )}
      </div>
    </div>
  );
}

export function RepositoryProgressRoadmap({
  repos,
  getMeta,
  getAutoHealth,
  onOpenDetail,
  onToggleTracked,
  onShowAll,
  isLoading = false,
}: RepositoryProgressRoadmapProps) {
  if (isLoading) {
    return <RoadmapSkeleton />;
  }

  const items = createRoadmapItems(repos, getMeta);

  if (items.length === 0) {
    return <EmptyRoadmap onShowAll={onShowAll} />;
  }

  const bucketLabel = (bucket: RepoScheduleBucket) =>
    REPOSITORY_SCHEDULE_BUCKET_OPTIONS.find((option) => option.value === bucket)?.label ??
    getRepositoryScheduleBucketLabel(bucket);

  return (
    <div>
      <p className="mb-stack-sm text-caption text-[var(--text-muted)]">
        日付単位ではなく、大まかな作業予定を表示しています。
      </p>
      <div className="overflow-x-auto">
        <div className={`${ROADMAP_GRID_CLASS}`}>
          <div className="contents">
            <div className="sticky top-0 z-20 border-b border-l border-[var(--border-subtle)] bg-surface-secondary px-inset-sm py-inset-xs text-caption font-semibold text-[var(--text-muted)]">
              プロジェクト
            </div>
            {ROADMAP_BUCKET_ORDER.map((bucket) => (
              <div
                key={bucket}
                className="sticky top-0 z-20 border-b border-l border-[var(--border-subtle)] bg-surface-secondary px-inset-sm py-inset-xs text-caption font-semibold text-[var(--text-muted)]"
              >
                {bucketLabel(bucket)}
              </div>
            ))}
          </div>

          {items.map((item) => (
            <RepositoryProgressRoadmapRow
              key={item.repo.id}
              item={item}
              autoHealth={getAutoHealth(item.repo)}
              onOpenDetail={onOpenDetail}
              onToggleTracked={onToggleTracked}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
