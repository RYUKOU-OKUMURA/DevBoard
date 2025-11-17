# DevBoard GitHub Actions AI統合機能実装計画書

**作成日**: 2025-11-18
**バージョン**: 2.0
**ステータス**: 計画中
**優先度**: 2（タグ機能、TODO統合の次）

## 1. 概要

### 1.1 目的
DevBoardでGitHub Actionsを活用し、Claude CodeとGitHub CopilotをIssueコメント経由でトリガーして開発タスクを効率化する。

### 1.2 スコープ
- **対応AIボット**: Claude Code (`@claude-code`), GitHub Copilot (`@copilot`)
- **主要機能**:
  - ToDoからAIボット実行ボタン
  - カスタム指示入力ダイアログ
  - GitHub Actions ワークフロー実行監視
  - 実行履歴の表示
- **認証方式**: GitHub OAuth（既存の認証フローを利用）
- **統合ポイント**: TodoItem、Issue詳細画面

### 1.3 前提条件
- ユーザーが既にGitHub Actions環境でClaude Code/Copilotのワークフローを設定済み
- サブスクリプション範囲内でAIボットを利用可能
- GitHub Personal Access Token（PAT）に必要な権限（`repo`, `workflow`, `actions:read`）が付与されている

### 1.3 成功基準
- ✅ ToDoアイテムからワンクリックでClaude Code/Copilotを起動できる
- ✅ カスタム指示を入力してボットを実行できる（空送信でデフォルトメッセージ）
- ✅ ワークフロー実行状態をリアルタイムで表示できる（ポーリング方式）
- ✅ 実行履歴を確認できる
- ✅ エラーハンドリングとリトライ機能が動作する

### 1.4 アーキテクチャ概要

**フロー:**
```
1. ユーザーがToDoアイテムでAIボタンをクリック
2. AIInstructionDialogが開く（カスタム指示入力可能）
3. DevBoardがGitHub APIでIssueにコメント投稿（@claude-code or @copilot メンション）
4. GitHub Actionsがワークフロー実行（issue_commentトリガー）
5. DevBoardがワークフロー状態をポーリング（5秒間隔、最大5分）
6. 完了状態をAIStatusBadgeで表示
```

**技術スタック:**
- **フロントエンド**: React, TypeScript, Tailwind CSS
- **バックエンド**: Cloudflare Functions
- **API**: GitHub REST API v3 (Issues, Actions, Workflow Runs)
- **認証**: GitHub OAuth（既存）

---

## 2. アーキテクチャ設計

### 2.1 データモデル

```typescript
// src/types/githubActions.ts

/**
 * GitHub AIボット種類
 */
export type GitHubBot = 'claude-code' | 'copilot';

/**
 * ワークフロー実行状態
 */
export type WorkflowStatus = {
  runId: number;                          // ワークフロー実行ID
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  htmlUrl: string;                        // GitHub Actions実行ページURL
  startedAt?: string;                     // 開始日時（ISO 8601）
  completedAt?: string;                   // 完了日時（ISO 8601）
  updatedAt: string;                      // 最終更新日時
};

/**
 * AI実行履歴
 */
export type AIExecutionHistory = {
  id: string;                             // UUID
  todoId: string;                         // 関連ToDoID
  issueNumber: number;                    // Issue番号
  repoId: string;                         // リポジトリID
  repoFullName: string;                   // owner/repo形式
  bot: GitHubBot;                         // 使用したボット
  instruction?: string;                   // カスタム指示（オプション）
  commentId?: number;                     // 投稿したコメントID
  triggeredAt: string;                    // 実行開始日時
  workflowStatus?: WorkflowStatus;        // ワークフロー状態
};

/**
 * ワークフロー実行結果
 */
export type WorkflowRun = {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
};

/**
 * Issueコメント
 */
export type IssueComment = {
  id: number;
  body: string;
  user: {
    login: string;
  };
  created_at: string;
  html_url: string;
};
```

### 2.2 ストレージ設計

#### 2.2.1 ストレージ戦略

**MVP実装:**
- **AI実行履歴**: `localStorage`
  - キー: `github-dashboard-ai-executions:{accountId}`
  - 値: `AIExecutionHistory[]`（最新100件）
  - 保持期間: 30日間

**Post-MVP:**
- Cloudflare D1 or KVへの移行で複数端末同期

#### 2.2.2 容量見積もり
```typescript
// AI実行履歴1件: ~500B
// 100件: ~50KB
// 合計: ~50KB（5MB制限に対して十分余裕あり）
```

#### 2.2.3 ストレージキー設計

**キー:**
- `github-dashboard-ai-executions:{accountId}` → `AIExecutionHistory[]`

### 2.3 API設計

#### Cloudflare Functions エンドポイント

```
/api/github/trigger-bot
  POST - AIボットをトリガー（Issueコメント投稿）
  Body: {
    repoId: string;
    issueNumber: number;
    bot: GitHubBot;
    instruction?: string;
  }
  Response: {
    success: boolean;
    commentId?: number;
    message: string;
  }

/api/github/workflow-status
  GET - ワークフロー実行状態を取得
  Query: {
    repoId: string;
    runId: number;
  }
  Response: {
    status: WorkflowStatus;
  }

/api/github/list-workflow-runs
  GET - 特定Issueに関連するワークフロー実行一覧を取得
  Query: {
    repoId: string;
    issueNumber: number;
    limit?: number; // デフォルト10
  }
  Response: {
    runs: WorkflowRun[];
    total_count: number;
  }
```

#### GitHub REST API 利用

**Issueコメント投稿:**
```http
POST /repos/{owner}/{repo}/issues/{issue_number}/comments
Authorization: Bearer {github_token}
Content-Type: application/json

{
  "body": "@claude-code Please implement this feature according to the issue description."
}
```

**ワークフロー実行一覧取得:**
```http
GET /repos/{owner}/{repo}/actions/runs?event=issue_comment&per_page=10
Authorization: Bearer {github_token}
```

**特定ワークフロー実行状態取得:**
```http
GET /repos/{owner}/{repo}/actions/runs/{run_id}
Authorization: Bearer {github_token}
```

### 2.4 コンポーネント構成

```
App
├── RepoBoard
│   └── TodoItem (拡張)
│       ├── AIActionButtons (NEW)        // Claude Code / Copilot ボタン
│       │   ├── onClick → AIInstructionDialog
│       │   └── AIStatusBadge            // 実行状態バッジ
│       └── AIInstructionDialog (NEW)    // カスタム指示入力ダイアログ
│           ├── TextArea（Markdown対応）
│           ├── Bot選択（Claude/Copilot）
│           ├── [キャンセル] [実行] ボタン
│           └── useGitHubActions hook
├── IssueDetail (NEW or 拡張)
│   └── WorkflowRunList (NEW)            // ワークフロー実行履歴
│       └── WorkflowRunItem
│           ├── 状態アイコン
│           ├── 実行時刻
│           └── GitHub Actionsリンク
└── Settings
    └── GitHubActionsSettings (NEW)     // ワークフロー設定確認
        ├── 接続テスト
        └── 権限チェック
```

---

## 3. 実装フェーズ

### フェーズ1: データ層・API実装 (2-3h)

#### 3.1 型定義作成

**ファイル**: `src/types/githubActions.ts`

```typescript
export type GitHubBot = 'claude-code' | 'copilot';

export type WorkflowStatus = {
  runId: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  htmlUrl: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type AIExecutionHistory = {
  id: string;
  todoId: string;
  issueNumber: number;
  repoId: string;
  repoFullName: string;
  bot: GitHubBot;
  instruction?: string;
  commentId?: number;
  triggeredAt: string;
  workflowStatus?: WorkflowStatus;
};

export type WorkflowRun = {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
};
```

#### 3.2 ストレージユーティリティ

**ファイル**: `src/utils/aiExecutionStorage.ts`

```typescript
import { AIExecutionHistory } from '@/types/githubActions';

const STORAGE_KEY_PREFIX = 'github-dashboard-ai-executions';

export function getAIExecutions(accountId: string): AIExecutionHistory[] {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];

  try {
    const executions: AIExecutionHistory[] = JSON.parse(data);
    // 30日以上古い履歴を削除
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return executions.filter(exec => exec.triggeredAt > thirtyDaysAgo);
  } catch {
    return [];
  }
}

export function saveAIExecution(
  accountId: string,
  execution: AIExecutionHistory
): void {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;
  const executions = getAIExecutions(accountId);

  // 最新100件のみ保持
  const updated = [execution, ...executions].slice(0, 100);
  localStorage.setItem(key, JSON.stringify(updated));
}

export function updateAIExecutionStatus(
  accountId: string,
  executionId: string,
  workflowStatus: WorkflowStatus
): void {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;
  const executions = getAIExecutions(accountId);

  const updated = executions.map(exec =>
    exec.id === executionId ? { ...exec, workflowStatus } : exec
  );
  localStorage.setItem(key, JSON.stringify(updated));
}
```

#### 3.3 Cloudflare Functions実装

**ファイル**: `functions/api/github/trigger-bot.ts`

```typescript
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { repoId, issueNumber, bot, instruction } = await request.json();
    const [owner, repo] = repoId.split('/');

    // デフォルトメッセージ
    const defaultMessages = {
      'claude-code': '@claude-code Please help implement this issue according to the description.',
      'copilot': '@copilot Please provide implementation guidance for this issue.',
    };

    const body = instruction || defaultMessages[bot];

    // GitHub APIでコメント投稿
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json(
        { success: false, message: error.message || 'Failed to post comment' },
        { status: response.status }
      );
    }

    const comment = await response.json();

    return Response.json({
      success: true,
      commentId: comment.id,
      message: `${bot} triggered successfully`,
    });
  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
```

**ファイル**: `functions/api/github/list-workflow-runs.ts`

```typescript
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const repoId = url.searchParams.get('repoId');
  const issueNumber = url.searchParams.get('issueNumber');
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  if (!repoId || !issueNumber) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const [owner, repo] = repoId.split('/');

    // ワークフロー実行一覧を取得（issue_commentイベントでフィルタ）
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?event=issue_comment&per_page=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: error.message }, { status: response.status });
    }

    const data = await response.json();

    return Response.json({
      runs: data.workflow_runs || [],
      total_count: data.total_count || 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

**ファイル**: `functions/api/github/workflow-status.ts`

```typescript
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const repoId = url.searchParams.get('repoId');
  const runId = url.searchParams.get('runId');

  if (!repoId || !runId) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const [owner, repo] = repoId.split('/');

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: error.message }, { status: response.status });
    }

    const run = await response.json();

    const status: WorkflowStatus = {
      runId: run.id,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      startedAt: run.run_started_at,
      completedAt: run.updated_at,
      updatedAt: run.updated_at,
    };

    return Response.json({ status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### 成果物
- ✅ `src/types/githubActions.ts`
- ✅ `src/utils/aiExecutionStorage.ts`
- ✅ `functions/api/github/trigger-bot.ts`
- ✅ `functions/api/github/list-workflow-runs.ts`
- ✅ `functions/api/github/workflow-status.ts`

---

### フェーズ2: カスタムフック実装 (1.5-2h)

#### 2.1 useGitHubActions Hook

**ファイル**: `src/hooks/useGitHubActions.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { GitHubBot, WorkflowStatus, AIExecutionHistory } from '@/types/githubActions';
import { useAuth } from '@/contexts/AuthContext';
import { saveAIExecution, updateAIExecutionStatus } from '@/utils/aiExecutionStorage';
import { v4 as uuidv4 } from 'uuid';

const POLLING_INTERVAL = 5000; // 5秒
const MAX_POLLING_DURATION = 5 * 60 * 1000; // 5分

export function useGitHubActions(todoId: string, repoId: string, issueNumber: number) {
  const { currentAccount } = useAuth();
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // ポーリング停止
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // ワークフロー状態のポーリング
  const startStatusPolling = useCallback(
    (executionId: string, repoFullName: string) => {
      const startTime = Date.now();

      const interval = setInterval(async () => {
        // 最大時間を超えたら停止
        if (Date.now() - startTime > MAX_POLLING_DURATION) {
          stopPolling();
          setError('Workflow status polling timed out');
          return;
        }

        try {
          const response = await fetch(
            `/api/github/list-workflow-runs?repoId=${encodeURIComponent(repoFullName)}&issueNumber=${issueNumber}&limit=1`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch workflow runs');
          }

          const { runs } = await response.json();

          if (runs.length === 0) {
            return; // まだワークフローが開始されていない
          }

          const latestRun = runs[0];
          const status: WorkflowStatus = {
            runId: latestRun.id,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            htmlUrl: latestRun.html_url,
            startedAt: latestRun.run_started_at,
            completedAt: latestRun.updated_at,
            updatedAt: latestRun.updated_at,
          };

          setWorkflowStatus(status);

          // ローカルストレージも更新
          if (currentAccount) {
            updateAIExecutionStatus(currentAccount.id, executionId, status);
          }

          // 完了したらポーリング停止
          if (status.status === 'completed') {
            stopPolling();
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Polling error:', err);
          // エラーでもポーリングは継続
        }
      }, POLLING_INTERVAL);

      setPollingInterval(interval);
    },
    [issueNumber, currentAccount, stopPolling]
  );

  // AIボットのトリガー
  const triggerBot = useCallback(
    async (bot: GitHubBot, instruction?: string) => {
      if (!currentAccount) {
        setError('Not authenticated');
        return;
      }

      setIsLoading(true);
      setError(null);
      setWorkflowStatus(null);

      try {
        // Issueコメントを投稿
        const response = await fetch('/api/github/trigger-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoId,
            issueNumber,
            bot,
            instruction,
          }),
        });

        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message || 'Failed to trigger bot');
        }

        const { commentId } = await response.json();

        // 実行履歴を保存
        const execution: AIExecutionHistory = {
          id: uuidv4(),
          todoId,
          issueNumber,
          repoId,
          repoFullName: repoId,
          bot,
          instruction,
          commentId,
          triggeredAt: new Date().toISOString(),
        };

        saveAIExecution(currentAccount.id, execution);

        // ワークフロー状態のポーリング開始
        startStatusPolling(execution.id, repoId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    },
    [currentAccount, todoId, repoId, issueNumber, startStatusPolling]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    triggerBot,
    workflowStatus,
    isLoading,
    error,
  };
}
```

#### 成果物
- ✅ `src/hooks/useGitHubActions.ts`

---

### フェーズ3: UIコンポーネント実装 (3-4h)

#### 3.1 AIInstructionDialog

**ファイル**: `src/components/AIInstructionDialog.tsx`

```typescript
import { useState } from 'react';
import { GitHubBot } from '@/types/githubActions';
import { useDesignSystem } from '@/hooks/useDesignSystem';
import { focusRing } from '@/lib/focusRing';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bot: GitHubBot, instruction?: string) => void;
  isLoading: boolean;
};

export function AIInstructionDialog({ isOpen, onClose, onSubmit, isLoading }: Props) {
  const { tokens } = useDesignSystem();
  const [selectedBot, setSelectedBot] = useState<GitHubBot>('claude-code');
  const [instruction, setInstruction] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(selectedBot, instruction.trim() || undefined);
    setInstruction('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-dialog-title"
    >
      <div
        className="bg-surface-default rounded-lg shadow-elevation-high p-inset-lg max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ai-dialog-title" className="text-title-2 mb-stack-md">
          AIボットを実行
        </h2>

        {/* ボット選択 */}
        <div className="mb-stack-md">
          <label className="text-body-sm text-text-subtle mb-stack-xs block">
            ボット選択
          </label>
          <div className="flex gap-inline-sm">
            <button
              onClick={() => setSelectedBot('claude-code')}
              className={`px-inset-md py-inset-sm rounded-md text-body transition ${
                selectedBot === 'claude-code'
                  ? 'bg-brand-purple text-white'
                  : 'bg-surface-subtle text-text-default hover:bg-surface-subtle-hover'
              } ${focusRing()}`}
              disabled={isLoading}
            >
              Claude Code
            </button>
            <button
              onClick={() => setSelectedBot('copilot')}
              className={`px-inset-md py-inset-sm rounded-md text-body transition ${
                selectedBot === 'copilot'
                  ? 'bg-brand-purple text-white'
                  : 'bg-surface-subtle text-text-default hover:bg-surface-subtle-hover'
              } ${focusRing()}`}
              disabled={isLoading}
            >
              GitHub Copilot
            </button>
          </div>
        </div>

        {/* カスタム指示入力 */}
        <div className="mb-stack-lg">
          <label htmlFor="ai-instruction" className="text-body-sm text-text-subtle mb-stack-xs block">
            カスタム指示（オプション）
          </label>
          <textarea
            id="ai-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="空白の場合はデフォルトメッセージが送信されます"
            className={`w-full h-32 px-inset-md py-inset-sm bg-surface-subtle rounded-md text-body resize-none ${focusRing()}`}
            disabled={isLoading}
          />
          <p className="text-caption text-text-subtle mt-stack-xs">
            Markdown形式で記述できます。@{selectedBot}メンションは自動で付与されます。
          </p>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-inline-sm">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-inset-lg py-inset-md rounded-md text-body bg-surface-subtle hover:bg-surface-subtle-hover transition ${focusRing()}`}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`px-inset-lg py-inset-md rounded-md text-body bg-brand-purple text-white hover:bg-brand-purple-hover transition ${focusRing()} disabled:opacity-50`}
          >
            {isLoading ? '実行中...' : '実行'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 3.2 AIStatusBadge

**ファイル**: `src/components/AIStatusBadge.tsx`

```typescript
import { WorkflowStatus } from '@/types/githubActions';

type Props = {
  status?: WorkflowStatus;
  isLoading?: boolean;
};

export function AIStatusBadge({ status, isLoading }: Props) {
  if (isLoading && !status) {
    return (
      <span className="inline-flex items-center gap-inline-xs px-inset-sm py-inset-xs rounded-full bg-blue-500/10 text-blue-500 text-caption">
        <span className="animate-spin">⏳</span>
        トリガー中
      </span>
    );
  }

  if (!status) return null;

  const statusConfig = {
    queued: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: '⏱️', label: 'キュー' },
    in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: '🔄', label: '実行中' },
    completed: {
      success: { bg: 'bg-green-500/10', text: 'text-green-500', icon: '✅', label: '成功' },
      failure: { bg: 'bg-red-500/10', text: 'text-red-500', icon: '❌', label: '失敗' },
      cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: '🚫', label: 'キャンセル' },
      skipped: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: '⏭️', label: 'スキップ' },
      timed_out: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: '⏰', label: 'タイムアウト' },
    },
  };

  let config;
  if (status.status === 'completed' && status.conclusion) {
    config = statusConfig.completed[status.conclusion];
  } else {
    config = statusConfig[status.status];
  }

  if (!config) return null;

  return (
    <a
      href={status.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-inline-xs px-inset-sm py-inset-xs rounded-full ${config.bg} ${config.text} text-caption hover:opacity-80 transition`}
    >
      <span>{config.icon}</span>
      {config.label}
    </a>
  );
}
```

#### 3.3 TodoItem拡張（AIボタン追加）

**ファイル**: `src/components/TodoItem.tsx`（既存ファイルを拡張）

```typescript
// 既存のインポートに追加
import { useState } from 'react';
import { AIInstructionDialog } from './AIInstructionDialog';
import { AIStatusBadge } from './AIStatusBadge';
import { useGitHubActions } from '@/hooks/useGitHubActions';

export function TodoItem({ todo }: { todo: Todo }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { triggerBot, workflowStatus, isLoading, error } = useGitHubActions(
    todo.id,
    todo.repoId,
    todo.issueNumber || 0
  );

  // Issueと連携していない場合はAIボタンを表示しない
  if (!todo.issueNumber) {
    return <div>{/* 既存のTodoItem UI */}</div>;
  }

  const handleTriggerBot = (bot: GitHubBot, instruction?: string) => {
    triggerBot(bot, instruction);
    setIsDialogOpen(false);
  };

  return (
    <div className="todo-item">
      {/* 既存のTodoItem UI */}

      {/* AIボタンとステータス */}
      <div className="flex items-center gap-inline-sm mt-stack-sm">
        <button
          onClick={() => setIsDialogOpen(true)}
          disabled={isLoading}
          className={`px-inset-sm py-inset-xs rounded-md text-caption bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20 transition ${focusRing()}`}
        >
          🤖 AIで実装
        </button>

        <AIStatusBadge status={workflowStatus} isLoading={isLoading} />

        {error && (
          <span className="text-caption text-red-500">
            {error}
          </span>
        )}
      </div>

      {/* AIInstructionDialog */}
      <AIInstructionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleTriggerBot}
        isLoading={isLoading}
      />
    </div>
  );
}
```

#### 成果物
- ✅ `src/components/AIInstructionDialog.tsx`
- ✅ `src/components/AIStatusBadge.tsx`
- ✅ 修正: `src/components/TodoItem.tsx`

---

### フェーズ4: テスト・デバッグ (1.5-2h)

#### 4.1 単体テスト

**テスト対象:**
- `aiExecutionStorage.ts` の CRUD 操作
- `useGitHubActions` フックのロジック

#### 4.2 統合テスト

**シナリオ:**
1. AIボタンをクリック→ダイアログ表示
2. カスタム指示を入力→実行
3. GitHub APIにコメント投稿→成功確認
4. ワークフロー状態のポーリング→ステータス更新
5. 完了状態の表示→GitHub Actionsリンククリック

#### 4.3 エラーハンドリングテスト

**シナリオ:**
- GitHub API エラー（401, 403, 404, 500）
- ネットワークエラー
- タイムアウト（5分経過）
- 権限不足

#### 成果物
- ✅ テストコード
- ✅ バグ修正

---

## 4. GitHub Actions ワークフロー連携

### 4.1 既存ワークフローの想定

ユーザーが既に以下のようなワークフローを設定していることを前提とします：

**例: `.github/workflows/claude-code.yml`**

```yaml
name: Claude Code Bot

on:
  issue_comment:
    types: [created]

jobs:
  claude-code:
    if: contains(github.event.comment.body, '@claude-code')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Claude Code
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Claude Code実行ロジック
          echo "Running Claude Code for issue #${{ github.event.issue.number }}"
```

### 4.2 トリガーメカニズム

**フロー:**
1. DevBoardがIssueにコメントを投稿（`@claude-code` or `@copilot`メンション）
2. GitHub Actionsが`issue_comment`イベントを検知
3. ワークフローが`contains(github.event.comment.body, '@claude-code')`条件でトリガー
4. ワークフロー実行

### 4.3 ワークフロー実行の監視

**ポーリング方式:**
- 5秒間隔でワークフロー実行一覧を取得
- 最新の実行状態をチェック
- `status === 'completed'`でポーリング停止
- 最大5分間でタイムアウト

**API呼び出し:**
```http
GET /repos/{owner}/{repo}/actions/runs?event=issue_comment&per_page=1
```

---

## 5. UI/UXデザインガイドライン

### 5.1 デザインシステム準拠

**適用ルール:**
- Typography: `text-body` (ダイアログ本文), `text-body-sm` (ラベル), `text-caption` (バッジ)
- Spacing: `gap-inline-sm`, `p-inset-lg`, `mb-stack-md`
- Focus: `focusRing` preset 適用
- Motion: `motion-reduce:animate-none`
- Colors: ステータスごとに色分け（success: green, failure: red, in_progress: blue）

### 5.2 カラースキーム

**ステータスバッジ:**
- Queued: `bg-yellow-500/10 text-yellow-500`
- In Progress: `bg-blue-500/10 text-blue-500`
- Success: `bg-green-500/10 text-green-500`
- Failure: `bg-red-500/10 text-red-500`
- Cancelled: `bg-gray-500/10 text-gray-500`

### 5.3 アクセシビリティ

**実装必須:**
- ダイアログに `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 付与
- ボタンに適切な `disabled` 状態とラベル
- ステータス変更時に `aria-live="polite"` で通知（将来）
- キーボード操作対応（Enter送信、Esc閉じる）

---

## 6. マイルストーン

| フェーズ | 完了条件 | 見積もり |
|---------|---------|---------|
| Phase 1 | データ層・API実装完了 | 2-3h |
| Phase 2 | useGitHubActionsフック動作 | 1.5-2h |
| Phase 3 | UI実装完了、ボタンクリックでダイアログ表示 | 3-4h |
| Phase 4 | テスト・デバッグ完了 | 1.5-2h |

**合計見積もり: 8-11時間**

---

## 7. テストシナリオ

### 7.1 機能テスト

1. **AIボット実行**
   - [ ] Claude Codeボタンクリック→ダイアログ表示
   - [ ] Copilotボタンクリック→ダイアログ表示
   - [ ] カスタム指示を入力→実行成功
   - [ ] 空欄で実行→デフォルトメッセージ送信
   - [ ] Issueコメント投稿確認（GitHub UI）

2. **ワークフロー監視**
   - [ ] ポーリング開始→ステータス「queued」表示
   - [ ] ステータス「in_progress」に更新
   - [ ] ステータス「completed (success)」に更新
   - [ ] ポーリング自動停止
   - [ ] GitHub Actionsリンククリック→新規タブで開く

3. **実行履歴**
   - [ ] 実行履歴がlocalStorageに保存される
   - [ ] 30日以上古い履歴は自動削除
   - [ ] 最新100件のみ保持

### 7.2 エラーハンドリングテスト

1. **GitHub APIエラー**
   - [ ] 401 Unauthorized → エラーメッセージ表示
   - [ ] 403 Forbidden → 権限不足エラー
   - [ ] 404 Not Found → リポジトリ/Issue不存在エラー
   - [ ] 500 Server Error → リトライ案内

2. **ネットワークエラー**
   - [ ] タイムアウト（5分）→ ポーリング停止
   - [ ] オフライン → エラーメッセージ

3. **認証エラー**
   - [ ] 未ログイン → 「認証が必要」エラー
   - [ ] トークン期限切れ → 再認証促進

### 7.3 パフォーマンステスト

1. **API呼び出し効率**
   - [ ] ポーリング間隔: 5秒
   - [ ] 最大ポーリング時間: 5分
   - [ ] 完了後の即時停止

---

## 8. セキュリティ考慮事項

### 8.1 GitHub Token保護

**実装:**
- GitHub PATは Cloudflare Workers Secrets で管理
- フロントエンドには露出しない
- 最小権限の原則（`repo`, `workflow`, `actions:read` のみ）

### 8.2 プロンプトインジェクション対策

**対策:**
- ユーザー入力を検証
- メンション文字列（`@claude-code`, `@copilot`）のエスケープ不要（そのまま送信）
- 最大文字数制限（2000文字）

### 8.3 レート制限

**実装:**
- GitHub API制限: 5000 req/hour（認証済み）
- ポーリング頻度: 5秒間隔（最大60リクエスト/5分）
- レート制限エラー時のリトライロジック

---

## 9. 将来の拡張計画

### 9.1 追加機能

1. **ワークフロー実行履歴UI**
   - Issue詳細画面にワークフロー実行一覧を表示
   - フィルター・ソート機能

2. **複数ワークフローサポート**
   - カスタムワークフロー選択
   - ワークフロー名の表示

3. **リアルタイム通知**
   - WebSocketsでワークフロー完了通知
   - ブラウザ通知（Notification API）

### 9.2 高度な連携

1. **PRへのAIボット実行**
   - PRコメントからボット起動
   - コードレビュー自動化

2. **バッチ実行**
   - 複数ToDoに対して一括AIボット実行

3. **テンプレート管理**
   - カスタム指示テンプレート保存
   - プリセット選択機能

---

## 10. 実装時の注意事項

### 10.1 必須確認事項

- [ ] GitHub PATに必要な権限（`repo`, `workflow`, `actions:read`）が付与されているか
- [ ] ユーザーがGitHub Actions環境でClaude Code/Copilotワークフローを設定済みか
- [ ] Cloudflare Workers Secrets に `GITHUB_TOKEN` が設定されているか

### 10.2 依存関係

**新規追加パッケージ:**
```json
{
  "uuid": "^9.0.0"  // 実行履歴ID生成
}
```

### 10.3 環境変数

```bash
# .dev.vars (Cloudflare Workers開発用)
GITHUB_TOKEN=ghp_xxx...
```

---

## 11. 参考資料

- [GitHub REST API - Actions](https://docs.github.com/en/rest/actions)
- [GitHub REST API - Issues](https://docs.github.com/en/rest/issues)
- [GitHub Actions - Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#issue_comment)
- [Cloudflare Workers - Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [React Hooks Best Practices](https://react.dev/reference/react)

---

**ドキュメント終了**
