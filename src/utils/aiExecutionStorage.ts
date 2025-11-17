/**
 * AI実行履歴のローカルストレージ管理
 */
import { AIExecutionHistory, WorkflowStatus } from '@/types/githubActions';

const STORAGE_KEY_PREFIX = 'github-dashboard-ai-executions';
const MAX_EXECUTIONS = 100;
const RETENTION_DAYS = 30;

/**
 * AI実行履歴を取得（30日以内のみ）
 */
export function getAIExecutions(accountId: string): AIExecutionHistory[] {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];

  try {
    const executions: AIExecutionHistory[] = JSON.parse(data);
    // 30日以上古い履歴を削除
    const thirtyDaysAgo = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const filtered = executions.filter(exec => exec.triggeredAt > thirtyDaysAgo);

    // フィルタリングで削除された場合、保存し直す
    if (filtered.length !== executions.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }

    return filtered;
  } catch (error) {
    console.error('Failed to parse AI executions from localStorage:', error);
    return [];
  }
}

/**
 * 特定のTODOに関連する実行履歴を取得
 */
export function getAIExecutionsByTodo(accountId: string, todoId: string): AIExecutionHistory[] {
  return getAIExecutions(accountId).filter(exec => exec.todoId === todoId);
}

/**
 * 特定のリポジトリに関連する実行履歴を取得
 */
export function getAIExecutionsByRepo(accountId: string, repoId: string): AIExecutionHistory[] {
  return getAIExecutions(accountId).filter(exec => exec.repoId === repoId);
}

/**
 * AI実行履歴を保存
 */
export function saveAIExecution(
  accountId: string,
  execution: AIExecutionHistory
): void {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;
  const executions = getAIExecutions(accountId);

  // 最新100件のみ保持
  const updated = [execution, ...executions].slice(0, MAX_EXECUTIONS);

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save AI execution to localStorage:', error);

    // ストレージが満杯の場合、古い履歴を削除
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      const reduced = updated.slice(0, Math.floor(MAX_EXECUTIONS / 2));
      localStorage.setItem(key, JSON.stringify(reduced));
    }
  }
}

/**
 * AI実行のワークフロー状態を更新
 */
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

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update AI execution status:', error);
  }
}

/**
 * 特定のAI実行履歴を取得
 */
export function getAIExecutionById(accountId: string, executionId: string): AIExecutionHistory | null {
  const executions = getAIExecutions(accountId);
  return executions.find(exec => exec.id === executionId) || null;
}

/**
 * 特定のAI実行履歴を削除
 */
export function deleteAIExecution(accountId: string, executionId: string): boolean {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;
  const executions = getAIExecutions(accountId);

  const filtered = executions.filter(exec => exec.id !== executionId);

  if (filtered.length === executions.length) {
    return false; // 該当する履歴が見つからなかった
  }

  try {
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete AI execution:', error);
    return false;
  }
}

/**
 * すべてのAI実行履歴をクリア
 */
export function clearAIExecutions(accountId: string): boolean {
  const key = `${STORAGE_KEY_PREFIX}:${accountId}`;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to clear AI executions:', error);
    return false;
  }
}

/**
 * AI実行統計を取得
 */
export function getAIExecutionStats(accountId: string): {
  total: number;
  byBot: Record<string, number>;
  byStatus: Record<string, number>;
  successRate: number;
} {
  const executions = getAIExecutions(accountId);

  const byBot: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let completedCount = 0;
  let successCount = 0;

  executions.forEach(exec => {
    // ボット別カウント
    byBot[exec.bot] = (byBot[exec.bot] || 0) + 1;

    // ステータス別カウント
    if (exec.workflowStatus) {
      const status = exec.workflowStatus.status;
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (status === 'completed') {
        completedCount++;
        if (exec.workflowStatus.conclusion === 'success') {
          successCount++;
        }
      }
    }
  });

  const successRate = completedCount > 0 ? (successCount / completedCount) * 100 : 0;

  return {
    total: executions.length,
    byBot,
    byStatus,
    successRate: Math.round(successRate * 100) / 100,
  };
}
