import { useTheme } from '../contexts/ThemeContext';

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

  const palette = {
    background: isDark
      ? 'linear-gradient(180deg, #05070f 0%, #0a1224 45%, #060712 100%)'
      : 'linear-gradient(180deg, #f6f2ff 0%, #ede4ff 55%, #eef2ff 100%)',
    hero: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    heroBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(81, 45, 168, 0.2)',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? 'rgba(248, 250, 252, 0.78)' : 'rgba(15, 23, 42, 0.7)',
    featureBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.8)',
    featureBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.18)',
    highlight: 'var(--color-1-soft)',
    accent: 'var(--color-1)',
    accentGlow: 'var(--color-1-glow)',
    accentGradient: 'linear-gradient(135deg, var(--color-1), #7c4dff)',
    callToActionText: '#ffffff',
    callToActionShadow: '0 22px 45px rgba(81, 45, 168, 0.35)',
  };

  const auraGradient = isDark
    ? `radial-gradient(circle at 15% -10%, ${palette.highlight}, transparent 40%), radial-gradient(circle at 90% 5%, ${palette.accentGlow}, transparent 50%)`
    : `radial-gradient(circle at 20% -5%, ${palette.highlight}, transparent 45%), radial-gradient(circle at 70% -10%, ${palette.accentGlow}, transparent 55%)`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8" style={{ background: palette.background }}>
      <main className="max-w-6xl w-full grid gap-10 lg:grid-cols-[1.1fr_0.9fr]" style={{ color: palette.textPrimary }}>
        <section
          className="relative overflow-hidden rounded-[32px] border p-10 shadow-[0_25px_60px_rgba(15,23,42,0.25)]"
          style={{ background: palette.hero, borderColor: palette.heroBorder }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: auraGradient }} />
          <div className="relative z-10 flex flex-col gap-10">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em]" style={{ color: palette.textMuted }}>
              <span>DevBoard へようこそ</span>
              <span aria-hidden className="h-px flex-1 rounded-full" style={{ background: palette.highlight }} />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl" style={{ color: palette.textPrimary }}>
                リポジトリ管理を、<br />
                簡単に・直感的に。
              </h1>
              <p className="text-base leading-relaxed md:text-lg" style={{ color: palette.textMuted }}>
                DevBoard は、GitHub リポジトリやタスクをまとめて可視化し、開発や進捗管理をスムーズにするカンバン型の開発ダッシュボードです。アプリの使い方や主要な機能を、洗練された UI で直感的に操作できます。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border p-5 transition hover:-translate-y-0.5"
                  style={{ background: palette.featureBg, borderColor: palette.featureBorder }}
                >
                  <h3 className="text-base font-semibold" style={{ color: palette.textPrimary }}>
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: palette.textMuted }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                style={{
                  background: palette.accentGradient,
                  color: palette.callToActionText,
                  boxShadow: palette.callToActionShadow,
                }}
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
                  className="transition-transform duration-200"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <span className="text-sm" style={{ color: palette.textMuted }}>
                GitHub との連携はワンクリックで完了します。
              </span>
            </div>
          </div>
        </section>

        <aside
          className="flex h-full flex-col gap-6 rounded-[32px] border p-8 shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(148, 163, 184, 0.2)',
          }}
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold" style={{ color: palette.textPrimary }}>
              DevBoard の主なユースケース
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: palette.textMuted }}>
              スプリント計画からレビューまで、開発プロセス全体をカバーします。
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {USE_CASES.map((useCase) => (
              <div key={useCase.label} className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold"
                  style={{ background: palette.highlight, color: palette.accent }}
                >
                  {useCase.label}
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: palette.textPrimary }}>
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: palette.textMuted }}>
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border-2 border-dashed p-6"
            style={{
              borderColor: palette.accentGlow,
              background: isDark ? 'rgba(81, 45, 168, 0.08)' : 'rgba(81, 45, 168, 0.08)',
            }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: palette.textPrimary }}>
              今後の追加機能予定
            </h3>
            <ul className="text-sm leading-relaxed space-y-2" style={{ color: palette.textMuted }}>
              <li>• <strong>本アプリからIssue・PullRequestを作成する機能</strong></li>
              <li>• <strong>Codex、Claude Codeをメンションで呼び出す機能</strong></li>
              <li>• <strong>ToDoや実装予定を作成する機能</strong></li>
            </ul>
          </div>

          <div className="pt-2">
            <a
              href="https://note.com/redcord/n/n8a9e8ba0e0f6?sub_rt=share_pb"
              className="group inline-flex items-center gap-2 text-sm font-semibold"
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
