# DevBoard 大改修 実装計画

作成日: 2026-05-05
参照: `docs/大改修案.md`, `docs/大改修MVP外バックログ.md`, `execution_plan.md`

## 1. 目的

DevBoardを、従来のカンバン中心のリポジトリ一覧から、GitHubに慣れていない人でも使いやすい「リポジトリ整理とGitHub練習ツール」へ育て直す。

最初のMVPでは、以下を優先する。

- リポジトリを1カラムで読みやすく整理できる
- カードクリックでGitHubへ勝手に遷移せず、DevBoard内で詳細を見られる
- リポジトリごとに目的、メモ、次にやること、自分の状態を保存できる
- Issueを「やることカード」として練習し、DevBoard内にドラフト保存できる
- 既存の高度機能は削除せず、初心者向け主導線からは前面に出しすぎない

## 2. 進捗管理ルール

- 実装が完了したタスクは `- [x]` に変更する。
- フェーズ内の全タスクが完了したら、フェーズ見出し末尾に `✅ 完了` を付ける。
- 各フェーズの最後に、必ず `npm run check:ci` または該当範囲の検証コマンドを実行する。
- React / Vite / Tailwind / ESLint のメジャーアップデートは、MVPの主要UIが安定するまで別フェーズに分離する。

## 3. MVP完了ライン

- [ ] ログイン後、最初にリポジトリを理解しやすい画面が表示される。
- [ ] リポジトリが1カラム一覧で読める。
- [ ] カードクリックでDevBoard内の詳細パネルが開く。
- [ ] GitHubへの外部遷移は明示的な「GitHubで開く」ボタンからのみ起きる。
- [ ] リポジトリごとの目的、メモ、次にやること、自分の状態が保存・復元できる。
- [ ] Issue練習ドラフトを作成し、Issue風Markdownを生成できる。
- [ ] 練習モードではGitHubに勝手にデータを作成しない。
- [ ] 旧カンバン、Activity、Manual、TODO、AI、Workspace系の既存機能が初心者向け主導線を邪魔しない。
- [ ] `npm run check:ci` が通る。

## 4. フェーズ別タスク

### フェーズ 0: 大改修前の検証基盤確認 ✅ 完了

目的: 大改修に入る前に、最低限の検証コマンドを信頼できる状態にする。

- [x] `typecheck` script を追加する。
- [x] `check:ci` script に `lint:lockfile`, `lint`, `typecheck`, `test -- --run`, `build` を含める。
- [x] `npx tsc --noEmit` 相当で失敗していた既存の型エラーを修正する。
- [x] Vite環境型、API境界、保存データ更新、UI props、テストの型エラーを整理する。
- [x] `npm run check:ci` が通ることを確認する。

検証:

- [x] `npm run check:ci`

### フェーズ 1: ナビゲーション整理 ✅ 完了

目的: 現行の `board` をUI表示上「リポジトリ」として扱い、初心者向けの主導線を作る。

- [x] 現行の `TabType` と `useActiveTab` の挙動を確認する。
- [x] 旧値 `updates` / `todos` と現行値 `board` / `activity` / `manual` の互換を維持する。
- [x] ログイン後の初期表示を「リポジトリ」画面に寄せる。
- [x] UI上のタブ名を「リポジトリ」「練習」中心に整理する。
- [x] ActivityやManualは削除せず、初期導線で目立ちすぎない表示にする。
- [x] `repositories` / `practice` への内部TabType移行を、このフェーズでは見送るか、必要最小限に留める。
- [x] ナビゲーション変更後も既存のリポジトリ取得、検索、並び替えが壊れていないことを確認する。

検証:

- [x] 旧 `activeTab` 値をlocalStorageに入れても画面が壊れない。
- [x] ログイン後にリポジトリ画面が表示される。
- [x] `npm run check:ci`

### フェーズ 2: RepositoryHomeの1カラム一覧追加 ✅ 完了

目的: カンバン操作中心の画面から、リポジトリを読む・探す画面へ寄せる。

- [x] `src/components/repositories/RepositoryHome.tsx` を追加する。
- [x] `src/components/repositories/RepositoryList.tsx` を追加する。
- [x] `src/components/repositories/RepositoryCard.tsx` を追加する。
- [x] 既存のRepo型とリポジトリ取得フックを再利用して一覧表示する。
- [x] 既存の検索ヘルパーを再利用する。
- [x] 既存の並び替えロジックを再利用する。
- [x] 自動状態を日本語表示に変換する。
- [x] 一覧カードにリポジトリ名、説明、言語、最終更新、自動状態、公開/非公開を表示する。
- [x] カード全体のクリックでGitHubへ遷移しないようにする。
- [x] 既存の `RepoBoard` は削除せず、後続で奥に置ける状態に保つ。

検証:

- [x] リポジトリが1カラムで読める。
- [x] 検索が `nameWithOwner`, `description`, `primaryLanguage`, `topics` に効く。
- [x] 並び替えが最終更新日降順、名前昇順で動く。
- [x] カードクリックでGitHubへ勝手に遷移しない。
- [x] `npm run check:ci`

### フェーズ 3: リポジトリ詳細パネル追加

目的: GitHubを開かなくても、リポジトリの概要と次の行動を理解できるようにする。

- [ ] `src/components/repositories/RepositoryDetailPanel.tsx` を追加する。
- [ ] `src/components/repositories/RepositoryHealthBadge.tsx` を追加する。
- [ ] `src/components/repositories/RepositoryStatusBadge.tsx` を追加する。
- [ ] カードクリックで詳細パネルを開く。
- [ ] 詳細パネルにリポジトリ名、説明、URL、最終更新日、言語、Public / Private、Archivedを表示する。
- [ ] GitHub外部遷移は「GitHubで開く」ボタンに限定する。
- [ ] 詳細パネルを閉じる操作をマウスとキーボードの両方で用意する。
- [ ] `aria-label`, `role="dialog"`, フォーカス管理など最低限のアクセシビリティを整える。
- [ ] 詳細パネル内に、後続のメモ保存とIssue練習導線を置ける領域を確保する。

検証:

- [ ] カードクリックで詳細パネルが開く。
- [ ] Enter / Space操作でも詳細を開ける。
- [ ] Escapeまたは閉じるボタンで詳細を閉じられる。
- [ ] GitHubは明示ボタンからのみ開く。
- [ ] `npm run check:ci`

### フェーズ 4: RepoUserMeta保存

目的: リポジトリごとに「目的」「次にやること」「メモ」「自分の状態」を保存できるようにする。

- [ ] `src/types/repo.ts` に `RepoUserStatus`, `RepoAutoHealth`, `RepoUserMeta` を定義する。
- [ ] `src/storage/repositoryMetaStorage.ts` を追加する。
- [ ] `src/hooks/useRepositoryMeta.ts` を追加する。
- [ ] 保存対象を `repoId`, `status`, `purpose`, `nextAction`, `note`, `createdAt`, `updatedAt` に絞る。
- [ ] 保存keyをアカウント単位にスコープする方針を実装する。
- [ ] localStorageの不正データを安全に無視・復旧できるようにする。
- [ ] 詳細パネルで `purpose`, `nextAction`, `note`, `status` を編集できるようにする。
- [ ] 一覧カードにも `nextAction` と `status` を控えめに表示する。
- [ ] `difficulty`, `confidence`, `lastReviewedAt` は後続拡張として実装しない。

検証:

- [ ] リロード後もリポジトリごとのメモが残る。
- [ ] 別アカウント利用時の保存衝突方針が明確になっている。
- [ ] localStorageに不正JSONが入っても画面がクラッシュしない。
- [ ] `npm run check:ci`

### フェーズ 5: Issue練習ドラフト最小実装

目的: Issueを知らない人でも「やることカード」をIssue風Markdownにできるようにする。

- [ ] `src/types/practice.ts` に `PracticeSyncStatus` と `PracticeIssueDraft` を定義する。
- [ ] `src/storage/practiceStorage.ts` を追加する。
- [ ] `src/hooks/usePracticeIssues.ts` を追加する。
- [ ] `src/lib/practiceTemplates.ts` を追加し、Issue風Markdown生成を切り出す。
- [ ] `src/components/practice/IssuePracticeWizard.tsx` を追加する。
- [ ] 入力項目は `title`, `reason`, `doneCriteria` に絞る。
- [ ] 完了条件を複数行またはリストとして入力できるようにする。
- [ ] 生成Markdownをプレビュー表示する。
- [ ] `syncStatus` の初期値を `local_only` にする。
- [ ] GitHubには作成せず、DevBoard内だけに保存する。
- [ ] リポジトリ詳細からIssue練習を開始できる導線を追加する。
- [ ] 保存済みドラフトを対象リポジトリの詳細に表示する。

検証:

- [ ] 「Issue」という言葉を知らなくても入力できるコピーになっている。
- [ ] 保存後、対象リポジトリの詳細にドラフトが表示される。
- [ ] 生成Markdownに「やりたいこと」「理由」「完了条件」が含まれる。
- [ ] GitHubにデータが作成されない。
- [ ] `npm run check:ci`

### フェーズ 6: PracticeHome追加

目的: リポジトリ詳細内だけでなく、保存済み練習ドラフトを一覧で確認できるようにする。

- [ ] `src/components/practice/PracticeHome.tsx` を追加する。
- [ ] `src/components/practice/GithubTermHint.tsx` を追加する。
- [ ] `src/lib/githubTerms.ts` を追加する。
- [ ] 保存済み `PracticeIssueDraft` を一覧表示する。
- [ ] 各ドラフトがどのリポジトリに紐づくか分かる表示にする。
- [ ] PracticeHomeから対象リポジトリ詳細へ戻れる導線を用意する。
- [ ] GitHub用語を日本語説明とセットで表示する。
- [ ] 説明テキストが多すぎて主操作を邪魔しないように調整する。
- [ ] 初期MVP完了条件を満たしているか確認する。

検証:

- [ ] 保存済み練習ドラフトを一覧で見られる。
- [ ] リポジトリ詳細とPracticeHomeを相互に行き来できる。
- [ ] Issue / Pull Request / Branch / Merge の用語説明が初心者向けになっている。
- [ ] `npm run check:ci`

### フェーズ 7: PR練習の最小実装

目的: Pull Requestを「変更の確認リクエスト」として説明文に落とし込む練習をできるようにする。

- [ ] `PracticePullRequestDraft` 型を追加する。
- [ ] `practiceStorage` にPR練習ドラフト保存を追加する。
- [ ] `src/components/practice/PullRequestPracticeWizard.tsx` を追加する。
- [ ] 入力項目は `title`, `changedItems`, `reviewPoints` に絞る。
- [ ] 関連する `PracticeIssueDraft` を任意で選べるようにする。
- [ ] PR説明文Markdownを生成する。
- [ ] Branch / Merge の説明を短い補足として表示する。
- [ ] 実際のGitHub PR作成、ブランチ作成、コミット作成、ファイル編集自動化は実装しない。

検証:

- [ ] PRの役割を日本語で理解できる。
- [ ] PR説明文を作る練習ができる。
- [ ] GitHubには何も作られない。
- [ ] `npm run check:ci`

### フェーズ 8: GitHub Issue作成の明示アクション追加

目的: 練習したIssueを、確認後にGitHub Issueとして作成できるようにする。

事前条件:

- [ ] 既存 `/api/github/*` proxyのpath / method allowlistを棚卸しする。
- [ ] POST系のOrigin / CSRFガードを確認する。
- [ ] OAuth scopeがIssue作成に足りることを確認する。
- [ ] 認証系/API系レスポンスの `Cache-Control: no-store` を確認する。
- [ ] GitHub書き込み前の確認UI方針を確定する。

実装タスク:

- [ ] 既存Issue作成クライアントまたはproxy経由の専用クライアントを確認する。
- [ ] `PracticeIssueDraft` からGitHub Issueを作成する処理を追加する。
- [ ] 作成前に確認ダイアログを必ず表示する。
- [ ] 作成成功後、`githubIssueNumber`, `githubIssueUrl`, `syncStatus` を保存する。
- [ ] 失敗時に日本語エラーを表示する。
- [ ] 再実行時に重複作成しにくいガードを入れる。

検証:

- [ ] DevBoard内の練習ドラフトからGitHub Issueを作れる。
- [ ] 作成前に必ず確認が出る。
- [ ] 作成後にGitHub URLが表示される。
- [ ] 失敗時に分かりやすい日本語エラーが出る。
- [ ] `npm run check:ci`

### フェーズ 9: 既存高度機能の置き場整理

目的: 保存ビュー、プリセット、カンバン詳細操作、Activity、TODO、AI、Workspaceなどを初心者向け主導線から整理する。

- [ ] 保存ビュー / プリセット / 列管理の表示位置を棚卸しする。
- [ ] 既存カンバン表示を削除せず、必要に応じて奥に置く導線を検討する。
- [ ] Activityを「詳しく見る」扱いにできるか検討する。
- [ ] TODO実装を独立「やること」画面に再利用するか判断する。
- [ ] AI実装連携、AI実行履歴、GitHub Actions連携をAdvanced候補として退避・整理する。
- [ ] Workspace / SplitPanel / TagManager / TagSelectorの主導線化を見送るか判断する。
- [ ] 設定画面またはAdvanced入口が必要か判断する。

検証:

- [ ] 初心者向けの主画面が複雑になりすぎていない。
- [ ] 既存機能を誤って削除していない。
- [ ] `npm run check:ci`

### フェーズ 10: デザインとコピーの仕上げ

目的: 「GitHubを、こわくなくする」方向に、画面の読みやすさと説明のやさしさを整える。

- [ ] アプリ本体の色使いを落ち着いた管理画面寄りに調整する。
- [ ] 赤×紫グラデーションやメタリック表現をランディング、CTA、カードhover、モーダルに限定する。
- [ ] 既存のセマンティック文字クラスを使い、`text-sm` などの直接指定を増やさない。
- [ ] spacingは `inset-*`, `stack-*`, `inline-*` を優先する。
- [ ] すべてのインタラクティブ要素に `focusRing` 方針を適用する。
- [ ] 強すぎるアニメーションを弱め、`motion-reduce:*` を併記する。
- [ ] 「Repository」「Issue」「Pull Request」「Branch」「Merge」などを日本語説明とセットで表示する。
- [ ] モバイル幅でテキストやボタンがはみ出さないことを確認する。

検証:

- [ ] 主要画面をモバイル幅とデスクトップ幅で確認する。
- [ ] キーボード操作で主要導線をたどれる。
- [ ] `npm run check:ci`

### フェーズ 11: MVP後の技術更新

目的: UI改修が安定した後、依存関係と開発基盤を段階的に更新する。

- [ ] 実装前に `npm outdated` を確認する。
- [ ] `npm info react version` と `npm info react-dom version` を確認する。
- [ ] `npm info vite version` と `npm info @vitejs/plugin-react version` を確認する。
- [ ] `npm info tailwindcss version` を確認する。
- [ ] `npm info typescript version` を確認する。
- [ ] `npm info vitest version` を確認する。
- [ ] `npm info eslint version` と `npm info @typescript-eslint/eslint-plugin version` を確認する。
- [ ] 非破壊で直せる `npm audit` 指摘を先に処理する。
- [ ] Vite / Vitest更新を単独PRで検討する。
- [ ] React 19系への更新を単独PRで検討する。
- [ ] Tailwind 4系への移行を単独PRで検討する。
- [ ] ESLint Flat Config移行を単独PRで検討する。

検証:

- [ ] 各更新PRで `npm run check:ci` が通る。
- [ ] Cloudflare Pagesのビルド環境で動く。

## 5. MVPから明示的に外すもの

- [ ] 独立したTODO / やることタブの本格実装。
- [ ] GitHub Issue一覧 / Pull Request一覧の本格同期。
- [ ] GitHub Pull Requestの実作成。
- [ ] ブランチ作成、コミット作成、ファイル編集自動化。
- [ ] AI実装連携の新規拡張。
- [ ] TagManager / Workspace / SplitPanelの主導線化。
- [ ] React / Vite / Tailwind / ESLintのメジャーアップデート同時実施。
- [ ] Cloudflare KV / D1によるクラウド同期。

## 6. リスクと対策

- [ ] 既存機能が多く、初心者向け導線がぼやける。
  対策: MVP画面ではリポジトリ整理、詳細、Issue練習以外を前面に出しすぎない。
- [ ] `activeTab` 互換を崩して既存ユーザーの初期表示が壊れる。
  対策: 旧値と現行値の移行テストをフェーズ1で行う。
- [ ] localStorage key設計が曖昧になり、複数GitHubアカウントでメモが衝突する。
  対策: RepoUserMetaとPracticeIssueDraftはアカウント単位の保存keyにする。
- [ ] 不正なlocalStorageデータで画面がクラッシュする。
  対策: storage層で型ガードと安全なフォールバックを用意する。
- [ ] GitHub Issue作成で誤って実データを作る。
  対策: MVPでは作成しない。追加時は確認ダイアログ、Origin/CSRF確認、重複作成防止を必須にする。
- [ ] UI刷新と依存メジャー更新を同時に行い、不具合原因が切り分けにくくなる。
  対策: 依存メジャー更新はMVP後のフェーズ11に分離する。

## 7. 推奨PR分割

- [ ] PR 1: Rename the main board flow to repositories
- [ ] PR 2: Add a simple repository home list
- [ ] PR 3: Add repository detail panel
- [ ] PR 4: Add repository personal notes and next action
- [ ] PR 5: Add beginner-friendly Issue practice drafts
- [ ] PR 6: Add practice home for saved drafts
- [ ] PR 7: Add Pull Request practice drafts
- [ ] PR 8: Add optional GitHub Issue creation
- [ ] PR 9: Organize advanced and legacy feature entry points
- [ ] PR 10: Polish beginner-friendly UI copy and visual design
- [ ] PR 11+: Update dependencies in isolated PRs
