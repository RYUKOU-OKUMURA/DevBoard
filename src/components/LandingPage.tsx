import { useTheme } from '../contexts/ThemeContext';
import { useDesignSystem } from '../lib/designSystem';
import { motion } from 'framer-motion';
import { PremiumButton } from './ui/PremiumButton';

interface LandingPageProps {
  onContinue: () => void;
}

const FEATURES = [
  {
    title: 'GitHub リポジトリ連携',
    titleWithBreak: true,
    description:
      '重要なリポジトリをピン留めして一元管理。Pull Request や Issue の状況を即座に把握できます。',
  },
  {
    title: 'ボードビュー',
    titleWithBreak: false,
    description:
      'ドラッグ＆ドロップでタスクを整理。進行状況や担当者を見ながらボトルネックを発見できます。',
  },
  {
    title: 'セキュリティ対応',
    titleWithBreak: false,
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
      <main className="max-w-[1400px] w-full grid gap-stack-lg lg:grid-cols-[1.1fr_0.9fr]" style={{ color: palette.textPrimary }}>
        <section
          className="relative overflow-hidden rounded-[32px] border p-10"
          style={componentStyles.heroSection}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: auraGradient }} />
          <div
            className="pointer-events-none absolute inset-0 opacity-40 motion-reduce:animate-none"
            style={{
              background: 'var(--brand-gradient-mesh)',
              backgroundSize: '200% 200%',
              animation: 'gradient-flow 8s ease infinite',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-30 motion-reduce:animate-none"
            style={{ backgroundImage: 'var(--metallic-noise)' }}
          />
          <div
            className="pointer-events-none absolute top-20 left-10 w-64 h-64 rounded-full bg-brand-purple-soft blur-3xl opacity-90 animate-float-gentle motion-reduce:animate-none"
            aria-hidden
            style={{ zIndex: 1 }}
          />
          <div
            className="pointer-events-none absolute bottom-20 right-10 w-80 h-80 rounded-full bg-brand-red-soft blur-3xl opacity-90 animate-float-gentle motion-reduce:animate-none"
            aria-hidden
            style={{ animationDelay: '2s', zIndex: 1 }}
          />
          <div className="relative z-10 flex flex-col gap-stack-lg">
            <div className="flex items-center gap-inline-md text-caption font-semibold uppercase tracking-[0.4em]" style={{ color: palette.textMuted }}>
              <span className="rounded-full bg-brand-purple px-inset-sm py-inset-xs text-[0.65rem] text-text-inverse">
                DevBoard へようこそ
              </span>
              <span aria-hidden className="h-px flex-1 rounded-full" style={{ background: palette.highlight }} />
            </div>
            <div className="space-y-4">
              <h1
                className="mb-stack-md text-title-2 font-bold motion-reduce:animate-none sm:text-display lg:text-display-lg"
                style={{
                  background: 'var(--brand-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradient-pulse 3s ease-in-out infinite',
                  backgroundSize: '200% auto',
                  color: palette.textPrimary,
                }}
              >
                リポジトリ管理を、<br />
                簡単に・直感的に。
              </h1>
              <p className="text-body" style={{ color: palette.textMuted }}>
                DevBoard は、GitHub リポジトリやタスクをまとめて可視化し、開発や進捗管理をスムーズにするカンバン型の開発ダッシュボードです。アプリの使い方や主要な機能を、洗練された UI で直感的に操作できます。
              </p>
            </div>
            <div className="grid gap-stack-sm md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="group relative rounded-[26px] p-[1px]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.45,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(229,57,53,0.85), rgba(103,58,183,0.85))',
                    boxShadow: '0 25px 60px rgba(103,58,183,0.25)',
                  }}
                >
                  <div
                    className="relative rounded-[24px] border p-inset-lg overflow-hidden"
                    style={componentStyles.featureCard}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition duration-500 group-hover:opacity-70"
                      style={{
                        background:
                          'linear-gradient(140deg, rgba(229,57,53,0.4), rgba(103,58,183,0.35))',
                        mixBlendMode: 'screen',
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition duration-500 group-hover:opacity-60"
                      style={{
                        backgroundImage: 'var(--metallic-noise)',
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition duration-500 group-hover:opacity-90"
                      style={{
                        animation: 'color-bloom 3s ease-in-out infinite',
                        boxShadow: '0 0 40px var(--brand-purple-glow)',
                      }}
                    />
                    <div className="relative z-10 flex flex-col gap-stack-sm">
                      <h3 className={`text-title-3 font-semibold ${feature.title === 'セキュリティ対応' ? 'whitespace-nowrap' : ''}`} style={{ color: palette.textPrimary }}>
                        {feature.titleWithBreak ? (
                          <>
                            GitHub<br />
                            リポジトリ連携
                          </>
                        ) : (
                          feature.title
                        )}
                      </h3>
                      <p className="mt-3 text-body-sm" style={{ color: palette.textMuted }}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-stack-sm">
              <PremiumButton onClick={onContinue}>
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
              </PremiumButton>
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
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-title-3 font-semibold"
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
