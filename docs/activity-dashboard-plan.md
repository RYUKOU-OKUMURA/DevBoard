# Activity Dashboard 統合計画

## 概要

「最近のアクティビティ」（UpdatesTab）と「TODO Management」（TodosTab）を統合した新しい「Activity」ダッシュボードを作成する。アカウント全体のIssue/PRとTODOを一画面で管理できるようにする。

## 統合後のレイアウト

```
┌──────────────────────────────────────────────────────┐
│ 📊 Activity & Tasks                                  │
├──────────────────────────────────────────────────────┤
│ [統計サマリー: Issue 5 | PR 3 | TODO 12]             │
├──────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────────────────┐ │
│ │ 📬 Recent Issues│  │ ✅ My TODOs                 │ │
│ │ ────────────── │  │ ─────────────────────────── │ │
│ │ • Issue #123   │→ │ [未着手] [進行中] [完了]     │ │
│ │   [+ TODO追加]  │  │   (Kanbanボード)            │ │
│ ├─────────────────┤  │                             │ │
│ │ 🔀 Recent PRs   │  │                             │ │
│ │ ────────────── │  │                             │ │
│ │ • PR #789      │  │                             │ │
│ └─────────────────┘  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## スコープの違い

| ページ | スコープ | 対象 |
|--------|----------|------|
| **Activity Dashboard** | アカウント全体 | 全リポジトリのIssue/PR/TODO |
| **Workspace内カンバン** | リポジトリ単体 | 特定リポジトリのTODO |

### データスコープ前提

- ActivityダッシュボードのTODOは「自分に紐づく全リポジトリのTODO」を扱う。デフォルトフィルタは「自分担当＋全リポジトリ＋全ステータス」、リポジトリ/ステータス/検索で絞り込めるようにする。
- Workspaceカンバンは従来通り「選択リポジトリ単体のTODO」を扱う。スコープ差分があることをUI文言でも明示する。

---

## 新規作成ファイル

| ファイル | 役割 |
|---------|------|
| `src/components/ActivityTab.tsx` | メインコンテナ |
| `src/components/ActivitySummaryStats.tsx` | 統合統計サマリー |
| `src/components/ActivityPanel.tsx` | Issue/PRパネル |
| `src/components/ActivityIssueCard.tsx` | TODO変換機能付きIssueカード |
| `src/components/TodoPanel.tsx` | 埋め込みKanbanボード |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/TabNavigation.tsx` | 「Updates」「TODOs」→「Activity」に統合 |
| `src/hooks/useActiveTab.ts` | TabType更新、マイグレーション |
| `src/App.tsx` | ActivityTab統合 |

---

## 実装フェーズ

### Phase 1: ActivitySummaryStats（統合統計）

**ファイル**: `src/components/ActivitySummaryStats.tsx`

 - Issue/PR/TODO数を横並びで表示（アイコン + 数値 + ラベル）
 - staggerアニメーションで登場
 - 集計定義: デフォルトは直近7日。Issue/PRはopen + 期間内にclosed/mergedを含む、TODOは自分担当の全ステータス。期間・ステータスは将来のフィルタ拡張を想定したprops設計にする。
 - propsで期間/ステータスの拡張を許容し、a11yラベルを明示する。

### Phase 2: ActivityIssueCard（Issue→TODO変換）

**ファイル**: `src/components/ActivityIssueCard.tsx`

- Issueカードに「+」ボタンを追加
- ホバーで表示、クリックでTODOに変換
- 変換時に自動でissueNumber/issueUrlをリンク

```tsx
// 変換時のTODOデータ
{
  title: issue.title,
  issueNumber: issue.number,
  issueUrl: issue.url,
  repoId: repo.id,
  status: 'todo',
  priority: 'medium',
  syncEnabled: true,
}
```
- 重複防止: `repoId + issueNumber`で既存TODOを判定し、多重作成をブロック。生成中はボタンを一時disableし、完了/失敗をトーストで通知。失敗時はロールバック（楽観更新を戻す）。
- 引き継ぎ: タイトル/番号/URLは必須。ラベル・アサインの引き継ぎ要否をpropsで選択できるようにしておく（デフォルトは引き継がない）。
- 変換mutation: 成功でトースト、失敗でロールバック。エラー詳細を表示し再試行を促す。
- UI: 「+」ボタンはホバー表示、操作中はdisable。ボタンにaria-labelを付与。

### Phase 3: ActivityPanel（左パネル）

**ファイル**: `src/components/ActivityPanel.tsx`

- Issues と PRs を縦に積む
- 各セクションはスクロール可能
- 空状態メッセージ
- データロード: 1セクションあたりページネーションまたは無限スクロール（例: 20件単位）。ロード中/エラー/空の状態表示を揃える。
- フィルタ: リポジトリ/種別/ステータス（open/closed/merged）を切り替え可能にする前提でコンポーネント設計。
- a11y: `role="region"`と見出しで領域を区切り、ローディング/エラー/空状態にも読み上げ文言を設定。

### Phase 4: TodoPanel（右パネル）

**ファイル**: `src/components/TodoPanel.tsx`

- 既存のTodoColumn/TodoCardを再利用
- 3列Kanban（未着手/進行中/完了）
- ドラッグ&ドロップ対応
- データロード: アカウント横断TODOを取得。大量件数に備え、初期ロード件数上限（例: 100件）＋絞り込み/検索を前提にする。必要なら仮想化を検討。
- フィルタ: リポジトリ・ステータス・担当（デフォルト自分）で絞り込み。適用中はバッジ表示。
- D&D更新は既存hooksを再利用し、更新中は該当カードをローディング表示にする。
- a11y: カラム/カードに`role`/aria-labelを付与し、フィルタ適用中の状態をテキストで示す。

### Phase 5: ActivityTab（メインコンテナ）

**ファイル**: `src/components/ActivityTab.tsx`

- 全コンポーネントを統合
- useTodos, useRecentActivities を使用
- Issue→TODO変換ロジック
- TODO取得は「自分の全リポジトリ」を対象とする拡張版を使用。フィルタ状態をContextかURLクエリに同期し、リフレッシュやタブ復帰で状態を維持。
- Issue→TODO変換の楽観更新を行い、失敗時にロールバック＋トースト。ActivityPanel/TodoPanelへ変換結果を反映。
- フィルタ状態はグローバルContextまたはURLクエリに同期し、ブラウザバックでも破綻しないことを確認。

### Phase 6: ナビゲーション更新

**変更ファイル**:
- `src/components/TabNavigation.tsx`
- `src/hooks/useActiveTab.ts`
- `src/App.tsx`

**TabType変更**:
```tsx
// Before
type TabType = 'board' | 'updates' | 'manual' | 'todos';

// After
type TabType = 'board' | 'activity' | 'manual';
```
- マイグレーション: localStorage/URLに旧値がある場合は初回のみ選択ダイアログを表示し、選択後に`activity`か`board`へ安全にマップして保存。二回目以降は保存済みの新値をそのまま使用。
- 初期タブは`activity`を既定とし、選択ダイアログ後にlocalStorageへ保存する。URLクエリの旧値は安全に無視または上書きする。

### Phase 7: デザイン洗練化

既存TODOコンポーネントの改善:

1. **TodoCard**: Framer Motionホバー効果、ステータス別カラーストライプ
2. **TodoColumn**: staggerアニメーション、空状態改善
3. **ActivityIssueCard**: RepoCard同等の洗練されたホバー効果
- 新規コンポーネント全てにSKILL.mdのカード/カラー/スペーシング/シャドウ/フォーカスリングを適用する。

---

## 実装順序

| 順序 | Phase | ファイル |
|------|-------|---------|
| 1 | Phase 1 | ActivitySummaryStats.tsx（新規） |
| 2 | Phase 2 | ActivityIssueCard.tsx（新規） |
| 3 | Phase 3 | ActivityPanel.tsx（新規） |
| 4 | Phase 4 | TodoPanel.tsx（新規） |
| 5 | Phase 5 | ActivityTab.tsx（新規） |
| 6 | Phase 6 | TabNavigation.tsx, useActiveTab.ts, App.tsx（変更） |
| 7 | Phase 7 | TodoCard.tsx, TodoColumn.tsx（デザイン改善） |

---

## 補足テスト観点

- 旧タブ値を持つ状態で初回ロード→選択ダイアログ→遷移→再訪でダイアログが再表示されない。
- Issue→TODO変換の重複防止（同一Issue多重クリック）と失敗時のロールバックが効く。
- ActivityPanel/TodoPanelのフィルタ/検索が独立に機能し、件数が多い場合でもパフォーマンスが保たれる。

---

## デザインガイドライン

SKILL.md「Approachable Sophistication」に準拠:

### カードスタイル
- 背景: `bg-surface-primary`
- ボーダー: `border-[var(--border-subtle)]`
- ホバー: `hover:border-[var(--accent-green-border)]`
- シャドウ: `shadow-sm hover:shadow-md`
- 角丸: `rounded-xl`

### ステータスカラー
- Issue Open: `--accent-green`
- Issue Closed: `--accent-purple`
- PR Open: `--accent-green`
- PR Merged: `--accent-purple`
- PR Closed: `--accent-red`

### スペーシング
- セマンティック: `p-inset-lg`, `gap-inline-md`, `mb-stack-md`
- パネル間: `gap-8` (32px)

### アクセシビリティ
- 全インタラクティブ要素に`focusRing`適用
- `aria-label`をアイコンボタンに付与
- `role="region"`とセクション見出し

---

## 注意事項

- 既存hooks（useTodos, useRecentActivities）を再利用
- CSS変数とデザイントークンを使用
- @dnd-kitとの互換性を維持
- ダークモード対応を維持
- focusRing、ARIA属性でアクセシビリティ確保
- 新規コンポーネント（ActivitySummaryStats / ActivityPanel / TodoPanel / ActivityIssueCard）もアクセシビリティ指針を適用し、読み上げ用の領域ラベルとフォーカス順を明記する。
