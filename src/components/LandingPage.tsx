import { useTheme } from '../contexts/ThemeContext';
import { useDesignSystem } from '../lib/designSystem';
import { focusRing } from '../lib/focusRing';

interface LandingPageProps {
  onContinue: () => void;
}

const FEATURES = [
  {
    title: 'GitHub リポジトリ連携',
    description:
      '重要なリポジトリをピン留めして一元管理。Pull Request や Issue の状況を即座に把握できます。',
  },
  {
    title: 'ボードビュー',
    description:
      'ドラッグ＆ドロップでタスクを整理。進行状況や担当者を見ながらボトルネックを発見できます。',
  },
  {
    title: 'セキュリティ対応',
    description:
      '最小権限のアクセスと監査ログで、信頼できる運用体制をサポートします。',
  },
];

const USE_CASES = [
  {
    label: '1',
    title: 'リポジトリ整理に',
    description: (
      <>
        増えていくリポジトリを日本語UI＆カンバンで整理し、<br />
        管理ストレスを軽減。
      </>
    ),
  },
  {
    label: '2',
    title: '優先順位を1画面で把握',
    description: (
      <>
        最新のIssue・プルリクを確認して、<br />
        即座に修正やタスクを実行することができる。
      </>
    ),
  },
  {
    label: '3',
    title: 'コンテンツ・教材管理にも',
    description: (
      <>
        公開されているリポジトリを集めて、<br />
        新たな開発や学習に活かす。
      </>
    ),
  },
];

export default function LandingPage({ onContinue }: LandingPageProps) {
  const { isDark } = useTheme();
  const { palette, componentStyles, auraGradient } = useDesignSystem(isDark);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8" style={{ background: palette.background }}>
      <main className="max-w-6xl w-full grid gap-stack-lg lg:grid-cols-[1.1fr_0.9fr]" style={{ color: palette.textPrimary }}>
        <section
          className="relative overflow-hidden rounded-[32px] border p-10"
          style={componentStyles.heroSection}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: auraGradient }} />
          <div className="relative z-10 flex flex-col gap-stack-lg">
            <div className="flex items-center gap-inline-md text-xs font-semibold uppercase tracking-[0.4em]" style={{ color: palette.textMuted }}>
              <span className="rounded-full bg-brand-purple px-inset-sm py-inset-xs text-[0.65rem] text-text-inverse">
                DevBoard へようこそ
              </span>
              <span aria-hidden className="h-px flex-1 rounded-full" style={{ background: palette.highlight }} />
            </div>
            <div className="space-y-4">
              <h1 className="text-display font-semibold md:text-display-lg" style={{ color: palette.textPrimary }}>
                リポジトリ管理を、<br />
                簡単に・直感的に。
              </h1>
              <p className="text-body" style={{ color: palette.textMuted }}>
                DevBoard は、GitHub リポジトリやタスクをまとめて可視化し、開発や進捗管理をスムーズにするカンバン型の開発ダッシュボードです。アプリの使い方や主要な機能を、洗練された UI で直感的に操作できます。
              </p>
            </div>
            <div className="grid gap-stack-sm md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border p-inset-lg hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-in-out motion-reduce:transition-none motion-reduce:transform-none"
                  style={componentStyles.featureCard}
                >
                  <h3 className="text-title-2 font-semibold" style={{ color: palette.textPrimary }}>
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-body-sm" style={{ color: palette.textMuted }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-stack-sm">
              <button
                type="button"
                onClick={onContinue}
                className={`inline-flex items-center gap-inline-md rounded-full px-inset-lg py-inset-sm text-title-3 font-semibold ${focusRing.default} ${focusRing.brand} motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none`}
                style={componentStyles.ctaButton}
              >
                ログインページへ進む
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 motion-reduce:transition-none"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <span className="text-caption" style={{ color: palette.textMuted }}>
                GitHub との連携はワンクリックで完了します。
              </span>
            </div>
          </div>
        </section>

        <aside
          className="flex h-full flex-col gap-stack-md rounded-[32px] border p-8"
          style={componentStyles.asideSection}
        >
          <div className="space-y-2">
            <h2 className="text-title-1 font-semibold" style={{ color: palette.textPrimary }}>
              DevBoard の主なユースケース
            </h2>
            <p className="text-body" style={{ color: palette.textMuted }}>
              スプリント計画からレビューまで、開発プロセス全体をカバーします。
            </p>
          </div>
            <div className="flex flex-col gap-stack-sm">
            {USE_CASES.map((useCase) => (
              <div key={useCase.label} className="flex items-start gap-inline-md">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold"
                  style={componentStyles.useCaseBadge}
                >
                  {useCase.label}
                </div>
                <div>
                  <h3 className="text-title-2 font-semibold" style={{ color: palette.textPrimary }}>
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-body-sm" style={{ color: palette.textMuted }}>
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border-2 border-dashed p-6"
            style={componentStyles.futureBox}
          >
            <h3 className="text-title-2 font-semibold mb-2" style={{ color: palette.textPrimary }}>
              今後の追加機能予定
            </h3>
            <ul className="text-body-sm space-y-2" style={{ color: palette.textMuted }}>
              <li>• <strong>本アプリからIssue・PullRequestを作成する機能</strong></li>
              <li>• <strong>Codex、Claude Codeをメンションで呼び出す機能</strong></li>
              <li>• <strong>ToDoや実装予定を作成する機能</strong></li>
            </ul>
          </div>

          <div className="pt-2">
            <a
              href="https://note.com/redcord/n/n8a9e8ba0e0f6?sub_rt=share_pb"
              className="group inline-flex items-center gap-inline-xs text-body-sm font-semibold"
              style={{ color: palette.accent }}
              target="_blank"
              rel="noreferrer"
            >
              DevBoard の詳細を見る
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </aside>
      </main>
    </div>
  );
}
