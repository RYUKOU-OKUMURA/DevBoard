// OAuth login endpoint - initiates GitHub OAuth flow

import type { Env, OAuthSessionData } from '../../lib/types';
import { generateSessionId } from '../../lib/session';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  setCookies
} from '../../utils/security';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // セッションID生成
    const sessionId = generateSessionId();
    
    // PKCE code_verifierとcode_challenge生成（後方互換性のためオプショナル）
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // stateパラメータ生成（セッションIDを含める）
    const state = `${sessionId}.${crypto.randomUUID()}`;

    // OAuthセッションデータをKVに保存（10分有効）
    const oauthSessionData: OAuthSessionData = {
      state,
      codeVerifier,
      sessionId,
      createdAt: Date.now()
    };
    
    await env.SESSIONS.put(
      `oauth_session:${sessionId}`,
      JSON.stringify(oauthSessionData),
      { expirationTtl: 10 * 60 } // 10 minutes
    );

    // リダイレクトURIの決定
    const url = new URL(request.url);
    const redirectUri = env.GITHUB_REDIRECT_URI || `${url.origin}/api/auth/callback`;

    // Build GitHub OAuth authorization URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('scope', 'repo read:user');
    githubAuthUrl.searchParams.set('state', state);
    // PKCEパラメータはオプショナル（GitHubのOAuth AppがPKCEをサポートしている場合のみ）
    // 既存のOAuth Appとの互換性のため、コメントアウト
    // githubAuthUrl.searchParams.set('code_challenge', codeChallenge);
    // githubAuthUrl.searchParams.set('code_challenge_method', 'S256');

    // oauth_sessionクッキーを設定
    const headers = new Headers({ 'Location': githubAuthUrl.toString() });
    setCookies(headers, [{ 
      name: 'oauth_session', 
      value: sessionId, 
      maxAge: 10 * 60 // 10 minutes
    }]);

    // Redirect to GitHub OAuth
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('Login error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
