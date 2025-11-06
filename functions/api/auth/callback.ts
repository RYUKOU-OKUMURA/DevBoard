// OAuth callback endpoint - handles GitHub OAuth callback

import type { Env, GitHubTokenResponse, GitHubUser, OAuthSessionData } from '../../lib/types';
import {
  generateSessionId,
  createSessionCookie,
  getSessionIdFromCookie,
  addAccountToSession,
} from '../../lib/session';
import {
  getCookie,
  setCookies,
  clearCookie
} from '../../utils/security';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Validate parameters
    if (!code || !state) {
      return new Response('Missing code or state parameter', { status: 400 });
    }

    // stateからセッションID抽出
    const [stateSessionId] = state.split('.');
    if (!stateSessionId) {
      return new Response('Invalid state format', { status: 400 });
    }

    // クッキーからセッションID取得
    const cookieSessionId = getCookie(request, 'oauth_session');

    // 3重検証: クッキー、state、KV
    if (!cookieSessionId || cookieSessionId !== stateSessionId) {
      return new Response('Forbidden', { status: 403 });
    }

    // KVからOAuthセッションデータ取得
    const oauthSessionDataStr = await env.SESSIONS.get(`oauth_session:${cookieSessionId}`);
    if (!oauthSessionDataStr) {
      return new Response('Invalid or expired session', { status: 400 });
    }

    const oauthSessionData: OAuthSessionData = JSON.parse(oauthSessionDataStr);

    // state検証
    if (oauthSessionData.state !== state) {
      return new Response('Forbidden', { status: 403 });
    }

    // 有効期限チェック（10分）
    if (Date.now() - oauthSessionData.createdAt > 10 * 60 * 1000) {
      await env.SESSIONS.delete(`oauth_session:${cookieSessionId}`);
      return new Response('Session expired', { status: 400 });
    }

    // 使用済みセッション削除
    await env.SESSIONS.delete(`oauth_session:${cookieSessionId}`);

    // Exchange code for access token (PKCE対応、code_verifierがあれば使用)
    const tokenRequestBody: {
      client_id: string;
      client_secret: string;
      code: string;
      code_verifier?: string;
    } = {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    };

    // PKCE code_verifierがあれば追加
    if (oauthSessionData.codeVerifier) {
      tokenRequestBody.code_verifier = oauthSessionData.codeVerifier;
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(tokenRequestBody),
      }
    );

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return new Response('Failed to exchange code for token', { status: 500 });
    }

    const tokenData: GitHubTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response('No access token received', { status: 500 });
    }

    // Fetch user information from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'github-dashboard-app',
      },
    });

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text());
      return new Response('Failed to fetch user information', { status: 500 });
    }

    const user: GitHubUser = await userResponse.json();

    // Get or create master session ID
    let masterSessionId = await getSessionIdFromCookie(request, env);

    if (!masterSessionId) {
      // Create new master session ID for first login
      masterSessionId = generateSessionId();
    }

    // Add account to multi-account session
    const multiSession = await addAccountToSession(
      masterSessionId,
      {
        userId: user.id.toString(),
        username: user.login,
        accessToken,
        createdAt: Date.now(),
      },
      env
    );

    if (!multiSession) {
      return new Response('Account limit reached. Maximum 5 accounts allowed.', {
        status: 400
      });
    }

    // Set session cookie and redirect to dashboard
    const origin = url.origin;
    const sessionCookie = await createSessionCookie(masterSessionId, env);
    
    // oauth_sessionクッキーを削除し、session_idクッキーを設定（Set-Cookieのappend使用）
    const headers = new Headers({ 'Location': origin });
    clearCookie(headers, 'oauth_session');
    headers.append('Set-Cookie', sessionCookie);

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
