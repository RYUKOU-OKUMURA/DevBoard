/**
 * ワークフロー実行状態を取得
 * GET /api/github/workflow-status?repoId=owner/repo&runId=123456
 */

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getActiveAccountSession } from '../../lib/session';
import { applyNoCache } from '../../utils/security';

interface WorkflowStatus {
  runId: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  htmlUrl: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

interface WorkflowStatusResponse {
  status: WorkflowStatus;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // GETメソッドのみ許可
  if (request.method !== 'GET') {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    // セッション認証
    const masterSessionId = await getSessionIdFromCookie(request, env);
    if (!masterSessionId) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers }
      );
    }

    const session = await getActiveAccountSession(masterSessionId, env);
    if (!session) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'No active account or session expired' }),
        { status: 401, headers }
      );
    }

    // クエリパラメータを取得
    const url = new URL(request.url);
    const repoId = url.searchParams.get('repoId');
    const runId = url.searchParams.get('runId');

    // バリデーション
    if (!repoId || !runId) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'Missing required parameters (repoId, runId)' }),
        { status: 400, headers }
      );
    }

    // repoIdからowner/repoを分割
    const [owner, repo] = repoId.split('/');
    if (!owner || !repo) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'Invalid repoId format. Expected: owner/repo' }),
        { status: 400, headers }
      );
    }

    // runIdの数値バリデーション
    const runIdNum = parseInt(runId, 10);
    if (isNaN(runIdNum) || runIdNum <= 0) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'Invalid runId. Must be a positive number' }),
        { status: 400, headers }
      );
    }

    // GitHub API: 特定のワークフロー実行状態を取得
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runIdNum}`;

    console.log(`[Workflow Status] Fetching from: ${githubApiUrl}`);

    const githubResponse = await fetch(githubApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard',
      },
    });

    if (!githubResponse.ok) {
      const errorBody = await githubResponse.text();
      console.error(`[Workflow Status] GitHub API error: ${githubResponse.status} ${errorBody}`);

      let errorMessage = 'Failed to fetch workflow status';
      try {
        const errorData = JSON.parse(errorBody);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // JSON parse error, use default message
      }

      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: githubResponse.status, headers }
      );
    }

    const run = await githubResponse.json();

    const status: WorkflowStatus = {
      runId: run.id,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      startedAt: run.run_started_at,
      completedAt: run.status === 'completed' ? run.updated_at : undefined,
      updatedAt: run.updated_at,
    };

    const response: WorkflowStatusResponse = { status };

    console.log(`[Workflow Status] Status: ${status.status}, Conclusion: ${status.conclusion || 'N/A'}`);

    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify(response),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[Workflow Status] Error:', error);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers }
    );
  }
};
