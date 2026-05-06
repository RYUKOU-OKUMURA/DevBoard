import { focusRing } from '../../lib/focusRing';

interface AdvancedHomeProps {
  activityCount: number;
  manualRepoCount: number;
  onOpenActivity: () => void;
  onOpenManualRepos: () => void;
  onOpenLegacyBoard: () => void;
}

interface AdvancedCardProps {
  title: string;
  description: string;
  detail: string;
  actionLabel?: string;
  badge?: string;
  onClick?: () => void;
}

function AdvancedCard({ title, description, detail, actionLabel, badge, onClick }: AdvancedCardProps) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm">
      <div className="flex h-full flex-col gap-stack-md">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-inline-sm">
            <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">{title}</h2>
            {badge && (
              <span className="rounded-full bg-surface-secondary px-inset-sm py-inset-xs text-caption font-semibold text-[var(--text-muted)]">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
          <p className="mt-stack-sm text-caption leading-relaxed text-[var(--text-muted)]">{detail}</p>
        </div>
        {actionLabel && onClick && (
          <button
            type="button"
            onClick={onClick}
            className={`inline-flex w-fit items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

export function AdvancedHome({
  activityCount,
  manualRepoCount,
  onOpenActivity,
  onOpenManualRepos,
  onOpenLegacyBoard,
}: AdvancedHomeProps) {
  return (
    <div className="h-full overflow-auto bg-surface-app">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-stack-lg px-inset-lg py-inset-lg">
        <header className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm">
          <p className="text-caption font-semibold text-[var(--text-muted)]">Advanced</p>
          <h1 className="mt-stack-xs text-title-1 font-bold text-[var(--text-primary)]">高度な機能</h1>
          <p className="mt-stack-sm max-w-2xl text-body-sm leading-relaxed text-[var(--text-secondary)]">
            保存ビュー、詳しいカンバン、Activity、TODO、AI連携などはここにまとめました。普段は「リポジトリ」と「練習」だけで進められます。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-stack-md lg:grid-cols-2">
          <AdvancedCard
            title="旧カンバンと保存ビュー"
            description="列管理、保存プリセット、タグ管理、グリッド/リスト切り替えを使う整理画面です。"
            detail="既存カンバンは削除せず、高度な整理が必要なときだけ開く導線にしています。Workspace下部パネルもこの画面から使います。"
            actionLabel="詳しいカンバンを開く"
            onClick={onOpenLegacyBoard}
          />

          <AdvancedCard
            title="Activity / 詳しい記録"
            description="GitHub上のIssueやPull Requestの動き、TODOへの変換を詳しく確認する画面です。"
            detail="初心者向けの主画面には出しすぎず、必要になったときの確認用として残しています。"
            actionLabel="記録を詳しく見る"
            badge={activityCount > 0 ? `${activityCount}件` : undefined}
            onClick={onOpenActivity}
          />

          <AdvancedCard
            title="手動追加リポジトリ"
            description="GitHubログインで取得できないリポジトリや、別扱いにしたいリポジトリを管理します。"
            detail="独立した追加・削除・列設定の既存画面として残し、通常のリポジトリ一覧とは分けています。"
            actionLabel="手動追加を管理"
            badge={manualRepoCount > 0 ? `${manualRepoCount}件` : undefined}
            onClick={onOpenManualRepos}
          />

          <AdvancedCard
            title="TODO / AI / GitHub Actions"
            description="TODOボード、AI実装コマンド、実行履歴、GitHub Actions連携は上級者向け候補として扱います。"
            detail="独立した「やること」画面の本格化やAI連携の拡張はMVP外に置き、現時点では旧カンバンのWorkspace内で使う方針です。"
          />
        </div>
      </div>
    </div>
  );
}
