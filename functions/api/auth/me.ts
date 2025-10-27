// User info endpoint - returns current authenticated user

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getActiveAccountSession, getMultiAccountSession } from '../../lib/session';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Get master session ID from cookie
    const masterSessionId = await getSessionIdFromCookie(request, env);

    if (!masterSessionId) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }
      );
    }

    // Get multi-account session
    const multiSession = await getMultiAccountSession(masterSessionId, env);

    if (!multiSession) {
      return new Response(
        JSON.stringify({ error: 'Session expired or invalid' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }
      );
    }

    // Get active account session
    const session = await getActiveAccountSession(masterSessionId, env);

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'No active account' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Me endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
