/**
 * ワークフロー実行一覧を取得
 * GET /api/github/list-workflow-runs?repoId=owner/repo&issueNumber=123&limit=10
 */

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getActiveAccountSession } from '../../lib/session';
import { applyNoCache } from '../../utils/security';

interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
}

interface ListWorkflowRunsResponse {
  runs: WorkflowRun[];
  total_count: number;
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
    const issueNumber = url.searchParams.get('issueNumber');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // バリデーション
    if (!repoId) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'Missing repoId parameter' }),
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

    // limitのバリデーション（1-100の範囲）
    const validLimit = Math.min(Math.max(limit, 1), 100);

    // GitHub API: ワークフロー実行一覧を取得
    // issue_commentイベントでフィルタリング
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?event=issue_comment&per_page=${validLimit}`;

    console.log(`[List Workflow Runs] Fetching from: ${githubApiUrl}`);

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
      console.error(`[List Workflow Runs] GitHub API error: ${githubResponse.status} ${errorBody}`);

      let errorMessage = 'Failed to fetch workflow runs';
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

    const data = await githubResponse.json();

    // issueNumberが指定されている場合、さらにフィルタリング
    // （GitHub APIはissue_commentイベントでフィルタできるが、特定のIssueまではフィルタできない）
    let runs = data.workflow_runs || [];

    if (issueNumber) {
      // Note: GitHub APIからはどのIssueに関連するかの情報が直接取得できないため、
      // ここでは全てのissue_commentイベントの実行を返す
      // 実際のフィルタリングはフロントエンドで行うか、各実行の詳細を取得して判定する必要がある
      console.log(`[List Workflow Runs] IssueNumber filter requested but not applied (GitHub API limitation)`);
    }

    const response: ListWorkflowRunsResponse = {
      runs: runs.map((run: any) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
        run_started_at: run.run_started_at,
      })),
      total_count: data.total_count || 0,
    };

    console.log(`[List Workflow Runs] Found ${response.runs.length} runs`);

    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify(response),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[List Workflow Runs] Error:', error);
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
