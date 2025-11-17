/**
 * AIボットをトリガーする（Issueコメント投稿）
 * POST /api/github/trigger-bot
 */

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getActiveAccountSession } from '../../lib/session';
import { applyNoCache } from '../../utils/security';

type GitHubBot = 'claude-code' | 'copilot';

interface TriggerBotRequest {
  repoId: string;           // owner/repo 形式
  issueNumber: number;
  bot: GitHubBot;
  instruction?: string;     // カスタム指示（オプション）
}

interface TriggerBotResponse {
  success: boolean;
  commentId?: number;
  message: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // POSTメソッドのみ許可
  if (request.method !== 'POST') {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
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
        JSON.stringify({ success: false, message: 'Not authenticated' }),
        { status: 401, headers }
      );
    }

    const session = await getActiveAccountSession(masterSessionId, env);
    if (!session) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ success: false, message: 'No active account or session expired' }),
        { status: 401, headers }
      );
    }

    // リクエストボディをパース
    const body: TriggerBotRequest = await request.json();
    const { repoId, issueNumber, bot, instruction } = body;

    // バリデーション
    if (!repoId || !issueNumber || !bot) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters' }),
        { status: 400, headers }
      );
    }

    if (!['claude-code', 'copilot'].includes(bot)) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid bot type' }),
        { status: 400, headers }
      );
    }

    // repoIdからowner/repoを分割
    const [owner, repo] = repoId.split('/');
    if (!owner || !repo) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid repoId format. Expected: owner/repo' }),
        { status: 400, headers }
      );
    }

    // デフォルトメッセージ
    const defaultMessages: Record<GitHubBot, string> = {
      'claude-code': '@claude-code Please help implement this issue according to the description.',
      'copilot': '@copilot Please provide implementation guidance for this issue.',
    };

    // カスタム指示がある場合はそれを使用、ない場合はデフォルト
    const commentBody = instruction?.trim()
      ? `@${bot} ${instruction.trim()}`
      : defaultMessages[bot];

    // 最大文字数制限（2000文字）
    if (commentBody.length > 2000) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ success: false, message: 'Instruction too long (max 2000 characters)' }),
        { status: 400, headers }
      );
    }

    // GitHub APIでコメント投稿
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

    console.log(`[Trigger Bot] Posting comment to ${githubApiUrl}`);
    console.log(`[Trigger Bot] Bot: ${bot}, Comment length: ${commentBody.length}`);

    const githubResponse = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard',
      },
      body: JSON.stringify({ body: commentBody }),
    });

    if (!githubResponse.ok) {
      const errorBody = await githubResponse.text();
      console.error(`[Trigger Bot] GitHub API error: ${githubResponse.status} ${errorBody}`);

      let errorMessage = 'Failed to post comment';
      try {
        const errorData = JSON.parse(errorBody);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // JSON parse error, use default message
      }

      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ success: false, message: errorMessage }),
        { status: githubResponse.status, headers }
      );
    }

    const comment = await githubResponse.json();

    console.log(`[Trigger Bot] Comment posted successfully: ${comment.id}`);

    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify({
        success: true,
        commentId: comment.id,
        message: `${bot} triggered successfully`,
      } as TriggerBotResponse),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[Trigger Bot] Error:', error);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers }
    );
  }
};
