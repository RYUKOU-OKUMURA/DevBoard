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
    description: '増えていくリポジトリを日本語UI＆カンバンで整理し、管理ストレスを軽減。',
  },
  {
    label: '2',
    title: '優先順位を1画面で把握',
    description: '最新のIssue・プルリクを確認して、即座に修正やタスクを実行することができる。',
  },
  {
    label: '3',
    title: 'コンテンツ・教材管理にも',
    description: '公開されているリポジトリを集めて、新たな開発や学習に活かす。',
  },
];

export default function LandingPage({ onContinue }: LandingPageProps) {
  const { isDark } = useTheme();

  const palette = isDark
    ? {
        background:
          'radial-gradient(circle at top left, rgba(56, 189, 248, 0.25), transparent 55%), radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.22), transparent 55%), #0f172a',
        textPrimary: '#f8fafc',
        textMuted: 'rgba(248, 250, 252, 0.78)',
        badgeBg: 'rgba(59, 130, 246, 0.18)',
        heroBg: 'rgba(15, 23, 42, 0.68)',
        heroBorder: 'rgba(148, 163, 184, 0.18)',
        featureBg: 'rgba(30, 41, 59, 0.75)',
        featureBorder: 'rgba(148, 163, 184, 0.18)',
        previewBg: 'rgba(15, 23, 42, 0.82)',
        previewBorder: 'rgba(148, 163, 184, 0.18)',
        previewHeaderBg: 'linear-gradient(135deg, #1e293b, #0f172a)',
        previewBodyText: 'rgba(226, 232, 240, 0.78)',
        callToActionText: '#0f172a',
        callToActionShadow: '0 22px 40px rgba(14, 165, 233, 0.32)',
      }
    : {
        background:
          'radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 55%), radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.12), transparent 60%), #dfe7ff',
        textPrimary: '#0f172a',
        textMuted: 'rgba(15, 23, 42, 0.7)',
        badgeBg: 'rgba(59, 130, 246, 0.16)',
        heroBg: 'rgba(255, 255, 255, 0.82)',
        heroBorder: 'rgba(148, 163, 184, 0.25)',
        featureBg: 'rgba(255, 255, 255, 0.85)',
        featureBorder: 'rgba(71, 85, 105, 0.12)',
        previewBg: 'rgba(255, 255, 255, 0.96)',
        previewBorder: 'rgba(148, 163, 184, 0.2)',
        previewHeaderBg: 'linear-gradient(135deg, #1e293b, #1f2a45)',
        previewBodyText: 'rgba(15, 23, 42, 0.75)',
        callToActionText: '#0f172a',
        callToActionShadow: '0 18px 38px rgba(56, 189, 248, 0.28)',
      };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 transition-colors"
      style={{ background: palette.background, color: palette.textPrimary }}
    >
      <main className="max-w-6xl w-full grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section
          className="relative overflow-hidden rounded-3xl p-10 sm:p-12 backdrop-blur-2xl shadow-lg"
          style={{ background: palette.heroBg, border: `1px solid ${palette.heroBorder}` }}
        >
          <div className="relative z-10">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-wide"
              style={{ background: palette.badgeBg, color: palette.textMuted }}
            >
              DevBoard へようこそ
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-5xl" style={{ color: palette.textPrimary }}>
              リポジトリ管理をかんたんに
            </h1>
            <p className="mt-5 text-base leading-relaxed md:text-lg" style={{ color: palette.textMuted }}>
              DevBoard は、GitHub リポジトリやタスクをまとめて可視化し、開発や進捗管理をスムーズにするカンバン型の開発ダッシュボードです。アプリの使い方や主要な機能を、洗練された UI で直感的に操作できます。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
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

          <div className="relative z-10 mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1"
                style={{ background: palette.featureBg, border: `1px solid ${palette.featureBorder}` }}
              >
                <h3 className="text-lg font-semibold" style={{ color: palette.textPrimary }}>
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: palette.textMuted }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <aside
          className="flex h-full flex-col overflow-hidden rounded-3xl shadow-xl backdrop-blur-lg"
          style={{ background: palette.previewBg, border: `1px solid ${palette.previewBorder}` }}
        >
          <div className="px-8 py-7" style={{ background: palette.previewHeaderBg, color: '#f8fafc' }}>
            <h2 className="text-xl font-semibold">DevBoard の主なユースケース</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              スプリント計画からレビューまで、開発プロセス全体をカバーします。
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-6 px-8 py-8">
            {USE_CASES.map((useCase) => (
              <div key={useCase.label} className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold"
                  style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    color: isDark ? '#0f172a' : '#0f172a',
                  }}
                >
                  {useCase.label}
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: palette.textPrimary }}>
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: palette.previewBodyText }}>
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}

            {/* 今後の追加機能予定 */}
            <div className="mt-8 p-6 rounded-2xl border-2 border-dashed"
                 style={{
                   background: isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.02)',
                   borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.2)',
                 }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: palette.textPrimary }}>
                今後の追加機能予定
              </h3>
              <ul className="text-sm leading-relaxed space-y-2" style={{ color: palette.previewBodyText }}>
                <li>• <strong>本アプリからIssue・PullRequestを作成する機能</strong></li>
                <li>• <strong>Codex、Claude Codeをメンションで呼び出す機能</strong></li>
                <li>• <strong>ToDoや実装予定を作成する機能</strong></li>
              </ul>
            </div>
          </div>
          <div className="px-8 pb-8">
            <a
              href="https://note.com/redcord/n/n8a9e8ba0e0f6?sub_rt=share_pb"
              className="group inline-flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: '#38bdf8' }}
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
