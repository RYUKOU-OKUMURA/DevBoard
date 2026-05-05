# AGENTS.md

Codex向けの、このリポジトリで作業するときの最小ガイドです。詳細な実装計画は `docs/plans/major-rebuild-implementation-plan.md` を優先してください。

## Project Overview

DevBoardは、GitHubに慣れていない個人開発者・非エンジニア向けの「リポジトリ整理とGitHub練習ツール」です。

現在の大改修では、旧4カラムKanban中心のMVPから、以下を主導線にした初心者向けUIへ育て直します。

- リポジトリを1カラムで読みやすく整理する
- カードクリックでGitHubへ飛ばさず、DevBoard内の詳細パネルを開く
- リポジトリごとに目的、メモ、次にやること、自分の状態を保存する
- Issueを「やることカード」として練習し、DevBoard内だけにドラフト保存する
- 旧カンバン、Activity、Manual、TODO、AI、Workspace系は削除せず、初心者向け主導線から奥に置く

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend/hosting: Cloudflare Pages Functions, Cloudflare KV, GitHub OAuth/API proxy
- Tests/tools: Vitest, Testing Library, ESLint, lockfile-lint

## Key Files

- Main app: `src/App.tsx`
- Current board: `src/components/RepoBoard.tsx`
- Planned repository UI: `src/components/repositories/*`
- Planned practice UI: `src/components/practice/*`
- Shared types: `src/types/*`
- Storage helpers: `src/storage/*`, `src/utils/*Storage.ts`
- Cloudflare Functions: `functions/api/*`, `functions/lib/*`
- Main rebuild plan: `docs/plans/major-rebuild-implementation-plan.md`
- Original proposal: `docs/大改修案.md`
- MVP-out backlog: `docs/大改修MVP外バックログ.md`

## Commands

- Install: `npm ci`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm run test -- --run`
- Build: `npm run build`
- Full check: `npm run check:ci`

## Implementation Rules

- 実装前に必ず `docs/plans/major-rebuild-implementation-plan.md` の該当フェーズを確認する。
- 実装が完了したタスクは同計画書で `- [x]` に更新する。フェーズ完了時は見出しに `✅ 完了` を付ける。
- 旧 `execution_plan.md` に関係する既存MVP作業を触る場合のみ、そちらも整合を取る。
- 大きめの調査や並行できる確認では、サブエージェントを適宜使用する。
- 各フェーズ末、または影響範囲が広い変更後は `npm run check:ci` を実行する。
- React / Vite / Tailwind / ESLint のメジャー更新は、UI大改修と同じPRに混ぜない。

## Product Rules

- GitHub用語は初心者向け日本語とセットで表示する。
- カード全体クリックでGitHubへ外部遷移させない。外部遷移は明示的な「GitHubで開く」ボタンに限定する。
- 練習モードではGitHubに勝手に書き込まない。GitHub Issue作成を入れる場合は確認ダイアログを必須にする。
- `RepoUserMeta` と `PracticeIssueDraft` はlocalStorage中心で始め、保存keyはGitHubアカウント単位にスコープする。
- localStorageの不正JSONや古いデータで画面を壊さないよう、storage層で安全にフォールバックする。

## UI Rules

- セマンティック文字クラス（`text-title-2`, `text-body`, `text-body-sm`, `text-caption` など）を使い、`text-sm` などの直接指定を増やさない。
- spacingは `inset-*`, `stack-*`, `inline-*` を優先する。
- すべてのインタラクティブ要素に `src/lib/focusRing.ts` の方針を適用する。
- motionは控えめにし、`motion-reduce:animate-none` または `motion-reduce:transition-none` を併記する。
- メタリック表現や強いグラデーションは、hero、CTA、カードhover、モーダル程度に限定する。

## Sync Note

`AGENTS.md` と `CLAUDE.md` は同じ方針を保つ。片方を更新したら、もう片方も同期する。
