// User info endpoint - returns current authenticated user

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getSession } from '../../lib/session';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Get session ID from cookie
    const sessionId = getSessionIdFromCookie(request);

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get session from KV
    const session = await getSession(sessionId, env);

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session expired or invalid' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return user information (without access token)
    return new Response(
      JSON.stringify({
        userId: session.userId,
        username: session.username,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Me endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
