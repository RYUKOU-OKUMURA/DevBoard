/**
 * Custom hook for GitHub Actions AI integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GitHubBot, WorkflowStatus, AIExecutionHistory } from '@/types/githubActions';
import { useAuth } from '../contexts/AuthContext';
import {
  saveAIExecution,
  updateAIExecutionStatus,
  getAIExecutionsByTodo,
} from '@/utils/aiExecutionStorage';

const POLLING_INTERVAL = 5000; // 5秒
const MAX_POLLING_DURATION = 5 * 60 * 1000; // 5分

/**
 * Hook options
 */
interface UseGitHubActionsOptions {
  todoId: string;
  repoId: string;             // owner/repo形式
  issueNumber?: number;       // Issue番号
  autoLoadHistory?: boolean;  // 自動的に履歴をロード（デフォルト: true）
}

/**
 * Hook return type
 */
interface UseGitHubActionsReturn {
  // State
  workflowStatus: WorkflowStatus | null;
  isLoading: boolean;
  error: string | null;
  executionHistory: AIExecutionHistory[];

  // Actions
  triggerBot: (bot: GitHubBot, instruction?: string) => Promise<void>;
  stopPolling: () => void;
  clearError: () => void;
  refreshHistory: () => void;
}

/**
 * GitHub Actions AI統合フック
 */
export function useGitHubActions(options: UseGitHubActionsOptions): UseGitHubActionsReturn {
  const { todoId, repoId, issueNumber, autoLoadHistory = true } = options;
  const { user } = useAuth();

  // State
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<AIExecutionHistory[]>([]);

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const currentExecutionIdRef = useRef<string | null>(null);

  /**
   * ポーリングを停止
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingStartTimeRef.current = null;
  }, []);

  /**
   * 履歴を再読み込み
   */
  const refreshHistory = useCallback(() => {
    if (!user) return;
    const history = getAIExecutionsByTodo(user.id, todoId);
    setExecutionHistory(history);
  }, [user, todoId]);

  /**
   * ワークフロー状態をポーリング
   */
  const startStatusPolling = useCallback(
    (executionId: string) => {
      if (!user) return;

      pollingStartTimeRef.current = Date.now();
      currentExecutionIdRef.current = executionId;

      const pollStatus = async () => {
        // 最大時間を超えたら停止
        if (
          pollingStartTimeRef.current &&
          Date.now() - pollingStartTimeRef.current > MAX_POLLING_DURATION
        ) {
          stopPolling();
          setError('Workflow status polling timed out (5 minutes)');
          setIsLoading(false);
          return;
        }

        try {
          // ワークフロー実行一覧を取得（最新1件）
          const response = await fetch(
            `/api/github/list-workflow-runs?repoId=${encodeURIComponent(repoId)}&issueNumber=${issueNumber || ''}&limit=1`
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch workflow runs');
          }

          const { runs } = await response.json();

          if (runs.length === 0) {
            // まだワークフローが開始されていない
            return;
          }

          const latestRun = runs[0];
          const status: WorkflowStatus = {
            runId: latestRun.id,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            htmlUrl: latestRun.html_url,
            startedAt: latestRun.run_started_at,
            completedAt: latestRun.status === 'completed' ? latestRun.updated_at : undefined,
            updatedAt: latestRun.updated_at,
          };

          setWorkflowStatus(status);

          // ローカルストレージも更新
          updateAIExecutionStatus(user.id, executionId, status);

          // 履歴を再読み込み
          refreshHistory();

          // 完了したらポーリング停止
          if (status.status === 'completed') {
            stopPolling();
            setIsLoading(false);
            console.log(`[useGitHubActions] Workflow completed: ${status.conclusion}`);
          }
        } catch (err) {
          console.error('[useGitHubActions] Polling error:', err);
          // エラーでもポーリングは継続（一時的なネットワークエラーの可能性）
        }
      };

      // 初回実行
      pollStatus();

      // インターバルで定期実行
      pollingIntervalRef.current = setInterval(pollStatus, POLLING_INTERVAL);
    },
    [user, repoId, issueNumber, stopPolling, refreshHistory]
  );

  /**
   * AIボットをトリガー
   */
  const triggerBot = useCallback(
    async (bot: GitHubBot, instruction?: string) => {
      if (!user) {
        setError('Not authenticated');
        return;
      }

      if (!issueNumber) {
        setError('No issue linked to this TODO');
        return;
      }

      setIsLoading(true);
      setError(null);
      setWorkflowStatus(null);

      try {
        console.log(`[useGitHubActions] Triggering ${bot} for issue #${issueNumber}`);

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
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to trigger bot');
        }

        const { commentId } = await response.json();

        console.log(`[useGitHubActions] Comment posted: ${commentId}`);

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

        saveAIExecution(user.id, execution);

        // 履歴を再読み込み
        refreshHistory();

        // ワークフロー状態のポーリング開始
        startStatusPolling(execution.id);

        console.log(`[useGitHubActions] Started polling for execution ${execution.id}`);
      } catch (err) {
        console.error('[useGitHubActions] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    },
    [user, todoId, repoId, issueNumber, startStatusPolling, refreshHistory]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 初回ロード時に履歴を読み込み
   */
  useEffect(() => {
    if (autoLoadHistory && user) {
      refreshHistory();
    }
  }, [autoLoadHistory, user, refreshHistory]);

  /**
   * クリーンアップ: アンマウント時にポーリングを停止
   */
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    workflowStatus,
    isLoading,
    error,
    executionHistory,
    triggerBot,
    stopPolling,
    clearError,
    refreshHistory,
  };
}
