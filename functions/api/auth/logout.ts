// Logout endpoint - deletes session and cookie

import type { Env } from '../../lib/types';
import {
  getSessionIdFromCookie,
  deleteSession,
  deleteSessionCookie,
} from '../../lib/session';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Get session ID from cookie
    const sessionId = getSessionIdFromCookie(request);

    if (sessionId) {
      // Delete session from KV
      await deleteSession(sessionId, env);
    }

    // Return success response with cookie deletion
    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': deleteSessionCookie(),
        },
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
