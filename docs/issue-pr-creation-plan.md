# DevBoard: イシュー & プルリクエスト作成機能の実装計画

## 📊 実装の全体像

### 機能範囲
- ✅ GitHub イシュー作成（@メンション対応）
- ✅ GitHub プルリクエスト作成（@メンション対応、ドラフトPR対応）
- ✅ 通知システム（成功/エラー/ローディング）

### アーキテクチャ方針
- **統合モーダル**: イシューとPRで70%のコードを共有
- **並行実装**: 最初から両機能を設計し、開発時間を20-30%削減
- **通知ライブラリ**: `react-hot-toast`（最小バンドル7.7KB、Tailwind親和性高）

---

## 📦 新規追加する依存関係

```bash
npm install react-hot-toast
```

**選定理由**:
- 最小バンドルサイズ（7.7KB gzipped）
- TypeScriptネイティブ
- Tailwind CSSと相性抜群
- Promise APIでasync操作に最適
- フック型API（`toast()`）でシンプル

**代替案の比較:**
| ライブラリ | バンドルサイズ | 週間DL数 | 評価 |
|-----------|--------------|----------|------|
| react-hot-toast | 7.7 KB | 1.8M | ⭐️ 推奨 |
| sonner | 13.9 KB | N/A | 新しい、Vercel製 |
| react-toastify | 12.7 KB | 2.6M | 機能豊富だが重い |

---

## 📂 ファイル構成

### 新規作成（7ファイル）

#### 1. `src/api/github-actions.ts` (~200行)
GitHub API との通信を担当

**主な関数:**
```typescript
// イシュー作成
export async function createIssue(
  owner: string,
  repo: string,
  data: { title: string; body?: string; assignees?: string[] }
): Promise<{ number: number; html_url: string }>

// PR作成
export async function createPullRequest(
  owner: string,
  repo: string,
  data: { title: string; body?: string; head: string; base: string; draft?: boolean }
): Promise<{ number: number; html_url: string }>

// ブランチ一覧取得
export async function getRepositoryBranches(
  owner: string,
  repo: string
): Promise<Array<{ name: string; commit: { sha: string } }>>

// デフォルトブランチ取得
export async function getDefaultBranch(
  owner: string,
  repo: string
): Promise<string>
```

**使用するエンドポイント:**
- `POST /repos/{owner}/{repo}/issues`
- `POST /repos/{owner}/{repo}/pulls`
- `GET /repos/{owner}/{repo}/branches`
- `GET /repos/{owner}/{repo}`

#### 2. `src/hooks/useCreateIssue.ts` (~100行)
イシュー作成のReactフック

**インターフェース:**
```typescript
export function useCreateIssue() {
  return {
    createIssue: (repo: Repo, data: CreateIssueData) => Promise<IssueResponse>,
    isCreating: boolean,
    error: string | null,
    clearError: () => void
  }
}
```

**機能:**
- イシュー作成API呼び出し
- ローディング状態管理
- エラーハンドリング
- Toast通知の統合

#### 3. `src/hooks/useCreatePR.ts` (~120行)
PR作成のReactフック

**インターフェース:**
```typescript
export function useCreatePR() {
  return {
    createPR: (repo: Repo, data: CreatePRData) => Promise<PRResponse>,
    isCreating: boolean,
    error: string | null,
    clearError: () => void
  }
}
```

**機能:**
- PR作成API呼び出し
- ブランチバリデーション
- エラーハンドリング
- Toast通知の統合

#### 4. `src/hooks/useRepositoryBranches.ts` (~80行)
ブランチ情報取得のReactフック

**インターフェース:**
```typescript
export function useRepositoryBranches(owner: string, name: string) {
  return {
    branches: Array<{ name: string; commit: { sha: string } }>,
    defaultBranch: string,
    isLoading: boolean,
    error: string | null,
    refetch: () => void
  }
}
```

**機能:**
- ブランチ一覧取得
- デフォルトブランチ取得
- 5分間のキャッシング（レート制限対策）
- ローディング状態管理

#### 5. `src/components/CreateItemModal.tsx` (~300行)
イシュー/PR作成の統合モーダル

**Props:**
```typescript
interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  repo: Repo;
  type: 'issue' | 'pullRequest';
  onSuccess?: (url: string) => void;
}
```

**共通フォーム要素:**
- タイトル入力（必須）
- 本文テキストエリア（Markdown対応）
- アサイニー入力（カンマ区切り、オプション）

**PR専用要素:**
- Baseブランチセレクター
- Headブランチセレクター
- ドラフトPRチェックボックス

**機能:**
- タイプ別の条件レンダリング
- フォームバリデーション
- Escキーで閉じる
- 背景クリックで閉じる
- ローディング状態表示
- エラーメッセージ表示

#### 6. `src/components/BranchSelector.tsx` (~150行)
ブランチ選択ドロップダウン

**Props:**
```typescript
interface BranchSelectorProps {
  branches: Array<{ name: string }>;
  selectedBranch: string;
  defaultBranch?: string;
  onChange: (branch: string) => void;
  label: string;
  disabled?: boolean;
}
```

**機能:**
- ドロップダウンメニュー
- 検索/フィルタリング（オートコンプリート）
- デフォルトブランチの強調表示
- キーボードナビゲーション（↑↓キー）

#### 7. `src/components/DropdownMenu.tsx` (~180行)
汎用ドロップダウンメニューコンポーネント

**Props:**
```typescript
interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  align?: 'left' | 'right';
}
```

**機能:**
- トリガー要素のクリックで開閉
- クリック外側で自動的に閉じる
- 左右配置の選択
- アイコン付きメニュー項目
- 無効化オプション

---

### 修正する既存ファイル（3ファイル）

#### 1. `src/types/index.ts`
型定義の追加

```typescript
// イシュー作成
export interface CreateIssueData {
  title: string;
  body?: string;
  assignees?: string[];
  labels?: string[];
}

export interface IssueCreationResponse {
  number: number;
  html_url: string;
  title: string;
}

// PR作成
export interface CreatePRData {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}

export interface PRCreationResponse {
  number: number;
  html_url: string;
  title: string;
  draft: boolean;
}

// ブランチ情報
export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}
```

#### 2. `src/components/RepoCard.tsx`
アクションボタンの追加（~30行追加）

**変更箇所:** 54-79行目のヘッダーセクション

**追加内容:**
```tsx
// State
const [dropdownOpen, setDropdownOpen] = useState(false);
const [modalType, setModalType] = useState<'issue' | 'pullRequest' | null>(null);

// ドロップダウンメニュー
<DropdownMenu
  trigger={<button>⋮</button>}
  items={[
    {
      label: 'Create Issue',
      onClick: () => setModalType('issue'),
      icon: <IssueIcon />
    },
    {
      label: 'Create Pull Request',
      onClick: () => setModalType('pullRequest'),
      icon: <PRIcon />
    },
    {
      label: 'View on GitHub',
      onClick: () => window.open(repo.htmlUrl, '_blank')
    }
  ]}
  align="right"
/>

// モーダル
{modalType && (
  <CreateItemModal
    isOpen={true}
    onClose={() => setModalType(null)}
    repo={repo}
    type={modalType}
    onSuccess={(url) => {
      toast.success(`${modalType === 'issue' ? 'Issue' : 'PR'} created!`);
      window.open(url, '_blank');
    }}
  />
)}
```

#### 3. `src/App.tsx`
Toast通知の追加

**追加内容:**
```tsx
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--surface-secondary)',
            color: 'var(--text-primary)',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: 'var(--accent-green)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--accent-red)',
              secondary: 'white',
            },
          },
        }}
      />
      {/* 既存のアプリケーションコンテンツ */}
    </>
  );
}
```

---

## 🎯 実装フェーズ（合計10時間）

### Phase 1: 基礎設定（2時間）

**タスク:**
- [ ] `npm install react-hot-toast` の実行
- [ ] `src/types/index.ts` に型定義追加
- [ ] `src/api/github-actions.ts` 作成
  - [ ] `createIssue` 関数実装
  - [ ] `createPullRequest` 関数実装
  - [ ] `getRepositoryBranches` 関数実装
  - [ ] `getDefaultBranch` 関数実装
- [ ] `src/App.tsx` に `<Toaster />` 追加
- [ ] 基本的なバリデーション関数作成

**成果物:**
- API関数群が完成し、コンソールでテスト可能
- Toast通知が表示されることを確認

---

### Phase 2: イシュー作成（2.5時間）

**タスク:**
- [ ] `src/hooks/useCreateIssue.ts` 作成
  - [ ] API呼び出しロジック
  - [ ] ローディング状態管理
  - [ ] エラーハンドリング
  - [ ] Toast通知統合
- [ ] `src/components/CreateItemModal.tsx` の基本構造作成
  - [ ] モーダルレイアウト
  - [ ] タイトル入力フィールド
  - [ ] 本文テキストエリア
  - [ ] アサイニー入力（シンプルなテキスト入力）
  - [ ] 送信/キャンセルボタン
- [ ] イシュー作成機能の実装
  - [ ] フォームバリデーション
  - [ ] API呼び出し
  - [ ] 成功時の処理（URLを新しいタブで開く）
  - [ ] エラー表示
- [ ] `src/components/DropdownMenu.tsx` 作成
- [ ] `src/components/RepoCard.tsx` 修正
  - [ ] ドロップダウンメニューボタン追加
  - [ ] "Create Issue" アクション追加
  - [ ] モーダル表示ロジック

**成果物:**
- イシュー作成が完全に動作
- @メンションが機能することを確認
- エラーケースが適切に処理される

---

### Phase 3: PR作成（2.5時間）

**タスク:**
- [ ] `src/hooks/useRepositoryBranches.ts` 作成
  - [ ] ブランチ一覧取得
  - [ ] デフォルトブランチ取得
  - [ ] キャッシング実装（5分間）
- [ ] `src/hooks/useCreatePR.ts` 作成
  - [ ] API呼び出しロジック
  - [ ] ブランチバリデーション
  - [ ] エラーハンドリング
  - [ ] Toast通知統合
- [ ] `src/components/BranchSelector.tsx` 作成
  - [ ] ドロップダウンUI
  - [ ] 検索/フィルタリング機能
  - [ ] デフォルトブランチの強調
  - [ ] キーボードナビゲーション
- [ ] `src/components/CreateItemModal.tsx` にPR機能追加
  - [ ] Baseブランチセレクター
  - [ ] Headブランチセレクター
  - [ ] ドラフトPRチェックボックス
  - [ ] タイプ別の条件レンダリング
- [ ] `src/components/RepoCard.tsx` に "Create PR" アクション追加

**成果物:**
- PR作成が完全に動作
- ブランチ選択がスムーズに機能
- ドラフトPRが作成できる
- エラーケースが適切に処理される

---

### Phase 4: モーダル統合とUI洗練（1.5時間）

**タスク:**
- [ ] モーダルのアニメーション追加
  - [ ] フェードイン/アウト
  - [ ] スライドアニメーション
- [ ] キーボードショートカット実装
  - [ ] Escキーでモーダルを閉じる
  - [ ] Enterキーで送信（フォーカス時）
- [ ] ローディング状態のUI改善
  - [ ] スピナーアイコン
  - [ ] ボタンの無効化
  - [ ] ローディング中のメッセージ
- [ ] エラー表示の改善
  - [ ] エラーメッセージのスタイリング
  - [ ] アイコン追加
  - [ ] クリアボタン
- [ ] レスポンシブデザインの確認
  - [ ] モバイルでの表示
  - [ ] タブレットでの表示
  - [ ] ドロップダウンの位置調整
- [ ] アクセシビリティ対応
  - [ ] ARIA属性の追加
  - [ ] フォーカス管理
  - [ ] スクリーンリーダー対応

**成果物:**
- 洗練されたUI/UX
- スムーズなアニメーション
- モバイル対応完了
- アクセシビリティ改善

---

### Phase 5: テスト & 仕上げ（1.5時間）

**テスト項目:**
- [ ] **機能テスト**
  - [ ] イシュー作成（公開リポジトリ）
  - [ ] イシュー作成（プライベートリポジトリ）
  - [ ] PR作成（公開リポジトリ）
  - [ ] PR作成（プライベートリポジトリ）
  - [ ] ドラフトPR作成
  - [ ] @メンション機能
- [ ] **エラーハンドリング**
  - [ ] 権限なしエラー（403）
  - [ ] レート制限エラー（429）
  - [ ] ネットワークエラー
  - [ ] 無効なブランチ名
  - [ ] 重複PR（既存のPR）
- [ ] **UIテスト**
  - [ ] モバイルブラウザ
  - [ ] タブレット
  - [ ] デスクトップ（複数ブラウザ）
  - [ ] ダークモード/ライトモード
- [ ] **パフォーマンス**
  - [ ] ブランチ取得の速度
  - [ ] モーダル開閉の速度
  - [ ] メモリリーク確認
- [ ] **マルチアカウント**
  - [ ] 正しいアカウントでイシュー作成
  - [ ] アカウント切り替え後の動作

**ドキュメント更新:**
- [ ] README.md に機能説明追加
- [ ] 使い方のスクリーンショット追加（オプション）
- [ ] CLAUDE.md の更新（機能追加の記録）

**成果物:**
- 全機能が安定して動作
- エッジケースが適切に処理される
- ドキュメントが最新

---

## 🔧 技術的な詳細

### GitHub API エンドポイント

#### イシュー作成
```
POST /repos/{owner}/{repo}/issues
```

**リクエストボディ:**
```json
{
  "title": "Bug: Login button not working",
  "body": "Description here\n\n@ClaudeCode please take a look!",
  "assignees": ["username1", "username2"],
  "labels": ["bug", "priority-high"]
}
```

**レスポンス:**
```json
{
  "number": 123,
  "html_url": "https://github.com/owner/repo/issues/123",
  "title": "Bug: Login button not working",
  "state": "open"
}
```

#### プルリクエスト作成
```
POST /repos/{owner}/{repo}/pulls
```

**リクエストボディ:**
```json
{
  "title": "feat: Add user authentication",
  "body": "This PR adds OAuth authentication.\n\n@ClaudeCode please review!",
  "head": "feature/auth",
  "base": "main",
  "draft": false,
  "maintainer_can_modify": true
}
```

**レスポンス:**
```json
{
  "number": 456,
  "html_url": "https://github.com/owner/repo/pull/456",
  "title": "feat: Add user authentication",
  "state": "open",
  "draft": false
}
```

#### ブランチ一覧取得
```
GET /repos/{owner}/{repo}/branches
```

**レスポンス:**
```json
[
  {
    "name": "main",
    "commit": { "sha": "abc123...", "url": "..." },
    "protected": true
  },
  {
    "name": "feature/auth",
    "commit": { "sha": "def456...", "url": "..." },
    "protected": false
  }
]
```

---

### @メンション機能の実装

**仕組み:**
- イシューやPRの本文（body）に `@username` を含めるだけ
- GitHub側が自動的にメンションを検出
- メンションされたユーザーは通知を受け取る
- フロントエンド側での特別な処理は不要

**例:**
```typescript
const body = `
## Description
This is a bug report.

## Steps to reproduce
1. Click login button
2. Nothing happens

@ClaudeCode can you take a look?
@Codex please help with testing.
`;

await createIssue(owner, repo, {
  title: "Bug: Login not working",
  body: body
});
```

**注意点:**
- ユーザー名のバリデーションはGitHub API側で実施
- 存在しないユーザー名でもエラーにならない（単に通知されない）
- プライベートリポジトリの場合、メンションできるのはコラボレーターのみ

---

### UI/UX デザイン

#### RepoCardのドロップダウンメニュー

```
┌────────────────────────────────────┐
│ owner/repository-name         🔒 ⋮ │ ← ⋮ボタンをクリック
│                             ┌──────┴──────────┐
│ Last updated: 2 days ago    │ Create Issue    │
│                             │ Create PR       │
│ TypeScript   topic1 topic2  │ View on GitHub  │
└─────────────────────────────└─────────────────┘
```

**ドロップダウンの動作:**
- ⋮ボタンをクリックで開閉
- メニュー外をクリックで自動的に閉じる
- Escキーで閉じる
- アイコン付きメニュー項目
- ホバー時にハイライト

#### イシュー作成モーダル

```
┌──────────────────────────────────────────┐
│ Create Issue in owner/repository      ✕ │
│ Creating as @current-username            │
├──────────────────────────────────────────┤
│                                          │
│ Title: *                                 │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Description:                             │
│ ┌──────────────────────────────────────┐ │
│ │ Supports **Markdown** formatting     │ │
│ │                                      │ │
│ │ Use @username to mention users       │ │
│ │                                      │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Assignees: (comma-separated, optional)   │
│ ┌──────────────────────────────────────┐ │
│ │ ClaudeCode, Codex                    │ │
│ └──────────────────────────────────────┘ │
│                                          │
│             [Cancel]  [Create Issue]     │
└──────────────────────────────────────────┘
```

#### プルリクエスト作成モーダル

```
┌──────────────────────────────────────────┐
│ Create Pull Request in owner/repo     ✕ │
│ Creating as @current-username            │
├──────────────────────────────────────────┤
│                                          │
│ Title: *                                 │
│ ┌──────────────────────────────────────┐ │
│ │ feat: Add authentication feature     │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Description:                             │
│ ┌──────────────────────────────────────┐ │
│ │ This PR adds OAuth authentication.   │ │
│ │                                      │ │
│ │ @ClaudeCode please review!           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Base branch: *                           │
│ ┌──────────────────────────────────────┐ │
│ │ main ▼                     (default) │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Head branch: *                           │
│ ┌──────────────────────────────────────┐ │
│ │ feature/auth ▼                       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ☐ Create as draft pull request          │
│                                          │
│            [Cancel]  [Create PR]         │
└──────────────────────────────────────────┘
```

#### Toast通知のデザイン

**成功:**
```
┌────────────────────────────┐
│ ✓ Issue created!           │
│ View on GitHub →           │
└────────────────────────────┘
```

**エラー:**
```
┌────────────────────────────┐
│ ✗ Failed to create PR      │
│ You don't have write       │
│ permissions                │
└────────────────────────────┘
```

**ローディング:**
```
┌────────────────────────────┐
│ ⟳ Creating pull request... │
└────────────────────────────┘
```

---

## 🔍 技術的ベストプラクティス

実装時に注意すべき重要なポイントをまとめます。これらを守ることで、バグやハマりどころを減らし、保守性の高いコードを書けます。

### 1. ブランチ取得の完全なページネーション対応

**問題:**
`GET /repos/{owner}/{repo}/branches` はデフォルトで30件しか返さず、100+ブランチがあるリポジトリでは全件取得できない。

**解決策:**
`per_page=100` + Linkヘッダー追跡で全件取得するヘルパー関数を作成。

**実装例:**
```typescript
// src/api/github-actions.ts

/**
 * すべてのブランチを取得（ページネーション対応）
 */
export async function getAllBranches(
  owner: string,
  repo: string
): Promise<Branch[]> {
  const allBranches: Branch[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `/api/github/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.statusText}`);
    }

    const branches: Branch[] = await response.json();
    allBranches.push(...branches);

    // Linkヘッダーをチェックして次のページがあるか確認
    const linkHeader = response.headers.get('Link');
    hasMore = linkHeader?.includes('rel="next"') ?? false;
    page++;
  }

  return allBranches;
}
```

**注意点:**
- 大規模リポジトリでは複数回のリクエストが発生
- レート制限を考慮してキャッシュと併用
- ローディング状態を適切に表示

---

### 2. RepoCardのクリックイベント分離

**問題:**
RepoCard全体がクリック可能でGitHubに遷移するが、⋮ボタンをクリックするとカードクリックも同時に発火し、意図せずタブが開く。

**解決策:**
⋮ボタンのクリックハンドラーに `e.stopPropagation()` を追加し、イベントの伝播を止める。

**実装例:**
```tsx
// src/components/RepoCard.tsx

// カード全体のクリックハンドラー
const handleCardClick = () => {
  window.open(repo.htmlUrl, '_blank');
};

// ドロップダウンメニューのトリガー
const handleMenuClick = (e: React.MouseEvent) => {
  e.stopPropagation(); // 重要: カードクリックを防ぐ
  setDropdownOpen(!dropdownOpen);
};

return (
  <div onClick={handleCardClick} className="repo-card">
    {/* カードコンテンツ */}

    <button
      onClick={handleMenuClick}
      className="menu-trigger"
      aria-label="Repository actions"
    >
      ⋮
    </button>

    {dropdownOpen && (
      <DropdownMenu
        items={[...]}
        onClose={() => setDropdownOpen(false)}
      />
    )}
  </div>
);
```

**代替案:**
カード全体をクリック可能にするのではなく、明示的な「View on GitHub」リンク/ボタンを配置する方法もあります。

---

### 3. トースト通知の責務統一

**問題:**
成功通知をフック内とコンポーネント側の両方で発火すると、重複表示や制御の複雑化が起きる。

**解決策:**
トースト通知は**フック内で完結**させ、`onSuccess` コールバックはURLの返却とタブ開きのみに専念。

**実装例:**
```typescript
// src/hooks/useCreateIssue.ts

export function useCreateIssue() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIssue = async (
    repo: Repo,
    data: CreateIssueData
  ): Promise<string> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await createIssueAPI(
        repo.owner,
        repo.name,
        data
      );

      // 成功通知はフック内で発火
      toast.success('Issue created successfully!');

      // URLのみ返す
      return response.html_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create issue';
      setError(message);

      // エラー通知もフック内で発火
      toast.error(message);

      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return { createIssue, isCreating, error };
}
```

```tsx
// src/components/CreateItemModal.tsx

const { createIssue } = useCreateIssue();

const handleSubmit = async () => {
  try {
    // URLを受け取る
    const url = await createIssue(repo, formData);

    // タブを開くだけに専念（通知はフック内で完結済み）
    window.open(url, '_blank');
    onClose();
  } catch (err) {
    // エラーハンドリングもフック内で完結済み
    // ここでは何もしない、またはモーダルを閉じないなどのUI制御のみ
  }
};
```

**メリット:**
- 通知の一貫性
- テストが簡単
- コンポーネント側がシンプル

---

### 4. ブランチキャッシュのキー設計

**問題:**
単純に `branches:${repo.name}` でキャッシュすると、アカウント切替時や同名リポジトリで誤ったデータが使われる。

**解決策:**
キャッシュキーに `repo.id` と `activeUserId` を含める。

**実装例:**
```typescript
// src/hooks/useRepositoryBranches.ts

import { useAuthContext } from '../contexts/AuthContext';

export function useRepositoryBranches(repo: Repo) {
  const { activeAccount } = useAuthContext();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // キャッシュキーの設計
  const cacheKey = `branches:${repo.id}:${activeAccount?.userId}`;
  const cacheExpiry = 5 * 60 * 1000; // 5分

  useEffect(() => {
    const fetchBranches = async () => {
      // キャッシュをチェック
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > cacheExpiry;

        if (!isExpired) {
          setBranches(data);
          return;
        }
      }

      // キャッシュがない、または期限切れの場合はAPI呼び出し
      setIsLoading(true);
      try {
        const data = await getAllBranches(repo.owner, repo.name);
        setBranches(data);

        // キャッシュに保存
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, [repo.id, activeAccount?.userId]);

  return { branches, isLoading };
}
```

**キャッシュクリア:**
```typescript
// アカウント切替時やログアウト時
export function clearBranchCache(userId?: string) {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('branches:')) {
      if (!userId || key.includes(userId)) {
        localStorage.removeItem(key);
      }
    }
  });
}
```

---

### 5. BranchSelector のMVPスコープ明確化

**問題:**
高度なオートコンプリートUIを実装すると、開発時間が大幅に増加する。

**解決策:**
MVPではシンプルな検索フィルター付きリストに限定。Post-MVPで `@headlessui/react` や `cmdk` を検討。

**MVP実装例:**
```tsx
// src/components/BranchSelector.tsx (シンプル版)

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranch: string;
  defaultBranch?: string;
  onChange: (branch: string) => void;
  label: string;
}

export function BranchSelector({
  branches,
  selectedBranch,
  defaultBranch,
  onChange,
  label,
}: BranchSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // シンプルなフィルタリング
  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="branch-selector">
      <label>{label}</label>

      <div className="relative">
        <input
          type="text"
          value={searchQuery || selectedBranch}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search branches..."
          className="w-full px-4 py-2 border rounded-xl"
        />

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto">
            {filteredBranches.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">No branches found</div>
            ) : (
              filteredBranches.map(branch => (
                <button
                  key={branch.name}
                  onClick={() => {
                    onChange(branch.name);
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  {branch.name}
                  {branch.name === defaultBranch && (
                    <span className="ml-2 text-xs text-gray-500">(default)</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Post-MVP: 高度なUI（検討）:**
```bash
npm install @headlessui/react
# または
npm install cmdk
```

これらのライブラリを使うと、アクセシビリティ対応やキーボードナビゲーションが簡単に実装できます。

---

### 6. Repo型の拡張（owner/name分離）

**問題:**
現在の `Repo` 型は `nameWithOwner` (例: "facebook/react") しかなく、owner と name を分離して扱いにくい。特にフォークのPR作成時、`head` に `owner:branch` 形式を渡す必要がある。

**解決策:**
`Repo` 型に `owner` と `name` フィールドを明示的に追加。

**型定義の修正:**
```typescript
// src/types/index.ts

export type Repo = {
  id: string;
  nameWithOwner: string; // 既存フィールド（後方互換性のため残す）
  owner: string;         // 新規: リポジトリオーナー
  name: string;          // 新規: リポジトリ名
  htmlUrl: string;
  pushedAt: string;
  isArchived: boolean;
  isPrivate: boolean;
  description?: string;
  primaryLanguage?: string;
  topics: string[];
};
```

**データ変換の実装:**
```typescript
// src/lib/transformRepository.ts

export function transformRepository(rawRepo: any): Repo {
  // nameWithOwner から owner と name を分離
  const [owner, name] = rawRepo.nameWithOwner.split('/');

  return {
    id: rawRepo.id,
    nameWithOwner: rawRepo.nameWithOwner,
    owner,
    name,
    htmlUrl: rawRepo.url,
    pushedAt: rawRepo.pushedAt,
    isArchived: rawRepo.isArchived,
    isPrivate: rawRepo.isPrivate,
    description: rawRepo.description,
    primaryLanguage: rawRepo.primaryLanguage?.name,
    topics: rawRepo.repositoryTopics.nodes.map((t: any) => t.topic.name),
  };
}
```

**フォークPR作成での使用例:**
```typescript
// src/api/github-actions.ts

export async function createPullRequest(
  repo: Repo,
  data: CreatePRData
): Promise<PRCreationResponse> {
  // repo.owner と repo.name を直接使用
  const response = await fetch(
    `/api/github/repos/${repo.owner}/${repo.name}/pulls`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        body: data.body,
        // フォークの場合: "user:branch" 形式
        head: data.isFork ? `${repo.owner}:${data.head}` : data.head,
        base: data.base,
        draft: data.draft,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create PR: ${response.statusText}`);
  }

  return response.json();
}
```

**メリット:**
- API呼び出し時に文字列分割不要
- フォーク判定が明確
- TypeScriptの型安全性向上

---

### 7. エラーハンドリングのベストプラクティス

**統一されたエラーレスポンス処理:**
```typescript
// src/api/github-actions.ts

class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

async function handleGitHubResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // GitHub API エラーメッセージの抽出
    const message =
      errorData.message ||
      errorData.errors?.[0]?.message ||
      `GitHub API error: ${response.statusText}`;

    throw new GitHubAPIError(message, response.status, errorData);
  }

  return response.json();
}

// 使用例
export async function createIssue(
  owner: string,
  repo: string,
  data: CreateIssueData
): Promise<IssueCreationResponse> {
  const response = await fetch(
    `/api/github/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

  return handleGitHubResponse<IssueCreationResponse>(response);
}
```

**フック側での統一されたエラーハンドリング:**
```typescript
// src/hooks/useCreateIssue.ts

export function useCreateIssue() {
  const createIssue = async (repo: Repo, data: CreateIssueData) => {
    try {
      const result = await createIssueAPI(repo.owner, repo.name, data);
      toast.success('Issue created successfully!');
      return result.html_url;
    } catch (err) {
      if (err instanceof GitHubAPIError) {
        // ステータスコード別の処理
        switch (err.status) {
          case 403:
            toast.error('You don\'t have permission to create issues in this repository');
            break;
          case 404:
            toast.error('Repository not found');
            break;
          case 422:
            toast.error(`Validation failed: ${err.message}`);
            break;
          case 429:
            toast.error('Rate limit exceeded. Please try again later');
            break;
          default:
            toast.error(`Failed to create issue: ${err.message}`);
        }
      } else {
        toast.error('An unexpected error occurred');
      }
      throw err;
    }
  };

  return { createIssue, isCreating, error };
}
```

---

## ⚠️ リスクと対策

### 1. GitHub APIレート制限
**リスク:** 短時間に多くのリクエストを送るとレート制限に達する（5000リクエスト/時間）

**対策:**
- ブランチ情報を5分間キャッシュ
- レート制限エラー（429）を適切にハンドリング
- エラーメッセージで制限解除時刻を表示
- ユーザーに待機を促す

**実装例:**
```typescript
if (error.status === 429) {
  const resetTime = error.response.headers['x-ratelimit-reset'];
  const resetDate = new Date(resetTime * 1000);
  toast.error(`Rate limit exceeded. Try again at ${resetDate.toLocaleTimeString()}`);
}
```

---

### 2. パーミッションエラー
**リスク:** ユーザーがリポジトリへの書き込み権限を持たない

**対策:**
- 403エラーを捕捉し、わかりやすいメッセージ表示
- PR作成には書き込み権限が必須であることを説明
- GitHubのリポジトリ設定へのリンクを提供

**実装例:**
```typescript
if (error.status === 403) {
  toast.error(
    'You don\'t have permission to create issues in this repository. ' +
    'Contact the repository owner for access.'
  );
}
```

---

### 3. ブランチバリデーション
**リスク:** 存在しないブランチ、無効なブランチ名、同じbase/headブランチ

**対策:**
- 基本的な存在チェックのみ実施
- 詳細なバリデーションはGitHub APIに委ねる
- APIからのエラーメッセージをユーザーに表示
- フロントエンドで重複PRチェック（オプション）

**実装例:**
```typescript
if (data.base === data.head) {
  toast.error('Base and head branches must be different');
  return;
}

// GitHub APIのエラーを表示
if (error.status === 422) {
  const message = error.response.data.errors?.[0]?.message ||
                  'Validation failed. Please check your input.';
  toast.error(message);
}
```

---

### 4. マルチアカウント対応
**リスク:** 間違ったアカウントでイシューやPRを作成してしまう

**対策:**
- モーダルヘッダーに「Creating as @username」を明確に表示
- セッション管理が自動的にアクティブアカウントを使用
- アカウント切り替え後に確認プロンプト（オプション）

**実装例:**
```tsx
<div className="modal-header">
  <h2>Create Issue in {repo.nameWithOwner}</h2>
  <p className="text-sm text-muted">
    Creating as <strong>@{currentUser.login}</strong>
  </p>
</div>
```

---

### 5. ネットワークエラー
**リスク:** オフライン、タイムアウト、サーバーエラー

**対策:**
- ネットワークエラーを適切にハンドリング
- リトライ機能の提供
- オフライン時に明確なメッセージ表示

**実装例:**
```typescript
catch (error) {
  if (!navigator.onLine) {
    toast.error('You are offline. Please check your internet connection.');
  } else if (error.name === 'AbortError') {
    toast.error('Request timed out. Please try again.');
  } else {
    toast.error('An unexpected error occurred. Please try again.');
  }
}
```

---

### 6. フォームバリデーション
**リスク:** 空のタイトル、無効な入力

**対策:**
- クライアント側でバリデーション実施
- タイトルは必須（空白除去後）
- 適切なエラーメッセージ表示
- リアルタイムバリデーション

**実装例:**
```typescript
const validateForm = () => {
  if (!title.trim()) {
    setError('Title is required');
    return false;
  }
  if (title.length > 256) {
    setError('Title must be less than 256 characters');
    return false;
  }
  return true;
};
```

---

### 7. モバイル対応
**リスク:** ドロップダウンやモーダルが小画面で見づらい

**対策:**
- レスポンシブデザインでテスト
- モバイルではフルスクリーンモーダル
- タッチ操作に最適化
- 仮想キーボードとの干渉を回避

**実装例:**
```css
@media (max-width: 640px) {
  .modal {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
}
```

---

## ✅ 完成基準

MVP完成の定義:

1. ✅ **イシュー作成**
   - ユーザーが30秒以内にイシューを作成できる
   - @メンションが正しく機能する
   - 成功時にGitHubのイシューページが開く

2. ✅ **プルリクエスト作成**
   - ユーザーが60秒以内にPRを作成できる（ブランチ選択含む）
   - ブランチセレクターがスムーズに動作する
   - ドラフトPRが作成できる
   - 成功時にGitHubのPRページが開く

3. ✅ **通知システム**
   - 成功/エラー/ローディングが明確にフィードバックされる
   - Toast通知が適切なタイミングで表示される
   - エラーメッセージが理解しやすい

4. ✅ **クロスプラットフォーム**
   - モバイルブラウザで動作する
   - タブレットで動作する
   - デスクトップで動作する
   - ダークモード/ライトモード両方で見やすい

5. ✅ **エラーハンドリング**
   - 認証エラーが発生しない
   - 権限エラーが適切に処理される
   - レート制限エラーが適切に処理される
   - ネットワークエラーが適切に処理される

6. ✅ **UX品質**
   - アニメーションがスムーズ
   - ローディング状態が明確
   - キーボードショートカットが動作する
   - アクセシビリティが考慮されている

---

## 📈 コード見積もり

### 新規作成コード

| ファイル | 行数 | 複雑度 |
|---------|------|--------|
| `github-actions.ts` | 200 | 中 |
| `useCreateIssue.ts` | 100 | 低 |
| `useCreatePR.ts` | 120 | 中 |
| `useRepositoryBranches.ts` | 80 | 低 |
| `CreateItemModal.tsx` | 300 | 高 |
| `BranchSelector.tsx` | 150 | 中 |
| `DropdownMenu.tsx` | 180 | 中 |
| **合計** | **1,130** | - |

### 修正するコード

| ファイル | 追加行数 | 複雑度 |
|---------|---------|--------|
| `types/index.ts` | 30 | 低 |
| `RepoCard.tsx` | 40 | 低 |
| `App.tsx` | 20 | 低 |
| **合計** | **90** | - |

### テストコード（オプション）

| カテゴリ | 行数 |
|---------|------|
| API関数テスト | 100 |
| フックテスト | 90 |
| コンポーネントテスト | 100 |
| **合計** | **290** |

### 総計

- **新規コード**: 1,130行
- **修正コード**: 90行
- **テストコード**: 290行（オプション）
- **総計**: 約1,510行

**コード共有による効率化:**
- 統合モーダルにより約40%のコード重複を削減
- 再利用可能なコンポーネント（DropdownMenu、BranchSelector）
- 共通のフック、ユーティリティ関数

---

## 🚀 実装後の拡張計画（Post-MVP）

### Phase 6: @メンション自動補完（+6時間）
- [ ] ユーザー検索API統合
- [ ] オートコンプリート入力コンポーネント
- [ ] アバター画像表示
- [ ] 最近のコラボレーター優先表示

### Phase 7: ラベル & マイルストーン（+4時間）
- [ ] リポジトリのラベル一覧取得
- [ ] ラベル選択UI
- [ ] マイルストーン一覧取得
- [ ] マイルストーン選択UI

### Phase 8: テンプレート対応（+5時間）
- [ ] `.github/ISSUE_TEMPLATE` の読み込み
- [ ] `.github/PULL_REQUEST_TEMPLATE` の読み込み
- [ ] テンプレート選択UI
- [ ] テンプレート内容の自動入力

### Phase 9: Markdownプレビュー（+3時間）
- [ ] Markdownレンダリングライブラリ統合
- [ ] プレビュータブ/分割ビュー
- [ ] シンタックスハイライト
- [ ] GitHub Flavored Markdown対応

### Phase 10: 下書き保存（+4時間）
- [ ] LocalStorageに下書き保存
- [ ] 自動保存機能
- [ ] 下書き復元UI
- [ ] 下書き一覧表示

---

## 📚 参考資料

### GitHub API ドキュメント
- [Issues API](https://docs.github.com/en/rest/issues/issues)
- [Pull Requests API](https://docs.github.com/en/rest/pulls/pulls)
- [Branches API](https://docs.github.com/en/rest/branches/branches)
- [Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)

### ライブラリドキュメント
- [react-hot-toast](https://react-hot-toast.com/)
- [Octokit REST](https://octokit.github.io/rest.js/)

### デザインリファレンス
- [GitHub UI Patterns](https://primer.style/design/)
- [TailwindCSS](https://tailwindcss.com/docs)

---

## 🎉 まとめ

この実装計画により、DevBoardアプリケーションに以下の機能が追加されます:

- **イシュー作成**: リポジトリカードから直接GitHubイシューを作成
- **プルリクエスト作成**: ブランチを選択してPRを作成（ドラフト対応）
- **@メンション機能**: イシュー/PRの本文でユーザーをメンション
- **リッチな通知**: react-hot-toastによる美しいフィードバック

**開発時間**: 約10時間（1.5日）
**コード量**: 約1,510行（テスト含む）
**依存関係追加**: react-hot-toast のみ

統合モーダルと再利用可能なコンポーネントにより、保守性と拡張性の高い実装を実現します。
