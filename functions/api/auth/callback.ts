// OAuth callback endpoint - handles GitHub OAuth callback

import type { Env, GitHubTokenResponse, GitHubUser } from '../../lib/types';
import {
  generateSessionId,
  saveSession,
  createSessionCookie,
} from '../../lib/session';

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

    // Verify state (CSRF protection)
    const storedState = await env.SESSIONS.get(`oauth_state:${state}`);
    if (!storedState) {
      return new Response('Invalid or expired state parameter', { status: 400 });
    }

    // Delete the state after verification
    await env.SESSIONS.delete(`oauth_state:${state}`);

    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
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
        // GitHub API requires a User-Agent header even for OAuth calls.
        'User-Agent': 'github-dashboard-app',
      },
    });

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text());
      return new Response('Failed to fetch user information', { status: 500 });
    }

    const user: GitHubUser = await userResponse.json();

    // Create session
    const sessionId = generateSessionId();
    await saveSession(
      sessionId,
      {
        userId: user.id.toString(),
        username: user.login,
        accessToken,
        createdAt: Date.now(),
      },
      env
    );

    // Set session cookie and redirect to dashboard
    const origin = url.origin;
    return new Response(null, {
      status: 302,
      headers: {
        Location: origin,
        'Set-Cookie': createSessionCookie(sessionId),
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
