// Logout endpoint - deletes all sessions for all accounts and cookie

import type { Env } from '../../lib/types';
import {
  getSessionIdFromCookie,
  deleteSession,
  deleteSessionCookie,
  getMultiAccountSession,
} from '../../lib/session';
import { applyNoCache } from '../../utils/security';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get master session ID from cookie
    const masterSessionId = await getSessionIdFromCookie(request, env);

    if (masterSessionId) {
      // Get multi-account session to find all account sessions
      const multiSession = await getMultiAccountSession(masterSessionId, env);

      if (multiSession) {
        // Delete all individual account sessions
        for (const account of multiSession.accounts) {
          await deleteSession(`${masterSessionId}:${account.userId}`, env);
        }

        // Delete multi-account session metadata
        await env.SESSIONS.delete(`multi:${masterSessionId}`);
      } else {
        // Fallback: try to delete single session (backward compatibility)
        await deleteSession(masterSessionId, env);
      }
    }

    // Return success response with cookie deletion
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': deleteSessionCookie(),
    });
    applyNoCache(headers);

    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
