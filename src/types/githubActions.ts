/**
 * GitHub Actions AI統合の型定義
 */

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
