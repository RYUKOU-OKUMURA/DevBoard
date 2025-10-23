// OAuth login endpoint - initiates GitHub OAuth flow

import type { Env } from '../../lib/types';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Store state in KV with 5-minute expiration
    await env.SESSIONS.put(`oauth_state:${state}`, 'pending', {
      expirationTtl: 5 * 60, // 5 minutes
    });

    // Get the origin for redirect
    const url = new URL(request.url);
    const origin = url.origin;

    // Build GitHub OAuth authorization URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', `${origin}/api/auth/callback`);
    githubAuthUrl.searchParams.set('scope', 'repo read:user');
    githubAuthUrl.searchParams.set('state', state);

    // Redirect to GitHub OAuth
    return Response.redirect(githubAuthUrl.toString(), 302);
  } catch (error) {
    console.error('Login error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
