# DevBoard ToDo-Issue連携機能実装計画書

**作成日**: 2025-11-17
**バージョン**: 1.0
**ステータス**: 計画中
**優先度**: 3（タグ機能、AI統合の次）

## 1. 概要

### 1.1 目的
リポジトリに紐付いたToDoタスクを管理し、GitHub Issuesと双方向同期することで、DevBoard上での開発タスク管理を実現する。

### 1.2 スコープ
- **ToDo管理**: リポジトリ別のタスク作成・編集・削除
- **Issue連携**: GitHub Issuesとの双方向同期
- **進捗管理**: ステータス管理（未着手/進行中/完了）
- **優先度管理**: High/Medium/Low
- **期限管理**: 期日設定とリマインダー
- **統合ビュー**: 全リポジトリ横断のToDoリスト

### 1.3 成功基準
- ✅ リポジトリ別にToDoを作成・管理できる
- ✅ ToDoからGitHub Issueを作成できる
- ✅ GitHub IssueをToDoとしてインポートできる
- ✅ ToDo完了時にIssueをクローズできる（オプション）
- ✅ Issue更新時にToDoを自動同期できる
- ✅ 期限切れタスクの通知
- ✅ 優先度・期限でのソート・フィルタリング

---

## 2. アーキテクチャ設計

### 2.1 データモデル

```typescript
// src/types/todo.ts

/**
 * ToDo ステータス
 */
export type TodoStatus = 'todo' | 'in_progress' | 'done';

/**
 * ToDo 優先度
 */
export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * ToDo アイテム
 */
export type Todo = {
  id: string;                    // UUID
  title: string;                 // タイトル
  description?: string;          // 説明（Markdown対応）
  repoId: string;                // 関連リポジトリID
  status: TodoStatus;            // ステータス
  priority: TodoPriority;        // 優先度
  dueDate?: string;              // 期日（ISO 8601）
  assignee?: string;             // 担当者（GitHubユーザー名）
  labels: string[];              // ラベル
  issueNumber?: number;          // 連携しているIssue番号
  issueUrl?: string;             // Issue URL
  syncEnabled: boolean;          // Issue同期有効/無効
  createdAt: string;             // 作成日時
  updatedAt: string;             // 更新日時
  completedAt?: string;          // 完了日時
};

/**
 * ToDo グループ（リポジトリ別）
 */
export type TodoGroup = {
  repoId: string;
  repoName: string;
  todos: Todo[];
  totalCount: number;
  doneCount: number;
};

/**
 * ToDo 統計情報
 */
export type TodoStats = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;              // 期限切れ
  dueToday: number;             // 今日期限
  dueThisWeek: number;          // 今週期限
};

/**
 * Issue 同期設定
 */
export type IssueSyncConfig = {
  enabled: boolean;              // 同期有効/無効
  autoImport: boolean;           // 新規Issue自動インポート
  autoClose: boolean;            // ToDo完了時にIssue自動クローズ
  syncInterval: number;          // 同期間隔（分）
  lastSyncAt?: string;           // 最終同期日時
};

/**
 * ToDo フィルター
 */
export type TodoFilter = {
  status?: TodoStatus[];         // ステータスフィルター
  priority?: TodoPriority[];     // 優先度フィルター
  repoIds?: string[];            // リポジトリフィルター
  assignee?: string;             // 担当者フィルター
  labels?: string[];             // ラベルフィルター
  dueDateRange?: {               // 期日範囲
    start?: string;
    end?: string;
  };
  searchQuery?: string;          // 検索クエリ
};

/**
 * ToDo ソート
 */
export type TodoSort =
  | 'priority'                   // 優先度順
  | 'dueDate'                    // 期日順
  | 'createdAt'                  // 作成日順
  | 'updatedAt'                  // 更新日順
  | 'title';                     // タイトル順
```

### 2.2 ストレージ設計

#### 2.2.1 ストレージオプション比較

| 項目 | localStorage | Cloudflare KV | Cloudflare D1 | Durable Objects |
|------|-------------|---------------|---------------|-----------------|
| **容量制限** | ~5MB | 実質無制限 | 実質無制限 | 実質無制限 |
| **同期** | なし（端末固有） | グローバル | グローバル | グローバル |
| **一貫性** | 即座 | 結果整合性 | 強整合性 | 強整合性 |
| **トランザクション** | ❌ | ❌ | ✅ | ✅ |
| **複雑クエリ** | ❌ | ❌ | ✅（SQL） | ⚠️ |
| **コスト** | 無料 | 読み$0.50/1M、書き$5/1M | Alpha（無料） | $0.15/1M req |
| **適用** | MVP | Post-MVP（同期） | 将来（高度なクエリ） | 将来（リアルタイム） |

#### 2.2.2 MVP ストレージ戦略

**Phase 1 (MVP):**
- **ToDo データ**: `localStorage`
  - キー: `github-dashboard-todos:{accountId}`
  - 値: `Todo[]`（最大500件）
  - アーカイブ: 完了後30日経過したToDoは自動削除

- **同期設定**: `localStorage`
  - キー: `github-dashboard-issue-sync-config:{accountId}`
  - 値: `IssueSyncConfig`

- **フィルター状態**: `localStorage`
  - キー: `github-dashboard-todo-filter:{accountId}`
  - 値: `TodoFilter`

**Phase 2 (Post-MVP):**
- **ToDo データ**: Cloudflare KV または D1 に移行
  - 複数端末での同期
  - 無制限のToDo保存
  - リアルタイム同期（Durable Objects使用時）

**容量見積もり:**
```typescript
// ToDo 1件: ~800B（説明200文字想定）
// 500件: ~400KB
// 同期設定: ~200B
// フィルター状態: ~500B
// 合計: ~400KB（5MB制限に対して十分余裕あり）
```

#### 2.2.3 ストレージキー設計

**キー:**
- `github-dashboard-todos:{accountId}` → `Todo[]`
- `github-dashboard-issue-sync-config:{accountId}` → `IssueSyncConfig`
- `github-dashboard-todo-filter:{accountId}` → `TodoFilter`
- `github-dashboard-todo-sync-state:{accountId}` → `{ lastSyncAt: string; syncInProgress: boolean }`

#### 2.2.4 同期戦略

**基本方針:**
- **ソース・オブ・トゥルース**: GitHub Issues（サーバー側）
- **ローカル編集**: localStorage で即座に反映
- **バックグラウンド同期**: 定期的に GitHub Issues と双方向同期
- **競合解決**: デフォルトで GitHub Issues 優先、ユーザー選択も可能

**同期フロー:**
```typescript
// 1. ローカル変更をキューに追加
const syncQueue: Array<{ action: 'create' | 'update' | 'delete'; todo: Todo }> = [];

// 2. バックグラウンド同期実行
async function syncTodos() {
  // 2.1 GitHub Issuesを取得
  const issues = await fetchIssues();

  // 2.2 ローカルToDoと比較
  const { toCreate, toUpdate, conflicts } = compareTodos(localTodos, issues);

  // 2.3 競合解決
  for (const conflict of conflicts) {
    const resolution = await resolveConflict(conflict);
    if (resolution === 'server') {
      updateLocalTodo(conflict.issue);
    } else {
      await updateGitHubIssue(conflict.todo);
    }
  }

  // 2.4 変更を適用
  await createIssues(toCreate);
  await updateIssues(toUpdate);
}
```

#### 2.2.5 データ保持ポリシー

**自動削除ルール:**
- 完了後30日経過したToDo → アーカイブまたは削除
- 未連携の削除済みToDo → 即座に削除
- Issue連携済みの削除済みToDo → 30日後に削除（復元可能期間）

**容量制限対策:**
- ToDoが500件を超えたら警告表示
- 古い完了ToDoを自動アーカイブ
- ユーザーに手動アーカイブを促す

### 2.3 GitHub API統合

#### GraphQL クエリ

**Issue一覧取得:**
```graphql
query GetRepositoryIssues($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        body
        state
        createdAt
        updatedAt
        closedAt
        url
        labels(first: 10) {
          nodes {
            name
          }
        }
        assignees(first: 5) {
          nodes {
            login
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

**Issue作成:**
```graphql
mutation CreateIssue($repositoryId: ID!, $title: String!, $body: String, $assigneeIds: [ID!], $labelIds: [ID!]) {
  createIssue(input: {
    repositoryId: $repositoryId
    title: $title
    body: $body
    assigneeIds: $assigneeIds
    labelIds: $labelIds
  }) {
    issue {
      id
      number
      url
    }
  }
}
```

**Issue更新:**
```graphql
mutation UpdateIssue($issueId: ID!, $title: String, $body: String, $state: IssueState) {
  updateIssue(input: {
    id: $issueId
    title: $title
    body: $body
    state: $state
  }) {
    issue {
      id
      number
      state
      updatedAt
    }
  }
}
```

**Issueクローズ:**
```graphql
mutation CloseIssue($issueId: ID!) {
  closeIssue(input: { issueId: $issueId }) {
    issue {
      id
      state
      closedAt
    }
  }
}
```

### 2.4 API設計

#### Cloudflare Functions エンドポイント

```
/api/todos/sync
  POST - ToDo と GitHub Issues を同期
  Body: { repoId, direction: 'import' | 'export' | 'bidirectional' }
  Response: { syncedCount, conflicts }

/api/todos/create-issue
  POST - ToDo から GitHub Issue を作成
  Body: { todoId }
  Response: { issueNumber, issueUrl }

/api/todos/import-issues
  POST - GitHub Issues を ToDo としてインポート
  Body: { repoId, issueNumbers?: number[] }
  Response: { importedCount, todos }

/api/todos/close-issue
  POST - ToDo 完了時に Issue をクローズ
  Body: { todoId, issueId }
  Response: { success }
```

### 2.5 コンポーネント構成

```
App
├── TodoPanel (NEW)                    // ToDoパネル（サイドバー or タブ）
│   ├── TodoStats                      // 統計表示
│   ├── TodoFilters                    // フィルター
│   ├── TodoList                       // ToDo一覧
│   │   └── TodoItem                   // ToDoアイテム
│   └── TodoGroupView                  // リポジトリ別グループ表示
├── TodoBoard (NEW)                    // ToDoボード（カンバン形式）
│   ├── TodoColumn                     // ステータス別カラム
│   │   └── TodoCard                   // ToDoカード
│   └── TodoDragDrop                   // ドラッグ＆ドロップ
├── TodoDetail (NEW)                   // ToDo詳細モーダル
│   ├── TodoEditor                     // 編集フォーム
│   ├── IssueSyncStatus                // Issue同期状態
│   └── TodoHistory                    // 変更履歴
├── TodoCreate (NEW)                   // ToDo作成モーダル
│   ├── RepoSelector                   // リポジトリ選択
│   ├── PrioritySelector               // 優先度選択
│   └── DueDatePicker                  // 期日選択
├── IssueSyncSettings (NEW)            // Issue同期設定
│   ├── SyncToggle                     // 同期ON/OFF
│   ├── AutoImportToggle               // 自動インポート
│   └── SyncIntervalSelector           // 同期間隔
└── RepoCard
    └── TodoBadge (NEW)                // リポジトリ別ToDo件数バッジ
```

---

## 3. 実装フェーズ

### フェーズ1: データ層・ストレージ (2-3h)

#### タスク

1. **型定義作成** (`src/types/todo.ts`)
   - Todo, TodoGroup, TodoStats, IssueSyncConfig等の型定義

2. **ToDoストレージ** (`src/utils/todoStorage.ts`)
   ```typescript
   // 主要な関数
   - getTodos(accountId: string): Todo[]
   - saveTodos(accountId: string, todos: Todo[]): void
   - createTodo(accountId: string, todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Todo
   - updateTodo(accountId: string, todoId: string, updates: Partial<Todo>): void
   - deleteTodo(accountId: string, todoId: string): void
   - getTodosByRepo(accountId: string, repoId: string): Todo[]
   - getTodoStats(accountId: string): TodoStats

   - getIssueSyncConfig(accountId: string): IssueSyncConfig
   - saveIssueSyncConfig(accountId: string, config: IssueSyncConfig): void
   ```

3. **Issue同期ロジック** (`src/utils/issueSync.ts`)
   ```typescript
   /**
    * GitHub Issues をインポート
    */
   async function importIssuesFromGitHub(
     repoId: string,
     issueNumbers?: number[]
   ): Promise<Todo[]>

   /**
    * ToDo から Issue を作成
    */
   async function createIssueFromTodo(todo: Todo): Promise<{ number: number; url: string }>

   /**
    * ToDo と Issue を同期
    */
   async function syncTodoWithIssue(todo: Todo): Promise<Todo>

   /**
    * Issue を Todoにマッピング
    */
   function mapIssueToTodo(issue: GitHubIssue, repoId: string): Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>

   /**
    * Issue ステータスと ToDo ステータスを変換
    */
   function issueStateToTodoStatus(state: 'OPEN' | 'CLOSED'): TodoStatus
   function todoStatusToIssueState(status: TodoStatus): 'OPEN' | 'CLOSED'
   ```

4. **Cloudflare Functions実装**
   - `/api/todos/sync` エンドポイント
   - `/api/todos/create-issue` エンドポイント
   - `/api/todos/import-issues` エンドポイント
   - `/api/todos/close-issue` エンドポイント
   - GitHub GraphQL統合

5. **カスタムフック** (`src/hooks/useTodos.ts`)
   ```typescript
   export function useTodos(repoId?: string) {
     const { currentAccount } = useAuth();
     const [todos, setTodos] = useState<Todo[]>([]);
     const [stats, setStats] = useState<TodoStats | null>(null);
     const [isLoading, setIsLoading] = useState(false);
     const [syncConfig, setSyncConfig] = useState<IssueSyncConfig | null>(null);

     // CRUD操作
     const createTodo = async (data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => { ... };
     const updateTodo = async (todoId: string, updates: Partial<Todo>) => { ... };
     const deleteTodo = async (todoId: string) => { ... };

     // Issue連携
     const createIssueFromTodo = async (todoId: string) => { ... };
     const importIssues = async (issueNumbers?: number[]) => { ... };
     const syncWithGitHub = async () => { ... };

     return {
       todos,
       stats,
       syncConfig,
       createTodo,
       updateTodo,
       deleteTodo,
       createIssueFromTodo,
       importIssues,
       syncWithGitHub,
       isLoading,
     };
   }
   ```

#### 成果物
- `src/types/todo.ts`
- `src/utils/todoStorage.ts`
- `src/utils/issueSync.ts`
- `functions/api/todos/sync.ts`
- `functions/api/todos/create-issue.ts`
- `functions/api/todos/import-issues.ts`
- `functions/api/todos/close-issue.ts`
- `src/hooks/useTodos.ts`

---

### フェーズ2: 基本UIコンポーネント (3-4h)

#### 2.1 TodoItem コンポーネント

**ファイル**: `src/components/TodoItem.tsx`

**Props:**
```typescript
type TodoItemProps = {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
  onDelete: () => void;
  onClick: () => void;
  showRepo?: boolean;            // リポジトリ名表示
};
```

**機能:**
- チェックボックス（ステータス切り替え）
- タイトル・説明の表示
- 優先度インジケーター（色分け）
- 期日表示（期限切れは赤色）
- Issueバッジ（連携中の場合）
- リポジトリ名（グローバルビューの場合）
- コンテキストメニュー（編集・削除・Issue作成）

**UI構成:**
```
┌─────────────────────────────────────────┐
│ ☐ [H] 認証機能の実装          📅 12/25  │
│     owner/repo-name            🔗 #123  │
│     OAuth 2.0を使用した認証を実装する   │
│                         [編集] [削除]   │
└─────────────────────────────────────────┘

凡例:
- ☐/☑: チェックボックス
- [H]/[M]/[L]: 優先度（High/Medium/Low）
- 📅: 期日
- 🔗: Issue連携
```

#### 2.2 TodoList コンポーネント

**ファイル**: `src/components/TodoList.tsx`

**機能:**
- ToDo一覧表示
- 仮想スクロール（大量データ対応）
- グループ化（リポジトリ別、ステータス別、優先度別）
- ソート（優先度、期日、作成日、更新日）
- フィルタリング
- ドラッグ＆ドロップ（並び替え）

**UI構成:**
```
┌─────────────────────────────────────────┐
│ ToDo (15)               [+新規作成]     │
├─────────────────────────────────────────┤
│ [フィルター] [ソート] [グループ]       │
│                                         │
│ ▼ owner/repo-1 (5)                     │
│   ☐ [H] タスク1                📅期限  │
│   ☑ [M] タスク2                        │
│   ☐ [L] タスク3                🔗 #10  │
│                                         │
│ ▼ owner/repo-2 (3)                     │
│   ☐ [H] タスク4                📅今日  │
│   ☐ [M] タスク5                        │
│                                         │
│ [さらに読み込む]                       │
└─────────────────────────────────────────┘
```

#### 2.3 TodoDetail モーダル

**ファイル**: `src/components/TodoDetail.tsx`

**機能:**
- ToDo詳細表示・編集
- Markdown対応の説明エディター
- リポジトリ選択
- ステータス変更
- 優先度変更
- 期日設定
- ラベル管理
- Issue連携状態表示
- Issue作成/リンク/同期ボタン

**UI構成:**
```
┌─────────────────────────────────────────┐
│ ToDo詳細                       [×]      │
├─────────────────────────────────────────┤
│ タイトル:                               │
│ [認証機能の実装___________________]     │
│                                         │
│ リポジトリ: [owner/repo ▼]             │
│                                         │
│ ステータス: ● 未着手 ○ 進行中 ○ 完了  │
│                                         │
│ 優先度: ● High  ○ Medium  ○ Low        │
│                                         │
│ 期日: [2025-12-25 ▼]                   │
│                                         │
│ 説明:                                   │
│ ┌─────────────────────────────────────┐ │
│ │ OAuth 2.0を使用した認証を実装する   │ │
│ │ - GitHub認証                        │ │
│ │ - トークン管理                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Issue連携:                              │
│ ┌─────────────────────────────────────┐ │
│ │ 🔗 Issue #123                       │ │
│ │ [同期] [Issueを開く] [連携解除]    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ または: [新しいIssueを作成]            │
│                                         │
│                    [キャンセル] [保存]  │
└─────────────────────────────────────────┘
```

#### 成果物
- `src/components/TodoItem.tsx`
- `src/components/TodoList.tsx`
- `src/components/TodoDetail.tsx`
- `src/components/TodoStats.tsx`

---

### フェーズ3: ToDoボード（カンバン形式） (3-4h)

#### 3.1 TodoBoard コンポーネント

**ファイル**: `src/components/TodoBoard.tsx`

**機能:**
- カンバンスタイルのボード表示
- 3カラム: 未着手 / 進行中 / 完了
- ドラッグ＆ドロップでステータス変更
- カラムごとの件数表示
- カードのコンパクト表示

**UI構成:**
```
┌─────────────────────────────────────────────────────────────┐
│ ToDoボード                              [リスト表示に切替]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ 未着手 (8)  │ │ 進行中 (3)  │ │ 完了 (12)   │           │
│ ├─────────────┤ ├─────────────┤ ├─────────────┤           │
│ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │           │
│ │ │[H] タスク1│ │ │[M] タスク4│ │ │[L] タスク7│ │           │
│ │ │repo-1    │ │ │repo-2    │ │ │repo-1    │ │           │
│ │ │📅 12/25  │ │ │🔗 #15    │ │ │✓ 完了    │ │           │
│ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │           │
│ │             │ │             │ │             │           │
│ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │           │
│ │ │[M] タスク2│ │ │[H] タスク5│ │ │[M] タスク8│ │           │
│ │ │repo-1    │ │ │repo-3    │ │ │repo-2    │ │           │
│ │ │📅 今日   │ │ │           │ │ │✓ 完了    │ │           │
│ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │           │
│ │             │ │             │ │             │           │
│ │ [+ 追加]    │ │             │ │             │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 TodoCard コンポーネント

**ファイル**: `src/components/TodoCard.tsx`

**機能:**
- コンパクトなカード表示
- ドラッグハンドル
- 優先度・期日・Issue連携のインジケーター
- ホバーでアクションボタン表示

#### 3.3 ドラッグ＆ドロップ実装

**ライブラリ**: `@dnd-kit/core` (既存のFramer Motionと統合可能)

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';

function TodoBoard() {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const todoId = active.id as string;
    const newStatus = over.id as TodoStatus;

    updateTodo(todoId, { status: newStatus });
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <TodoColumn status="todo" />
      <TodoColumn status="in_progress" />
      <TodoColumn status="done" />
    </DndContext>
  );
}
```

#### 成果物
- `src/components/TodoBoard.tsx`
- `src/components/TodoColumn.tsx`
- `src/components/TodoCard.tsx`

---

### フェーズ4: Issue同期機能 (3-4h)

#### 4.1 Issue同期設定UI

**ファイル**: `src/components/IssueSyncSettings.tsx`

**機能:**
- 同期ON/OFF切り替え
- 自動インポート設定
- 自動クローズ設定
- 同期間隔設定（5分/15分/30分/1時間）
- 手動同期ボタン
- 最終同期日時表示
- 同期履歴表示

**UI構成:**
```
┌─────────────────────────────────────────┐
│ Issue同期設定                  [×]      │
├─────────────────────────────────────────┤
│ Issue同期を有効化                       │
│ [ON ●───○ OFF]                         │
│                                         │
│ 自動インポート                          │
│ 新しいIssueを自動的にToDoとして追加     │
│ [ON ●───○ OFF]                         │
│                                         │
│ 自動クローズ                            │
│ ToDo完了時にIssueを自動的にクローズ     │
│ [ON ○───● OFF]                         │
│                                         │
│ 同期間隔: [15分 ▼]                     │
│                                         │
│ 最終同期: 2分前                         │
│ [今すぐ同期]                           │
│                                         │
│ 同期履歴:                               │
│ ┌─────────────────────────────────────┐ │
│ │ 2025-11-17 14:32 - 5件インポート    │ │
│ │ 2025-11-17 14:17 - 変更なし         │ │
│ │ 2025-11-17 14:02 - 2件更新          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│                          [閉じる]       │
└─────────────────────────────────────────┘
```

#### 4.2 Issueインポートフロー

**手動インポート:**
1. リポジトリ選択
2. Issueリスト表示（未インポートのみ）
3. インポートするIssueを選択（チェックボックス）
4. [インポート]ボタンクリック
5. ToDoとして追加

**自動インポート:**
- 設定した間隔で自動実行
- 新規作成されたIssueを検出
- バックグラウンドでToDoに追加
- 通知表示（Toast）

#### 4.3 Issue作成フロー

**フロー:**
1. ToDoからIssue作成ボタンクリック
2. 確認ダイアログ表示
   - Issue情報のプレビュー
   - タイトル・本文の最終確認
3. GitHub APIでIssue作成
4. 作成されたIssue番号・URLをToDoに保存
5. `syncEnabled: true` に設定
6. 成功通知（Toast + Issue URLリンク）

#### 4.4 同期ロジック

**双方向同期:**
```typescript
async function syncTodoWithIssue(todo: Todo): Promise<Todo> {
  if (!todo.issueNumber || !todo.syncEnabled) return todo;

  // GitHub Issueを取得
  const issue = await fetchIssue(todo.repoId, todo.issueNumber);

  // 競合検出: どちらが新しいか
  const todoUpdatedAt = new Date(todo.updatedAt);
  const issueUpdatedAt = new Date(issue.updatedAt);

  if (issueUpdatedAt > todoUpdatedAt) {
    // Issueが新しい → ToDoを更新
    return {
      ...todo,
      title: issue.title,
      description: issue.body,
      status: issueStateToTodoStatus(issue.state),
      labels: issue.labels.map(l => l.name),
      assignee: issue.assignees[0]?.login,
      updatedAt: issue.updatedAt,
    };
  } else if (todoUpdatedAt > issueUpdatedAt) {
    // ToDoが新しい → Issueを更新
    await updateIssue(issue.id, {
      title: todo.title,
      body: todo.description,
      state: todoStatusToIssueState(todo.status),
    });
    return todo;
  }

  // 同じタイムスタンプ → 同期不要
  return todo;
}
```

#### 成果物
- `src/components/IssueSyncSettings.tsx`
- `src/components/IssueImportDialog.tsx`
- `src/utils/issueSyncWorker.ts` (バックグラウンド同期)

---

### フェーズ5: フィルター・ソート機能 (2-3h)

#### 5.1 TodoFilters コンポーネント

**ファイル**: `src/components/TodoFilters.tsx`

**機能:**
- ステータスフィルター（複数選択）
- 優先度フィルター（複数選択）
- リポジトリフィルター（複数選択）
- ラベルフィルター
- 期日フィルター（期限切れ/今日/今週/今月/カスタム範囲）
- テキスト検索
- フィルタークリア
- フィルター保存（次回起動時に復元）

**UI構成:**
```
┌─────────────────────────────────────────┐
│ フィルター                              │
├─────────────────────────────────────────┤
│ ステータス:                             │
│ ☑ 未着手  ☑ 進行中  ☐ 完了             │
│                                         │
│ 優先度:                                 │
│ ☑ High  ☑ Medium  ☑ Low                │
│                                         │
│ リポジトリ: [すべて ▼]                 │
│                                         │
│ 期日:                                   │
│ ○ すべて                                │
│ ○ 期限切れ                              │
│ ○ 今日                                  │
│ ○ 今週                                  │
│ ● カスタム [2025-11-17] 〜 [12-31]    │
│                                         │
│ [クリア] [適用]                        │
└─────────────────────────────────────────┘
```

#### 5.2 ソート機能

**実装:**
```typescript
function sortTodos(todos: Todo[], sortBy: TodoSort): Todo[] {
  switch (sortBy) {
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return [...todos].sort((a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );

    case 'dueDate':
      return [...todos].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    case 'createdAt':
      return [...todos].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    case 'updatedAt':
      return [...todos].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    case 'title':
      return [...todos].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
  }
}
```

#### 成果物
- `src/components/TodoFilters.tsx`
- `src/utils/todoFilters.ts`
- `src/utils/todoSort.ts`

---

### フェーズ6: 統合・通知機能 (2-3h)

#### 6.1 RepoCard統合

**修正ファイル**: `src/components/RepoCard.tsx`

**追加機能:**
- ToDoバッジ表示（未完了件数）
- クリックでそのリポジトリのToDoフィルタービューを開く
- コンテキストメニューに「ToDoを追加」

**UI:**
```
┌─────────────────────────────┐
│ owner/repo-name    [🏷️] [3]│  ← 3: 未完了ToDo件数
│ 説明文...                    │
│ TypeScript  ⭐123           │
└─────────────────────────────┘
```

#### 6.2 期限通知機能

**実装:**
- ブラウザ通知API使用
- 通知タイミング:
  - 期限当日の朝9時
  - 期限1時間前
  - 期限切れ直後
- 通知設定（ON/OFF、タイミングカスタマイズ）

**通知内容:**
```
📅 期限のお知らせ

「認証機能の実装」の期限が今日です
owner/repo-name

[詳細を見る] [完了にする]
```

#### 6.3 統計ダッシュボード

**ファイル**: `src/components/TodoDashboard.tsx`

**機能:**
- 全体統計表示
  - 総タスク数
  - ステータス別内訳（円グラフ）
  - 優先度別内訳（棒グラフ）
  - 期限別内訳（期限切れ/今日/今週/今月）
- リポジトリ別統計
  - リポジトリごとのタスク数
  - 完了率
- 進捗トレンド
  - 週別完了タスク数（折れ線グラフ）
  - 月別完了率

**UI構成:**
```
┌─────────────────────────────────────────┐
│ ToDo統計                                │
├─────────────────────────────────────────┤
│ 全体サマリー                            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │ 45  │ │ 12  │ │  8  │ │ 25  │       │
│ │総数 │ │未着手│ │進行中│ │完了 │       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                         │
│ ステータス別      優先度別               │
│ ┌─────────┐     ┌─────────┐           │
│ │ ●未着手 │     │████ H   │           │
│ │ ●進行中 │     │███ M    │           │
│ │ ●完了   │     │█ L      │           │
│ └─────────┘     └─────────┘           │
│                                         │
│ 期限別                                  │
│ 期限切れ: 3件 🔴                        │
│ 今日: 2件 🟡                            │
│ 今週: 5件 🟢                            │
│                                         │
│ リポジトリ別タスク数                    │
│ owner/repo-1: 15件 (完了率: 60%)       │
│ owner/repo-2: 8件 (完了率: 75%)        │
│ owner/repo-3: 12件 (完了率: 50%)       │
└─────────────────────────────────────────┘
```

#### 成果物
- 修正: `src/components/RepoCard.tsx`
- `src/components/TodoNotification.tsx`
- `src/components/TodoDashboard.tsx`
- `src/utils/todoNotifications.ts`

---

### フェーズ7: 仕上げ・テスト (2-3h)

#### 7.1 エラーハンドリング

1. **Issue作成/更新エラー**
   - 権限不足 → 権限確認案内
   - ネットワークエラー → リトライ
   - Issue重複 → 既存Issue選択

2. **同期競合**
   - GitHub優先（サーバー側が真実）
   - 競合通知とマニュアル解決UI

3. **データ不整合**
   - Issueが削除された場合 → ToDo側の連携解除
   - リポジトリが削除された場合 → ToDoも削除（確認付き）

#### 7.2 パフォーマンス最適化

1. **仮想スクロール**
   - `react-window` 使用
   - 大量ToDo（100+）でも滑らか

2. **バックグラウンド同期**
   - Web Worker使用
   - UI操作をブロックしない

3. **キャッシュ戦略**
   - Issue情報のキャッシュ（5分）
   - 同期結果のキャッシュ

#### 7.3 アクセシビリティ

1. **キーボード操作**
   - `n`: 新規ToDo作成
   - `f`: フィルター開く
   - `/`: 検索フォーカス
   - `Space`: チェックボックストグル
   - `Enter`: ToDo詳細開く

2. **ARIA属性**
   - `role="list"` for TodoList
   - `role="listitem"` for TodoItem
   - `aria-label` for すべてのボタン
   - `aria-live="polite"` for 通知

3. **スクリーンリーダー**
   - 適切なラベル
   - 状態変更の音声フィードバック

#### 7.4 テスト

1. **ユニットテスト**
   - todoStorage.ts
   - issueSync.ts
   - フィルター・ソートロジック

2. **統合テスト**
   - Issue作成フロー
   - Issue同期フロー
   - CRUD操作

3. **E2Eテスト**
   - ToDo作成 → Issue作成 → 同期
   - Issue更新 → ToDo同期
   - ToDo完了 → Issue自動クローズ

#### 成果物
- エラーハンドリング実装
- パフォーマンス最適化
- アクセシビリティ改善
- テストコード

---

## 4. Issue連携の詳細仕様

### 4.1 ToDoからIssue作成

**マッピング:**
```typescript
Todo → GitHub Issue:
- title → title
- description → body
- priority → label (priority:high, priority:medium, priority:low)
- dueDate → milestone（該当する場合）
- labels → labels
```

**Issue本文フォーマット:**
```markdown
<!-- DevBoard ToDo -->

{todo.description}

---

**優先度**: {priority}
**期日**: {dueDate}

_この Issue は DevBoard から作成されました_
```

### 4.2 IssueからToDo作成

**マッピング:**
```typescript
GitHub Issue → Todo:
- title → title
- body → description
- state (OPEN/CLOSED) → status (todo/done)
- labels → priority（priority:*ラベルから）+ labels
- assignees[0] → assignee
- createdAt → createdAt
- updatedAt → updatedAt
```

**優先度判定:**
```typescript
function extractPriority(labels: string[]): TodoPriority {
  if (labels.includes('priority:high')) return 'high';
  if (labels.includes('priority:medium')) return 'medium';
  if (labels.includes('priority:low')) return 'low';

  // デフォルト: ラベルから推測
  if (labels.some(l => /urgent|critical|blocker/i.test(l))) return 'high';
  if (labels.some(l => /bug|enhancement/i.test(l))) return 'medium';
  return 'low';
}
```

### 4.3 同期競合の解決

**競合検出:**
- ToDoとIssueの両方が更新されている
- `updatedAt` タイムスタンプで判定

**解決戦略:**
1. **サーバー優先（デフォルト）**: Issueの内容を採用
2. **クライアント優先**: ToDoの内容を採用（設定で選択可能）
3. **マニュアル解決**: ユーザーに選択させる

**競合UI:**
```
┌─────────────────────────────────────────┐
│ 同期競合の解決                          │
├─────────────────────────────────────────┤
│ ToDoとIssueの両方が更新されています。   │
│ どちらの内容を採用しますか？            │
│                                         │
│ ○ Issue の内容を採用（推奨）            │
│   タイトル: "認証機能の実装 v2"         │
│   ステータス: Open                      │
│   更新日時: 5分前                       │
│                                         │
│ ○ ToDo の内容を採用                     │
│   タイトル: "認証機能の実装"            │
│   ステータス: 進行中                    │
│   更新日時: 10分前                      │
│                                         │
│            [Issue採用] [ToDo採用]       │
└─────────────────────────────────────────┘
```

### 4.4 同期状態管理

#### 4.4.1 ソース・オブ・トゥルースの明確化

**基本原則:**
- **GitHub Issues**: サーバー側の真実の源（Source of Truth）
- **ローカルToDo**: クライアント側のキャッシュ + 一時編集
- **競合時**: GitHub Issues を優先（設定で変更可能）

**データフローと状態:**
```typescript
type SyncState =
  | { status: 'idle' }
  | { status: 'syncing'; progress: number }
  | { status: 'conflict'; conflicts: ConflictItem[] }
  | { status: 'error'; error: Error };

type ConflictItem = {
  todoId: string;
  localVersion: Todo;
  remoteVersion: Issue;
  updatedAtDiff: number; // 秒単位の差分
  conflictFields: Array<'title' | 'description' | 'status' | 'priority' | 'dueDate'>;
};
```

#### 4.4.2 3-Way マージアルゴリズム

**実装:**
```typescript
function threeWayMerge(base: Todo, local: Todo, remote: Issue): Todo | 'conflict' {
  const merged: Partial<Todo> = {};

  for (const field of ['title', 'description', 'status', 'priority', 'dueDate'] as const) {
    const baseValue = base[field];
    const localValue = local[field];
    const remoteValue = mapIssueField(remote, field);

    // 両方とも変更なし
    if (localValue === baseValue && remoteValue === baseValue) {
      merged[field] = baseValue;
    }
    // ローカルのみ変更
    else if (localValue !== baseValue && remoteValue === baseValue) {
      merged[field] = localValue;
    }
    // リモートのみ変更
    else if (localValue === baseValue && remoteValue !== baseValue) {
      merged[field] = remoteValue;
    }
    // 両方変更（競合）
    else if (localValue !== remoteValue) {
      return 'conflict';
    }
    // 両方同じ値に変更（自動マージ可能）
    else {
      merged[field] = localValue;
    }
  }

  return { ...base, ...merged };
}
```

#### 4.4.3 削除・孤立データの処理

**削除シナリオ:**

| ローカルToDo | GitHub Issue | 処理 |
|-------------|-------------|------|
| 存在 | 削除済み | ToDoを「削除済み」マーク、30日後に完全削除 |
| 削除済み | 存在 | Issue を基に ToDo を復元（ユーザーに確認） |
| 削除済み | 削除済み | 完全削除 |
| 存在（未連携） | - | ローカルのみ保持 |
| - | 新規作成 | 自動インポート（設定による） |

**孤立データクリーンアップ:**
```typescript
// 30日以上前の削除済みToDoを削除
function cleanupOrphanedTodos(todos: Todo[]): Todo[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return todos.filter(todo => {
    if (!todo.deletedAt) return true;
    return new Date(todo.deletedAt) > thirtyDaysAgo;
  });
}

// Issue連携が切れたToDoを検出
async function detectOrphanedTodos(todos: Todo[]): Promise<Todo[]> {
  const synced = todos.filter(t => t.issueNumber);
  const orphaned: Todo[] = [];

  for (const todo of synced) {
    try {
      await fetchIssue(todo.repoId, todo.issueNumber!);
    } catch (error) {
      if (error.status === 404) {
        orphaned.push(todo);
      }
    }
  }

  return orphaned;
}
```

#### 4.4.4 同期履歴の記録

**同期ログ:**
```typescript
type SyncLog = {
  id: string;
  timestamp: string;
  action: 'import' | 'export' | 'bidirectional';
  repoId?: string;
  itemsProcessed: number;
  conflicts: number;
  errors: Array<{ todoId: string; error: string }>;
  duration: number; // ミリ秒
};

// ストレージ
const SYNC_LOG_KEY = 'github-dashboard-sync-logs:{accountId}';
const MAX_LOGS = 50; // 最新50件のみ保持
```

### 4.5 マルチデバイス対応

#### 4.5.1 端末間同期の設計

**Phase 1 (MVP):**
- **同期なし**: 各端末で独立した localStorage
- **エクスポート/インポート機能**: JSON形式でToDoをエクスポート・インポート
  ```typescript
  function exportTodos(): string {
    const todos = getTodos(accountId);
    return JSON.stringify({ version: '1.0', todos, exportedAt: new Date().toISOString() });
  }

  function importTodos(json: string): { imported: number; skipped: number } {
    const { version, todos } = JSON.parse(json);
    // バージョンチェックとインポート処理
  }
  ```

**Phase 2 (Post-MVP):**
- **Cloudflare KV 同期**: サーバー側でToDoを管理
  ```typescript
  // 端末A で ToDo 編集 → KV に保存
  await env.KV.put(`todos:${accountId}`, JSON.stringify(todos));

  // 端末B で同期 → KV から取得
  const remoteTodos = await env.KV.get(`todos:${accountId}`, 'json');
  ```

- **最終更新タイムスタンプ比較**:
  ```typescript
  const local = getLocalTodos();
  const remote = await getRemoteTodos();

  if (remote.updatedAt > local.updatedAt) {
    // リモートが新しい → ローカルを更新
    setLocalTodos(remote.todos);
  } else if (local.updatedAt > remote.updatedAt) {
    // ローカルが新しい → リモートを更新
    await saveRemoteTodos(local.todos);
  }
  ```

#### 4.5.2 オフライン編集キュー

**実装:**
```typescript
type OfflineAction = {
  id: string;
  action: 'create' | 'update' | 'delete';
  todo: Todo;
  timestamp: string;
  retryCount: number;
};

const offlineQueue: OfflineAction[] = [];

// オフライン時の編集をキューに追加
function queueOfflineEdit(action: 'create' | 'update' | 'delete', todo: Todo) {
  offlineQueue.push({
    id: crypto.randomUUID(),
    action,
    todo,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });
  saveOfflineQueue();
}

// オンライン復帰時にキューを処理
async function processOfflineQueue() {
  for (const item of offlineQueue) {
    try {
      switch (item.action) {
        case 'create':
          await createIssue(item.todo);
          break;
        case 'update':
          await updateIssue(item.todo);
          break;
        case 'delete':
          await deleteIssue(item.todo);
          break;
      }
      // 成功したらキューから削除
      removeFromQueue(item.id);
    } catch (error) {
      item.retryCount++;
      if (item.retryCount > 3) {
        // 3回失敗したらユーザーに通知
        notifyUser(`${item.todo.title} の同期に失敗しました`);
      }
    }
  }
}

// オンライン/オフライン検出
window.addEventListener('online', () => {
  processOfflineQueue();
});
```

#### 4.5.3 競合検出と解決UI（マルチデバイス）

**競合シナリオ:**
- 端末Aで ToDo を「進行中」に更新
- 端末Bで 同じ ToDo を「完了」に更新
- 端末Aが同期を実行 → 競合検出

**解決UI:**
```
┌─────────────────────────────────────────┐
│ 端末間の同期競合                        │
├─────────────────────────────────────────┤
│ 「認証機能の実装」が複数端末で編集され  │
│ ています。どちらの変更を採用しますか？  │
│                                         │
│ ○ この端末の変更（最新）                │
│   ステータス: 完了                      │
│   更新: 2分前（この端末）               │
│                                         │
│ ○ 他の端末の変更                        │
│   ステータス: 進行中                    │
│   更新: 5分前（MacBook Pro）            │
│                                         │
│ ○ 両方の変更をマージ                    │
│   ステータス: 完了（この端末を優先）    │
│   説明: 両端末の変更を統合              │
│                                         │
│           [この端末] [他の端末] [マージ]│
└─────────────────────────────────────────┘
```

---

## 5. UI/UXデザインガイドライン

### 5.1 デザインシステム準拠

**適用ルール:**
- Typography: `text-body` (タイトル), `text-body-sm` (説明), `text-caption` (メタ情報)
- Spacing: `gap-inline-md`, `p-inset-lg`
- Focus: `focusRing` preset適用
- Motion: Framer Motion使用、`motion-reduce:animate-none`
- Metallic: ToDoパネルヘッダー、完了カードに使用

### 5.2 カラースキーム

**優先度カラー:**
- High: `#EF4444` (red-500)
- Medium: `#F97316` (orange-500)
- Low: `#6B7280` (gray-500)

**ステータスカラー:**
- 未着手: `#6B7280` (gray-500)
- 進行中: `#3B82F6` (blue-500)
- 完了: `#22C55E` (green-500)

**期日カラー:**
- 期限切れ: `#EF4444` (red-500)
- 今日: `#F59E0B` (amber-500)
- 今週: `#3B82F6` (blue-500)
- それ以降: `#6B7280` (gray-500)

### 5.3 アニメーション

**ToDoアイテム:**
```typescript
const todoVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};
```

**完了時のアニメーション:**
```typescript
const completionVariants = {
  initial: { scale: 1 },
  complete: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.3 },
  },
};
```

**ドラッグ＆ドロップ:**
```typescript
const dragVariants = {
  dragging: {
    scale: 1.05,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    rotate: 2,
  },
};
```

---

## 6. マイルストーン

| フェーズ | 完了条件 | 見積もり |
|---------|---------|---------|
| Phase 1 | データ層・Issue同期API実装完了 | 2-3h |
| Phase 2 | 基本UIコンポーネント動作 | 3-4h |
| Phase 3 | ToDoボード（カンバン）実装完了 | 3-4h |
| Phase 4 | Issue同期機能（双方向）動作 | 3-4h |
| Phase 5 | フィルター・ソート機能実装 | 2-3h |
| Phase 6 | 統合・通知機能実装 | 2-3h |
| Phase 7 | エラーハンドリング・テスト完了 | 2-3h |
| Phase 8 | GitHub Actions連携機能完了 | 3-4h |

**合計見積もり: 20-28時間**

---

## 7. テストシナリオ

### 7.1 機能テスト

1. **ToDo CRUD**
   - [ ] ToDo作成
   - [ ] ToDo編集
   - [ ] ToDo削除
   - [ ] ステータス変更
   - [ ] 優先度変更
   - [ ] 期日設定

2. **Issue連携**
   - [ ] ToDoからIssue作成
   - [ ] IssueをToDoにインポート
   - [ ] Issue更新時にToDo同期
   - [ ] ToDo更新時にIssue同期
   - [ ] ToDo完了時にIssue自動クローズ
   - [ ] 同期競合の解決

3. **フィルター・ソート**
   - [ ] ステータスフィルター
   - [ ] 優先度フィルター
   - [ ] リポジトリフィルター
   - [ ] 期日フィルター
   - [ ] テキスト検索
   - [ ] 優先度順ソート
   - [ ] 期日順ソート

4. **カンバンボード**
   - [ ] ドラッグ＆ドロップでステータス変更
   - [ ] カラムごとの件数表示
   - [ ] カード追加

5. **通知**
   - [ ] 期限当日の通知
   - [ ] 期限1時間前の通知
   - [ ] 期限切れ通知

### 7.2 統合テスト

1. **エンドツーエンド**
   - [ ] ToDo作成 → Issue作成 → 同期確認
   - [ ] Issue作成 → 自動インポート → ToDo表示
   - [ ] ToDo完了 → Issue自動クローズ → 同期確認

2. **エラーケース**
   - [ ] Issue作成失敗時の処理
   - [ ] 同期失敗時のリトライ
   - [ ] 権限不足の処理
   - [ ] ネットワークエラーの処理

---

## 8. セキュリティ考慮事項

### 8.1 GitHub権限

**必要なスコープ:**
- `repo`: プライベートリポジトリのIssue操作
- `public_repo`: パブリックリポジトリのIssue操作

**権限チェック:**
```typescript
async function checkIssuePermissions(repoId: string): Promise<boolean> {
  try {
    // テスト用にIssueラベル取得を試行
    await fetchIssueLabels(repoId);
    return true;
  } catch (error) {
    if (error.status === 403) return false;
    throw error;
  }
}
```

### 8.2 データ検証

**入力検証:**
```typescript
function validateTodo(todo: Partial<Todo>): string[] {
  const errors: string[] = [];

  if (!todo.title || todo.title.trim().length === 0) {
    errors.push('タイトルは必須です');
  }

  if (todo.title && todo.title.length > 200) {
    errors.push('タイトルは200文字以内にしてください');
  }

  if (todo.description && todo.description.length > 10000) {
    errors.push('説明は10000文字以内にしてください');
  }

  if (todo.dueDate) {
    const dueDate = new Date(todo.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('期日の形式が正しくありません');
    }
  }

  return errors;
}
```

---

## 9. コスト・パフォーマンス管理

### 9.1 API使用量の最適化

**戦略:**
1. **バッチ処理**: 複数ToDoの同期を一度のAPI呼び出しにまとめる
2. **キャッシュ**: Issue情報を5分間キャッシュ
3. **差分同期**: 変更されたToDoのみ同期
4. **レート制限遵守**: GitHub API制限（5000 req/hour）内で運用

**実装:**
```typescript
// バッチ同期
async function batchSyncTodos(todos: Todo[]): Promise<SyncResult[]> {
  const changedTodos = todos.filter(needsSync);

  // 10件ずつバッチ処理
  const batches = chunk(changedTodos, 10);
  const results: SyncResult[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(todo => syncTodoWithIssue(todo))
    );
    results.push(...batchResults);

    // レート制限対策: 100ms待機
    await sleep(100);
  }

  return results;
}
```

### 9.2 ストレージ最適化

**容量見積もり:**
- 1ToDo: ~500 bytes
- 100ToDo: ~50KB
- 1000ToDo: ~500KB

**クリーンアップ戦略:**
- 完了から30日経過したToDoを自動アーカイブ
- アーカイブから90日経過したToDoを削除（確認付き）

### 9.3 GitHub API 管理

#### 9.3.1 レート制限の追跡と予測

**GitHub GraphQL API 制限:**
- **制限**: 5,000ポイント / 時間
- **ポイント計算**: クエリの複雑さに応じて変動（10〜100ポイント/リクエスト）
- **リセット**: 毎時0分

**実装:**
```typescript
type RateLimitStatus = {
  limit: number;
  remaining: number;
  resetAt: string; // ISO 8601
  cost: number; // 最後のクエリのコスト
};

async function checkRateLimit(): Promise<RateLimitStatus> {
  const query = `
    query {
      rateLimit {
        limit
        remaining
        resetAt
        cost
      }
    }
  `;

  const { data } = await graphqlRequest(query);
  return data.rateLimit;
}

// レート制限を監視
class RateLimitMonitor {
  private status: RateLimitStatus | null = null;

  async canMakeRequest(estimatedCost: number = 10): Promise<boolean> {
    if (!this.status) {
      this.status = await checkRateLimit();
    }

    return this.status.remaining >= estimatedCost;
  }

  async waitIfNeeded(estimatedCost: number = 10): Promise<void> {
    if (await this.canMakeRequest(estimatedCost)) {
      return;
    }

    const now = Date.now();
    const resetAt = new Date(this.status!.resetAt).getTime();
    const waitMs = resetAt - now + 1000; // 1秒のバッファ

    console.warn(`Rate limit exceeded. Waiting ${waitMs}ms until reset.`);
    await sleep(waitMs);

    // ステータスを再取得
    this.status = await checkRateLimit();
  }
}
```

**UIフィードバック:**
```typescript
// レート制限警告の表示
if (rateLimit.remaining < 100) {
  showToast({
    type: 'warning',
    title: 'API制限警告',
    message: `GitHub APIの残り回数が少なくなっています（残り${rateLimit.remaining}回）。${new Date(rateLimit.resetAt).toLocaleTimeString()}にリセットされます。`,
  });
}
```

#### 9.3.2 同期失敗時のリトライロジック

**実装:**
```typescript
async function syncWithRetry(
  fn: () => Promise<void>,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      lastError = error;

      // リトライしないエラー
      if (error.status === 404 || error.status === 403) {
        throw error;
      }

      // レート制限
      if (error.status === 429 || error.message.includes('rate limit')) {
        const rateLimitMonitor = new RateLimitMonitor();
        await rateLimitMonitor.waitIfNeeded();
        continue;
      }

      // サーバーエラー（指数バックオフ）
      if (error.status >= 500) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
        continue;
      }

      // ネットワークエラー
      if (error.code === 'NETWORK_ERROR') {
        const delay = (attempt + 1) * 2000;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}
```

#### 9.3.3 手動同期オプション

**UI:**
```
┌─────────────────────────────────────────┐
│ Issue同期設定                           │
├─────────────────────────────────────────┤
│ 自動同期: ⚪ ON  ○ OFF                  │
│ 同期間隔: [15分 ▼]                     │
│                                         │
│ 最終同期: 2分前                         │
│ 次回同期: 13分後                        │
│                                         │
│ [今すぐ同期]                           │
│                                         │
│ 同期履歴:                               │
│ • 2分前 - 5件同期完了                   │
│ • 17分前 - 3件同期完了                  │
│ • 32分前 - 同期失敗（レート制限）       │
│   [再試行]                              │
└─────────────────────────────────────────┘
```

**実装:**
```typescript
async function manualSync() {
  try {
    setSyncState({ status: 'syncing', progress: 0 });

    const todos = getTodos();
    const syncable = todos.filter(t => t.syncEnabled && t.issueNumber);

    for (let i = 0; i < syncable.length; i++) {
      await syncTodoWithIssue(syncable[i]);
      setSyncState({ status: 'syncing', progress: (i + 1) / syncable.length });
    }

    setSyncState({ status: 'idle' });
    showToast({ type: 'success', message: `${syncable.length}件のToDoを同期しました` });
  } catch (error) {
    setSyncState({ status: 'error', error });
    showToast({ type: 'error', message: `同期に失敗しました: ${error.message}` });
  }
}
```

### 9.4 Issue ⇔ ToDo マッピング表

#### 9.4.1 フィールド対応表

| ToDoフィールド | Issueフィールド | 変換方向 | 備考 |
|---------------|----------------|---------|------|
| **title** | title | ⇄ | 双方向同期 |
| **description** | body | ⇄ | Markdown形式、双方向同期 |
| **status** | state | ⇄ | `todo`/`in_progress` → `OPEN`, `done` → `CLOSED` |
| **priority** | labels | ⇄ | `priority:high` などのラベルで表現 |
| **dueDate** | milestone.dueOn | → | Milestoneが存在する場合のみ。Issue→ToDoは未対応 |
| **assignee** | assignees[0].login | ⇄ | 複数担当者の場合、最初の1人のみ |
| **labels** | labels | ⇄ | priority:*ラベル以外 |
| **issueNumber** | number | ← | Issue→ToDoのみ（読み取り専用） |
| **issueUrl** | url | ← | Issue→ToDoのみ（読み取り専用） |
| **createdAt** | createdAt | ← | Issue→ToDoのみ |
| **updatedAt** | updatedAt | ⇄ | 競合検出に使用 |
| **completedAt** | closedAt | ← | Issue→ToDoのみ |

**凡例:**
- ⇄: 双方向同期
- →: ToDo→Issueのみ
- ←: Issue→ToDoのみ

#### 9.4.2 一方向のみフィールドの扱い

**ToDo専用フィールド（Issueに保存されない）:**
- `repoId`: ローカルでのリポジトリ識別のみ
- `syncEnabled`: 同期設定（ローカル設定）

**Issue専用情報（ToDoに反映されない）:**
- コメント数、リアクション
- プロジェクトボード情報
- リンクされたPull Request

**今後の拡張でマッピング候補:**
- コメント → ToDoのメモフィールド（将来追加）
- Milestone → 期日の自動設定

#### 9.4.3 カスタムメタデータ戦略

DevBoard専用の情報をIssue本文に埋め込む方法：

**Issue本文フォーマット:**
```markdown
{user description}

---

<!-- DevBoard Metadata -->
<!-- priority: high -->
<!-- dueDate: 2025-01-15T00:00:00Z -->
<!-- syncEnabled: true -->
<!-- End DevBoard Metadata -->
```

**パース実装:**
```typescript
function parseDevBoardMetadata(body: string): Partial<Todo> {
  const metadataRegex = /<!-- DevBoard Metadata -->([\s\S]*?)<!-- End DevBoard Metadata -->/;
  const match = body.match(metadataRegex);

  if (!match) return {};

  const metadata: Partial<Todo> = {};
  const lines = match[1].trim().split('\n');

  for (const line of lines) {
    const fieldMatch = line.match(/<!-- (\w+): (.+) -->/);
    if (fieldMatch) {
      const [, key, value] = fieldMatch;
      metadata[key] = parseValue(key, value);
    }
  }

  return metadata;
}

function injectDevBoardMetadata(body: string, todo: Todo): string {
  const userContent = body.replace(/<!-- DevBoard Metadata -->[\s\S]*?<!-- End DevBoard Metadata -->/, '').trim();

  const metadata = `
<!-- DevBoard Metadata -->
<!-- priority: ${todo.priority} -->
${todo.dueDate ? `<!-- dueDate: ${todo.dueDate} -->` : ''}
<!-- syncEnabled: ${todo.syncEnabled} -->
<!-- End DevBoard Metadata -->
  `.trim();

  return `${userContent}\n\n---\n\n${metadata}`;
}
```

---

### フェーズ8: GitHub Actions連携 (3-4h)

#### 8.1 概要

**目的**: DevBoard から GitHub Actions 経由で Claude Code/GitHub Copilot を起動し、Issue の実装やレビューを自動化する。

**スコープ**:
- ✅ ボット実行ボタン（Claude Code/Copilot）
- ✅ カスタム指示入力ダイアログ
- ✅ GitHub Issue へのコメント自動投稿
- ✅ Workflow Run 進捗監視
- ✅ 実行ステータス表示

**既存設定の活用**:
- 既に GitHub Actions で Claude Code/Copilot が利用可能な環境を前提
- サブスクリプション範囲内で動作（追加コストなし）

#### 8.2 データモデル拡張

```typescript
// src/types/github-actions.ts

/**
 * GitHub Actions ボット
 */
export type GitHubBot = 'claude-code' | 'copilot';

/**
 * Workflow Run ステータス
 */
export type WorkflowStatus = {
  runId: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  htmlUrl: string;
  startedAt?: string;
  completedAt?: string;
};

/**
 * AI 実行履歴
 */
export type AIExecutionHistory = {
  id: string;
  todoId: string;
  issueNumber: number;
  repoId: string;
  bot: GitHubBot;
  instruction?: string;
  triggeredAt: string;
  workflowStatus?: WorkflowStatus;
};
```

#### 8.3 API設計

**Cloudflare Functions エンドポイント**:

```
/api/github/trigger-bot
  POST - GitHub Actions ボットをトリガー
  Body: { repoId, issueNumber, bot: 'claude-code' | 'copilot', instruction? }
  Response: { success: boolean, commentId: number }

/api/github/workflow-status
  GET - Workflow Run のステータスを取得
  Query: { repoId, runId }
  Response: { status: WorkflowStatus }

/api/github/list-workflow-runs
  GET - Issue に関連する Workflow Run 一覧を取得
  Query: { repoId, issueNumber }
  Response: { runs: WorkflowStatus[] }
```

**実装例**:

```typescript
// functions/api/github/trigger-bot.ts
export async function onRequest(context) {
  const { request, env } = context;
  const { repoId, issueNumber, bot, instruction } = await request.json();

  // 1. リポジトリ情報取得
  const [owner, repo] = parseRepoId(repoId);

  // 2. コメント本文作成
  const comment = instruction
    ? `@${bot} ${instruction}`
    : `@${bot} この Issue を実装してください`;

  // 3. GitHub にコメント投稿（これが GitHub Action をトリガー）
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: comment,
  });

  return Response.json({
    success: true,
    commentId: data.id
  });
}

// functions/api/github/workflow-status.ts
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const repoId = url.searchParams.get('repoId');
  const runId = url.searchParams.get('runId');

  const [owner, repo] = parseRepoId(repoId);

  // Workflow Run ステータス取得
  const { data: run } = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id: parseInt(runId),
  });

  return Response.json({
    runId: run.id,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    startedAt: run.run_started_at,
    completedAt: run.updated_at,
  });
}
```

#### 8.4 UI コンポーネント

**8.4.1 TodoItem 拡張**

既存の TodoItem に AI 実行ボタンを追加：

```typescript
// src/components/TodoItem.tsx（拡張）

function TodoItem({ todo, onUpdate, onDelete, onClick }: TodoItemProps) {
  const [showInstructionDialog, setShowInstructionDialog] = useState<GitHubBot | false>(false);
  const { triggerBot, workflowStatus, isLoading } = useGitHubActions(todo);

  return (
    <div className="todo-item">
      {/* 既存のToDo表示 */}
      <div className="todo-content">
        <input
          type="checkbox"
          checked={todo.status === 'done'}
          onChange={(e) => onUpdate({ status: e.target.checked ? 'done' : 'todo' })}
        />
        <h3>{todo.title}</h3>
        <p>{todo.description}</p>
      </div>

      {/* GitHub Actions ボタン（Issue 紐付け済みの場合のみ） */}
      {todo.issueNumber && (
        <div className="ai-actions">
          <button
            onClick={() => setShowInstructionDialog('claude-code')}
            disabled={isLoading}
          >
            🤖 Claude で実装
          </button>
          <button
            onClick={() => setShowInstructionDialog('copilot')}
            disabled={isLoading}
          >
            💬 Copilot で相談
          </button>
        </div>
      )}

      {/* Workflow ステータスバッジ */}
      {workflowStatus && (
        <AIStatusBadge status={workflowStatus} />
      )}

      {/* カスタム指示ダイアログ */}
      {showInstructionDialog && (
        <AIInstructionDialog
          bot={showInstructionDialog}
          onSubmit={(instruction) => {
            triggerBot(showInstructionDialog, instruction);
            setShowInstructionDialog(false);
          }}
          onCancel={() => setShowInstructionDialog(false)}
        />
      )}
    </div>
  );
}
```

**8.4.2 カスタム指示ダイアログ**

```typescript
// src/components/AIInstructionDialog.tsx

type AIInstructionDialogProps = {
  bot: GitHubBot;
  onSubmit: (instruction: string) => void;
  onCancel: () => void;
};

function AIInstructionDialog({ bot, onSubmit, onCancel }: AIInstructionDialogProps) {
  const [instruction, setInstruction] = useState('');

  const botConfig = {
    'claude-code': {
      name: 'Claude Code',
      placeholder: '例: ユニットテストも追加してください',
      icon: '🤖',
      color: 'purple',
    },
    'copilot': {
      name: 'GitHub Copilot',
      placeholder: '例: TypeScriptで実装してください',
      icon: '💬',
      color: 'green',
    },
  };

  const config = botConfig[bot];

  return (
    <Modal open onClose={onCancel}>
      <div className="ai-instruction-dialog">
        <h2>
          <span className={`icon ${config.color}`}>{config.icon}</span>
          {config.name} への指示
        </h2>

        <textarea
          placeholder={config.placeholder}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={4}
          className="instruction-input"
        />

        <p className="hint">
          空の場合は「この Issue を実装してください」が送信されます
        </p>

        <div className="actions">
          <button onClick={onCancel} className="btn-secondary">
            キャンセル
          </button>
          <button
            onClick={() => onSubmit(instruction)}
            className={`btn-primary ${config.color}`}
          >
            実行
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

**8.4.3 ステータスバッジ**

```typescript
// src/components/AIStatusBadge.tsx

type AIStatusBadgeProps = {
  status: WorkflowStatus;
};

function AIStatusBadge({ status }: AIStatusBadgeProps) {
  const statusConfig = {
    queued: {
      icon: '⏳',
      label: '待機中',
      color: 'gray',
    },
    in_progress: {
      icon: '⚙️',
      label: '実行中',
      color: 'blue',
      animated: true,
    },
    success: {
      icon: '✅',
      label: '完了',
      color: 'green',
    },
    failure: {
      icon: '❌',
      label: '失敗',
      color: 'red',
    },
    cancelled: {
      icon: '🚫',
      label: 'キャンセル',
      color: 'gray',
    },
  };

  const config = status.conclusion
    ? statusConfig[status.conclusion]
    : statusConfig[status.status];

  return (
    <div className={`status-badge ${config.color} ${config.animated ? 'pulse' : ''}`}>
      <span className="icon">{config.icon}</span>
      <span className="label">{config.label}</span>
      {status.startedAt && (
        <span className="time">
          {formatRelativeTime(status.startedAt)}
        </span>
      )}
      <a
        href={status.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="link"
      >
        詳細 →
      </a>
    </div>
  );
}
```

#### 8.5 カスタムフック

```typescript
// src/hooks/useGitHubActions.ts

export function useGitHubActions(todo: Todo) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ボット実行
  const triggerBot = async (
    bot: GitHubBot,
    instruction?: string
  ) => {
    if (!todo.issueNumber) {
      throw new Error('Issue が紐付けられていません');
    }

    setIsLoading(true);
    setError(null);

    try {
      // GitHub にコメント投稿（Workflow トリガー）
      const response = await fetch('/api/github/trigger-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: todo.repoId,
          issueNumber: todo.issueNumber,
          bot,
          instruction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger bot');
      }

      // 進捗監視開始
      startStatusPolling(todo.repoId, todo.issueNumber);

      showToast({
        type: 'success',
        title: `${bot} を起動しました`,
        message: 'GitHub Actions が実行中です',
      });
    } catch (err) {
      setError(err as Error);
      showToast({
        type: 'error',
        title: 'エラー',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ステータスポーリング
  const startStatusPolling = (repoId: string, issueNumber: number) => {
    let pollCount = 0;
    const maxPolls = 60; // 5分間（5秒ごと × 60回）

    const interval = setInterval(async () => {
      try {
        // 最新の Workflow Run を取得
        const response = await fetch(
          `/api/github/list-workflow-runs?repoId=${repoId}&issueNumber=${issueNumber}`
        );
        const { runs } = await response.json();

        if (runs && runs.length > 0) {
          const latestRun = runs[0];
          setWorkflowStatus(latestRun);

          // 完了したらポーリング停止
          if (latestRun.status === 'completed') {
            clearInterval(interval);

            // 成功/失敗の通知
            showToast({
              type: latestRun.conclusion === 'success' ? 'success' : 'error',
              title: latestRun.conclusion === 'success' ? '実行完了' : '実行失敗',
              message: `Workflow が${latestRun.conclusion === 'success' ? '正常に完了' : '失敗'}しました`,
            });
          }
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Failed to fetch workflow status:', err);
      }
    }, 5000); // 5秒ごと

    // クリーンアップ
    return () => clearInterval(interval);
  };

  // 初回ロード時にステータス取得
  useEffect(() => {
    if (todo.issueNumber) {
      fetch(`/api/github/list-workflow-runs?repoId=${todo.repoId}&issueNumber=${todo.issueNumber}`)
        .then(res => res.json())
        .then(({ runs }) => {
          if (runs && runs.length > 0) {
            setWorkflowStatus(runs[0]);
          }
        })
        .catch(console.error);
    }
  }, [todo.repoId, todo.issueNumber]);

  return {
    triggerBot,
    workflowStatus,
    isLoading,
    error,
  };
}
```

#### 8.6 GitHub Actions ワークフロー例

既存の Workflow が以下のような構成であることを前提：

```yaml
# .github/workflows/claude-code.yml
name: Claude Code

on:
  issue_comment:
    types: [created]

jobs:
  claude:
    if: contains(github.event.comment.body, '@claude-code')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Run Claude Code
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Claude Code の実行ロジック
          echo "Executing Claude Code..."
```

DevBoard からのコメント投稿により、この Workflow が自動的にトリガーされます。

#### 8.7 タスク一覧

| タスク | 内容 | 見積もり |
|--------|------|----------|
| **API実装** | trigger-bot, workflow-status, list-workflow-runs | 1-1.5h |
| **型定義** | GitHubBot, WorkflowStatus, AIExecutionHistory | 0.5h |
| **UI実装** | TodoItem拡張, AIInstructionDialog, AIStatusBadge | 1-1.5h |
| **カスタムフック** | useGitHubActions（ポーリング含む） | 0.5-1h |
| **テスト** | 動作確認、エラーハンドリング | 0.5h |

#### 成果物
- `src/types/github-actions.ts`
- `functions/api/github/trigger-bot.ts`
- `functions/api/github/workflow-status.ts`
- `functions/api/github/list-workflow-runs.ts`
- `src/components/AIInstructionDialog.tsx`
- `src/components/AIStatusBadge.tsx`
- `src/hooks/useGitHubActions.ts`
- 修正: `src/components/TodoItem.tsx`

---

## 10. 将来の拡張計画

### 10.1 追加機能

1. **サブタスク**
   - ToDoを階層化
   - 親タスクの進捗を子タスクから自動計算

2. **リカーリングタスク**
   - 定期的に発生するタスク（毎週、毎月等）
   - 自動生成

3. **テンプレート**
   - よく使うタスクをテンプレート化
   - 「新機能実装」「バグ修正」等のテンプレート

4. **時間トラッキング**
   - 作業時間の記録
   - タスクごとの実績時間

5. **コメント機能**
   - ToDo内でのディスカッション
   - Issueコメントとの同期

### 10.2 チーム機能

1. **担当者管理**
   - チームメンバーへのタスク割り当て
   - 担当者別ビュー

2. **共有ToDo**
   - チーム全体で見えるToDoボード
   - リアルタイム同期

3. **進捗レポート**
   - チーム全体の進捗レポート
   - 個人別のパフォーマンス分析

### 10.3 他サービス連携

1. **Slack連携**
   - ToDo作成/完了通知
   - Slackから直接ToDo操作

2. **カレンダー連携**
   - Google Calendar等と同期
   - 期日をカレンダーに表示

3. **Jira連携**
   - Jiraチケットとの同期
   - 双方向連携

---

## 11. 実装時の注意事項

### 11.1 必須確認事項

- [ ] GitHub OAuth scopeに `repo` が含まれているか確認
- [ ] Issue操作の権限確認
- [ ] 既存のRepoCard、RepoBoard実装の確認
- [ ] Web Worker対応ブラウザの確認

### 11.2 依存関係

**新規追加パッケージ:**
```json
{
  "@dnd-kit/core": "^6.0.0",           // ドラッグ＆ドロップ
  "@dnd-kit/sortable": "^7.0.0",       // ソート可能リスト
  "react-window": "^1.8.0",            // 仮想スクロール
  "date-fns": "^2.30.0",               // 日付処理
  "uuid": "^9.0.0",                    // UUID生成
  "marked": "^11.0.0"                  // Markdown表示（AI統合と共通）
}
```

### 11.3 環境変数

```bash
# .env.local
# Issue同期設定
ISSUE_SYNC_ENABLED=true
ISSUE_SYNC_INTERVAL_MINUTES=15
ISSUE_AUTO_CLOSE_ENABLED=false
```

---

## 12. MVPスコープ定義

### 12.1 3層スコープ分離

#### 🎯 MVP (Phase 1) - 6-8時間

**目標**: ローカルToDo管理と基本的なIssueインポート機能

**含まれる機能:**
- ✅ ローカルToDo管理（作成・編集・削除）
- ✅ シンプルなリスト表示UI
- ✅ ステータス管理（未着手/進行中/完了）
- ✅ 優先度設定（High/Medium/Low）
- ✅ GitHub Issue インポート（片方向: Issue → ToDo）
- ✅ localStorage ストレージ

**実装フェーズ:**
- フェーズ1: データ層・ストレージ - 2-3h
  - 型定義、ストレージ（localStorage のみ）
  - Issue インポート API（片方向のみ）
- フェーズ2: 基本UI - 2-3h
  - シンプルなリスト表示
  - ToDo作成・編集モーダル
  - ステータス・優先度選択
- フェーズ7（部分）: 基本テスト - 1.5-2h
  - エラーハンドリング
  - 基本的な動作確認

**除外する機能（V1.1以降）:**
- ❌ ToDo → Issue 作成（エクスポート）
- ❌ 双方向同期
- ❌ Kanban ボード表示
- ❌ ドラッグ＆ドロップ
- ❌ 期限管理とリマインダー
- ❌ バックグラウンド自動同期
- ❌ 競合解決UI
- ❌ リアルタイム通知

**成功基準:**
- [ ] ToDoを作成・編集・削除できる
- [ ] GitHub IssueをToDoとしてインポートできる
- [ ] ステータスと優先度で管理できる
- [ ] リポジトリ別にToDoを表示できる

#### 🚀 V1.1 (Phase 2) - 6-8時間

**目標**: 双方向同期と競合解決

**追加機能:**
- ✅ ToDo → Issue 作成（エクスポート）
- ✅ 双方向同期（バックグラウンド）
- ✅ 競合検出と解決UI
- ✅ 期限管理とリマインダー
- ✅ フィルター・ソート機能
- ✅ ToDoステータス表示

**実装フェーズ:**
- フェーズ3: Kanban ボード - 3-4h（スキップ or 簡易版）
- フェーズ4: Issue同期（双方向） - 3-4h
- フェーズ5: フィルター・ソート - 2-3h
- フェーズ6: 統合・通知 - 2-3h

**成功基準:**
- [ ] ToDoからIssueを作成できる
- [ ] Issue更新時にToDoが自動同期される
- [ ] 競合が発生した時に適切に解決できる
- [ ] 期限切れタスクの通知が表示される

#### 🌟 V2.0 (Phase 3) - 5-7時間

**目標**: 高度なUI とマルチデバイス対応

**追加機能:**
- ✅ Kanban ボード表示（ドラッグ＆ドロップ）
- ✅ Cloudflare KV によるマルチデバイス同期
- ✅ オフライン編集キュー
- ✅ 高度なフィルター（複数条件、保存済みフィルター）
- ✅ 統計ダッシュボード
- ✅ エクスポート/インポート機能

**実装フェーズ:**
- フェーズ3（完全版）: Kanban ボード - 3-4h
- 追加: KV ストレージ移行 - 2-3h
- 追加: オフライン対応 - 2h

**成功基準:**
- [ ] Kanban ボードでドラッグ＆ドロップできる
- [ ] 複数端末でToDoが同期される
- [ ] オフライン時でも編集・同期できる

### 12.2 MVP時間見積もり調整

**元の見積もり**: 17-24時間（全7フェーズ）

**MVP見積もり**: 6-8時間（2フェーズ + 部分的Phase 7）

**削減内容:**
- Kanban ボード: -3~4h → V2.0へ
- Issue同期（エクスポート）: -2h → V1.1へ
- 双方向同期: -2h → V1.1へ
- フィルター・ソート: -2~3h → V1.1へ
- 通知: -2~3h → V1.1へ
- 高度なテスト: -1h → V1.1/V2.0へ

### 12.3 段階的リリース計画

**Week 1-2: MVP開発**
- ローカルToDo管理 + Issue インポートのみ
- シンプルなリスト表示
- 内部テスト・フィードバック収集

**Week 3-4: V1.1開発**
- 双方向同期追加
- 競合解決UI
- 実際の開発ワークフローで利用開始

**Week 5+: V2.0開発**
- Kanban UI 追加
- マルチデバイス同期
- オフライン対応

### 12.4 優先順位付けマトリクス

| 機能 | 価値 | 複雑度 | 依存性 | 優先度 |
|------|-----|-------|--------|--------|
| ローカルToDo管理 | 高 | 低 | なし | **MVP** |
| リスト表示UI | 高 | 低 | なし | **MVP** |
| Issue インポート | 高 | 中 | MVP | **MVP** |
| Issue エクスポート | 高 | 中 | MVP | **V1.1** |
| 双方向同期 | 中 | 高 | V1.1 | **V1.1** |
| 競合解決UI | 中 | 中 | V1.1 | **V1.1** |
| 期限管理 | 中 | 低 | MVP | **V1.1** |
| Kanban ボード | 中 | 高 | MVP | **V2.0** |
| マルチデバイス同期 | 低 | 高 | V1.1 | **V2.0** |
| オフライン編集 | 低 | 中 | V2.0 | **V2.0** |

### 12.5 リスク軽減策

**MVP で特に注意すべき点:**
1. **Issue インポートの信頼性**
   - レート制限の適切な管理
   - エラーハンドリングの徹底
   - ユーザーへの明確なフィードバック

2. **データ消失の防止**
   - localStorage のバックアップ機能
   - エクスポート機能をMVPに含める検討
   - 定期的な自動保存

3. **UI の直感性**
   - シンプルで分かりやすいUI
   - アクセシビリティの確保
   - レスポンシブデザイン

---

## 13. 参考資料

- [GitHub Issues API](https://docs.github.com/en/rest/issues)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [React Window](https://react-window.vercel.app/)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Three-Way Merge Algorithm](https://en.wikipedia.org/wiki/Merge_(version_control)#Three-way_merge)
- [Offline-First Design Patterns](https://offlinefirst.org/)

---

**ドキュメント終了**
